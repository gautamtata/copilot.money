import uuid
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.plaid import Account


class Security(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "securities"

    plaid_security_id: Mapped[str] = mapped_column(Text, unique=True)
    ticker: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str | None] = mapped_column(Text)
    # Security prices and share quantities are not money: they carry sub-cent
    # precision and fractional shares, so NUMERIC instead of cents.
    type: Mapped[str | None] = mapped_column(Text)
    close_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 6))
    close_price_as_of: Mapped[date_type | None] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(Text, default="USD", server_default="USD")


class Holding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "holdings"
    __table_args__ = (UniqueConstraint("account_id", "security_id"),)

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE")
    )
    security_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("securities.id", ondelete="CASCADE")
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 10))
    cost_basis_cents: Mapped[int | None] = mapped_column(BigInteger)
    institution_value_cents: Mapped[int | None] = mapped_column(BigInteger)
    as_of: Mapped[datetime | None]

    account: Mapped[Account] = relationship()
    security: Mapped[Security] = relationship()


class AccountSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Daily per-account balance — the source of truth for net worth history."""

    __tablename__ = "account_snapshots"
    __table_args__ = (UniqueConstraint("account_id", "date"),)

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE")
    )
    date: Mapped[date_type] = mapped_column(Date)
    current_balance_cents: Mapped[int | None] = mapped_column(BigInteger)
    available_balance_cents: Mapped[int | None] = mapped_column(BigInteger)
