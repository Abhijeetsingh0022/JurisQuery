"""
Document router for JurisQuery.
Handles document upload, listing, and management.
"""
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import async_session_maker, get_db
from app.documents import service
from app.documents.schemas import (
    DocumentChunkListResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentStatusResponse,
)
from app.rag.service import process_document_for_rag

router = APIRouter()


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Upload a legal document (PDF, DOCX, TXT) and trigger background RAG processing.",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponse:
    """Upload a legal document and schedule it for RAG processing."""
    document = await service.upload_document(
        db=db,
        file=file,
        user_id=current_user["id"],
    )
    background_tasks.add_task(
        process_document_for_rag,
        document_id=document.id,
        session_factory=async_session_maker,
    )
    return document


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents",
    description="Return all documents uploaded by the current user.",
)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
) -> DocumentListResponse:
    """List all documents for the current user."""
    return await service.list_documents(
        db=db,
        user_id=current_user["id"],
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document",
    description="Return full details of a specific document.",
)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponse:
    """Return a document by ID, scoped to the current user."""
    return await service.get_document(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Get document status",
    description="Poll the processing status of a document.",
)
async def get_document_status(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentStatusResponse:
    """Return the current processing status of a document."""
    return await service.get_document_status(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunkListResponse,
    summary="Get document chunks",
    description="Return the processed text chunks for a document.",
)
async def get_document_chunks(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Number of chunks to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum chunks to return"),
) -> DocumentChunkListResponse:
    """Return text chunks for a document, scoped to the current user."""
    return await service.get_document_chunks(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
        skip=skip,
        limit=limit,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete document",
    description="Permanently delete a document and all its associated chunks and vectors.",
)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    """Delete a document and all associated data."""
    await service.delete_document(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )