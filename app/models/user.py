from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    llm_providers = relationship("LLMProvider", back_populates="user", cascade="all, delete-orphan")
    wrapped_apis = relationship("WrappedAPI", back_populates="user", cascade="all, delete-orphan")
    tools = relationship("Tool", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    rate_limits = relationship("RateLimit", back_populates="user", cascade="all, delete-orphan")
    billing_records = relationship("Billing", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", cascade="all, delete-orphan")
    notification_settings = relationship("NotificationSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    config_versions = relationship("ConfigVersion", back_populates="user", cascade="all, delete-orphan")

