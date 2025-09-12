#!/bin/bash

# Script to start the fix-agent worker
# Supports both production (with env vars) and local development

cd "$(dirname "${BASH_SOURCE[0]}")"

# Set default environment variables for local development if not already set
# Redis configuration: prefer REDIS_URL, fallback to individual variables
if [ -z "$REDIS_URL" ]; then
    export REDIS_HOST="${REDIS_HOST:-localhost}"
    export REDIS_PORT="${REDIS_PORT:-6379}"
    export REDIS_DB="${REDIS_DB:-0}"
fi

# DATABASE_URL and ANTHROPIC_API_KEY should be provided externally

echo "Starting fix-agent worker..."
if [ -n "$REDIS_URL" ]; then
    echo "  REDIS_URL: ${REDIS_URL%@*}@***" # Hide credentials in logs
else
    echo "  REDIS_HOST: $REDIS_HOST"
    echo "  REDIS_PORT: $REDIS_PORT"
    echo "  REDIS_DB: $REDIS_DB"
fi

# Generate Prisma client if needed (for production environments)
echo "Generating Prisma client..."
cd /db && npx prisma generate && cd /scan-agent

# Start the fix worker
python -m fix_agent.workers.fixer
