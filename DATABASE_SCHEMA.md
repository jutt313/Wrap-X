# Wrap-X Database Schema

## All 18 Tables

### 1. `users`
- **Purpose**: User accounts and authentication
- **Key Fields**: id, email, password_hash, name, is_active, created_at, updated_at

### 2. `projects`
- **Purpose**: Project organization
- **Key Fields**: id, user_id, name, description, created_at, updated_at

### 3. `llm_providers`
- **Purpose**: Store user's LLM API keys (OpenAI, Claude, DeepSeek, etc.)
- **Key Fields**: id, user_id, provider_name, api_key (encrypted), api_base_url, created_at

### 4. `wrapped_apis`
- **Purpose**: User's custom API configurations
- **Key Fields**: id, user_id, project_id, provider_id, name, endpoint_id (unique), is_active, created_at

### 5. `api_keys`
- **Purpose**: Generated API keys for wrapped APIs
- **Key Fields**: id, wrapped_api_id, api_key (hashed), key_name, expires_at, is_active, created_at

### 6. `prompt_configs`
- **Purpose**: System prompts and behavior configuration
- **Key Fields**: id, wrapped_api_id, role, instructions, rules, behavior, tone, examples, created_at, updated_at

### 7. `tools`
- **Purpose**: Custom tools (web search, thinking, code exec, etc.)
- **Key Fields**: id, user_id, tool_name, tool_type, tool_config (JSON), created_at, updated_at

### 8. `wrapped_api_tools`
- **Purpose**: Links wrapped APIs to tools (many-to-many)
- **Key Fields**: id, wrapped_api_id, tool_id, created_at

### 9. `webhooks`
- **Purpose**: Webhook configurations
- **Key Fields**: id, wrapped_api_id, url, secret, events (JSON), is_active, created_at, updated_at

### 10. `chat_messages`
- **Purpose**: Chat history for configuration
- **Key Fields**: id, user_id, wrapped_api_id, message, response, created_at

### 11. `api_logs`
- **Purpose**: Usage analytics and logging
- **Key Fields**: id, wrapped_api_id, request_data (JSON), response_data (JSON), tokens_used, cost, created_at

### 12. `sessions`
- **Purpose**: Auth tokens and login sessions
- **Key Fields**: id, user_id, token, refresh_token, expires_at, is_active, ip_address, user_agent, created_at

### 13. `rate_limits`
- **Purpose**: API usage limits per user/API
- **Key Fields**: id, user_id, wrapped_api_id, requests_count, limit, reset_at, created_at, updated_at

### 14. `config_versions`
- **Purpose**: Version history for prompt configs (undo/rollback)
- **Key Fields**: id, prompt_config_id, wrapped_api_id, version, config_snapshot (JSON), created_at

### 15. `notifications`
- **Purpose**: Alerts, webhook status, errors
- **Key Fields**: id, wrapped_api_id, user_id, type, title, message, is_read, metadata, created_at

### 16. `billing`
- **Purpose**: Payments and subscriptions
- **Key Fields**: id, user_id, plan_type, status, amount, payment_date, expires_at, created_at, updated_at

### 17. `audit_logs`
- **Purpose**: Security and admin tracking
- **Key Fields**: id, user_id, action, resource_type, resource_id, ip_address, user_agent, details, created_at

### 18. `feedback`
- **Purpose**: User ratings and improvement notes
- **Key Fields**: id, user_id, wrapped_api_id, rating, comment, created_at

## Relationships Summary

- **User** → Projects, LLMProviders, WrappedAPIs, Tools, ChatMessages, Sessions, RateLimits, Billing, AuditLogs, Feedback, Notifications
- **Project** → WrappedAPIs
- **LLMProvider** → WrappedAPIs
- **WrappedAPI** → APIKeys, PromptConfig, Tools (via WrappedAPITool), Webhooks, ChatMessages, APILogs, RateLimits, Notifications, Feedback, ConfigVersions
- **PromptConfig** → ConfigVersions
- **Tool** → WrappedAPIs (via WrappedAPITool)

## Next Steps

1. Create PostgreSQL database
2. Update `.env` with database credentials
3. Run: `alembic revision --autogenerate -m "Initial migration - all 18 tables"`
4. Run: `alembic upgrade head`

