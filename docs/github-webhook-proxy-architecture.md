# GitHub Webhook Proxy Architecture

## 🏗️ Updated Architecture Overview

This document describes the updated GitHub webhook integration architecture where the Next.js frontend server acts as a proxy for GitHub webhooks, forwarding them to the scan agent server.

## Architecture Diagram

```
GitHub Webhooks → Next.js Frontend (https://fortify.rocks) → Scan Agent Server
                  ↓                                          ↓
                  /api/webhooks/github                       /webhooks/github
                  (Proxy & Validation)                       (Processing & Scanning)
```

## Why This Architecture?

**Problem**: The public domain `https://fortify.rocks` hosts the Next.js server, not the scan agent server. GitHub webhooks need a publicly accessible URL.

**Solution**: The Next.js server acts as a webhook proxy:
1. Receives GitHub webhooks at the public domain
2. Validates webhook signatures
3. Forwards requests to the internal scan agent server
4. Returns responses back to GitHub

## Components

### 1. **Next.js Webhook Proxy** (`frontend/src/app/api/webhooks/github/route.ts`)

**Responsibilities:**
- Receive GitHub webhooks at public URL
- Validate webhook signatures (first layer of security)
- Forward requests to scan agent server
- Handle proxy errors and timeouts
- Provide webhook health check endpoint

**Key Features:**
- HMAC-SHA256 signature validation
- Request forwarding with timeout handling
- Comprehensive error handling and logging
- Health check for scan agent connectivity
- Detailed response metadata

### 2. **Scan Agent Webhook Handler** (`scan-agent/scan_agent/server.py`)

**Responsibilities:**
- Process forwarded webhook requests
- Parse GitHub event payloads
- Create scan jobs from PR/push events
- Execute security scans

**Integration:**
- Receives forwarded requests from Next.js proxy
- Maintains existing webhook processing logic
- Returns detailed job creation responses

## Request Flow

### 1. GitHub → Next.js Proxy
```
POST https://fortify.rocks/api/webhooks/github
Headers:
  X-GitHub-Event: pull_request
  X-GitHub-Delivery: uuid
  X-Hub-Signature-256: sha256=...
  Content-Type: application/json
```

### 2. Next.js Proxy → Scan Agent
```
POST http://scan-server:8000/webhooks/github  
Headers:
  X-GitHub-Event: pull_request
  X-GitHub-Delivery: uuid
  X-Hub-Signature-256: sha256=...
  Content-Type: application/json
```

### 3. Response Flow
```
Scan Agent Response → Next.js Proxy → GitHub
{
  "status": "success",
  "job_id": "job_pr-123-abc12345",
  "proxy": {
    "processed_at": "2024-01-01T12:00:00.000Z",
    "processing_time_ms": 150
  }
}
```

## Environment Configuration

### Next.js Frontend Environment Variables

```bash
# Required for webhook proxy
SCAN_AGENT_URL=http://scan-server:8000  # Internal service URL
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Existing Next.js configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://fortify.rocks
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Scan Agent Environment Variables

```bash
# Required for webhook processing
GITHUB_WEBHOOK_SECRET=your_webhook_secret  # Must match frontend

# Existing scan agent configuration
PORT=8000
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=your_anthropic_key
```

## Docker Compose Configuration

The updated docker-compose.yml includes:

```yaml
services:
  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    environment:
      - SCAN_AGENT_URL=http://scan-server:8000
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    depends_on:
      - scan-server

  scan-server:
    build:
      context: ./
      dockerfile: scan-agent/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    networks:
      - app-network
```

## API Endpoints

### Next.js Proxy Endpoints

#### `POST /api/webhooks/github`
**Purpose**: Main webhook proxy endpoint
**Access**: Public (GitHub webhooks)
**Authentication**: GitHub webhook signature validation

**Example Response:**
```json
{
  "status": "success",
  "message": "Scan job created for PR #123",
  "job_id": "job_pr-123-abc12345",
  "repository": "owner/repo-name",
  "pull_request": 123,
  "proxy": {
    "processed_at": "2024-01-01T12:00:00.000Z",
    "processing_time_ms": 150,
    "scan_agent_url": "http://scan-server:8000",
    "proxy_version": "1.0.0"
  }
}
```

#### `GET /api/webhooks/github`  
**Purpose**: Health check and configuration validation
**Access**: Public (for testing)

**Example Response:**
```json
{
  "status": "healthy",
  "message": "GitHub Webhook Proxy is operational",
  "configuration": {
    "scan_agent_url": "http://scan-server:8000",
    "webhook_secret_configured": true,
    "scan_agent_status": "healthy"
  },
  "setup_instructions": {
    "github_webhook_config": {
      "payload_url": "https://fortify.rocks/api/webhooks/github",
      "content_type": "application/json",
      "events": ["pull_request", "push"]
    }
  }
}
```

### Scan Agent Endpoints (Internal)

#### `POST /webhooks/github`
**Purpose**: Process forwarded webhook requests
**Access**: Internal (from Next.js proxy only)
**Authentication**: Webhook signature validation

#### `POST /webhooks/github/test`
**Purpose**: Validate scan agent webhook configuration
**Access**: Internal testing

## Security Architecture

### Two-Layer Validation

1. **Next.js Proxy Layer**:
   - Validates GitHub webhook signatures
   - Filters malicious requests before they reach scan agent
   - Provides first line of defense

2. **Scan Agent Layer**:
   - Re-validates webhook signatures (defense in depth)
   - Processes only valid GitHub events
   - Creates scan jobs securely

### Signature Validation

Both layers use HMAC-SHA256 validation:
```javascript
// Next.js (Node.js crypto)
const hmac = crypto.createHmac("sha256", secret);
hmac.update(payload, "utf8");
const signature = hmac.digest("hex");

