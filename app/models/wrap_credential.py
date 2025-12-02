from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WrapCredential(Base):
    """Encrypted credentials for wrap tools - stores API keys, tokens, etc."""
    __tablename__ = "wrap_credentials"

    id = Column(Integer, primary_key=True, index=True)
    wrap_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_id = Column(Integer, ForeignKey("wrap_tools.id", ondelete="CASCADE"), nullable=True, index=True)
    tool_name = Column(String(100), nullable=False)  # Same name used in wrap_tools
    credentials_json = Column(Text, nullable=False)  # Encrypted JSON blob
    tool_metadata = Column(JSONB, nullable=True)  # Optional: status, last_tested_at, error, field_definitions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique constraint: each tool has one credential record per wrap
    __table_args__ = (
        UniqueConstraint('wrap_id', 'tool_name', name='uq_wrap_credential_tool_name'),
    )

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="wrap_credentials")
    wrap_tool = relationship("WrapTool", back_populates="credential")

