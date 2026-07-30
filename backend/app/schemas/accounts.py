import uuid
from datetime import datetime

from pydantic import BaseModel


class AccountOut(BaseModel):
    id: uuid.UUID
    name: str
    official_name: str | None
    mask: str | None
    type: str
    subtype: str | None
    currency: str
    current_balance_cents: int | None
    available_balance_cents: int | None
    credit_limit_cents: int | None
    balance_as_of: datetime | None
    is_hidden: bool
    institution_name: str | None

    model_config = {"from_attributes": True}


class AccountsResponse(BaseModel):
    accounts: list[AccountOut]


class AccountPatch(BaseModel):
    is_hidden: bool
