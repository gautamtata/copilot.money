from functools import lru_cache

import plaid
from plaid.api import plaid_api

from app.config import get_settings

_ENVIRONMENTS = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}


@lru_cache
def get_plaid_client() -> plaid_api.PlaidApi:
    settings = get_settings()
    configuration = plaid.Configuration(
        host=_ENVIRONMENTS[settings.plaid_env],
        api_key={"clientId": settings.plaid_client_id, "secret": settings.plaid_secret},
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))
