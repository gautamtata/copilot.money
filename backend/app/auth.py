import secrets

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_api_token(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {get_settings().backend_api_token}"
    if not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")
