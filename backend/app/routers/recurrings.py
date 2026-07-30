import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_session
from app.models import Recurring
from app.schemas.transactions import CategoryOut
from app.services.recurring import MONTHLY_FACTOR

router = APIRouter(tags=["recurrings"])


class RecurringOut(BaseModel):
    id: uuid.UUID
    name: str
    merchant_name: str | None
    category: CategoryOut | None
    cadence: str
    average_amount_cents: int | None
    last_amount_cents: int | None
    last_date: date_type | None
    next_expected_date: date_type | None
    is_active: bool
    monthly_cents: int


class RecurringsResponse(BaseModel):
    monthly_total_cents: int
    recurrings: list[RecurringOut]


class RecurringPatch(BaseModel):
    is_active: bool | None = None
    category_id: uuid.UUID | None = None


def _to_out(r: Recurring) -> RecurringOut:
    amount = r.average_amount_cents or 0
    return RecurringOut(
        id=r.id,
        name=r.name,
        merchant_name=r.merchant_name,
        category=CategoryOut.model_validate(r.category) if r.category else None,
        cadence=r.cadence,
        average_amount_cents=r.average_amount_cents,
        last_amount_cents=r.last_amount_cents,
        last_date=r.last_date,
        next_expected_date=r.next_expected_date,
        is_active=r.is_active,
        monthly_cents=round(amount * MONTHLY_FACTOR.get(r.cadence, 1.0)),
    )


@router.get("/recurrings")
async def list_recurrings(session: AsyncSession = Depends(get_session)) -> RecurringsResponse:
    rows = (
        (
            await session.execute(
                select(Recurring)
                .options(joinedload(Recurring.category))
                .order_by(Recurring.next_expected_date.nulls_last())
            )
        )
        .scalars()
        .all()
    )
    # Subscriptions view: outflows only (Plaid sign: positive = money out).
    out = [_to_out(r) for r in rows if (r.average_amount_cents or 0) > 0]
    monthly_total = sum(r.monthly_cents for r in out if r.is_active)
    return RecurringsResponse(monthly_total_cents=monthly_total, recurrings=out)


@router.patch("/recurrings/{recurring_id}")
async def patch_recurring(
    recurring_id: uuid.UUID,
    body: RecurringPatch,
    session: AsyncSession = Depends(get_session),
) -> RecurringOut:
    recurring = await session.get(
        Recurring, recurring_id, options=[joinedload(Recurring.category)]
    )
    if recurring is None:
        raise HTTPException(404, "Unknown recurring")
    fields = body.model_dump(exclude_unset=True)
    if "is_active" in fields:
        recurring.is_active = fields["is_active"]
    if "category_id" in fields:
        recurring.category_id = fields["category_id"]
    await session.commit()
    await session.refresh(recurring, ["category"])
    return _to_out(recurring)
