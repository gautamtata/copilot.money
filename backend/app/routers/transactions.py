import base64
import uuid
from datetime import date as date_type

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import or_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_session
from app.models import Transaction
from app.schemas.transactions import (
    CategoryOut,
    TransactionOut,
    TransactionPatch,
    TransactionsPage,
)
from app.services.sync import sync_all_items

router = APIRouter(tags=["transactions"])


def _encode_cursor(d: date_type, id_: uuid.UUID) -> str:
    return base64.urlsafe_b64encode(f"{d.isoformat()}|{id_}".encode()).decode()


def _decode_cursor(cursor: str) -> tuple[date_type, uuid.UUID]:
    try:
        raw_date, raw_id = base64.urlsafe_b64decode(cursor).decode().split("|")
        return date_type.fromisoformat(raw_date), uuid.UUID(raw_id)
    except Exception:
        raise HTTPException(400, "Invalid cursor")


def _to_out(txn: Transaction) -> TransactionOut:
    return TransactionOut(
        id=txn.id,
        account_id=txn.account_id,
        account_name=txn.account.name,
        date=txn.date,
        name=txn.name,
        merchant_name=txn.merchant_name,
        logo_url=txn.logo_url,
        amount_cents=txn.amount_cents,
        currency=txn.currency,
        pending=txn.pending,
        category=CategoryOut.model_validate(txn.category) if txn.category else None,
        categorized_by=txn.categorized_by,
        notes=txn.notes,
        excluded=txn.excluded,
    )


@router.get("/transactions")
async def list_transactions(
    cursor: str | None = None,
    limit: int = Query(default=50, le=200),
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    search: str | None = None,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    session: AsyncSession = Depends(get_session),
) -> TransactionsPage:
    query = (
        select(Transaction)
        .options(joinedload(Transaction.account), joinedload(Transaction.category))
        .where(Transaction.deleted_at.is_(None))
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(limit + 1)
    )
    if cursor:
        after_date, after_id = _decode_cursor(cursor)
        query = query.where(tuple_(Transaction.date, Transaction.id) < (after_date, after_id))
    if account_id:
        query = query.where(Transaction.account_id == account_id)
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(Transaction.name.ilike(pattern), Transaction.merchant_name.ilike(pattern))
        )
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)

    rows = (await session.execute(query)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = _encode_cursor(rows[-1].date, rows[-1].id) if has_more and rows else None
    return TransactionsPage(transactions=[_to_out(t) for t in rows], next_cursor=next_cursor)


@router.patch("/transactions/{transaction_id}")
async def patch_transaction(
    transaction_id: uuid.UUID,
    body: TransactionPatch,
    session: AsyncSession = Depends(get_session),
) -> TransactionOut:
    txn = await session.get(
        Transaction,
        transaction_id,
        options=[joinedload(Transaction.account), joinedload(Transaction.category)],
    )
    if txn is None or txn.deleted_at is not None:
        raise HTTPException(404, "Unknown transaction")

    fields = body.model_dump(exclude_unset=True)
    if "category_id" in fields:
        txn.category_id = fields["category_id"]
        txn.categorized_by = "user"
    if "notes" in fields:
        txn.notes = fields["notes"]
    if "excluded" in fields:
        txn.excluded = fields["excluded"]

    await session.commit()
    await session.refresh(txn, ["category"])
    return _to_out(txn)


@router.post("/sync", status_code=202)
async def trigger_sync(background: BackgroundTasks) -> dict[str, str]:
    background.add_task(sync_all_items)
    return {"status": "syncing"}
