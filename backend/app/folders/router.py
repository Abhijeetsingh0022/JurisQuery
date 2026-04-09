from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.folders import service
from app.folders.schemas import (
    CaseFolderCreate,
    CaseFolderDetailResponse,
    CaseFolderResponse,
    CaseFolderUpdate,
    FolderDocumentCreate,
)

router = APIRouter()


@router.post(
    "",
    response_model=CaseFolderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Case Folder",
)
async def create_folder(
    request: CaseFolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.create_folder(db, current_user["id"], request, plan_tier=current_user.get("plan_tier", "free"))


@router.get(
    "",
    response_model=list[CaseFolderResponse],
    summary="List Case Folders",
)
async def list_folders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.list_folders(db, current_user["id"], skip, limit)


@router.get(
    "/{folder_id}",
    response_model=CaseFolderDetailResponse,
    summary="Get Case Folder Details",
)
async def get_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.get_folder(db, current_user["id"], folder_id)


@router.put(
    "/{folder_id}",
    response_model=CaseFolderDetailResponse,
    summary="Update Case Folder",
)
async def update_folder(
    folder_id: UUID,
    request: CaseFolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.update_folder(db, current_user["id"], folder_id, request)


@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Case Folder",
)
async def delete_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await service.delete_folder(db, current_user["id"], folder_id)


@router.post(
    "/{folder_id}/documents",
    status_code=status.HTTP_201_CREATED,
    summary="Add Document to Folder",
)
async def add_document(
    folder_id: UUID,
    request: FolderDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await service.add_document_to_folder(db, current_user["id"], folder_id, request.document_id)
    return {"status": "success"}


@router.delete(
    "/{folder_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Document from Folder",
)
async def remove_document(
    folder_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await service.remove_document_from_folder(db, current_user["id"], folder_id, document_id)
