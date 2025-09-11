# GitHub Checks Integration

This document provides comprehensive information about the GitHub Checks integration in the Fortify security scanning platform.

## Overview

The GitHub Checks integration allows Fortify to display scan results directly in GitHub pull requests and commits, providing developers with immediate feedback about security vulnerabilities without leaving their GitHub workflow.

## Features

- **Automatic Check Creation**: When a PR is created or code is pushed, Fortify automatically creates a GitHub check
- **Real-time Status Updates**: Check status updates as the scan progresses (queued → in_progress → completed)
- **Rich Results Display**: Detailed vulnerability summaries with severity breakdowns
- **Direct Links**: Click "Details" to view full scan results in the Fortify dashboard
- **Code Annotations**: Inline annotations on vulnerable code (up to 50 per check)
- **Smart Conclusions**: 
  - ✅ Success for clean scans
  - ⚠️ Neutral for scans with vulnerabilities (allows merge but draws attention)
  - ❌ Failure for scan errors

## Architecture

### Components

1. **GitHub Checks Client** (`scan_agent/utils/github_checks.py`)
   - Handles GitHub Checks API operations
   - Creates, updates, and completes check runs
   - Formats vulnerability data for GitHub display

2. **Enhanced Scan Worker** (`scan_agent/workers/scanner.py`)
   - Integrates check operations into scan lifecycle
   - Creates checks when scans start
   - Updates progress during scanning
   - Completes checks with final results

3. **Database Schema** (`db/schema.prisma`)
   - `ScanJob.githubCheckId`: Stores GitHub check run ID
   - `ScanJob.githubCheckUrl`: Stores GitHub check run URL

### Flow Diagram

```
GitHub Webhook → Scan Job Created → GitHub Check Created (queued)
                      ↓
                 Scan Starts → Check Updated (in_progress)
                      ↓
                Scan Completes → Check Completed (success/neutral/failure)
                      ↓
            User clicks "Details" → Fortify Dashboard
```

## Setup

### Prerequisites

1. **GitHub OAuth App** (current implementation)
   - Requires `repo` and `checks:write` permissions
   - User must have admin access to repositories for webhook creation

2. **Environment Variables**
   ```bash
   GITHUB_WEBHOOK_SECRET=your-webhook-secret
   FORTIFY_BASE_URL=https://your-domain.com  # For details links
   NEXTAUTH_URL=https://your-domain.com      # Fallback for base URL
   ```

3. **Database Migration**
   ```bash
   cd db
   npx prisma migrate dev --name add_github_check_fields
   ```

### Webhook Configuration

Webhooks are automatically configured when users set up repository integration through the Fortify dashboard. The webhook will:

- Listen for `pull_request` and `push` events
- Trigger security scans
- Create GitHub checks for each scan

## Usage

### For Repository Owners

1. **Setup Integration**
   - Go to your Fortify project settings
   - Add your GitHub repository
   - Configure webhook (requires admin access)

2. **View Results**
   - GitHub checks appear automatically on PRs and commits
   - Click "Details" to view full vulnerability reports
   - Checks update in real-time as scans progress

### For Developers

1. **Create/Update PR**
   - Push code or create PR
   - Fortify check appears in PR checks section
   - Wait for scan completion (usually 2-5 minutes)

2. **Review Results**
   - ✅ Green check = no vulnerabilities found
   - ⚠️ Yellow check = vulnerabilities found (review recommended)
   - ❌ Red check = scan failed (check logs)
   - Click "Details" for full vulnerability report

## Check Status Mapping

| Scan Job Status | GitHub Check Status | GitHub Check Conclusion | Description |
|----------------|-------------------|----------------------|-------------|
| PENDING | queued | null | Scan is queued and will start shortly |
| IN_PROGRESS | in_progress | null | Scan is actively running |
| COMPLETED (no vulnerabilities) | completed | success | No security issues found |
| COMPLETED (vulnerabilities found) | completed | neutral | Security issues found, review recommended |
| FAILED | completed | failure | Scan encountered an error |

## Check Content

### Summary Format

**No Vulnerabilities:**
```
✅ No vulnerabilities found
Fortify security scan completed successfully with no vulnerabilities detected.
```

**Vulnerabilities Found:**
```
🚨 Security issues found (5 total)
Found 1 critical, 2 high, 2 medium severity vulnerabilities.
```

**Scan Failed:**
```
❌ Scan failed
Security scan failed: [error message]
```

### Detailed Output

- Vulnerability count by severity
- Next steps for remediation
- Link to detailed Fortify dashboard
- Code annotations for specific vulnerabilities (up to 50)

## API Reference

### GitHubChecksClient

```python
from scan_agent.utils.github_checks import GitHubChecksClient

client = GitHubChecksClient(access_token="your_token")

# Create check run
check_run = await client.create_check_run(
    owner="owner",
    repo="repo", 
    head_sha="commit_sha",
    job_id="scan_job_id"
)

# Update progress
await client.update_check_run_status(
    owner="owner",
    repo="repo",
    check_run_id=check_run["id"],
    status="in_progress",
    output_title="Scanning...",
    output_summary="Analysis in progress"
)

# Complete with results
await client.complete_check_run(
    owner="owner",
    repo="repo", 
    check_run_id=check_run["id"],
    conclusion="success",
    output_title="✅ No issues found",
    output_summary="Scan completed successfully"
)
```

### Key Methods

