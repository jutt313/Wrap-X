"""
Reasoning Template - Ready-to-use reasoning event emitter
Provides consistent reasoning events across all wraps
"""
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def use_reasoning(
    focus: Optional[str] = None,
    enabled: bool = True
) -> Dict[str, Any]:
    """
    Emit reasoning started event
    
    Args:
        focus: What the AI should reason about (optional)
        enabled: Whether reasoning is enabled
    
    Returns:
        Reasoning started event
    """
    if not enabled:
        return {}
    
    reasoning_started = {"type": "reasoning_started"}
    if focus:
        reasoning_started["focus"] = focus
    
    logger.info(f"🔍 Reasoning started{f': {focus}' if focus else ''}")
    
    return reasoning_started


def emit_reasoning_content(content: str, max_length: int = 500) -> Dict[str, Any]:
    """
    Emit reasoning content event
    
    Args:
        content: Reasoning text to display
        max_length: Maximum content length to display
    
    Returns:
        Reasoning content event
    """
    truncated_content = content[:max_length] if len(content) > max_length else content
    
    logger.info(f"🔍 Reasoning content: {len(content)} chars (showing {len(truncated_content)})")
    
    return {
        "type": "reasoning_content",
        "content": truncated_content
    }


def emit_reasoning_completed() -> Dict[str, Any]:
    """
    Emit reasoning completed event
    
    Returns:
        Reasoning completed event
    """
    logger.info("✅ Reasoning completed")
    return {"type": "reasoning_completed"}

