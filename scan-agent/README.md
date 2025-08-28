# Vulnerability Scan Agent

A Python-based orchestrator and background agent system for automated vulnerability scanning using Claude Code CLI.

## Architecture

The system follows a similar design pattern to the content-server, with:
- **Orchestrator Server**: FastAPI server that accepts scan requests and manages jobs
- **Background Worker**: Processes scan jobs asynchronously
- **Redis Queue**: Manages job queue and state

## Components

### 1. Server (`src/server.py`)
- REST API endpoints for submitting scan jobs
- Job status tracking and retrieval
- CORS-enabled for web integration

### 2. Worker (`src/workers/scanner.py`)
- Clones repositories
- Runs Claude Code CLI for vulnerability detection
- Processes and stores scan results

### 3. Job Queue (`src/utils/queue.py`)
- Redis-based job queue implementation
- Atomic job state transitions
- Job persistence and retrieval

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up Redis:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install locally
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Ensure Claude Code CLI is installed:
```bash
# Follow Claude Code installation instructions
# The worker expects 'claude-code' to be available in PATH
```

## Usage

### Start the Orchestrator Server
```bash
python src/server.py
```

The server will run on `http://localhost:8000` by default.

### Start the Background Worker
```bash
python src/workers/scanner.py
```

### Submit a Scan Job
```bash
curl -X POST http://localhost:8000/scan/repo \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/example/repo.git",
    "branch": "main",
    "claude_cli_args": "--model claude-3-haiku-20240307"
  }'
```

### Check Job Status
```bash
curl http://localhost:8000/jobs/{job_id}
```

### List All Jobs
```bash
curl http://localhost:8000/jobs
```

## API Endpoints

- `GET /health` - Health check
- `POST /scan/repo` - Submit a repository for scanning
- `GET /jobs/{job_id}` - Get specific job status
- `GET /jobs` - List all jobs (optional status filter)
- `DELETE /jobs/{job_id}` - Cancel a pending job

## Scan Results

Scan results include:
- Vulnerability type and severity
- File location and line number
- Description and recommendations
- Overall risk assessment

## Development

### Running Multiple Workers
You can run multiple workers to process jobs in parallel:
```bash
python src/workers/scanner.py &
python src/workers/scanner.py &
```

### Monitoring
Jobs are tracked in Redis with the following states:
- `pending` - Job queued
- `in_progress` - Job being processed
- `completed` - Job finished successfully
- `failed` - Job failed with error

## Security Notes

- The scanner runs in temporary directories
- Repositories are cleaned up after scanning
- No credentials are stored in the system
- Results are stored in Redis (configure persistence as needed)