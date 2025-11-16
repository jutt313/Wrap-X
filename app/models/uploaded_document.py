from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    wrapped_api_id = Column(Integer, ForeignKey("wrapped_apis.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, csv, txt, etc.
    mime_type = Column(String, nullable=True)
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
    content = Column(Text, nullable=False)  # Base64 encoded content
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wrapped_api = relationship("WrappedAPI", back_populates="uploaded_documents")

