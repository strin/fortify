#!/bin/bash

# Start Scan Agent with GitHub Webhook Integration
# This script sets up environment variables and starts the FastAPI server

echo "🚀 Starting Fortify Scan Agent with GitHub Webhook Integration..."

# Set default port if not provided
export PORT=${PORT:-8000}

# Check if webhook secret is configured
if [ -z "$GITHUB_WEBHOOK_SECRET" ]; then
    echo "⚠️  WARNING: GITHUB_WEBHOOK_SECRET not set!"
    echo "   Webhook signature validation will be disabled."
    echo "   For production, set GITHUB_WEBHOOK_SECRET environment variable."
    echo ""
fi

# Log startup configuration
echo "Configuration:"
echo "  Port: $PORT"
echo "  Webhook Secret Configured: $([ -n "$GITHUB_WEBHOOK_SECRET" ] && echo "✅ Yes" || echo "❌ No")"
echo "  Webhook Endpoint: http://localhost:$PORT/webhooks/github"
echo "  Test Endpoint: http://localhost:$PORT/webhooks/github/test"
echo ""

# Start the server
echo "Starting FastAPI server..."
echo "Access the API documentation at: http://localhost:$PORT/docs"
echo ""

# Run the server with uvicorn
python -m uvicorn scan_agent.server:app --host 0.0.0.0 --port $PORT --reload --log-level info