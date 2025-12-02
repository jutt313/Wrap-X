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
import urllib.parse
from urllib.error import URLError, HTTPError
from typing import Optional, Dict, Any, List
import openai
from app.config import settings
from app.models.prompt_config import PromptConfig
from app.models.wrapped_api import WrappedAPI
from app.services.smart_config_prompt import build_smart_config_prompt
from app.services.templates import (
    use_thinking,
    emit_thinking_content,
    emit_thinking_completed,
    get_fallback_thinking_content,
    use_web_search,
    get_web_search_tool_definition,
    use_reasoning,
    emit_reasoning_content,
    emit_reasoning_completed
)

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
    print(f"🚀 [CONFIG CHAT] ========== PARSE_CHAT_COMMAND CALLED ==========")
    print(f"🚀 [CONFIG CHAT] Message: {message}")
    print(f"🚀 [CONFIG CHAT] Current config keys: {list(current_config.keys()) if current_config else 'None'}")
    print(f"🚀 [CONFIG CHAT] History length: {len(history) if history else 0}")
    
    # Initialize events list to send to frontend (for tool calls, search results, etc.)
    config_events = []
    print(f"🚀 [CONFIG CHAT] Initialized config_events list (empty)")
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

        # ===== Wrap-X Configuration Assistant System Prompt =====
        try:
            system_prompt = build_smart_config_prompt(current_config, test_logs_context)
            logger.info("[Config Chat] Smart prompt built successfully")
        except Exception as prompt_err:
            logger.error(f"[Config Chat] Failed to build smart prompt: {prompt_err}", exc_info=True)
            # Fallback to minimal prompt
            clean_config = {k: v for k, v in current_config.items() if k not in ['test_chat_logs', 'available_models']}
            system_prompt = f"""You are Config Assistant for Wrap-X. Help build wraps.

Current: {json.dumps(clean_config, indent=2)}
Models: {current_config.get('available_models', [])}

CRITICAL: Always return valid JSON with response_message field.

Format:
{{
  "response_message": "Text to user (REQUIRED)",
  "role": "...",
  "instructions": "...",
  "model": "from available_models",
  "tone": "Professional/Friendly/Technical",
  "rules": "...",
  "examples": "1. Q: ... A: ...\\n2. Q: ... A: ...",
  "generated_system_prompt": "..." (when finalizing only)
}}

Ask ONE question at a time. When user confirms, return ALL fields.
"""
            logger.info("[Config Chat] Using fallback minimal prompt")

        # OLD PROMPT REPLACED WITH SMART ADAPTIVE PROMPT
        # See app/services/smart_config_prompt.py for the new intelligent configuration assistant
        # Old 300+ line rigid checklist has been replaced with adaptive, reasoning-driven approach

        # [Old prompt code removed - was 300+ lines of rigid workflow]
        # Key changes:
        # - Added thinking mode for reasoning
        # - Added web search for research
        # - Removed rigid 10-step checklist
        # - Added custom tool integration support
        # - Made questioning adaptive based on context

        # ===== End System Prompt (Now Using Smart Adaptive Prompt) =====
        
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
        
        # Helper: build a sane default config using current values + defaults
        def _default_config_from_current(cfg: Dict[str, Any]) -> Dict[str, Any]:
            # Choose a model from available_models if possible
            def pick_model() -> str:
                avail = cfg.get("available_models")
                if isinstance(avail, list) and avail:
                    # Prefer a GPT-5 Mini variant, then gpt-4o-mini, then first available
                    preferred = [
                        m for m in avail 
                        if isinstance(m, str) and (
                            "gpt-5-mini" in m.lower() or "5-mini" in m.lower()
                        )
                    ]
                    if preferred:
                        return preferred[0]
                    preferred = [
                        m for m in avail
                        if isinstance(m, str) and (
                            "gpt-4o-mini" in m.lower() or "4o-mini" in m.lower()
                        )
                    ]
                    if preferred:
                        return preferred[0]
                    preferred = [
                        m for m in avail
                        if isinstance(m, str) and ("gpt-4o" in m.lower())
                    ]
                    if preferred:
                        return preferred[0]
                    return str(avail[0])
                # Fallback if no list provided
                return cfg.get("model") or "gpt-5-mini"

            wrap_name = cfg.get("wrap_name") or "this wrap"
            project_name = cfg.get("project_name") or "this project"

            role = cfg.get("role") or f"Assistant that helps with {project_name}"
            # Ensure allowed tone: only allowed values, optionally combine two with ' + ' (space-padded)
            allowed_tones = ["Casual", "Direct", "Friendly", "Professional", "Supportive", "Technical"]
            def pick_tone(value):
                # If value is already an allowed tone or valid combo, return
                if isinstance(value, str):
                    parts = [s.strip().capitalize() for s in value.split("+")]
                    if 1 <= len(parts) <= 2 and all(p in allowed_tones for p in parts):
                        return " + ".join(parts)
                return "Professional"  # fallback
            tone = pick_tone(cfg.get("tone") or "Professional")
            instructions = cfg.get("instructions") or (
                "Ask brief clarifying questions when needed.\n"
                "Provide step-by-step solutions.\n"
                "Be concise and specific.\n"
                "Show final answers first, then details if helpful."
            )
            behavior = cfg.get("behavior") or "Focus on actionable, accurate answers."
            rules = cfg.get("rules") or (
                "DO: Stay within the user's request and this project's scope.\n"
                "DO: Cite sources or assumptions when relevant.\n"
                "DON'T: Hallucinate facts or fabricate capabilities.\n"
                "DON'T: Provide unsafe or destructive instructions."
            )
            # Provide at least 5 numbered Q/A pairs to satisfy validation
            examples = cfg.get("examples") or (
                "1. Q: What can you do? A: I can help with tasks in this project, answer questions, and provide step-by-step guidance.\n"
                "2. Q: Set the model to gpt-4o-mini. A: Model set to gpt-4o-mini with balanced settings.\n"
                "3. Q: Explain a feature quickly. A: Summary first, then a short list of steps to use it.\n"
                "4. Q: If unsure, what will you do? A: I will ask a clarifying question before proceeding.\n"
                "5. Q: Can you search the web? A: Only if enabled; otherwise I answer from general knowledge and context."
            )

            model_name = pick_model()
            # Defensive: Model must be non-empty and from available_models
            avail = cfg.get("available_models")
            if not model_name or not isinstance(model_name, str) or (isinstance(avail, list) and avail and model_name not in avail):
                model_name = avail[0] if avail and isinstance(avail, list) and len(avail) > 0 else "gpt-5-mini"
            # Use higher token window for gpt-5-mini
            if isinstance(model_name, str) and "gpt-5-mini" in model_name.lower():
                max_tokens = cfg.get("max_tokens", 200000)
            else:
                max_tokens = cfg.get("max_tokens", 1024)
            temperature = cfg.get("temperature", 0.3)
            top_p = cfg.get("top_p", 1.0)
            frequency_penalty = cfg.get("frequency_penalty", 0.0)
            thinking_mode = cfg.get("thinking_mode") or ("off")
            web_search_mode = cfg.get("web_search") or ("off")

            response_message = (
                f"Created a complete config for {wrap_name}. Model: {model_name}; Tone: {tone}. "
                "You can adjust any field or apply these changes."
            )

            return {
                "role": role,
                "instructions": instructions,
                "rules": rules,
                "behavior": behavior,
                "tone": tone,
                "examples": examples,
                "model": model_name,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": top_p,
                "frequency_penalty": frequency_penalty,
                "thinking_mode": thinking_mode,
                "web_search": web_search_mode,
                "response_message": response_message,
            }

        # If user confirmed, immediately produce a complete config using defaults without relying on LLM
        # Disabled to always use LLM-driven parsing/confirmation so stepwise process is followed and validation rules are respected
        # if is_confirmation:
        #     logger.info("Config chat: user confirmed creation; auto-filling defaults where missing and returning complete config.")
        #     return _default_config_from_current(current_config)

        # If not a confirmation, continue with LLM-driven parsing
        
        # If user confirmed and we have enough info, add explicit instruction to create (legacy behavior)
        # Note: kept for backward compatibility if future code removes early-return above
        # by toggling this branch.
        # (This block is effectively bypassed now because of the early return.)
        # if is_confirmation and has_minimum_fields:
        #     system_prompt += "\n\nCRITICAL: USER JUST CONFIRMED CREATION..."
        
        # Build message history: system + prior history + current user message
        convo: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if history:
            # history expected as list of {role, content}
            convo.extend(history)
        convo.append({"role": "user", "content": message})
        
        # Detect if user mentions tools/services that need generate_tool
        tool_keywords = [
            "gmail", "google sheets", "shopify", "notion", "airtable", "slack", "hubspot",
            "connect", "integrate", "link", "setup", "configure", "add", "use",
            "api", "oauth", "credentials", "authentication"
        ]
        # Add search-related keywords
        search_keywords = [
            "search", "serch", "find", "look up", "current", "weather", "date", "time", "now", 
            "today", "latest", "recent", "what is", "who is", "where is", "when is",
            "how to", "best practices", "documentation", "api docs", "online", "web"
        ]
        message_lower = message.lower()
        mentions_tools = any(keyword in message_lower for keyword in tool_keywords)
        mentions_search = any(keyword in message_lower for keyword in search_keywords)
        
        # If tools OR search are mentioned, force function calling
        tool_choice_setting = None
        if mentions_tools or mentions_search:
            tool_choice_setting = "auto"  # Let model decide which tool to call
            logger.info(f"[Config Chat] User message mentions {'tools' if mentions_tools else 'search'} - enabling function calling")
            print(f"[Config Chat] User message mentions {'tools' if mentions_tools else 'search'} - enabling function calling")

        # Define tools for config chat using templates
        config_chat_tools = [
            # Web search for research (using template)
            get_web_search_tool_definition(),
            # Tool generator for custom integrations
            {
                "type": "function",
                "function": {
                    "name": "generate_tool",
                    "description": "🚨 MANDATORY: Generate custom tool integration code for ANY external API mentioned by user. You MUST call this function when user mentions Gmail, Shopify, Google Sheets, Notion, Airtable, Slack, HubSpot, or any other external service. DO NOT just describe - ALWAYS call this function first.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tool_name": {"type": "string", "description": "Exact name of the tool/API (e.g., 'Gmail', 'Google Sheets', 'Shopify', 'Notion')"},
                            "tool_description": {"type": "string", "description": "What the tool should do (e.g., 'Read and write emails', 'Read and write sheets', 'Read orders')"},
                            "user_requirements": {"type": "string", "description": "Access level and requirements (e.g., 'Read-only access', 'Full access to read and write', 'OAuth with gmail.modify scope')"}
                        },
                        "required": ["tool_name", "tool_description"]
                    }
                }
            }
        ]

        # Helper to execute web search using Google Custom Search API
        # Web search function using template (cleaner, reusable)
        # Note: We still need a wrapper function for the inner scope
        def execute_web_search_wrapper(query: str, max_results: int = 5) -> str:
            # Use the template and return just the result text
            result_text, _, _ = use_web_search(query, max_results)
            return result_text

        # Prepare API params - add tools for web search and tool generation
        api_params = {
            "model": settings.openai_model,  # Configurable model (default: gpt-4o-mini)
            "messages": convo,
            "temperature": 0.3,
            "max_tokens": 2000,
            "response_format": {"type": "json_object"},
        }

        # Add tools with error handling
        try:
            api_params["tools"] = config_chat_tools
            if tool_choice_setting:
                api_params["tool_choice"] = tool_choice_setting
            logger.info(f"[Config Chat] Added {len(config_chat_tools)} tools (web_search, generate_tool), tool_choice={tool_choice_setting}")
        except Exception as tools_err:
            logger.warning(f"[Config Chat] Failed to add tools: {tools_err}")
            # Continue without tools

        # Emit thinking_started event using template (always enabled for config chat)
        thinking_events = use_thinking(
            focus="Analyzing user request and determining configuration needs",
            enabled=True
        )
        config_events.extend(thinking_events)
        print(f"🤔 [CONFIG CHAT] THINKING_STARTED event emitted")
        print(f"🤔 [CONFIG CHAT] Total events so far: {len(config_events)}")
        
        # Use OpenAI JSON mode; fallback if provider rejects response_format or tools
        try:
            response = client.chat.completions.create(**api_params)
        except Exception as e:
            emsg = str(e).lower()
            # Some errors require retry without certain features
            if "must contain the word 'json'" in emsg and "response_format" in emsg:
                # Retry without response_format; add explicit lowercase json instruction
                convo_fb = list(convo)
                convo_fb.insert(1, {"role": "system", "content": "Return only valid json. No markdown, no code fences, no extra text."})
                api_params_fb = dict(api_params)
                api_params_fb.pop("response_format", None)
                api_params_fb["messages"] = convo_fb
                response = client.chat.completions.create(**api_params_fb)
            elif "tools" in emsg or "function" in emsg or "tool_choice" in emsg:
                # Model doesn't support function calling - retry without tools
                logger.warning(f"Config chat model doesn't support tools, disabling web search and tool generation: {e}")
                api_params_no_tools = dict(api_params)
                api_params_no_tools.pop("tools", None)
                api_params_no_tools.pop("tool_choice", None)
                response = client.chat.completions.create(**api_params_no_tools)
            else:
                raise

        # Handle tool calls (web search, tool generation)
        choice = response.choices[0]
        
        # Extract thinking content from first response (if any)
        first_response_content = choice.message.content
        print(f"🤔 [CONFIG CHAT] First response content check:")
        print(f"🤔 [CONFIG CHAT]   - Has content attribute: {hasattr(choice.message, 'content')}")
        print(f"🤔 [CONFIG CHAT]   - Content value: {first_response_content}")
        print(f"🤔 [CONFIG CHAT]   - Content is not None: {first_response_content is not None}")
        print(f"🤔 [CONFIG CHAT]   - Content stripped length: {len(first_response_content.strip()) if first_response_content else 0}")
        
        if first_response_content and first_response_content.strip():
            config_events.append(emit_thinking_content(first_response_content.strip()))
            print(f"🤔 [CONFIG CHAT] THINKING_CONTENT event emitted: {len(first_response_content)} chars")
            print(f"🤔 [CONFIG CHAT] Content preview: {first_response_content[:100]}...")
        else:
            # If no thinking content but we have tool calls, use fallback
            has_tool_calls = hasattr(choice.message, 'tool_calls') and choice.message.tool_calls
            print(f"🤔 [CONFIG CHAT] No thinking content found. Has tool calls: {has_tool_calls}")
            if has_tool_calls:
                config_events.append(emit_thinking_content(get_fallback_thinking_content()))
                print(f"🤔 [CONFIG CHAT] FALLBACK THINKING_CONTENT event emitted (no text from model)")
        print(f"🤔 [CONFIG CHAT] Total events after thinking extraction: {len(config_events)}")
        
        if hasattr(choice.message, 'tool_calls') and choice.message.tool_calls:
            logger.info(f"[Config Chat] Model requested {len(choice.message.tool_calls)} tool calls")
            # Model wants to search the web - execute and continue
            tool_calls = choice.message.tool_calls
            # Add assistant message with tool_calls
            convo.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments}
                    }
                    for tc in tool_calls
                ]
            })
            # Execute each tool call with comprehensive error handling
            for tc in tool_calls:
                try:
                    if tc.function.name == "web_search":
                        try:
                            args = json.loads(tc.function.arguments)
                            query = args.get("query", "")
                            max_results = args.get("max_results", 5)
                            
                            # Execute web search using template (returns result + events)
                            print(f"🔍 [CONFIG CHAT] ========== WEB SEARCH TOOL CALL ==========")
                            print(f"🔍 [CONFIG CHAT] Query: '{query}', Max Results: {max_results}")
                            print(f"🔍 [CONFIG CHAT] Total events before search: {len(config_events)}")
                            
                            search_result, tool_call_event, tool_result_event = use_web_search(query, max_results)
                            
                            # Add events from template
                            config_events.append(tool_call_event)
                            config_events.append(tool_result_event)
                            
                            print(f"✅ [CONFIG CHAT] ========== WEB SEARCH COMPLETED ==========")
                            print(f"✅ [CONFIG CHAT] TOOL_CALL event emitted: {tool_call_event}")
                            print(f"✅ [CONFIG CHAT] TOOL_RESULT event emitted: {tool_result_event}")
                            print(f"✅ [CONFIG CHAT] Total events after search: {len(config_events)}")
                        except Exception as search_err:
                            logger.error(f"Config chat search execution error: {search_err}")
                            print(f"❌ [CONFIG CHAT] Search execution error: {search_err}")
                            search_result = f"Search failed: {search_err}"
                            # Emit error event
                            config_events.append({
                                "type": "tool_result",
                                "name": "web_search",
                                "query": query if 'query' in locals() else "",
                                "results_count": 0,
                                "error": str(search_err)
                            })
                        # Add tool result to conversation
                        convo.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "name": "web_search",
                            "content": search_result
                        })
                    elif tc.function.name == "generate_tool":
                        # Handle tool generation with full error handling
                        try:
                            from app.services.tool_generator import generate_custom_tool
                        except ImportError as import_err:
                            logger.error(f"[Config Chat] Failed to import tool_generator: {import_err}")
                            convo.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "name": "generate_tool",
                                "content": json.dumps({"success": False, "error": f"Tool generator not available: {str(import_err)}"})
                            })
                            continue

                        try:
                            args = json.loads(tc.function.arguments)
                            tool_name = args.get("tool_name", "")
                            tool_description = args.get("tool_description", "")
                            user_requirements = args.get("user_requirements")

                            if not tool_name or not tool_description:
                                raise ValueError("Tool name and description are required")

                            logger.info(f"[Config Chat] Generating tool: {tool_name}")

                            tool_result = await generate_custom_tool(tool_name, tool_description, user_requirements)

                            if tool_result.get("success"):
                                result_json = json.dumps({
                                    "success": True,
                                    "tool_name": tool_result["tool_name"],
                                    "display_name": tool_result["display_name"],
                                    "description": tool_result["description"],
                                    "credential_fields": tool_result["credential_fields"],
                                    "tool_code": tool_result["tool_code"]
                                })
                                logger.info(f"[Config Chat] Tool generated: {tool_result['tool_name']}")
                            else:
                                result_json = json.dumps({"success": False, "error": tool_result.get("error", "Unknown error")})
                                logger.error(f"[Config Chat] Tool generation failed: {tool_result.get('error')}")

                            convo.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "name": "generate_tool",
                                "content": result_json
                            })
                        except Exception as gen_err:
                            logger.error(f"[Config Chat] Tool generation error: {gen_err}", exc_info=True)
                            convo.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "name": "generate_tool",
                                "content": json.dumps({"success": False, "error": f"Tool generation failed: {str(gen_err)}"})
                            })
                except Exception as tool_exec_err:
                    logger.error(f"[Config Chat] Tool execution failed for {tc.function.name}: {tool_exec_err}", exc_info=True)
                    # Add error result
                    convo.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tc.function.name,
                        "content": json.dumps({"error": f"Tool execution failed: {str(tool_exec_err)}"})
                    })
            # Emit reasoning_started event using template (reasoning phase begins after tools)
            reasoning_started = use_reasoning(
                focus="Analyzing tool results and formulating final configuration",
                enabled=True
            )
            if reasoning_started:
                config_events.append(reasoning_started)
            print(f"🔍 [CONFIG CHAT] ========== REASONING STARTED ==========")
            print(f"🔍 [CONFIG CHAT] REASONING_STARTED event emitted")
            print(f"🔍 [CONFIG CHAT] Total events before reasoning: {len(config_events)}")
            
            # Make second API call with tool results
            api_params["messages"] = convo
            logger.info(f"[Config Chat] Making second API call after tool execution")
            try:
                response = client.chat.completions.create(**api_params)
                logger.info(f"[Config Chat] Second API call successful")
            except Exception as e2:
                logger.error(f"[Config Chat] Second API call failed: {e2}", exc_info=True)
                emsg2 = str(e2).lower()
                if "must contain the word 'json'" in emsg2:
                    convo.insert(1, {"role": "system", "content": "Return only valid json."})
                    api_params_fb2 = dict(api_params)
                    api_params_fb2.pop("response_format", None)
                    api_params_fb2["messages"] = convo
                    response = client.chat.completions.create(**api_params_fb2)
                else:
                    raise
        
        # Safely extract content, handling None/empty responses
        content = response.choices[0].message.content
        result_text = (content or "").strip()
        
        # Extract reasoning content from final response (if any)
        print(f"🔍 [CONFIG CHAT] Final response text check:")
        print(f"🔍 [CONFIG CHAT]   - Result text: {result_text[:100] if result_text else 'None'}...")
        print(f"🔍 [CONFIG CHAT]   - Result text length: {len(result_text) if result_text else 0}")
        if result_text and result_text.strip():
            # Extract reasoning content using template
            config_events.append(emit_reasoning_content(result_text.strip(), max_length=500))
            print(f"🔍 [CONFIG CHAT] REASONING_CONTENT event emitted: {len(result_text)} chars")
            print(f"🔍 [CONFIG CHAT] Content preview: {result_text[:100]}...")
        else:
            print(f"🔍 [CONFIG CHAT] No reasoning content found in final response")
        print(f"🔍 [CONFIG CHAT] Total events before completion: {len(config_events)}")
        
        # Emit reasoning_completed and thinking_completed events using templates
        config_events.append(emit_reasoning_completed())
        config_events.append(emit_thinking_completed())
        print(f"✅ [CONFIG CHAT] ========== REASONING COMPLETED ==========")
        print(f"✅ [CONFIG CHAT] REASONING_COMPLETED event emitted")
        print(f"✅ [CONFIG CHAT] THINKING_COMPLETED event emitted")
        print(f"✅ [CONFIG CHAT] Total events at completion: {len(config_events)}")
        print(f"✅ [CONFIG CHAT] All events: {config_events}")
        
        # Check for empty response before attempting JSON parsing
        if not result_text:
            logger.error("[Config Chat] Second API call returned empty content")
            # If we have pending tools from the first call, preserve them
            # Check if we have any pending tools in the conversation
            pending_tools = []
            for msg in convo:
                if not msg or not isinstance(msg, dict):
                    continue
                if msg.get("role") == "tool" and msg.get("name") == "generate_tool":
                    try:
                        content = msg.get("content")
                        if not content:
                            continue
                        tool_data = json.loads(content if isinstance(content, str) else "{}")
                        if tool_data.get("success") and tool_data.get("tool_name"):
                            # Use credential_fields from tool generator, normalize to fields for frontend
                            credential_fields = tool_data.get("credential_fields", [])
                            pending_tools.append({
                                "name": tool_data.get("tool_name"),
                                "display_name": tool_data.get("display_name", tool_data.get("tool_name")),
                                "description": tool_data.get("description"),
                                "fields": credential_fields  # Frontend expects "fields"
                            })
                    except Exception as tool_extract_err:
                        logger.debug(f"Could not extract tool from message: {tool_extract_err}")
                        pass
            
            return {
                "error": "Config assistant returned an empty response after tool execution.",
                "response_message": "Sorry, I couldn't finish generating that integration. Please try again.",
                "pending_tools": pending_tools if pending_tools else None
            }
        
        logger.info(f"Raw OpenAI response: {result_text[:200]}")

        # Helper to strip code fences and parse JSON
        def _clean_and_parse_json(text: str) -> Dict[str, Any]:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                parts = cleaned.split("```")
                if len(parts) >= 2:
                    code_content = parts[1]
                    if code_content.startswith("json"):
                        code_content = code_content[4:]
                    cleaned = code_content.strip()
                else:
                    cleaned = cleaned.replace("```json", "").replace("```", "").strip()

            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                # Fallback: try to extract the first JSON object substring
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL)
                if json_match:
                    candidate = json_match.group(0).strip()
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        pass
                raise

        # Attempt to parse JSON payload
        try:
            parsed = _clean_and_parse_json(result_text)
            logger.info(f"Extracted JSON text: {json.dumps(parsed)[:200]}")
            logger.info(f"Successfully parsed command: {parsed}")

            def _normalize_pending_tools(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
                raw_tools = None
                if isinstance(payload.get("pending_tools"), list):
                    raw_tools = payload.get("pending_tools")
                elif isinstance(payload.get("pendingTools"), list):
                    raw_tools = payload.get("pendingTools")
                elif payload.get("pending_tool"):
                    maybe_tool = payload.get("pending_tool")
                    raw_tools = maybe_tool if isinstance(maybe_tool, list) else [maybe_tool]

                if not raw_tools:
                    return []

                normalized_list: List[Dict[str, Any]] = []
                for tool in raw_tools:
                    if not isinstance(tool, dict):
                        continue
                    name = tool.get("name") or tool.get("tool_name") or tool.get("toolName")
                    display_name = tool.get("display_name") or tool.get("displayName") or name
                    credential_fields = tool.get("fields") or tool.get("credential_fields") or tool.get("credentialFields") or []
                    normalized_tool = {
                        "name": name or display_name or "custom_integration",
                        "display_name": display_name or name or "Custom Integration",
                        "description": tool.get("description"),
                        "icon": tool.get("icon"),
                        "fields": credential_fields
                    }
                    if tool.get("requires_oauth"):
                        normalized_tool["requires_oauth"] = True
                        normalized_tool["oauth_provider"] = tool.get("oauth_provider")
                        normalized_tool["oauth_scopes"] = tool.get("oauth_scopes") or []
                        normalized_tool["oauth_instructions"] = tool.get("oauth_instructions")
                    normalized_list.append(normalized_tool)
                return normalized_list

            pending_tools = _normalize_pending_tools(parsed)
            
            # CRITICAL FIX: If tools were mentioned but not in response, extract from tool calls
            if not pending_tools and mentions_tools:
                logger.warning("[Config Chat] Tools mentioned but not in response - extracting from tool calls")
                for msg in convo:
                    if not msg or not isinstance(msg, dict):
                        continue
                    if msg.get("role") == "tool" and msg.get("name") == "generate_tool":
                        try:
                            content = msg.get("content")
                            if not content:
                                continue
                            tool_data = json.loads(content if isinstance(content, str) else "{}")
                            if tool_data.get("success") and tool_data.get("tool_name"):
                                credential_fields = tool_data.get("credential_fields", [])
                                pending_tools.append({
                                    "name": tool_data.get("tool_name"),
                                    "display_name": tool_data.get("display_name", tool_data.get("tool_name")),
                                    "description": tool_data.get("description", ""),
                                    "fields": credential_fields,
                                    "tool_code": tool_data.get("tool_code"),
                                    "requires_oauth": tool_data.get("requires_oauth", False),
                                    "oauth_provider": tool_data.get("oauth_provider"),
                                    "oauth_scopes": tool_data.get("oauth_scopes", []),
                                    "oauth_instructions": tool_data.get("oauth_instructions", "")
                                })
                        except Exception as extract_err:
                            logger.debug(f"Could not extract tool from conversation: {extract_err}")
                            pass
                
                if pending_tools:
                    logger.info(f"[Config Chat] Extracted {len(pending_tools)} tools from conversation")
                    parsed["pending_tools"] = pending_tools
                    parsed["pendingTools"] = pending_tools
                    if "response_message" not in parsed or not parsed.get("response_message"):
                        parsed["response_message"] = f"I've set up {len(pending_tools)} integration(s). Please provide your credentials."
            
            # Extract tool data from conversation to preserve instructions from tool generator
            for msg in convo:
                if not msg or not isinstance(msg, dict):
                    continue
                if msg.get("role") == "tool" and msg.get("name") == "generate_tool":
                    try:
                        content = msg.get("content")
                        if not content:
                            continue
                        tool_data = json.loads(content if isinstance(content, str) else "{}")
                        if tool_data.get("success") and tool_data.get("credential_fields"):
                            # Find matching tool in pending_tools and merge instructions
                            tool_name = tool_data.get("tool_name")
                            tool_display_name = tool_data.get("display_name")
                            
                            for pending_tool in pending_tools:
                                # Match by name or display_name
                                if (pending_tool.get("name") == tool_name or 
                                    pending_tool.get("name") == tool_display_name or
                                    pending_tool.get("display_name") == tool_name or
                                    pending_tool.get("display_name") == tool_display_name):
                                    
                                    # Get fields from tool generator (with instructions)
                                    tool_fields = tool_data.get("credential_fields", [])
                                    pending_fields = pending_tool.get("fields", [])
                                    
                                    # Create a map of pending fields by name for quick lookup
                                    field_map = {f.get("name"): f for f in pending_fields}
                                    
                                    # Merge instructions from tool generator into pending fields
                                    for tool_field in tool_fields:
                                        field_name = tool_field.get("name")
                                        if field_name in field_map:
                                            # Preserve all properties from tool generator field
                                            if tool_field.get("instructions"):
                                                field_map[field_name]["instructions"] = tool_field.get("instructions")
                                            # Also preserve other properties that might be missing
                                            if tool_field.get("placeholder") and not field_map[field_name].get("placeholder"):
                                                field_map[field_name]["placeholder"] = tool_field.get("placeholder")
                                            if tool_field.get("helpText") and not field_map[field_name].get("helpText"):
                                                field_map[field_name]["helpText"] = tool_field.get("helpText")
                                        else:
                                            # Field from tool generator not in pending - add it
                                            field_map[field_name] = tool_field
                                    
                                    # Update pending_tool with merged fields
                                    pending_tool["fields"] = list(field_map.values())
                                    if tool_data.get("requires_oauth"):
                                        pending_tool["requires_oauth"] = True
                                        pending_tool["oauth_provider"] = tool_data.get("oauth_provider")
                                        pending_tool["oauth_scopes"] = tool_data.get("oauth_scopes")
                                        pending_tool["oauth_instructions"] = tool_data.get("oauth_instructions")
                                    break
                    except Exception as merge_err:
                        logger.debug(f"Could not merge tool instructions: {merge_err}")
                        pass
            
            # Final safety check: If tools were generated but not in response, add them
            if not pending_tools:
                for msg in convo:
                    if not msg or not isinstance(msg, dict):
                        continue
                    if msg.get("role") == "tool" and msg.get("name") == "generate_tool":
                        try:
                            content = msg.get("content")
                            if not content:
                                continue
                            tool_data = json.loads(content if isinstance(content, str) else "{}")
                            if tool_data.get("success") and tool_data.get("tool_name"):
                                if not pending_tools:
                                    pending_tools = []
                                credential_fields = tool_data.get("credential_fields", [])
                                pending_tools.append({
                                    "name": tool_data.get("tool_name"),
                                    "display_name": tool_data.get("display_name", tool_data.get("tool_name")),
                                    "description": tool_data.get("description", ""),
                                    "fields": credential_fields,
                                    "tool_code": tool_data.get("tool_code"),
                                    "requires_oauth": tool_data.get("requires_oauth", False),
                                    "oauth_provider": tool_data.get("oauth_provider"),
                                    "oauth_scopes": tool_data.get("oauth_scopes", []),
                                    "oauth_instructions": tool_data.get("oauth_instructions", "")
                                })
                        except Exception as final_extract_err:
                            logger.debug(f"Final tool extraction failed: {final_extract_err}")
                            pass
            
            if pending_tools:
                parsed["pending_tools"] = pending_tools
                parsed["pendingTools"] = pending_tools  # legacy casing for any existing consumers
                logger.info(f"[Config Chat] Final: Added {len(pending_tools)} tools to response")

            # Add events to response for frontend (always include, even if empty)
            parsed["events"] = config_events
            parsed["wx_events"] = config_events  # legacy name for compatibility
            if config_events:
                logger.info(f"[Config Chat] Added {len(config_events)} events to response")
                print(f"📤 [CONFIG CHAT] ========== SENDING EVENTS TO FRONTEND ==========")
                print(f"📤 [CONFIG CHAT] Total events: {len(config_events)}")
                print(f"📤 [CONFIG CHAT] Events list:")
                for i, ev in enumerate(config_events, 1):
                    print(f"📤 [CONFIG CHAT]   Event {i}: {ev.get('type')} - {ev}")
                print(f"📤 [CONFIG CHAT] Events added to parsed['events']: {parsed.get('events')}")
                print(f"📤 [CONFIG CHAT] Events added to parsed['wx_events']: {parsed.get('wx_events')}")
            else:
                print(f"⚠️ [CONFIG CHAT] WARNING: No events to send! config_events is empty")

            # Ensure response_message is always present
            if "response_message" not in parsed:
                if pending_tools:
                    tool_names = [t.get("display_name", t.get("name", "integration")) for t in pending_tools]
                    parsed["response_message"] = f"I've set up {', '.join(tool_names)} integration(s). Please provide your credentials in the form that just appeared."
                else:
                    logger.error(f"Config chat response missing response_message field. Parsed: {parsed}")
                    return {
                        "error": "Config assistant failed to generate response",
                        "response_message": "Sorry, I encountered an error. Please try again."
                    }

            # --- PATCH: Only apply/validate config if all required fields are valid ---
            required_fields = ["tone", "model"]
            def valid_model_field():
                model_val = parsed.get("model")
                avail = current_config.get("available_models", [])
                return bool(model_val) and isinstance(model_val, str) and model_val in avail
            def valid_examples_field():
                examples_val = parsed.get("examples")
                if examples_val is None:
                    examples_val = ""
                # Handle list case - convert to string
                if isinstance(examples_val, list):
                    examples_val = "\n".join(str(item) for item in examples_val)
                # Ensure it's a string
                if not isinstance(examples_val, str):
                    examples_val = str(examples_val) if examples_val else ""
                # Examples must have at least 2 Q/A pairs in proper format (matching system prompt's request for 2-3)
                import re as _re
                matches = _re.findall(r'\d+\. Q: .*?A: .*?(?=\d+\. Q: |$)', examples_val, _re.DOTALL)
                return isinstance(examples_val, str) and len(matches) >= 2
            # On first message, or while model/examples are invalid, just show response_message
            if (
                "response_message" in parsed and
                (
                    not valid_model_field() or not valid_examples_field()
                )
            ):
                logger.info(f"[Config Chat] Returning greeting/step: response_message only (no config update). Model valid: {valid_model_field()}, Examples valid: {valid_examples_field()}. Parsed: {parsed}")
                result_payload = {"response_message": parsed["response_message"]}
                if parsed.get("pending_tools"):
                    result_payload["pending_tools"] = parsed["pending_tools"]
                return result_payload
            # Always log the full parsed response for every turn
            logger.info(f"[Config Chat] LLM parsed output: {parsed}")
            
            # Normalize examples if it's a list (convert to string)
            if "examples" in parsed and isinstance(parsed["examples"], list):
                parsed["examples"] = "\n".join(str(item) for item in parsed["examples"])
            
            # If user confirmed and we have minimum fields, try to fill missing ones from current_config
            if is_confirmation:
                logger.info(f"[Config Chat] User confirmed. Checking if we can finalize with current config...")
                # Fill missing fields from current_config if not in parsed (CRITICAL: include instructions for Test Chat)
                for field in ["tone", "model", "rules", "purpose", "role", "instructions", "response_format", "temperature", "examples"]:
                    if not parsed.get(field) and current_config.get(field):
                        parsed[field] = current_config[field]
                        logger.info(f"[Config Chat] Filled missing {field} from current_config")
            
            # When config is complete, mark status as ready, else show full missing info
            # CRITICAL: instructions is required for Test Chat to unlock
            # Note: platform is optional but recommended
            required_final_fields = ["tone", "model", "rules", "purpose", "role", "instructions", "response_format", "temperature", "examples", "generated_system_prompt", "response_message"]
            missing_final = [f for f in required_final_fields if not parsed.get(f)]
            
            # Detailed logging for debugging
            logger.info(f"🔍 [Config Chat] Finalization check:")
            logger.info(f"🔍 [Config Chat] Required fields: {required_final_fields}")
            logger.info(f"🔍 [Config Chat] Parsed fields present: {[f for f in required_final_fields if parsed.get(f)]}")
            logger.info(f"🔍 [Config Chat] Missing fields: {missing_final}")
            logger.info(f"🔍 [Config Chat] Model valid: {valid_model_field()}")
            logger.info(f"🔍 [Config Chat] Examples valid: {valid_examples_field()}")
            logger.info(f"🔍 [Config Chat] Critical Test Chat fields check:")
            role_val = parsed.get('role')
            instructions_val = parsed.get('instructions')
            model_val = parsed.get('model')
            logger.info(f"   - role: {'✅' if role_val else '❌ MISSING'} = {str(role_val)[:50] if role_val else 'NONE'}")
            logger.info(f"   - instructions: {'✅' if instructions_val else '❌ MISSING'} = {str(instructions_val)[:50] if instructions_val else 'NONE'}")
            logger.info(f"   - model: {'✅' if model_val else '❌ MISSING'} = {str(model_val) if model_val else 'NONE'}")
            
            if valid_model_field() and valid_examples_field() and not missing_final:
                parsed["config_status"] = "ready"
                logger.info(f"✅ [Config Chat] FINAL CONFIG: All required fields present. Will save/unlock with config")
                logger.info(f"✅ [Config Chat] Config status set to 'ready'")
            else:
                logger.warning(
                    f"❌ [Config Chat] FINALIZATION BLOCKED! Missing fields: {missing_final} | "
                    f"Model valid: {valid_model_field()} | Examples valid: {valid_examples_field()}"
                )
                logger.warning(f"❌ [Config Chat] This means Test Chat will remain LOCKED!")
                logger.warning(f"❌ [Config Chat] Parsed keys: {list(parsed.keys())}")
                parsed["config_status"] = "incomplete"
                # Don't show error message if user just confirmed - let AI handle it gracefully
                if not is_confirmation:
                    parsed["error"] = "Finalization missing required fields."
                    parsed["response_message"] = (
                        f"Some required config fields are missing: {', '.join(missing_final)}. "
                        "See console/logs for details. Please restart summary/finalization or contact support."
                    )
            return parsed
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from OpenAI response: {json_err}")
            logger.error(f"JSON text that failed: {result_text}")
            # Try to provide a more helpful error message
            error_msg = f"JSON parsing failed: {str(json_err)}"
            return {"error": error_msg}
        
    except json.JSONDecodeError as json_err:
        logger.error(f"Failed to parse JSON from OpenAI response: {json_err}")
        logger.error(f"Response text: {result_text if 'result_text' in locals() else 'N/A'}")
        return {
            "error": f"Failed to parse command: {str(json_err)}",
            "response_message": "Sorry, I couldn't understand the response format. Please try again."
        }
    except Exception as e:
        logger.error(f"❌ [Config Chat] CRITICAL ERROR in parse_chat_command: {e}", exc_info=True)
        logger.error(f"❌ [Config Chat] Message: {message[:100] if message else 'None'}")
        logger.error(f"❌ [Config Chat] Current config keys: {list(current_config.keys()) if current_config else 'None'}")
        return {
            "error": str(e),
            "response_message": f"Sorry, I encountered an error: {str(e)}. Please try again or contact support."
        }


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
        # Extract platform and response_format from instructions if they exist
        import re
        instructions_text = prompt_config.instructions
        platform_match = re.search(r'(?i)platform[:\s]+([^\n]+)', instructions_text)
        format_match = re.search(r'(?i)response[_\s]?format[:\s]+([^\n]+)', instructions_text)
        
        # Remove platform/format lines from instructions before adding
        clean_instructions = re.sub(r'(?i)(platform|response[_\s]?format)[:\s]+[^\n]+\n?', '', instructions_text).strip()
        
        if clean_instructions:
            parts.append(f"\nInstructions:\n{clean_instructions}")
        
        # Add platform and format as separate sections if found
        if platform_match:
            parts.append(f"\nPlatform/Integration: {platform_match.group(1).strip()}")
        if format_match:
            parts.append(f"\nResponse Format: {format_match.group(1).strip()}")
    
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

        # Inject uploaded documents into system prompt
        try:
            from app.models.uploaded_document import UploadedDocument
            docs_result = await db.execute(
                select(UploadedDocument)
                .where(UploadedDocument.wrapped_api_id == wrapped_api.id)
                .order_by(UploadedDocument.created_at.desc())
            )
            documents = docs_result.scalars().all()
            if documents:
                doc_context = "\n\n=== UPLOADED DOCUMENTS ===\n"
                for doc in documents:
                    doc_name = doc.filename or "Untitled Document"
                    if doc.extracted_text:
                        # Use full extracted text
                        doc_context += f"\n--- {doc_name} ---\n{doc.extracted_text}\n"
                    else:
                        # Fallback to preview
                        preview = extract_text_preview(
                            content_b64=doc.content,
                            file_type=doc.file_type,
                            mime_type=doc.mime_type,
                            max_chars=1000
                        )
                        if preview:
                            doc_context += f"\n--- {doc_name} (preview) ---\n{preview}\n"
                doc_context += "\n=== END OF DOCUMENTS ===\n"
                system_prompt = (system_prompt + doc_context).strip()
        except Exception as doc_err:
            logger.warning(f"Failed to inject documents into system prompt: {doc_err}")

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
            "openai": "gpt-4-turbo",  # Changed to GPT-4 for better function calling
            "anthropic": "claude-3-haiku-20240307",
            "deepseek": "deepseek-chat",
            "groq": "llama-3.1-8b-instant",
            "gemini": "gemini-pro",
            "mistral": "mistral-tiny",
            "cohere": "command",
            "together_ai": "meta-llama/Llama-2-7b-chat-hf",
            "perplexity": "llama-3.1-sonar-small-128k-online",
            "anyscale": "meta-llama/Llama-2-7b-chat-hf",
            "azure": "gpt-4-turbo",  # Changed to GPT-4
            "openrouter": "openai/gpt-4-turbo",  # Changed to GPT-4
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
            params["max_completion_tokens"] = wrapped_api.max_tokens
        if wrapped_api.top_p is not None:
            params["top_p"] = wrapped_api.top_p
        if wrapped_api.frequency_penalty is not None:
            params["frequency_penalty"] = wrapped_api.frequency_penalty
        
        if provider.api_base_url:
            params["api_base"] = provider.api_base_url

        # Load custom tools from database
        custom_tools_data = {}  # Store tool code and credentials
        async def load_custom_tools() -> List[dict]:
            """Load custom tools from wrap_tools and wrap_credentials tables"""
            tool_definitions = []
            try:
                # Import models locally to avoid circular dependency
                from app.models.wrap_tool import WrapTool
                from app.models.wrap_credential import WrapCredential

                # Load custom tools for this wrap
                tools_result = await db.execute(
                    select(WrapTool).where(
                        WrapTool.wrap_id == wrapped_api.id,
                        WrapTool.is_active == True
                    )
                )
                custom_tools = tools_result.scalars().all()

                # Load credentials for this wrap
                creds_result = await db.execute(
                    select(WrapCredential).where(WrapCredential.wrap_id == wrapped_api.id)
                )
                credentials_map = {cred.tool_name: cred for cred in creds_result.scalars().all()}

                # Build tool definitions and store execution data
                for tool in custom_tools:
                    # Get credentials for this tool
                    cred = credentials_map.get(tool.tool_name)
                    if cred:
                        # Decrypt credentials
                        decrypted_creds = decrypt_api_key(cred.credentials_json)
                        creds_dict = json.loads(decrypted_creds)
                    else:
                        logger.warning(f"No credentials found for tool: {tool.tool_name}")
                        creds_dict = {}

                    # Store tool code and credentials for execution
                    custom_tools_data[tool.tool_name] = {
                        "code": tool.tool_code,
                        "credentials": creds_dict,
                        "description": tool.description
                    }

                    # Create tool definition for LLM
                    tool_def = {
                        "type": "function",
                        "function": {
                            "name": tool.tool_name,
                            "description": tool.description or f"Execute {tool.tool_name}",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                                "required": []
                            }
                        }
                    }
                    tool_definitions.append(tool_def)
                    logger.info(f"Loaded custom tool: {tool.tool_name}")

            except Exception as e:
                logger.error(f"Error loading custom tools: {e}", exc_info=True)

            return tool_definitions

        # Define built-in tools
        builtin_tools = []

        # Add web_search if enabled
        web_search_mode = getattr(wrapped_api, "web_search", None)
        web_search_enabled_toggle = getattr(wrapped_api, "web_search_enabled", False)
        web_search_active = (web_search_mode is not None and web_search_mode != "off") or web_search_enabled_toggle
        if web_search_active:
            builtin_tools.append({
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
            })

        # Load and combine custom tools
        custom_tool_defs = await load_custom_tools()
        all_tools = builtin_tools + custom_tool_defs

        # Set tools parameter
        if tools:
            params["tools"] = tools
        elif all_tools:
            params["tools"] = all_tools
        else:
            params["tools"] = []

        # Helper to execute custom tool code safely
        async def execute_custom_tool(tool_code: str, credentials: dict, params: dict) -> str:
            """
            Execute custom tool code in a controlled environment

            Args:
                tool_code: Python code with execute_tool function
                credentials: Decrypted credentials dict
                params: Runtime parameters from LLM

            Returns:
                Tool execution result as string
            """
            import asyncio

            try:
                # Create execution namespace with limited builtins
                namespace = {
                    "__builtins__": {
                        "print": print,
                        "len": len,
                        "str": str,
                        "int": int,
                        "float": float,
                        "bool": bool,
                        "dict": dict,
                        "list": list,
                        "tuple": tuple,
                        "range": range,
                        "enumerate": enumerate,
                        "zip": zip,
                        "isinstance": isinstance,
                        "json": json,
                        "Exception": Exception,
                    },
                    "json": json,
                    "urllib": urllib,
                    "os": os,  # Allow os for env vars
                }

                # Execute the tool code to define execute_tool function
                exec(tool_code, namespace)

                # Check if execute_tool function exists
                if "execute_tool" not in namespace:
                    raise ValueError("Tool code must define execute_tool function")

                execute_tool_fn = namespace["execute_tool"]

                # Execute the tool function
                # Handle both sync and async functions
                result = execute_tool_fn(credentials, **params)

                # If result is a coroutine, await it
                if asyncio.iscoroutine(result):
                    result = await result

                # Convert result to string if it's a dict
                if isinstance(result, dict):
                    return json.dumps(result)
                else:
                    return str(result)

            except Exception as e:
                logger.error(f"Custom tool execution error: {e}", exc_info=True)
                raise ValueError(f"Tool execution failed: {str(e)}")

        # Helper to execute web search using Google Custom Search API
        def execute_web_search(query: str, max_results: int = 5) -> str:
            google_cse_key = settings.google_cse_api_key
            google_cse_id = settings.google_cse_id

            logger.info(f"🔍 WEB SEARCH INITIATED")
            logger.info(f"  Query: '{query}'")
            logger.info(f"  Max Results: {max_results}")
            logger.info(f"  GOOGLE_CSE_API_KEY available: {bool(google_cse_key)}")
            logger.info(f"  GOOGLE_CSE_ID available: {bool(google_cse_id)}")

            # Check if Google CSE is configured
            if not google_cse_key or not google_cse_id:
                error_msg = "Google Custom Search API not configured. Please set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID environment variables."
                logger.error(f"❌ {error_msg}")
                return error_msg

            try:
                logger.info(f"🔍 Using Google Custom Search API")
                
                url = f"https://www.googleapis.com/customsearch/v1?key={google_cse_key}&cx={google_cse_id}&q={urllib.parse.quote(query)}&num={min(max_results, 10)}"
                logger.info(f"  URL: {url}")

                req = urllib.request.Request(
                    url=url,
                    headers={"User-Agent": "Wrap-X/1.0"},
                    method="GET",
                )

                logger.info(f"  Sending request...")
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))

                logger.info(f"  ✅ Google CSE response received")
                logger.info(f"  Response keys: {list(data.keys())}")

                results = data.get("items", [])[:max_results]
                logger.info(f"  Results found: {len(results)}")

                lines = [
                    f"- {r.get('title')}: {r.get('snippet')} (source: {r.get('link')})"
                    for r in results
                ]

                result_text = "Search results:\n" + "\n".join(lines) if lines else "No results found."
                logger.info(f"✅ Google CSE search completed: {len(lines)} results")
                return result_text

            except (HTTPError, URLError, TimeoutError) as e:
                logger.error(f"❌ Web search HTTP/URL error: {e}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   HTTP Code: {getattr(e, 'code', 'N/A')}")
                logger.error(f"   Reason: {getattr(e, 'reason', 'N/A')}")
                logger.error(f"   URL: {getattr(e, 'url', 'N/A')}")
                logger.error(f"   Stack trace:", exc_info=True)
                return f"Web search failed: {type(e).__name__} - {e}"
            except Exception as e:
                logger.error(f"❌ Web search unexpected error: {e}")
                logger.error(f"   Error type: {type(e).__name__}")
                logger.error(f"   Error message: {str(e)}")
                logger.error(f"   Error args: {e.args}")
                logger.error(f"   Stack trace:", exc_info=True)
                return f"Web search failed: {type(e).__name__} - {e}"
        
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

        # Call LiteLLM with safe fallback for provider-specific constraints (e.g., temperature unsupported)
        async def _acompletion_with_fallback(p: Dict[str, Any]):
            try:
                return await litellm.acompletion(**p)
            except Exception as e:
                msg = str(e)
                # Some providers/models only accept default temperature=1 or disallow the param entirely
                temp_err = (
                    "temperature" in msg and (
                        "unsupported" in msg.lower() or
                        "unsupported_value" in msg.lower() or
                        "only the default (1)" in msg.lower()
                    )
                )
                if temp_err:
                    # Retry without temperature
                    p2 = dict(p)
                    p2.pop("temperature", None)
                    try:
                        return await litellm.acompletion(**p2)
                    except Exception:
                        # Last attempt with explicit default = 1
                        p3 = dict(p2)
                        p3["temperature"] = 1
                        return await litellm.acompletion(**p3)
                raise

        # Call LiteLLM (first pass)
        response = await _acompletion_with_fallback(params)

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
        logger.info(f"🔧 Tool calls in response: {len(tool_calls)}")
        if tool_calls:
            logger.info(f"🔧 TOOL CALLS DETECTED - Processing {len(tool_calls)} tool call(s)")
            # Append the assistant message that contains tool_calls first
            formatted_messages.append({
                "role": "assistant",
                **{k: v for k, v in assistant_msg.items() if k in ("content", "tool_calls")}
            })
            for i, tc in enumerate(tool_calls):
                logger.info(f"🔧 Tool call {i+1}: {tc}")
                fn = tc.get("function", {})
                name = fn.get("name")
                args_str = fn.get("arguments") or "{}"
                logger.info(f"  Tool name: {name}")
                logger.info(f"  Arguments: {args_str}")

                try:
                    args = json.loads(args_str) if isinstance(args_str, str) else args_str
                except Exception as e:
                    logger.error(f"  ❌ Failed to parse arguments: {e}")
                    args = {"query": str(args_str)}

                # Emit event for UI with dynamic tool information
                tool_call_event = {"type": "tool_call", "name": name or "tool"}
                if args:
                    tool_call_event["args"] = args
                wx_events.append(tool_call_event)

                if name == "web_search":
                    logger.info(f"  ✅ WEB_SEARCH TOOL TRIGGERED!")
                    query = args.get("query", "")
                    max_results = int(args.get("max_results", 5))
                    logger.info(f"  Executing web search: '{query}' (max {max_results} results)")
                    result_text = execute_web_search(query, max_results)
                    logger.info(f"  Web search completed. Result length: {len(result_text)}")
                    # Add search result summary to event
                    wx_events.append({
                        "type": "tool_result",
                        "name": name or "tool",
                        "query": query,
                        "results_count": len(result_text.split("\n")) if result_text else 0
                    })
                elif name in custom_tools_data:
                    # Execute custom tool
                    tool_data = custom_tools_data[name]
                    try:
                        # Execute the custom tool code
                        result_text = await execute_custom_tool(
                            tool_code=tool_data["code"],
                            credentials=tool_data["credentials"],
                            params=args
                        )
                        wx_events.append({
                            "type": "tool_result",
                            "name": name,
                            "success": True
                        })
                    except Exception as tool_err:
                        logger.error(f"Custom tool execution error ({name}): {tool_err}", exc_info=True)
                        result_text = f"Tool execution failed: {str(tool_err)}"
                        wx_events.append({
                            "type": "tool_result",
                            "name": name,
                            "success": False,
                            "error": str(tool_err)
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
            response = await _acompletion_with_fallback(params)
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
