import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.documents.models import Document
from app.folders.models import CaseFolder, CaseFolderDocument
from app.folders.schemas import CaseFolderCreate, CaseFolderUpdate

logger = logging.getLogger(__name__)


async def create_folder(db: AsyncSession, user_id: str, data: CaseFolderCreate, plan_tier: str = "free") -> CaseFolder:
    if plan_tier == "free":
        # Check folder count limit
        stmt = select(CaseFolder).where(CaseFolder.user_id == user_id)
        result = await db.execute(stmt)
        folders = result.scalars().all()
        if len(folders) >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free-tier limit reached (3 folders). Upgrade to Pro for unlimited folders."
            )

    folder = CaseFolder(
        user_id=user_id,
        name=data.name,
        description=data.description,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def get_folder(db: AsyncSession, user_id: str, folder_id: UUID) -> CaseFolder:
    stmt = (
        select(CaseFolder)
        .where(CaseFolder.id == folder_id, CaseFolder.user_id == user_id)
        .options(
            selectinload(CaseFolder.folder_documents).selectinload(CaseFolderDocument.document)
        )
    )
    result = await db.execute(stmt)
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )
    
    # We will attach `.documents` so we can serialize easily to DetailResponse
    folder.documents = [fd.document for fd in folder.folder_documents]
    return folder


async def list_folders(db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100) -> list[CaseFolder]:
    stmt = select(CaseFolder).where(CaseFolder.user_id == user_id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_folder(
    db: AsyncSession, user_id: str, folder_id: UUID, data: CaseFolderUpdate
) -> CaseFolder:
    folder = await get_folder(db, user_id, folder_id)
    if data.name is not None:
        folder.name = data.name
    if data.description is not None:
        folder.description = data.description
        
    await db.commit()
    return await get_folder(db, user_id, folder_id)


async def delete_folder(db: AsyncSession, user_id: str, folder_id: UUID) -> None:
    folder = await get_folder(db, user_id, folder_id)
    await db.delete(folder)
    await db.commit()


async def add_document_to_folder(
    db: AsyncSession, user_id: str, folder_id: UUID, document_id: UUID
) -> None:
    # Verify folder ownership
    folder = await get_folder(db, user_id, folder_id)
    
    # Verify document ownership
    stmt_doc = select(Document).where(Document.id == document_id, Document.user_id == user_id)
    doc_result = await db.execute(stmt_doc)
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
        
    # Check if existing link
    stmt_link = select(CaseFolderDocument).where(
        CaseFolderDocument.folder_id == folder_id,
        CaseFolderDocument.document_id == document_id
    )
    result_link = await db.execute(stmt_link)
    if result_link.scalar_one_or_none():
        return  # already linked
        
    new_link = CaseFolderDocument(folder_id=folder_id, document_id=document_id)
    db.add(new_link)
    await db.commit()


async def remove_document_from_folder(
    db: AsyncSession, user_id: str, folder_id: UUID, document_id: UUID
) -> None:
    folder = await get_folder(db, user_id, folder_id)
    stmt_link = select(CaseFolderDocument).where(
        CaseFolderDocument.folder_id == folder_id,
        CaseFolderDocument.document_id == document_id
    )
    result_link = await db.execute(stmt_link)
    link = result_link.scalar_one_or_none()
    
    if link:
        await db.delete(link)
        await db.commit()
