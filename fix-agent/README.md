# Fix Agent

AI-powered vulnerability fixing service using Claude Code SDK.

## Overview

The Fix Agent is a microservice that automatically fixes code vulnerabilities by:

1. Receiving fix requests from the frontend
2. Cloning the target repository 
3. Using Claude Code SDK to generate secure fixes
4. Creating GitHub pull requests with the fixes

## Architecture

- **FastAPI Server**: Handles API requests and job creation
- **Background Worker**: Processes fix jobs using Claude Code SDK
- **Redis Queue**: Manages job queue and status
- **GitHub Integration**: Creates PRs with fixes

## Setup

### Prerequisites

- Python 3.11+
- Redis server
- Claude Code SDK
- GitHub access token

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=1
export GITHUB_ACCESS_TOKEN=your_github_token
export ANTHROPIC_API_KEY=your_claude_api_key
```

### Running the Service

1. Start the API server:
```bash
./start_server.sh
# Or: python -m fix_agent.server
```

2. Start the background worker:
```bash
./start_worker.sh
```

## API Endpoints

### Create Fix Job
```
POST /fix/create
Content-Type: application/json

{
  "type": "FIX_VULNERABILITY",
  "data": {
    "repo_url": "https://github.com/owner/repo",
    "branch": "main",
    "vulnerability": {
      "id": "vuln_123",
      "title": "SQL Injection",
      "description": "...",
      "severity": "HIGH",
      "category": "INJECTION",
      "filePath": "src/auth.js",
      "startLine": 42,
      "codeSnippet": "...",
      "recommendation": "..."
    },
    "scan_job_id": "scan_456",
    "user_id": "user_789"
  }
}
```

### Get Job Status
```
GET /fix/jobs/{job_id}
```

### List Jobs
```
GET /fix/jobs?status=COMPLETED&limit=10
```

### Cancel Job
```
POST /fix/jobs/{job_id}/cancel
```

### Health Check
```
GET /health
```

## Integration

The Fix Agent integrates with:

- **Frontend**: Receives fix requests from the Next.js application
- **Scan Agent**: Uses vulnerability data from scan results
- **GitHub API**: Creates branches and pull requests
- **Claude Code SDK**: Generates AI-powered fixes

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black fix_agent/
isort fix_agent/
```

### Linting
```bash
flake8 fix_agent/
```

## Configuration

Environment variables:

- `REDIS_URL` or `REDIS_HOST/REDIS_PORT/REDIS_DB`: Redis connection
- `GITHUB_ACCESS_TOKEN`: GitHub API access
- `ANTHROPIC_API_KEY`: Claude API access
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8001)

## Security

- Uses secure temporary directories for repository cloning
- Validates all input data
- Implements proper error handling
- Uses GitHub API authentication
- Cleans up resources after job completion