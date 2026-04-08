"""
Document SQLAlchemy models for JurisQuery.
"""
import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import BaseModel

if TYPE_CHECKING:
    from app.chat.models import ChatSession


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DocumentStatus(StrEnum):
    """Processing lifecycle states for an uploaded document."""

    PENDING     = "pending"
    UPLOADING   = "uploading"
    PROCESSING  = "processing"
    VECTORIZING = "vectorizing"
    READY       = "ready"
    FAILED      = "failed"


class ChunkType(StrEnum):
    """Hierarchy role of a document chunk."""

    PARENT = "parent"  # Large context chunk returned to the LLM
    CHILD  = "child"   # Small search chunk embedded in Qdrant


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Document(BaseModel):
    """Uploaded legal document and its processing metadata."""

    __tablename__ = "documents"

    # Owner
    user_id: Mapped[str] = mapped_column(String(255), index=True)

    # File identity
    filename: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(50))   # pdf | docx | txt
    file_size: Mapped[int] = mapped_column()              # bytes

    # Processing
    status: Mapped[str] = mapped_column(
        String(50),
        default=DocumentStatus.PENDING,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text)

    # Content statistics
    page_count: Mapped[int | None] = mapped_column()
    chunk_count: Mapped[int | None] = mapped_column()

    # Arbitrary extra metadata
    doc_metadata: Mapped[dict | None] = mapped_column(JSONB)

    # Relationships
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentChunk(BaseModel):
    """Text segment of a document, organised in a parent-child hierarchy."""

    __tablename__ = "document_chunks"

    # Owning document
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
    )

    # Content
    chunk_index: Mapped[int] = mapped_column()
    content: Mapped[str] = mapped_column(Text)

    # Position within document
    page_number: Mapped[int | None] = mapped_column()
    paragraph_number: Mapped[int | None] = mapped_column()
    section_title: Mapped[str | None] = mapped_column(String(500))

    # Parent-child hierarchy
    chunk_type: Mapped[str] = mapped_column(String(20), default=ChunkType.PARENT)
    parent_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_chunks.id", ondelete="CASCADE"),
        index=True,
    )

    # Qdrant point reference
    vector_id: Mapped[str | None] = mapped_column(String(255))

    # Arbitrary extra metadata
    chunk_metadata: Mapped[dict | None] = mapped_column(JSONB)

    # Relationships
    document: Mapped["Document"] = relationship(
        "Document",
        back_populates="chunks",
    )
    children: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys="DocumentChunk.parent_chunk_id",
    )
    parent: Mapped["DocumentChunk | None"] = relationship(
        "DocumentChunk",
        back_populates="children",
        remote_side="DocumentChunk.id",
        foreign_keys="DocumentChunk.parent_chunk_id",
    )