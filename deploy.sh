#!/bin/bash

# Wrap-X Backend Deployment Script
# This script helps prepare and deploy the backend to api.wrap-x.com

set -e

echo "🚀 Wrap-X Backend Deployment Script"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from template..."
    cp env.production.example .env
    echo "✅ Created .env file. Please update it with your production values."
    exit 1
fi

# Check for critical environment variables
echo "🔍 Checking environment variables..."
source .env

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ ERROR: ENCRYPTION_KEY is not set!"
    echo "   This is critical for production. Set it in .env file."
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set!"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    echo "❌ ERROR: SECRET_KEY is not set!"
    exit 1
fi

echo "✅ Environment variables check passed"
echo ""

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t wrap-x-api:latest .
echo "✅ Docker image built"
echo ""

# Run migrations check
echo "📊 Checking database migrations..."
echo "   Make sure to run 'alembic upgrade head' after deployment"
echo ""

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Push code to your repository"
echo "   2. Deploy to your hosting provider (Render/Railway/Fly.io)"
echo "   3. Set environment variables in hosting provider"
echo "   4. Configure DNS: api.wrap-x.com → your server"
echo "   5. Run migrations: alembic upgrade head"
echo "   6. Test: curl https://api.wrap-x.com/health"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"

