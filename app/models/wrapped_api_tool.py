from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WrappedAPITool(Base):
    __tablename__ = "wrapped_api_tools"

    id = Column(Integer, primary_key=True, index=True)
    wrapped_api_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False)
    tool_id = Column(Integer, ForeignKey("tools.id", ondelete="CASCADE"), nullable=False)
    trigger_condition = Column(Text, nullable=True)  # When to use this tool (e.g., "when user asks about current events")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="tools")
    tool = relationship("Tool", back_populates="wrapped_apis")

