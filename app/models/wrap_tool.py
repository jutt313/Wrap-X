from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WrapTool(Base):
    """Custom tools for wrapped APIs - stores tool code/config per wrap"""
    __tablename__ = "wrap_tools"

    id = Column(Integer, primary_key=True, index=True)
    wrap_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False)  # Display name (e.g., "Shopify Orders")
    tool_code = Column(Text, nullable=True)  # Python code snippet or JSON config
    description = Column(Text, nullable=True)  # What this tool does
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique constraint: each wrap can only have one tool with a given name
    __table_args__ = (
        UniqueConstraint('wrap_id', 'tool_name', name='uq_wrap_tool_name'),
    )

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="wrap_tools")
    credential = relationship("WrapCredential", back_populates="wrap_tool", uselist=False, cascade="all, delete-orphan")

