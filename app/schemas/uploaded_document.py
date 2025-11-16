from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UploadedDocumentCreate(BaseModel):
    """Schema for creating an uploaded document"""
    filename: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., min_length=1, max_length=50)
    mime_type: Optional[str] = None
    file_size: int = Field(..., gt=0)
    content: str = Field(..., description="Base64 encoded file content")


class UploadedDocumentResponse(BaseModel):
    """Schema for uploaded document response"""
    id: int
    wrapped_api_id: int
    filename: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

