import stripe
from typing import Optional, Dict, List
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.billing import Billing
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

# Plan configuration
PLANS = {
    "starter": {
        "name": "Starter",
        "price": 8.79,
        "wraps": 1,
        "price_id": settings.stripe_price_starter,
    },
    "professional": {
        "name": "Professional",
        "price": 19.89,
        "wraps": 3,
        "price_id": settings.stripe_price_professional,
    },
    "business": {
        "name": "Business",
        "price": 49.99,
        "wraps": 10,
        "price_id": settings.stripe_price_business,
    },
}

TRIAL_DAYS = 3


async def create_trial_subscription(user: User, db: AsyncSession) -> Billing:
    """Create an initial trial subscription for a new user."""
    try:
        now = datetime.now(timezone.utc)
        trial = Billing(
            user_id=user.id,
            plan_type="trial",
            status="trial",
            amount=0.0,
            stripe_trial_end=now + timedelta(days=TRIAL_DAYS),
            created_at=now,
        )
        db.add(trial)
        await db.commit()
        await db.refresh(trial)
        return trial
    except Exception as e:
        logger.error(f"Error creating trial subscription: {e}")
        await db.rollback()
        raise


async def get_or_create_stripe_customer(user: User, db: AsyncSession) -> Optional[str]:
    """Get or create Stripe customer for user"""
    try:
        # Check if user already has a billing record with customer ID
        result = await db.execute(
            select(Billing).where(Billing.user_id == user.id).where(Billing.stripe_customer_id.isnot(None))
        )
        existing_billing = result.scalar_one_or_none()
        
        if existing_billing and existing_billing.stripe_customer_id:
            return existing_billing.stripe_customer_id
        
        # Create new Stripe customer
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)}
        )

        try:
            result = await db.execute(
                select(Billing)
                .where(Billing.user_id == user.id)
                .order_by(Billing.created_at.desc())
            )
            trial_record = result.scalar_one_or_none()
            if trial_record and not trial_record.stripe_customer_id:
                trial_record.stripe_customer_id = customer.id
                await db.commit()
        except Exception as update_error:
            logger.warning(f"Unable to persist Stripe customer on trial record: {update_error}")
 
        return customer.id
    except Exception as e:
        logger.error(f"Error creating Stripe customer: {e}")
        return None


async def create_checkout_session(
    user: User,
    price_id: str,
    db: AsyncSession
) -> Optional[Dict]:
    """Create Stripe Checkout session"""
    try:
        if not settings.stripe_secret_key:
            raise ValueError("Stripe secret key not configured")
        
        # Get or create Stripe customer
        customer_id = await get_or_create_stripe_customer(user, db)
        if not customer_id:
            raise ValueError("Failed to create Stripe customer")
        
        # Determine plan type from price_id
        plan_type = None
        for plan_key, plan_data in PLANS.items():
            if plan_data["price_id"] == price_id:
                plan_type = plan_key
                break
        
        if not plan_type:
            raise ValueError(f"Invalid price_id: {price_id}")
        
        # Create checkout session with 3-day trial
        frontend_base = settings.frontend_base_url.rstrip("/") if settings.frontend_base_url else "http://localhost:3000"
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            subscription_data={
                "trial_period_days": 3,
                "metadata": {
                    "user_id": str(user.id),
                    "plan_type": plan_type,
                }
            },
            success_url=f"{frontend_base}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_base}/?canceled=true",
            metadata={
                "user_id": str(user.id),
                "plan_type": plan_type,
            }
        )
        
        return {
            "session_id": session.id,
            "url": session.url,
        }
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise


async def get_user_subscription(user: User, db: AsyncSession) -> Optional[Billing]:
    """Get user's current subscription (prefer active/trial, fallback to latest)"""
    try:
        result = await db.execute(
            select(Billing)
            .where(Billing.user_id == user.id)
            .where(Billing.status.in_(["active", "trial"]))
            .order_by(Billing.created_at.desc())
        )
        billing = result.scalar_one_or_none()

        if billing:
            return billing

        result = await db.execute(
            select(Billing)
            .where(Billing.user_id == user.id)
            .order_by(Billing.created_at.desc())
        )
        billing = result.scalar_one_or_none()

        if billing:
            return billing

        return await create_trial_subscription(user, db)
    except Exception as e:
        logger.error(f"Error getting user subscription: {e}")
        return None


