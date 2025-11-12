from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.llm_provider import LLMProvider
from app.models.project import Project
from app.models.wrapped_api import WrappedAPI
from app.models.api_log import APILog
from app.schemas.llm_provider import (
    LLMProviderCreate,
    LLMProviderResponse,
    SupportedProvider
)
from app.auth.dependencies import get_current_active_user
from app.services.notification_service import create_notification
import litellm
import logging
from cryptography.fernet import Fernet
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm-providers", tags=["llm_providers"])

# For encryption - validated at startup in main.py
_encryption_key = getattr(settings, 'encryption_key', None)
if not _encryption_key:
    _encryption_key = Fernet.generate_key().decode()
    logger.warning("ENCRYPTION_KEY not set - using generated key (NOT SECURE for production!)")
    logger.warning("This key will change on restart, causing data loss. Set ENCRYPTION_KEY in .env")

try:
    if isinstance(_encryption_key, str):
        cipher_suite = Fernet(_encryption_key.encode())
    else:
        cipher_suite = Fernet(_encryption_key)
except Exception as e:
    logger.error(f"Failed to initialize encryption: {e}")
    _encryption_key = Fernet.generate_key()
    cipher_suite = Fernet(_encryption_key)


def encrypt_api_key(api_key: str) -> str:
    """Encrypt API key before storing"""
    return cipher_suite.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt API key for use"""
    return cipher_suite.decrypt(encrypted_key.encode()).decode()


async def test_api_key_with_litellm(provider_name: str, api_key: str, api_base_url: Optional[str] = None) -> tuple[bool, str]:
    """Test API key using LiteLLM"""
    try:
        test_message = "test"
        
        simple_models = {
            "openai": "gpt-3.5-turbo",
            "anthropic": "claude-3-haiku-20240307",
            "deepseek": "deepseek-chat",
            "groq": "llama-3.1-8b-instant",
            "gemini": "gemini-pro",
            "mistral": "mistral-tiny",
            "cohere": "command",
            "together_ai": "meta-llama/Llama-2-7b-chat-hf",
            "perplexity": "llama-3.1-sonar-small-128k-online",
            "anyscale": "meta-llama/Llama-2-7b-chat-hf",
            "azure": "gpt-3.5-turbo",
            "openrouter": "openai/gpt-3.5-turbo",
            "custom": "gpt-3.5-turbo"  # For custom providers
        }
        
        model_name = simple_models.get(provider_name, "gpt-3.5-turbo")
        
        if provider_name in ["azure", "openrouter"]:
            model_str = model_name
        elif provider_name == "custom":
            # For custom, use the base URL directly
            model_str = "gpt-3.5-turbo"  # Generic model, API base will override
        else:
            model_str = f"{provider_name}/{model_name}"
        
        response = await litellm.acompletion(
            model=model_str,
            messages=[{"role": "user", "content": test_message}],
            api_key=api_key,
            api_base=api_base_url if (api_base_url and provider_name == "custom") else None,
            timeout=15.0,
            max_tokens=5
        )
        
        return True, "API key is valid and working"
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "unauthorized" in error_msg.lower() or "invalid" in error_msg.lower():
            return False, "Invalid API key. Please check your key and try again."
        elif "rate limit" in error_msg.lower():
            return True, "API key is valid but rate limited"
        else:
            return False, f"API key test failed: {error_msg[:100]}"


@router.get("/supported", response_model=List[SupportedProvider])
async def get_supported_providers():
    """Get list of all supported LLM providers"""
    popular_providers = [
        {"name": "OpenAI", "provider_id": "openai", "description": "GPT-4, GPT-3.5, etc."},
        {"name": "Anthropic (Claude)", "provider_id": "anthropic", "description": "Claude models"},
        {"name": "DeepSeek", "provider_id": "deepseek", "description": "DeepSeek AI models"},
        {"name": "Google (Gemini)", "provider_id": "gemini", "description": "Google Gemini models"},
        {"name": "Groq", "provider_id": "groq", "description": "Fast inference with Groq"},
        {"name": "Mistral AI", "provider_id": "mistral", "description": "Mistral models"},
        {"name": "Cohere", "provider_id": "cohere", "description": "Cohere models"},
        {"name": "Together AI", "provider_id": "together_ai", "description": "Together AI models"},
        {"name": "Perplexity", "provider_id": "perplexity", "description": "Perplexity models"},
        {"name": "Anyscale", "provider_id": "anyscale", "description": "Anyscale models"},
        {"name": "Azure OpenAI", "provider_id": "azure", "description": "Azure-hosted OpenAI"},
        {"name": "OpenRouter", "provider_id": "openrouter", "description": "OpenRouter API"},
        {"name": "Custom", "provider_id": "custom", "description": "Custom LLM provider with your own API endpoint"},
    ]
    
    return [SupportedProvider(**p) for p in popular_providers]


@router.post("/", response_model=LLMProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_provider(
    provider_data: LLMProviderCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new LLM provider configuration (tests API key automatically)"""
    try:
        # Verify project belongs to user
        project_result = await db.execute(
            select(Project).where(
                Project.id == provider_data.project_id,
                Project.user_id == current_user.id
            )
        )
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or not owned by user"
            )
        
        # Test API key before saving
        is_valid, message = await test_api_key_with_litellm(
            provider_data.provider_name,
            provider_data.api_key,
            provider_data.api_base_url
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot save provider: {message}"
            )
        
        # Check if provider with same name already exists for this project
        existing_result = await db.execute(
            select(LLMProvider).where(
                LLMProvider.project_id == provider_data.project_id,
                LLMProvider.name == provider_data.name
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A provider with this name already exists in this project. Please use a different name."
            )
        
        # Encrypt the API key before storing
        encrypted_key = encrypt_api_key(provider_data.api_key)
        
        # Create new provider
        new_provider = LLMProvider(
            user_id=current_user.id,
            project_id=provider_data.project_id,
            name=provider_data.name,
            provider_name=provider_data.provider_name,
            api_key=encrypted_key,
            api_base_url=provider_data.api_base_url
        )
        
        db.add(new_provider)
        await db.commit()
        await db.refresh(new_provider)
        
        # Create LLM provider added notification
        await create_notification(
            db=db,
            user_id=current_user.id,
            notification_type="deployment_update",
            title=f"LLM Provider '{new_provider.name}' added successfully",
            message=f"Your {new_provider.provider_name} provider '{new_provider.name}' has been added and is ready to use. You can now create wraps with this provider.",
            metadata={"provider_id": new_provider.id, "provider_name": new_provider.name, "provider_type": new_provider.provider_name}
        )
        
        return LLMProviderResponse(
            id=new_provider.id,
            name=new_provider.name,
            project_id=new_provider.project_id,
            provider_name=new_provider.provider_name,
            api_base_url=new_provider.api_base_url,
            calls_count=0,
            tokens_count=0,
            last_used=None,
            created_at=new_provider.created_at,
            updated_at=new_provider.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating LLM provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create LLM provider"
        )


@router.get("/", response_model=List[LLMProviderResponse])
async def list_llm_providers(
    project_id: Optional[int] = Query(None, description="Optional project ID to filter by. If not provided, returns all providers for the user"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all LLM providers for the current user, optionally filtered by project"""
    try:
        # If project_id provided, verify it belongs to user and filter by it
        if project_id is not None:
            project_result = await db.execute(
                select(Project).where(
                    Project.id == project_id,
                    Project.user_id == current_user.id
                )
            )
            project = project_result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or not owned by user"
                )
            
            # Get providers for specific project
            providers_result = await db.execute(
                select(LLMProvider)
                .where(LLMProvider.project_id == project_id)
                .options(selectinload(LLMProvider.project))
                .order_by(LLMProvider.created_at.desc())
            )
        else:
            # Get ALL providers for the user across all projects
            providers_result = await db.execute(
                select(LLMProvider)
                .where(LLMProvider.user_id == current_user.id)
                .options(selectinload(LLMProvider.project))
                .order_by(LLMProvider.created_at.desc())
            )
        
        providers = providers_result.scalars().all()
        
        # Calculate stats for each provider
        provider_list = []
        for provider in providers:
            # Get wrapped APIs using this provider
            wrapped_apis_result = await db.execute(
                select(WrappedAPI.id).where(WrappedAPI.provider_id == provider.id)
            )
            wrapped_api_ids = [row[0] for row in wrapped_apis_result.all()]
            
            # Calculate calls, tokens, and last_used from api_logs
            calls_count = 0
            tokens_count = 0
            last_used = None
            
            if wrapped_api_ids:
                calls_result = await db.execute(
                    select(func.count(APILog.id))
                    .where(APILog.wrapped_api_id.in_(wrapped_api_ids))
                )
                calls_count = calls_result.scalar() or 0
                
                tokens_result = await db.execute(
                    select(func.coalesce(func.sum(APILog.tokens_used), 0))
                    .where(APILog.wrapped_api_id.in_(wrapped_api_ids))
                )
                tokens_count = int(tokens_result.scalar() or 0)
                
                last_used_result = await db.execute(
                    select(func.max(APILog.created_at))
                    .where(APILog.wrapped_api_id.in_(wrapped_api_ids))
                )
                last_used = last_used_result.scalar()
            
            provider_list.append(LLMProviderResponse(
                id=provider.id,
                name=provider.name,
                project_id=provider.project_id,
                provider_name=provider.provider_name,
                api_base_url=provider.api_base_url,
                calls_count=calls_count,
                tokens_count=tokens_count,
                last_used=last_used,
                created_at=provider.created_at,
                updated_at=provider.updated_at,
                projectName=provider.project.name if hasattr(provider, 'project') and provider.project else None
            ))
        
        return provider_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing LLM providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list LLM providers"
        )


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_provider(
    provider_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an LLM provider"""
    try:
        provider_result = await db.execute(
            select(LLMProvider).where(
                LLMProvider.id == provider_id,
                LLMProvider.user_id == current_user.id
            )
        )
        provider = provider_result.scalar_one_or_none()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LLM provider not found"
            )
        
        # Check if provider is being used by any wrapped APIs
        wrapped_apis_result = await db.execute(
            select(WrappedAPI).where(WrappedAPI.provider_id == provider_id)
        )
        wrapped_apis = wrapped_apis_result.scalars().all()
        
        if wrapped_apis:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete provider: It is being used by {len(wrapped_apis)} wrapped API(s). Please remove those first."
            )
        
        await db.delete(provider)
        await db.commit()
        
        return {"message": "LLM provider deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting LLM provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete LLM provider"
        )

