"""
Authentication dependencies for JurisQuery.
JWT validation and user extraction from Clerk tokens.
Clerk tokens are RS256-signed — verified via Clerk's JWKS endpoint.
"""

import httpx
import logging
from fastapi import Header, Depends
from jose import JWTError, jwt

from app.config import settings
from app.exceptions import UnauthorizedError


logger = logging.getLogger(__name__)


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


from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.models import User

async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Extract and validate user from Clerk JWT token.
    Fetches real-time SaaS entitlements from local PostgreSQL mapping.
    """
    # In development, allow requests without auth
    if not authorization:
        if settings.environment == "development":
            return DEV_USER
        raise UnauthorizedError("Authorization header required")

    if not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Invalid authorization header format")

    try:
        token = authorization.split(" ", 1)[1]
    except IndexError:
        raise UnauthorizedError("Token missing in authorization header")

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
                    # Clear cache and retry once in case keys were rotated
                    global _jwks_cache
                    _jwks_cache = None
                    jwks = await _get_jwks()
                    key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
                    
                    if not key_data:
                        raise UnauthorizedError("No matching key found in JWKS (even after rotation fetch)")
                
                payload = jwt.decode(
                    token,
                    key_data,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
            except Exception as e:
                # Log the specific error for debugging
                logger.error("Auth Error: %s", e) 
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

        # Guarantee Real-time SaaS Entitlement Synced State
        result = await db.execute(select(User).where(User.clerk_id == user_id))
        db_user = result.scalar_one_or_none()
        
        plan_tier = "free"
        stripe_customer_id = None
        if db_user:
            plan_tier = db_user.plan_tier
            stripe_customer_id = db_user.stripe_customer_id

        return {
            "id": user_id,
            "email": payload.get("email"),
            "clerk_id": user_id,
            "plan_tier": plan_tier,
            "stripe_customer_id": stripe_customer_id
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
