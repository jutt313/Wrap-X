from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LLMProvider(Base):
    __tablename__ = "llm_providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # user-friendly name
    provider_name = Column(String, nullable=False)  # openai, anthropic, deepseek, etc.
    api_key = Column(String, nullable=False)  # encrypted
    api_base_url = Column(String, nullable=True)  # optional custom base URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="llm_providers")
    project = relationship("Project", back_populates="llm_providers")
    wrapped_apis = relationship("WrappedAPI", back_populates="provider")

