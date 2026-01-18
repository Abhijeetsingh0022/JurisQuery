"""
Document schemas for JurisQuery.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.documents.models import DocumentStatus


class DocumentBase(BaseModel):
    """Base document schema."""

    filename: str
    file_type: str


class DocumentCreate(BaseModel):
    """Schema for document upload metadata."""

    original_filename: str


class DocumentResponse(BaseModel):
    """Schema for document response."""

    id: UUID
    filename: str
    original_filename: str
    file_url: str
    file_type: str
    file_size: int
    status: str
    error_message: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    doc_metadata: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Schema for document list response."""

    documents: list[DocumentResponse]
    total: int


class DocumentStatusResponse(BaseModel):
    """Schema for document status polling."""

    id: UUID
    status: str
    progress: int = Field(ge=0, le=100, description="Processing progress percentage")
    error_message: str | None = None


class DocumentChunkResponse(BaseModel):
    """Schema for document chunk response."""

    id: UUID
    chunk_index: int
    content: str
    page_number: int | None = None
    paragraph_number: int | None = None

    model_config = {"from_attributes": True}
