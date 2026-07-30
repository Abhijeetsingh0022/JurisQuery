"""
RAG router for JurisQuery.
Handles document querying with RAG pipeline.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
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
) -> QueryResponse:
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
    response_class=StreamingResponse,
    summary="Query a document with streaming",
    description="Query a document using RAG with Server-Sent Events streaming response.",
)
async def query_document_stream(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Query a document with SSE streaming response."""
    return StreamingResponse(
        service.query_document_stream(
            db=db,
            document_id=request.document_id,
            query=request.query,
            user_id=current_user["id"],
            top_k=request.top_k,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )