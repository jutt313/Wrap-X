"""
Tool Generator - Dynamically generates custom tool integrations for any API
Researches API documentation and generates Python code to call external APIs
"""
import json
import logging
import os
import urllib.request
from urllib.error import URLError, HTTPError
from typing import Dict, Any, List, Optional
import openai
from app.config import settings
from app.services.oauth_helper import detect_provider_from_tool_name, get_default_scopes
import asyncio
import time

logger = logging.getLogger(__name__)


def retry_with_backoff(max_attempts=3, initial_delay=1.0, backoff_factor=2.0):
    """
    Decorator for retrying async functions with exponential backoff
    
    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay between retries
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except openai.RateLimitError as e:
                    # Rate limit errors should be retried
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(f"Rate limit hit on attempt {attempt + 1}/{max_attempts}, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"Rate limit exceeded after {max_attempts} attempts")
                        raise
                except (openai.APIError, openai.APIConnectionError, openai.APITimeoutError) as e:
                    # Network/server errors should be retried
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(f"API error on attempt {attempt + 1}/{max_attempts}: {e}, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"API error after {max_attempts} attempts: {e}")
                        raise
                except (openai.AuthenticationError, openai.BadRequestError) as e:
                    # Authentication or validation errors should not be retried
                    logger.error(f"Non-retryable error: {e}")
                    raise
                except Exception as e:
                    # Unexpected errors
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(f"Unexpected error on attempt {attempt + 1}/{max_attempts}: {e}, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"Failed after {max_attempts} attempts: {e}")
                        raise
            
            # Should never reach here, but just in case
            if last_exception:
                raise last_exception
                
        return wrapper
    return decorator


def _execute_search(query: str) -> List[Dict[str, Any]]:
    """
    Execute a single search query using Google Custom Search API
    
    Returns:
        List of search results with title, snippet/content, and link/url
    """
    google_cse_key = os.getenv("GOOGLE_CSE_API_KEY")
    google_cse_id = os.getenv("GOOGLE_CSE_ID")
    
    if not google_cse_key or not google_cse_id:
        logger.warning("Google Custom Search API not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID.")
        return []
    
    try:
        import urllib.parse
        url = f"https://www.googleapis.com/customsearch/v1?key={google_cse_key}&cx={google_cse_id}&q={urllib.parse.quote(query)}&num=8"
        
        req = urllib.request.Request(
            url=url,
            headers={"User-Agent": "Wrap-X/1.0"},
            method="GET",
        )
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        results = data.get("items", [])[:8]
        return [
            {"title": r.get("title", ""), "content": r.get("snippet", ""), "url": r.get("link", "")}
            for r in results
        ]
    except (HTTPError, URLError, Exception) as e:
        logger.warning(f"Search query '{query}' failed: {e}")
        return []


def search_api_docs(tool_name: str, user_requirements: Optional[str] = None) -> str:
    """
    Search the web for API documentation and Python examples for a given tool
    Performs multiple searches to get comprehensive information

    Args:
        tool_name: Name of the tool/service (e.g., "Gmail", "Notion", "Airtable")
        user_requirements: Optional user requirements to include in search

    Returns:
        Search results with API documentation and examples
    """
    google_cse_key = os.getenv("GOOGLE_CSE_API_KEY")
    google_cse_id = os.getenv("GOOGLE_CSE_ID")
    
    if not google_cse_key or not google_cse_id:
        logger.warning("Google Custom Search API not configured. Tool generation may be limited.")
        return "Web search not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID to enable comprehensive tool generation."

    # Build multiple search queries for comprehensive coverage
    base_queries = [
        f"{tool_name} API authentication credentials required setup guide how to get",
        f"{tool_name} OAuth setup official documentation",
        f"{tool_name} API Python SDK examples",
    ]
    
    # Add user-specific query if provided
    if user_requirements:
        base_queries.append(f"{tool_name} {user_requirements} API integration")
    
    all_results = []
    seen_urls = set()
    
    logger.info(f"Searching online for {tool_name} with {len(base_queries)} queries...")
    
    # Execute all searches
    for query in base_queries:
        results = _execute_search(query)
        for r in results:
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(r)
    
    if not all_results:
        logger.warning(f"No search results found for {tool_name}")
        return f"Search completed but no results found for {tool_name}. Proceeding with LLM knowledge."
    
    # Format results
    lines = [
        f"- {r.get('title', 'Untitled')}: {r.get('content', '')[:200]}... (source: {r.get('url', '')})"
        for r in all_results[:12]  # Limit to top 12 results
    ]
    
    logger.info(f"Found {len(all_results)} unique search results for {tool_name}")
    return f"API Documentation Search Results ({len(all_results)} sources found):\n" + "\n".join(lines)


def search_oauth_scopes(service_name: str, provider: Optional[str] = None, access_level: Optional[str] = None) -> List[str]:
    """
    Search online for valid OAuth scopes for a service
    
    Args:
        service_name: Name of the service (e.g., "Gmail", "Google Sheets")
        provider: OAuth provider (e.g., "google", "shopify")
        access_level: "read-only" or "full" access level
    
    Returns:
        List of valid OAuth scope strings
    """
    google_cse_key = os.getenv("GOOGLE_CSE_API_KEY")
    google_cse_id = os.getenv("GOOGLE_CSE_ID")
    
    if not google_cse_key or not google_cse_id:
        logger.warning("Google Custom Search API not configured for scope search")
        return []
    
    queries = [
        f"{service_name} OAuth scopes official documentation",
        f"{service_name} API authentication scopes required",
    ]
    
    if provider:
        queries.append(f"{service_name} {provider} OAuth2 scope list")
    
    if access_level:
        queries.append(f"{service_name} OAuth scopes {access_level} access")
    
    all_results = []
    seen_urls = set()
    
    logger.info(f"Searching for OAuth scopes: {service_name} (provider: {provider}, access: {access_level})")
    
    for query in queries:
        results = _execute_search(query)
        for r in results:
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(r)
    
    # Extract scope patterns from search results
    scopes = []
    scope_patterns = [
        r"https?://[^\s]+/auth/[^\s]+",  # Full scope URLs
        r"scope[:\s]+([^\s,]+)",  # "scope: gmail.readonly"
        r'"([^"]*auth[^"]*)"',  # Quoted scope strings
    ]
    
    import re
    for result in all_results:
        content = f"{result.get('title', '')} {result.get('content', '')}"
        for pattern in scope_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            scopes.extend(matches)
    
    # Deduplicate and clean
    unique_scopes = list(set([s.strip() for s in scopes if s and len(s) > 5]))
    
    logger.info(f"Extracted {len(unique_scopes)} potential scopes from search results")
    return unique_scopes[:20]  # Return top 20 unique scopes


def _inject_oauth_metadata(tool_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure OAuth metadata exists if the service likely uses OAuth."""
    tool_label = (
        tool_payload.get("tool_name")
        or tool_payload.get("display_name")
        or tool_payload.get("name")
        or ""
    )
    provider = tool_payload.get("oauth_provider") or detect_provider_from_tool_name(tool_label)
    if not provider:
        return tool_payload

    scopes = tool_payload.get("oauth_scopes") or tool_payload.get("required_scopes") or []
    if not scopes:
        scopes = get_default_scopes(provider)

    tool_payload["oauth_provider"] = provider
    tool_payload["oauth_scopes"] = scopes
    tool_payload["requires_oauth"] = True
    tool_payload.setdefault(
        "oauth_instructions",
        "Create an OAuth client for this provider, add the redirect URL from Wrap-X, grant the listed scopes, then authorize Wrap-X to capture a refresh token.",
    )
    return tool_payload


@retry_with_backoff(max_attempts=3, initial_delay=1.0, backoff_factor=2.0)
async def generate_custom_tool(
    tool_name: str,
    tool_description: str,
    user_requirements: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate custom tool integration code for any external API

    Args:
        tool_name: Name of the tool (e.g., "Gmail", "Notion", "Airtable")
        tool_description: What the tool should do (e.g., "Read latest emails")
        user_requirements: Optional additional requirements from user

    Returns:
        Dictionary with:
        - tool_name: Normalized tool name
        - display_name: Display name for UI
        - description: Tool description
        - tool_code: Python function code to execute the tool
        - credential_fields: List of credential fields needed for UI popup
        - success: Boolean indicating if generation succeeded
        - error: Error message if failed
    """
    if not settings.openai_api_key:
        return {
            "success": False,
            "error": "OpenAI API key not configured - cannot generate tools"
        }

    try:
        # Step 1: Search for API documentation (ALWAYS search online)
        logger.info(f"Researching {tool_name} API documentation online...")
        api_docs = search_api_docs(tool_name, user_requirements)
        
        if not api_docs or "not configured" in api_docs.lower():
            logger.warning(f"Search not available for {tool_name}, proceeding with LLM knowledge only")
            api_docs = f"Limited information available for {tool_name}. Using LLM knowledge base."

        # Step 2: Use LLM to generate tool code based on API docs
        client = openai.OpenAI(api_key=settings.openai_api_key)

        system_prompt = """You are an expert Python developer specializing in API integrations.

Your task: Generate production-ready Python code to integrate with external APIs.

Requirements:
1. Research the API from provided documentation THOROUGHLY
2. Write a Python function that calls the API
3. Handle authentication (API keys, OAuth tokens, etc.)
4. Parse and return results in a clean format
5. Include error handling
6. Identify ALL required credentials WITH DETAILED STEP-BY-STEP INSTRUCTIONS

CRITICAL - CREDENTIAL IDENTIFICATION:
You MUST identify EVERY credential field needed for authentication. Do NOT miss any fields.

For OAuth2 services (Gmail, Google Drive, Shopify, Slack, HubSpot, etc.):
- ONLY request: client_id (OAuth Client ID) and client_secret (OAuth Client Secret)
- DO NOT request refresh_token or access_token (Wrap-X performs the OAuth authorization code flow and token exchange automatically)
- If scopes are relevant, list them in oauth_scopes (not as credential fields)

For API Key services (Airtable, Notion, etc.), you typically need:
- api_key (or api_token, access_token)
- Sometimes: base_id, workspace_id, or other identifiers

For Database services (PostgreSQL, MySQL, etc.), you typically need:
- host (database host)
- port (database port)
- database (database name)
- username (database user)
- password (database password)
- Sometimes: ssl_mode, connection_string

For each credential field, you MUST provide detailed step-by-step instructions on:
- Where to find/get the credential (exact location in the platform: Settings > API > Keys, Developer Console, etc.)
- What to click (specific buttons, menus, links: "Create New Key", "Generate Token", etc.)
- What information to look for (field names, labels: "API Key", "Client ID", etc.)
- How to copy/retrieve the value (copy button location, where it appears)
- Any prerequisites (account setup, permissions needed, verification steps, etc.)

Output Format (JSON):
{
  "tool_name": "normalized_tool_name",
  "display_name": "Tool Display Name",
  "description": "What this tool does",
  "tool_code": "def execute_tool(credentials, **params):\\n    # Python code here\\n    pass",
  "credential_fields": [
    {
      "name": "api_key",
      "label": "API Key",
      "type": "password",
      "required": true,
      "instructions": "Step-by-step guide:\n1. Go to Settings > API Keys\n2. Click 'Create New Key'\n3. Copy the key shown\n4. Paste it here"
    }
  ],
  "sample_params": {"param1": "value1"},
  "notes": "Any important notes about usage",
  "requires_oauth": true/false,
  "oauth_provider": "google | shopify | ...",
  "oauth_scopes": ["scope1", "scope2"],
  "oauth_instructions": "Brief summary explaining the console steps"
}

Code Requirements:
- Function signature: def execute_tool(credentials: dict, **params) -> dict
- credentials = {"api_key": "...", "token": "...", etc.}
- params = runtime parameters passed by the wrap
- Return dict with results
- Handle errors gracefully, return {"error": "message"} on failure
- Use standard libraries (requests, urllib, json) - no external packages unless necessary
- Include docstrings

Be thorough and production-ready!"""

        user_prompt = f"""Generate a custom tool integration for: {tool_name}

Description: {tool_description}
{f"Additional Requirements: {user_requirements}" if user_requirements else ""}

API Documentation:
{api_docs}

Based on the API docs above, generate:
1. Python function to call this API
2. List of ALL required credentials WITH DETAILED STEP-BY-STEP INSTRUCTIONS for each field

CRITICAL: You MUST identify EVERY credential field needed. Research the authentication method:
- If it's OAuth2: Include ONLY client_id and client_secret as credential fields. DO NOT include refresh_token or access_token. Wrap-X will handle authorize+callback and secure storage.
- If it's API Key: Include api_key (and any other required identifiers like base_id, workspace_id)
- If it's Database: Include host, port, database, username, password (and any SSL/connection options)
- If it's Token-based: Include access_token (and any other token fields)
- If it's Basic Auth: Include username and password
- If it's Custom: Research what specific credentials are needed

For each credential field, provide clear instructions on:
   * Where to find it (exact location: Settings > API > Keys, Developer Console > Credentials, etc.)
   * What to click (specific buttons, menu items: "Create New Key", "Generate Token", "Create OAuth Client", etc.)
   * What to look for (field names, labels: "API Key", "Client ID", "Client Secret", etc.)
   * How to copy/retrieve the value (where the copy button is, what format it appears in)
   * Any prerequisites (account type, permissions, verification steps, app registration, etc.)

3. Sample parameters

IMPORTANT: 
- The instructions field for each credential must be detailed enough for a non-technical user to follow
- Include specific navigation paths, button names, and what to expect at each step
- DO NOT miss any required credential fields - be thorough in your research
- If the service uses OAuth (Google, Shopify, Slack, HubSpot, etc.), set requires_oauth=true and provide oauth_provider + oauth_scopes + oauth_instructions
- If the service requires multiple credentials, list ALL of them

Return ONLY valid JSON matching the required format."""

        # Use async OpenAI client
        async_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        
        response = await async_client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,  # Low temperature for consistent code generation
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content.strip()
        logger.info(f"Tool generator response: {result_text[:200]}...")

        # Parse JSON response
        tool_data = json.loads(result_text)
        tool_data = _inject_oauth_metadata(tool_data)

        # If OAuth is required, defensively remove token fields the model might have emitted
        # We only want client_id and client_secret for OAuth credentials; tokens are handled by backend
        if tool_data.get("requires_oauth") or tool_data.get("requiresOAuth"):
            fields_key = (
                "credential_fields" if isinstance(tool_data.get("credential_fields"), list) else
                ("credentialFields" if isinstance(tool_data.get("credentialFields"), list) else None)
            )
            if fields_key:
                filtered = []
                for f in tool_data[fields_key]:
                    name = (f.get("name") or f.get("key") or "").lower()
                    if name in ("refresh_token", "access_token", "token", "bearer_token"):
                        continue
                    filtered.append(f)
                tool_data[fields_key] = filtered

        # Validate required fields
        required_fields = ["tool_name", "display_name", "description", "tool_code", "credential_fields"]
        missing = [f for f in required_fields if f not in tool_data]
        if missing:
            logger.error(f"Tool generator missing fields: {missing}")
            return {
                "success": False,
                "error": f"Generated tool missing required fields: {', '.join(missing)}"
            }

        # Validate tool_code is valid Python (basic check)
        tool_code = tool_data["tool_code"]
        if "def execute_tool" not in tool_code:
            logger.error(f"Generated tool code missing execute_tool function")
            return {
                "success": False,
                "error": "Generated code missing required execute_tool function"
            }

        # Return successful result
        logger.info(f"Successfully generated tool: {tool_data['tool_name']}")
        return {
            "success": True,
            **tool_data
        }

    except json.JSONDecodeError as e:
        logger.error(f"Tool generator JSON parse error: {e}")
        return {
            "success": False,
            "error": f"Failed to parse tool generation response: {e}"
        }
    except Exception as e:
        logger.error(f"Tool generator error: {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool generation failed: {str(e)}"
        }


async def validate_tool_code(tool_code: str) -> Dict[str, Any]:
    """
    Validate generated tool code for security and correctness

    Args:
        tool_code: Python code to validate

    Returns:
        Dictionary with validation results
    """
    issues = []

    # Check for dangerous operations
    dangerous_keywords = [
        "exec(", "eval(", "__import__", "compile(",
        "os.system", "subprocess.", "shell=True"
    ]
    for keyword in dangerous_keywords:
        if keyword in tool_code:
            issues.append(f"Dangerous operation detected: {keyword}")

    # Check for required function
    if "def execute_tool" not in tool_code:
        issues.append("Missing required execute_tool function")

    # Try to compile the code (syntax check)
    try:
        compile(tool_code, "<string>", "exec")
    except SyntaxError as e:
        issues.append(f"Syntax error: {e}")

    return {
        "valid": len(issues) == 0,
        "issues": issues
    }
