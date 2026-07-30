"""
IPC Section Pydantic schemas for JurisQuery.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Shared config
# ---------------------------------------------------------------------------

_ORM_CONFIG = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# IPC Section schemas
# ---------------------------------------------------------------------------

class IPCSectionBase(BaseModel):
    """Shared fields for IPC section schemas."""

    section_number: str = Field(..., description="IPC section number e.g. '302', '420'")
    offense: str | None = Field(None, description="Short offence title")
    punishment: str | None = Field(None, description="Punishment details")
    cognizable: bool | None = Field(None, description="Whether the offence is cognizable")
    bailable: bool | None = Field(None, description="Whether the offence is bailable")
    court: str | None = Field(None, description="Competent court for trial")


class IPCSectionBrief(IPCSectionBase):
    """Compact IPC section used in prediction results and list responses."""

    model_config = _ORM_CONFIG


class IPCSectionResponse(IPCSectionBase):
    """Full IPC section returned by the detail endpoint."""

    model_config = _ORM_CONFIG

    id: UUID
    description: str
    source_url: str | None = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Prediction schemas
# ---------------------------------------------------------------------------

class PredictedSection(BaseModel):
    """A single predicted IPC section with confidence score and reasoning."""

    section: IPCSectionBrief
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0–1)")
    reasoning: str = Field(..., description="Why this section applies to the description")
    relevant_excerpt: str | None = Field(None, description="Excerpt from the input that triggered this match")


class IPCPredictionRequest(BaseModel):
    """Request body for the IPC section prediction endpoint."""

    description: str = Field(
        ...,
        min_length=20,
        max_length=5000,
        description="Crime or incident description",
    )
    max_sections: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Maximum number of sections to return",
    )


class IPCPredictionResponse(BaseModel):
    """Response containing predicted IPC sections for a given description."""

    predicted_sections: list[PredictedSection]
    query: str
    total_sections_searched: int
    processing_time_ms: float
    error: str | None = None


class IPCPredictionSchema(BaseModel):
    """Stored prediction record returned in history responses."""

    model_config = _ORM_CONFIG

    id: UUID
    description: str
    predicted_sections: list[PredictedSection]
    created_at: datetime


# ---------------------------------------------------------------------------
# List / paginated responses
# ---------------------------------------------------------------------------

class IPCSectionListResponse(BaseModel):
    """Paginated list of IPC sections."""

    sections: list[IPCSectionBrief]
    total: int
    page: int
    page_size: int
    has_more: bool


class IPCPredictionListResponse(BaseModel):
    """Paginated list of a user's past predictions."""

    predictions: list[IPCPredictionSchema]


# ---------------------------------------------------------------------------
# BNS Section schemas
# ---------------------------------------------------------------------------

class BNSSectionBrief(BaseModel):
    """Compact BNS section for list / bridge responses."""

    model_config = _ORM_CONFIG

    section_number: str = Field(..., description="BNS section number e.g. '101', '303'")
    section_name: str = Field(..., description="Short section title e.g. 'Murder'")
    chapter_name: str = Field(..., description="Chapter name")
    chapter_subtype: str | None = Field(None, description="Chapter subtype if any")
    description: str = Field(..., description="Full statutory text")


class BNSSectionListResponse(BaseModel):
    """Paginated list of BNS sections."""

    sections: list[BNSSectionBrief]
    total: int
    page: int
    page_size: int
    has_more: bool


# ---------------------------------------------------------------------------
# Statute Bridge schemas
# ---------------------------------------------------------------------------

class BridgeResult(BaseModel):
    """Result of looking up the BNS equivalent of an IPC section."""

    ipc_section: IPCSectionBrief | None = Field(None, description="Source IPC section (if found)")
    bns_section: BNSSectionBrief | None = Field(None, description="BNS equivalent (null if abolished)")
    change_type: str = Field(
        ...,
        description="One of: equivalent | modified | split | merged | abolished | new_in_bns | unknown",
    )
    change_summary: str = Field(..., description="LLM-generated 2-3 sentence explanation of the change")
    is_verified: bool = Field(False, description="Whether this mapping has been manually verified")