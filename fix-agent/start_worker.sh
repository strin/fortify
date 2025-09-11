#!/bin/bash

# Start fix-agent background worker

export PYTHONPATH="${PYTHONPATH}:$(pwd)"

echo "🔧 Starting Fix Agent worker..."

python -c "
from fix_agent.workers.fixer import FixWorker

if __name__ == '__main__':
    worker = FixWorker()
    worker.run()
"