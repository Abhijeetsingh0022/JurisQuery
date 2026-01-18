"""
Authentication dependencies for JurisQuery.
JWT validation and user extraction from Clerk tokens.
"""

from fastapi import Depends, Header
from jose import JWTError, jwt

from src.config import settings
from src.exceptions import UnauthorizedError


# Development mode user for testing
DEV_USER = {
    "id": "dev_user_123",
    "email": "dev@jurisquery.ai",
    "clerk_id": "dev_clerk_123",
}


async def get_current_user(authorization: str | None = Header(None)) -> dict:
    """
    Extract and validate user from JWT token.
    In development mode, returns a dev user if no token provided.
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        dict: User information from token or dev user
        
    Raises:
        UnauthorizedError: If token is invalid (in production)
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
        # Decode JWT token
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
            "clerk_id": payload.get("clerk_id", user_id),
        }
        
    except JWTError as e:
        # In development, fall back to dev user on token errors
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
