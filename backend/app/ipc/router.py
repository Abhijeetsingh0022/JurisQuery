"""
IPC Section API router for JurisQuery.
"""
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.exceptions import NotFoundError
from app.ipc.schemas import (
    BNSSectionBrief,
    BNSSectionListResponse,
    BridgeResult,
    IPCPredictionListResponse,
    IPCPredictionRequest,
    IPCPredictionResponse,
    IPCSectionListResponse,
    IPCSectionResponse,
)
from app.ipc.service import (
    delete_user_prediction,
    get_all_sections,
    get_section_by_number,
    get_user_predictions,
    load_ipc_dataset,
    predict_ipc_sections,
)
from app.ipc.bns_service import (
    get_all_bns_sections,
    get_bns_section,
    get_or_create_bridge,
    load_bns_dataset,
    search_bns_by_keywords,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["IPC Sections"])


# ---------------------------------------------------------------------------
# Prediction endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/predict",
    response_model=IPCPredictionResponse,
    summary="Predict IPC sections",
    description="Analyse a crime or incident description and return applicable IPC sections.",
)
async def predict_sections(
    request: IPCPredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> IPCPredictionResponse:
    """Predict applicable IPC sections from a crime/incident description."""
    return await predict_ipc_sections(db, request, user_id=current_user["id"])


@router.get(
    "/history",
    response_model=IPCPredictionListResponse,
    summary="Get prediction history",
    description="Return the authenticated user's IPC prediction history.",
)
async def get_prediction_history(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of records to return"),
) -> IPCPredictionListResponse:
    """Return the current user's IPC section prediction history."""
    return await get_user_predictions(db, user_id=current_user["id"], limit=limit)


@router.delete(
    "/history/{prediction_id}",
    status_code=204,
    summary="Delete a prediction",
    description="Remove a specific prediction from the current user's history.",
)
async def delete_prediction(
    prediction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    """Delete a prediction by ID, scoped to the current user."""
    deleted = await delete_user_prediction(db, prediction_id, user_id=current_user["id"])
    if not deleted:
        raise NotFoundError(f"Prediction {prediction_id}")


# ---------------------------------------------------------------------------
# Section lookup endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/sections",
    response_model=IPCSectionListResponse,
    summary="List IPC sections",
    description="Return a paginated list of all IPC sections.",
)
async def list_sections(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=10, le=100, description="Number of items per page"),
) -> IPCSectionListResponse:
    """Return a paginated list of all IPC sections."""
    return await get_all_sections(db, page=page, page_size=page_size)


@router.get(
    "/sections/{section_number}",
    response_model=IPCSectionResponse,
    summary="Get IPC section",
    description="Return the full details of a single IPC section by its number.",
)
async def get_section(
    section_number: str,
    db: AsyncSession = Depends(get_db),
) -> IPCSectionResponse:
    """Return a single IPC section by its number (e.g. '302', '420')."""
    section = await get_section_by_number(db, section_number)
    if not section:
        raise NotFoundError(f"IPC Section {section_number}")
    return section


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/load-dataset",
    summary="Load IPC dataset",
    description="Admin-only: import the IPC CSV dataset into the database. Call once.",
)
async def load_dataset(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Load the IPC dataset from CSV into the database (admin, idempotent)."""
    count = await load_ipc_dataset(db)
    return {"message": f"Loaded {count} IPC sections", "count": count}


# ---------------------------------------------------------------------------
# Statute Bridge endpoints (IPC → BNS)
# ---------------------------------------------------------------------------

@router.get(
    "/bridge/{ipc_section_number}",
    response_model=BridgeResult,
    summary="IPC to BNS bridge",
    description=(
        "Return the BNS 2023 equivalent for a given IPC section. "
        "The first call generates the mapping via LLM; subsequent calls are cached."
    ),
)
async def get_statute_bridge(
    ipc_section_number: str,
    db: AsyncSession = Depends(get_db),
) -> BridgeResult:
    """Return the BNS equivalent for an IPC section (lazy-generated + cached)."""
    return await get_or_create_bridge(db, ipc_section_number)


# ---------------------------------------------------------------------------
# BNS Section endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/bns/sections",
    response_model=BNSSectionListResponse,
    summary="List BNS sections",
    description="Return a paginated list of all Bharatiya Nyaya Sanhita 2023 sections.",
)
async def list_bns_sections(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=10, le=100, description="Number of items per page"),
) -> BNSSectionListResponse:
    """Return a paginated list of all BNS 2023 sections."""
    return await get_all_bns_sections(db, page=page, page_size=page_size)


@router.get(
    "/bns/search",
    response_model=list[BNSSectionBrief],
    summary="Search BNS sections",
    description="Keyword search across BNS section names and descriptions.",
)
async def search_bns(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    db: AsyncSession = Depends(get_db),
) -> list[BNSSectionBrief]:
    """Keyword search across BNS 2023 sections."""
    sections = await search_bns_by_keywords(db, q, limit=limit)
    return [
        BNSSectionBrief(
            section_number=s.section_number,
            section_name=s.section_name,
            chapter_name=s.chapter_name,
            chapter_subtype=s.chapter_subtype,
            description=s.description,
        )
        for s in sections
    ]


@router.get(
    "/bns/sections/{section_number}",
    response_model=BNSSectionBrief,
    summary="Get BNS section",
    description="Return the full details of a single BNS 2023 section by its number.",
)
async def get_bns_section_detail(
    section_number: str,
    db: AsyncSession = Depends(get_db),
) -> BNSSectionBrief:
    """Return a single BNS section by its number (e.g. '101', '303')."""
    section = await get_bns_section(db, section_number)
    if not section:
        raise NotFoundError(f"BNS Section {section_number}")
    return BNSSectionBrief(
        section_number=section.section_number,
        section_name=section.section_name,
        chapter_name=section.chapter_name,
        chapter_subtype=section.chapter_subtype,
        description=section.description,
    )


@router.post(
    "/bns/load-dataset",
    summary="Load BNS dataset",
    description="Admin-only: import the BNS 2023 CSV dataset into the database. Call once.",
)
async def load_bns(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Load the BNS 2023 dataset from CSV into the database (admin, idempotent)."""
    count = await load_bns_dataset(db)
    return {"message": f"Loaded {count} BNS sections", "count": count}