import secrets
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet

from app.config import settings

PROVIDER_KEYWORDS: Dict[str, Sequence[str]] = {
    "google": ("google", "gmail", "sheets", "drive", "calendar", "gworkspace"),
    "shopify": ("shopify",),
    "hubspot": ("hubspot",),
    "slack": ("slack",),
    "notion": ("notion",),
    "airtable": ("airtable",),
}

PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "google": {
        "display_name": "Google Cloud Console",
        "console_url": "https://console.cloud.google.com/apis/credentials",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "default_scopes": [
            "https://www.googleapis.com/auth/userinfo.email",
        ],
        "instructions": [
            "Visit the Google Cloud Console and select (or create) a project.",
            "Navigate to APIs & Services → Credentials → Create Credentials → OAuth client ID.",
            "Choose 'Web application' and name the client (e.g., Wrap-X).",
            "Under Authorized redirect URIs add: {redirect_url}",
            "Click Save and copy the Client ID + Client Secret.",
            "Enable the required APIs (Gmail API, Drive API, etc.) and grant these scopes:\n{scopes}",
            "Return to Wrap-X, paste Client ID/Secret, and click Connect to authorize.",
        ],
    },
    "shopify": {
        "display_name": "Shopify Partners",
        "console_url": "https://partners.shopify.com",
        "auth_url": "https://{shop}.myshopify.com/admin/oauth/authorize",
        "token_url": "https://{shop}.myshopify.com/admin/oauth/access_token",
        "default_scopes": [
            "read_orders",
            "read_products",
        ],
        "instructions": [
            "Open Shopify Partners → Apps → Create app.",
            "Choose 'Custom app', pick the store, and click 'Create app'.",
            "In Configuration → OAuth, add redirect URL: {redirect_url}",
            "Grant the required scopes:\n{scopes}",
            "Install the app, then copy Client ID + Client Secret.",
            "Return to Wrap-X to complete the connection.",
        ],
    },
    "slack": {
        "display_name": "Slack API Console",
        "console_url": "https://api.slack.com/apps",
        "auth_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "default_scopes": [
            "users:read",
        ],
        "instructions": [
            "Go to Slack API → Your Apps → Create New App.",
            "In OAuth & Permissions, add Redirect URL: {redirect_url}",
            "Under Scopes, add the required Bot/User scopes:\n{scopes}",
            "Install the app to your workspace and copy Client ID/Secret from Basic Information.",
            "Return to Wrap-X and connect to authorize.",
        ],
    },
    "hubspot": {
        "display_name": "HubSpot Developer",
        "console_url": "https://developers.hubspot.com/",
        "auth_url": "https://app.hubspot.com/oauth/authorize",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "default_scopes": [
            "crm.objects.contacts.read",
        ],
        "instructions": [
            "Create a HubSpot app in your developer account.",
            "Add Redirect URL: {redirect_url}",
            "Select the required scopes:\n{scopes}",
            "Copy Client ID/Secret from app settings.",
            "Return to Wrap-X and connect to authorize.",
        ],
    },
    "notion": {
        "display_name": "Notion Integrations",
        "console_url": "https://www.notion.so/my-integrations",
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "token_url": "https://api.notion.com/v1/oauth/token",
        "default_scopes": [
            "read",
        ],
        "instructions": [
            "Create a new internal integration in Notion.",
            "Set Redirect URI to: {redirect_url}",
            "Select required capabilities/scopes:\n{scopes}",
            "Copy Client ID/Secret.",
            "Return to Wrap-X and connect to authorize.",
        ],
    },
    "airtable": {
        "display_name": "Airtable Developer Hub",
        "console_url": "https://airtable.com/create/tokens",
        "auth_url": "https://airtable.com/oauth2/v1/authorize",
        "token_url": "https://airtable.com/oauth2/v1/token",
        "default_scopes": [
            "data.records:read",
        ],
        "instructions": [
            "Create an OAuth integration in Airtable Developer Hub.",
            "Add Redirect URL: {redirect_url}",
            "Select required scopes:\n{scopes}",
            "Copy Client ID/Secret.",
            "Return to Wrap-X and connect to authorize.",
        ],
    },
}


