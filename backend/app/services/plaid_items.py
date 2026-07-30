from datetime import UTC, datetime

from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Account, PlaidItem
from app.services.money import to_cents
from app.services.plaid_client import get_plaid_client

CLIENT_NAME = "copilot.money"
CLIENT_USER_ID = "owner"


def create_link_token(access_token: str | None = None) -> str:
    settings = get_settings()
    kwargs: dict = {
        "client_name": CLIENT_NAME,
        "country_codes": [CountryCode("US")],
        "language": "en",
        "user": LinkTokenCreateRequestUser(client_user_id=CLIENT_USER_ID),
    }
    if access_token:
        # Update mode: reconnect an existing item; products must not be sent.
        kwargs["access_token"] = access_token
    else:
        kwargs["products"] = [Products("transactions")]
    if settings.plaid_webhook_url:
        kwargs["webhook"] = settings.plaid_webhook_url
    response = get_plaid_client().link_token_create(LinkTokenCreateRequest(**kwargs))
    return response["link_token"]


async def exchange_public_token(
    session: AsyncSession,
    public_token: str,
    institution_id: str | None,
    institution_name: str | None,
) -> PlaidItem:
    client = get_plaid_client()
    exchange = client.item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=public_token)
    )
    item = PlaidItem(
        plaid_item_id=exchange["item_id"],
        access_token=exchange["access_token"],
        institution_id=institution_id,
        institution_name=institution_name,
    )
    session.add(item)
    await session.flush()
    await sync_accounts(session, item)
    await session.commit()
    await session.refresh(item)
    return item


async def sync_accounts(session: AsyncSession, item: PlaidItem) -> None:
    """Upsert the item's accounts and balances from /accounts/get."""
    response = get_plaid_client().accounts_get(AccountsGetRequest(access_token=item.access_token))
    existing = {
        account.plaid_account_id: account
        for account in (
            await session.execute(select(Account).where(Account.plaid_item_id == item.id))
        ).scalars()
    }
    now = datetime.now(UTC)
    for raw in response["accounts"]:
        balances = raw["balances"]
        account = existing.get(raw["account_id"]) or Account(
            plaid_item_id=item.id, plaid_account_id=raw["account_id"]
        )
        account.name = raw["name"]
        account.official_name = raw["official_name"]
        account.mask = raw["mask"]
        account.type = str(raw["type"])
        account.subtype = str(raw["subtype"]) if raw["subtype"] else None
        account.currency = balances["iso_currency_code"] or "USD"
        account.current_balance_cents = to_cents(balances["current"])
        account.available_balance_cents = to_cents(balances["available"])
        account.credit_limit_cents = to_cents(balances["limit"])
        account.balance_as_of = now
        session.add(account)


def item_out_dict(item: PlaidItem, account_count: int) -> dict:
    return {
        "id": item.id,
        "institution_id": item.institution_id,
        "institution_name": item.institution_name,
        "status": item.status,
        "error_code": item.error_code,
        "last_synced_at": item.last_synced_at,
        "account_count": account_count,
    }
