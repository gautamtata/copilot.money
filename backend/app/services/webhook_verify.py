import hashlib
import time

import jwt
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest

from app.services.plaid_client import get_plaid_client

# Plaid rotates verification keys rarely; cache them by key id.
_key_cache: dict[str, dict] = {}

MAX_TOKEN_AGE_SECONDS = 5 * 60


def _get_key(key_id: str) -> dict:
    if key_id not in _key_cache:
        response = get_plaid_client().webhook_verification_key_get(
            WebhookVerificationKeyGetRequest(key_id=key_id)
        )
        _key_cache[key_id] = response["key"].to_dict()
    return _key_cache[key_id]


def verify_plaid_webhook(body: bytes, verification_header: str) -> bool:
    """Verify the Plaid-Verification JWT per Plaid's webhook verification docs."""
    try:
        header = jwt.get_unverified_header(verification_header)
        if header.get("alg") != "ES256":
            return False
        key = _get_key(header["kid"])
        public_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
        claims = jwt.decode(verification_header, public_key, algorithms=["ES256"])
    except Exception:
        # Any malformed or unverifiable token means the webhook is not from Plaid.
        return False
    if claims.get("iat", 0) < time.time() - MAX_TOKEN_AGE_SECONDS:
        return False
    return hashlib.sha256(body).hexdigest() == claims.get("request_body_sha256")
