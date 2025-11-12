"""
Config validation service for config chat endpoint.
Provides strict parsing, field whitelisting, range validation, and model allowlist checking.
"""
from typing import Dict, Any, List, Optional
import logging
import re
from app.models.llm_provider import LLMProvider
from app.services.model_catalog import get_available_models

logger = logging.getLogger(__name__)

# Allowed fields for config updates
ALLOWED_FIELDS = {
    "role",
    "instructions",
    "rules",
    "behavior",
    "tone",
    "examples",
    "model",
    "temperature",
    "max_tokens",
    "top_p",
    "frequency_penalty",
    "thinking_mode",
    "thinking_focus",
    "web_search",
    "web_search_triggers",
    "tools",
    "response_message",  # AI-generated response, not a config field but allowed
    "error",  # AI-generated error, not a config field but allowed
}

# Enum validations
VALID_TONES = {"Casual", "Professional", "Friendly", "Direct", "Technical", "Supportive"}
VALID_THINKING_MODES = {"always", "conditional", "off"}
VALID_WEB_SEARCH_MODES = {"always", "conditional", "off"}

# Range validations
FIELD_RANGES = {
    "temperature": {"min": 0.0, "max": 2.0},
    "max_tokens": {"min": 1, "max": 8192},
    "top_p": {"min": 0.0, "max": 1.0},
    "frequency_penalty": {"min": -2.0, "max": 2.0},
}


class ValidationError(Exception):
    """Raised when config validation fails"""
    def __init__(self, details: List[Dict[str, Any]]):
        self.details = details
        super().__init__("Validation failed")


def validate_config_updates(
    parsed: Dict[str, Any],
    available_models: Optional[List[str]] = None,
    provider: Optional[LLMProvider] = None
) -> Dict[str, Any]:
    """
    Validate config updates with strict parsing.
    
    Args:
        parsed: Parsed config updates from AI
        available_models: Optional list of available model names for the provider
        provider: Optional LLMProvider object to fetch models if not provided
        
    Returns:
        cleaned_parsed: Dict with only allowed fields and validated values
        
    Raises:
        ValidationError: If validation fails with structured error details
    """
    errors: List[Dict[str, Any]] = []
    cleaned: Dict[str, Any] = {}
    
    # Check for unknown fields
    unknown_fields = set(parsed.keys()) - ALLOWED_FIELDS
    if unknown_fields:
        for field in unknown_fields:
            errors.append({
                "field": field,
                "value": parsed[field],
                "message": f"Unknown field '{field}' is not allowed",
                "valid_fields": sorted(ALLOWED_FIELDS - {"response_message", "error"})
            })
    
    # Validate each allowed field
    for field in ALLOWED_FIELDS:
        if field not in parsed:
            continue
            
        value = parsed[field]
        
        # Skip None values (they mean "don't update this field")
        if value is None:
            continue
        
        # Validate enum fields
        if field == "tone":
            if value not in VALID_TONES:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"Tone must be one of: {', '.join(sorted(VALID_TONES))}",
                    "valid_values": sorted(VALID_TONES)
                })
            else:
                cleaned[field] = value
                
        elif field == "thinking_mode":
            if value not in VALID_THINKING_MODES:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"Thinking mode must be one of: {', '.join(sorted(VALID_THINKING_MODES))}",
                    "valid_values": sorted(VALID_THINKING_MODES)
                })
            else:
                cleaned[field] = value
                
        elif field == "web_search":
            if value not in VALID_WEB_SEARCH_MODES:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"Web search mode must be one of: {', '.join(sorted(VALID_WEB_SEARCH_MODES))}",
                    "valid_values": sorted(VALID_WEB_SEARCH_MODES)
                })
            else:
                cleaned[field] = value
        
        # Validate numeric ranges
        elif field in FIELD_RANGES:
            try:
                num_value = float(value) if field != "max_tokens" else int(value)
                range_def = FIELD_RANGES[field]
                
                if num_value < range_def["min"] or num_value > range_def["max"]:
                    errors.append({
                        "field": field,
                        "value": value,
                        "message": f"{field.capitalize()} must be between {range_def['min']} and {range_def['max']}",
                        "valid_range": range_def
                    })
                else:
                    cleaned[field] = num_value
            except (ValueError, TypeError):
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"{field.capitalize()} must be a number",
                    "valid_range": FIELD_RANGES[field]
                })
        
        # Validate model name (if provided)
        elif field == "model":
            model_errors = validate_model_name(value, available_models, provider)
            if model_errors:
                errors.extend(model_errors)
            else:
                cleaned[field] = value
        
        # Validate tools (must be a list)
        elif field == "tools":
            if not isinstance(value, list):
                errors.append({
                    "field": field,
                    "value": value,
                    "message": "Tools must be a list",
                    "valid_type": "list"
                })
            else:
                cleaned[field] = value
        
        # Validate string fields (role, instructions, rules, behavior, examples, thinking_focus, web_search_triggers)
        elif field in {"role", "instructions", "rules", "behavior", "examples", "thinking_focus", "web_search_triggers"}:
            if not isinstance(value, str):
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"{field.capitalize()} must be a string",
                    "valid_type": "string"
                })
            else:
                # Additional validation for examples: should be numbered
                if field == "examples" and value:
                    # Check if examples are numbered (basic check)
                    lines = value.strip().split("\n")
                    numbered_count = sum(1 for line in lines if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith("-")))
                    if numbered_count < 5:  # At least 5 examples should be numbered
                        errors.append({
                            "field": field,
                            "value": value[:100] + "..." if len(value) > 100 else value,
                            "message": "Examples should be numbered (1., 2., 3., etc.) and contain at least 5 examples",
                            "suggestion": "Format examples as numbered list: '1. Q: ... A: ...\\n2. Q: ... A: ...'"
                        })
                    else:
                        cleaned[field] = value
                else:
                    cleaned[field] = value
        
        # Allow response_message and error (AI-generated, not config fields)
        elif field in {"response_message", "error"}:
            cleaned[field] = value
    
    if errors:
        raise ValidationError(errors)
    
    return cleaned


