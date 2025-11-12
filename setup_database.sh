#!/bin/bash

# Setup script for Wrap-X database

echo "Setting up Wrap-X database..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create it from .env.example"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run migrations
echo "Creating database migration..."
alembic revision --autogenerate -m "Initial migration - all 18 tables"

echo "✅ Setup complete!"
echo "Next steps:"
echo "1. Update .env with your PostgreSQL credentials"
echo "2. Create database: createdb wrapx"
echo "3. Run migration: alembic upgrade head"
echo "4. Start server: uvicorn app.main:app --reload"

