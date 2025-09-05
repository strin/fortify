#!/bin/bash
# Run this script to start the chat-agent locally

cd /db && prisma generate && \
cd /scan-agent && \
python -m scan_agent.workers.scanner