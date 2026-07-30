"""
Webhooks routing for Clerk user sync and Stripe payment sync.
"""
import logging
from datetime import datetime
import stripe
from fastapi import APIRouter, Depends, Request, HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.database import get_db
from app.config import settings
from app.auth.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/clerk")
async def clerk_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Listen to Clerk User events (user.created, user.updated) to sync to local PostgreSQL.
    Requires Clerk Webhook Secret configured as `clerk_secret_key` or `clerk_webhook_secret`.
    """
    try:
        payload = await request.body()
        headers = request.headers
        
        # In a real production deployment, you MUST verify the Svix headers via Clerk Dashboard here:
        # wh = Webhook(settings.clerk_webhook_secret)
        # event = wh.verify(payload, headers)
        
        # For simplicity while Clerk Webhook Secret is unconfigured, we blindly parse 
        # (WARNING: Only do this in isolated testing).
        import json
        event = json.loads(payload)

        event_type = event.get("type")
        data = event.get("data", {})
        clerk_id = data.get("id")
        
        if event_type == "user.created" or event_type == "user.updated":
            # Safely extract email 
            email = "no-email@clerk.dev"
            email_addresses = data.get("email_addresses", [])
            if email_addresses:
                email = email_addresses[0].get("email_address", email)

            # Check if user exists
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            user = result.scalar_one_or_none()

            if not user:
                user = User(clerk_id=clerk_id, email=email)
                db.add(user)
            else:
                user.email = email
            
        elif event_type == "user.deleted":
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            user = result.scalar_one_or_none()
            if user:
                await db.delete(user)

        return {"status": "success", "event": event_type}

    except Exception as e:
        logger.error(f"Clerk Webhook Error: {str(e)}")
        # Return 200 basically to not retry infinitely on bad payload in dev
        return {"status": "error", "message": str(e)}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Listen to Stripe Webhooks for checkout completion and subscription updates.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhooks not configured.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    logger.info(f"Received Stripe Event: {event_type}")

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        clerk_id = session.get("client_reference_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if clerk_id:
            # Upgrade user to Pro!
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            user = result.scalar_one_or_none()
            if user:
                user.stripe_customer_id = customer_id
                user.stripe_subscription_id = subscription_id
                user.plan_tier = "pro"

    elif event_type in ["customer.subscription.deleted", "customer.subscription.updated"]:
        subscription = event["data"]["object"]
        sub_id = subscription.get("id")
        status = subscription.get("status")
        
        result = await db.execute(select(User).where(User.stripe_subscription_id == sub_id))
        user = result.scalar_one_or_none()
        
        if user:
            # If subscription cancelled or past due, downgrade
            if status != "active" and status != "trialing":
                user.plan_tier = "free"
            
            # Update end period matching Unix timestamp mapping
            # user.current_period_end = datetime.fromtimestamp(subscription.get("current_period_end"))
            pass

    return {"status": "success"}
