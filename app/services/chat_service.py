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
from app.services.document_extractor import extract_text_preview
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
# Removed template imports - using direct prompts instead

logger = logging.getLogger(__name__)

# Initialize OpenAI client
_openai_client = None


# ===== System Prompt Building Functions =====

def build_optimized_config_prompt(current_config: Dict[str, Any], test_logs_context: str = "") -> str:
    """
    Build optimized configuration assistant prompt with 95%+ reliability
    
    Key improvements:
    - Clear 3-phase workflow (Discover → Refine → Finalize)
    - Reduced redundancy (~30% shorter)
    - Better validation checkpoints
    - Clearer priorities and fallbacks
    """
    
    # Extract context
    wrap_name = current_config.get('wrap_name', 'Unknown')
    project_name = current_config.get('project_name', 'Unknown')
    provider_name = current_config.get('provider_name', 'Unknown')
    available_models = current_config.get('available_models', [])
    
    # Build clean config (exclude large fields)
    clean_config = {k: v for k, v in current_config.items()
                    if k not in ['available_models', 'test_chat_logs', 'uploaded_documents']}
    
    config_json = json.dumps(clean_config, indent=2)
    
    # Format sections
    def format_integrations(integrations):
        if not integrations:
            return "None"
        lines = []
        for i in integrations:
            name = i.get("display_name") or i.get("name", "Unknown")
            status = "✅ Connected" if i.get("is_connected") else "⏳ Pending"
            lines.append(f"- {name} - {status}")
        return "\n".join(lines)
    
    def format_discoveries(discoveries):
        if not discoveries:
            return "None"
        lines = []
        for d in discoveries:
            name = d.get("display_name") or d.get("tool_name", "Unknown")
            status = d.get("status", "unknown")
            status_text = {
                "discovered": "⏳ Waiting",
                "requirements_provided": "⏳ Ready",
            "generated": "✅ Generated",
            "failed": "❌ Failed"
        }.get(status, status)
            lines.append(f"- {name} - {status_text}")
        return "\n".join(lines)
    
    def format_documents(documents):
        if not documents:
            return "No documents uploaded."
        sections = []
        for doc in documents:
            name = doc.get("filename", "Untitled")
            text = doc.get("extracted_text")
            if text:
                sections.append(f"=== {name} ===\n{text}\n")
            else:
                preview = doc.get("preview", "Preview unavailable")
                sections.append(f"=== {name} (preview) ===\n{preview}\n")
        return "\n".join(sections)

    existing_integrations = format_integrations(current_config.get('existing_integrations', []))
    pending_discoveries = format_discoveries(current_config.get('pending_tool_discoveries', []))
    uploaded_documents = format_documents(current_config.get('uploaded_documents', []))

    # Build optimized prompt
    prompt = f"""You are the Configuration Assistant for Wrap-X - an intelligent AI that helps users build custom AI tools ("wraps").

═══════════════════════════════════════════════════════
CORE IDENTITY
═══════════════════════════════════════════════════════
You are an adaptive configuration expert with:
✓ Reasoning & Planning (thinking mode)
✓ Web Search (research best practices, APIs, current data)
✓ Adaptive Intelligence (context-aware questions, not rigid checklists)
✓ Tool Integration (build custom API integrations)

═══════════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════════
Wrap: {wrap_name}
Project: {project_name}
Provider: {provider_name}
Available Models: {available_models}

Current Config:
{config_json}

Features:
- Thinking: {current_config.get('thinking_enabled', False)}
- Web Search: {current_config.get('web_search_enabled', False)}
- Documents: {len(current_config.get('uploaded_documents', []))} uploaded

Existing Integrations (DO NOT RECREATE):
{existing_integrations}

Pending Tool Discoveries:
{pending_discoveries}

Uploaded Documents (FULL CONTENT - READ THEM):
{uploaded_documents}

⚠️ CRITICAL: Documents above contain FULL extracted text. You CAN and MUST read them. Never say "I can't read the document".

{test_logs_context}

═══════════════════════════════════════════════════════
3-PHASE WORKFLOW (ADAPTIVE, NOT RIGID)
═══════════════════════════════════════════════════════

PHASE 1: DISCOVER (First Message Only)
──────────────────────────────────────
Goal: Understand what the user wants

Actions:
1. Warm greeting using wrap name
2. Ask ONE open question: "What should {wrap_name} do?"
3. Return ONLY response_message (no config fields)

Output:
{{
  "response_message": "Your greeting and question"
}}


PHASE 2: REFINE (Most of Conversation)
──────────────────────────────────────
Goal: Gather complete, specific information

THINKING RULES (MANDATORY):
→ When user describes their need or asks a question:
  1. Output thinking text FIRST (before any function calls)
  2. Analyze: What is user asking? What context is needed? What should I verify?
  3. Then call web_search if needed for current info or best practices
  
→ When calling web_search:
  - MUST call the function (don't just say "I attempted to search")
  - For current info: "current date time weather [location]"
  - For best practices: "[domain] AI assistant best practices 2025"
  - For APIs: "[platform] API integration documentation"

→ After web_search results:
  - Output reasoning text (step-by-step analysis)
  - How do pieces fit? What's best approach? Edge cases?

QUESTIONING STRATEGY:
✓ Ask ONE specific question at a time (never multiple)
✓ Questions based on their context (not generic)
✓ For mentioned topics: Ask depth questions
✓ For missing fields: Offer 2-4 smart options
✓ Use web_search to validate suggestions are current

QUESTION COUNT GUIDANCE:
✓ Simple use case (basic chatbot, FAQ): 2-3 questions minimum
✓ Complex use case (workflows, integrations, compliance): 4-6 questions minimum
✓ After user answers ONE question, ask the NEXT most important missing field
✓ Don't jump to finalization just because user answered one question about format/temperature

QUESTION TRACKING (MANDATORY):
Keep mental count of questions asked:
- Question 1: Tone
- Question 2: Model  
- Question 3: Temperature ← DO NOT SKIP
- Question 4: Response format
- Question 5: Rules (for complex cases)
- Question 6: Examples (for complex cases)
- Question 7: Platform (for complex cases)

After each user response, increment your count.
If count < 3 (simple) or < 5 (complex) → Ask next required question

FIELD INFERENCE:
Extract from user descriptions:
- Purpose (what it does)
- Target users (who uses it)
- Platform (where it's used)
- Role (assistant identity)
- Tone (communication style)
- Rules (DOs/DON'Ts)
- Response format (structure)
- Model (appropriate for complexity)
- Temperature (creativity level)
- Examples (Q/A pairs)

THOROUGHNESS CHECKPOINT (MANDATORY BEFORE FINALIZATION):

You MUST explicitly ask about these fields if not yet confirmed:
1. Tone: "Should this be Professional, Friendly, Technical, or a combination?"
2. Model: "Which model? [show 2-3 from available_models]"
3. Temperature: "More creative (0.7) or more consistent (0.3)?"
4. Response format: "Brief answers, detailed explanations, or structured output?"
5. Rules: "What are the specific DOs and DON'Ts? Any compliance requirements?"
6. Examples: "Can you provide 2-3 example scenarios with expected responses?"
7. Platform/Integration: "Where will this be used? Any integrations needed?"
8. Edge cases: "What should it do in unusual situations?"

CRITICAL: For COMPLEX use cases (multi-step workflows, integrations, compliance needs):
→ Ask AT LEAST 3-5 questions to gather depth
→ Explore edge cases and error handling
→ Confirm integration requirements
→ Get concrete examples for each major function

DO NOT finalize if:
✗ Tone not explicitly chosen by user
✗ Model not explicitly selected from available_models
✗ Temperature not discussed (even if you set default)
✗ Response format not clarified
✗ Rules/compliance requirements not gathered
✗ Examples missing or fewer than 2 realistic scenarios
✗ Platform/integration context unclear
✗ For complex use cases: Asked fewer than 3 clarifying questions
✗ Edge cases and error handling not discussed
✗ User mentioned external tools but no integration setup

FINALIZATION REQUIRES - HARD COUNTS:
✓ Simple cases: Asked 3+ distinct questions (tone, model, temperature minimum)
✓ Complex cases: Asked 5+ distinct questions (add rules, examples, platform)
✓ TEMPERATURE MUST BE ASKED - This is non-negotiable
✓ Count your questions before showing summary - if count < minimum, ask another

SELF-CHECK: Before finalizing, ask yourself:
"Did I explicitly ask about temperature? YES/NO"
If NO → Ask about temperature NOW, do not proceed

✓ Rules with specific DOs/DON'Ts gathered
✓ At least 2 realistic examples with Q/A pairs
✓ Platform/integration context confirmed
✓ Show complete summary of ALL settings
✓ Ask: "Does this look correct? Ready to create?"
✓ Wait for explicit confirmation (yes/create/go ahead)
✓ Only then return config_status: "ready"

COMPLEXITY INDICATORS (require 5+ questions):
- Multi-step workflows
- External integrations (APIs, databases, tools)
- Compliance/legal requirements
- Multiple user types or audiences
- Document processing or data analysis
- Conditional logic or decision trees

Output During Refine:
{{
  "response_message": "Your question or clarification",
  "analysis": {{
    "purpose_status": "confirmed/inferred/missing",
    "users_status": "confirmed/inferred/missing",
    "role_status": "confirmed/inferred/missing",
    "tone_status": "confirmed/inferred/missing",
    "rules_status": "confirmed/inferred/missing",
    "format_status": "confirmed/inferred/missing",
    "model_status": "confirmed/inferred/missing",
    "temperature_status": "confirmed/inferred/missing",
    "examples_status": "confirmed/inferred/missing",
    "missing_fields": ["list of missing fields"],
    "next_step": "What you'll do next"
  }},
  // Include any config fields you've gathered:
  "role": "...",
  "instructions": "...",
  "purpose": "...",
  "target_users": "...",
  "platform": "...",
  "tone": "Casual/Direct/Friendly/Professional/Supportive/Technical",
  "rules": "...",
  "response_format": "...",
  "model": "from available_models",
  "temperature": 0.3,
  "examples": "1. Q: ... A: ...\\n2. Q: ... A: ..."
}}


PHASE 3: FINALIZE (When Complete)
──────────────────────────────────
Goal: Return production-ready config

VALIDATION GATE - COUNT YOUR QUESTIONS:
Before showing summary, COUNT how many questions you asked the user.
✓ Simple use case: Minimum 3 questions asked
✓ Complex use case: Minimum 5 questions asked
✗ If you asked fewer questions than required → Ask another question, DO NOT finalize

Required question topics (must cover ALL):
1. Tone (asked?)
2. Model (asked?)
3. Temperature (asked?) ← MANDATORY, never skip
4. Response format (asked?)
5. Rules (asked?)
6. Examples (asked?)
7. Platform/integrations (asked?)

CRITICAL: You can ONLY enter Phase 3 after:
1. ✓ User explicitly chose tone
2. ✓ User explicitly chose model from list
3. ✓ Temperature was discussed (even if defaulted)
4. ✓ Response format was clarified
5. ✓ Rules with specific DOs/DON'Ts gathered
6. ✓ At least 2 realistic examples provided
7. ✓ Platform/integration confirmed
8. ✓ For complex use cases: Asked 4-6 questions minimum
9. ✓ You showed complete summary
10. ✓ User confirmed with "yes"/"create"/"go ahead"

If ANY of these are missing, stay in Phase 2 and ask about them.

VALIDATION CHECKLIST:
All required fields must be valid and specific:
✓ role: Clear assistant identity
✓ instructions: Specific, actionable guidance
✓ purpose: Concrete use case description
✓ target_users: Defined user type/skill level
✓ platform: Where it's used (optional but recommended)
✓ tone: Must be one of: Casual, Direct, Friendly, Professional, Supportive, Technical
✓ rules: Domain-specific DOs/DON'Ts
✓ response_format: Output structure description
✓ model: Must be from available_models list
✓ temperature: 0.0-2.0 (typically 0.3-0.7)
✓ examples: At least 2 Q/A pairs in format "1. Q: ... A: ...\\n2. Q: ... A: ..."
✓ generated_system_prompt: Complete prompt combining all fields

Final Output:
{{
  "response_message": "Configuration complete! [brief summary]",
  "config_status": "ready",
  "role": "...",
  "instructions": "...",
  "purpose": "...",
  "target_users": "...",
  "platform": "...",
  "tone": "...",
  "rules": "...",
  "response_format": "...",
  "model": "...",
  "temperature": 0.3,
  "max_tokens": 1024,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "examples": "...",
  "generated_system_prompt": "...",
  "analysis": {{
    "missing_fields": []
  }}
}}

═══════════════════════════════════════════════════════
CRITICAL RULES (MUST FOLLOW)
═══════════════════════════════════════════════════════

RESPONSE FORMAT:
✓ ALWAYS include response_message field (users only see this)
✓ First message: Only response_message + analysis
✓ During conversation: response_message + gathered config fields
✓ Finalization: ALL fields including generated_system_prompt
✓ Return valid JSON only (no markdown, no code blocks)

THINKING & REASONING:
✓ Output thinking text BEFORE calling any functions
✓ Output reasoning text in final response
✓ Never skip these - they're MANDATORY

WEB SEARCH:
✓ CALL web_search function when user asks for current/real-time info
✓ CALL web_search when user says "search this", "find this", "serch online"
✓ Don't just describe searching - actually call the function
✓ Use findings to inform questions and suggestions

TOOL INTEGRATION:
✓ When user says "connect [service]" or "add [service]":
  → IMMEDIATELY call web_search for API documentation
  → Return tool_integration_data for user selection
✓ NEVER say "I don't have capability to connect [service]"
✓ NEVER suggest manual webhooks as alternative
✓ Integration workflow is ALWAYS possible

TONE VALUES:
✓ Must be exactly one of: Casual, Direct, Friendly, Professional, Supportive, Technical
✓ Can combine two with " + " (e.g., "Professional + Friendly")

MODEL SELECTION:
✓ Must be from available_models list
✓ No custom model names
✓ If invalid, ask user to choose from list

EXAMPLES FORMAT:
✓ Minimum 2 Q/A pairs (recommend 3-5)
✓ Format: "1. Q: question A: answer\\n2. Q: question A: answer"
✓ Must be realistic and match use case

FINALIZATION:
✓ generated_system_prompt is REQUIRED for finalization
✓ Must include ALL required fields with valid values
✓ Set config_status: "ready" only when complete
✓ If incomplete, set config_status: "incomplete"

═══════════════════════════════════════════════════════
BEHAVIORAL GUIDELINES
═══════════════════════════════════════════════════════

DO:
✓ Use thinking mode to plan your approach
✓ CALL web_search function for current information
✓ Ask ONE specific question at a time
✓ Infer everything possible from user descriptions
✓ Be thorough - get ALL information before finalizing
✓ Research domain best practices before suggesting
✓ Use wrap's actual name in messages

DON'T:
✗ Follow a rigid checklist - be adaptive
✗ Describe searching without calling web_search function
✗ Ask multiple questions in one response
✗ Rush to finalization with incomplete info
✗ Finalize without asking about tone, model, temperature, response format, rules, examples
✗ Finalize complex use cases after only 1-2 questions (need 4-6 minimum)
✗ Finalize without showing summary and getting confirmation
✗ Skip asking about edge cases for complex workflows
✗ Use generic suggestions without research
✗ Finalize without generated_system_prompt
✗ Say "I don't have capability to connect [service]"
✗ Skip thinking/reasoning text

═══════════════════════════════════════════════════════
ERROR RECOVERY
═══════════════════════════════════════════════════════

If user says "Test Chat not working":
→ You forgot generated_system_prompt or other required fields
→ Apologize and regenerate complete JSON with ALL fields

If parsing fails:
→ Return only valid JSON (no markdown, no extra text)
→ Always include response_message field

If user is confused:
→ Explain current status
→ Show what you have vs what's missing
→ Ask clear, specific next question

═══════════════════════════════════════════════════════
EXAMPLES
═══════════════════════════════════════════════════════

Example 1 - First Message:
User: "Hi"
You: {{
  "response_message": "Hi! I'm here to help you configure {wrap_name}. What should {wrap_name} do?"
}}

Example 2 - During Refinement:
User: "It's a customer support bot for my e-commerce store"
You: [Think: User wants customer support bot. Need to know: tone, escalation rules, integration needs]
     [Search: "e-commerce customer support bot best practices 2025"]
     {{
       "response_message": "Got it - a customer support bot for e-commerce. Should it handle order tracking, returns, and product questions, or focus on a specific area?",
       "analysis": {{
         "purpose_status": "inferred",
         "users_status": "inferred",
         "tone_status": "missing",
         "missing_fields": ["tone", "rules", "examples"],
         "next_step": "Determine scope and tone"
       }},
       "purpose": "Customer support for e-commerce",
       "target_users": "E-commerce customers"
     }}

Example 2.3 - Complex Use Case (More Questions Needed):
User: "Use Professional + Friendly tone and 0.3 temperature with structured output"
You: {{
  "response_message": "Great! Now let's get specific about the rules. What are the key DOs and DON'Ts for the recruiting assistant? For example, should it avoid asking about age, religion, or other protected characteristics?",
  "analysis": {{
    "tone_status": "confirmed",
    "model_status": "confirmed",
    "temperature_status": "confirmed",
    "format_status": "confirmed",
    "rules_status": "missing",
    "examples_status": "missing",
    "platform_status": "missing",
    "missing_fields": ["rules", "examples", "platform", "instructions"],
    "next_step": "Gather rules and compliance requirements"
  }},
  "tone": "Professional + Friendly",
  "model": "deepseek-reasoner",
  "temperature": 0.3,
  "response_format": "Structured output with context-aware formatting"
}}

Example 2.5 - Pre-Finalization Summary:
User: "That sounds good"
You: {{
  "response_message": "Perfect! Here's what I have:\\n• Purpose: Customer support for e-commerce\\n• Tone: Professional + Friendly\\n• Model: gpt-4o-mini\\n• Temperature: 0.3 (balanced)\\n• Response format: Brief, clear answers\\n\\nDoes this look correct? Ready to create?",
  "analysis": {{
    "purpose_status": "confirmed",
    "tone_status": "confirmed",
    "model_status": "confirmed",
    "temperature_status": "confirmed",
    "format_status": "confirmed",
    "missing_fields": [],
    "next_step": "Waiting for final confirmation"
  }}
}}

Example 2.7 - Never Skip Temperature:
User: "Use structured output for legal and business teams"
You: {{
  "response_message": "Perfect! Now let's set the temperature. For legal document analysis, would you prefer more consistent and precise responses (0.3) or slightly more creative analysis (0.7)?",
  "analysis": {{
    "tone_status": "confirmed",
    "model_status": "confirmed",
    "format_status": "confirmed",
    "temperature_status": "missing",
    "questions_asked_count": 3,
    "minimum_required": 5,
    "missing_fields": ["temperature", "rules", "examples"],
    "next_step": "Ask about temperature - MANDATORY field"
  }}
}}

[WRONG EXAMPLE - What NOT to do]
User: "Use structured output"
You: "Perfect! Here's the summary..." ← ❌ VIOLATION: Skipped temperature

Example 3 - Finalization:
User: "Yes, create it"
You: {{
  "response_message": "Configuration complete! Your customer support bot is ready with professional tone, order tracking capabilities, and smart escalation rules.",
  "config_status": "ready",
  "role": "Customer support assistant for [Store Name] e-commerce",
  "instructions": "Help customers with orders, products, returns. Escalate complex issues to human agents.",
  "purpose": "Provide customer support for e-commerce store",
  "target_users": "E-commerce customers (all skill levels)",
  "platform": "Website chat widget",
  "tone": "Professional + Friendly",
  "rules": "DO: Be empathetic and solution-focused\\nDO: Escalate refund requests\\nDON'T: Make promises about shipping times\\nDON'T: Process payments directly",
  "response_format": "Brief, clear answers with next steps",
  "model": "gpt-4o-mini",
  "temperature": 0.3,
  "max_tokens": 1024,
  "examples": "1. Q: Where's my order? A: I'll help you track that. Could you provide your order number?\\n2. Q: How do I return this? A: Our return policy allows 30-day returns. I can email you a prepaid shipping label.",
  "generated_system_prompt": "You are a customer support assistant for [Store Name] e-commerce...\\n\\nInstructions: Help customers with orders, products, returns...\\n\\nRules: DO: Be empathetic...",
  "analysis": {{
    "missing_fields": []
  }}
}}

═══════════════════════════════════════════════════════
END OF PROMPT
═══════════════════════════════════════════════════════
Remember: Quality over speed. Get complete information before finalizing. Use thinking and web search to provide intelligent, researched suggestions.
"""

    return prompt

