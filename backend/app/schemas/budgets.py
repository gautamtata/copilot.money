import uuid
from datetime import date as date_type

from pydantic import BaseModel

from app.schemas.transactions import CategoryOut


class BudgetPut(BaseModel):
    category_id: uuid.UUID
    month: date_type
    amount_cents: int


class BudgetCategorySummary(BaseModel):
    category: CategoryOut
    budget_cents: int | None
    spent_cents: int


class BudgetSummary(BaseModel):
    month: date_type
    income_cents: int
    total_budget_cents: int
    total_spent_cents: int
    categories: list[BudgetCategorySummary]


class CashflowMonth(BaseModel):
    month: date_type
    income_cents: int
    expense_cents: int
    net_cents: int
