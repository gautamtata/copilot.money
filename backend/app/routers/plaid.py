import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Account, PlaidItem
from app.schemas.plaid import (
    ExchangeRequest,
    ExchangeResponse,
    LinkTokenRequest,
    LinkTokenResponse,
    PlaidItemOut,
)
from app.services import plaid_items

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link_token")
async def link_token(
    body: LinkTokenRequest, session: AsyncSession = Depends(get_session)
) -> LinkTokenResponse:
    access_token = None
    if body.item_id:
        item = await session.get(PlaidItem, body.item_id)
        if not item:
            raise HTTPException(404, "Unknown item")
        access_token = item.access_token
    return LinkTokenResponse(link_token=plaid_items.create_link_token(access_token))


@router.post("/exchange")
async def exchange(
    body: ExchangeRequest, session: AsyncSession = Depends(get_session)
) -> ExchangeResponse:
    item = await plaid_items.exchange_public_token(
        session, body.public_token, body.institution_id, body.institution_name
    )
    count = await session.scalar(
        select(func.count()).select_from(Account).where(Account.plaid_item_id == item.id)
    )
    return ExchangeResponse(item=PlaidItemOut(**plaid_items.item_out_dict(item, count or 0)))


@router.get("/items")
async def list_items(session: AsyncSession = Depends(get_session)) -> list[PlaidItemOut]:
    rows = (
        await session.execute(
            select(PlaidItem, func.count(Account.id))
            .outerjoin(Account)
            .group_by(PlaidItem.id)
            .order_by(PlaidItem.created_at)
        )
    ).all()
    return [PlaidItemOut(**plaid_items.item_out_dict(item, count)) for item, count in rows]


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> None:
    item = await session.get(PlaidItem, item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    await session.delete(item)
    await session.commit()
