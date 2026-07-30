import uuid
from datetime import datetime

from pydantic import BaseModel


class LinkTokenRequest(BaseModel):
    item_id: uuid.UUID | None = None


class LinkTokenResponse(BaseModel):
    link_token: str


class ExchangeRequest(BaseModel):
    public_token: str
    institution_id: str | None = None
    institution_name: str | None = None


class PlaidItemOut(BaseModel):
    id: uuid.UUID
    institution_id: str | None
    institution_name: str | None
    status: str
    error_code: str | None
    last_synced_at: datetime | None
    account_count: int

    model_config = {"from_attributes": True}


class ExchangeResponse(BaseModel):
    item: PlaidItemOut