- `create_check_run()`: Create new check run
- `update_check_run_status()`: Update status and output
- `complete_check_run()`: Complete with final results
- `format_vulnerability_summary()`: Format vulnerabilities for display
- `get_check_conclusion()`: Determine appropriate conclusion
- `create_scan_annotations()`: Create code annotations

## Testing

### Manual Testing

1. **Setup Test Environment**
   ```bash
   export GITHUB_ACCESS_TOKEN="your_token"
   export TEST_GITHUB_OWNER="your_username"
   export TEST_GITHUB_REPO="test_repo"
   export TEST_COMMIT_SHA="commit_sha_or_branch"
   ```

2. **Run Test Suite**
   ```bash
   cd scan-agent
   python test_github_checks.py
   ```

3. **Verify Results**
   - Check your GitHub repository for test check runs
   - Verify different status transitions
   - Test vulnerability display formatting

### Integration Testing

1. **Create Test PR**
   - Create a PR in a repository with Fortify integration
   - Push commits to trigger webhook
   - Verify check creation and updates

2. **Test Different Scenarios**
   - Clean code (should show success)
   - Code with vulnerabilities (should show neutral)
   - Invalid repository URL (should show failure)

## Troubleshooting

### Common Issues

1. **Check Not Created**
   - Verify webhook is configured correctly
   - Check GitHub access token permissions
   - Ensure user has admin access to repository
   - Check scan agent logs for errors

2. **Check Stuck in Queued**
   - Verify scan worker is running
   - Check Redis connection
   - Review scan agent logs for processing errors

3. **Check Shows Failure**
   - Review scan job logs in Fortify dashboard
   - Check Claude SDK configuration
   - Verify repository accessibility

4. **Details Link Broken**
   - Verify `FORTIFY_BASE_URL` environment variable
   - Check frontend deployment and accessibility
   - Ensure scan job page is publicly accessible

### Debug Commands

```bash
# Check scan agent logs
docker-compose logs scan-agent

# Check webhook deliveries in GitHub
# Go to Repository Settings → Webhooks → Recent Deliveries

# Test GitHub API access
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://api.github.com/repos/owner/repo/check-runs

# Check Redis queue
redis-cli -h localhost -p 6379 llen scan_jobs_queue
```

## Security Considerations

### Access Token Security

- Store GitHub access tokens securely in database (encrypted)
- Use least-privilege permissions (repo, checks:write)
- Implement token refresh logic for long-lived tokens
- Monitor token usage and revoke if compromised

### Data Privacy

- Don't include sensitive code snippets in check summaries
- Respect repository visibility settings
- Link to secure Fortify dashboard for detailed results
- Ensure webhook payloads are properly validated

### Rate Limiting

- GitHub API has rate limits (5000 requests/hour for authenticated users)
- Implement retry logic with exponential backoff
- Cache check run IDs to avoid unnecessary API calls
- Monitor API usage and implement queuing if needed

## Migration Path

### Current OAuth Implementation

- Uses user's OAuth token for API calls
- Checks appear as created by authenticated user
- Simple to implement with existing OAuth flow
- Works well for individual developers and small teams

### Future GitHub App Migration

- Checks would appear as created by Fortify app
- More enterprise-friendly and stable
- Independent of individual user accounts
- Requires GitHub App setup and JWT authentication

### Migration Steps (Future)

1. Create GitHub App with appropriate permissions
2. Implement JWT-based authentication
3. Update GitHubChecksClient to support both OAuth and App auth
4. Migrate existing integrations gradually
5. Deprecate OAuth-based checks

## Performance Optimization

### Async Operations

- All GitHub API calls are asynchronous
- Non-blocking integration with scan workflow
- Graceful degradation if GitHub API is unavailable

### Error Handling

- Retry failed API calls with exponential backoff
- Continue scan execution even if check creation fails
- Log all GitHub API errors for debugging

### Caching

- Cache repository metadata to reduce API calls
- Store check run IDs to avoid duplicate creation
- Implement smart update logic to minimize API usage

## Monitoring and Analytics

### Metrics to Track

- Check creation success rate
- Average time from scan start to check completion
- GitHub API error rates and types
- User engagement with check details links

### Logging

- All GitHub API interactions are logged
- Check status transitions are recorded
- Error conditions are captured with full context

### Alerting

- Monitor GitHub API rate limit usage
- Alert on high error rates or timeouts
- Track check completion rates

## Future Enhancements

### Rich Check Content

- Inline vulnerability annotations with fix suggestions
- Diff-based vulnerability highlighting
- Interactive remediation recommendations
- Security score trending over time

### Advanced Features

- Custom check configurations per repository
- Integration with GitHub Security Advisories
- Support for multiple check runs per scan (by category)
- GitHub Enterprise Server support

### Workflow Integration

- Integration with GitHub Actions
- Support for required status checks
- Custom merge policies based on security results
- Automated PR comments with detailed findings

## Support

### Documentation

- [GitHub Checks API Documentation](https://docs.github.com/en/rest/checks)
- [Fortify Architecture Documentation](../specs/architecture/)
- [GitHub Integration Specifications](../specs/architecture/integrations/)

### Getting Help

- Check scan agent logs for detailed error information
- Review GitHub webhook delivery logs
- Test GitHub API access manually
- Contact support with specific error messages and job IDs

### Contributing

- See [Contributing Guidelines](../CONTRIBUTING.md)
- Submit issues for bugs or feature requests
- Contribute test cases for edge scenarios
- Help improve documentation and examples
