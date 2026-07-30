from fastapi import APIRouter, Depends, FastAPI

from app.auth import require_api_token
from app.routers import accounts, categories, plaid, transactions, webhooks

app = FastAPI(title="copilot.money API")

# Public routes: health check and Plaid webhooks (verified via Plaid's JWT).
public = APIRouter(prefix="/api/backend")

# Everything else requires the shared bearer token from the Next.js proxy.
api = APIRouter(prefix="/api/backend", dependencies=[Depends(require_api_token)])


@public.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


public.include_router(webhooks.router)
api.include_router(plaid.router)
api.include_router(accounts.router)
api.include_router(transactions.router)
api.include_router(categories.router)

app.include_router(public)
app.include_router(api)
