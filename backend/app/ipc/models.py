"""
IPC Section and BNS Statute Bridge models for JurisQuery.
"""
from sqlalchemy import Boolean, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models import BaseModel


class IPCSection(BaseModel):
    """IPC Section representing a single entry from the Indian Penal Code."""

    __tablename__ = "ipc_sections"

    __table_args__ = (
        Index("ix_ipc_cognizable", "cognizable"),
        Index("ix_ipc_bailable", "bailable"),
    )

    # Section identifier e.g. "302", "420", "376"
    section_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Full statutory text
    description: Mapped[str] = mapped_column(Text)

    # Short offence title
    offense: Mapped[str | None] = mapped_column(Text)

    # Punishment details
    punishment: Mapped[str | None] = mapped_column(Text)

    # Legal classification
    cognizable: Mapped[bool | None] = mapped_column(Boolean)
    bailable: Mapped[bool | None] = mapped_column(Boolean)

    # Competent court for trial
    court: Mapped[str | None] = mapped_column(String(255))

    # Canonical reference URL
    source_url: Mapped[str | None] = mapped_column(String(512))

    # Qdrant point ID for the section's embedding
    embedding_id: Mapped[str | None] = mapped_column(String(255))


class IPCPrediction(BaseModel):
    """Stores predicted IPC sections for a user-submitted crime description."""

    __tablename__ = "ipc_predictions"

    # Requesting user
    user_id: Mapped[str] = mapped_column(String(255), index=True)

    # Submitted crime / incident description
    description: Mapped[str] = mapped_column(Text)

    # List of PredictedSection dicts (section_number, confidence, reasoning)
    predicted_sections: Mapped[list[dict]] = mapped_column(JSONB)


class BNSSection(BaseModel):
    """BNS 2023 section seeded from dataset/bns_sections.csv."""

    __tablename__ = "bns_sections"

    __table_args__ = (
        Index("ix_bns_chapter", "chapter_number"),
        Index("ix_bns_section_number", "section_number"),
    )

    # Chapter number (integer, e.g. 1, 6, 20)
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Chapter name (e.g. "OF OFFENCES AFFECTING THE HUMAN BODY")
    chapter_name: Mapped[str] = mapped_column(String(500), nullable=False)

    # Chapter subtype (e.g. "Of offences affecting life"), may be empty
    chapter_subtype: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Section identifier e.g. "101", "303", "4(1)"
    section_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)

    # Section short name (e.g. "Murder")
    section_name: Mapped[str] = mapped_column(String(500), nullable=False)

    # Full statutory text
    description: Mapped[str] = mapped_column(Text, nullable=False)


class IPCBNSLink(BaseModel):
    """LLM-generated cached mapping between an IPC section and its BNS 2023 equivalent."""

    __tablename__ = "ipc_bns_links"

    __table_args__ = (
        Index("ix_ipc_bns_ipc", "ipc_section_number"),
        Index("ix_ipc_bns_bns", "bns_section_number"),
    )

    # IPC section number e.g. "302"
    ipc_section_number: Mapped[str] = mapped_column(String(20), nullable=False)

    # Mapped BNS section number e.g. "101" (NULL if abolished/no equivalent)
    bns_section_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Type of change: "equivalent" | "modified" | "split" | "merged" | "abolished" | "new_in_bns"
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # 2-3 sentence LLM-generated summary of what changed (or confirmation of equivalence)
    change_summary: Mapped[str] = mapped_column(Text, nullable=False)

    # Whether this mapping has been manually verified
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)