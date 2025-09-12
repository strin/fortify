# Fix Agent Architecture

> **Version:** v1.0  
> **Components:** `fix-agent` (Python FastAPI + Background Worker)  
> **Queue:** **Redis Lists** (brpoplpush pattern, following scan-agent model)  
> **Storage:** Postgres (FixJob and related models)  
> **Integration:** Claude Code SDK for AI-powered code fixing  
> **GitHub Integration:** GitHub API for PR creation and code modifications  
> **Status:** Architecture design phase  

---

## 1) Goals & Non‑Goals

### Goals

* **AI-Powered Vulnerability Fixing**: Automatically generate code fixes for vulnerabilities detected by scan-agent using Claude Code SDK
* **GitHub Integration**: Create pull requests with fixes automatically pushed to the target repository
* **Job-Based Architecture**: Mirror scan-agent structure with FixJob lifecycle management
* **User-Triggered Fixes**: Allow users to initiate fixes from the vulnerability UI with a single click
* **Branch-Based Fixes**: Create fixes on new branches with descriptive names based on vulnerability type
* **Atomic Operations**: Ensure fix jobs are processed atomically with proper error handling and rollback

### Non‑Goals

* **Multi-vulnerability Batch Fixes**: Each fix job handles one vulnerability at a time
* **Complex Code Refactoring**: Focus on targeted vulnerability fixes, not broad code improvements  
* **CI/CD Integration**: No automatic deployment of fixes (PRs require manual review and merge)
* **Multi-platform Support**: GitHub integration only in MVP
* **Real-time Collaboration**: No live editing or collaborative fixing features

---

## 2) System Architecture

```text
[Frontend Vulnerability Page]
        │  "Fix with Agent" button
        ▼
+-------------------+       POST /fix/vulnerability      +----------------------+
|   NextJS API      |  ─────────────────────────────▶   |   fix-agent          |
|   /api/fix        |                                    |   FastAPI Server     |
+-------------------+                                    +----------------------+
                                                                │
                                                                │ RPUSH (enqueue)
                                                                ▼
+----------------------+                                +----------------------+
|  Redis (Lists)       |  ◀───────────────────────────  |  Background Worker   |
|  queue: fix_jobs     |    BRPOPLPUSH (atomic claim)   |  (Python thread)     |
|  lists: pending,     |                                +----------------------+
|         processing   |                                        │
+----------------------+                                        │
                                                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Dependencies: GitHub API, Claude Code SDK, Git operations                    │
└───────────────────────────────────────────────────────────────────────────────┘
                                        ▼
                                  +------------------+
                                  | Postgres         |
                                  | FixJob model     |
                                  | Vulnerability    |
                                  | data reference   |
                                  +------------------+
```

**Key Components:**
1. **NextJS API Endpoint**: Receives fix requests from frontend, validates data, creates FixJob
2. **Fix-Agent FastAPI**: REST API for fix job management and status tracking  
3. **Background Worker**: Processes fix jobs using Claude Code SDK and GitHub API
4. **Redis Queue**: Atomic job claiming using brpoplpush pattern (same as scan-agent)
5. **GitHub Integration**: Creates branches, commits fixes, and submits pull requests

---

## 3) Fix Job Data Model

### FixJob Schema (Postgres)

```sql
model FixJob {
  id           String     @id @default(cuid())
  userId       String?    // User who initiated the fix
  
  // Fix job information
  type         FixJobType @default(VULNERABILITY_FIX)
  status       FixJobStatus @default(PENDING)
  data         Json       // FixJobData as JSON
  result       Json?      // Fix results (PR URL, commits, etc.)
  error        String?    // Error message if failed
  
  // Timing
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  startedAt    DateTime?
  finishedAt   DateTime?
  
  // References
  vulnerabilityId String  // Reference to CodeVulnerability
  scanJobId       String  // Reference to original ScanJob
  
  // GitHub integration results
  branchName      String? // Created branch name
  commitSha       String? // Fix commit SHA
  pullRequestUrl  String? // GitHub PR URL
  pullRequestId   Int?    // GitHub PR number
  
  // Relations
  user            User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  vulnerability   CodeVulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)
  scanJob         ScanJob           @relation(fields: [scanJobId], references: [id], onDelete: Cascade)
  
  @@index([status, createdAt])
  @@index([userId])
  @@index([vulnerabilityId])
  @@index([scanJobId])
  @@map("fix_jobs")
}

enum FixJobType {
  VULNERABILITY_FIX
  SECURITY_ENHANCEMENT
}

enum FixJobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}
```