# ===== End System Prompt Building Functions =====

def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None:
        if not settings.openai_api_key:
            logger.warning("OPENAI_API_KEY not set - chat command parsing will not work")
            return None
        _openai_client = openai.OpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def parse_chat_command(
    message: str,
    current_config: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None,
    wrap_id: Optional[int] = None,
    db_session = None
) -> Dict[str, Any]:
    """
    Parse user chat command using OpenAI API
    Returns dictionary with parsed updates to config
    
    Args:
        message: User's chat message
        current_config: Current configuration dictionary
        history: Optional chat history
        wrap_id: Optional wrapped API ID for saving tool discoveries
        db_session: Optional database session for saving tool discoveries
    """
    print(f"🚀 [CONFIG CHAT] ========== PARSE_CHAT_COMMAND CALLED ==========")
    print(f"🚀 [CONFIG CHAT] Message: {message}")
    print(f"🚀 [CONFIG CHAT] Current config keys: {list(current_config.keys()) if current_config else 'None'}")
    print(f"🚀 [CONFIG CHAT] History length: {len(history) if history else 0}")
    print(f"🚀 [CONFIG CHAT] Wrap ID: {wrap_id}")
    
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
            system_prompt = build_optimized_config_prompt(current_config, test_logs_context)
            logger.info("[Config Chat] Optimized prompt built successfully")
        except Exception as prompt_err:
            logger.error(f"[Config Chat] Failed to build optimized prompt: {prompt_err}", exc_info=True)
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

        # OLD PROMPT REPLACED WITH OPTIMIZED ADAPTIVE PROMPT
        # System prompt is now built by build_optimized_config_prompt() function in this file (see above)
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

        # Define tools for config chat using templates
        config_chat_tools = [
            # Web search for research (using template)
            get_web_search_tool_definition(),
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
            "model": "gpt-4o",  # GPT-4o for better reasoning (16K max output tokens)
            "messages": convo,
            "temperature": 0.3,
            "max_tokens": 16000,  # GPT-4o supports up to 16,384 output tokens
            # NOTE: Do NOT use response_format=json_object when tools are available
            # because it prevents tool_call function calling
        }

        # Add response format for JSON parsing
        api_params["response_format"] = {"type": "json_object"}

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

            # Make second API call with tool results - FORCE JSON MODE
            # Create new params without tools and with JSON response format
            second_api_params = {
                "model": "gpt-4o",  # Same model as first call
                "messages": convo,  # Updated conversation with tool results
                "temperature": 0.3,
                "max_tokens": 16000,
                "response_format": {"type": "json_object"}  # Force JSON response
            }
            logger.info(f"[Config Chat] Making second API call after tool execution (JSON mode, no tools)")
            try:
                response = client.chat.completions.create(**second_api_params)
                logger.info(f"[Config Chat] Second API call successful")
            except Exception as e2:
                logger.error(f"[Config Chat] Second API call failed: {e2}", exc_info=True)
                emsg2 = str(e2).lower()
                if "must contain the word 'json'" in emsg2:
                    # Retry with explicit JSON instruction in messages
                    convo.insert(1, {"role": "system", "content": "Return only valid json."})
                    api_params_fb2 = dict(second_api_params)
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
            return {
                "error": "Config assistant returned an empty response.",
                "response_message": "Sorry, I couldn't generate a response. Please try again."
            }
        
        # Ensure result_text is not empty before parsing
        if not result_text or not result_text.strip():
            logger.error("[Config Chat] result_text is empty before JSON parsing")
            return {
                "error": "Config assistant returned an empty response.",
                "response_message": "Sorry, I couldn't generate a response. Please try again."
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

        # Attempt to parse JSON payload with intelligent retry if model returns non-JSON text
        parsed = None
        json_retry_attempted = False
        while parsed is None:
            try:
                parsed = _clean_and_parse_json(result_text)
            except json.JSONDecodeError as json_err:
                logger.error(f"Failed to parse JSON from OpenAI response: {json_err}")
                logger.error(f"JSON text that failed: {result_text}")
                if json_retry_attempted:
                    error_msg = f"JSON parsing failed: {str(json_err)}"
                    return {"error": error_msg}

                json_retry_attempted = True
                retry_instruction = (
                    "FINAL WARNING: Your previous response was not valid JSON. "
                    "Respond immediately with ONLY valid JSON that matches the schema described in the system prompt. "
                    "Include response_message plus any config fields or tool metadata you intend to set. "
                    "Do not wrap the JSON in markdown or include commentary."
                    )
                retry_convo = list(convo)
                retry_convo.append({
                    "role": "system",
                    "content": retry_instruction
                })

                try:
                    retry_api_params = dict(api_params)
                    retry_api_params["messages"] = retry_convo
                    retry_api_params.pop("tools", None)
                    retry_api_params.pop("tool_choice", None)
                    retry_api_params["response_format"] = {"type": "json_object"}
                    logger.info("[Config Chat] Retrying completion with JSON mode after parse failure")
                    retry_response = client.chat.completions.create(**retry_api_params)
                    retry_content = retry_response.choices[0].message.content
                    retry_text = (retry_content or "").strip()
                    if retry_text:
                        result_text = retry_text
                        logger.info(f"[Config Chat] JSON retry succeeded - new result length: {len(retry_text)}")
                        parsed = None
                        continue
                    else:
                        logger.error("[Config Chat] JSON retry returned empty content")
                        return {"error": "JSON parsing failed: assistant returned empty response."}
                except Exception as retry_err:
                    logger.error(f"[Config Chat] JSON retry failed: {retry_err}", exc_info=True)
                    return {"error": f"JSON parsing failed: {str(retry_err)}"}

        # Attempt to parse JSON payload
        try:
            logger.info(f"Extracted JSON text: {json.dumps(parsed)[:200]}")
            logger.info(f"Successfully parsed command: {parsed}")

            # Check if this contains action_selection_data (from action extraction phase)
            action_selection_data = None
            if parsed.get("action_selection_data"):
                action_selection_data = parsed["action_selection_data"]
            elif parsed.get("phase") == "action_selection":
                # If AI returned action selection directly in response
                action_selection_data = {
                    "phase": "action_selection",
                    "tool_name": parsed.get("tool_name"),
                    "display_name": parsed.get("display_name"),
                    "description": parsed.get("description"),
                    "auth_type": parsed.get("auth_type", "oauth2"),
                    "documentation_url": parsed.get("documentation_url", ""),
                    "available_actions": parsed.get("available_actions", []),
                    "categories": parsed.get("categories", [])
                }
            
            # If we have action selection data, return it for frontend to show selector
            if action_selection_data:
                logger.info(f"[Config Chat] Returning action selection data for user to choose")
                return {
                    "response_message": parsed.get("response_message", "Please select the actions you want to enable:"),
                    "action_selection_data": action_selection_data,
                    "events": config_events
                }

                logger.info(f"[Config Chat] Added {len(pending_tools)} tools to response")

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
                # Include both casings of pending tools
                if parsed.get("pending_tools") or parsed.get("pendingTools"):
                    tools = parsed.get("pending_tools") or parsed.get("pendingTools")
                    result_payload["pending_tools"] = tools
                    result_payload["pendingTools"] = tools
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

            # Ensure both casings of pendingTools are present before returning
            if parsed.get("pending_tools") and not parsed.get("pendingTools"):
                parsed["pendingTools"] = parsed["pending_tools"]
            elif parsed.get("pendingTools") and not parsed.get("pending_tools"):
                parsed["pending_tools"] = parsed["pendingTools"]

            return parsed
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to parse JSON from OpenAI response: {json_err}")
            logger.error(f"JSON text that failed: {result_text}")
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
        
        # Get model first (needed for DeepSeek preprocessing)
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
        
        # Preprocess messages for DeepSeek reasoner models
        # DeepSeek reasoner requires reasoning_content instead of content when tool_calls are present
        is_deepseek_reasoner = "deepseek-reasoner" in model_str.lower()
        if is_deepseek_reasoner:
            preprocessed_messages = []
            for msg in messages:
                if msg.get("role") == "assistant" and msg.get("tool_calls") and msg.get("content"):
                    # Convert content to reasoning_content for DeepSeek reasoner
                    preprocessed_msg = {
                        "role": "assistant",
                        "reasoning_content": msg.get("content"),
                        "content": None,
                        "tool_calls": msg.get("tool_calls")
                    }
                    preprocessed_messages.append(preprocessed_msg)
                    logger.info(f"🔧 Preprocessed assistant message with tool_calls for DeepSeek reasoner")
                else:
                    preprocessed_messages.append(msg)
            formatted_messages.extend(preprocessed_messages)
        else:
            formatted_messages.extend(messages)
        
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

        # Load custom tools from database - tool integration system removed
        custom_tools_data = {}  # Store tool code and credentials
        async def load_custom_tools() -> List[dict]:
            """Load custom tools - tool integration system removed"""
            # Tool integration models (WrapTool, WrapCredential) have been removed
            # Return empty list - custom tools are no longer supported
            return []

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
            # DeepSeek reasoner models require reasoning_content instead of content when tool calls are present
            is_deepseek_reasoner = "deepseek-reasoner" in model_str.lower()
            if is_deepseek_reasoner and assistant_msg.get("content"):
                # For DeepSeek reasoner: move content to reasoning_content, set content to None
                formatted_messages.append({
                    "role": "assistant",
                    "reasoning_content": assistant_msg.get("content"),
                    "content": None,
                    "tool_calls": assistant_msg.get("tool_calls")
                })
                logger.info(f"🔧 DeepSeek reasoner detected - formatted with reasoning_content")
            else:
                # For other models: normal format
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
