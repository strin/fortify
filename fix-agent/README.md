# Fortify Fix Agent

An AI-powered vulnerability fixing service that automatically generates and applies security fixes using Claude Code SDK and creates GitHub pull requests.

## Overview

Fix Agent is a microservice that processes vulnerability fix requests by:

1. **AI-Powered Fix Generation**: Uses Claude Code SDK to analyze vulnerabilities and generate targeted fixes
2. **Automatic Code Application**: Applies generated fixes to the source code
3. **GitHub Integration**: Creates branches, commits fixes, and submits pull requests
4. **Queue-Based Processing**: Uses Redis queues for reliable job processing

## Architecture

Fix Agent follows the same architectural pattern as scan-agent:

- **FastAPI Server**: REST API for fix job management (port 8001)
- **Background Worker**: Processes fix jobs using AI and GitHub APIs
- **Redis Queue**: Atomic job management using brpoplpush pattern
- **Shared Database**: Uses the same PostgreSQL database as scan-agent

## Quick Start

### Prerequisites

- Python 3.11+
- Redis server
- PostgreSQL database (shared with scan-agent)
- Claude API key
- GitHub access token

### Installation

1. **Install dependencies:**
   ```bash
   cd fix-agent
   pip install -r requirements.txt
   pip install -e .
   ```

2. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/fortify"
   export REDIS_HOST="localhost"
   export REDIS_PORT="6379"
   export REDIS_DB="1"  # Different from scan-agent
   export ANTHROPIC_API_KEY="your-claude-api-key"
   export GITHUB_TOKEN="your-github-token"
   ```

3. **Start the server:**
   ```bash
   ./start_server.sh
   ```

4. **Start the worker (in separate terminal):**
   ```bash
   ./start_worker.sh
   ```

## API Endpoints

### Core Endpoints

- `POST /fix/vulnerability` - Create a fix job
- `GET /fix/jobs/{id}` - Get fix job details
- `GET /fix/jobs/{id}/status` - Get fix job status (for polling)
- `POST /fix/jobs/{id}/cancel` - Cancel fix job
- `GET /fix/stats` - Get service statistics
- `GET /health` - Health check

### Example Usage

```bash
# Create a fix job
curl -X POST http://localhost:8001/fix/vulnerability \
  -H "Content-Type: application/json" \
  -d '{
    "fixJobId": "fix_123",
    "vulnerabilityId": "vuln_456",
    "scanJobId": "scan_789",
    "repositoryUrl": "https://github.com/user/repo.git",
    "branch": "main",
    "vulnerability": {
      "title": "SQL Injection in login",
      "category": "INJECTION",
      "severity": "HIGH",
      "filePath": "src/auth/login.js",
      "startLine": 42,
      "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
      "recommendation": "Use parameterized queries"
    },
    "fixOptions": {
      "createPullRequest": true,
      "prTitle": "Fix: SQL Injection vulnerability"
    }
  }'

# Check fix job status
curl http://localhost:8001/fix/jobs/fix_123/status
```

## Fix Process Flow

1. **Job Creation**: NextJS backend creates fix job via API
2. **Queue Processing**: Worker claims job from Redis queue
3. **Repository Clone**: Clone target repository to temp directory
4. **AI Fix Generation**: Use Claude Code SDK to generate fix
5. **Code Application**: Apply fix to source files
6. **Branch Creation**: Create new branch with descriptive name
7. **Commit & Push**: Commit fix and push to GitHub
8. **Pull Request**: Create PR with fix details and context
9. **Cleanup**: Remove temporary files and update job status

## Supported Vulnerability Types

Currently supports automated fixing for:

- **INJECTION** - SQL injection, code injection
- **AUTHENTICATION** - Authentication bypass, weak authentication
- **AUTHORIZATION** - Access control issues
- **CRYPTOGRAPHY** - Weak encryption, key management
- **DATA_EXPOSURE** - Information disclosure
- **INPUT_VALIDATION** - Input validation flaws
- **CONFIGURATION** - Security misconfigurations
- **SESSION_MANAGEMENT** - Session handling issues

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8001 |
| `HOST` | Server host | 0.0.0.0 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_DB` | Redis database number | 1 |
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `GITHUB_TOKEN` | GitHub access token | Required |

