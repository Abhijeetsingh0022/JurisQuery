"""
Chat schemas for JurisQuery.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Schema for creating a message."""

    content: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    """Schema for message response."""

    id: UUID
    role: str
    content: str
    citations: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionCreate(BaseModel):
    """Schema for creating a chat session."""

    document_id: UUID
    title: str | None = None


class ChatSessionResponse(BaseModel):
    """Schema for chat session response."""

    id: UUID
    document_id: UUID
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ChatSessionDetailResponse(ChatSessionResponse):
    """Schema for chat session with messages."""

    messages: list[MessageResponse] = []


class ChatSessionListResponse(BaseModel):
    """Schema for chat session list."""

    sessions: list[ChatSessionResponse]
    total: int
