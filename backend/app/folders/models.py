"""
SQLAlchemy models for Case Folders allowing multi-document grouping.
"""
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import BaseModel

if TYPE_CHECKING:
    from app.documents.models import Document
    from app.chat.models import ChatSession


class CaseFolder(BaseModel):
    """A user-created folder containing multiple legal documents conceptually grouped."""

    __tablename__ = "case_folders"

    user_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Relationships
    folder_documents: Mapped[list["CaseFolderDocument"]] = relationship(
        "CaseFolderDocument",
        back_populates="folder",
        cascade="all, delete-orphan",
    )
    
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession",
        back_populates="folder",
        cascade="all, delete-orphan",
    )


class CaseFolderDocument(BaseModel):
    """Associative entity linking a CaseFolder to a Document."""

    __tablename__ = "case_folder_documents"

    folder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("case_folders.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Relationships
    folder: Mapped["CaseFolder"] = relationship("CaseFolder", back_populates="folder_documents")
    document: Mapped["Document"] = relationship("Document")  # one-way relation mapping is fine here
