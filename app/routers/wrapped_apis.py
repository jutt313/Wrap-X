"""
Router for Wrapped API management
"""
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User
from app.models.wrapped_api import WrappedAPI
from app.models.prompt_config import PromptConfig
from app.models.chat_message import ChatMessage
from app.models.llm_provider import LLMProvider
from app.models.project import Project
from app.models.api_key import APIKey
from app.models.tool import Tool
from app.models.wrapped_api_tool import WrappedAPITool
from app.models.api_log import APILog
from app.models.uploaded_document import UploadedDocument
from app.schemas.wrapped_api import (
    WrappedAPICreate,
    WrappedAPIResponse,
    WrappedAPIUpdate,
    PromptConfigUpdate,
    PromptConfigResponse,
    ChatConfigRequest,
    ChatConfigResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    APIKeyResponse,
    APIKeyCreate,
    APIKeyListResponse,
    APIKeyListItem,
    ToolsUpdateRequest
)
from app.schemas.uploaded_document import UploadedDocumentCreate, UploadedDocumentResponse
from app.auth.dependencies import get_current_active_user
from app.auth.utils import verify_token
from app.services.chat_service import parse_chat_command, call_wrapped_llm
from app.services.model_catalog import get_available_models
from app.services.notification_service import create_notification
from app.services.config_validator import validate_config_updates, sanitize_chat_logs, ValidationError
from app.middleware.rate_limit import check_rate_limit
from app.models.config_version import ConfigVersion
import json
from cryptography.fernet import Fernet
import hashlib
import secrets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wrapped-apis", tags=["wrapped_apis"])


def generate_endpoint_id() -> str:
    """Generate unique endpoint ID"""
    return f"wrap_{uuid.uuid4().hex[:24]}"


def hash_api_key(api_key: str) -> str:
    """Hash API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()


def calculate_config_diff(old_config: dict, new_config: dict) -> dict:
    """Calculate diff between old and new config"""
    diff = {}
    for key in new_config:
        if key not in old_config or old_config[key] != new_config[key]:
            diff[key] = {
                "old": old_config.get(key),
                "new": new_config[key]
            }
    return diff


def get_current_config_snapshot(wrapped_api: WrappedAPI) -> dict:
    """Get current config as a snapshot for audit trail"""
    return {
        "role": wrapped_api.prompt_config.role if wrapped_api.prompt_config else None,
        "instructions": wrapped_api.prompt_config.instructions if wrapped_api.prompt_config else None,
        "rules": wrapped_api.prompt_config.rules if wrapped_api.prompt_config else None,
        "behavior": wrapped_api.prompt_config.behavior if wrapped_api.prompt_config else None,
        "tone": wrapped_api.prompt_config.tone if wrapped_api.prompt_config else None,
        "examples": wrapped_api.prompt_config.examples if wrapped_api.prompt_config else None,
        "thinking_mode": wrapped_api.thinking_mode,
        "model": wrapped_api.model,
        "temperature": wrapped_api.temperature,
        "max_tokens": wrapped_api.max_tokens,
        "top_p": wrapped_api.top_p,
        "frequency_penalty": wrapped_api.frequency_penalty,
    }


@router.post("/", response_model=WrappedAPIResponse, status_code=status.HTTP_201_CREATED)
async def create_wrapped_api(
    wrapped_data: WrappedAPICreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new wrapped API"""
    try:
        # Verify provider belongs to user
        if wrapped_data.provider_id:
            provider_result = await db.execute(
                select(LLMProvider).where(
                    LLMProvider.id == wrapped_data.provider_id,
                    LLMProvider.user_id == current_user.id
                )
            )
            provider = provider_result.scalar_one_or_none()
            if not provider:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="LLM Provider not found or not owned by user"
                )
        
        # Verify project belongs to user if provided
        project = None
        if wrapped_data.project_id:
            project_result = await db.execute(
                select(Project).where(
                    Project.id == wrapped_data.project_id,
                    Project.user_id == current_user.id
                )
            )
            project = project_result.scalar_one_or_none()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or not owned by user"
                )
        else:
            # Get default project
            project_result = await db.execute(
                select(Project).where(
                    Project.user_id == current_user.id
                ).order_by(Project.created_at.asc())
            )
            project = project_result.scalar_one_or_none()
        
        # Create wrapped API
        new_wrapped_api = WrappedAPI(
            user_id=current_user.id,
            project_id=project.id if project else None,
            provider_id=wrapped_data.provider_id,
            name=wrapped_data.name,
            endpoint_id=generate_endpoint_id(),
            is_active=True
        )
        
        db.add(new_wrapped_api)
        await db.flush()  # Get the ID
        
        # Create initial prompt config
        prompt_config = PromptConfig(
            wrapped_api_id=new_wrapped_api.id
        )
        db.add(prompt_config)
        
        await db.commit()
        await db.refresh(new_wrapped_api)
        await db.refresh(prompt_config)
        
        # Create wrap created notification
        await create_notification(
            db=db,
            user_id=current_user.id,
            notification_type="wrap_created",
            title=f"Wrap '{new_wrapped_api.name}' created successfully",
            message=f"Your new wrap '{new_wrapped_api.name}' has been created and is ready to use. You can now configure it and start making API calls.",
            wrapped_api_id=new_wrapped_api.id,
            metadata={"wrap_name": new_wrapped_api.name, "endpoint_id": new_wrapped_api.endpoint_id}
        )
        
        # Load provider and project for response
        provider_name = None
        project_name = None
        if new_wrapped_api.provider_id:
            provider_result = await db.execute(
                select(LLMProvider).where(LLMProvider.id == new_wrapped_api.provider_id)
            )
            provider = provider_result.scalar_one_or_none()
            if provider:
                provider_name = provider.provider_name
        
        if new_wrapped_api.project_id:
            project_result = await db.execute(
                select(Project).where(Project.id == new_wrapped_api.project_id)
            )
            project = project_result.scalar_one_or_none()
            if project:
                project_name = project.name
        
        return WrappedAPIResponse(
            id=new_wrapped_api.id,
            user_id=new_wrapped_api.user_id,
            project_id=new_wrapped_api.project_id,
            provider_id=new_wrapped_api.provider_id,
            name=new_wrapped_api.name,
            endpoint_id=new_wrapped_api.endpoint_id,
            is_active=new_wrapped_api.is_active,
            thinking_mode=new_wrapped_api.thinking_mode,
            model=new_wrapped_api.model,
            temperature=new_wrapped_api.temperature,
            max_tokens=new_wrapped_api.max_tokens,
            top_p=new_wrapped_api.top_p,
            frequency_penalty=new_wrapped_api.frequency_penalty,
            web_search_enabled=new_wrapped_api.web_search_enabled,
            thinking_enabled=new_wrapped_api.thinking_enabled,
            created_at=new_wrapped_api.created_at,
            updated_at=new_wrapped_api.updated_at,
            prompt_config=PromptConfigResponse(
                id=prompt_config.id,
                wrapped_api_id=prompt_config.wrapped_api_id,
                role=prompt_config.role,
                instructions=prompt_config.instructions,
                rules=prompt_config.rules,
                behavior=prompt_config.behavior,
                tone=prompt_config.tone,
                examples=prompt_config.examples,
                created_at=prompt_config.created_at,
                updated_at=prompt_config.updated_at
            ) if prompt_config else None,
            provider_name=provider_name,
            project_name=project_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating wrapped API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create wrapped API"
        )


