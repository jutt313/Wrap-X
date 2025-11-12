# Wrap-X Backend

AI API wrapper platform that adds custom system prompts, rules, and tools on top of any LLM provider.

## Tech Stack

- **Backend**: Python + FastAPI
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Database**: PostgreSQL
- **LLM Integration**: LiteLLM (supports 100+ providers)

## Database Schema

18 tables implemented:

1. **users** - User accounts
2. **projects** - Project organization
3. **llm_providers** - User's LLM API keys (OpenAI, Claude, DeepSeek, etc.)
4. **wrapped_apis** - Custom API configurations
5. **api_keys** - Generated API keys for wrapped APIs
6. **prompt_configs** - System prompts (role, instructions, rules, behavior, tone, examples)
7. **tools** - Custom tools (web search, thinking, code exec)
8. **wrapped_api_tools** - Links wrapped APIs ↔ tools
9. **webhooks** - Webhook configurations
10. **chat_messages** - Chat history for configuration
11. **api_logs** - Usage analytics
12. **sessions** - Auth tokens/sessions
13. **rate_limits** - Usage limits
14. **config_versions** - Version history for configs
15. **notifications** - Alerts/webhook status
16. **billing** - Payments/subscriptions
17. **audit_logs** - Security/admin tracking
18. **feedback** - User ratings/improvement notes

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- pip/venv

### Installation

1. Clone the repository
2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file:
```bash
cp .env.example .env
```

5. Update `.env` with your PostgreSQL credentials:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/wrapx
DATABASE_SYNC_URL=postgresql://user:password@localhost:5432/wrapx
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

6. Create PostgreSQL database:
```bash
createdb wrapx
```

7. Run migrations:
```bash
alembic revision --autogenerate -m "Initial migration - all 18 tables"
alembic upgrade head
```

8. Start the server:
```bash
uvicorn app.main:app --reload
```

## Project Structure

```
Wrap-x/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   └── models/
│       ├── __init__.py
│       ├── user.py
│       ├── project.py
│       ├── llm_provider.py
│       ├── wrapped_api.py
│       ├── api_key.py
│       ├── prompt_config.py
│       ├── tool.py
│       ├── wrapped_api_tool.py
│       ├── webhook.py
│       ├── chat_message.py
│       ├── api_log.py
│       ├── session.py
│       ├── rate_limit.py
│       ├── config_version.py
│       ├── notification.py
│       ├── billing.py
│       ├── audit_log.py
│       └── feedback.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── alembic.ini
├── requirements.txt
└── README.md
```

## Deployment

### Quick Deploy to api.wrap-x.com

1. **Prepare environment**:
   ```bash
   cp env.production.example .env
   # Edit .env with your production values
   ```

2. **Deploy using Docker**:
   - Option A: Render.com - Use `render.yaml` config
   - Option B: Railway - Connect GitHub repo
   - Option C: Fly.io - Use `fly launch`

3. **Set DNS**: Point `api.wrap-x.com` to your server

4. **Run migrations**: `alembic upgrade head` (auto-runs in Dockerfile)

See `DEPLOYMENT.md` for detailed instructions.

### Production Checklist

- [ ] Set `ENCRYPTION_KEY` (critical - must be stable)
- [ ] Set `SECRET_KEY` for JWT tokens
- [ ] Configure PostgreSQL database
- [ ] Set Stripe production keys
- [ ] Configure `FRONTEND_BASE_URL=https://wrap-x.com`
- [ ] Enable HTTPS/SSL
- [ ] Update Stripe webhook URL: `https://api.wrap-x.com/api/billing/webhook`
- [ ] Test health endpoint: `https://api.wrap-x.com/health`

