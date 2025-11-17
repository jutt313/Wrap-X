"""
Chat service for parsing user commands and building system prompts

Enhanced to support:
- Option-driven config parsing (model-first, A/B/C choices, confirmation)
- Thinking and web search preferences
- Tool scaffold for web search with LiteLLM function-calling
"""
import json
import logging
import re
import os
import urllib.request
from urllib.error import URLError, HTTPError
from typing import Optional, Dict, Any, List
import openai
from app.config import settings
from app.models.prompt_config import PromptConfig
from app.models.wrapped_api import WrappedAPI

logger = logging.getLogger(__name__)

# Initialize OpenAI client
_openai_client = None

def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None:
        if not settings.openai_api_key:
            logger.warning("OPENAI_API_KEY not set - chat command parsing will not work")
            return None
        _openai_client = openai.OpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def parse_chat_command(message: str, current_config: Dict[str, Any], history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Parse user chat command using OpenAI API
    Returns dictionary with parsed updates to config
    """
    client = get_openai_client()
    if not client:
        logger.error("OpenAI client not available")
        return {"error": "OpenAI API not configured"}
    
    try:
        # Extract test chat logs for analysis
        test_chat_logs = current_config.get("test_chat_logs", [])
        test_logs_context = ""
        if test_chat_logs:
            test_logs_context = "\n\nTEST CHAT LOGS (Recent conversations with this wrapped API):\n"
            for idx, log in enumerate(test_chat_logs[:10], 1):  # Show last 10 logs
                test_logs_context += f"\n--- Log {idx} ({log.get('timestamp', 'Unknown time')}) ---\n"
                if log.get("user_message"):
                    test_logs_context += f"User: {log['user_message']}\n"
                if log.get("assistant_response"):
                    test_logs_context += f"Assistant: {log['assistant_response'][:200]}...\n"  # Truncate long responses
                if log.get("tokens_used"):
                    test_logs_context += f"Tokens: {log['tokens_used']}\n"
        
        # Wrap-X AI Configuration Builder System Prompt
        system_prompt = f"""You are Wrap-X's AI configuration builder. Your job is to turn an ongoing chat with the user into a complete, production-ready JSON config for a "wrap" (a custom AI API endpoint). You do this by asking smart questions, updating fields based on current_config and test_chat_logs, and ALWAYS returning a single JSON object with config fields plus a response_message for the UI.

You never speak directly as the user-facing bot. Instead, you:
- Decide what to ask the user next
- Read and use current_config and test_chat_logs
- Fill or refine configuration fields
- Generate response_message (what the UI shows to the user)
- Manage config_status: "collecting", "review", or "ready"

Return ONLY valid JSON. No markdown, no code fences, no extra text.

------------------------------------------------------------
WHAT IS WRAP-X
------------------------------------------------------------
- Wrap-X lets users create custom AI APIs ("wraps") on top of LLM providers (OpenAI, Anthropic, DeepSeek, etc.).
- Users create Projects → add LLM Providers → create Wraps → configure behavior, tools, and settings.
- Each Wrap is deployed as a dedicated API endpoint.

------------------------------------------------------------
RUNTIME CONTEXT (ALREADY PROVIDED TO YOU)
------------------------------------------------------------
You see values from current_config and the environment, for example:
- Project Name: {current_config.get('project_name', 'Unknown')}
- Wrap Name: {current_config.get('wrap_name', 'Unknown')}
- Provider: {current_config.get('provider_name', 'Unknown')}
- Thinking Enabled (toggle): {current_config.get('thinking_enabled', False)}
- Web Search Enabled (toggle): {current_config.get('web_search_enabled', False)}
- Available Models: {current_config.get('available_models', []) if current_config.get('available_models') else 'Check UI dropdown'}
- Uploaded Documents: {len(current_config.get('uploaded_documents', []))} document(s): {', '.join([doc.get('filename', 'Unknown') for doc in current_config.get('uploaded_documents', [])]) if current_config.get('uploaded_documents') else 'None'}

You also see:
- Current config JSON (without some internal fields)
- Optional TEST CHAT LOGS (recent end-user conversations with this wrap)

Treat current_config as the source of truth for already-filled values. You usually only need to output fields that change, plus config_status and response_message.

------------------------------------------------------------
CONFIG FIELDS (WHAT YOU ARE BUILDING)
------------------------------------------------------------
You are building a configuration object with these logical fields:

CORE PURPOSE
- purpose            : What job this AI does and what problem it solves.
- where              : Where it is used (app, API/Slack, internal tool, etc.).
- who                : Who uses it (roles, internal/external, skill level).

IDENTITY & BEHAVIOR
- role               : One-sentence identity (what this AI is).
- instructions       : 3–5 key "how-to" behaviors (one per line).
- rules              : DO/DON'T guardrails (one per line).
- tone               : One or two from:
                       Professional, Friendly, Direct, Technical, Supportive, Casual.
- structure          : Answer style. One of:
                       "short", "step_by_step", "bullets", "summary_first", "with_examples".
- length             : Typical answer length. One of:
                       "very_short", "short", "medium", "long".
- behavior           : (Optional) 1–3 sentences summarizing style and approach.
                       You may derive this from purpose + tone + structure.

MODEL & PARAMETERS
- model              : Concrete model id from the selected provider.
- temperature        : e.g. 0.1, 0.3, 0.7.
- max_tokens         : e.g. 512, 1024, 2048, 4096.
- top_p              : Default 1.0 unless user requests otherwise.
- frequency_penalty  : Default 0.0 unless user requests otherwise.

THINKING & WEB SEARCH
- thinking_mode      : "off", "brief", or "detailed".
- thinking_focus     : If thinking_mode != "off", text describing what to focus on
                       (steps, edge cases, validation, etc.).
- web_search         : "never", "only_if_asked", "when_unsure_or_latest", or "often".
- web_search_triggers: Short text describing when to search
                       (current events, pricing, versions, release notes, etc.).
- tools              : Typically [] or ["web_search"] when web search will be available.

KNOWLEDGE & OPS
- examples           : 3–5 Q→A pairs including at least one edge case.
- docs_data          : How internal docs/data should be used
                       (reference, extract, summarize, cite, etc.).
- constraints        : Latency, cost, and rate-limit preferences.
- errors             : What to do on failures/timeouts/empty or bad data
                       (retry, ask user, show fallback, etc.).
- access_versioning  : Who can call this wrap, how it is authenticated
                       (API key, JWT, etc.), and how changes are approved or versioned.

CONTROL FIELDS
- config_status      : "collecting", "review", or "ready".
- response_message   : Natural language content for the UI to show to the user
                       (question, explanation, or summary).

MANDATORY MEANINGFUL FIELDS BEFORE FINALIZING
You MUST NOT consider the config complete ("ready") until the following are all meaningfully set:
- purpose, where, who
- role, instructions, rules
- tone, structure, length
- model, temperature, max_tokens
- thinking_mode, thinking_focus (if not "off")
- web_search, web_search_triggers (if not "never")
- examples
- docs_data
- constraints
- errors
- access_versioning

------------------------------------------------------------
TOGGLES: THINKING, WEB SEARCH, UPLOADED DOCUMENTS
------------------------------------------------------------

THINKING TOGGLE (current_config.thinking_enabled):
- If thinking_enabled is False:
  - Set thinking_mode = "off".
  - Do NOT ask the user questions about thinking_mode or thinking_focus.
- If thinking_enabled is True:
  - Ask the user how they want the AI to think:
    - Off vs Brief vs Detailed.
  - Then ask what the thinking_focus should be
    (e.g. steps, edge cases, validation, data checks).
  - Use their answers to set thinking_mode and thinking_focus.

WEB SEARCH TOGGLE (current_config.web_search_enabled):
- If web_search_enabled is False:
  - Set web_search = "never".
  - web_search_triggers can be an empty string.
  - Do NOT ask the user about web search usage.
- If web_search_enabled is True:
  - Ask the user when to use web search:
    - Never, Only if asked, When unsure/latest, Often.
  - Ask what kind of things should be searched
    (current events, pricing, versions, release notes, etc.).
  - Map their answers to web_search and web_search_triggers.
  - If web_search != "never", include "web_search" in tools. Otherwise tools can be [].

UPLOADED DOCUMENTS (current_config.uploaded_documents):
- If there are uploaded documents:
  - Mention them naturally (by filename) in response_message.
  - Ask:
    - What types of questions should use these documents?
    - Should the AI only reference them, extract and rewrite, or explicitly cite them?
  - Use the answer to fill docs_data.
- If there are no uploaded documents:
  - You may keep docs_data empty or generic unless the user describes internal data sources.

------------------------------------------------------------
TEST CHAT LOGS (DEBUGGING EXISTING WRAPS)
------------------------------------------------------------
If the user mentions that something is wrong with the wrap (for example: "answers are wrong", "tone is off", "not working", "response is weird"):
- Read the TEST CHAT LOGS section given in the prompt.
- Look for patterns:
  - Wrong tone
  - Missing clarifying questions
  - Incorrect answers
  - Overly long/short output
- Then:
  - Adjust role, instructions, rules, tone, structure, length, or examples to fix these issues.
  - Optionally add or update examples to show correct behavior.
  - In response_message, briefly explain which issues you noticed and how you adjusted the config.

------------------------------------------------------------
CONVERSATION PHASES & FLOW
------------------------------------------------------------

You control a simple state machine through config_status:

1) COLLECTION PHASE  (config_status = "collecting" or missing)
   - Goal: Gather ALL mandatory fields, step by step.
   - Always start from the basics if missing:
     a) purpose
     b) where
     c) who
   - Only after purpose/where/who are clear, move on to:
     - role
     - instructions
     - rules
     - tone
     - structure
     - length
   - Then:
     - model, temperature, max_tokens (and top_p, frequency_penalty if user cares).
   - Then:
     - thinking_mode and thinking_focus (only if thinking_enabled is True).
   - Then:
     - web_search and web_search_triggers (only if web_search_enabled is True).
   - Then:
     - examples
     - docs_data
     - constraints
     - errors
     - access_versioning

   QUESTION STYLE IN COLLECTION PHASE:
   - Ask ONE clear question at a time in response_message.
   - When useful, present short options (1/2/3 or A/B/C) and accept letter/number replies.
   - Example for tone:
     "How should it sound?  
      1) Professional  
      2) Friendly  
      3) Direct  
      4) Technical  
      5) Supportive  
      6) Casual"
   - Example for length:
     "How long should answers usually be?  
      1) 1–2 lines  
      2) One short paragraph  
      3) 2–4 paragraphs  
      4) As long as needed"

   CHOICE MAPPING:
   - If user answers with "1", "2", "A", "B", etc., map that to the actual value when updating fields.
   - Example:
     - If you offered models [A) deepseek-chat, B) deepseek-reasoner],
       and user answers "B", set `"model": "deepseek-reasoner"`.

   DEFAULTS:
   - Only choose defaults when the user explicitly allows it:
     - e.g. "you choose", "use a default", "I don't care".
   - Reasonable defaults:
     - temperature: 0.3 for balanced.
     - max_tokens: 1024 for general chat.
     - top_p: 1.0, frequency_penalty: 0.0.

   GREETINGS / NO CONFIG INTENT:
   - If the user just says "hi" / "hello" / similar:
     - Use response_message to ask them what they want this AI to do and what problem it should solve.
     - Do NOT ask about models or technical settings yet.

   STATUS:
   - While some mandatory fields are still missing or unclear, set or keep:
     - config_status = "collecting".

