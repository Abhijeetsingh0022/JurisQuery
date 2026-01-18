"""
Document service for JurisQuery.
Business logic for document operations.
"""

import uuid
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.documents.models import Document, DocumentStatus
from src.documents.schemas import DocumentListResponse, DocumentStatusResponse
from src.exceptions import BadRequestError, NotFoundError
from src.storage.cloudinary_storage import CloudinaryStorage

# Allowed file types
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    user_id: str,
) -> Document:
    """
    Upload a document to Cloudinary and create database record.
    
    Args:
        db: Database session
        file: Uploaded file
        user_id: ID of the uploading user
        
    Returns:
        Document: Created document record
        
    Raises:
        BadRequestError: If file type is not allowed
    """
    # Validate file type
    extension = get_file_extension(file.filename or "unknown")
    if extension not in ALLOWED_EXTENSIONS:
        raise BadRequestError(
            f"File type '{extension}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise BadRequestError(f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    # Upload to Cloudinary
    storage = CloudinaryStorage()
    file_url = await storage.upload(
        content=content,
        filename=unique_filename,
        folder="documents",
    )
    
    # Create document record
    document = Document(
        user_id=user_id,
        filename=unique_filename,
        original_filename=file.filename or "unknown",
        file_url=file_url,
        file_type=extension,
        file_size=file_size,
        status=DocumentStatus.PENDING,
    )
    
    db.add(document)
    await db.flush()
    await db.refresh(document)
    
    # TODO: Trigger async processing task
    # await process_document_task.delay(str(document.id))
    
    return document


async def list_documents(
    db: AsyncSession,
    user_id: str,
    skip: int = 0,
    limit: int = 20,
) -> DocumentListResponse:
    """List documents for a user with pagination."""
    # Count total
    count_query = select(func.count()).select_from(Document).where(Document.user_id == user_id)
    total = await db.scalar(count_query) or 0
    
    # Get documents
    query = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    documents = list(result.scalars().all())
    
    return DocumentListResponse(documents=documents, total=total)


async def get_document(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> Document:
    """Get a document by ID, ensuring it belongs to the user."""
    query = select(Document).where(
        Document.id == document_id,
        Document.user_id == user_id,
    )
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    
    if not document:
        raise NotFoundError("Document")
    
    return document


async def get_document_status(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> DocumentStatusResponse:
    """Get processing status of a document."""
    document = await get_document(db, document_id, user_id)
    
    # Calculate progress based on status
    progress_map = {
        DocumentStatus.PENDING: 0,
        DocumentStatus.UPLOADING: 20,
        DocumentStatus.PROCESSING: 50,
        DocumentStatus.VECTORIZING: 80,
        DocumentStatus.READY: 100,
        DocumentStatus.FAILED: 0,
    }
    
    return DocumentStatusResponse(
        id=document.id,
        status=document.status,
        progress=progress_map.get(document.status, 0),
        error_message=document.error_message,
    )


async def delete_document(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> None:
    """Delete a document and its associated data."""
    document = await get_document(db, document_id, user_id)
    
    # Delete from Cloudinary
    storage = CloudinaryStorage()
    await storage.delete(document.filename)
    
    # Delete from database (cascades to chunks)
    await db.delete(document)
