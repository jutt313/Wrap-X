from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WrappedAPI(Base):
    __tablename__ = "wrapped_apis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    provider_id = Column(Integer, ForeignKey("llm_providers.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    endpoint_id = Column(String, unique=True, index=True, nullable=False)  # unique endpoint identifier
    is_active = Column(Boolean, default=True)
    # API settings
    thinking_mode = Column(String, nullable=True)  # "always_on", "always_off", "custom"
    model = Column(String, nullable=True)  # e.g., "gpt-4", "claude-3-sonnet"
    temperature = Column(Float, nullable=True)
    max_tokens = Column(Integer, nullable=True)
    top_p = Column(Float, nullable=True)
    frequency_penalty = Column(Float, nullable=True)
    config_version = Column(Integer, default=0, nullable=False)  # Version for concurrency control
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="wrapped_apis")
    project = relationship("Project", back_populates="wrapped_apis")
    provider = relationship("LLMProvider", back_populates="wrapped_apis")
    api_keys = relationship("APIKey", back_populates="wrapped_api", cascade="all, delete-orphan")
    prompt_config = relationship("PromptConfig", uselist=False, cascade="all, delete-orphan")
    tools = relationship("WrappedAPITool", back_populates="wrapped_api", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="wrapped_api", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="wrapped_api", cascade="all, delete-orphan")
    api_logs = relationship("APILog", back_populates="wrapped_api", cascade="all, delete-orphan")
    rate_limits = relationship("RateLimit", back_populates="wrapped_api", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="wrapped_api", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="wrapped_api", cascade="all, delete-orphan")
    config_versions = relationship("ConfigVersion", back_populates="wrapped_api", cascade="all, delete-orphan")

