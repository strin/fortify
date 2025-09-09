#!/bin/bash

# Script to start the scan-agent worker
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

echo "Starting scan-agent worker..."
if [ -n "$REDIS_URL" ]; then
    echo "  REDIS_URL: ${REDIS_URL%@*}@***" # Hide credentials in logs
else
    echo "  REDIS_HOST: $REDIS_HOST"
    echo "  REDIS_PORT: $REDIS_PORT"
    echo "  REDIS_DB: $REDIS_DB"
fi

# Generate Prisma client if needed (for production environments)
if [ ! -d "../db/generated" ]; then
    echo "Generating Prisma client..."
    cd ../db && prisma generate && cd ../scan-agent
fi

# Start the worker using the same command as the original run-worker-local.sh
python -m scan_agent.workers.scanner
