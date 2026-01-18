"""
Chat SQLAlchemy models.
"""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import BaseModel

if TYPE_CHECKING:
    from src.documents.models import Document


class MessageRole(StrEnum):
    """Message role enum."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatSession(BaseModel):
    """Chat session model for tracking conversations."""

    __tablename__ = "chat_sessions"

    # Owner
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Document
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Session info
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chat_sessions")
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(BaseModel):
    """Message model for chat history."""

    __tablename__ = "messages"

    # Parent session
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Message content
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Citations (for assistant messages)
    citations: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    msg_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")
