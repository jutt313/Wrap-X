#!/bin/bash
# Cloud SQL Migration Script
# Usage: ./run_migration.sh YOUR_PASSWORD

if [ -z "$1" ]; then
    echo "Usage: ./run_migration.sh YOUR_DATABASE_PASSWORD"
    exit 1
fi

PASSWORD=$1
export DATABASE_SYNC_URL="postgresql://postgres:${PASSWORD}@35.232.125.240:5432/wrap-x-db"
export DATABASE_URL="postgresql+asyncpg://postgres:${PASSWORD}@35.232.125.240:5432/wrap-x-db"
export SECRET_KEY="Af20QJc9XFRZRqZsXmyytFF623Y4-8yMi70jrqLjOPg"

echo "Running migrations..."
alembic upgrade head
