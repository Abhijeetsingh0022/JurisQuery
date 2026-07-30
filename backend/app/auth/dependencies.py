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
from app.exceptions import UnauthorizedError, ForbiddenError

logger = logging.getLogger(__name__)


# Development mode user for testing
DEV_USER = {
    "id": "dev_user_123",
    "email": "dev@jurisquery.ai",
    "clerk_id": "dev_clerk_123",
    "plan_tier": "pro",
    "is_admin": True,
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


from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.models import User

# Cached email mappings from Clerk API
_clerk_email_cache: dict[str, str] = {}

async def _fetch_clerk_email(user_id: str) -> str | None:
    if user_id in _clerk_email_cache:
        return _clerk_email_cache[user_id]
    
    if not settings.clerk_secret_key:
        return None
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                emails = data.get("email_addresses", [])
                primary_id = data.get("primary_email_address_id")
                primary_email = None
                for e in emails:
                    if e.get("id") == primary_id:
                        primary_email = e.get("email_address")
                        break
                if not primary_email and emails:
                    primary_email = emails[0].get("email_address")
                
                if primary_email:
                    clean_email = primary_email.lower().strip()
                    _clerk_email_cache[user_id] = clean_email
                    return clean_email
    except Exception as e:
        logger.warning("Failed to fetch user email from Clerk API for %s: %s", user_id, e)
    
    return None


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
        raw_email = (
            payload.get("email")
            or payload.get("email_address")
            or payload.get("primary_email_address")
            or ""
        )
        email = raw_email.lower().strip() if isinstance(raw_email, str) else ""

        if not user_id:
            raise UnauthorizedError("Invalid token payload")

        # Guarantee Real-time SaaS Entitlement Synced State
        stmt = select(User).where(
            or_(User.clerk_id == user_id, (User.email == email) & (User.email != ""))
        )
        result = await db.execute(stmt)
        db_user = result.scalars().first()

        # If email missing from JWT, resolve via db_user or Clerk Backend API
        if not email and db_user and db_user.email:
            email = db_user.email.lower().strip()

        if not email:
            fetched = await _fetch_clerk_email(user_id)
            if fetched:
                email = fetched

        # Determine admin privileges
        is_admin = False
        if email and email in settings.admin_emails_list:
            is_admin = True
        elif db_user and getattr(db_user, "is_admin", False):
            is_admin = True

        plan_tier = "free"
        stripe_customer_id = None

        if db_user:
            if db_user.clerk_id != user_id:
                db_user.clerk_id = user_id
            if is_admin:
                db_user.is_admin = True
                if db_user.plan_tier == "free":
                    db_user.plan_tier = "enterprise"
            
            plan_tier = db_user.plan_tier
            stripe_customer_id = db_user.stripe_customer_id
            await db.commit()
        else:
            # Auto-provision user record in DB on first login
            plan_tier = "enterprise" if is_admin else "free"
            new_user = User(
                clerk_id=user_id,
                email=email or f"{user_id}@clerk.user",
                is_admin=is_admin,
                plan_tier=plan_tier,
            )
            db.add(new_user)
            try:
                await db.commit()
                db_user = new_user
            except Exception as err:
                await db.rollback()
                logger.warning("Failed to auto-provision user %s: %s", user_id, err)

        return {
            "id": user_id,
            "email": email or (db_user.email if db_user else None),
            "clerk_id": user_id,
            "plan_tier": plan_tier,
            "stripe_customer_id": stripe_customer_id,
            "is_admin": is_admin,
        }

    except JWTError as e:
        if settings.environment == "development":
            return DEV_USER
        raise UnauthorizedError(f"Token validation failed: {str(e)}")


async def get_admin_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Ensure the current user has admin permissions.
    """
    if not current_user.get("is_admin"):
        raise ForbiddenError("Admin access required")
    return current_user


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

