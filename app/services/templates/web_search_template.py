"""
Web Search Template - Ready-to-use Google Custom Search integration
Provides consistent web search across all wraps
"""
import json
import logging
import urllib.request
import urllib.parse
from urllib.error import HTTPError, URLError
from typing import Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


def use_web_search(query: str, max_results: int = 5) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Execute web search using Google Custom Search API
    
    Args:
        query: Search query
        max_results: Maximum number of results to return
    
    Returns:
        Tuple of (search_results_text, tool_call_event, tool_result_event)
    """
    google_cse_key = settings.google_cse_api_key
    google_cse_id = settings.google_cse_id
    
    logger.info(f"🔍 Web search: {query}")
    
    # Tool call event
    tool_call_event = {
        "type": "tool_call",
        "name": "web_search",
        "args": {"query": query, "max_results": max_results}
    }
    
    # Check if Google CSE is configured
    if not google_cse_key or not google_cse_id:
        error_msg = "Google Custom Search API not configured"
        logger.error(f"❌ {error_msg}")
        
        tool_result_event = {
            "type": "tool_result",
            "name": "web_search",
            "query": query,
            "results_count": 0,
            "error": error_msg
        }
        return error_msg, tool_call_event, tool_result_event
    
    try:
        # Build Google CSE API URL
        url = f"https://www.googleapis.com/customsearch/v1?key={google_cse_key}&cx={google_cse_id}&q={urllib.parse.quote(query)}&num={min(max_results, 10)}"
        
        req = urllib.request.Request(
            url=url,
            headers={"User-Agent": "Wrap-X/1.0"},
            method="GET",
        )
        
        # Execute search
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        # Parse results
        results = data.get("items", [])[:max_results]
        
        lines = [
            f"- {r.get('title')}: {r.get('snippet')} (source: {r.get('link')})"
            for r in results
        ]
        
        result_text = "Search results:\n" + "\n".join(lines) if lines else "No results found."
        
        # Tool result event
        tool_result_event = {
            "type": "tool_result",
            "name": "web_search",
            "query": query,
            "results_count": len(results)
        }
        
        logger.info(f"✅ Web search completed: {len(results)} results")
        return result_text, tool_call_event, tool_result_event
        
    except (HTTPError, URLError, TimeoutError) as e:
        error_msg = f"Web search failed: {e}"
        logger.error(f"❌ {error_msg}")
        
        tool_result_event = {
            "type": "tool_result",
            "name": "web_search",
            "query": query,
            "results_count": 0,
            "error": str(e)
        }
        return error_msg, tool_call_event, tool_result_event
        
    except Exception as e:
        error_msg = f"Web search unexpected error: {e}"
        logger.error(f"❌ {error_msg}")
        
        tool_result_event = {
            "type": "tool_result",
            "name": "web_search",
            "query": query,
            "results_count": 0,
            "error": str(e)
        }
        return error_msg, tool_call_event, tool_result_event


def get_web_search_tool_definition() -> Dict[str, Any]:
    """
    Get the web_search tool definition for function calling
    
    Returns:
        Tool definition dict for OpenAI function calling
    """
    return {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information, real-time data, best practices, or API documentation. Use this when user asks for current data, says 'search this', 'find this', or needs up-to-date information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g., 'current weather in Tokyo', 'best practices for customer support AI 2025')"
                    },
                    "max_results": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                        "default": 5,
                        "description": "Maximum number of results to return"
                    }
                },
                "required": ["query"]
            }
        }
    }

