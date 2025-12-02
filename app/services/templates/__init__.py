"""
Templates Module - Ready-to-use components for AI wraps
Provides consistent thinking, web search, and reasoning across all wraps
"""
from .thinking_template import (
    use_thinking,
    emit_thinking_content,
    emit_thinking_completed,
    get_fallback_thinking_content
)
from .web_search_template import (
    use_web_search,
    get_web_search_tool_definition
)
from .reasoning_template import (
    use_reasoning,
    emit_reasoning_content,
    emit_reasoning_completed
)

__all__ = [
    # Thinking
    "use_thinking",
    "emit_thinking_content",
    "emit_thinking_completed",
    "get_fallback_thinking_content",
    # Web Search
    "use_web_search",
    "get_web_search_tool_definition",
    # Reasoning
    "use_reasoning",
    "emit_reasoning_content",
    "emit_reasoning_completed",
]

