"""
Admin API router for JurisQuery.
Provides system metrics, user subscription management, and dataset tracking/updating.
"""
import io
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_admin_user
from app.auth.models import User
from app.database import get_db
from app.documents.models import Document, DocumentChunk
from app.ipc.models import IPCSection
from app.ipc.service import load_ipc_dataset
from app.ipc.bns_service import load_bns_dataset, BNSSection
from app.rag.vectorstore import QdrantVectorStore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserUpdatePlanRequest(BaseModel):
    plan_tier: str  # "free", "pro", "enterprise"
    is_admin: bool | None = None


class UserAdminResponse(BaseModel):
    id: str
    email: str
    clerk_id: str
    plan_tier: str
    is_admin: bool
    daily_query_count: int
    stripe_customer_id: str | None = None
    created_at: str | None = None


class SystemStatsResponse(BaseModel):
    total_users: int
    users_by_plan: dict[str, int]
    total_documents: int
    total_queries: int
    ipc_section_count: int
    bns_section_count: int
    vector_store: dict


class DatasetStatusResponse(BaseModel):
    ipc_count: int
    bns_count: int
    vector_store: dict
    ipc_csv_exists: bool
    bns_csv_exists: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
) -> dict:
    """Get system-wide metrics for user accounts, subscriptions, and datasets."""
    # Total Users
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    # Users grouped by plan
    plan_counts_query = select(User.plan_tier, func.count(User.id)).group_by(User.plan_tier)
    plan_res = await db.execute(plan_counts_query)
    users_by_plan = {"free": 0, "pro": 0, "enterprise": 0}
    for plan, count in plan_res.all():
        users_by_plan[plan] = count

    # Total Documents
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0

    # Total Queries across all users
    total_queries = (await db.execute(select(func.sum(User.daily_query_count)))).scalar() or 0

    # Statute Counts
    ipc_count = (await db.execute(select(func.count(IPCSection.id)))).scalar() or 0
    bns_count = (await db.execute(select(func.count(BNSSection.id)))).scalar() or 0

    # Qdrant Vector Store Status
    vstore = QdrantVectorStore()
    vstore_info = await vstore.get_collection_info()

    return {
        "total_users": total_users,
        "users_by_plan": users_by_plan,
        "total_documents": total_docs,
        "total_queries": total_queries,
        "ipc_section_count": ipc_count,
        "bns_section_count": bns_count,
        "vector_store": vstore_info,
    }


@router.get("/users")
async def list_users(
    query: str | None = Query(None, description="Search by email or clerk_id"),
    plan_tier: str | None = Query(None, description="Filter by plan_tier"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
):
    """List users with filtering, pagination, and subscription info."""
    stmt = select(User)
    count_stmt = select(func.count(User.id))

    if query:
        search_pattern = f"%{query}%"
        filter_cond = or_(
            User.email.ilike(search_pattern),
            User.clerk_id.ilike(search_pattern),
        )
        stmt = stmt.where(filter_cond)
        count_stmt = count_stmt.where(filter_cond)

    if plan_tier:
        stmt = stmt.where(User.plan_tier == plan_tier)
        count_stmt = count_stmt.where(User.plan_tier == plan_tier)

    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    users = res.scalars().all()

    items = [
        {
            "id": str(u.id),
            "email": u.email,
            "clerk_id": u.clerk_id,
            "plan_tier": u.plan_tier,
            "is_admin": u.is_admin,
            "daily_query_count": u.daily_query_count,
            "stripe_customer_id": u.stripe_customer_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/users/{user_id}/plan")
async def update_user_subscription(
    user_id: str,
    body: UserUpdatePlanRequest,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
):
    """Manually update a user's subscription tier and admin status."""
    stmt = select(User).where(or_(User.id == user_id, User.clerk_id == user_id))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.plan_tier not in ["free", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan tier. Must be 'free', 'pro', or 'enterprise'.")

    user.plan_tier = body.plan_tier
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    await db.commit()
    logger.info("Admin %s updated user %s to plan %s", admin["email"], user.email, user.plan_tier)

    return {
        "status": "success",
        "user_id": str(user.id),
        "email": user.email,
        "plan_tier": user.plan_tier,
        "is_admin": user.is_admin,
    }


@router.get("/datasets", response_model=DatasetStatusResponse)
async def get_dataset_status(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
):
    """Get record counts and status of IPC, BNS, and Vector DB datasets."""
    ipc_count = (await db.execute(select(func.count(IPCSection.id)))).scalar() or 0
    bns_count = (await db.execute(select(func.count(BNSSection.id)))).scalar() or 0

    ipc_path = Path("dataset/FIR_DATASET.csv")
    bns_path = Path("dataset/bns_sections.csv")

    vstore = QdrantVectorStore()
    vstore_info = await vstore.get_collection_info()

    return {
        "ipc_count": ipc_count,
        "bns_count": bns_count,
        "vector_store": vstore_info,
        "ipc_csv_exists": ipc_path.exists(),
        "bns_csv_exists": bns_path.exists(),
    }


@router.post("/datasets/reseed")
async def reseed_datasets(
    target: Literal["all", "ipc", "bns"] = "all",
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
):
    """Trigger an idempotent re-sync of statute datasets from CSV using ON CONFLICT DO UPDATE."""
    results = {}
    if target in ["all", "ipc"]:
        ipc_count = await load_ipc_dataset(db=db, force_reload=True)
        results["ipc_count"] = ipc_count

    if target in ["all", "bns"]:
        bns_count = await load_bns_dataset(db=db, force_reload=True)
        results["bns_count"] = bns_count

    logger.info("Admin %s triggered dataset reseed (%s)", admin["email"], target)
    return {
        "status": "success",
        "message": f"Successfully re-synced dataset(s): {target}",
        "data": results,
    }


@router.post("/datasets/upload")
async def upload_dataset_csv(
    target: Literal["ipc", "bns"],
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_admin_user),
):
    """Upload a new CSV file for IPC or BNS and immediately update the database."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV format")

    content = await file.read()
    dest_dir = Path("dataset")
    dest_dir.mkdir(parents=True, exist_ok=True)

    filename = "FIR_DATASET.csv" if target == "ipc" else "bns_sections.csv"
    dest_path = dest_dir / filename

    with open(dest_path, "wb") as f:
        f.write(content)

    # Re-sync dataset into DB
    if target == "ipc":
        updated_count = await load_ipc_dataset(db=db, csv_path=dest_path, force_reload=True)
    else:
        updated_count = await load_bns_dataset(db=db, csv_path=dest_path, force_reload=True)

    logger.info("Admin %s uploaded new CSV for %s (%d sections)", admin["email"], target, updated_count)
    return {
        "status": "success",
        "target": target,
        "file_name": file.filename,
        "sections_loaded": updated_count,
    }