// Scan Agent (Python)
mac = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256)
signature = mac.hexdigest()
```

## Error Handling

### Proxy Layer Errors

1. **Scan Agent Unreachable**:
   ```json
   {
     "error": "Webhook proxy error",
     "message": "Failed to forward webhook: Connection refused",
     "proxy": { "scan_agent_url": "http://scan-server:8000" }
   }
   ```

2. **Timeout Errors**:
   ```json
   {
     "error": "Webhook proxy error", 
     "message": "Scan agent request timeout"
   }
   ```

3. **Signature Validation Failure**:
   ```json
   {
     "error": "Invalid webhook signature"
   }
   ```

### Scan Agent Errors

Forwarded as-is from scan agent with proxy metadata added.

## Monitoring and Logging

### Next.js Proxy Logs

```
[Webhook Proxy] Received GitHub webhook: event=pull_request, delivery=12345...
[Webhook Proxy] Webhook signature verification successful
[Webhook Proxy] Forwarding request to scan agent: http://scan-server:8000/webhooks/github
[Webhook Proxy] Scan agent response: 200 OK
[Webhook Proxy] Successfully processed pull_request event
[Webhook Proxy] Created scan job: job_pr-123-abc12345
[Webhook Proxy] Processing completed in 150ms
```

### Scan Agent Logs

```
INFO - Received GitHub webhook: event=pull_request, delivery=12345...
INFO - Webhook signature verification successful
INFO - Handling PR event: owner/repo PR #123
INFO - Created PR scan job: job_pr-123-abc12345
```

## Testing the Proxy Architecture

### 1. Test Proxy Health Check
```bash
curl https://fortify.rocks/api/webhooks/github
```

### 2. Test Full Integration
```bash
# Use the existing test script with updated URL
python test-webhook-integration.py
```

### 3. Test GitHub Webhook
Configure GitHub webhook with:
- **Payload URL**: `https://fortify.rocks/api/webhooks/github`
- **Content Type**: `application/json`
- **Events**: Pull requests, Pushes
- **Secret**: Your `GITHUB_WEBHOOK_SECRET`

## Deployment Considerations

### Production Setup

1. **Domain Configuration**:
   - Ensure `https://fortify.rocks` points to Next.js frontend
   - Configure SSL/TLS certificates

2. **Internal Networking**:
   - Scan agent accessible via internal network (Docker/Kubernetes)
   - Use service discovery names (`scan-server:8000`)

3. **Environment Variables**:
   - Set `SCAN_AGENT_URL` to internal service URL
   - Use same `GITHUB_WEBHOOK_SECRET` for both services

4. **Monitoring**:
   - Monitor proxy response times and error rates
   - Set up alerts for scan agent connectivity issues
   - Track webhook processing success rates

### Local Development

1. **Start Services**:
   ```bash
   docker-compose up frontend scan-server
   ```

2. **Test Endpoints**:
   ```bash
   # Test proxy
   curl http://localhost:3000/api/webhooks/github
   
   # Test scan agent 
   curl http://localhost:8000/webhooks/github/test
   ```

3. **Use ngrok for GitHub Testing**:
   ```bash
   ngrok http 3000
   # Use ngrok URL for GitHub webhook configuration
   ```

## Benefits of This Architecture

1. **Clean Separation**: Frontend handles public webhooks, scan agent focuses on processing
2. **Security**: Two-layer validation and internal network isolation
3. **Scalability**: Can scale proxy and processing layers independently  
4. **Monitoring**: Detailed logging at both proxy and processing layers
5. **Flexibility**: Easy to modify proxy logic without affecting scan processing
6. **Reliability**: Graceful error handling and timeout management

## Migration from Direct Integration

If you previously had direct webhook integration:

1. Update GitHub webhook URL from scan agent to Next.js proxy
2. Ensure environment variables are configured for both services
3. Test the proxy functionality before switching production webhooks
4. Monitor logs to ensure requests are being forwarded correctly

This proxy architecture provides a robust, scalable solution for GitHub webhook integration while maintaining security and operational visibility.