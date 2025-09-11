#!/bin/bash

# Script to start the fix-agent worker
# Processes fix jobs from Redis queue

cd "$(dirname "${BASH_SOURCE[0]}")"

# Redis configuration: prefer REDIS_URL, fallback to individual variables
if [ -z "$REDIS_URL" ]; then
    export REDIS_HOST="${REDIS_HOST:-localhost}"
    export REDIS_PORT="${REDIS_PORT:-6379}"
    export REDIS_DB="${REDIS_DB:-1}"  # Use different DB from scan-agent
fi

# Required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "ERROR: ANTHROPIC_API_KEY environment variable is required"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "WARNING: GITHUB_TOKEN not set - GitHub operations will be limited to public repos"
fi

echo "Starting fix-agent worker..."
echo "  REDIS_HOST: $REDIS_HOST"
echo "  REDIS_PORT: $REDIS_PORT" 
echo "  REDIS_DB: $REDIS_DB"

# Start the worker
python -m fix_agent.workers.fixer