2) REVIEW PHASE (config_status = "review")
   - Enter review phase when ALL mandatory fields are filled with meaningful values.
   - In this phase, you:
     - Generate a short, clear summary inside response_message:
       - Purpose, where, who
       - Role, instructions, rules
       - Tone, structure, length
       - Model, temperature, max_tokens
       - Thinking_mode and web_search settings
       - How examples, docs_data, constraints, errors, access_versioning are configured
     - End the summary with a direct question, e.g.:
       "Would you like to change or add anything, or should I lock this config in as your wrap?"
   - Set:
     - config_status = "review".
   - If the user asks for changes in review phase:
     - Update the requested fields.
     - Stay in "review" and refresh the summary, or go back to a specific collection-style question if something becomes unclear.

3) READY PHASE (config_status = "ready")
   - Detect positive confirmation phrases such as:
     "yes", "yep", "yeah", "sure", "ok", "okay", "create", "create it", "go ahead",
     "proceed", "let's do it", "build it", "make it", "do it", "ready", "let's go",
     "sounds good", "perfect", "great", "alright", "fine", "confirm", "approved",
     "accept", "agree", "lock it", "ship it", "looks good".
   - If:
     - config_status is "review" (or all mandatory fields are clearly filled), AND
     - the user confirms as above,
     then:
       - Keep all fields as configured.
       - Set config_status = "ready".
       - Set response_message to a short confirmation, for example:
         "Got it. The configuration is now locked and ready to use as your wrap."
   - Once in "ready":
     - Do NOT ask additional questions unless the user explicitly requests changes.
     - If the user later asks to change something, update the relevant fields and set:
       - config_status back to "review" and summarize again.

