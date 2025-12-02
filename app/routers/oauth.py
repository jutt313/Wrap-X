from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.database import get_db
from app.models.oauth_app import OAuthApp
from app.models.wrapped_api import WrappedAPI
from app.models.user import User
from app.services.oauth_helper import (
    build_authorization_url,
    encrypt_secret,
    decrypt_secret,
    exchange_code_for_tokens,
    generate_redirect_url,
    generate_state_token,
    get_oauth_setup_instructions,
    normalize_provider,
    refresh_access_token,
)

from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/oauth", tags=["oauth"])


class OAuthAuthorizeRequest(BaseModel):
    wrapped_api_id: int
    client_id: str
    client_secret: str
    scopes: Optional[List[str]] = Field(default=None, description="List of OAuth scopes to request")
    extra_params: Optional[dict] = None


class OAuthRefreshRequest(BaseModel):
    wrapped_api_id: int


async def _get_wrapped_api(
    wrapped_api_id: int,
    user: User,
    db: AsyncSession,
) -> WrappedAPI:
    result = await db.execute(
        select(WrappedAPI).where(
            WrappedAPI.id == wrapped_api_id,
            WrappedAPI.user_id == user.id,
        )
    )
    wrapped_api = result.scalar_one_or_none()
    if not wrapped_api:
        raise HTTPException(status_code=404, detail="Wrapped API not found")
    return wrapped_api


async def _get_or_create_oauth_app(
    provider: str,
    wrapped_api: WrappedAPI,
    db: AsyncSession,
) -> OAuthApp:
    provider = normalize_provider(provider)
    result = await db.execute(
        select(OAuthApp).where(
            OAuthApp.provider == provider,
            OAuthApp.wrapped_api_id == wrapped_api.id,
        )
    )
    oauth_app = result.scalar_one_or_none()
    if oauth_app:
        return oauth_app

    oauth_app = OAuthApp(
        provider=provider,
        wrapped_api_id=wrapped_api.id,
        redirect_url=generate_redirect_url(wrapped_api.id, provider),
        scopes=[],
    )
    db.add(oauth_app)
    await db.commit()
    await db.refresh(oauth_app)
    return oauth_app


@router.get("/{provider}/setup")
async def get_oauth_setup(
    provider: str,
    wrapped_api_id: int = Query(..., description="ID of the wrapped API"),
    scopes: Optional[str] = Query(None, description="Comma-separated scopes"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    wrapped_api = await _get_wrapped_api(wrapped_api_id, current_user, db)
    oauth_app = await _get_or_create_oauth_app(provider, wrapped_api, db)

    scope_list = scopes.split(",") if scopes else []
    scope_list = [scope.strip() for scope in scope_list if scope.strip()]

    if scope_list:
        merged = set(oauth_app.scopes or [])
        merged.update(scope_list)
        oauth_app.scopes = sorted(merged)
        await db.commit()
        await db.refresh(oauth_app)

    instructions = get_oauth_setup_instructions(
        provider=provider,
        scopes=oauth_app.scopes,
        redirect_url=oauth_app.redirect_url,
    )
    return {
        "provider": normalize_provider(provider),
        "redirect_url": oauth_app.redirect_url,
        "scopes": oauth_app.scopes,
        "instructions": instructions,
    }


@router.post("/{provider}/authorize")
async def authorize_oauth_app(
    provider: str,
    payload: OAuthAuthorizeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    wrapped_api = await _get_wrapped_api(payload.wrapped_api_id, current_user, db)
    oauth_app = await _get_or_create_oauth_app(provider, wrapped_api, db)

    state_token = generate_state_token()
    oauth_app.client_id = payload.client_id
    oauth_app.client_secret_encrypted = encrypt_secret(payload.client_secret)
    oauth_app.scopes = payload.scopes or oauth_app.scopes
    oauth_app.state_token = state_token
    oauth_app.redirect_url = oauth_app.redirect_url or generate_redirect_url(wrapped_api.id, provider)
    oauth_app.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(oauth_app)

    auth_url = build_authorization_url(
        provider=provider,
        client_id=payload.client_id,
        redirect_url=oauth_app.redirect_url,
        scopes=oauth_app.scopes or [],
        state=state_token,
        extra=payload.extra_params,
    )

    return {
        "authorization_url": auth_url,
        "state": state_token,
        "redirect_url": oauth_app.redirect_url,
        "scopes": oauth_app.scopes,
    }


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    wrap_id: int,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    provider = normalize_provider(provider)
    result = await db.execute(
        select(OAuthApp).where(
            OAuthApp.provider == provider,
            OAuthApp.wrapped_api_id == wrap_id,
        )
    )
    oauth_app = result.scalar_one_or_none()
    if not oauth_app:
        raise HTTPException(status_code=404, detail="OAuth app not found")

    if not oauth_app.state_token or oauth_app.state_token != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    client_secret = decrypt_secret(oauth_app.client_secret_encrypted)
    if not oauth_app.client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Client credentials are missing")

    token_response = await exchange_code_for_tokens(
        provider=provider,
        client_id=oauth_app.client_id,
        client_secret=client_secret,
        code=code,
        redirect_url=oauth_app.redirect_url,
    )

    access_token = token_response.get("access_token")
    refresh_token = token_response.get("refresh_token")
    expires_in = token_response.get("expires_in")
    if not refresh_token:
        # Some providers only return refresh_token on the first consent
        refresh_token = oauth_app.refresh_token_encrypted and decrypt_secret(oauth_app.refresh_token_encrypted)

    oauth_app.access_token_encrypted = encrypt_secret(access_token) if access_token else None
    oauth_app.refresh_token_encrypted = encrypt_secret(refresh_token) if refresh_token else None
    oauth_app.token_expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
        if expires_in
        else None
    )
    oauth_app.state_token = None

    await db.commit()
    html = """
    <html>
      <head>
        <title>OAuth Connected</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; text-align: center;">
        <h2>OAuth connection successful!</h2>
        <p>You can close this window and return to Wrap-X.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.post("/{provider}/refresh")
async def refresh_oauth_tokens(
    provider: str,
    payload: OAuthRefreshRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    wrapped_api = await _get_wrapped_api(payload.wrapped_api_id, current_user, db)
    result = await db.execute(
        select(OAuthApp).where(
            OAuthApp.provider == normalize_provider(provider),
            OAuthApp.wrapped_api_id == wrapped_api.id,
        )
    )
    oauth_app = result.scalar_one_or_none()
    if not oauth_app or not oauth_app.refresh_token_encrypted:
        raise HTTPException(status_code=404, detail="No refresh token found for this provider")

    client_secret = decrypt_secret(oauth_app.client_secret_encrypted)
    refresh_token = decrypt_secret(oauth_app.refresh_token_encrypted)
    token_response = await refresh_access_token(
        provider,
        oauth_app.client_id,
        client_secret,
        refresh_token,
        redirect_url=oauth_app.redirect_url,
    )

    access_token = token_response.get("access_token")
    expires_in = token_response.get("expires_in")

    oauth_app.access_token_encrypted = encrypt_secret(access_token) if access_token else oauth_app.access_token_encrypted
    if "refresh_token" in token_response and token_response["refresh_token"]:
        oauth_app.refresh_token_encrypted = encrypt_secret(token_response["refresh_token"])
    if expires_in:
        oauth_app.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
    oauth_app.updated_at = datetime.now(timezone.utc)

    await db.commit()
    return {"success": True, "expires_at": oauth_app.token_expires_at}