### Redis Namespaces

Fix Agent uses separate Redis namespaces to avoid conflicts with scan-agent:

- Queues: `fix_jobs:pending`, `fix_jobs:processing`
- Job data: `fix_jobs:data:{job_id}`
- Status: `fix_job:status:{job_id}`

## Development

### Project Structure

```
fix-agent/
├── fix_agent/
│   ├── models/          # Data models and types
│   │   └── job.py       # Fix job models
│   ├── utils/           # Utility modules
│   │   ├── database.py  # Database operations
│   │   ├── queue.py     # Redis queue management
│   │   └── redis_client.py  # Redis connection
│   ├── workers/         # Background workers
│   │   └── fixer.py     # Main fix worker
│   └── server.py        # FastAPI server
├── requirements.txt     # Python dependencies
├── setup.py            # Package setup
├── Dockerfile          # Container configuration
├── start_server.sh     # Server startup script
└── start_worker.sh     # Worker startup script
```

### Testing

```bash
# Run unit tests
pytest

# Run with coverage
pytest --cov=fix_agent

# Run specific test
pytest tests/test_fix_worker.py
```

### Docker Deployment

```bash
# Build image
docker build -t fix-agent .

# Run server
docker run -p 8001:8001 \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="..." \
  -e GITHUB_TOKEN="..." \
  fix-agent

# Run worker
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="..." \
  -e GITHUB_TOKEN="..." \
  fix-agent ./start_worker.sh
```

## Integration

### With NextJS Frontend

The frontend integrates via the existing API endpoints:

```typescript
// Create fix job
const response = await fetch('/api/fix/vulnerability', {
  method: 'POST',
  body: JSON.stringify({ vulnerabilityId, fixOptions })
});

// Poll for status
const status = await fetch(`/api/fix/jobs/${fixJobId}/status`);
```

### With Scan Agent

Fix Agent shares the same database as scan-agent and references:

- `CodeVulnerability` records for fix targets
- `ScanJob` records for repository context
- `User` records for access control

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:8001/health

# Service statistics
curl http://localhost:8001/fix/stats
```

### Logging

Fix Agent uses structured logging with different levels:

- `DEBUG`: Detailed execution traces
- `INFO`: Normal operations and job lifecycle
- `WARNING`: Recoverable issues
- `ERROR`: Fix failures and system errors

### Metrics

Key metrics to monitor:

- Fix success rate by vulnerability category
- Average fix processing time
- Queue depth and processing rate
- GitHub API rate limit usage
- Database connection health

## Security Considerations

- **GitHub Token Security**: Use tokens with minimal required permissions
- **Repository Access**: Verify user permissions before processing
- **Code Injection Prevention**: Validate all generated fixes
- **Temporary File Cleanup**: Ensure all temp files are cleaned up
- **Rate Limiting**: Respect GitHub API rate limits

## Limitations

- **Public Repositories**: Currently optimized for public repos
- **Single Vulnerability Fixes**: One vulnerability per fix job
- **Limited Language Support**: Primarily JavaScript/TypeScript focused
- **No Real-time Updates**: Status updates via polling only

## Future Enhancements

- WebSocket support for real-time status updates
- Support for private repositories with proper authentication
- Multi-vulnerability batch fixing
- Integration with additional code analysis tools
- Advanced fix validation and testing
- Support for more programming languages and frameworks

## Support

For issues and questions:

1. Check the logs for detailed error information
2. Verify environment variables are set correctly
3. Ensure Redis and PostgreSQL are accessible
4. Check GitHub token permissions
5. Review the API documentation for correct request formats

## License

MIT License - see LICENSE file for details.