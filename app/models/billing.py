from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Billing(Base):
    __tablename__ = "billing"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_type = Column(String, nullable=False)  # starter, professional, business
    status = Column(String, nullable=False)  # active, cancelled, expired, trial, past_due
    amount = Column(Float, nullable=False)
    
    # Stripe fields
    stripe_customer_id = Column(String, nullable=True, unique=True, index=True)  # cus_...
    stripe_subscription_id = Column(String, nullable=True, unique=True, index=True)  # sub_...
    stripe_price_id = Column(String, nullable=True)  # price_...
    stripe_current_period_end = Column(DateTime(timezone=True), nullable=True)
    stripe_trial_end = Column(DateTime(timezone=True), nullable=True)
    
    payment_date = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="billing_records")

