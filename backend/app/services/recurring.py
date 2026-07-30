"""Recurring stream ingestion from Plaid /transactions/recurring/get."""

from plaid.exceptions import ApiException
from plaid.model.transactions_recurring_get_request import TransactionsRecurringGetRequest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, PlaidItem, Recurring, Transaction
from app.services.categorize import Categorizer
from app.services.investments import is_skippable_plaid_error
from app.services.money import to_cents
from app.services.plaid_client import get_plaid_client

_CADENCES = {
    "WEEKLY": "weekly",
    "BIWEEKLY": "biweekly",
    "SEMI_MONTHLY": "semi_monthly",
    "MONTHLY": "monthly",
    "QUARTERLY": "quarterly",
    "ANNUALLY": "annually",
}


async def sync_recurrings(session: AsyncSession, item: PlaidItem) -> None:
    try:
        response = get_plaid_client().transactions_recurring_get(
            TransactionsRecurringGetRequest(access_token=item.access_token)
        )
    except ApiException as exc:
        if is_skippable_plaid_error(exc):
            return
        raise

    account_ids = dict(
        (
            await session.execute(
                select(Account.plaid_account_id, Account.id).where(
                    Account.plaid_item_id == item.id
                )
            )
        ).all()
    )
    existing = {
        r.plaid_stream_id: r
        for r in (
            (
                await session.execute(
                    select(Recurring).where(Recurring.plaid_stream_id.is_not(None))
                )
            )
            .scalars()
            .all()
        )
    }
    categorizer = await Categorizer.load(session)

    for raw in list(response["inflow_streams"]) + list(response["outflow_streams"]):
        recurring = existing.get(raw["stream_id"]) or Recurring(
            plaid_stream_id=raw["stream_id"]
        )
        recurring.account_id = account_ids.get(raw["account_id"])
        recurring.merchant_name = raw.get("merchant_name")
        recurring.name = raw.get("description") or recurring.merchant_name or "Recurring"
        recurring.cadence = _CADENCES.get(str(raw.get("frequency")), "unknown")
        recurring.average_amount_cents = to_cents((raw.get("average_amount") or {}).get("amount"))
        recurring.last_amount_cents = to_cents((raw.get("last_amount") or {}).get("amount"))
        recurring.last_date = raw.get("last_date")
        recurring.next_expected_date = raw.get("predicted_next_date")
        recurring.is_active = bool(raw.get("is_active", True))
        if recurring.category_id is None:
            pfc = raw.get("personal_finance_category") or {}
            recurring.category_id = categorizer.match_pfc(
                pfc.get("primary"), pfc.get("detailed")
            )
        session.add(recurring)
        await session.flush()

        transaction_ids = list(raw.get("transaction_ids") or [])
        if transaction_ids:
            await session.execute(
                update(Transaction)
                .where(Transaction.plaid_transaction_id.in_(transaction_ids))
                .values(recurring_id=recurring.id)
            )


# Monthly cost normalization per cadence.
MONTHLY_FACTOR = {
    "weekly": 4.33,
    "biweekly": 2.17,
    "semi_monthly": 2.0,
    "monthly": 1.0,
    "quarterly": 1 / 3,
    "annually": 1 / 12,
    "unknown": 1.0,
}
