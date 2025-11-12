"""
Rate limiting middleware for config chat endpoint.
Provides per-user and per-wrap rate limiting with in-memory cache.
"""
import time
from typing import Dict, Tuple, Optional
from fastapi import HTTPException, status, Request
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)

# In-memory rate limit cache: {key: (count, reset_at)}
_rate_limit_cache: Dict[str, Tuple[int, float]] = {}


def _get_user_key(user_id: int) -> str:
    """Generate cache key for user rate limit"""
    return f"user:{user_id}:config_chat"


def _get_wrap_key(wrapped_api_id: int) -> str:
    """Generate cache key for wrap rate limit"""
    return f"wrap:{wrapped_api_id}:config_chat"


def check_rate_limit(
    user_id: int,
    wrapped_api_id: int,
    user_limit: int = 10,
    wrap_limit: int = 5,
    window_seconds: int = 60
) -> Tuple[bool, Optional[int]]:
    """
    Check if request is within rate limits.
    
    Args:
        user_id: User ID
        wrapped_api_id: Wrapped API ID
        user_limit: Maximum requests per window for user (default: 10)
        wrap_limit: Maximum requests per window for wrap (default: 5)
        window_seconds: Time window in seconds (default: 60)
        
    Returns:
        Tuple of (allowed, retry_after_seconds)
        - allowed: True if request is allowed, False if rate limited
        - retry_after_seconds: Seconds until retry is allowed (None if allowed)
    """
    now = time.time()
    
    # Check user rate limit
    user_key = _get_user_key(user_id)
    if user_key in _rate_limit_cache:
        count, reset_at = _rate_limit_cache[user_key]
        if now < reset_at:
            if count >= user_limit:
                retry_after = int(reset_at - now) + 1
                logger.warning(f"User {user_id} rate limit exceeded: {count}/{user_limit} in window")
                return False, retry_after
            _rate_limit_cache[user_key] = (count + 1, reset_at)
        else:
            # Window expired, reset
            _rate_limit_cache[user_key] = (1, now + window_seconds)
    else:
        _rate_limit_cache[user_key] = (1, now + window_seconds)
    
    # Check wrap rate limit
    wrap_key = _get_wrap_key(wrapped_api_id)
    if wrap_key in _rate_limit_cache:
        count, reset_at = _rate_limit_cache[wrap_key]
        if now < reset_at:
            if count >= wrap_limit:
                retry_after = int(reset_at - now) + 1
                logger.warning(f"Wrap {wrapped_api_id} rate limit exceeded: {count}/{wrap_limit} in window")
                return False, retry_after
            _rate_limit_cache[wrap_key] = (count + 1, reset_at)
        else:
            # Window expired, reset
            _rate_limit_cache[wrap_key] = (1, now + window_seconds)
    else:
        _rate_limit_cache[wrap_key] = (1, now + window_seconds)
    
    # Clean up expired entries periodically (every 1000 checks)
    if len(_rate_limit_cache) > 1000:
        _cleanup_expired_entries(now)
    
    return True, None


def _cleanup_expired_entries(now: float):
    """Remove expired entries from cache"""
    expired_keys = [
        key for key, (_, reset_at) in _rate_limit_cache.items()
        if now >= reset_at
    ]
    for key in expired_keys:
        del _rate_limit_cache[key]


async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware for config chat endpoint.
    Only applies to POST /api/wrapped-apis/{id}/chat/config
    """
    # Only apply to config chat endpoint
    if request.method == "POST" and "/chat/config" in str(request.url.path):
        # Extract user_id and wrapped_api_id from path/query
        # Note: This is a simplified check - in production, extract from authenticated user
        # For now, we'll check in the endpoint itself after authentication
        
        # Let the request proceed - rate limiting will be checked in the endpoint
        # after we have the authenticated user
        pass
    
    response = await call_next(request)
    return response


def get_rate_limit_decorator(user_limit: int = 10, wrap_limit: int = 5):
    """
    Create a rate limiting decorator for use in endpoints.
    
    Usage:
        @rate_limit(user_limit=10, wrap_limit=5)
        async def endpoint(...):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user_id and wrapped_api_id from function arguments
            # This assumes the endpoint has current_user and wrapped_api_id parameters
            user_id = None
            wrapped_api_id = None
            
            # Try to find user_id from kwargs (current_user)
            if 'current_user' in kwargs:
                user_id = kwargs['current_user'].id
            elif 'wrapped_api_id' in kwargs:
                wrapped_api_id = kwargs['wrapped_api_id']
            
            # If we have both, check rate limit
            if user_id and wrapped_api_id:
                allowed, retry_after = check_rate_limit(user_id, wrapped_api_id, user_limit, wrap_limit)
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                        headers={"Retry-After": str(retry_after)}
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

