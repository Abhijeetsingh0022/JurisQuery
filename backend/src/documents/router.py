"""
Document router for JurisQuery.
Handles document upload, listing, and management.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.database import get_db
from src.documents import service
from src.documents.schemas import (
    DocumentListResponse,
    DocumentResponse,
    DocumentStatusResponse,
)

router = APIRouter()


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new document",
    description="Upload a legal document (PDF, DOCX, TXT) for RAG analysis.",
)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload and process a legal document."""
    return await service.upload_document(
        db=db,
        file=file,
        user_id=current_user["id"],
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List user documents",
    description="Get all documents uploaded by the current user.",
)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
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
    summary="Get document details",
    description="Get detailed information about a specific document.",
)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific document by ID."""
    return await service.get_document(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Get document processing status",
    description="Poll the processing status of a document.",
)
async def get_document_status(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get processing status of a document."""
    return await service.get_document_status(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
    description="Delete a document and all its associated data.",
)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a document."""
    await service.delete_document(
        db=db,
        document_id=document_id,
        user_id=current_user["id"],
    )
