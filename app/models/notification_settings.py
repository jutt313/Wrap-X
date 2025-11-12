from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Notification preferences
    api_errors = Column(Boolean, default=True)
    rate_limits = Column(Boolean, default=True)
    usage_thresholds = Column(Boolean, default=True)
    billing_alerts = Column(Boolean, default=True)
    deployment_updates = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="notification_settings")