@router.get("/", response_model=List[WrappedAPIResponse])
async def list_wrapped_apis(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all wrapped APIs for the current user"""
    try:
        result = await db.execute(
            select(WrappedAPI)
            .where(WrappedAPI.user_id == current_user.id)
            .options(selectinload(WrappedAPI.prompt_config))
            .order_by(WrappedAPI.created_at.desc())
        )
        wrapped_apis = result.scalars().all()
        
        # Load providers and projects
        provider_ids = {wa.provider_id for wa in wrapped_apis if wa.provider_id}
        project_ids = {wa.project_id for wa in wrapped_apis if wa.project_id}
        
        providers = {}
        if provider_ids:
            providers_result = await db.execute(
                select(LLMProvider).where(LLMProvider.id.in_(provider_ids))
            )
            for p in providers_result.scalars().all():
                providers[p.id] = p.provider_name
        
        projects = {}
        if project_ids:
            projects_result = await db.execute(
                select(Project).where(Project.id.in_(project_ids))
            )
            for p in projects_result.scalars().all():
                projects[p.id] = p.name
        
        response_list = []
        for wa in wrapped_apis:
            response_list.append(WrappedAPIResponse(
                id=wa.id,
                user_id=wa.user_id,
                project_id=wa.project_id,
                provider_id=wa.provider_id,
                name=wa.name,
                endpoint_id=wa.endpoint_id,
                is_active=wa.is_active,
                thinking_mode=wa.thinking_mode,
                model=wa.model,
                temperature=wa.temperature,
                max_tokens=wa.max_tokens,
                top_p=wa.top_p,
                frequency_penalty=wa.frequency_penalty,
                web_search_enabled=wa.web_search_enabled,
                thinking_enabled=wa.thinking_enabled,
                created_at=wa.created_at,
                updated_at=wa.updated_at,
                prompt_config=PromptConfigResponse(
                    id=wa.prompt_config.id,
                    wrapped_api_id=wa.prompt_config.wrapped_api_id,
                    role=wa.prompt_config.role,
                    instructions=wa.prompt_config.instructions,
                    rules=wa.prompt_config.rules,
                    behavior=wa.prompt_config.behavior,
                    tone=wa.prompt_config.tone,
                    examples=wa.prompt_config.examples,
                    created_at=wa.prompt_config.created_at,
                    updated_at=wa.prompt_config.updated_at
                ) if wa.prompt_config else None,
                provider_name=providers.get(wa.provider_id),
                project_name=projects.get(wa.project_id)
            ))
        
        return response_list
        
    except Exception as e:
        logger.error(f"Error listing wrapped APIs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list wrapped APIs"
        )


@router.get("/{wrapped_api_id}", response_model=WrappedAPIResponse)
async def get_wrapped_api(
    wrapped_api_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific wrapped API"""
    result = await db.execute(
        select(WrappedAPI)
        .where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
        .options(selectinload(WrappedAPI.prompt_config))
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    # Load provider and project
    provider_name = None
    project_name = None
    
    if wrapped_api.provider_id:
        provider_result = await db.execute(
            select(LLMProvider).where(LLMProvider.id == wrapped_api.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if provider:
            provider_name = provider.provider_name
    
    if wrapped_api.project_id:
        project_result = await db.execute(
            select(Project).where(Project.id == wrapped_api.project_id)
        )
        project = project_result.scalar_one_or_none()
        if project:
            project_name = project.name
    
    return WrappedAPIResponse(
        id=wrapped_api.id,
        user_id=wrapped_api.user_id,
        project_id=wrapped_api.project_id,
        provider_id=wrapped_api.provider_id,
        name=wrapped_api.name,
        endpoint_id=wrapped_api.endpoint_id,
        is_active=wrapped_api.is_active,
        thinking_mode=wrapped_api.thinking_mode,
        model=wrapped_api.model,
        temperature=wrapped_api.temperature,
        max_tokens=wrapped_api.max_tokens,
        top_p=wrapped_api.top_p,
        frequency_penalty=wrapped_api.frequency_penalty,
        web_search_enabled=wrapped_api.web_search_enabled,
        thinking_enabled=wrapped_api.thinking_enabled,
        created_at=wrapped_api.created_at,
        updated_at=wrapped_api.updated_at,
        prompt_config=PromptConfigResponse(
            id=wrapped_api.prompt_config.id,
            wrapped_api_id=wrapped_api.prompt_config.wrapped_api_id,
            role=wrapped_api.prompt_config.role,
            instructions=wrapped_api.prompt_config.instructions,
            rules=wrapped_api.prompt_config.rules,
            behavior=wrapped_api.prompt_config.behavior,
            tone=wrapped_api.prompt_config.tone,
            examples=wrapped_api.prompt_config.examples,
            created_at=wrapped_api.prompt_config.created_at,
            updated_at=wrapped_api.prompt_config.updated_at
        ) if wrapped_api.prompt_config else None,
        provider_name=provider_name,
        project_name=project_name
    )


@router.put("/{wrapped_api_id}", response_model=WrappedAPIResponse)
async def update_wrapped_api(
    wrapped_api_id: int,
    wrapped_data: WrappedAPIUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a wrapped API"""
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    # Update fields
    if wrapped_data.name is not None:
        wrapped_api.name = wrapped_data.name
    if wrapped_data.is_active is not None:
        wrapped_api.is_active = wrapped_data.is_active
    if wrapped_data.thinking_mode is not None:
        wrapped_api.thinking_mode = wrapped_data.thinking_mode
    if wrapped_data.model is not None:
        wrapped_api.model = wrapped_data.model
    if wrapped_data.temperature is not None:
        wrapped_api.temperature = wrapped_data.temperature
    if wrapped_data.max_tokens is not None:
        wrapped_api.max_tokens = wrapped_data.max_tokens
    if wrapped_data.top_p is not None:
        wrapped_api.top_p = wrapped_data.top_p
    if wrapped_data.frequency_penalty is not None:
        wrapped_api.frequency_penalty = wrapped_data.frequency_penalty
    
    wrapped_api.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(wrapped_api)
    
    # Return updated wrapped API
    return await get_wrapped_api(wrapped_api_id, current_user, db)


@router.delete("/{wrapped_api_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wrapped_api(
    wrapped_api_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a wrapped API"""
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    await db.delete(wrapped_api)
    await db.commit()
    
    return None


@router.post("/{wrapped_api_id}/chat/config", response_model=ChatConfigResponse)
async def send_config_chat_message(
    wrapped_api_id: int,
    chat_request: ChatConfigRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Handle config chat message - parse and update config with production-ready validation and security"""
    try:
        # Rate limiting check
        allowed, retry_after = check_rate_limit(current_user.id, wrapped_api_id, user_limit=10, wrap_limit=5)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        # Get wrapped API
        result = await db.execute(
            select(WrappedAPI)
            .where(
                WrappedAPI.id == wrapped_api_id,
                WrappedAPI.user_id == current_user.id
            )
            .options(selectinload(WrappedAPI.prompt_config))
        )
        wrapped_api = result.scalar_one_or_none()
        
        if not wrapped_api:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wrapped API not found"
            )
        
        # Concurrency guard: Check config version if provided
        if chat_request.config_version is not None:
            if wrapped_api.config_version != chat_request.config_version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Config version mismatch. Current version: {wrapped_api.config_version}, provided: {chat_request.config_version}. Please refresh and try again."
                )
        
        # Save chat message (not committed yet)
        chat_message = ChatMessage(
            user_id=current_user.id,
            wrapped_api_id=wrapped_api_id,
            message=chat_request.message
        )
        db.add(chat_message)

        # Build full conversation history (user/assistant turns)
        history_msgs = []
        prev_msgs_result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.wrapped_api_id == wrapped_api_id,
                ChatMessage.user_id == current_user.id
            )
            .order_by(ChatMessage.created_at.asc())
        )
        for m in prev_msgs_result.scalars().all():
            history_msgs.append({"role": "user", "content": m.message})
            if m.response:
                history_msgs.append({"role": "assistant", "content": m.response})

        # Also include the current (not yet committed) message at the end when calling parser
        # Get provider/project names for context
        provider_name = None
        project_name = None
        if wrapped_api.provider_id:
            prov_res = await db.execute(
                select(LLMProvider).where(LLMProvider.id == wrapped_api.provider_id)
            )
            prov_obj = prov_res.scalar_one_or_none()
            if prov_obj:
                provider_name = prov_obj.provider_name
        if wrapped_api.project_id:
            proj_res = await db.execute(
                select(Project).where(Project.id == wrapped_api.project_id)
            )
            proj_obj = proj_res.scalar_one_or_none()
            if proj_obj:
                project_name = proj_obj.name

        # Fetch recent test chat logs (sanitized - last 5 only)
        test_chat_logs_raw = []
        try:
            logs_result = await db.execute(
                select(APILog)
                .where(
                    APILog.wrapped_api_id == wrapped_api_id,
                    APILog.is_success == True
                )
                .order_by(APILog.created_at.desc())
                .limit(5)  # Reduced from 20 to 5
            )
            for log in logs_result.scalars().all():
                # Extract request and response messages
                request_data = log.request_data or {}
                response_data = log.response_data or {}
                
                # Extract user message and assistant response
                user_msg = None
                if "message" in request_data:
                    user_msg = request_data["message"]
                elif "messages" in request_data and isinstance(request_data["messages"], list):
                    # Get last user message
                    for msg in reversed(request_data["messages"]):
                        if msg.get("role") == "user":
                            user_msg = msg.get("content", "")
                            break
                
                assistant_msg = None
                if "response" in response_data:
                    assistant_msg = response_data["response"]
                elif "choices" in response_data and isinstance(response_data["choices"], list):
                    if len(response_data["choices"]) > 0:
                        choice = response_data["choices"][0]
                        if "message" in choice and "content" in choice["message"]:
                            assistant_msg = choice["message"]["content"]
                
                if user_msg or assistant_msg:
                    test_chat_logs_raw.append({
                        "timestamp": log.created_at.isoformat() if log.created_at else None,
                        "user_message": user_msg,
                        "assistant_response": assistant_msg,
                    })
        except Exception as e:
            logger.warning(f"Failed to fetch test chat logs: {e}")
            test_chat_logs_raw = []
        
        # Sanitize chat logs before sending to AI
        test_chat_logs = sanitize_chat_logs(test_chat_logs_raw, max_logs=5, max_message_length=100)
        
        # Load uploaded documents for this wrapped API
        documents_info = []
        try:
            docs_result = await db.execute(
                select(UploadedDocument)
                .where(UploadedDocument.wrapped_api_id == wrapped_api_id)
                .order_by(UploadedDocument.created_at.desc())
            )
            documents = docs_result.scalars().all()
            documents_info = [
                {
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None
                }
                for doc in documents
            ]
        except Exception as e:
            logger.warning(f"Failed to load documents: {e}")
            documents_info = []

        # Get current config for parsing
        current_config = {
            "role": wrapped_api.prompt_config.role if wrapped_api.prompt_config else None,
            "instructions": wrapped_api.prompt_config.instructions if wrapped_api.prompt_config else None,
            "rules": wrapped_api.prompt_config.rules if wrapped_api.prompt_config else None,
            "behavior": wrapped_api.prompt_config.behavior if wrapped_api.prompt_config else None,
            "tone": wrapped_api.prompt_config.tone if wrapped_api.prompt_config else None,
            "examples": wrapped_api.prompt_config.examples if wrapped_api.prompt_config else None,
            "thinking_mode": wrapped_api.thinking_mode,
            "model": wrapped_api.model,
            "temperature": wrapped_api.temperature,
            "max_tokens": wrapped_api.max_tokens,
            # Contextual hints
            "provider_name": provider_name,
            "wrap_name": wrapped_api.name,
            "project_name": project_name,
            "available_models": getattr(chat_request, 'available_models', None),
            # Tool configurations
            "thinking_enabled": getattr(wrapped_api, "thinking_enabled", False),
            "web_search_enabled": getattr(wrapped_api, "web_search_enabled", False),
            # Uploaded documents
            "uploaded_documents": documents_info,
            # Test chat logs for analysis
            "test_chat_logs": test_chat_logs
        }

        # If available_models were not provided by the UI, try to fetch dynamically
        if not current_config.get("available_models") and wrapped_api.provider_id:
            try:
                current_config["available_models"] = get_available_models(prov_obj)
            except Exception as _e:
                # Silent fallback; the prompt will ask user to pick from UI
                current_config["available_models"] = None
        
        # Parse command
        logger.info(f"Parsing config chat message: user={current_user.id}, wrapped_api_id={wrapped_api_id}, message='{chat_request.message[:100]}...'")
        parsed = await parse_chat_command(chat_request.message, current_config, history=history_msgs)
        logger.info(f"Parsed config chat message: parsed_updates={parsed}")
        
        # Validate parsed updates with strict parsing
        try:
            # Get provider for model validation
            prov_obj = None
            if wrapped_api.provider_id:
                prov_res = await db.execute(
                    select(LLMProvider).where(LLMProvider.id == wrapped_api.provider_id)
                )
                prov_obj = prov_res.scalar_one_or_none()
            
            # Validate with strict parsing (raises ValidationError on failure)
            validated_parsed = validate_config_updates(
                parsed,
                available_models=current_config.get("available_models"),
                provider=prov_obj
            )
            
            # Use validated parsed data
            parsed = validated_parsed
            
        except ValidationError as ve:
            # Structured validation error
            response_msg = parsed.get("response_message") or "Validation failed"
            chat_message.response = response_msg
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Validation failed",
                    "details": ve.details,
                    "message": response_msg
                }
            )
        
        # Only treat as error if no response_message is provided
        if "error" in parsed and not parsed.get("response_message"):
            logger.warning(f"Config chat parse error: user={current_user.id}, wrapped_api_id={wrapped_api_id}, error={parsed.get('error')}")
            # Use the error message directly from AI, no hardcoded prefix
            response_msg = parsed['error']
            chat_message.response = response_msg
            await db.commit()
            return ChatConfigResponse(
                parsed_updates={},
                response=response_msg,
                diff={},
                requires_confirmation=False,
                config_version=wrapped_api.config_version
            )
        
        # Get current config snapshot for diff calculation
        old_config_snapshot = get_current_config_snapshot(wrapped_api)
        
        # Calculate new config (what it would be after updates)
        new_config_snapshot = old_config_snapshot.copy()
        for key in ["role", "instructions", "rules", "behavior", "tone", "examples", 
                    "thinking_mode", "model", "temperature", "max_tokens", "top_p", "frequency_penalty"]:
            if key in parsed and parsed[key] is not None:
                new_config_snapshot[key] = parsed[key]
        
        # Calculate diff
        diff = calculate_config_diff(old_config_snapshot, new_config_snapshot)
        
        # If apply=false, return preview only
        if not chat_request.apply:
            response_msg = parsed.get("response_message") or parsed.get("error") or "Preview of changes"
            chat_message.response = response_msg
            await db.commit()
            return ChatConfigResponse(
                parsed_updates=parsed,
                response=response_msg,
                diff=diff,
                requires_confirmation=True,
                config_version=wrapped_api.config_version
            )
        
        # Update prompt config
        if not wrapped_api.prompt_config:
            wrapped_api.prompt_config = PromptConfig(wrapped_api_id=wrapped_api_id)
            db.add(wrapped_api.prompt_config)
        
        if "role" in parsed:
            wrapped_api.prompt_config.role = parsed["role"]
        if "instructions" in parsed:
            wrapped_api.prompt_config.instructions = parsed["instructions"]
        if "rules" in parsed:
            wrapped_api.prompt_config.rules = parsed["rules"]
        if "behavior" in parsed:
            wrapped_api.prompt_config.behavior = parsed["behavior"]
        if "tone" in parsed:
            wrapped_api.prompt_config.tone = parsed["tone"]
        if "examples" in parsed:
            wrapped_api.prompt_config.examples = parsed["examples"]
        
        # Update wrapped API settings
        if "thinking_mode" in parsed:
            wrapped_api.thinking_mode = parsed["thinking_mode"]
        if "model" in parsed:
            wrapped_api.model = parsed["model"]
        if "temperature" in parsed:
            wrapped_api.temperature = parsed["temperature"]
        if "max_tokens" in parsed:
            wrapped_api.max_tokens = parsed["max_tokens"]
        if "top_p" in parsed:
            wrapped_api.top_p = parsed["top_p"]
        if "frequency_penalty" in parsed:
            wrapped_api.frequency_penalty = parsed["frequency_penalty"]
        
        # Handle tools
        if "tools" in parsed and isinstance(parsed["tools"], list):
            # Get all available tools
            tools_result = await db.execute(
                select(Tool).where(Tool.user_id == current_user.id)
            )
            available_tools = {t.tool_name: t for t in tools_result.scalars().all()}
            
            # Update tools
            for tool_data in parsed["tools"]:
                if isinstance(tool_data, dict):
                    tool_name = tool_data.get("tool_name") or tool_data.get("name") or tool_data.get("type")
                    trigger = tool_data.get("trigger_condition")
                else:
                    tool_name = str(tool_data)
                    trigger = None
                
                if tool_name in available_tools:
                    tool = available_tools[tool_name]
                    # Check if already linked
                    existing_link = await db.execute(
                        select(WrappedAPITool).where(
                            WrappedAPITool.wrapped_api_id == wrapped_api_id,
                            WrappedAPITool.tool_id == tool.id
                        )
                    )
                    link = existing_link.scalar_one_or_none()
                    
                    if not link:
                        link = WrappedAPITool(
                            wrapped_api_id=wrapped_api_id,
                            tool_id=tool.id,
                            trigger_condition=trigger
                        )
                        db.add(link)
                    else:
                        if trigger:
                            link.trigger_condition = trigger
        
        # Generate response from AI - check if AI provided a response message
        # If not, we'll generate one from parsed data, but prefer AI-generated messages
        response_parts = []
        has_updates = False
        
        # Check what was actually updated (not null)
        if parsed.get("role") is not None:
            response_parts.append(f"Role: {parsed['role']}")
            has_updates = True
        if parsed.get("instructions") is not None:
            response_parts.append(f"Instructions: {parsed['instructions']}")
            has_updates = True
        if parsed.get("rules") is not None:
            response_parts.append(f"Rules: {parsed['rules']}")
            has_updates = True
        if parsed.get("behavior") is not None:
            response_parts.append(f"Behavior: {parsed['behavior']}")
            has_updates = True
        if parsed.get("tone") is not None:
            response_parts.append(f"Tone: {parsed['tone']}")
            has_updates = True
        if parsed.get("examples") is not None:
            response_parts.append(f"Examples: {parsed['examples']}")
            has_updates = True
        if parsed.get("thinking_mode") is not None:
            response_parts.append(f"Thinking mode: {parsed['thinking_mode']}")
            has_updates = True
        if parsed.get("model") is not None:
            response_parts.append(f"Model: {parsed['model']}")
            has_updates = True
        if parsed.get("temperature") is not None:
            response_parts.append(f"Temperature: {parsed['temperature']}")
            has_updates = True
        if parsed.get("max_tokens") is not None:
            response_parts.append(f"Max tokens: {parsed['max_tokens']}")
            has_updates = True
        if parsed.get("top_p") is not None:
            response_parts.append(f"Top P: {parsed['top_p']}")
            has_updates = True
        if parsed.get("frequency_penalty") is not None:
            response_parts.append(f"Frequency penalty: {parsed['frequency_penalty']}")
            has_updates = True
        if parsed.get("tools") is not None and isinstance(parsed.get("tools"), list) and len(parsed.get("tools", [])) > 0:
            tool_names = []
            for tool in parsed["tools"]:
                if isinstance(tool, dict):
                    name = tool.get("tool_name") or tool.get("name") or tool.get("type") or "tool"
                else:
                    name = str(tool)
                tool_names.append(name)
            response_parts.append(f"Tools: {', '.join(tool_names)}")
            has_updates = True
        
        # Create audit trail before applying changes
        if not wrapped_api.prompt_config:
            wrapped_api.prompt_config = PromptConfig(wrapped_api_id=wrapped_api_id)
            db.add(wrapped_api.prompt_config)
            await db.flush()  # Get prompt_config.id
        
        # Create ConfigVersion record for audit trail
        config_version_record = ConfigVersion(
            prompt_config_id=wrapped_api.prompt_config.id,
            wrapped_api_id=wrapped_api_id,
            user_id=current_user.id,
            version_number=wrapped_api.config_version,
            config_snapshot=old_config_snapshot,
            changes=diff
        )
        db.add(config_version_record)
        
        # Increment config version
        wrapped_api.config_version += 1
        
        # Use AI-generated response message ONLY - no hardcoded responses
        # Priority: response_message > error > empty string (only show what AI generates)
        if "response_message" in parsed and parsed.get("response_message"):
            # AI provided a user-friendly response message - use it directly
            response_msg = parsed["response_message"]
        elif "error" in parsed and parsed.get("error"):
            # AI provided an error message - use it directly
            response_msg = parsed["error"]
        else:
            # No message from AI - return empty (should rarely happen as system prompt requires response_message)
            response_msg = parsed.get("response_message") or parsed.get("error") or ""
        
        logger.info(f"Config updated for wrapped API {wrapped_api_id}: {response_msg[:100]}")
        
        chat_message.response = response_msg
        await db.commit()
        
        logger.info(f"Config chat message processed: user={current_user.id}, wrapped_api_id={wrapped_api_id}, parsed_updates={parsed}, version={wrapped_api.config_version}")
        
        return ChatConfigResponse(
            parsed_updates=parsed,
            response=response_msg,
            diff=diff,
            requires_confirmation=False,
            config_version=wrapped_api.config_version
        )
        
    except HTTPException:
        raise
    except ValidationError as ve:
        # Already handled above, but catch here for safety
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Validation failed",
                "details": ve.details
            }
        )
    except Exception as e:
        logger.error(f"Error processing config chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": f"Failed to process chat message: {str(e)}"
            }
        )


@router.get("/{wrapped_api_id}/chat/config", response_model=List[dict])
async def get_config_chat_messages(
    wrapped_api_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get config chat messages"""
    # Verify ownership
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    messages_result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.wrapped_api_id == wrapped_api_id,
            ChatMessage.user_id == current_user.id
        )
        .order_by(ChatMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()
    
    return [
        {
            "id": msg.id,
            "message": msg.message,
            "response": msg.response,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in messages
    ]


@router.get("/providers/{provider_id}/models", response_model=List[str])
async def list_provider_models(
    provider_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Return available models for a provider (fetched and cached)."""
    # Verify ownership
    prov_res = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id,
            LLMProvider.user_id == current_user.id
        )
    )
    provider = prov_res.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    try:
        return get_available_models(provider)
    except Exception as e:
        logger.error(f"Model list fetch error: {e}")
        # Empty list on failure; UI can prompt user to paste model id
        return []


@router.post("/{endpoint_id}/chat")
async def chat_with_wrapped_api(
    endpoint_id: str,
    chat_request: ChatMessageRequest,
    authorization: Optional[str] = Header(None),
    current_user: Optional[User] = Depends(lambda: None)  # Optional auth for internal testing
):
    """
    Main chat endpoint - OpenAI compatible
    For authenticated users: Can test their own wrapped API without API key
    For external users: Requires valid API key
    """
    from app.database import AsyncSessionLocal
    
    logger.info(f"Chat request: endpoint_id={endpoint_id}, has_authorization={bool(authorization)}, message_count={len(chat_request.messages) if chat_request.messages else (1 if chat_request.message else 0)}")
    
    try:
        async with AsyncSessionLocal() as db:
            # Try to get authenticated user (optional)
            authenticated_user = None
            try:
                # Get token from authorization header if present
                if authorization and authorization.startswith("Bearer "):
                    token = authorization[7:]
                    # Try to validate as JWT token (for authenticated users)
                    try:
                        payload = verify_token(token, token_type="access")
                        if payload and payload.get("sub"):
                            # Get user from token
                            user_result = await db.execute(
                                select(User).where(User.id == int(payload.get("sub")))
                            )
                            authenticated_user = user_result.scalar_one_or_none()
                    except:
                        pass  # Not a JWT token, might be API key
            except:
                pass  # Not authenticated
            # Find wrapped API by endpoint_id
            result = await db.execute(
                select(WrappedAPI)
                .where(WrappedAPI.endpoint_id == endpoint_id)
                .options(selectinload(WrappedAPI.prompt_config))
            )
            wrapped_api = result.scalar_one_or_none()
            
            if not wrapped_api:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Wrapped API not found"
                )
            
            if not wrapped_api.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Wrapped API is not active"
                )
            
            # Check authentication/authorization
            api_key_valid = False
            
            # If user is authenticated and owns the wrapped API, allow without API key
            if authenticated_user and authenticated_user.id == wrapped_api.user_id:
                api_key_valid = True
                logger.info(f"Authenticated user {authenticated_user.id} testing own wrapped API {wrapped_api.id}")
            
            # Otherwise, verify API key if provided
            if not api_key_valid and authorization:
                if authorization.startswith("Bearer "):
                    api_key = authorization[7:]
                    api_key_hash = hash_api_key(api_key)
                    key_result = await db.execute(
                        select(APIKey).where(
                            APIKey.wrapped_api_id == wrapped_api.id,
                            APIKey.api_key == api_key_hash,
                            APIKey.is_active == True
                        )
                    )
                    api_key_obj = key_result.scalar_one_or_none()
                    if api_key_obj:
                        api_key_valid = True
            
            # If still not valid, require API key
            if not api_key_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key required or authentication failed"
                )
            
            # Prepare messages - handle both 'message' and 'messages' formats
            if chat_request.message:
                # Single message format (for internal testing)
                messages = [{"role": "user", "content": chat_request.message}]
                request_message = chat_request.message
            elif chat_request.messages:
                # OpenAI-compatible format
                messages = chat_request.messages
                # Extract last user message for logging
                request_message = next((msg.get("content", "") for msg in reversed(messages) if msg.get("role") == "user"), "")
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Either 'message' or 'messages' must be provided"
                )
            
            # Call wrapped LLM
            response = await call_wrapped_llm(
                wrapped_api=wrapped_api,
                messages=messages,
                tools=chat_request.tools,
                db_session=db
            )
            
            # Extract response content and events (for UI status)
            response_content = response["choices"][0]["message"]["content"]
            response_events = response.get("wx_events", [])
            
            logger.info(f"Chat response generated: endpoint_id={endpoint_id}, wrapped_api_id={wrapped_api.id}, response_length={len(response_content)}, tokens_used={response.get('usage', {}).get('total_tokens', 0)}")
            
            # Log API call
            try:
                api_log = APILog(
                    wrapped_api_id=wrapped_api.id,
                    request_data={"messages": messages} if chat_request.messages else {"message": request_message},
                    response_data=response,
                    tokens_used=response.get("usage", {}).get("total_tokens", 0),
                    cost=0.0,  # TODO: Calculate actual cost
                    status_code=200,
                    is_success=True
                )
                db.add(api_log)
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to log API call: {e}")
            
            # Return response - if single message format, return simple format for internal testing
            # Otherwise return OpenAI-compatible format
            if chat_request.message:
                # Return simple format for internal testing
                logger.info(f"Chat request completed: endpoint_id={endpoint_id}, format=simple, user_id={authenticated_user.id if authenticated_user else 'external'}")
                return {
                    "id": int(datetime.now().timestamp()),
                    "message": request_message,
                    "response": response_content,
                    "created_at": datetime.now().isoformat(),
                    "events": response_events
                }
            else:
                # Return OpenAI-compatible format
                logger.info(f"Chat request completed: endpoint_id={endpoint_id}, format=openai_compatible, user_id={authenticated_user.id if authenticated_user else 'external'}")
                return response
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        
        # Create API error notification if we have wrapped_api context
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(WrappedAPI).where(WrappedAPI.endpoint_id == endpoint_id)
                )
                wrapped_api = result.scalar_one_or_none()
                if wrapped_api:
                    await create_notification(
                        db=db,
                        user_id=wrapped_api.user_id,
                        notification_type="api_error",
                        title=f"API Error in '{wrapped_api.name}'",
                        message=f"An error occurred while processing a request: {str(e)[:200]}",
                        wrapped_api_id=wrapped_api.id,
                        metadata={"error": str(e), "endpoint_id": endpoint_id}
                    )
        except Exception as notif_error:
            logger.error(f"Failed to create error notification: {notif_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.get("/api-keys/all", response_model=List[APIKeyListItem])
async def list_all_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List all API keys across all wrapped APIs for the current user"""
    logger.info(f"List all API keys: user={current_user.id}")
    
    # Get all wrapped APIs for the user
    wrapped_apis_result = await db.execute(
        select(WrappedAPI)
        .options(selectinload(WrappedAPI.project))
        .where(WrappedAPI.user_id == current_user.id)
    )
    wrapped_apis = wrapped_apis_result.scalars().all()
    
    if not wrapped_apis:
        return []
    
    wrapped_api_ids = [api.id for api in wrapped_apis]
    
    # Get all API keys for these wrapped APIs
    keys_result = await db.execute(
        select(APIKey)
        .where(APIKey.wrapped_api_id.in_(wrapped_api_ids))
        .order_by(APIKey.created_at.desc())
    )
    api_keys = keys_result.scalars().all()
    
    # Create a map of wrapped_api_id to wrapped_api info
    wrapped_api_map = {api.id: api for api in wrapped_apis}
    
    # Get last used date for each key (from APILog)
    keys_with_metadata = []
    for key in api_keys:
        wrapped_api = wrapped_api_map.get(key.wrapped_api_id)
        if not wrapped_api:
            continue
        
        # Find latest APILog for this wrapped API
        last_used_result = await db.execute(
            select(func.max(APILog.created_at))
            .where(APILog.wrapped_api_id == key.wrapped_api_id)
        )
        last_used = last_used_result.scalar()
        
        keys_with_metadata.append(APIKeyListItem(
            id=key.id,
            key_name=key.key_name,
            is_active=key.is_active,
            created_at=key.created_at,
            expires_at=key.expires_at,
            last_used=last_used,
            project_name=wrapped_api.project.name if wrapped_api.project else None,
            wrapped_api_id=wrapped_api.id,
            wrapped_api_name=wrapped_api.name
        ))
    
    return keys_with_metadata


@router.get("/{wrapped_api_id}/api-keys", response_model=APIKeyListResponse)
async def list_api_keys(
    wrapped_api_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List all API keys for a wrapped API (without plain keys)"""
    logger.info(f"List API keys: user={current_user.id}, wrapped_api_id={wrapped_api_id}")
    
    result = await db.execute(
        select(WrappedAPI)
        .options(selectinload(WrappedAPI.project))
        .where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    # Get all API keys for this wrapped API
    keys_result = await db.execute(
        select(APIKey).where(
            APIKey.wrapped_api_id == wrapped_api_id
        ).order_by(APIKey.created_at.desc())
    )
    api_keys = keys_result.scalars().all()
    
    # Get last used date for each key (from APILog)
    keys_with_metadata = []
    for key in api_keys:
        # Find latest APILog for this wrapped API (we can't track specific key usage yet, so use wrapped API)
        last_used_result = await db.execute(
            select(func.max(APILog.created_at))
            .where(APILog.wrapped_api_id == wrapped_api_id)
        )
        last_used = last_used_result.scalar()
        
        keys_with_metadata.append(APIKeyListItem(
            id=key.id,
            key_name=key.key_name,
            is_active=key.is_active,
            created_at=key.created_at,
            expires_at=key.expires_at,
            last_used=last_used,
            project_name=wrapped_api.project.name if wrapped_api.project else None
        ))
    
    return APIKeyListResponse(
        keys=keys_with_metadata,
        endpoint_id=wrapped_api.endpoint_id,
        endpoint_url=f"/api/wrapped-apis/{wrapped_api.endpoint_id}/chat"
    )


@router.post("/{wrapped_api_id}/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    wrapped_api_id: int,
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new API key for wrapped API"""
    logger.info(f"Create API key: user={current_user.id}, wrapped_api_id={wrapped_api_id}, key_name={key_data.key_name}")
    
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found"
        )
    
    # Generate new API key (313 characters as requested)
    # Format: wx_[random segments to reach exactly 313 chars]
    # Generate segments - each token_urlsafe(32) is ~43 chars
    # We need: 3 (wx_) + separators + random chars = 313 total
    # Strategy: Generate enough random content and trim to exactly 313
    base_segments = [
        secrets.token_urlsafe(45),  # ~60 chars
        secrets.token_urlsafe(45),  # ~60 chars
        secrets.token_urlsafe(45),  # ~60 chars
        secrets.token_urlsafe(45),  # ~60 chars
        secrets.token_urlsafe(45),  # ~60 chars
    ]
    api_key_plain = f"wx_{'_'.join(base_segments)}"
    
    # Ensure it's exactly 313 characters
    if len(api_key_plain) > 313:
        api_key_plain = api_key_plain[:313]
    elif len(api_key_plain) < 313:
        # Pad with more random characters
        remaining = 313 - len(api_key_plain)
        padding = secrets.token_urlsafe(remaining + 10)[:remaining]
        api_key_plain += padding
        # Trim if still too long
        if len(api_key_plain) > 313:
            api_key_plain = api_key_plain[:313]
    
    api_key_hash = hash_api_key(api_key_plain)
    
    api_key_obj = APIKey(
        wrapped_api_id=wrapped_api_id,
        api_key=api_key_hash,
        key_name=key_data.key_name,
        is_active=True
    )
    db.add(api_key_obj)
    await db.commit()
    await db.refresh(api_key_obj)
    
    # Create API key created notification
    await create_notification(
        db=db,
        user_id=current_user.id,
        notification_type="deployment_update",
        title=f"API Key '{key_data.key_name or 'Unnamed'}' created",
        message=f"A new API key has been created for your wrap '{wrapped_api.name}'. Make sure to copy it now as it won't be shown again.",
        wrapped_api_id=wrapped_api_id,
        metadata={"api_key_id": api_key_obj.id, "key_name": key_data.key_name, "wrap_name": wrapped_api.name}
    )
    
    logger.info(f"API Key created: wrapped_api_id={wrapped_api_id}, endpoint_id={wrapped_api.endpoint_id}, key_name={key_data.key_name}, key_prefix={api_key_plain[:10]}...")
    
    return APIKeyResponse(
        api_key=api_key_plain,  # Return plain key only once
        endpoint_id=wrapped_api.endpoint_id,
        endpoint_url=f"/api/wrapped-apis/{wrapped_api.endpoint_id}/chat",
        key_name=key_data.key_name
    )


@router.delete("/api-keys/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an API key"""
    logger.info(f"Delete API key: user={current_user.id}, api_key_id={api_key_id}")
    
    # Get API key and verify ownership
    result = await db.execute(
        select(APIKey)
        .join(WrappedAPI)
        .where(
            APIKey.id == api_key_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    await db.delete(api_key)
    await db.commit()
    
    logger.info(f"API key deleted: api_key_id={api_key_id}")
    return None


@router.patch("/{wrapped_api_id}/tools", response_model=WrappedAPIResponse)
async def update_tools(
    wrapped_api_id: int,
    tools_data: ToolsUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update tool toggles for a wrapped API"""
    result = await db.execute(
        select(WrappedAPI)
        .where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
        .options(selectinload(WrappedAPI.prompt_config))
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found or not owned by user"
        )
    
    # Update tool toggles
    wrapped_api.web_search_enabled = tools_data.web_search_enabled
    wrapped_api.thinking_enabled = tools_data.thinking_enabled
    wrapped_api.updated_at = datetime.now(timezone.utc)
    
    # Flush to ensure changes are sent to database
    await db.flush()
    
    # Commit the changes
    await db.commit()
    
    # Refresh to get the latest state from database
    await db.refresh(wrapped_api)
    
    # Double-check by querying directly from database to verify persistence
    verify_result = await db.execute(
        select(WrappedAPI.web_search_enabled, WrappedAPI.thinking_enabled)
        .where(WrappedAPI.id == wrapped_api_id)
    )
    verify_row = verify_result.first()
    if verify_row:
        logger.info(f"DB Verified - web_search={verify_row.web_search_enabled}, thinking={verify_row.thinking_enabled}")
        # Ensure we use the verified values from database
        wrapped_api.web_search_enabled = verify_row.web_search_enabled
        wrapped_api.thinking_enabled = verify_row.thinking_enabled
    
    # Get provider and project names for response
    provider_name = None
    if wrapped_api.provider_id:
        provider_result = await db.execute(
            select(LLMProvider).where(LLMProvider.id == wrapped_api.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if provider:
            provider_name = provider.provider_name
    
    project_name = None
    if wrapped_api.project_id:
        project_result = await db.execute(
            select(Project).where(Project.id == wrapped_api.project_id)
        )
        project = project_result.scalar_one_or_none()
        if project:
            project_name = project.name
    
    return WrappedAPIResponse(
        id=wrapped_api.id,
        user_id=wrapped_api.user_id,
        project_id=wrapped_api.project_id,
        provider_id=wrapped_api.provider_id,
        name=wrapped_api.name,
        endpoint_id=wrapped_api.endpoint_id,
        is_active=wrapped_api.is_active,
        thinking_mode=wrapped_api.thinking_mode,
        model=wrapped_api.model,
        temperature=wrapped_api.temperature,
        max_tokens=wrapped_api.max_tokens,
        top_p=wrapped_api.top_p,
        frequency_penalty=wrapped_api.frequency_penalty,
        web_search_enabled=wrapped_api.web_search_enabled,
        thinking_enabled=wrapped_api.thinking_enabled,
        created_at=wrapped_api.created_at,
        updated_at=wrapped_api.updated_at,
        prompt_config=PromptConfigResponse.model_validate(wrapped_api.prompt_config) if wrapped_api.prompt_config else None,
        provider_name=provider_name,
        project_name=project_name
    )

@router.post("/{wrapped_api_id}/documents", response_model=UploadedDocumentResponse)
async def upload_document(
    wrapped_api_id: int,
    document_data: UploadedDocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document for a wrapped API"""
    # Verify wrapped API exists and belongs to user
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found or not owned by user"
        )
    
    # Create document
    document = UploadedDocument(
        wrapped_api_id=wrapped_api_id,
        filename=document_data.filename,
        file_type=document_data.file_type,
        mime_type=document_data.mime_type,
        file_size=document_data.file_size,
        content=document_data.content
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    return UploadedDocumentResponse.model_validate(document)


@router.get("/{wrapped_api_id}/documents", response_model=List[UploadedDocumentResponse])
async def list_documents(
    wrapped_api_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List all uploaded documents for a wrapped API"""
    # Verify wrapped API exists and belongs to user
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found or not owned by user"
        )
    
    # Get documents
    documents_result = await db.execute(
        select(UploadedDocument)
        .where(UploadedDocument.wrapped_api_id == wrapped_api_id)
        .order_by(UploadedDocument.created_at.desc())
    )
    documents = documents_result.scalars().all()
    
    return [UploadedDocumentResponse.model_validate(doc) for doc in documents]


@router.delete("/{wrapped_api_id}/documents/{document_id}")
async def delete_document(
    wrapped_api_id: int,
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an uploaded document"""
    # Verify wrapped API exists and belongs to user
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == current_user.id
        )
    )
    wrapped_api = result.scalar_one_or_none()
    
    if not wrapped_api:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrapped API not found or not owned by user"
        )
    
    # Get document
    doc_result = await db.execute(
        select(UploadedDocument).where(
            UploadedDocument.id == document_id,
            UploadedDocument.wrapped_api_id == wrapped_api_id
        )
    )
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}
