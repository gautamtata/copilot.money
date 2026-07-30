from fastapi import APIRouter, Depends, FastAPI

from app.auth import require_api_token

app = FastAPI(title="copilot.money API")

# Public routes: health check only (Plaid webhooks join this router in M2
# with their own JWT verification).
public = APIRouter(prefix="/api/backend")

# Everything else requires the shared bearer token from the Next.js proxy.
api = APIRouter(prefix="/api/backend", dependencies=[Depends(require_api_token)])


@public.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(public)
app.include_router(api)
