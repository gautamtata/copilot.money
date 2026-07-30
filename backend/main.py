from fastapi import APIRouter, FastAPI

app = FastAPI(title="copilot.money API")

# All routes live under /api/backend to match the Vercel rewrite in vercel.json.
router = APIRouter(prefix="/api/backend")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(router)
