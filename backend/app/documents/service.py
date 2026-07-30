"""
Document service for JurisQuery.
Business logic for document upload, retrieval, and deletion.
"""
import logging
import uuid
from uuid import UUID

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.documents.models import Document, DocumentChunk, DocumentStatus
from app.documents.schemas import (
    DocumentChunkListResponse,
    DocumentListResponse,
    DocumentStatusResponse,
)
from app.exceptions import BadRequestError, NotFoundError
from app.rag.vectorstore import QdrantVectorStore
from app.storage.cloudinary_storage import CloudinaryStorage

logger = logging.getLogger(__name__)

_ALLOWED_EXTENSIONS = frozenset({"pdf", "docx", "txt"})
_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

_STATUS_PROGRESS: dict[str, int] = {
    DocumentStatus.PENDING:     0,
    DocumentStatus.UPLOADING:   20,
    DocumentStatus.PROCESSING:  50,
    DocumentStatus.VECTORIZING: 80,
    DocumentStatus.READY:       100,
    DocumentStatus.FAILED:      0,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _file_extension(filename: str) -> str:
    """Return the lowercase extension of *filename*, or '' if absent."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    user_id: str,
    plan_tier: str = "free",
) -> Document:
    """
    Validate, upload, and register a new document.

    Args:
        db: Database session
        file: Incoming upload from the HTTP request
        user_id: ID of the authenticated user

    Returns:
        Newly created Document ORM record

    Raises:
        BadRequestError: If the file type or size is not allowed
        HTTPException: If Free-tier document limit is reached
    """
    if plan_tier == "free":
        # Check document count limit
        stmt = select(func.count()).select_from(Document).where(Document.user_id == user_id)
        count = await db.scalar(stmt) or 0
        if count >= 10:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free-tier limit reached (10 documents). Upgrade to Pro for unlimited uploads."
            )

    extension = _file_extension(file.filename or "")
    if extension not in _ALLOWED_EXTENSIONS:
        raise BadRequestError(
            f"File type '{extension}' not allowed. "
            f"Allowed types: {', '.join(sorted(_ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    file_size = len(content)

    if file_size > _MAX_FILE_SIZE:
        raise BadRequestError(
            f"File too large. Maximum allowed size: {_MAX_FILE_SIZE // (1024 * 1024)} MB"
        )

    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_url = await CloudinaryStorage().upload(
        content=content,
        filename=unique_filename,
        folder="documents",
    )

    original_name = (file.filename or "unknown")[:255]
    document = Document(
        user_id=user_id,
        filename=unique_filename,
        original_filename=original_name,
        file_url=file_url,
        file_type=extension,
        file_size=file_size,
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    await db.flush()
    await db.commit()
    await db.refresh(document)
    return document


async def list_documents(
    db: AsyncSession,
    user_id: str,
    skip: int = 0,
    limit: int = 20,
) -> DocumentListResponse:
    """
    Return a paginated list of documents owned by *user_id*.

    Args:
        db: Database session
        user_id: Owning user
        skip: Records to skip (offset)
        limit: Maximum records to return
    """
    total = await db.scalar(
        select(func.count()).select_from(Document).where(Document.user_id == user_id)
    ) or 0

    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return DocumentListResponse(documents=list(result.scalars().all()), total=total)


async def get_document(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> Document:
    """
    Return a document by ID, asserting ownership.

    Raises:
        NotFoundError: If the document does not exist or is not owned by *user_id*
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise NotFoundError("Document")
    return document


async def get_document_status(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> DocumentStatusResponse:
    """Return the current processing status and progress of a document."""
    document = await get_document(db, document_id, user_id)
    return DocumentStatusResponse(
        id=document.id,
        status=document.status,
        progress=_STATUS_PROGRESS.get(document.status, 0),
        error_message=document.error_message,
    )


async def delete_document(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
) -> None:
    """
    Delete a document, its Qdrant vectors, and its Cloudinary asset.
    Database deletion cascades to associated chunks and chat sessions.

    Args:
        db: Database session
        document_id: Document to delete
        user_id: Must be the document owner
    """
    document = await get_document(db, document_id, user_id)

    try:
        await QdrantVectorStore().delete_by_document(str(document_id))
    except Exception as e:
        logger.warning("Failed to delete Qdrant vectors for document %s: %s", document_id, e)

    await CloudinaryStorage().delete(document.filename, folder="documents")

    await db.delete(document)
    await db.commit()


async def get_document_chunks(
    db: AsyncSession,
    document_id: UUID,
    user_id: str,
    skip: int = 0,
    limit: int = 100,
) -> DocumentChunkListResponse:
    """
    Return paginated text chunks for a document.

    Ownership is verified before any chunk data is returned.
    """
    await get_document(db, document_id, user_id)

    total = await db.scalar(
        select(func.count())
        .select_from(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
    ) or 0

    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .offset(skip)
        .limit(limit)
    )
    return DocumentChunkListResponse(chunks=list(result.scalars().all()), total=total)