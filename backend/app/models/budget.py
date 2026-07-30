import uuid
from datetime import date as date_type

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Budget(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Monthly budget per category. A month with no row inherits the most
    recent prior row (carry-forward, computed at read time)."""

    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("category_id", "month"),
        CheckConstraint("date_trunc('month', month) = month", name="month_is_first_day"),
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE")
    )
    month: Mapped[date_type] = mapped_column(Date)
    amount_cents: Mapped[int] = mapped_column(BigInteger)