------------------------------------------------------------
USING TEST CHAT LOGS DURING ANY PHASE
------------------------------------------------------------
- If the user mentions that responses are bad, wrong, too long/short, or not matching intent:
  - Inspect TEST CHAT LOGS provided in the prompt.
  - Adjust role, instructions, rules, tone, structure, length, or examples to correct problems.
  - In response_message, briefly describe what you fixed (e.g. "I adjusted the tone to be more Friendly and added examples for short answers.").

------------------------------------------------------------
JSON OUTPUT REQUIREMENTS
------------------------------------------------------------

In every call, you MUST output a single JSON object with:
- Any config fields that are being set or updated (as top-level keys).
- config_status: "collecting", "review", or "ready".
- response_message: the next message the UI should show to the user.

You may also include unchanged fields if you want, but it is enough to output fields you are modifying plus control fields. Treat missing keys as "unchanged from current_config".

Example shape (for illustration only):

{{
  "purpose": "...",
  "where": "...",
  "who": "...",
  "role": "...",
  "instructions": "- Always do X\\n- Always do Y",
  "rules": "- DO: verify facts\\n- DON'T: give legal advice",
  "tone": "Professional",
  "structure": "summary_first",
  "length": "medium",
  "behavior": "Short summary first, then structured details.",
  "model": "gpt-4o",
  "temperature": 0.3,
  "max_tokens": 1024,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "thinking_mode": "brief",
  "thinking_focus": "Plan steps and check edge cases.",
  "web_search": "when_unsure_or_latest",
  "web_search_triggers": "Current events, pricing, versions, release notes.",
  "examples": "Q1: ...\\nA1: ...\\nQ2: ...\\nA2: ...",
  "docs_data": "Use internal product docs as reference and summarize key points.",
  "constraints": "Aim for low latency and moderate token usage.",
  "errors": "On timeouts, apologize briefly and ask user to retry.",
  "access_versioning": "Protected by API key; config changes require manual approval.",
  "tools": ["web_search"],
  "config_status": "review",
  "response_message": "Short natural-language question, summary, or confirmation here."
}}

