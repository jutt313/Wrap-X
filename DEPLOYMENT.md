# Wrap-X Backend Deployment Guide

## Deploy to api.wrap-x.com

### Option 1: Render.com (Recommended)

1. **Create Render Account**: Go to https://render.com
2. **Create New Web Service**:
   - Connect your GitHub repository
   - Select "Docker" as the environment
   - Point to the `Dockerfile` in root
3. **Configure Environment Variables**:
   - Copy all variables from `.env.example`
   - Set `ENVIRONMENT=production`
   - Set `FRONTEND_BASE_URL=https://wrap-x.com`
4. **Create PostgreSQL Database**:
   - Add a PostgreSQL database in Render
   - Use the connection string for `DATABASE_URL` and `DATABASE_SYNC_URL`
5. **Set Custom Domain**:
   - In Render dashboard, add custom domain: `api.wrap-x.com`
   - Render will provide DNS records to add
6. **Deploy**: Render will automatically deploy on push

### Option 2: Railway

1. **Create Railway Account**: Go to https://railway.app
2. **New Project** → Deploy from GitHub
3. **Add PostgreSQL** service
4. **Configure Environment Variables** (same as Render)
5. **Set Custom Domain**: `api.wrap-x.com`
6. **Deploy**

### Option 3: Fly.io

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`
3. **Create App**: `fly launch`
4. **Set Secrets**: `fly secrets set KEY=value` for each env var
5. **Set Custom Domain**: `fly domains add api.wrap-x.com`
6. **Deploy**: `fly deploy`

### DNS Configuration

Add these DNS records to your domain provider (where wrap-x.com is registered):

```
Type: A
Name: api
Value: [Your server IP from hosting provider]

OR

Type: CNAME
Name: api
Value: [Your hosting provider's domain]
```

### Post-Deployment Checklist

- [ ] Run migrations: `alembic upgrade head` (auto-runs in Dockerfile)
- [ ] Verify HTTPS is enabled (SSL certificate)
- [ ] Test API endpoint: `https://api.wrap-x.com/health`
- [ ] Update Stripe webhook URL: `https://api.wrap-x.com/api/billing/webhook`
- [ ] Verify CORS allows `https://wrap-x.com`
- [ ] Test authentication endpoints
- [ ] Monitor logs for errors

### Environment Variables Required

See `.env.example` for complete list. Critical ones:
- `ENCRYPTION_KEY` - Must be stable, never change after first use
- `SECRET_KEY` - For JWT tokens
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - For production Stripe account
- `OPENAI_API_KEY` - For config chat parsing

### Health Check

After deployment, verify:
```bash
curl https://api.wrap-x.com/health
```

Should return: `{"status": "healthy"}`

