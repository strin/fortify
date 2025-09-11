#!/bin/bash

# Start fix-agent FastAPI server

export PYTHONPATH="${PYTHONPATH}:$(pwd)"

echo "🔧 Starting Fix Agent server..."

python -m fix_agent.server