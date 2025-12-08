"""
Config validation service for config chat endpoint.
Provides strict parsing, field whitelisting, range validation, and model allowlist checking.
"""
from typing import Dict, Any, List, Optional
import logging
import re
from app.models.llm_provider import LLMProvider
from app.services.model_catalog import get_available_models

# Initialize logger first
logger = logging.getLogger(__name__)

# Optional: Import validation templates for enhanced tool code validation
try:
    from app.services.templates.custom_tools import validate_tool_code
    VALIDATION_TEMPLATE_AVAILABLE = True
except ImportError:
    VALIDATION_TEMPLATE_AVAILABLE = False
    logger.warning("Validation templates not available - tool code validation will be basic")


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
    # Extended fields for richer config (not all persisted yet)
    "purpose",
    "where",
    "who",
    "structure",
    "length",
    "docs_data",
    "constraints",
    "errors",
    "access_versioning",
    "config_status",
    "response_message",  # AI-generated response, not a config field but allowed
    "error",  # AI-generated error, not a config field but allowed
    "pending_tools",  # pending integration forms to render in UI
    "tool_integration_data",  # tool integration discovery data for UI
    "toolIntegrationData",  # camelCase variant for compatibility
    "action_selection_data",  # action selection data for UI
    "events",  # frontend events
    "wx_events",  # legacy events name
    "tool_integration_data",  # tool discovery/generation data for UI
    "toolIntegrationData",  # camelCase variant for tool integration data
    "events",  # UI events (thinking, reasoning, etc.)
    "wx_events",  # wrapped API events
}

# Enum validations
VALID_TONES = {"Casual", "Professional", "Friendly", "Direct", "Technical", "Supportive"}
VALID_THINKING_MODES = {"always", "conditional", "off", "brief", "detailed"}
VALID_WEB_SEARCH_MODES = {"always", "conditional", "off", "never", "only_if_asked", "when_unsure_or_latest", "often"}

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


