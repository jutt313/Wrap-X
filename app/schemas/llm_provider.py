from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LLMProviderCreate(BaseModel):
    """Schema for creating LLM provider"""
    name: str = Field(..., min_length=1, max_length=100)
    project_id: int
    provider_name: str
    api_key: str
    api_base_url: Optional[str] = None


class LLMProviderResponse(BaseModel):
    """Response schema for LLM provider"""
    id: int
    name: str
    project_id: int
    provider_name: str
    api_base_url: Optional[str] = None
    calls_count: int = 0
    tokens_count: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    projectName: Optional[str] = None  # For frontend display

    class Config:
        from_attributes = True


class SupportedProvider(BaseModel):
    """Schema for supported provider info"""
    name: str
    provider_id: str
    description: Optional[str] = None

