import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import BigInteger, Date, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.category import Category
from app.models.plaid import Account


class Transaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_date", "date"),
        Index("ix_transactions_account_date", "account_id", "date"),
        Index("ix_transactions_category_date", "category_id", "date"),
        Index("ix_transactions_pending_txn_id", "plaid_pending_transaction_id"),
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE")
    )
    plaid_transaction_id: Mapped[str | None] = mapped_column(Text, unique=True)
    plaid_pending_transaction_id: Mapped[str | None] = mapped_column(Text)
    # Plaid's sign convention: positive = money out, negative = money in.
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(Text, default="USD", server_default="USD")
    date: Mapped[date_type] = mapped_column(Date)
    name: Mapped[str] = mapped_column(Text)
    merchant_name: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)
    pending: Mapped[bool] = mapped_column(default=False, server_default="false")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL")
    )
    categorized_by: Mapped[str] = mapped_column(Text, default="none", server_default="none")
    plaid_category_primary: Mapped[str | None] = mapped_column(Text)
    plaid_category_detailed: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    excluded: Mapped[bool] = mapped_column(default=False, server_default="false")
    deleted_at: Mapped[datetime | None]

    account: Mapped[Account] = relationship()
    category: Mapped[Category | None] = relationship()