### FixJobData Structure (JSON)

```json
{
  "vulnerabilityId": "cuid",
  "scanJobId": "cuid", 
  "repositoryUrl": "https://github.com/owner/repo.git",
  "branch": "main",
  "commitSha": "abc123...",
  "vulnerability": {
    "title": "SQL Injection in User Authentication",
    "filePath": "src/auth/login.js",
    "startLine": 42,
    "endLine": 45,
    "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
    "severity": "HIGH",
    "category": "INJECTION",
    "description": "Direct string concatenation allows SQL injection attacks",
    "recommendation": "Use parameterized queries to prevent injection"
  },
  "fixOptions": {
    "createBranch": true,
    "branchPrefix": "fix",
    "createPullRequest": true,
    "prTitle": "Fix: SQL Injection vulnerability in user authentication",
    "prDescription": "This PR fixes a SQL injection vulnerability found by Fortify security scan."
  }
}
```

---

## 4) Fix Job Lifecycle

```
PENDING
  └─(worker claims)→ IN_PROGRESS
      └→ Clone Repository         (git clone to temp directory)
         └→ Checkout Target Branch (git checkout branch)
            └→ Create Fix Branch   (git checkout -b fix/sql-injection-auth-123)
               └→ Generate Fix     (Claude Code SDK analysis + fix generation)
                  └→ Apply Fix     (modify source files)
                     └→ Commit Fix (git commit with descriptive message)
                        └→ Push Branch (git push origin fix/...)
                           └→ Create PR (GitHub API)
                              └→ Store Results → COMPLETED
                                ↘
                    FAILED (any stage; error stored, cleanup performed)
```

**Detailed States:**
- **PENDING**: Fix job queued, waiting for worker
- **IN_PROGRESS**: Worker processing fix (sub-stages tracked in logs)
- **COMPLETED**: Fix successfully applied, PR created
- **FAILED**: Fix failed at any stage, error details stored
- **CANCELLED**: User cancelled fix before completion

---

## 5) Fix Agent API Design

**Base URL**: `http://localhost:8001` (development, port offset from scan-agent)

### Core Endpoints

* **`POST /fix/vulnerability`**
  - Body: `{ "vulnerabilityId": "cuid", "fixOptions": {...} }`
  - Creates FixJob, queues for processing
  - Response: `{ "fixJobId": "uuid", "message": "Fix job created successfully" }`

* **`GET /fix/jobs/{fixJobId}`**
  - Returns: `{ "id": "uuid", "status": "completed", "data": {...}, "result": {...} }`
  - Includes PR URL and fix details when completed

* **`GET /fix/jobs/{fixJobId}/status`**
  - Lightweight status check for frontend polling
  - Response: `{ "status": "in_progress", "message": "Generating fix..." }`

* **`POST /fix/jobs/{fixJobId}/cancel`**
  - Cancels in-progress fix job
  - Cleans up branches and temporary files

* **`GET /fix/jobs`**
  - Query params: `?userId={id}&status=completed&vulnerabilityId={id}`
  - Returns paginated list of fix jobs

### Status and Monitoring

* **`GET /health`**
  - Health check endpoint with worker status
  
* **`GET /metrics`**
  - Fix job statistics and performance metrics

---

## 6) Background Worker Implementation

### Worker Architecture

**Single-Process Model**: Following scan-agent pattern with FastAPI + background worker thread

**Worker Loop:**
1. **Job Claiming**: `brpoplpush` from `fix_jobs:pending` to `fix_jobs:processing`
2. **Repository Preparation**: Clone repository, create fix branch
3. **Claude Code Integration**: Generate fix using AI with vulnerability context
4. **Code Application**: Apply fix to source files with validation
5. **GitHub Operations**: Commit changes, push branch, create pull request
6. **Result Storage**: Update FixJob with PR details and completion status

### Key Components

