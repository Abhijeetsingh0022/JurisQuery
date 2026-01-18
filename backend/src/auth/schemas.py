"""
Authentication schemas for JurisQuery.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    clerk_id: str


class UserCreate(UserBase):
    """Schema for creating a user."""

    pass


class UserResponse(BaseModel):
    """Schema for user response."""

    id: UUID
    email: EmailStr
    clerk_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    """JWT token payload schema."""

    sub: str  # Clerk user ID
    exp: int
    iat: int
