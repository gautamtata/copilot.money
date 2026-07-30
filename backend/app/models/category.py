import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(Text, unique=True)
    emoji: Mapped[str] = mapped_column(Text, default="🏷️", server_default="🏷️")
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL")
    )
    is_income: Mapped[bool] = mapped_column(default=False, server_default="false")
    exclude_from_budget: Mapped[bool] = mapped_column(default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    is_system: Mapped[bool] = mapped_column(default=False, server_default="false")


class CategoryRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "category_rules"

    merchant_pattern: Mapped[str] = mapped_column(Text)
    match_type: Mapped[str] = mapped_column(Text, default="exact", server_default="exact")
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE")
    )
    priority: Mapped[int] = mapped_column(default=100, server_default="100")
