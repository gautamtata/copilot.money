import uuid
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel


class HoldingOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_name: str
    ticker: str | None
    security_name: str | None
    security_type: str | None
    quantity: float
    close_price: float | None
    cost_basis_cents: int | None
    value_cents: int | None
    as_of: datetime | None


class AllocationSlice(BaseModel):
    label: str
    value_cents: int
    percent: float


class InvestmentsResponse(BaseModel):
    total_value_cents: int
    holdings: list[HoldingOut]
    allocation: list[AllocationSlice]


class NetWorthPoint(BaseModel):
    date: date_type
    assets_cents: int
    liabilities_cents: int
    net_cents: int


class NetWorthResponse(BaseModel):
    current_assets_cents: int
    current_liabilities_cents: int
    current_net_cents: int
    series: list[NetWorthPoint]


class AccountHistoryPoint(BaseModel):
    date: date_type
    current_balance_cents: int | None
