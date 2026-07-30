from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Transaction
from app.services.budgets import month_start


async def monthly_cashflow(session: AsyncSession, months: int) -> list[dict]:
    """Income/expense/net per month, oldest first. Categories excluded from
    budget (transfers, credit card payments) don't count as spending."""
    today = date_type.today()
    start = month_start(today)
    for _ in range(months - 1):
        start = month_start(start - timedelta(days=1))

    month_col = func.date_trunc("month", Transaction.date).label("month")
    income_col = func.sum(
        case((Category.is_income.is_(True), -Transaction.amount_cents), else_=0)
    ).label("income")
    expense_col = func.sum(
        case(
            (
                Category.is_income.is_(False) & Category.exclude_from_budget.is_(False),
                Transaction.amount_cents,
            ),
            (Transaction.category_id.is_(None), Transaction.amount_cents),
            else_=0,
        )
    ).label("expense")

    rows = await session.execute(
        select(month_col, income_col, expense_col)
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(
            Transaction.deleted_at.is_(None),
            Transaction.excluded.is_(False),
            Transaction.date >= start,
        )
        .group_by(month_col)
        .order_by(month_col)
    )
    by_month = {row.month.date(): row for row in rows.all()}

    result = []
    cursor = start
    while cursor <= today:
        row = by_month.get(cursor)
        income = int(row.income) if row else 0
        expense = int(row.expense) if row else 0
        result.append(
            {
                "month": cursor,
                "income_cents": income,
                "expense_cents": expense,
                "net_cents": income - expense,
            }
        )
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return result