def _get_cipher() -> Fernet:
    key = settings.encryption_key
    if not key:
        raise ValueError("ENCRYPTION_KEY must be set to use OAuth helpers")
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_secret(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cipher = _get_cipher()
    return cipher.encrypt(value.encode()).decode()


def decrypt_secret(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cipher = _get_cipher()
    return cipher.decrypt(value.encode()).decode()


def normalize_provider(provider: str) -> str:
    return provider.lower().strip()


def detect_provider_from_tool_name(tool_name: str) -> Optional[str]:
    if not tool_name:
        return None
    lower = tool_name.lower()
    for provider, keywords in PROVIDER_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            return provider
    return None


def aggregate_scopes(scopes_list: List[Sequence[str]]) -> List[str]:
    scopes: List[str] = []
    for scope_group in scopes_list:
        if not scope_group:
            continue
        for scope in scope_group:
            if scope and scope not in scopes:
                scopes.append(scope)
    return scopes


def generate_redirect_url(wrapped_api_id: int, provider: str) -> str:
    base = settings.backend_base_url.rstrip("/")
    return f"{base}/api/oauth/{provider}/callback?wrap_id={wrapped_api_id}"


def get_oauth_setup_instructions(
    provider: str,
    scopes: Optional[List[str]],
    redirect_url: str,
) -> Dict[str, Any]:
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    if not config:
        return {
            "provider": provider,
            "steps": [
                "Create an OAuth client in the provider console.",
                f"Use this redirect URL: {redirect_url}",
                f"Grant these scopes: {', '.join(scopes or []) or 'See provider docs.'}",
                "Paste the Client ID/Secret back into Wrap-X to connect.",
            ],
            "console_url": None,
            "display_name": provider.title(),
        }

    scope_block = "\n".join(f"• {scope}" for scope in (scopes or config["default_scopes"]))
    steps = [step.format(redirect_url=redirect_url, scopes=scope_block) for step in config["instructions"]]
    return {
        "provider": provider,
        "display_name": config["display_name"],
        "console_url": config["console_url"],
        "steps": steps,
    }


def get_provider_guide(provider: str, scopes: Optional[List[str]], redirect_url: str) -> Dict[str, Any]:
    """Return a normalized provider guide payload for frontend helper guide.

    Shape:
    {
      "provider": "google",
      "display_name": "Google Cloud Console",
      "console_url": "https://...",
      "redirect_url": "https://...",
      "scopes": [...],
      "steps": ["Go to...", ...]
    }
    """
    normalized = get_oauth_setup_instructions(provider, scopes, redirect_url)
    return {
        "provider": normalized.get("provider"),
        "display_name": normalized.get("display_name"),
        "console_url": normalized.get("console_url"),
        "redirect_url": redirect_url,
        "scopes": scopes or get_default_scopes(provider),
        "steps": normalized.get("steps", []),
    }


def get_default_scopes(provider: str) -> List[str]:
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    if not config:
        return []
    return list(config.get("default_scopes", []))


def validate_and_aggregate_scopes(
    provider: str,
    service_names: List[str],
    user_scopes: Optional[List[str]] = None,
    access_level: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validate and aggregate OAuth scopes for multiple services from the same provider
    
    Args:
        provider: OAuth provider (e.g., "google", "shopify")
        service_names: List of service names (e.g., ["Gmail", "Google Sheets"])
        user_scopes: Optional list of scopes provided by user
        access_level: Optional access level ("read-only" or "full")
    
    Returns:
        Dictionary with validated scopes and descriptions
    """
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    
    # Start with default scopes for provider
    validated_scopes = set(get_default_scopes(provider))
    
    # Add user-provided scopes if valid
    if user_scopes:
        for scope in user_scopes:
            if scope and isinstance(scope, str) and len(scope.strip()) > 0:
                validated_scopes.add(scope.strip())
    
    # Provider-specific scope mapping based on service names and access level
    scope_mappings = {
        "google": {
            "gmail": {
                "read-only": ["https://www.googleapis.com/auth/gmail.readonly"],
                "full": ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"]
            },
            "sheets": {
                "read-only": ["https://www.googleapis.com/auth/spreadsheets.readonly"],
                "full": ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
            },
            "drive": {
                "read-only": ["https://www.googleapis.com/auth/drive.readonly"],
                "full": ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"]
            },
            "calendar": {
                "read-only": ["https://www.googleapis.com/auth/calendar.readonly"],
                "full": ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
            }
        },
        "shopify": {
            "orders": {
                "read-only": ["read_orders"],
                "full": ["read_orders", "write_orders"]
            },
            "products": {
                "read-only": ["read_products"],
                "full": ["read_products", "write_products"]
            },
            "inventory": {
                "read-only": ["read_inventory"],
                "full": ["read_inventory", "write_inventory"]
            }
        }
    }
    
    # Map service names to scopes
    if provider in scope_mappings:
        for service_name in service_names:
            service_lower = service_name.lower().replace(" ", "").replace("google", "").replace("sheet", "sheets")
            for service_key, scope_map in scope_mappings[provider].items():
                if service_key in service_lower:
                    level = (access_level or "read-only").lower()
                    if level in scope_map:
                        validated_scopes.update(scope_map[level])
                    elif "read-only" in scope_map:
                        validated_scopes.update(scope_map["read-only"])
    
    # Build scope descriptions
    scope_descriptions = {}
    for scope in validated_scopes:
        if "gmail" in scope.lower():
            scope_descriptions[scope] = "Access Gmail messages and threads"
        elif "sheets" in scope.lower() or "spreadsheet" in scope.lower():
            scope_descriptions[scope] = "Access Google Sheets data"
        elif "drive" in scope.lower():
            scope_descriptions[scope] = "Access Google Drive files"
        elif "calendar" in scope.lower():
            scope_descriptions[scope] = "Access Google Calendar events"
        elif "orders" in scope.lower():
            scope_descriptions[scope] = "Access Shopify orders"
        elif "products" in scope.lower():
            scope_descriptions[scope] = "Access Shopify products"
        else:
            scope_descriptions[scope] = f"Access {provider.title()} resources"
    
    return {
        "provider": provider,
        "aggregated_scopes": sorted(list(validated_scopes)),
        "scope_descriptions": scope_descriptions,
        "services": service_names
    }


def build_authorization_url(
    provider: str,
    client_id: str,
    redirect_url: str,
    scopes: Sequence[str],
    state: str,
    extra: Optional[Dict[str, Any]] = None,
) -> str:
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    if not config:
        raise ValueError(f"Unsupported provider '{provider}' for OAuth authorization URL")

    scope_str = " ".join(scopes or config["default_scopes"])
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_url,
        "response_type": "code",
        "scope": scope_str,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    if extra:
        params.update(extra)
    auth_url = config["auth_url"]
    return f"{auth_url}?{urlencode(params)}"


async def exchange_code_for_tokens(
    provider: str,
    client_id: str,
    client_secret: str,
    code: str,
    redirect_url: str,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    if not config or "token_url" not in config:
        raise ValueError(f"Token exchange not configured for provider '{provider}'")

    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_url,
        "grant_type": "authorization_code",
    }
    if extra:
        data.update(extra)

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(config["token_url"], data=data)
        response.raise_for_status()
        return response.json()


async def refresh_access_token(
    provider: str,
    client_id: str,
    client_secret: str,
    refresh_token: str,
    redirect_url: Optional[str] = None,
) -> Dict[str, Any]:
    provider = normalize_provider(provider)
    config = PROVIDER_CONFIG.get(provider)
    if not config or "token_url" not in config:
        raise ValueError(f"Token refresh not configured for provider '{provider}'")

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    if redirect_url:
        data["redirect_uri"] = redirect_url

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(config["token_url"], data=data)
        response.raise_for_status()
        return response.json()


def generate_state_token() -> str:
    return secrets.token_urlsafe(32)