#### 6.1) Repository Manager
```python
class RepositoryManager:
    """Handles git operations for fix jobs"""
    
    async def clone_repository(self, repo_url: str, branch: str) -> str:
        """Clone repository to temporary directory"""
        
    async def create_fix_branch(self, repo_path: str, vulnerability_id: str) -> str:
        """Create descriptive branch name and checkout"""
        # Branch naming: fix/injection-auth-{vulnerability_id_short}
        
    async def apply_fix(self, repo_path: str, file_path: str, fix_content: str):
        """Apply generated fix to source file"""
        
    async def commit_and_push(self, repo_path: str, branch: str, commit_message: str):
        """Commit fix and push to GitHub"""
```

#### 6.2) Claude Code Fix Generator  
```python
class ClaudeFixGenerator:
    """Uses Claude Code SDK to generate vulnerability fixes"""
    
    async def generate_fix(self, vulnerability: dict, repo_path: str) -> dict:
        """Generate fix for specific vulnerability"""
        # Returns: { "fixedCode": "...", "explanation": "...", "confidence": 0.95 }
        
    def _build_fix_prompt(self, vulnerability: dict) -> str:
        """Build Claude prompt for vulnerability fixing"""
        # Include vulnerability details, code snippet, and fix requirements
```

#### 6.3) GitHub Integration
```python
class GitHubClient:
    """Handles GitHub API operations"""
    
    async def create_pull_request(self, repo: str, branch: str, fix_data: dict) -> dict:
        """Create pull request with fix"""
        
    async def update_pr_description(self, repo: str, pr_number: int, description: str):
        """Update PR with additional context"""
```

### 6.4) Error Handling and Recovery

**Cleanup Strategy:**
- Temporary directories always cleaned up (try/finally blocks)
- Failed branches deleted from remote if created
- Database transactions rolled back on failure
- Detailed error logging with vulnerability context

**Recovery Mechanisms:**
- Job timeout handling (30-minute max per fix)
- Automatic retry for transient GitHub API failures  
- Dead letter queue for consistently failing jobs
- Graceful degradation if GitHub API unavailable

---

## 7) Frontend Integration

### Vulnerability Card Enhancement

**New UI Elements:**
- "Fix with Agent" button visible on hover over vulnerability cards
- Loading state when fix job is in progress
- Success state with link to created PR
- Error state with retry option

**Button States:**
```typescript
type FixButtonState = 
  | 'idle'           // Default state, ready to fix
  | 'loading'        // Fix job in progress
  | 'completed'      // Fix completed, PR created
  | 'failed'         // Fix failed, retry available
  | 'unavailable'    // Fix not supported for this vulnerability type
```

### NextJS API Integration

**New API Route**: `/api/fix/vulnerability`
```typescript
// /frontend/src/app/api/fix/vulnerability/route.ts
export async function POST(request: Request) {
  // 1. Validate user authentication
  // 2. Extract vulnerability data from request
  // 3. Call fix-agent API to create FixJob
  // 4. Return fix job ID for frontend polling
}
```

**Polling Integration**: Frontend polls fix job status until completion
```typescript
// Custom hook for fix job status
const useFixJobStatus = (fixJobId: string) => {
  // Poll fix-agent API every 5 seconds
  // Handle job completion and error states
  // Return current status and result data
}
```

---

## 8) Security Considerations

### Authentication and Authorization
- **GitHub Token Management**: Use user's GitHub token for repository access
- **Repository Permissions**: Verify user has write access before creating fix jobs
- **Rate Limiting**: Prevent abuse of fix generation API
- **Input Validation**: Sanitize all user inputs and vulnerability data

### Code Safety
- **Sandboxed Execution**: Fix generation runs in isolated temporary directories
- **Code Review Requirement**: All fixes create PRs (no direct pushes to main branch)
- **Fix Validation**: Generated fixes validated before commit
- **Rollback Capability**: Failed fixes cleaned up automatically

### GitHub Integration Security
- **Token Scoping**: Minimal required permissions for GitHub operations
- **Webhook Verification**: Verify GitHub webhook signatures if implemented
- **Repository Validation**: Confirm repository ownership before operations
- **Branch Protection**: Respect branch protection rules

---

## 9) Monitoring and Observability

### Metrics Collection
- **Fix Success Rate**: Percentage of successful fix jobs by vulnerability type
- **Time to Fix**: Average time from job creation to PR submission  
- **GitHub API Usage**: Track API rate limit consumption
- **Claude SDK Performance**: Token usage and response times

