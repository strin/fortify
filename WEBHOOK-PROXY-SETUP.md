# 🚀 GitHub Webhook Proxy Setup Guide

This guide will help you set up the GitHub webhook integration with the Next.js proxy architecture.

## 🏗️ Architecture Overview

```
GitHub → Next.js Frontend (https://fortify.rocks) → Scan Agent Server
         /api/webhooks/github               /webhooks/github
```

The Next.js frontend acts as a public webhook proxy, forwarding requests to the internal scan agent server.

## ⚡ Quick Setup

### 1. Environment Configuration

Create environment files from the examples:

```bash
# Frontend environment
cp frontend/.env.example frontend/.env.local

# Scan agent environment  
cp scan-agent/.env.example scan-agent/.env
```

### 2. Configure Environment Variables

Edit the environment files with your values:

**Frontend (`frontend/.env.local`):**
```bash
SCAN_AGENT_URL=http://localhost:8000  # or http://scan-server:8000 in Docker
GITHUB_WEBHOOK_SECRET=your_secure_webhook_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://fortify.rocks
# ... other existing variables
```

**Scan Agent (`scan-agent/.env`):**
```bash
GITHUB_WEBHOOK_SECRET=your_secure_webhook_secret  # Must match frontend
PORT=8000
# ... other existing variables
```

### 3. Generate Webhook Secret

Generate a secure webhook secret:

```bash
# Option 1: Using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this secret for both `GITHUB_WEBHOOK_SECRET` variables.

### 4. Start Services

**Using Docker Compose:**
```bash
# Set the webhook secret in your environment
export GITHUB_WEBHOOK_SECRET=your_generated_secret

# Start all services
docker-compose up frontend scan-server
```

**Local Development:**
```bash
# Terminal 1: Start scan agent
cd scan-agent
./start-webhook-server.sh

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 5. Test the Integration

```bash
# Test the complete proxy integration
python test-webhook-proxy-integration.py

# Or test individual components
curl http://localhost:3000/api/webhooks/github  # Frontend proxy
curl http://localhost:8000/webhooks/github/test # Scan agent
```

### 6. Configure GitHub Webhook

In your GitHub repository:

1. Go to **Settings** → **Webhooks** → **Add webhook**
2. Configure:
   - **Payload URL**: `https://fortify.rocks/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET` value
   - **Events**: Select "Pull requests" and "Pushes"
   - **Active**: ✅ Checked

## 🧪 Testing

### Test Proxy Health
```bash
curl https://fortify.rocks/api/webhooks/github
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "GitHub Webhook Proxy is operational",
  "configuration": {
    "scan_agent_url": "http://scan-server:8000",
    "webhook_secret_configured": true,
    "scan_agent_status": "healthy"
  }
}
```

### Test Complete Integration
```bash
# Set environment variables if not already set
export FRONTEND_URL=http://localhost:3000  # or https://fortify.rocks
export SCAN_AGENT_URL=http://localhost:8000
export GITHUB_WEBHOOK_SECRET=your_secret

# Run comprehensive test
python test-webhook-proxy-integration.py
```

### Test Real GitHub Webhook
1. Create a test pull request in your repository
2. Check logs in both services:
   ```bash
   # Frontend logs (Docker)
   docker logs frontend
   
   # Scan agent logs (Docker)
   docker logs scan-server
   ```

## 📋 Troubleshooting

### Common Issues

**1. Proxy returns 500 error**
- Check `SCAN_AGENT_URL` is correct
- Ensure scan agent server is running
- Verify network connectivity between services

**2. Webhook signature validation fails**
- Ensure `GITHUB_WEBHOOK_SECRET` matches in both services
- Check GitHub webhook secret configuration
- Verify secret format (no extra spaces/newlines)

**3. Scan agent unreachable**
- In Docker: use `http://scan-server:8000`
- Locally: use `http://localhost:8000`
- Check port configuration and firewall rules

**4. GitHub webhook not triggering**
- Verify webhook URL is accessible from internet
- Check GitHub webhook delivery logs
- Test with ngrok for local development:
  ```bash
  ngrok http 3000
  # Use ngrok URL for webhook configuration
  ```

### Debug Commands

```bash
# Test frontend proxy directly
curl -X GET http://localhost:3000/api/webhooks/github

# Test scan agent directly
curl -X POST http://localhost:8000/webhooks/github/test

# Check Docker service logs
docker-compose logs frontend
docker-compose logs scan-server

# Test connectivity from frontend to scan agent
docker exec frontend curl http://scan-server:8000/health
```

## 🔧 Local Development with ngrok

For testing with real GitHub webhooks locally:

```bash
# Install ngrok
npm install -g ngrok

# Expose local frontend
ngrok http 3000

# Use the ngrok URL in GitHub webhook configuration
# Example: https://abc123.ngrok.io/api/webhooks/github
```

## 📈 Production Deployment

### Domain Configuration
1. Point `https://fortify.rocks` to your Next.js frontend
2. Ensure SSL/TLS certificates are configured
3. Set production environment variables

### Docker Production
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose ps
curl https://fortify.rocks/api/webhooks/github
```

### Environment Variables in Production
- Use secure secrets management (AWS Secrets Manager, etc.)
- Set `SCAN_AGENT_URL` to internal service URL
- Configure proper `NEXTAUTH_URL` for your domain

## 🎯 What Happens When a PR is Created

1. **GitHub** sends webhook to `https://fortify.rocks/api/webhooks/github`
2. **Next.js Proxy** receives and validates the webhook signature
3. **Proxy** forwards request to `http://scan-server:8000/webhooks/github`
4. **Scan Agent** processes the PR event and creates scan job
5. **Response** flows back: Scan Agent → Proxy → GitHub
6. **Background** scan job processes the PR code

## ✅ Success Indicators

- ✅ Proxy health check returns "healthy"
- ✅ Test script passes all tests
- ✅ GitHub webhook shows successful deliveries
- ✅ Scan jobs appear in `/jobs` endpoint
- ✅ Logs show successful webhook processing

You're now ready to receive GitHub PR events and automatically trigger security scans! 🎉