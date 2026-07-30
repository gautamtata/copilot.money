import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_session
from app.models import Account
from app.schemas.accounts import AccountOut, AccountPatch, AccountsResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _to_out(account: Account) -> AccountOut:
    return AccountOut(
        id=account.id,
        name=account.name,
        official_name=account.official_name,
        mask=account.mask,
        type=account.type,
        subtype=account.subtype,
        currency=account.currency,
        current_balance_cents=account.current_balance_cents,
        available_balance_cents=account.available_balance_cents,
        credit_limit_cents=account.credit_limit_cents,
        balance_as_of=account.balance_as_of,
        is_hidden=account.is_hidden,
        institution_name=account.item.institution_name,
    )


@router.get("")
async def list_accounts(session: AsyncSession = Depends(get_session)) -> AccountsResponse:
    accounts = (
        (
            await session.execute(
                select(Account).options(joinedload(Account.item)).order_by(Account.created_at)
            )
        )
        .scalars()
        .all()
    )
    return AccountsResponse(accounts=[_to_out(a) for a in accounts])


@router.patch("/{account_id}")
async def patch_account(
    account_id: uuid.UUID, body: AccountPatch, session: AsyncSession = Depends(get_session)
) -> AccountOut:
    account = await session.get(Account, account_id, options=[joinedload(Account.item)])
    if not account:
        raise HTTPException(404, "Unknown account")
    account.is_hidden = body.is_hidden
    await session.commit()
    return _to_out(account)
