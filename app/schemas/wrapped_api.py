"""
Schemas for Wrapped API
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class WrappedAPICreate(BaseModel):
    """Schema for creating a wrapped API"""
    name: str = Field(..., min_length=1, max_length=100)
    project_id: Optional[int] = None
    provider_id: int = Field(..., description="ID of the LLM provider to use")


class WrappedAPIUpdate(BaseModel):
    """Schema for updating a wrapped API"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    thinking_mode: Optional[str] = Field(None, pattern="^(always|conditional|off)$")
    thinking_focus: Optional[str] = None
    web_search: Optional[str] = Field(None, pattern="^(always|conditional|off)$")
    web_search_triggers: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, gt=0)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0)


class PromptConfigUpdate(BaseModel):
    """Schema for updating prompt config"""
    role: Optional[str] = None
    instructions: Optional[str] = None
    rules: Optional[str] = None
    behavior: Optional[str] = None
    tone: Optional[str] = None
    examples: Optional[str] = None


class PromptConfigResponse(BaseModel):
    """Schema for prompt config response"""
    id: int
    wrapped_api_id: int
    role: Optional[str] = None
    instructions: Optional[str] = None
    rules: Optional[str] = None
    behavior: Optional[str] = None
    tone: Optional[str] = None
    examples: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WrappedAPIResponse(BaseModel):
    """Schema for wrapped API response"""
    id: int
    user_id: int
    project_id: Optional[int] = None
    provider_id: Optional[int] = None
    name: str
    endpoint_id: str
    is_active: bool
    thinking_mode: Optional[str] = None
    thinking_focus: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    web_search: Optional[str] = None
    web_search_triggers: Optional[str] = None
    web_search_enabled: bool = False
    thinking_enabled: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    prompt_config: Optional[PromptConfigResponse] = None
    
    # For display
    provider_name: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True


class ToolsUpdateRequest(BaseModel):
    """Schema for updating tool toggles"""
    web_search_enabled: bool
    thinking_enabled: bool


class ChatConfigRequest(BaseModel):
    """Schema for config chat message"""
    message: str = Field(..., min_length=1)
    available_models: Optional[List[str]] = Field(
        None,
        description="Optional: list of available model IDs for the selected provider to guide model selection"
    )
    apply: bool = Field(
        False,
        description="If true, apply the changes. If false, return preview with diff only."
    )
    config_version: Optional[int] = Field(
        None,
        description="Optional: current config version for concurrency check. If provided and doesn't match, returns 409 Conflict."
    )


class ChatConfigResponse(BaseModel):
    """Schema for config chat response"""
    parsed_updates: Dict[str, Any] = Field(..., description="Parsed configuration updates")
    response: str = Field(..., description="Assistant response message")
    diff: Dict[str, Any] = Field(
        default_factory=dict,
        description="Diff showing old vs new values for changed fields"
    )
    requires_confirmation: bool = Field(
        False,
        description="Whether changes require confirmation (apply=false)"
    )
    config_version: Optional[int] = Field(
        None,
        description="Current config version after update (if applied) or current version (if preview)"
    )


class ChatMessageRequest(BaseModel):
    """Schema for chat request - accepts either message or messages for flexibility"""
    message: Optional[str] = Field(None, description="Single message string (for internal testing)")
    messages: Optional[List[Dict[str, str]]] = Field(None, description="List of messages (OpenAI-compatible format)")
    endpoint_id: Optional[str] = Field(None, description="Optional endpoint_id for authenticated users testing (not needed for external API calls with API key)")
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_message_or_messages(self):
        """Validate that at least one of message or messages is provided"""
        if not self.message and not self.messages:
            raise ValueError("Either 'message' or 'messages' must be provided")
        return self


class ChatMessageResponse(BaseModel):
    """Schema for simple chat response (for internal testing)"""
    id: int
    message: str
    response: Optional[str] = None
    created_at: datetime


class OpenAICompatibleResponse(BaseModel):
    """Schema for OpenAI-compatible chat response"""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


class APIKeyCreate(BaseModel):
    """Schema for creating an API key"""
    key_name: str = Field(..., min_length=1, max_length=100, description="Name for the API key")


class APIKeyListItem(BaseModel):
    """Schema for API key list item (without plain key)"""
    id: int
    key_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    project_name: Optional[str] = None
    wrapped_api_id: Optional[int] = None
    wrapped_api_name: Optional[str] = None

    class Config:
        from_attributes = True


class APIKeyListResponse(BaseModel):
    """Schema for listing API keys"""
    keys: List[APIKeyListItem]
    endpoint_id: str
    endpoint_url: str


class APIKeyResponse(BaseModel):
    """Schema for API key response (with plain key shown only once)"""
    api_key: str = Field(..., description="The API key (shown only once)")
    endpoint_id: str = Field(..., description="The endpoint ID")
    endpoint_url: str = Field(..., description="Full endpoint URL")
    key_name: Optional[str] = None
