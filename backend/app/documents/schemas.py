"""
Document Pydantic schemas for JurisQuery.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.documents.models import DocumentStatus

_ORM_CONFIG = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    """Full document representation returned by the API."""

    model_config = _ORM_CONFIG

    id: UUID
    filename: str
    original_filename: str
    file_url: str
    file_type: str
    file_size: int           # bytes
    status: str
    error_message: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    doc_metadata: dict | None = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    documents: list[DocumentResponse]
    total: int


class DocumentStatusResponse(BaseModel):
    """Lightweight status payload for polling document processing progress."""

    id: UUID
    status: str
    progress: int = Field(0, ge=0, le=100, description="Processing progress (0–100 %)")
    error_message: str | None = None


# ---------------------------------------------------------------------------
# Chunk schemas
# ---------------------------------------------------------------------------

class DocumentChunkResponse(BaseModel):
    """Single text chunk of a processed document."""

    model_config = _ORM_CONFIG

    id: UUID
    chunk_index: int
    content: str
    page_number: int | None = None
    paragraph_number: int | None = None
    section_title: str | None = None
    chunk_type: str = "parent"
    parent_chunk_id: UUID | None = None


class DocumentChunkListResponse(BaseModel):
    """Paginated list of document chunks."""

    chunks: list[DocumentChunkResponse]
    total: int