"""
Authentication router for JurisQuery.
Handles user authentication and Clerk webhook integration.
"""

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.auth.schemas import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.post("/webhook/clerk")
async def clerk_webhook():
    """
    Clerk webhook endpoint for user sync.
    Called when users are created/updated in Clerk.
    """
    # TODO: Implement Clerk webhook handling
    return {"status": "received"}
