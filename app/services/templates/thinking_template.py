"""
Thinking Template - Ready-to-use thinking event emitter
Provides consistent thinking events across all wraps
"""
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def use_thinking(
    focus: Optional[str] = None,
    enabled: bool = True
) -> List[Dict[str, Any]]:
    """
    Emit thinking events for AI processing
    
    Args:
        focus: What the AI should think about (optional)
        enabled: Whether thinking is enabled
    
    Returns:
        List of thinking events to add to response
    """
    if not enabled:
        return []
    
    events = []
    
    # Emit thinking_started event
    thinking_started = {"type": "thinking_started"}
    if focus:
        thinking_started["focus"] = focus
    events.append(thinking_started)
    
    logger.info(f"🤔 Thinking started{f': {focus}' if focus else ''}")
    
    return events


def emit_thinking_content(content: str) -> Dict[str, Any]:
    """
    Emit thinking content event
    
    Args:
        content: Thinking text to display
    
    Returns:
        Thinking content event
    """
    logger.info(f"🤔 Thinking content: {len(content)} chars")
    return {
        "type": "thinking_content",
        "content": content
    }


def emit_thinking_completed() -> Dict[str, Any]:
    """
    Emit thinking completed event
    
    Returns:
        Thinking completed event
    """
    logger.info("✅ Thinking completed")
    return {"type": "thinking_completed"}


def get_fallback_thinking_content() -> str:
    """
    Get fallback thinking content when model doesn't output text
    
    Returns:
        Default thinking message
    """
    return "Analyzing request and preparing to use tools..."

