from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, AccountSnapshot

# Account types whose balance counts as debt rather than assets.
LIABILITY_TYPES = {"credit", "loan"}


async def write_snapshots(session: AsyncSession) -> None:
    """Record today's balance for every account. Idempotent per day."""
    accounts = (await session.execute(select(Account))).scalars().all()
    if not accounts:
        return
    today = date_type.today()
    await session.execute(
        insert(AccountSnapshot)
        .values(
            [
                {
                    "account_id": a.id,
                    "date": today,
                    "current_balance_cents": a.current_balance_cents,
                    "available_balance_cents": a.available_balance_cents,
                }
                for a in accounts
            ]
        )
        .on_conflict_do_update(
            index_elements=["account_id", "date"],
            set_={
                "current_balance_cents": insert(AccountSnapshot).excluded.current_balance_cents,
                "available_balance_cents": insert(
                    AccountSnapshot
                ).excluded.available_balance_cents,
            },
        )
    )


async def net_worth_history(session: AsyncSession, days: int) -> list[dict]:
    """Assets/debt/net per snapshot day, oldest first. Hidden accounts excluded."""
    since = date_type.today() - timedelta(days=days)
    rows = (
        await session.execute(
            select(
                AccountSnapshot.date,
                Account.type,
                AccountSnapshot.current_balance_cents,
            )
            .join(Account)
            .where(AccountSnapshot.date >= since, Account.is_hidden.is_(False))
            .order_by(AccountSnapshot.date)
        )
    ).all()

    by_date: dict[date_type, dict[str, int]] = {}
    for snapshot_date, account_type, balance in rows:
        bucket = by_date.setdefault(snapshot_date, {"assets": 0, "liabilities": 0})
        key = "liabilities" if account_type in LIABILITY_TYPES else "assets"
        bucket[key] += balance or 0

    return [
        {
            "date": d,
            "assets_cents": v["assets"],
            "liabilities_cents": v["liabilities"],
            "net_cents": v["assets"] - v["liabilities"],
        }
        for d, v in sorted(by_date.items())
    ]
