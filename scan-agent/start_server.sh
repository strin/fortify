#!/bin/bash

# Script to start the scan-agent server
# Supports both production (with env vars) and local development

cd "$(dirname "${BASH_SOURCE[0]}")"

# Set default environment variables for local development if not already set
export PORT="${PORT:-8000}"

# Redis configuration: prefer REDIS_URL, fallback to individual variables
if [ -z "$REDIS_URL" ]; then
    export REDIS_HOST="${REDIS_HOST:-localhost}"
    export REDIS_PORT="${REDIS_PORT:-6379}"
    export REDIS_DB="${REDIS_DB:-0}"
fi

# DATABASE_URL and ANTHROPIC_API_KEY should be provided externally

# Generate Prisma client if needed (for production environments)
echo "Generating Prisma client..."
cd /db && npx prisma generate && cd /scan-agent

echo "Starting scan-agent server..."
echo "  PORT: $PORT"
if [ -n "$REDIS_URL" ]; then
    echo "  REDIS_URL: ${REDIS_URL%@*}@***" # Hide credentials in logs
else
    echo "  REDIS_HOST: $REDIS_HOST"
    echo "  REDIS_PORT: $REDIS_PORT"
    echo "  REDIS_DB: $REDIS_DB"
fi

# Use gunicorn in production, uvicorn for development
if [ "$NODE_ENV" = "production" ] || [ "$ENVIRONMENT" = "production" ] || [ -n "$RENDER" ]; then
    echo "Starting with gunicorn (production mode)..."
    exec gunicorn scan_agent.server:app \
        --bind 0.0.0.0:$PORT \
        --worker-class uvicorn.workers.UvicornWorker \
        --workers 2 \
        --timeout 120 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 50 \
        --preload
else
    echo "Starting with uvicorn (development mode)..."
    python -m scan_agent.server
fi
