"""
IPC Section models for JurisQuery.
"""

import uuid
from enum import StrEnum

from sqlalchemy import Boolean, Float, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models import BaseModel


class IPCSection(BaseModel):
    """IPC Section model representing a section from the Indian Penal Code."""

    __tablename__ = "ipc_sections"

    # Section identifier (e.g., "302", "420", "376")
    section_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    
    # Full legal description
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Short offense title
    offense: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Punishment details
    punishment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Legal classification
    cognizable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    bailable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    
    # Court jurisdiction
    court: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Source URL
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    
    # Embedding for semantic search (stored in Qdrant, reference ID here)
    embedding_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_ipc_cognizable", "cognizable"),
        Index("ix_ipc_bailable", "bailable"),
    )