### Logging Strategy  
- **Structured Logging**: JSON logs with vulnerability and job context
- **Fix Traceability**: Link fix jobs to original scan jobs and vulnerabilities
- **Error Categorization**: Classify failures by type (Claude, GitHub, Git, etc.)
- **User Activity Tracking**: Track which users are creating fix jobs

### Health Checks
- **Service Health**: Fix-agent API and worker thread status
- **External Dependencies**: GitHub API and Claude Code SDK availability
- **Queue Health**: Redis connection and job queue sizes
- **Database Health**: PostgreSQL connection and query performance

---

## 10) Deployment Architecture

### Development Environment
```yaml
# docker-compose.yml addition
fix-agent:
  build: ./fix-agent
  ports:
    - "8001:8000"  # Different port from scan-agent
  environment:
    - DATABASE_URL=postgresql://...
    - REDIS_URL=redis://redis:6379
    - GITHUB_API_URL=https://api.github.com
    - CLAUDE_API_KEY=${CLAUDE_API_KEY}
  depends_on:
    - postgres
    - redis
    - scan-agent
```

### Production Considerations
- **Container Orchestration**: Kubernetes deployment with proper resource limits
- **Scaling**: Horizontal scaling of worker processes based on queue depth
- **High Availability**: Multiple replicas with load balancing
- **Secret Management**: Secure storage of GitHub tokens and Claude API keys
- **Monitoring Integration**: Prometheus metrics and Grafana dashboards

---

## 11) Integration with Existing System

### Database Schema Migration
```sql
-- Add FixJob table and relations
-- Migration: 20250912000000_add_fix_job_schema

-- Add relation from CodeVulnerability to FixJob
ALTER TABLE code_vulnerabilities ADD COLUMN fixJobId TEXT REFERENCES fix_jobs(id);

-- Add indexes for performance
CREATE INDEX code_vulnerabilities_fixJobId_idx ON code_vulnerabilities(fixJobId);
```

### Scan-Agent Integration
- **Shared Database**: FixJob references existing CodeVulnerability records
- **API Coordination**: scan-agent API extended to support fix job queries
- **Queue Isolation**: Separate Redis queues to avoid interference
- **Shared Utilities**: Common database and GitHub client libraries

### Frontend Updates
- **Component Library**: Extend existing shadcn/ui components for fix functionality
- **API Client**: Extend existing API client with fix endpoints
- **State Management**: Integrate fix job status into vulnerability state
- **Routing**: Add fix job detail pages and status views

---

## 12) Future Enhancements

### Advanced Fix Capabilities
- **Multi-file Fixes**: Handle vulnerabilities spanning multiple files
- **Dependency Updates**: Automatic package dependency fixes
- **Test Generation**: Generate unit tests for fixed code
- **Documentation Updates**: Update comments and documentation

### Workflow Integration  
- **GitHub Actions**: Trigger additional checks on fix PRs
- **Code Review Automation**: AI-assisted code review of generated fixes
- **Deployment Pipeline**: Integration with CI/CD for fix validation
- **Rollback Automation**: Automatic rollback if fixes cause issues

### User Experience
- **Bulk Fixing**: Fix multiple related vulnerabilities in single PR
- **Fix Customization**: Allow users to modify fixes before applying
- **Fix History**: Track and display fix success rates by vulnerability type
- **Learning Integration**: Improve fix quality based on user feedback

---

## 13) Success Metrics

### Technical Metrics
- **Fix Accuracy**: Percentage of fixes that successfully resolve vulnerabilities
- **PR Merge Rate**: Percentage of fix PRs that get merged
- **Time to Resolution**: Average time from vulnerability detection to fix deployment
- **System Reliability**: Uptime and error rates for fix-agent service

### User Experience Metrics  
- **Adoption Rate**: Percentage of users who use fix-agent for vulnerabilities
- **User Satisfaction**: Feedback scores on fix quality and usefulness
- **Developer Productivity**: Reduction in manual fix time
- **Security Posture**: Reduction in vulnerability backlog over time

### Business Impact
- **Vulnerability Resolution Speed**: Faster security issue remediation
- **Developer Efficiency**: Less manual security fix work
- **Code Quality**: Improvement in overall codebase security
- **Risk Reduction**: Decreased exposure time for security vulnerabilities