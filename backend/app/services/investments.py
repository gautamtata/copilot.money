"""Holdings and liabilities sync. Items linked without these products raise
Plaid product errors — treated as "nothing to sync" rather than failures."""

import logging
from datetime import UTC, datetime

from plaid.exceptions import ApiException
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.liabilities_get_request import LiabilitiesGetRequest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, Holding, PlaidItem, Security
from app.services.money import to_cents
from app.services.plaid_client import get_plaid_client

logger = logging.getLogger(__name__)

SKIPPABLE_PLAID_ERRORS = (
    "PRODUCTS_NOT_SUPPORTED",
    "PRODUCT_NOT_READY",
    "NO_INVESTMENT_ACCOUNTS",
    "NO_LIABILITY_ACCOUNTS",
    "ADDITIONAL_CONSENT_REQUIRED",
    "INVALID_PRODUCT",
)


def is_skippable_plaid_error(exc: ApiException) -> bool:
    return any(code in str(exc.body) for code in SKIPPABLE_PLAID_ERRORS)


async def sync_holdings(session: AsyncSession, item: PlaidItem) -> None:
    try:
        response = get_plaid_client().investments_holdings_get(
            InvestmentsHoldingsGetRequest(access_token=item.access_token)
        )
    except ApiException as exc:
        if is_skippable_plaid_error(exc):
            return
        raise

    securities_by_plaid_id: dict[str, Security] = {
        s.plaid_security_id: s
        for s in (
            (await session.execute(select(Security))).scalars().all()
        )
    }
    for raw in response["securities"]:
        security = securities_by_plaid_id.get(raw["security_id"]) or Security(
            plaid_security_id=raw["security_id"]
        )
        security.ticker = raw.get("ticker_symbol")
        security.name = raw.get("name")
        security.type = raw.get("type")
        security.close_price = raw.get("close_price")
        security.close_price_as_of = raw.get("close_price_as_of")
        security.currency = raw.get("iso_currency_code") or "USD"
        session.add(security)
        securities_by_plaid_id[raw["security_id"]] = security
    await session.flush()

    account_ids = dict(
        (
            await session.execute(
                select(Account.plaid_account_id, Account.id).where(
                    Account.plaid_item_id == item.id
                )
            )
        ).all()
    )

    now = datetime.now(UTC)
    seen: set[tuple] = set()
    existing = {
        (h.account_id, h.security_id): h
        for h in (
            (
                await session.execute(
                    select(Holding).join(Account).where(Account.plaid_item_id == item.id)
                )
            )
            .scalars()
            .all()
        )
    }
    for raw in response["holdings"]:
        account_id = account_ids.get(raw["account_id"])
        security = securities_by_plaid_id.get(raw["security_id"])
        if account_id is None or security is None:
            continue
        key = (account_id, security.id)
        seen.add(key)
        holding = existing.get(key) or Holding(account_id=account_id, security_id=security.id)
        holding.quantity = raw["quantity"]
        holding.cost_basis_cents = to_cents(raw.get("cost_basis"))
        holding.institution_value_cents = to_cents(raw.get("institution_value"))
        holding.as_of = now
        session.add(holding)

    # Prune holdings the institution no longer reports.
    stale = [h.id for key, h in existing.items() if key not in seen]
    if stale:
        await session.execute(delete(Holding).where(Holding.id.in_(stale)))


async def sync_liabilities(session: AsyncSession, item: PlaidItem) -> None:
    try:
        response = get_plaid_client().liabilities_get(
            LiabilitiesGetRequest(access_token=item.access_token)
        )
    except ApiException as exc:
        if is_skippable_plaid_error(exc):
            return
        raise

    accounts = {
        a.plaid_account_id: a
        for a in (
            (await session.execute(select(Account).where(Account.plaid_item_id == item.id)))
            .scalars()
            .all()
        )
    }

    liabilities = response["liabilities"]
    for raw in liabilities.get("credit") or []:
        account = accounts.get(raw["account_id"])
        if account is None:
            continue
        aprs = raw.get("aprs") or []
        purchase = next((a for a in aprs if a["apr_type"] == "purchase_apr"), None)
        account.apr_percentage = (purchase or (aprs[0] if aprs else {})).get("apr_percentage")
        account.next_payment_due_date = raw.get("next_payment_due_date")
        account.minimum_payment_cents = to_cents(raw.get("minimum_payment_amount"))
    for raw in (liabilities.get("student") or []) + (liabilities.get("mortgage") or []):
        account = accounts.get(raw["account_id"])
        if account is None:
            continue
        account.apr_percentage = raw.get("interest_rate_percentage") or (
            raw.get("interest_rate") or {}
        ).get("percentage")
        account.next_payment_due_date = raw.get("next_payment_due_date")
        account.minimum_payment_cents = to_cents(raw.get("minimum_payment_amount"))
