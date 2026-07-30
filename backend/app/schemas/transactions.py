import uuid
from datetime import date as date_type

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    emoji: str
    is_income: bool
    exclude_from_budget: bool
    sort_order: int
    is_system: bool

    model_config = {"from_attributes": True}


class TransactionOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_name: str
    date: date_type
    name: str
    merchant_name: str | None
    logo_url: str | None
    amount_cents: int
    currency: str
    pending: bool
    category: CategoryOut | None
    categorized_by: str
    notes: str | None
    excluded: bool


class TransactionsPage(BaseModel):
    transactions: list[TransactionOut]
    next_cursor: str | None


class TransactionPatch(BaseModel):
    category_id: uuid.UUID | None = None
    notes: str | None = None
    excluded: bool | None = None


class CategoryCreate(BaseModel):
    name: str
    emoji: str = "🏷️"
    is_income: bool = False
    exclude_from_budget: bool = False


class CategoryPatch(BaseModel):
    name: str | None = None
    emoji: str | None = None
    is_income: bool | None = None
    exclude_from_budget: bool | None = None
    sort_order: int | None = None


class RuleOut(BaseModel):
    id: uuid.UUID
    merchant_pattern: str
    match_type: str
    category_id: uuid.UUID
    priority: int

    model_config = {"from_attributes": True}


class RuleCreate(BaseModel):
    merchant_pattern: str
    match_type: str = "exact"
    category_id: uuid.UUID
    priority: int = 100
    apply_to_existing: bool = False


class RuleApplyResult(BaseModel):
    rule: RuleOut
    retroactively_categorized: int
