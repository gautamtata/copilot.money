"""Daily maintenance: balance refresh + re-sync fallback for dropped webhooks.

Railway runs a single always-on backend instance, so an in-process scheduler
is safe — no separate worker service needed.
"""

import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db import async_session_factory
from app.models import PlaidItem
from app.services.plaid_items import sync_accounts
from app.services.sync import sync_item

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")

STALE_AFTER = timedelta(hours=24)


async def daily_maintenance() -> None:
    async with async_session_factory() as session:
        items = (
            (await session.execute(select(PlaidItem).where(PlaidItem.status == "active")))
            .scalars()
            .all()
        )
        stale_ids = [
            item.id
            for item in items
            if item.last_synced_at is None
            or item.last_synced_at < datetime.now(UTC) - STALE_AFTER
        ]
        for item in items:
            try:
                await sync_accounts(session, item)
            except Exception:
                logger.exception("Balance refresh failed for item %s", item.id)
        await session.commit()

    # Webhook fallback: catch anything a dropped webhook missed.
    for item_id in stale_ids:
        try:
            await sync_item(item_id)
        except Exception:
            logger.exception("Fallback sync failed for item %s", item_id)


def start_scheduler() -> None:
    scheduler.add_job(daily_maintenance, "cron", hour=6, minute=0, id="daily_maintenance")
    scheduler.start()


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
