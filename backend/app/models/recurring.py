import uuid
from datetime import date as date_type

from sqlalchemy import BigInteger, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.category import Category


class Recurring(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "recurrings"

    plaid_stream_id: Mapped[str | None] = mapped_column(Text, unique=True)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text)
    merchant_name: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL")
    )
    # weekly | biweekly | semi_monthly | monthly | quarterly | annually | unknown
    cadence: Mapped[str] = mapped_column(Text, default="unknown", server_default="unknown")
    # Plaid sign convention: positive = money out.
    average_amount_cents: Mapped[int | None] = mapped_column(BigInteger)
    last_amount_cents: Mapped[int | None] = mapped_column(BigInteger)
    last_date: Mapped[date_type | None] = mapped_column(Date)
    next_expected_date: Mapped[date_type | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    source: Mapped[str] = mapped_column(Text, default="plaid", server_default="plaid")

    category: Mapped[Category | None] = relationship()