def validate_model_name(
    model: str,
    available_models: Optional[List[str]] = None,
    provider: Optional[LLMProvider] = None
) -> List[Dict[str, Any]]:
    """
    Validate that model name exists in provider's allowlist.
    
    Args:
        model: Model name to validate
        available_models: Optional list of available models
        provider: Optional LLMProvider to fetch models if not provided
        
    Returns:
        List of error details (empty if valid)
    """
    errors: List[Dict[str, Any]] = []
    
    if not model or not isinstance(model, str):
        errors.append({
            "field": "model",
            "value": model,
            "message": "Model must be a non-empty string",
            "valid_type": "string"
        })
        return errors
    
    # Fetch models if not provided
    if not available_models and provider:
        try:
            available_models = get_available_models(provider)
        except Exception as e:
            logger.warning(f"Failed to fetch available models for provider {provider.id}: {e}")
            available_models = []
    
    # If we have available models, check against them
    if available_models:
        # Normalize model names for comparison (remove provider prefix if present)
        normalized_available = [m.lower().replace("/", "/") for m in available_models]
        normalized_model = model.lower()
        
        # Check exact match or partial match (for provider-prefixed models)
        matches = [
            m for m in available_models
            if m.lower() == normalized_model or m.lower().endswith("/" + normalized_model)
        ]
        
        if not matches:
            errors.append({
                "field": "model",
                "value": model,
                "message": f"Model '{model}' is not available for this provider",
                "available_models": available_models[:10],  # Show first 10
                "suggestion": f"Choose from available models: {', '.join(available_models[:5])}"
            })
    else:
        # No available models list - can't validate, but log warning
        logger.warning(f"Could not validate model '{model}' - no available models list provided")
        # Don't fail validation if we can't check, but log it
    
    return errors


def sanitize_chat_logs(logs: List[Dict[str, Any]], max_logs: int = 5, max_message_length: int = 100) -> List[Dict[str, Any]]:
    """
    Sanitize chat logs before sending to AI to prevent data leakage and reduce context size.
    
    Args:
        logs: List of chat log dictionaries
        max_logs: Maximum number of logs to include (default: 5)
        max_message_length: Maximum length per message in characters (default: 100)
        
    Returns:
        Sanitized list of logs with:
        - Limited count (last N logs)
        - Truncated messages
        - Removed sensitive fields (API keys, tokens, status codes, token counts)
        - PII patterns removed
    """
    if not logs:
        return []
    
    # Limit to last N logs
    limited_logs = logs[-max_logs:] if len(logs) > max_logs else logs
    
    # Patterns to remove (API keys, tokens, etc.)
    api_key_pattern = re.compile(r'(?i)(api[_-]?key|bearer|token|secret|password|auth)[\s:=]+["\']?[a-zA-Z0-9_\-]{20,}["\']?', re.IGNORECASE)
    email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    phone_pattern = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b')
    ssn_pattern = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
    
    sanitized = []
    for log in limited_logs:
        sanitized_log = {}
        
        # Keep timestamp (but don't include sensitive info)
        if "timestamp" in log:
            sanitized_log["timestamp"] = log["timestamp"]
        
        # Sanitize user message
        if "user_message" in log and log["user_message"]:
            user_msg = str(log["user_message"])
            # Remove sensitive patterns
            user_msg = api_key_pattern.sub("[REDACTED]", user_msg)
            user_msg = email_pattern.sub("[EMAIL]", user_msg)
            user_msg = phone_pattern.sub("[PHONE]", user_msg)
            user_msg = ssn_pattern.sub("[SSN]", user_msg)
            # Truncate
            if len(user_msg) > max_message_length:
                user_msg = user_msg[:max_message_length] + "..."
            sanitized_log["user_message"] = user_msg
        
        # Sanitize assistant response
        if "assistant_response" in log and log["assistant_response"]:
            assistant_msg = str(log["assistant_response"])
            # Remove sensitive patterns
            assistant_msg = api_key_pattern.sub("[REDACTED]", assistant_msg)
            assistant_msg = email_pattern.sub("[EMAIL]", assistant_msg)
            assistant_msg = phone_pattern.sub("[PHONE]", assistant_msg)
            assistant_msg = ssn_pattern.sub("[SSN]", assistant_msg)
            # Truncate
            if len(assistant_msg) > max_message_length:
                assistant_msg = assistant_msg[:max_message_length] + "..."
            sanitized_log["assistant_response"] = assistant_msg
        
        # Don't include tokens_used, status_code, or other metadata
        # Only include essential conversation context
        
        if sanitized_log:
            sanitized.append(sanitized_log)
    
    return sanitized

