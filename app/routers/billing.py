from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional
import stripe
import logging
from datetime import timedelta

from app.database import AsyncSessionLocal
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    SubscriptionResponse,
    BillingHistoryResponse,
    BillingPortalSessionResponse,
)
from app.services.billing_service import (
    create_checkout_session,
    get_user_subscription,
    update_subscription_from_stripe,
    list_customer_invoices,
    create_billing_portal_session,
    PLANS,
    TRIAL_DAYS,
)
from app.services.notification_service import create_notification
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Initialize Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


@router.get("/plans")
async def get_plans():
    """Get available pricing plans"""
    return {
        "plans": [
            {
                "id": "starter",
                "name": PLANS["starter"]["name"],
                "price": PLANS["starter"]["price"],
                "wraps": PLANS["starter"]["wraps"],
                "price_id": PLANS["starter"]["price_id"],
            },
            {
                "id": "professional",
                "name": PLANS["professional"]["name"],
                "price": PLANS["professional"]["price"],
                "wraps": PLANS["professional"]["wraps"],
                "price_id": PLANS["professional"]["price_id"],
            },
            {
                "id": "business",
                "name": PLANS["business"]["name"],
                "price": PLANS["business"]["price"],
                "wraps": PLANS["business"]["wraps"],
                "price_id": PLANS["business"]["price_id"],
            },
        ],
        "trial_days": 3,
    }


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
):
    """Create Stripe Checkout session"""
    try:
        async with AsyncSessionLocal() as db:
            session_data = await create_checkout_session(
                current_user, request.price_id, db
            )
            
            if not session_data:
                raise HTTPException(
                    status_code=500, detail="Failed to create checkout session"
                )
            
            return CheckoutSessionResponse(**session_data)
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to create checkout session: {str(e)}"
        )


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_subscription(current_user: User = Depends(get_current_user)):
    """Get user's current subscription"""
    try:
        async with AsyncSessionLocal() as db:
            subscription = await get_user_subscription(current_user, db)
            
            if not subscription:
                return None
            
            return SubscriptionResponse(
                id=subscription.id,
                plan_type=subscription.plan_type,
                status=subscription.status,
                amount=subscription.amount,
                stripe_customer_id=subscription.stripe_customer_id,
                stripe_subscription_id=subscription.stripe_subscription_id,
                current_period_end=subscription.stripe_current_period_end,
                trial_end=subscription.stripe_trial_end,
                created_at=subscription.created_at,
                updated_at=subscription.updated_at,
            )
    except Exception as e:
        logger.error(f"Error getting subscription: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to get subscription: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not settings.stripe_webhook_secret:
            logger.warning("Stripe webhook secret not configured")
            return JSONResponse(
                status_code=400, content={"error": "Webhook secret not configured"}
            )
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            return JSONResponse(status_code=400, content={"error": "Invalid payload"})
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            return JSONResponse(status_code=400, content={"error": "Invalid signature"})
        
        # Handle the event
        event_type = event["type"]
        event_data = event["data"]["object"]
        
        logger.info(f"Received Stripe webhook event: {event_type}")
        
        async with AsyncSessionLocal() as db:
            if event_type == "checkout.session.completed":
                # Checkout completed, create/update subscription
                session = event_data
                subscription_id = session.get("subscription")
                
                if subscription_id:
                    await update_subscription_from_stripe(subscription_id, db)
            
            elif event_type == "customer.subscription.created":
                # Subscription created
                subscription_id = event_data["id"]
                await update_subscription_from_stripe(subscription_id, db)
            
            elif event_type == "customer.subscription.updated":
                # Subscription updated (plan change, etc.)
                subscription_id = event_data["id"]
                await update_subscription_from_stripe(subscription_id, db)
            
            elif event_type == "customer.subscription.deleted":
                # Subscription canceled
                subscription_id = event_data["id"]
                billing = await update_subscription_from_stripe(subscription_id, db)
                if billing:
                    billing.status = "cancelled"
                    await db.commit()
            
            elif event_type == "invoice.payment_succeeded":
                # Payment succeeded
                subscription_id = event_data.get("subscription")
                if subscription_id:
                    billing = await update_subscription_from_stripe(subscription_id, db)
                    if billing:
                        # Create charge succeeded notification
                        await create_notification(
                            db=db,
                            user_id=billing.user_id,
                            notification_type="charge_succeeded",
                            title="Payment Successful",
                            message=f"Your payment of ${event_data.get('amount_paid', 0) / 100:.2f} has been processed successfully.",
                            metadata={"invoice_id": event_data.get("id"), "amount": event_data.get("amount_paid", 0) / 100}
                        )
            
            elif event_type == "invoice.payment_failed":
                # Payment failed
                subscription_id = event_data.get("subscription")
                if subscription_id:
                    billing = await update_subscription_from_stripe(subscription_id, db)
                    if billing:
                        billing.status = "past_due"
                        await db.commit()
                        # Create charge failed notification
                        await create_notification(
                            db=db,
                            user_id=billing.user_id,
                            notification_type="charge_failed",
                            title="Payment Failed",
                            message=f"Your payment of ${event_data.get('amount_due', 0) / 100:.2f} could not be processed. Please update your payment method.",
                            metadata={"invoice_id": event_data.get("id"), "amount": event_data.get("amount_due", 0) / 100}
                        )
        
        return JSONResponse(status_code=200, content={"received": True})
    except Exception as e:
        logger.error(f"Error handling webhook: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Webhook error: {str(e)}"}
        )


@router.get("/history", response_model=BillingHistoryResponse)
async def get_billing_history(current_user: User = Depends(get_current_user)):
    """Return invoice history for the current user"""
    try:
        async with AsyncSessionLocal() as db:
            subscription = await get_user_subscription(current_user, db)

            invoices = []

            if subscription and subscription.stripe_customer_id and settings.stripe_secret_key:
                invoices = await list_customer_invoices(subscription.stripe_customer_id)

            if subscription and subscription.status == "trial":
                trial_end = subscription.stripe_trial_end
                if not trial_end and subscription.created_at:
                    trial_end = subscription.created_at + timedelta(days=TRIAL_DAYS)
                trial_entry = {
                    "id": f"trial-{subscription.id}",
                    "number": "Free Trial",
                    "status": "trial",
                    "amount_due": 0.0,
                    "amount_paid": 0.0,
                    "currency": "usd",
                    "hosted_invoice_url": None,
                    "invoice_pdf": None,
                    "created_at": subscription.created_at,
                    "paid_at": subscription.created_at,
                    "period_start": subscription.created_at,
                    "period_end": trial_end,
                    "plan_name": "Trial Access",
                }
                invoices = [trial_entry] + invoices

            return BillingHistoryResponse(invoices=invoices)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting billing history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch billing history: {str(e)}")


@router.post("/customer-portal", response_model=BillingPortalSessionResponse)
async def create_customer_portal(current_user: User = Depends(get_current_user)):
    """Create a Stripe billing portal session for the current user"""
    try:
        async with AsyncSessionLocal() as db:
            subscription = await get_user_subscription(current_user, db)

        if not subscription or subscription.status == "trial" or not subscription.stripe_customer_id:
            raise HTTPException(status_code=400, detail="Subscription management is available after upgrading from the trial")

        portal_url = await create_billing_portal_session(subscription.stripe_customer_id)
        if not portal_url:
            raise HTTPException(status_code=500, detail="Failed to create billing portal session")

        return BillingPortalSessionResponse(url=portal_url)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating billing portal session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create billing portal session: {str(e)}")


