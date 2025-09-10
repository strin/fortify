# GitHub Webhook Integration for PR Events

This document describes the implementation and setup of GitHub webhook integration for automatically triggering security scans on pull request events.

## Overview

The Fortify Scan Agent now includes a comprehensive GitHub webhook integration that automatically triggers security scans when pull request events occur. This enables seamless integration into developer workflows and continuous security monitoring.

## Features

- **Pull Request Event Handling**: Automatically triggers scans on PR events (opened, synchronize, reopened)
- **Push Event Support**: Also handles push events to branches for continuous scanning
- **Signature Validation**: Implements GitHub webhook signature validation using HMAC-SHA256
- **Comprehensive Logging**: Detailed logging throughout the webhook pipeline for debugging and monitoring
- **GitHub API Integration**: Uses GitHub API for repository and PR metadata retrieval
- **Automatic Job Creation**: Creates scan jobs with detailed metadata from webhook events

## Architecture

### Components

1. **GitHub Webhook Handler** (`GitHubWebhookHandler`):
   - Validates webhook signatures
   - Parses webhook payloads
   - Extracts relevant event data

2. **GitHub API Client** (`GitHubClient`):
   - Interfaces with GitHub API
   - Retrieves repository and PR information
   - Handles authentication with GitHub tokens

3. **FastAPI Webhook Endpoint** (`/webhooks/github`):
   - Receives GitHub webhook events
   - Processes events and creates scan jobs
   - Returns detailed response information

4. **Test Endpoint** (`/webhooks/github/test`):
   - Validates webhook integration setup
   - Checks environment configuration
   - Provides setup instructions

## Environment Configuration

### Required Environment Variables

```bash
# GitHub webhook secret for signature validation
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Scan agent port (defaults to 8000)
PORT=8000
```

### Setting Up the Webhook Secret

1. Generate a secure secret:
   ```bash
   # Using Python
   python -c "import secrets; print(secrets.token_hex(32))"
   
   # Using OpenSSL
   openssl rand -hex 32
   ```

2. Set the environment variable:
   ```bash
   export GITHUB_WEBHOOK_SECRET=your_generated_secret
   ```

3. Use the same secret when configuring the webhook in GitHub

## GitHub Webhook Configuration

### Setting up the Webhook in GitHub

1. Navigate to your repository on GitHub
2. Go to Settings → Webhooks
3. Click "Add webhook"
4. Configure the webhook:

```json
{
  "payload_url": "https://your-fortify-domain.com/webhooks/github",
  "content_type": "application/json",
  "secret": "your_webhook_secret_here",
  "events": ["pull_request", "push"],
  "active": true
}
```

### Webhook Events

#### Pull Request Events

Triggers on the following PR actions:
- **opened**: New pull request created
- **synchronize**: New commits pushed to PR branch  
- **reopened**: Closed PR is reopened

#### Push Events

Triggers on:
- Pushes to any branch
- Includes commit metadata and branch information

## API Endpoints

### POST /webhooks/github

Main webhook endpoint that receives GitHub events.

**Headers:**
- `X-GitHub-Event`: Event type (e.g., "pull_request", "push")
- `X-GitHub-Delivery`: Unique delivery ID
- `X-Hub-Signature-256`: Webhook signature for validation

**Response for PR Events:**
```json
{
  "status": "success",
  "message": "Scan job created for PR #123",
  "job_id": "job_pr-123-abc12345",
  "repository": "owner/repo-name",
  "pull_request": 123
}
```

**Response for Push Events:**
```json
{
  "status": "success", 
  "message": "Scan job created for push to main",
  "job_id": "job_push-main-abc12345",
  "repository": "owner/repo-name",
  "branch": "main"
}
```

### POST /webhooks/github/test

Test endpoint to validate webhook integration setup.

**Response:**
```json
{
  "status": "success",
  "message": "GitHub webhook integration test completed",
  "configuration": {
    "webhook_secret_configured": true,
    "github_client_initialized": true,
    "webhook_handler_initialized": true,
    "endpoint_url": "/webhooks/github",
    "supported_events": ["pull_request", "push"],
    "pr_triggering_actions": ["opened", "synchronize", "reopened"]
  },
  "setup_instructions": {
    "environment_variables": {
      "GITHUB_WEBHOOK_SECRET": "Set this to match your GitHub webhook secret for signature validation"
    },
    "github_webhook_config": {
      "payload_url": "https://your-domain.com/webhooks/github",
      "content_type": "application/json",
      "events": ["pull_request", "push"],
      "active": true
    }
  },
  "timestamp": "2024-01-01T12:00:00.000000"
}
```

