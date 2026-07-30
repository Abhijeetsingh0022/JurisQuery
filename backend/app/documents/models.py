"""
Document SQLAlchemy models.
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


class DocumentStatus(StrEnum):
    """Document processing status."""

    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    VECTORIZING = "vectorizing"
    READY = "ready"
    FAILED = "failed"


class Document(BaseModel):
    """Document model representing an uploaded legal document."""

    __tablename__ = "documents"

    # Owner
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # File info
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pdf, docx, txt
    file_size: Mapped[int] = mapped_column(nullable=False)  # bytes

    # Processing status
    status: Mapped[str] = mapped_column(
        String(50),
        default=DocumentStatus.PENDING,
        nullable=False,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Content
    page_count: Mapped[int | None] = mapped_column(nullable=True)
    chunk_count: Mapped[int | None] = mapped_column(nullable=True)

    # Metadata
    doc_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession",
        back_populates="document",
    )


class ChunkType(StrEnum):
    """Type of document chunk."""
    PARENT = "parent"
    CHILD = "child"


class DocumentChunk(BaseModel):
    """Document chunk model for storing text segments."""

    __tablename__ = "document_chunks"

    # Parent document
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Chunk info
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Location in document
    page_number: Mapped[int | None] = mapped_column(nullable=True)
    paragraph_number: Mapped[int | None] = mapped_column(nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Parent-Child Hierarchy
    chunk_type: Mapped[str] = mapped_column(
        String(20), default=ChunkType.PARENT, nullable=False
    )
    parent_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_chunks.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Vector store reference
    vector_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Metadata
    chunk_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
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
