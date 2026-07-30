import uuid
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Budget, Category, Transaction


def month_start(d: date_type) -> date_type:
    return d.replace(day=1)


async def resolve_budgets(session: AsyncSession, month: date_type) -> dict[uuid.UUID, int]:
    """Effective budget per category for a month: the most recent row at or
    before it (carry-forward). amount_cents=0 means the budget was cleared."""
    latest = (
        select(Budget.category_id, Budget.amount_cents)
        .where(Budget.month <= month)
        .distinct(Budget.category_id)
        .order_by(Budget.category_id, Budget.month.desc())
    )
    rows = (await session.execute(latest)).all()
    return {category_id: amount for category_id, amount in rows if amount > 0}


async def spent_by_category(
    session: AsyncSession, month: date_type
) -> dict[uuid.UUID | None, int]:
    """Net spend per category for the month (Plaid sign: positive = out)."""
    next_month = (month.replace(day=28) + timedelta(days=4)).replace(day=1)
    rows = await session.execute(
        select(Transaction.category_id, func.sum(Transaction.amount_cents))
        .where(
            Transaction.deleted_at.is_(None),
            Transaction.excluded.is_(False),
            Transaction.date >= month,
            Transaction.date < next_month,
        )
        .group_by(Transaction.category_id)
    )
    return dict(rows.all())


async def budget_summary(session: AsyncSession, month: date_type) -> dict:
    month = month_start(month)
    budgets = await resolve_budgets(session, month)
    spent = await spent_by_category(session, month)
    categories = (
        (await session.execute(select(Category).order_by(Category.sort_order))).scalars().all()
    )

    items = []
    income_cents = 0
    for category in categories:
        category_spent = spent.get(category.id, 0)
        if category.is_income:
            income_cents += -category_spent
            continue
        if category.exclude_from_budget:
            continue
        items.append(
            {
                "category": category,
                "budget_cents": budgets.get(category.id),
                "spent_cents": category_spent,
            }
        )

    budgeted = [i for i in items if i["budget_cents"]]
    return {
        "month": month,
        "income_cents": income_cents,
        "total_budget_cents": sum(i["budget_cents"] for i in budgeted),
        "total_spent_cents": sum(i["spent_cents"] for i in budgeted),
        "categories": items,
    }