## Logging and Monitoring

### Log Levels

The integration provides comprehensive logging at different levels:

- **INFO**: Webhook events, job creation, successful processing
- **DEBUG**: Detailed payload information, signature validation steps
- **WARNING**: Ignored events, configuration issues
- **ERROR**: Processing failures, validation errors

### Key Log Messages

**Webhook Reception:**
```
INFO - Received GitHub webhook: event=pull_request, delivery=12345678-1234-5678-9012-123456789abc
```

**PR Event Processing:**
```
INFO - Handling PR event: owner/repo PR #123
INFO - PR title: Fix security vulnerability in auth module
INFO - PR branch: feature-branch -> main
INFO - PR action: opened
```

**Job Creation:**
```
INFO - Created PR scan job: job_pr-123-abc12345
```

**Signature Validation:**
```
INFO - Webhook signature verification successful
```

## Scan Job Metadata

When a scan job is created from a webhook event, it includes rich metadata:

### PR Event Job Metadata
```json
{
  "trigger": "pull_request",
  "pr_number": 123,
  "pr_title": "Fix security vulnerability",
  "pr_url": "https://github.com/owner/repo/pull/123",
  "pr_author": "developer-username",
  "pr_action": "opened",
  "base_branch": "main",
  "head_sha": "abc123...",
  "base_sha": "def456..."
}
```

### Push Event Job Metadata
```json
{
  "trigger": "push",
  "branch": "main",
  "ref": "refs/heads/main",
  "commits": [
    {
      "id": "abc123...",
      "message": "Fix security issue",
      "timestamp": "2024-01-01T12:00:00Z",
      "author": {
        "name": "Developer Name",
        "email": "dev@example.com"
      }
    }
  ],
  "pusher": "developer-name"
}
```

## Security Considerations

### Webhook Signature Validation

- All webhooks are validated using HMAC-SHA256 signatures
- Signatures are compared using constant-time comparison to prevent timing attacks
- Invalid signatures result in 403 Forbidden responses

### Environment Security

- Store `GITHUB_WEBHOOK_SECRET` securely (environment variables, secrets management)
- Use HTTPS for webhook URLs in production
- Regularly rotate webhook secrets

### Access Control

- Webhook endpoint is public but secured via signature validation
- Test endpoint provides configuration info but no sensitive data
- All operations are logged for audit purposes

## Troubleshooting

### Common Issues

1. **Signature Validation Failures**
   - Verify `GITHUB_WEBHOOK_SECRET` matches GitHub configuration
   - Check webhook payload encoding (should be UTF-8)
   - Ensure secret is not empty or malformed

2. **Events Not Triggering Scans**
   - Check event type is supported (pull_request, push)
   - For PRs, verify action is triggering type (opened, synchronize, reopened)
   - Check scan agent logs for processing errors

3. **GitHub API Issues**
   - Verify repository access permissions
   - Check GitHub API rate limits
   - Ensure proper GitHub token configuration

### Testing the Integration

1. **Test the endpoint:**
   ```bash
   curl -X POST https://your-domain.com/webhooks/github/test
   ```

2. **Validate configuration:**
   - Check response shows `webhook_secret_configured: true`
   - Verify all components are initialized

3. **Test with real webhook:**
   - Create a test PR in your repository
   - Check scan agent logs for webhook processing
   - Verify scan job is created in queue

## Development and Extension

The webhook integration is designed to be extensible:

- Add new event types by extending `GitHubWebhookHandler.parse_webhook_payload()`
- Customize scan job creation logic in `_handle_pull_request_event()` and `_handle_push_event()`
- Add additional GitHub API client methods as needed
- Extend logging and monitoring as required

## Dependencies

- `httpx>=0.26.0`: HTTP client for GitHub API requests
- `fastapi`: Web framework for webhook endpoint
- `pydantic`: Data validation and serialization
- Standard library modules: `hmac`, `hashlib`, `json`, `logging`