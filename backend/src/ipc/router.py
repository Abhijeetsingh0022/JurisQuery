"""
IPC Section API Router.
"""

import logging

from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.ipc.schemas import (
    IPCPredictionRequest,
    IPCPredictionResponse,
    IPCSectionListResponse,
    IPCSectionResponse,
)
from src.ipc.service import (
    get_all_sections,
    get_section_by_number,
    load_ipc_dataset,
    predict_ipc_sections,
)
from src.exceptions import NotFoundError


logger = logging.getLogger(__name__)

router = APIRouter(tags=["IPC Sections"])


@router.post("/predict", response_model=IPCPredictionResponse)
async def predict_sections(
    request: IPCPredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Predict applicable IPC sections from a crime/incident description.
    
    Uses LLM-based analysis with the IPC dataset to identify relevant sections.
    """
    return await predict_ipc_sections(db, request)


@router.get("/sections", response_model=IPCSectionListResponse)
async def list_sections(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a paginated list of all IPC sections.
    """
    return await get_all_sections(db, page=page, page_size=page_size)


@router.get("/sections/{section_number}", response_model=IPCSectionResponse)
async def get_section(
    section_number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific IPC section by its number.
    """
    section = await get_section_by_number(db, section_number)
    if not section:
        raise NotFoundError(f"IPC Section {section_number}")
    return section


@router.post("/load-dataset")
async def load_dataset(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Load the IPC dataset from CSV into the database.
    This is an admin endpoint that should only be called once.
    """
    count = await load_ipc_dataset(db)
    return {"message": f"Loaded {count} IPC sections", "count": count}
