from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String, nullable=False)
    tool_type = Column(String, nullable=False)  # web_search, thinking, code_exec, custom
    tool_config = Column(JSON, nullable=True)  # tool configuration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="tools")
    wrapped_apis = relationship("WrappedAPITool", back_populates="tool", cascade="all, delete-orphan")

