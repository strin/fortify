#!/bin/bash

# Simple script to start the scan-agent worker in production
# Replicates the docker-compose command: ./run-worker-local.sh

cd "$(dirname "${BASH_SOURCE[0]}")"

./run-worker-local.sh
