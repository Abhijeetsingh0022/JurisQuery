"""
Billing and Stripe integration endpoints.
"""
import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.auth.dependencies import get_current_user

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stripe API Key if provided
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

@router.post("/checkout")
async def create_checkout_session(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a Stripe Checkout Session for Jurisdiction Pro.
    Passes the user's clerk_id as client_reference_id for Webhook matching.
    """
    frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:3000"
    success_url = f"{frontend_url}/ipc-predictor?checkout=success"

    # DUMMY MODE: Simply upgrade the user in the DB and redirect
    if settings.stripe_dummy_mode:
        logger.info(f"Dummy checkout triggered for user {user['id']}")
        try:
            result = await db.execute(select(User).where(User.clerk_id == user["id"]))
            db_user = result.scalar_one_or_none()
            
            if not db_user:
                # In dummy mode, auto-create the user if missing from local DB
                logger.warning(f"User {user['id']} not found in DB during dummy checkout. Auto-creating...")
                db_user = User(
                    clerk_id=user["id"],
                    email=user.get("email", "dev@jurisquery.ai"),
                    plan_tier="pro"
                )
                db.add(db_user)
            else:
                db_user.plan_tier = "pro"
            
            await db.commit()
            return {"url": success_url}
        except HTTPException:
            # Re-raise HTTP exceptions (like 404 or 400)
            raise
        except Exception as e:
            logger.exception(f"Unexpected error in dummy checkout: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Dummy upgrade failed: {str(e)}")

    if not settings.stripe_secret_key or not settings.stripe_pro_price_id:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": settings.stripe_pro_price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=f"{frontend_url}/pricing?checkout=canceled",
            client_reference_id=user["id"],
            customer_email=user.get("email"),
        )
        return {"url": session.url}

    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/portal")
async def create_portal_session(user: dict = Depends(get_current_user)):
    """
    Generate a Stripe Customer Portal link allowing users to manage billing.
    Requires fetching the mapped stripe_customer_id from their local DB User profile.
    """
    # NOTE: To use this properly, we need their `stripe_customer_id` from the local DB.
    # We will refine `get_current_user` in Phase 4 to return the DB User object.
    
    # For now, if the user doesn't have a linked customer ID, reject it.
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="User does not have an active Stripe integration.")
        
    try:
        frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:3000"
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{frontend_url}/dashboard",
        )
        return {"url": session.url}

    except Exception as e:
        logger.error(f"Error creating portal session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")
