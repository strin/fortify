# GitHub Checks Integration

## Overview

This document describes the GitHub Checks integration for the Fortify security scanning platform. GitHub Checks provide a way to display detailed scan results directly in GitHub pull requests and commits, giving developers immediate feedback about security vulnerabilities.

## Architecture

### High-Level Flow

1. **Webhook Trigger**: When a PR is created/updated or code is pushed, GitHub sends a webhook to our system
2. **Scan Job Creation**: The scan agent creates a scan job and immediately creates a GitHub check with "pending" status
3. **Check Updates**: As the scan progresses, the check status is updated with progress information
4. **Results Display**: Once complete, the check shows success/failure with a link to detailed results

### Components

#### 1. GitHub Checks Client (`github_checks.py`)
- **Purpose**: Handle GitHub Checks API operations
- **Responsibilities**:
  - Create checks for new scan jobs
  - Update check status during scan lifecycle
  - Set final check status with results summary
  - Generate links to scan job pages

#### 2. Enhanced Scan Worker
- **Purpose**: Integrate check updates into scan lifecycle
- **Responsibilities**:
  - Create initial check when scan starts
  - Update check with progress information
  - Set final check status based on scan results

#### 3. Database Schema Extensions
- **Purpose**: Track GitHub check associations
- **New Fields**:
  - `ScanJob.githubCheckId`: Optional field to store GitHub check ID
  - `ScanJob.githubCheckUrl`: Optional field to store GitHub check URL

## GitHub Checks API Integration

### Check States and Transitions

```
Initial PR/Push Event
         ↓
    [Create Check]
         ↓
    Status: QUEUED
         ↓
   [Scan Starts] 
         ↓
  Status: IN_PROGRESS
         ↓
   [Scan Completes]
         ↓
Status: COMPLETED (success/failure)
```

### Check Status Mapping

| Scan Job Status                   | GitHub Check Status | GitHub Check Conclusion |
| --------------------------------- | ------------------- | ----------------------- |
| PENDING                           | queued              | null                    |
| IN_PROGRESS                       | in_progress         | null                    |
| COMPLETED (no vulnerabilities)    | completed           | success                 |
| COMPLETED (vulnerabilities found) | completed           | neutral                 |
| FAILED                            | completed           | failure                 |

### Check Content Structure

#### Summary
- **Title**: "Fortify Security Scan"
- **Summary**: Brief scan results (e.g., "Found 3 vulnerabilities")
- **Details URL**: Link to scan job page in Fortify dashboard

#### Text Content
- Scan summary with vulnerability counts by severity
- Link to detailed results
- Scan metadata (branch, commit, timing)

## Implementation Details

### 1. GitHub Checks Client

```python
class GitHubChecksClient:
    """Client for GitHub Checks API operations."""
    
    async def create_check_run(self, owner, repo, head_sha, job_id, details_url):
        """Create a new check run for a scan job."""
    
    async def update_check_run(self, owner, repo, check_run_id, status, conclusion=None):
        """Update check run status and conclusion."""
    
    async def complete_check_run(self, owner, repo, check_run_id, conclusion, summary):
        """Complete a check run with final results."""
```

### 2. Integration Points

#### Webhook Handler Enhancement
- Extract repository info and commit SHA from webhook payload
- Pass GitHub context to scan job creation

#### Scan Worker Enhancement
- Create GitHub check when scan starts
- Update check progress during scan
- Set final check status based on results

#### Database Schema Update
```sql
ALTER TABLE scan_jobs ADD COLUMN github_check_id VARCHAR(255);
ALTER TABLE scan_jobs ADD COLUMN github_check_url TEXT;
```

## URL Structure

### Scan Job Page URLs
- Pattern: `https://fortify.rocks/jobs/{job_id}`
- Used as `details_url` in GitHub checks
- Provides detailed scan results and vulnerability information

### Check Details Flow
1. User clicks "Details" in GitHub check
2. Redirected to Fortify scan job page
3. Can view full vulnerability report, recommendations, and history

## Configuration

### Environment Variables
- `GITHUB_APP_ID`: GitHub App ID (if using GitHub App)
- `GITHUB_APP_PRIVATE_KEY`: GitHub App private key (if using GitHub App)
- `GITHUB_ACCESS_TOKEN`: OAuth access token (current OAuth implementation)
- `FORTIFY_BASE_URL`: Base URL for Fortify dashboard (for details links)

### GitHub Permissions Required
- **Checks**: write (to create and update check runs)
- **Pull requests**: read (to access PR information)
- **Contents**: read (to access repository contents)

## OAuth vs GitHub App Considerations

### Current OAuth Implementation
- Uses user's OAuth token for API calls
- Checks appear as created by the authenticated user
- Simpler to implement with existing OAuth flow

### Future GitHub App Migration
- Checks would appear as created by the Fortify app
- More enterprise-friendly and stable
- Requires additional GitHub App setup and JWT authentication

## Error Handling

### GitHub API Failures
- Log errors but don't fail the scan
- Retry with exponential backoff for transient failures
- Graceful degradation if checks can't be created/updated

### Authentication Issues
- Detect insufficient permissions
- Log appropriate error messages
- Continue scan without GitHub integration

## Security Considerations

### Access Token Security
- Store tokens securely (encrypted in database)
- Use least-privilege permissions
- Implement token refresh logic for OAuth

### Data Privacy
- Don't include sensitive code snippets in check summaries
- Link to secure Fortify dashboard for detailed results
- Respect repository visibility settings

## Future Enhancements

### Rich Check Content
- Inline vulnerability annotations
- Diff-based vulnerability highlighting
- Interactive remediation suggestions

### Check Suites
- Group multiple checks under a single suite
- Separate checks for different vulnerability categories
- Custom check configurations per repository

### Integration Improvements
- Webhook signature validation enhancements
- Better error reporting in GitHub UI
- Support for GitHub Enterprise instances

## Testing Strategy

### Unit Tests
- GitHub Checks client methods
- Status mapping logic
- Error handling scenarios

### Integration Tests
- End-to-end webhook to check creation flow
- Check update lifecycle
- Error recovery scenarios

### Manual Testing
- Test with real GitHub repositories
- Verify check appearance in PR UI
- Validate details link functionality
