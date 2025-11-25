FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations (with retry) and start server
# Migrations will retry 3 times, then continue even if they fail
CMD ["sh", "-c", "for i in 1 2 3; do alembic upgrade head && break || sleep 5; done; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

