"""
RAG router for JurisQuery.
Handles document querying with RAG pipeline.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.rag import service
from app.rag.schemas import QueryRequest, QueryResponse

router = APIRouter()


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Query a document",
    description="Query a document using RAG to get AI-generated answers with citations.",
)
async def query_document(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Query a document with natural language."""
    return await service.query_document(
        db=db,
        document_id=request.document_id,
        query=request.query,
        user_id=current_user["id"],
        top_k=request.top_k,
    )


@router.post(
    "/query/stream",
    summary="Query a document with streaming",
    description="Query a document using RAG with streaming response.",
)
async def query_document_stream(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Query a document with streaming response."""
    # TODO: Implement SSE streaming
    return await service.query_document(
        db=db,
        document_id=request.document_id,
        query=request.query,
        user_id=current_user["id"],
        top_k=request.top_k,
    )
