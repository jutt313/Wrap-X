from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PromptConfig(Base):
    __tablename__ = "prompt_configs"

    id = Column(Integer, primary_key=True, index=True)
    wrapped_api_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False, unique=True)
    role = Column(Text, nullable=True)  # AI role/identity
    instructions = Column(Text, nullable=True)  # main instructions
    rules = Column(Text, nullable=True)  # rules to follow
    behavior = Column(Text, nullable=True)  # desired behavior
    tone = Column(String, nullable=True)  # communication tone
    examples = Column(Text, nullable=True)  # example interactions/outputs (JSON or text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="prompt_config")
    config_versions = relationship("ConfigVersion", back_populates="prompt_config", cascade="all, delete-orphan")

