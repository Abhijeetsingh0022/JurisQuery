from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CaseFolderBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None


class CaseFolderCreate(CaseFolderBase):
    pass


class CaseFolderUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None


class CaseFolderResponse(CaseFolderBase):
    id: UUID
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FolderDocumentCreate(BaseModel):
    document_id: UUID


class FolderDocumentResponse(BaseModel):
    document_id: UUID
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)


from app.documents.schemas import DocumentResponse

class CaseFolderDetailResponse(CaseFolderResponse):
    documents: list[DocumentResponse] = []
