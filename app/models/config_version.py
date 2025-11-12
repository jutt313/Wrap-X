from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ConfigVersion(Base):
    __tablename__ = "config_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_config_id = Column(Integer, ForeignKey("prompt_configs.id", ondelete="CASCADE"), nullable=False)
    wrapped_api_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Who made the change
    version_number = Column(Integer, nullable=False)  # Version number (matches config_version)
    config_snapshot = Column(JSON, nullable=False)  # Full config snapshot before change
    changes = Column(JSON, nullable=True)  # Diff of what changed (old vs new)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    prompt_config = relationship("PromptConfig", back_populates="config_versions")
    wrapped_api = relationship("WrappedAPI", back_populates="config_versions")
    user = relationship("User", back_populates="config_versions")

