"""
IPC Section Pydantic schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class IPCSectionBase(BaseModel):
    """Base IPC Section schema."""
    section_number: str = Field(..., description="IPC section number (e.g., '302', '420')")
    offense: str | None = Field(None, description="Short offense title")
    punishment: str | None = Field(None, description="Punishment details")
    cognizable: bool | None = Field(None, description="Whether offense is cognizable")
    bailable: bool | None = Field(None, description="Whether offense is bailable")
    court: str | None = Field(None, description="Court jurisdiction")


class IPCSectionResponse(IPCSectionBase):
    """IPC Section response schema."""
    id: UUID
    description: str
    source_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class IPCSectionBrief(BaseModel):
    """Brief IPC section for prediction results."""
    section_number: str
    offense: str | None
    punishment: str | None
    cognizable: bool | None
    bailable: bool | None

    class Config:
        from_attributes = True


class PredictedSection(BaseModel):
    """A predicted IPC section with confidence and reasoning."""
    section: IPCSectionBrief
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    reasoning: str = Field(..., description="Why this section applies")
    relevant_excerpt: str | None = Field(None, description="Relevant part of description")


class IPCPredictionRequest(BaseModel):
    """Request to predict IPC sections from a crime description."""
    description: str = Field(
        ..., 
        min_length=20, 
        max_length=5000,
        description="Description of the crime or incident"
    )
    max_sections: int = Field(
        default=5, 
        ge=1, 
        le=10,
        description="Maximum number of sections to predict"
    )


class IPCPredictionResponse(BaseModel):
    """Response with predicted IPC sections."""
    predicted_sections: list[PredictedSection]
    query: str
    total_sections_searched: int
    processing_time_ms: float
    error: str | None = None


class IPCSectionListResponse(BaseModel):
    """Paginated list of IPC sections."""
    sections: list[IPCSectionBrief]
    total: int
    page: int
    page_size: int
    has_more: bool
