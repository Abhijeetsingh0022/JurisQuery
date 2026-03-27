"""
Authentication dependencies for JurisQuery.
JWT validation and user extraction from Clerk tokens.
Clerk tokens are RS256-signed — verified via Clerk's JWKS endpoint.
"""

import httpx
from fastapi import Header
from jose import JWTError, jwt
from jose.backends import RSAKey

from app.config import settings
from app.exceptions import UnauthorizedError


# Development mode user for testing
DEV_USER = {
    "id": "dev_user_123",
    "email": "dev@jurisquery.ai",
    "clerk_id": "dev_clerk_123",
}

# Cached JWKS keys (fetched once per process)
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    # Derive JWKS URL from Clerk issuer domain
    # e.g. https://grown-hyena-6.clerk.accounts.dev → /.well-known/jwks.json
    clerk_domain = settings.clerk_frontend_api or "https://clerk.accounts.dev"
    jwks_url = f"{clerk_domain.rstrip('/')}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(authorization: str | None = Header(None)) -> dict:
    """
    Extract and validate user from Clerk JWT token.
    In development mode, returns a dev user if no token provided.
    """
    # In development, allow requests without auth
    if not authorization:
        if settings.environment == "development":
            return DEV_USER
        raise UnauthorizedError("Authorization header required")

    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Invalid authorization header format")

    token = authorization.replace("Bearer ", "")

    try:
        # First try Clerk RS256 verification via JWKS
        if settings.clerk_frontend_api:
            jwks = await _get_jwks()
            try:
                unverified_header = jwt.get_unverified_header(token)
                kid = unverified_header.get("kid")
                if not kid:
                    raise UnauthorizedError("Token missing 'kid' header")
                
                # Find the key that matches the kid
                key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
                if not key_data:
                    raise UnauthorizedError("No matching key found in JWKS")
                
                payload = jwt.decode(
                    token,
                    key_data,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
            except Exception as e:
                if settings.environment == "development":
                    return DEV_USER
                raise UnauthorizedError(f"JWKS validation failed: {str(e)}")
        else:
            # Fallback: local HS256 secret (dev/legacy)
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token payload")

        return {
            "id": user_id,
            "email": payload.get("email"),
            "clerk_id": user_id,
        }

    except JWTError as e:
        if settings.environment == "development":
            return DEV_USER
        raise UnauthorizedError(f"Token validation failed: {str(e)}")


async def get_optional_user(
    authorization: str | None = Header(None),
) -> dict | None:
    """
    Optionally extract user from JWT token.
    Returns None if no token provided.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except UnauthorizedError:
        return None