def _normalize_examples_text(text: str) -> str:
    """
    Attempt to normalize examples into numbered `1. Q: ... A: ...` format.
    """
    if not text:
        return text
    
    lines = [line.strip() for line in text.splitlines()]
    candidates: List[str] = []
    current_block: List[str] = []
    
    for line in lines:
        if not line:
            if current_block:
                candidates.append(" ".join(current_block).strip())
                current_block = []
            continue
        
        if re.match(r"^\d+\.", line) or line.upper().startswith("Q:"):
            if current_block:
                candidates.append(" ".join(current_block).strip())
                current_block = []
        current_block.append(line)
    
    if current_block:
        candidates.append(" ".join(current_block).strip())
    
    qa_blocks = [block for block in candidates if "Q:" in block and "A:" in block]
    if not qa_blocks:
        return text
    
    normalized_lines: List[str] = []
    for idx, block in enumerate(qa_blocks, start=1):
        block = re.sub(r"^\d+\.\s*", "", block).strip()
        if not block.upper().startswith("Q:"):
            block = f"Q: {block}"
        if "A:" not in block:
            # Skip entries without answers
            continue
        normalized_lines.append(f"{idx}. {block.strip()}")
    
    return "\n".join(normalized_lines) if normalized_lines else text


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
    
    # Drop unknown fields instead of failing validation (be lenient to parser)
    unknown_fields = set(parsed.keys()) - ALLOWED_FIELDS
    if unknown_fields:
        try:
            for field in list(unknown_fields):
                logger.warning(f"Dropping unknown config field: {field}")
                parsed.pop(field, None)
        except Exception:
            pass
    
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
            # Accept a single tone or up to two tones combined (e.g., "Friendly + Direct", "Friendly, Direct")
            def _normalize_tone_string(raw: str) -> str:
                # Replace common separators with comma, then split
                s = str(raw)
                # Normalize separators: +, /, |, ' and '
                for sep in ["+", "/", "|", "&"]:
                    s = s.replace(sep, ",")
                s = s.replace(" and ", ",")
                # Split, strip, title-case tokens
                parts = [p.strip() for p in s.split(",") if p.strip()]
                tokens = []
                for p in parts:
                    t = p.lower().strip()
                    if not t:
                        continue
                    t = t.capitalize() if t != "ip" else t  # generic title-case; special-case if ever needed
                    # Map common lowercase to canonical case
                    mapping = {
                        "casual": "Casual",
                        "professional": "Professional",
                        "friendly": "Friendly",
                        "direct": "Direct",
                        "technical": "Technical",
                        "supportive": "Supportive",
                    }
                    canon = mapping.get(t.lower(), t)
                    if canon in VALID_TONES and canon not in tokens:
                        tokens.append(canon)
                    # Cap at two tones
                    if len(tokens) >= 2:
                        break
                return ", ".join(tokens)

            normalized = _normalize_tone_string(value)
            if not normalized:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": (
                        "Tone must be one of: " + ", ".join(sorted(VALID_TONES)) +
                        "; optionally combine up to two (e.g., 'Friendly + Direct')."
                    ),
                    "valid_values": sorted(VALID_TONES)
                })
            else:
                cleaned[field] = normalized
                
        elif field == "thinking_mode":
            if value not in VALID_THINKING_MODES:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"Thinking mode must be one of: {', '.join(sorted(VALID_THINKING_MODES))}",
                    "valid_values": sorted(VALID_THINKING_MODES)
                })
            else:
                # Normalize brief/detailed to internal values
                normalized = value
                if value == "brief":
                    normalized = "conditional"
                elif value == "detailed":
                    normalized = "always"
                cleaned[field] = normalized
                
        elif field == "web_search":
            if value not in VALID_WEB_SEARCH_MODES:
                errors.append({
                    "field": field,
                    "value": value,
                    "message": f"Web search mode must be one of: {', '.join(sorted(VALID_WEB_SEARCH_MODES))}",
                    "valid_values": sorted(VALID_WEB_SEARCH_MODES)
                })
            else:
                # Normalize external labels to internal values
                mapping = {
                    "never": "off",
                    "only_if_asked": "conditional",
                    "when_unsure_or_latest": "conditional",
                    "often": "always",
                }
                cleaned[field] = mapping.get(value, value)
        
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
        
        elif field == "pending_tools":
            if not isinstance(value, list):
                errors.append({
                    "field": field,
                    "value": value,
                    "message": "pending_tools must be a list",
                    "valid_type": "list"
                })
            else:
                # Validate structure of each pending tool
                validated_tools = []
                for idx, tool in enumerate(value):
                    if not isinstance(tool, dict):
                        errors.append({
                            "field": f"pending_tools[{idx}]",
                            "value": tool,
                            "message": "Each tool must be a dictionary",
                            "valid_type": "dict"
                        })
                        continue
                    
                    # Required: tool_name or name
                    tool_name = tool.get("tool_name") or tool.get("name")
                    if not tool_name:
                        errors.append({
                            "field": f"pending_tools[{idx}]",
                            "value": tool,
                            "message": "Tool must have 'tool_name' or 'name' field",
                            "required_fields": ["tool_name", "name"]
                        })
                        continue
                    
                    # Required: credential_fields must be a list if present
                    cred_fields = tool.get("credential_fields") or tool.get("fields") or []
                    if not isinstance(cred_fields, list):
                        errors.append({
                            "field": f"pending_tools[{idx}].credential_fields",
                            "value": cred_fields,
                            "message": "credential_fields must be a list",
                            "valid_type": "list"
                        })
                        continue
                    
                    # OAuth validation
                    if tool.get("requires_oauth"):
                        oauth_provider = tool.get("oauth_provider")
                        oauth_scopes = tool.get("oauth_scopes")
                        
                        if not oauth_provider:
                            errors.append({
                                "field": f"pending_tools[{idx}].oauth_provider",
                                "value": oauth_provider,
                                "message": "OAuth tools must have 'oauth_provider' field",
                                "required_when": "requires_oauth is true"
                            })
                        
                        if not isinstance(oauth_scopes, list):
                            errors.append({
                                "field": f"pending_tools[{idx}].oauth_scopes",
                                "value": oauth_scopes,
                                "message": "oauth_scopes must be a list",
                                "valid_type": "list"
                            })
                    
                    # Validate tool_code if present (basic checks)
                    if "tool_code" in tool:
                        code = tool.get("tool_code")
                        if code and isinstance(code, str):
                            # Basic security checks
                            dangerous_patterns = [
                                ("eval(", "eval() usage is not allowed for security"),
                                ("exec(", "exec() usage is not allowed for security"),
                                ("__import__", "dynamic imports not allowed for security"),
                            ]
                            for pattern, msg in dangerous_patterns:
                                if pattern in code:
                                    errors.append({
                                        "field": f"pending_tools[{idx}].tool_code",
                                        "value": f"{tool_name} code",
                                        "message": msg,
                                        "security_risk": True
                                    })
                    
                    validated_tools.append(tool)
                
                # Only set cleaned value if no errors for this field
                if not any(e.get("field", "").startswith("pending_tools") for e in errors):
                    cleaned[field] = validated_tools
        
        # Validate string fields (role, instructions, rules, behavior, examples, thinking_focus, web_search_triggers, and extended fields)
        elif field in {"role", "instructions", "rules", "behavior", "examples", "thinking_focus", "web_search_triggers",
                       "purpose", "where", "who", "structure", "length", "docs_data", "constraints", "errors", "access_versioning", "config_status"}:
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
                    # Handle list case - convert to string
                    if isinstance(value, list):
                        value = "\n".join(str(item) for item in value)
                    # Ensure it's a string
                    if not isinstance(value, str):
                        value = str(value) if value else ""
                    normalized_examples = _normalize_examples_text(value)
                    lines = [line.strip() for line in normalized_examples.split("\n") if line.strip()]
                    numbered_count = sum(1 for line in lines if re.match(r"^\d+\.", line))
                    if numbered_count < 2:
                        errors.append({
                            "field": field,
                            "value": (normalized_examples[:100] + "...") if len(normalized_examples) > 100 else normalized_examples,
                            "message": "Examples should contain at least 2 numbered entries formatted like '1. Q: ... A: ...'",
                            "suggestion": "Provide at least two Q/A pairs and ensure each begins with a number (e.g., '1. Q: ... A: ...')."
                        })
                    else:
                        cleaned[field] = normalized_examples
                else:
                    cleaned[field] = value
        
        # Allow response_message and error (AI-generated, not config fields)
        elif field in {"response_message", "error"}:
            cleaned[field] = value
        
        # Allow UI-related fields (tool_integration_data, events, etc.) - pass through as-is
        elif field in {"tool_integration_data", "toolIntegrationData", "events", "wx_events"}:
            cleaned[field] = value
    
    # Copy any remaining allowed fields that weren't handled above (pass-through for UI fields)
    for field in ALLOWED_FIELDS:
        if field not in cleaned and field in parsed and parsed[field] is not None:
            # Skip fields that were already processed or are config fields
            if field not in {"role", "instructions", "rules", "behavior", "tone", "examples", 
                           "model", "temperature", "max_tokens", "top_p", "frequency_penalty",
                           "thinking_mode", "thinking_focus", "web_search", "web_search_triggers",
                           "tools", "pending_tools", "response_message", "error",
                           "tool_integration_data", "toolIntegrationData", "events", "wx_events"}:
                # This shouldn't happen, but just in case, pass through
                cleaned[field] = parsed[field]
    
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
