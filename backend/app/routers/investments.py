import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_session
from app.models import Account, AccountSnapshot, Holding
from app.schemas.investments import (
    AccountHistoryPoint,
    AllocationSlice,
    HoldingOut,
    InvestmentsResponse,
    NetWorthPoint,
    NetWorthResponse,
)
from app.services.net_worth import LIABILITY_TYPES, net_worth_history

router = APIRouter(tags=["investments"])


@router.get("/investments")
async def get_investments(session: AsyncSession = Depends(get_session)) -> InvestmentsResponse:
    holdings = (
        (
            await session.execute(
                select(Holding).options(
                    joinedload(Holding.account), joinedload(Holding.security)
                )
            )
        )
        .scalars()
        .all()
    )

    out: list[HoldingOut] = []
    allocation_totals: dict[str, int] = {}
    for h in holdings:
        value = h.institution_value_cents or 0
        out.append(
            HoldingOut(
                id=h.id,
                account_id=h.account_id,
                account_name=h.account.name,
                ticker=h.security.ticker,
                security_name=h.security.name,
                security_type=h.security.type,
                quantity=float(h.quantity),
                close_price=float(h.security.close_price) if h.security.close_price else None,
                cost_basis_cents=h.cost_basis_cents,
                value_cents=h.institution_value_cents,
                as_of=h.as_of,
            )
        )
        label = (h.security.type or "other").replace("_", " ").title()
        allocation_totals[label] = allocation_totals.get(label, 0) + value

    total = sum(allocation_totals.values())
    allocation = sorted(
        (
            AllocationSlice(
                label=label,
                value_cents=value,
                percent=round(value / total * 100, 2) if total else 0,
            )
            for label, value in allocation_totals.items()
        ),
        key=lambda s: -s.value_cents,
    )
    out.sort(key=lambda h: -(h.value_cents or 0))
    return InvestmentsResponse(total_value_cents=total, holdings=out, allocation=allocation)


@router.get("/net-worth/history")
async def get_net_worth_history(
    days: int = Query(default=365, ge=7, le=3650),
    session: AsyncSession = Depends(get_session),
) -> NetWorthResponse:
    series = await net_worth_history(session, days)

    # Current totals come from live balances, not the last snapshot.
    accounts = (
        (await session.execute(select(Account).where(Account.is_hidden.is_(False))))
        .scalars()
        .all()
    )
    assets = sum(
        a.current_balance_cents or 0 for a in accounts if a.type not in LIABILITY_TYPES
    )
    liabilities = sum(
        a.current_balance_cents or 0 for a in accounts if a.type in LIABILITY_TYPES
    )
    return NetWorthResponse(
        current_assets_cents=assets,
        current_liabilities_cents=liabilities,
        current_net_cents=assets - liabilities,
        series=[NetWorthPoint.model_validate(p) for p in series],
    )


@router.get("/accounts/{account_id}/history")
async def get_account_history(
    account_id: uuid.UUID,
    days: int = Query(default=365, ge=7, le=3650),
    session: AsyncSession = Depends(get_session),
) -> list[AccountHistoryPoint]:
    rows = (
        (
            await session.execute(
                select(AccountSnapshot)
                .where(
                    AccountSnapshot.account_id == account_id,
                    AccountSnapshot.date >= date.today() - timedelta(days=days),
                )
                .order_by(AccountSnapshot.date)
            )
        )
        .scalars()
        .all()
    )
    return [
        AccountHistoryPoint(date=s.date, current_balance_cents=s.current_balance_cents)
        for s in rows
    ]
