from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PlanInfo(BaseModel):
    name: str
    price: float
    wraps: int
    price_id: str


class SubscriptionResponse(BaseModel):
    id: int
    plan_type: str
    status: str
    amount: float
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CheckoutSessionRequest(BaseModel):
    price_id: str = Field(..., description="Stripe price ID for the plan")


class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str


class WebhookEvent(BaseModel):
    type: str
    data: dict


class InvoiceItem(BaseModel):
    id: str
    number: Optional[str] = None
    status: str
    amount_due: float
    amount_paid: float
    currency: str
    hosted_invoice_url: Optional[str] = None
    invoice_pdf: Optional[str] = None
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    plan_name: Optional[str] = None


class BillingHistoryResponse(BaseModel):
    invoices: List[InvoiceItem]


class BillingPortalSessionResponse(BaseModel):
    url: str




