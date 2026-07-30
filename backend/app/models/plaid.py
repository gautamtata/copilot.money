import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PlaidItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "plaid_items"

    plaid_item_id: Mapped[str] = mapped_column(Text, unique=True)
    access_token: Mapped[str] = mapped_column(Text)
    institution_id: Mapped[str | None] = mapped_column(Text)
    institution_name: Mapped[str | None] = mapped_column(Text)
    sync_cursor: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="active", server_default="active")
    error_code: Mapped[str | None] = mapped_column(Text)
    last_synced_at: Mapped[datetime | None]

    accounts: Mapped[list["Account"]] = relationship(back_populates="item")


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "accounts"

    plaid_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plaid_items.id", ondelete="CASCADE")
    )
    plaid_account_id: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    official_name: Mapped[str | None] = mapped_column(Text)
    mask: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(Text)
    subtype: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(Text, default="USD", server_default="USD")
    current_balance_cents: Mapped[int | None] = mapped_column(BigInteger)
    available_balance_cents: Mapped[int | None] = mapped_column(BigInteger)
    credit_limit_cents: Mapped[int | None] = mapped_column(BigInteger)
    balance_as_of: Mapped[datetime | None]
    is_hidden: Mapped[bool] = mapped_column(default=False, server_default="false")

    item: Mapped[PlaidItem] = relationship(back_populates="accounts")


class PlaidWebhookEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "plaid_webhook_events"

    webhook_type: Mapped[str] = mapped_column(Text)
    webhook_code: Mapped[str] = mapped_column(Text)
    plaid_item_id: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB)
    processed_at: Mapped[datetime | None]
    error: Mapped[str | None] = mapped_column(Text)
