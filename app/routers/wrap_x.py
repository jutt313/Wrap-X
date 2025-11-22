"""
Router for simplified Wrap-X chat endpoint
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.wrapped_api import WrappedAPI
from app.models.api_key import APIKey
from app.models.api_log import APILog
from app.schemas.wrapped_api import ChatMessageRequest
from app.auth.utils import verify_token
from app.services.chat_service import call_wrapped_llm
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wrap-x", tags=["wrap_x"])


def hash_api_key(api_key: str) -> str:
    """Hash API key for storage"""
    import hashlib
    return hashlib.sha256(api_key.encode()).hexdigest()


@router.post("/chat")
async def chat_with_wrap_x(
    chat_request: ChatMessageRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Simplified chat endpoint - /api/wrap-x/chat
    Looks up wrapped API from API key (no endpoint_id needed)
    For authenticated users: Can test their own wrapped API without API key (requires endpoint_id in request)
    For external users: Requires valid API key
    """
    logger.info(f"Wrap-X chat request: has_authorization={bool(authorization)}, message_count={len(chat_request.messages) if chat_request.messages else (1 if chat_request.message else 0)}")
    
    try:
        async with AsyncSessionLocal() as db:
            # Try to get authenticated user (optional)
            authenticated_user = None
            wrapped_api = None
            
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
            
            # If authenticated user, check if endpoint_id is provided in request for testing
            if authenticated_user and chat_request.endpoint_id:
                # Find wrapped API by endpoint_id for authenticated users testing
                result = await db.execute(
                    select(WrappedAPI)
                    .where(
                        WrappedAPI.endpoint_id == chat_request.endpoint_id,
                        WrappedAPI.user_id == authenticated_user.id
                    )
                    .options(selectinload(WrappedAPI.prompt_config))
                )
                wrapped_api = result.scalar_one_or_none()
                if wrapped_api:
                    logger.info(f"Authenticated user {authenticated_user.id} testing own wrapped API {wrapped_api.id}")
            
            # If not found yet, look up by API key
            if not wrapped_api and authorization and authorization.startswith("Bearer "):
                api_key = authorization[7:]
                api_key_hash = hash_api_key(api_key)
                
                # Find API key and get wrapped API
                key_result = await db.execute(
                    select(APIKey)
                    .join(WrappedAPI)
                    .where(
                        APIKey.api_key == api_key_hash,
                        APIKey.is_active == True
                    )
                    .options(selectinload(APIKey.wrapped_api).selectinload(WrappedAPI.prompt_config))
                )
                api_key_obj = key_result.scalar_one_or_none()
                
                if api_key_obj and api_key_obj.wrapped_api:
                    wrapped_api = api_key_obj.wrapped_api
                    logger.info(f"Found wrapped API {wrapped_api.id} from API key")
            
            # If still not found, require API key
            if not wrapped_api:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key required or invalid"
                )
            
            if not wrapped_api.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Wrapped API is not active"
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
            
            logger.info(f"Wrap-X chat response generated: wrapped_api_id={wrapped_api.id}, response_length={len(response_content)}, tokens_used={response.get('usage', {}).get('total_tokens', 0)}")
            
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
                logger.info(f"Wrap-X chat request completed: format=simple, user_id={authenticated_user.id if authenticated_user else 'external'}")
                return {
                    "id": int(datetime.now().timestamp()),
                    "message": request_message,
                    "response": response_content,
                    "created_at": datetime.now().isoformat(),
                    "events": response_events
                }
            else:
                # Return OpenAI-compatible format
                logger.info(f"Wrap-X chat request completed: format=openai_compatible, user_id={authenticated_user.id if authenticated_user else 'external'}")
                return response
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Wrap-X chat endpoint: {e}", exc_info=True)
        
        # Create API error notification if we have wrapped_api context
        try:
            async with AsyncSessionLocal() as db:
                if wrapped_api:
                    await create_notification(
                        db=db,
                        user_id=wrapped_api.user_id,
                        notification_type="api_error",
                        title=f"API Error in '{wrapped_api.name}'",
                        message=f"An error occurred while processing a request: {str(e)[:200]}",
                        wrapped_api_id=wrapped_api.id,
                        metadata={"error": str(e)}
                    )
        except Exception as notif_error:
            logger.error(f"Failed to create error notification: {notif_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )

