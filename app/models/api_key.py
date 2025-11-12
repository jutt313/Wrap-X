from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    wrapped_api_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False)
    api_key = Column(String, nullable=False, index=True)  # hashed
    key_name = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="api_keys")

