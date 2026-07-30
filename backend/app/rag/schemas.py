"""
RAG schemas for JurisQuery.
"""
from uuid import UUID

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Schema for RAG query request."""

    document_id: UUID
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class Citation(BaseModel):
    """Schema for a citation in the RAG response."""

    chunk_id: UUID | str
    content: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    source_id: int | None = None
    page_number: int | None = None
    paragraph_number: int | None = None


class QueryResponse(BaseModel):
    """Schema for RAG query response."""

    document_id: UUID
    query: str
    answer: str
    citations: list[Citation]
    model: str = "gemini-2.5-flash"


class EmbeddingRequest(BaseModel):
    """Schema for embedding generation request."""

    texts: list[str] = Field(..., min_length=1)


class EmbeddingResponse(BaseModel):
    """Schema for embedding generation response."""

    embeddings: list[list[float]]
    model: str
    dimension: int