#!/bin/bash

# Simple script to start the scan-agent server in production
# Replicates the docker-compose command: python -m scan_agent.server

cd "$(dirname "${BASH_SOURCE[0]}")"

python -m scan_agent.server
