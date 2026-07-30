from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Budget
from app.schemas.budgets import BudgetPut, BudgetSummary, CashflowMonth
from app.services.budgets import budget_summary, month_start
from app.services.cashflow import monthly_cashflow

router = APIRouter(tags=["budgets"])


@router.get("/budgets/summary")
async def get_budget_summary(
    month: date_type | None = None, session: AsyncSession = Depends(get_session)
) -> BudgetSummary:
    result = await budget_summary(session, month or date_type.today())
    return BudgetSummary.model_validate(result, from_attributes=True)


@router.put("/budgets")
async def put_budget(body: BudgetPut, session: AsyncSession = Depends(get_session)) -> dict:
    month = month_start(body.month)
    existing = (
        await session.execute(
            select(Budget).where(Budget.category_id == body.category_id, Budget.month == month)
        )
    ).scalar_one_or_none()
    if existing:
        existing.amount_cents = body.amount_cents
    else:
        session.add(
            Budget(category_id=body.category_id, month=month, amount_cents=body.amount_cents)
        )
    await session.commit()
    return {"status": "ok"}


@router.get("/cashflow")
async def get_cashflow(
    months: int = Query(default=6, ge=1, le=36), session: AsyncSession = Depends(get_session)
) -> list[CashflowMonth]:
    rows = await monthly_cashflow(session, months)
    return [CashflowMonth.model_validate(r) for r in rows]
