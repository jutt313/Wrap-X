import time
import json
import urllib.request
from urllib.error import URLError, HTTPError
from typing import List, Optional, Tuple
from app.models.llm_provider import LLMProvider

# Simple in-memory cache: {provider_id: (expires_at_epoch, [models])}
_CACHE: dict[int, Tuple[float, List[str]]] = {}


def _default_base_url(provider_name: str) -> Optional[str]:
    name = (provider_name or "").lower()
    if name == "openai":
        return "https://api.openai.com/v1"
    if name == "anthropic":
        return "https://api.anthropic.com/v1"
    if name == "deepseek":
        return "https://api.deepseek.com/v1"
    if name == "groq":
        return "https://api.groq.com/openai/v1"
    if name == "perplexity":
        return "https://api.perplexity.ai"
    if name == "together_ai" or name == "together":
        return "https://api.together.xyz/v1"
    if name == "openrouter":
        return "https://openrouter.ai/api/v1"
    if name == "mistral":
        return "https://api.mistral.ai/v1"
    if name == "cohere":
        # Cohere model listing differs; allow fallback
        return "https://api.cohere.ai/v1"
    return None


def _auth_header(provider: LLMProvider) -> dict:
    name = (provider.provider_name or "").lower()
    # Many providers are OpenAI-compatible (use Bearer key)
    if name in {
        "openai", "deepseek", "groq", "perplexity", "together_ai", "together",
        "openrouter", "mistral"
    }:
        return {"Authorization": f"Bearer {provider.api_key}"}
    if name == "anthropic":
        return {"x-api-key": provider.api_key}
    if name == "cohere":
        return {"Authorization": f"Bearer {provider.api_key}"}
    # Default to Bearer
    return {"Authorization": f"Bearer {provider.api_key}"}


def _fetch_models_http(url: str, headers: dict) -> List[str]:
    req = urllib.request.Request(url=url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    # Try common OpenAI-compatible shape
    models = []
    if isinstance(data, dict):
        if isinstance(data.get("data"), list):
            for item in data["data"]:
                mid = item.get("id") or item.get("name")
                if isinstance(mid, str):
                    models.append(mid)
        elif isinstance(data.get("models"), list):
            # Some providers might return {models: []}
            for item in data["models"]:
                mid = item.get("id") or item.get("name")
                if isinstance(mid, str):
                    models.append(mid)
    return models


def get_available_models(provider: LLMProvider, ttl_seconds: int = 6 * 60 * 60) -> List[str]:
    now = time.time()
    cached = _CACHE.get(provider.id)
    if cached and cached[0] > now:
        return cached[1]

    base = provider.api_base_url or _default_base_url(provider.provider_name)
    models: List[str] = []
    if base:
        # Most providers colocate model listing at /models
        url = base.rstrip("/") + "/models"
        headers = {
            "Content-Type": "application/json",
        }
        headers.update(_auth_header(provider))
        try:
            models = _fetch_models_http(url, headers)
        except (HTTPError, URLError, TimeoutError):
            models = []
        except Exception:
            models = []

    # Fallback minimal lists per provider if none fetched
    if not models:
        name = (provider.provider_name or "").lower()
        if name == "openai":
            models = [
                "gpt-4o",
                "gpt-4o-mini",
            ]
        elif name == "anthropic":
            models = [
                "claude-3-5-sonnet",
                "claude-3-5-haiku",
            ]
        elif name == "deepseek":
            models = [
                "deepseek-chat",
                "deepseek-reasoner",
            ]
        elif name == "groq":
            models = [
                "groq/llama-3.1-8b-instant",
                "groq/llama-3.1-70b-versatile",
            ]
        elif name == "mistral":
            models = [
                "mistral-small",
                "mistral-medium",
                "mistral-large",
            ]
        elif name == "cohere":
            models = [
                "command",
                "command-r",
            ]
        # else leave empty

    # Cache
    _CACHE[provider.id] = (now + ttl_seconds, models)
    return models