async def update_subscription_from_stripe(
    subscription_id: str,
    db: AsyncSession
) -> Optional[Billing]:
    """Update subscription from Stripe webhook event"""
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = subscription.customer
        
        # Find billing record
        result = await db.execute(
            select(Billing).where(Billing.stripe_subscription_id == subscription_id)
        )
        billing = result.scalar_one_or_none()
        
        if not billing:
            # Find by customer ID
            result = await db.execute(
                select(Billing).where(Billing.stripe_customer_id == customer_id)
            )
            billing = result.scalar_one_or_none()
        
        if not billing:
            # Get user from customer metadata
            customer = stripe.Customer.retrieve(customer_id)
            user_id = int(customer.metadata.get("user_id", 0))
            
            if not user_id:
                logger.error(f"Could not find user_id in customer metadata: {customer_id}")
                return None
            
            # Create new billing record
            billing = Billing(
                user_id=user_id,
                plan_type=subscription.metadata.get("plan_type", "starter"),
                status=subscription.status,
                amount=subscription.items.data[0].price.unit_amount / 100,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                stripe_price_id=subscription.items.data[0].price.id,
            )
            db.add(billing)
        
        # Update billing record
        billing.status = subscription.status
        billing.stripe_subscription_id = subscription_id
        billing.stripe_price_id = subscription.items.data[0].price.id
        billing.stripe_current_period_end = datetime.fromtimestamp(subscription.current_period_end, tz=timezone.utc)
        
        if subscription.trial_end:
            billing.stripe_trial_end = datetime.fromtimestamp(subscription.trial_end, tz=timezone.utc)
        
        if subscription.canceled_at:
            billing.cancelled_at = datetime.fromtimestamp(subscription.canceled_at, tz=timezone.utc)
        
        await db.commit()
        await db.refresh(billing)
        
        return billing
    except Exception as e:
        logger.error(f"Error updating subscription from Stripe: {e}")
        await db.rollback()
        return None


def _timestamp_to_datetime(timestamp: Optional[int]) -> Optional[datetime]:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


async def list_customer_invoices(customer_id: str, limit: int = 12) -> List[Dict]:
    """List invoices for a Stripe customer"""
    try:
        if not settings.stripe_secret_key:
            raise ValueError("Stripe secret key not configured")

        invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
        invoice_data: List[Dict] = []

        count = 0
        for invoice in invoices.auto_paging_iter():
            line_item = invoice.lines.data[0] if invoice.lines.data else None
            plan_name = None
            if line_item:
                if getattr(line_item, "plan", None) and getattr(line_item.plan, "nickname", None):
                    plan_name = line_item.plan.nickname
                elif getattr(line_item, "price", None) and getattr(line_item.price, "nickname", None):
                    plan_name = line_item.price.nickname
                elif getattr(line_item, "description", None):
                    plan_name = line_item.description

            invoice_data.append({
                "id": invoice.id,
                "number": getattr(invoice, "number", None),
                "status": invoice.status,
                "amount_due": (invoice.amount_due or 0) / 100,
                "amount_paid": (invoice.amount_paid or 0) / 100,
                "currency": invoice.currency,
                "hosted_invoice_url": getattr(invoice, "hosted_invoice_url", None),
                "invoice_pdf": getattr(invoice, "invoice_pdf", None),
                "created_at": _timestamp_to_datetime(getattr(invoice, "created", None)),
                "paid_at": _timestamp_to_datetime(getattr(invoice.status_transitions, "paid_at", None)),
                "period_start": _timestamp_to_datetime(line_item.period.start) if line_item and getattr(line_item, "period", None) else None,
                "period_end": _timestamp_to_datetime(line_item.period.end) if line_item and getattr(line_item, "period", None) else None,
                "plan_name": plan_name,
            })

            count += 1
            if limit and count >= limit:
                break

        return invoice_data
    except Exception as e:
        logger.error(f"Error listing customer invoices: {e}")
        raise


async def create_billing_portal_session(customer_id: str) -> Optional[str]:
    """Create a Stripe Billing Portal session and return the URL"""
    try:
        if not settings.stripe_secret_key:
            raise ValueError("Stripe secret key not configured")

        frontend_base = settings.frontend_base_url.rstrip("/") if settings.frontend_base_url else "http://localhost:3000"
        return_url = f"{frontend_base}/dashboard"

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )

        return session.url
    except Exception as e:
        logger.error(f"Error creating billing portal session: {e}")
        raise

