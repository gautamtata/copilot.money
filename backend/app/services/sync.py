"""Plaid /transactions/sync engine.

Each page is applied in one DB transaction together with the cursor write, so a
crash can never skip or double-apply a page. A per-item advisory lock plus a
cursor compare-and-set guards against a webhook-triggered sync racing the daily
job; upserts keep replays idempotent either way.
"""

import logging
import uuid
from datetime import UTC, datetime

from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_sync_request_options import TransactionsSyncRequestOptions
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory
from app.models import PlaidItem, Transaction
from app.services.categorize import Categorizer
from app.services.money import to_cents
from app.services.plaid_client import get_plaid_client
from app.services.plaid_items import sync_accounts

logger = logging.getLogger(__name__)


async def sync_all_items() -> None:
    async with async_session_factory() as session:
        item_ids = (
            (await session.execute(select(PlaidItem.id).where(PlaidItem.status == "active")))
            .scalars()
            .all()
        )
    for item_id in item_ids:
        try:
            await sync_item(item_id)
        except Exception:
            logger.exception("Sync failed for item %s", item_id)


async def sync_item(item_id: uuid.UUID) -> None:
    client = get_plaid_client()
    while True:
        async with async_session_factory() as session:
            item = await session.get(PlaidItem, item_id)
            if item is None:
                return
            cursor_before = item.sync_cursor

            kwargs: dict = {"access_token": item.access_token}
            if cursor_before:
                kwargs["cursor"] = cursor_before
            response = client.transactions_sync(
                TransactionsSyncRequest(
                    **kwargs,
                    options=TransactionsSyncRequestOptions(include_personal_finance_category=True),
                )
            )

            # Serialize concurrent syncs of the same item; if another sync
            # advanced the cursor while we fetched, drop this page and refetch.
            await session.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
                {"key": str(item.id)},
            )
            await session.refresh(item)
            if item.sync_cursor != cursor_before:
                continue

            categorizer = await Categorizer.load(session)
            account_ids = await _account_ids_by_plaid_id(session, item)

            for raw in response["added"]:
                await _apply_added(session, raw, account_ids, categorizer)
            for raw in response["modified"]:
                await _apply_modified(session, raw, account_ids, categorizer)
            for raw in response["removed"]:
                await _apply_removed(session, raw)

            item.sync_cursor = response["next_cursor"]
            if not response["has_more"]:
                item.last_synced_at = datetime.now(UTC)
                item.error_code = None
            await session.commit()

            if not response["has_more"]:
                break

    # Balances move with transactions; refresh them once per sync.
    async with async_session_factory() as session:
        item = await session.get(PlaidItem, item_id)
        if item is not None:
            await sync_accounts(session, item)
            await session.commit()


async def _account_ids_by_plaid_id(session: AsyncSession, item: PlaidItem) -> dict[str, uuid.UUID]:
    from app.models import Account

    rows = await session.execute(
        select(Account.plaid_account_id, Account.id).where(Account.plaid_item_id == item.id)
    )
    return dict(rows.all())


def _set_fields(txn: Transaction, raw: dict) -> None:
    txn.plaid_pending_transaction_id = raw.get("pending_transaction_id")
    txn.amount_cents = to_cents(raw["amount"])
    txn.currency = raw["iso_currency_code"] or "USD"
    txn.date = raw["date"]
    txn.name = raw["name"]
    txn.merchant_name = raw.get("merchant_name")
    txn.logo_url = raw.get("logo_url")
    txn.pending = raw["pending"]
    pfc = raw.get("personal_finance_category")
    txn.plaid_category_primary = pfc["primary"] if pfc else None
    txn.plaid_category_detailed = pfc["detailed"] if pfc else None


async def _find_by_plaid_id(session: AsyncSession, plaid_id: str) -> Transaction | None:
    return (
        await session.execute(
            select(Transaction).where(Transaction.plaid_transaction_id == plaid_id)
        )
    ).scalar_one_or_none()


async def _apply_added(
    session: AsyncSession,
    raw: dict,
    account_ids: dict[str, uuid.UUID],
    categorizer: Categorizer,
) -> None:
    account_id = account_ids.get(raw["account_id"])
    if account_id is None:
        return

    # Replayed page after a crash: the row already exists, just update it.
    txn = await _find_by_plaid_id(session, raw["transaction_id"])

    # Posted version of a pending transaction we already hold: update that row
    # in place so its UUID, user category, and notes survive.
    if txn is None and raw.get("pending_transaction_id"):
        txn = await _find_by_plaid_id(session, raw["pending_transaction_id"])

    if txn is None:
        txn = Transaction(account_id=account_id, plaid_transaction_id=raw["transaction_id"])
        _set_fields(txn, raw)
        txn.category_id, txn.categorized_by = categorizer.categorize(
            txn.merchant_name, txn.name, txn.plaid_category_primary, txn.plaid_category_detailed
        )
        session.add(txn)
        return

    txn.plaid_transaction_id = raw["transaction_id"]
    _set_fields(txn, raw)
    if txn.categorized_by != "user":
        txn.category_id, txn.categorized_by = categorizer.categorize(
            txn.merchant_name, txn.name, txn.plaid_category_primary, txn.plaid_category_detailed
        )


async def _apply_modified(
    session: AsyncSession,
    raw: dict,
    account_ids: dict[str, uuid.UUID],
    categorizer: Categorizer,
) -> None:
    txn = await _find_by_plaid_id(session, raw["transaction_id"])
    if txn is None:
        await _apply_added(session, raw, account_ids, categorizer)
        return
    _set_fields(txn, raw)
    if txn.categorized_by != "user":
        txn.category_id, txn.categorized_by = categorizer.categorize(
            txn.merchant_name, txn.name, txn.plaid_category_primary, txn.plaid_category_detailed
        )


async def _apply_removed(session: AsyncSession, raw: dict) -> None:
    txn = await _find_by_plaid_id(session, raw["transaction_id"])
    # A pending transaction consumed by its posted version no longer carries
    # the removed id, so the lookup misses — exactly what we want.
    if txn is not None and txn.deleted_at is None:
        txn.deleted_at = datetime.now(UTC)
