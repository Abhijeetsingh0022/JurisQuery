"""
SQLAlchemy models for User authentication and billing tracking.
"""
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models import BaseModel

class User(BaseModel):
    """
    Locally cached user synchronized via Clerk Webhooks.
    Includes Stripe billing parameters.
    """
    __tablename__ = "users"

    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Stripe SaaS Fields
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    plan_tier: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Usage Tracking
    daily_query_count: Mapped[int] = mapped_column(default=0, nullable=False)
    last_query_reset: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
