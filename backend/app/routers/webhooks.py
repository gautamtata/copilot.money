import json
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from sqlalchemy import select

from app.db import async_session_factory
from app.models import PlaidItem, PlaidWebhookEvent
from app.services.webhook_verify import verify_plaid_webhook

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Item statuses that require the user to re-link via update mode.
LOGIN_REQUIRED_ERRORS = {"ITEM_LOGIN_REQUIRED", "PENDING_EXPIRATION", "PENDING_DISCONNECT"}


async def process_webhook(event_id) -> None:
    async with async_session_factory() as session:
        event = await session.get(PlaidWebhookEvent, event_id)
        if event is None:
            return
        try:
            if event.webhook_type == "ITEM":
                await _handle_item_webhook(session, event)
            elif (
                event.webhook_type == "TRANSACTIONS"
                and event.webhook_code == "SYNC_UPDATES_AVAILABLE"
            ):
                await _handle_sync_webhook(session, event)
            elif event.webhook_type in ("HOLDINGS", "INVESTMENTS_TRANSACTIONS"):
                await _handle_holdings_webhook(session, event)
            elif (
                event.webhook_type == "TRANSACTIONS"
                and event.webhook_code == "RECURRING_TRANSACTIONS_UPDATE"
            ):
                await _handle_recurring_webhook(session, event)
            event.processed_at = datetime.now(UTC)
        except Exception as exc:
            event.error = str(exc)
        await session.commit()


async def _handle_sync_webhook(session, event: PlaidWebhookEvent) -> None:
    from app.services.sync import sync_item

    item = (
        await session.execute(
            select(PlaidItem).where(PlaidItem.plaid_item_id == event.plaid_item_id)
        )
    ).scalar_one_or_none()
    if item is not None:
        await sync_item(item.id)


async def _handle_recurring_webhook(session, event: PlaidWebhookEvent) -> None:
    from app.services.recurring import sync_recurrings

    item = (
        await session.execute(
            select(PlaidItem).where(PlaidItem.plaid_item_id == event.plaid_item_id)
        )
    ).scalar_one_or_none()
    if item is not None:
        await sync_recurrings(session, item)


async def _handle_holdings_webhook(session, event: PlaidWebhookEvent) -> None:
    from app.services.investments import sync_holdings

    item = (
        await session.execute(
            select(PlaidItem).where(PlaidItem.plaid_item_id == event.plaid_item_id)
        )
    ).scalar_one_or_none()
    if item is not None:
        await sync_holdings(session, item)


async def _handle_item_webhook(session, event: PlaidWebhookEvent) -> None:
    item = (
        await session.execute(
            select(PlaidItem).where(PlaidItem.plaid_item_id == event.plaid_item_id)
        )
    ).scalar_one_or_none()
    if item is None:
        return
    code = event.webhook_code
    if code == "ERROR":
        error_code = (event.payload.get("error") or {}).get("error_code")
        item.error_code = error_code
        item.status = "login_required" if error_code in LOGIN_REQUIRED_ERRORS else "error"
    elif code == "PENDING_EXPIRATION":
        item.status = "login_required"
    elif code == "LOGIN_REPAIRED":
        item.status = "active"
        item.error_code = None


@router.post("/plaid")
async def plaid_webhook(
    request: Request,
    background: BackgroundTasks,
    plaid_verification: str = Header(default="", alias="Plaid-Verification"),
) -> dict[str, str]:
    body = await request.body()
    if not verify_plaid_webhook(body, plaid_verification):
        raise HTTPException(401, "Webhook verification failed")
    payload = json.loads(body)
    async with async_session_factory() as session:
        event = PlaidWebhookEvent(
            webhook_type=payload.get("webhook_type", ""),
            webhook_code=payload.get("webhook_code", ""),
            plaid_item_id=payload.get("item_id"),
            payload=payload,
        )
        session.add(event)
        await session.commit()
        event_id = event.id
    background.add_task(process_webhook, event_id)
    return {"status": "received"}