Rules:
- Output ONLY valid JSON (no markdown, no comments, no extra text).
- Never include secrets, API keys, or credentials.
- Keep response_message concise, friendly, and focused on either:
  - asking the next question, or
  - summarizing the configuration and asking for confirmation or edits.

CONTEXT
Current config: {json.dumps({k: v for k, v in current_config.items() if k not in ["test_chat_logs", "thinking_enabled", "web_search_enabled", "provider_name", "wrap_name", "project_name", "available_models", "uploaded_documents"]}, indent=2)}{test_logs_context}
"""
        
        # Check if user message contains confirmation words/phrases
        confirmation_keywords = [
            "yes", "yep", "yeah", "sure", "ok", "okay", "create", "create it", 
            "go ahead", "proceed", "let's do it", "build it", "make it", "do it", 
            "ready", "let's go", "sounds good", "perfect", "great", "alright", 
            "fine", "confirm", "approved", "accept", "agree", "why waiting", 
            "why not", "just create", "just do it", "sure create", "sure go ahead"
        ]
        user_message_lower = message.lower().strip()
        is_confirmation = any(keyword in user_message_lower for keyword in confirmation_keywords)
        
        # If user confirmed and we have enough info, add explicit instruction to create
        if is_confirmation:
            # Check if we have minimum required fields
            has_minimum_fields = (
                current_config.get("role") and 
                current_config.get("instructions") and 
                current_config.get("model")
            )
            if has_minimum_fields:
                # Add explicit instruction to force complete config
                system_prompt += "\n\nCRITICAL: USER JUST CONFIRMED CREATION WITH WORDS LIKE 'yes', 'sure', 'create', etc.\n\nYOU MUST:\n1. Return COMPLETE config with ALL fields filled NOW\n2. Use current_config values for fields that exist\n3. Fill missing fields with smart defaults:\n   - If tone missing: use 'Professional' or 'Friendly' based on context\n   - If examples missing: generate 20-25 numbered examples based on role\n   - If rules/behavior missing: create appropriate ones based on role\n   - Use defaults: temperature=0.3, max_tokens=1024, top_p=1.0, frequency_penalty=0.0\n4. DO NOT ask 'Ready to create?' again\n5. DO NOT repeat the same question\n6. CREATE IT NOW - return complete JSON with all fields\n\nThe user is frustrated because you keep asking. CREATE THE CONFIG IMMEDIATELY."
        
        # Build message history: system + prior history + current user message
        convo: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if history:
            # history expected as list of {role, content}
            convo.extend(history)
        convo.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o",  # Prefer higher context window
            messages=convo,
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"}  # Force JSON response
        )
        
        result_text = response.choices[0].message.content.strip()
        logger.info(f"Raw OpenAI response: {result_text[:200]}")
        
        # Extract JSON from response (might have markdown code blocks)
        if result_text.startswith("```"):
            # Find the first ``` and the next ```
            parts = result_text.split("```")
            if len(parts) >= 2:
                # Get content between first and second ```
                code_content = parts[1]
                # Remove "json" prefix if present
                if code_content.startswith("json"):
                    code_content = code_content[4:]
                result_text = code_content.strip()
            else:
                # Try to extract JSON from markdown
                result_text = result_text.replace("```json", "").replace("```", "").strip()
        
        # Try to find JSON object in the text (in case there's extra text)
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(0)
        
        result_text = result_text.strip()
        logger.info(f"Extracted JSON text: {result_text[:200]}")
        
        try:
            parsed = json.loads(result_text)
            logger.info(f"Successfully parsed command: {parsed}")
            return parsed
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from OpenAI response: {json_err}")
            logger.error(f"JSON text that failed: {result_text}")
            # Try to provide a more helpful error message
            error_msg = f"JSON parsing failed: {str(json_err)}"
            return {"error": error_msg}
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from OpenAI response: {e}")
        logger.error(f"Response text: {result_text if 'result_text' in locals() else 'N/A'}")
        return {"error": f"Failed to parse command: {str(e)}"}
    except Exception as e:
        logger.error(f"Error parsing chat command: {e}", exc_info=True)
        return {"error": str(e)}


def build_system_prompt(prompt_config: Optional[PromptConfig]) -> str:
    """
    Combine prompt_config fields into a single system prompt
    """
    if not prompt_config:
        return ""
    
    parts = []
    
    if prompt_config.role:
        parts.append(f"You are: {prompt_config.role}")
    
    if prompt_config.instructions:
        parts.append(f"\nInstructions:\n{prompt_config.instructions}")
    
    if prompt_config.rules:
        parts.append(f"\nRules to follow:\n{prompt_config.rules}")
    
    if prompt_config.behavior:
        parts.append(f"\nBehavior:\n{prompt_config.behavior}")
    
    if prompt_config.tone:
        parts.append(f"\nTone: {prompt_config.tone}")
    
    if prompt_config.examples:
        parts.append(f"\nExamples:\n{prompt_config.examples}")

    # Non-sensitive guidance for planning and tools
    parts.append(
        "\nGuidance:\n"
        "- For complex/ambiguous tasks, first outline a brief plan (3–6 bullet steps), then provide the final answer.\n"
        "- If web search is enabled, state when you searched and cite sources concisely.\n"
        "- Keep the plan high-level; do not expose hidden chain-of-thought."
    )
    
    return "\n".join(parts).strip()


async def call_wrapped_llm(
    wrapped_api: WrappedAPI,
    messages: list,
    tools: Optional[list] = None,
    db_session = None
) -> Dict[str, Any]:
    """
    Call LiteLLM with system prompt and messages
    Returns response in OpenAI-compatible format
    """
    import litellm
    from app.models.llm_provider import LLMProvider
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from cryptography.fernet import Fernet
    from app.config import settings
    
    # Encryption helper - use same logic as llm_providers router
    def decrypt_api_key(encrypted_key: str) -> str:
        """Decrypt API key using same cipher as llm_providers"""
        _encryption_key = getattr(settings, 'encryption_key', None)
        if not _encryption_key:
            raise ValueError("ENCRYPTION_KEY not configured")
        try:
            if isinstance(_encryption_key, str):
                cipher_suite = Fernet(_encryption_key.encode())
            else:
                cipher_suite = Fernet(_encryption_key)
            return cipher_suite.decrypt(encrypted_key.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            logger.error("This usually means the LLM provider was encrypted with a different ENCRYPTION_KEY.")
            logger.error("Solution: Delete and re-add your LLM providers after setting ENCRYPTION_KEY in .env")
            raise ValueError("Failed to decrypt API key - LLM provider may have been encrypted with a different key. Please delete and re-add your LLM provider in the dashboard.")
    
    # Use provided session or create new one
    if db_session:
        db = db_session
        should_close = False
    else:
        db = AsyncSessionLocal()
        should_close = True
    
    try:
        wx_events: List[Dict[str, Any]] = []
        # Get provider
        provider_result = await db.execute(
            select(LLMProvider)
            .where(LLMProvider.id == wrapped_api.provider_id)
            .options(selectinload(LLMProvider.project))
        )
        provider = provider_result.scalar_one_or_none()
        
        if not provider:
            raise ValueError("LLM Provider not found")
        
        # Decrypt API key
        api_key = decrypt_api_key(provider.api_key)
        
        # Build system prompt
        system_prompt = build_system_prompt(wrapped_api.prompt_config)
        # Append thinking/web search configuration for clearer behavior
        try:
            tm = getattr(wrapped_api, 'thinking_mode', None)
            tf = getattr(wrapped_api, 'thinking_focus', None)
            ws = getattr(wrapped_api, 'web_search', None)
            wst = getattr(wrapped_api, 'web_search_triggers', None)
            config_lines = []
            if tm and tm != 'off':
                config_lines.append(f"Thinking: {tm}{' — Focus: ' + tf if tf else ''}")
            if (ws and ws != 'off') or getattr(wrapped_api, 'web_search_enabled', False):
                trig = f" — Triggers: {wst}" if wst else ''
                config_lines.append(f"Web Search: {ws or ('enabled' if getattr(wrapped_api, 'web_search_enabled', False) else 'off')}{trig}")
            if config_lines:
                system_prompt = (system_prompt + "\n\n" + "\n".join(config_lines)).strip()
        except Exception:
            pass
        
        # Prepare messages with system prompt
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)
        
        # Get model - use provider-specific defaults
        default_models = {
            "openai": "gpt-3.5-turbo",
            "anthropic": "claude-3-haiku-20240307",
            "deepseek": "deepseek-chat",
            "groq": "llama-3.1-8b-instant",
            "gemini": "gemini-pro",
            "mistral": "mistral-tiny",
            "cohere": "command",
            "together_ai": "meta-llama/Llama-2-7b-chat-hf",
            "perplexity": "llama-3.1-sonar-small-128k-online",
            "anyscale": "meta-llama/Llama-2-7b-chat-hf",
            "azure": "gpt-3.5-turbo",
            "openrouter": "openai/gpt-3.5-turbo",
        }
        default_model = default_models.get(provider.provider_name, "gpt-3.5-turbo")
        model = wrapped_api.model or default_model
        
        # Format model string for LiteLLM
        if "/" not in model and provider.provider_name != "custom":
            model_str = f"{provider.provider_name}/{model}"
        else:
            model_str = model
        
        # Prepare parameters
        params = {
            "model": model_str,
            "messages": formatted_messages,
            "api_key": api_key,
        }
        
        # Add optional parameters if set
        if wrapped_api.temperature is not None:
            params["temperature"] = wrapped_api.temperature
        if wrapped_api.max_tokens is not None:
            params["max_tokens"] = wrapped_api.max_tokens
        if wrapped_api.top_p is not None:
            params["top_p"] = wrapped_api.top_p
        if wrapped_api.frequency_penalty is not None:
            params["frequency_penalty"] = wrapped_api.frequency_penalty
        
        if provider.api_base_url:
            params["api_base"] = provider.api_base_url
        
        # Define web_search tool if none explicitly provided
        def tool_defs() -> List[dict]:
            return [
                {
                    "type": "function",
                    "function": {
                        "name": "web_search",
                        "description": "Search the web and return a concise summary of top results with sources.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "max_results": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5}
                            },
                            "required": ["query"]
                        }
                    }
                }
            ]

        # Check if web_search is enabled via enum or legacy toggle
        web_search_mode = getattr(wrapped_api, "web_search", None)
        web_search_enabled_toggle = getattr(wrapped_api, "web_search_enabled", False)
        web_search_active = (web_search_mode is not None and web_search_mode != "off") or web_search_enabled_toggle
        if web_search_active:
            params["tools"] = tools if tools else tool_defs()
        else:
            params["tools"] = tools if tools else []

        # Helper to execute web search
        def execute_web_search(query: str, max_results: int = 5) -> str:
            serper_key = os.getenv("SERPER_API_KEY")
            tavily_key = os.getenv("TAVILY_API_KEY")
            try:
                if serper_key:
                    req = urllib.request.Request(
                        url="https://google.serper.dev/search",
                        data=json.dumps({"q": query, "num": max_results}).encode("utf-8"),
                        headers={"Content-Type": "application/json", "X-API-KEY": serper_key},
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("organic", [])[:max_results]
                    lines = [
                        f"- {r.get('title')}: {r.get('snippet')} (source: {r.get('link')})"
                        for r in results
                    ]
                    return "Search results:\n" + "\n".join(lines) if lines else "No results found."
                elif tavily_key:
                    req = urllib.request.Request(
                        url="https://api.tavily.com/search",
                        data=json.dumps({"api_key": tavily_key, "query": query, "max_results": max_results}).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("results", [])[:max_results]
                    lines = [
                        f"- {r.get('title')}: {r.get('content')} (source: {r.get('url')})"
                        for r in results
                    ]
                    return "Search results:\n" + "\n".join(lines) if lines else "No results found."
                else:
                    return "Web search not configured. Set SERPER_API_KEY or TAVILY_API_KEY."
            except (HTTPError, URLError, TimeoutError) as e:
                logger.error(f"Web search error: {e}")
                return f"Web search failed: {e}"
            except Exception as e:
                logger.error(f"Web search unexpected error: {e}")
                return f"Web search failed: {e}"
        
        # If thinking is enabled, note start
        # Check both the new boolean toggle and legacy thinking_mode string
        thinking_enabled = getattr(wrapped_api, "thinking_enabled", False)
        thinking_mode = getattr(wrapped_api, "thinking_mode", None)
        thinking_focus = getattr(wrapped_api, "thinking_focus", None)
        
        # Enable thinking if either the boolean toggle is on OR the legacy mode is not "off"
        if thinking_enabled or (thinking_mode and thinking_mode != "off"):
            thinking_event = {"type": "thinking_started"}
            if thinking_focus:
                thinking_event["focus"] = thinking_focus
            wx_events.append(thinking_event)

        # Call LiteLLM (first pass)
        response = await litellm.acompletion(**params)

        # Preserve tool_calls if present
        def to_message(choice_obj) -> Dict[str, Any]:
            if hasattr(choice_obj.message, 'model_dump'):
                return choice_obj.message.model_dump()
            msg = {
                "role": getattr(choice_obj.message, 'role', 'assistant'),
                "content": getattr(choice_obj.message, 'content', None)
            }
            tool_calls = getattr(choice_obj.message, 'tool_calls', None)
            if tool_calls:
                try:
                    msg["tool_calls"] = [tc.model_dump() if hasattr(tc, 'model_dump') else tc for tc in tool_calls]
                except Exception:
                    msg["tool_calls"] = tool_calls
            return msg

        first_choice = response.choices[0]
        assistant_msg = to_message(first_choice)
        
        # Extract thinking content if available (from assistant message content before tool calls)
        thinking_content = None
        if thinking_mode and thinking_mode != "off":
            # Check if assistant message contains thinking/planning content
            content = assistant_msg.get("content", "")
            if content and not assistant_msg.get("tool_calls"):
                # If content exists and no tool calls, this might be thinking content
                thinking_content = content.strip()
            elif content:
                # If both content and tool calls exist, content might be thinking
                thinking_content = content.strip() if content.strip() else None
        
        # If thinking content found, add to events
        if thinking_content:
            wx_events.append({
                "type": "thinking_content",
                "content": thinking_content
            })

        # Handle one round of tool calls (web_search)
        tool_calls = assistant_msg.get("tool_calls") or []
        if tool_calls:
            # Append the assistant message that contains tool_calls first
            formatted_messages.append({
                "role": "assistant",
                **{k: v for k, v in assistant_msg.items() if k in ("content", "tool_calls")}
            })
            for tc in tool_calls:
                fn = tc.get("function", {})
                name = fn.get("name")
                args_str = fn.get("arguments") or "{}"
                try:
                    args = json.loads(args_str) if isinstance(args_str, str) else args_str
                except Exception:
                    args = {"query": str(args_str)}
                # Emit event for UI with dynamic tool information
                tool_call_event = {"type": "tool_call", "name": name or "tool"}
                if args:
                    tool_call_event["args"] = args
                wx_events.append(tool_call_event)
                
                if name == "web_search":
                    query = args.get("query", "")
                    max_results = int(args.get("max_results", 5))
                    result_text = execute_web_search(query, max_results)
                    # Add search result summary to event
                    wx_events.append({
                        "type": "tool_result",
                        "name": name or "tool",
                        "query": query,
                        "results_count": len(result_text.split("\n")) if result_text else 0
                    })
                else:
                    result_text = f"Tool '{name}' is not implemented."
                    wx_events.append({"type": "tool_result", "name": name or "tool"})
                formatted_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", "toolcall-1"),
                    "name": name or "tool",
                    "content": result_text,
                })
            # Second pass with tool output
            params["messages"] = formatted_messages
            response = await litellm.acompletion(**params)
            first_choice = response.choices[0]
            assistant_msg = to_message(first_choice)

        # Thinking complete
        if any(ev.get("type") == "thinking_started" for ev in wx_events):
            wx_events.append({"type": "thinking_completed"})
        
        # Format response in OpenAI-compatible format
        return {
            "id": f"chatcmpl-{wrapped_api.id}-{hash(str(messages))}",
            "object": "chat.completion",
            "created": int(__import__("time").time()),
            "model": model_str,
            "choices": [
                {
                    "index": 0,
                    "message": assistant_msg,
                    "finish_reason": getattr(first_choice, 'finish_reason', 'stop')
                }
            ],
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0
            },
            "wx_events": wx_events
        }
    except Exception as e:
        logger.error(f"Error calling wrapped LLM: {e}")
        raise
    finally:
        # Only close if we created the session
        if should_close:
            await db.close()
