# Scan System Architecture (Current Implementation)

> **Version:** v0.3 (Updated to reflect current implementation)
> **Components:** `scan-agent` (Python FastAPI + Background Worker)
> **Queue:** **Redis Lists** (simple brpoplpush-based queue)
> **Storage:** Postgres (basic User model), In-memory job results
> **Integration:** Claude Code SDK (not CLI)
> **Status:** MVP implementation, not yet connected to frontend

---

## 1) Goals & Non‑Goals

### Goals

* **MVP Implementation**: Single Python service with FastAPI server + background worker.
* Use **Redis** as simple job queue using lists (brpoplpush pattern).
* Basic **ScanJob** lifecycle with core states (pending, in_progress, completed, failed).
* **Claude Code SDK** integration for AI-powered vulnerability scanning.
* Repository cloning and temporary workspace management.

### Non‑Goals

* Not a CI runner or build system.
* Not a full SAST aggregator; focused on Claude-based analysis.
* No multi-tenant isolation or complex access controls in MVP.
* No SARIF export or complex vulnerability schema in current version.

---

## 2) Current Implementation Architecture

```text
[Frontend (Next.js)]
        │  (Not yet connected)
        ▼
+-------------------+       RPUSH (enqueue)      +----------------------+
|   scan-agent      |  ───────────────────────▶  |  Redis (Lists)       |
|  FastAPI Server   |                            |  queue: scan_jobs    |
+-------------------+                            |  lists: pending,     |
        ▲      │    store job metadata          |         processing   |
        │      │                                +----------------------+
        │      │                                         │
        │      └─────────── REST API ────────────────────┘
        │                                                ▼
        │                                        +---------------------+
        └──────────────── same process ─────────▶ |  Background Worker |
                                                  |  (Python thread)   |
                                                  +---------------------+
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │  Dependencies: GitHub (clone), Claude Code SDK, temp filesystem              │
   └───────────────────────────────────────────────────────────────────────────────┘
                                        ▼
                                  +------------------+
                                  | Postgres         |
                                  | User model only  |
                                  | (Jobs in Redis)  |
                                  +------------------+
```

**Why Simple Lists?** Current MVP uses Redis `brpoplpush` for atomic job claiming between `pending` and `processing` lists. Simpler than Streams but lacks advanced features like consumer groups and automatic retry.

---

## 3) Queue Model (Current: Redis Lists)

* **Pending Queue**: `scan_jobs:pending` — list of job IDs waiting to be processed.
* **Processing Queue**: `scan_jobs:processing` — list of job IDs currently being worked on.
* **Job Storage**: `scan_jobs:jobs` — hash map storing full job data by job ID.
* **Atomic Operations**: `brpoplpush` moves jobs from pending to processing atomically.
* **Failure Handling**: Jobs moved back to pending queue or marked as failed in job data.

### Job Data Structure (stored in Redis hash)

```json
{
  "id": "uuid",
  "type": "scan_repo",
  "status": "pending|in_progress|completed|failed",
  "data": {
    "repo_url": "https://github.com/owner/repo.git",
    "branch": "main",
    "scan_options": {},
    "claude_cli_args": null
  },
  "created_at": "2025-01-27T12:00:00Z",
  "updated_at": "2025-01-27T12:00:00Z",
  "result": null,
  "error": null
}
```

---

## 4) Scan Lifecycle (Current Implementation)

```
PENDING
  └─(worker claims)→ IN_PROGRESS
      └→ Clone Repository      (git clone to temp directory)
         └→ Run Claude Scan    (Claude Code SDK analysis)
            └→ Process Results (extract findings from Claude output)
               └→ Store Results (in job.result field)
                  └→ COMPLETED
                    ↘
FAILED (any stage; error stored in job.error field)
```

**Simplified States**: Current implementation uses 4 basic states managed entirely in Redis. No complex sub-states or progress tracking.

---

## 5) Current API (scan-agent FastAPI)

**Base URL**: `http://localhost:8000` (development)

* `POST /scan/repo`

  * Body: `{ "repo_url": "https://github.com/owner/repo.git", "branch": "main", "claude_cli_args": null, "scan_options": {} }`
  * Behavior: Create job in Redis, add to pending queue, return job ID
  * Response: `{ "job_id": "uuid", "message": "Scan job created successfully" }`

* `GET /jobs/{job_id}`

  * Returns: `{ "id": "uuid", "type": "scan_repo", "status": "completed", "data": {...}, "result": {...}, "error": null }`

* `GET /jobs`

  * Query params: `?status=completed&limit=50`
  * Returns: Array of job objects

* `POST /jobs/{job_id}/cancel`

  * Marks job as failed with cancellation message

* `GET /health`

  * Health check endpoint

---

## 6) Current Worker Implementation

**Single-Process Architecture**: Worker runs in the same process as the FastAPI server, not as separate agents.

**Worker Loop**:

1. `brpoplpush` to atomically claim jobs from `pending` to `processing` queue (1s timeout).
2. For each claimed job:

   * Update job status to `IN_PROGRESS` in Redis hash.
   * Parse job data to extract `repo_url`, `branch`, and `claude_cli_args`.
   * Create temporary directory with `tempfile.mkdtemp()`.
   * Clone repository using `git clone --depth 1 --branch {branch}` (5min timeout).
   * Run Claude Code SDK with security audit prompt.
   * Process Claude response to extract vulnerabilities and analysis.
   * Store results in job's `result` field and mark as `COMPLETED`.
   * Remove job from `processing` queue.

3. On error:
   * Store error in job's `error` field and mark as `FAILED`.
   * Remove from `processing` queue.
   * Clean up temporary directory.

**No Authentication**: Current implementation doesn't use GitHub tokens or access controls.

---

## 7) Current Data Model

**Current State**: Minimal Postgres schema with only user management. All job data stored in Redis.

### Existing Postgres Schema

```sql
-- User management only
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  username          String?  @unique
  githubUsername    String?  @unique
  displayName       String?
  avatarUrl         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  -- Authentication
  password          String?
  emailVerified     DateTime?
  lastLoginAt       DateTime?
  isActive          Boolean   @default(true)
  githubAccessToken String?
  
  -- User preferences
  preferences       Json?
}
```

### Redis Data Storage

**Jobs**: All scan job data stored in Redis hash `scan_jobs:jobs`
**Queues**: Simple lists for job management
**Results**: Job results stored in Redis as JSON in job's `result` field

**Future Schema**: The complex schema shown in previous sections represents the target architecture, not current implementation.

---

## 8) Current Security & Networking

**Development Setup**: Current implementation is designed for local development and testing.

* **Redis**: Local Redis instance, no authentication required.
* **Authentication**: No API authentication implemented yet.
* **GitHub Access**: Public repositories only, no token-based access.
* **Sandboxing**: Basic temporary directory cleanup, no container isolation.
* **Secrets**: Environment variables for basic configuration.

**Security Gaps** (to be addressed in production):
* No API authentication or authorization
* No GitHub token management
* No request rate limiting
* No input validation for repository URLs
* No sandboxing of cloned repositories

---

## 9) Current Operations

**Single-Process Deployment**: Current implementation runs as one Python process with FastAPI + background worker thread.

* **Concurrency**: Single worker processes jobs sequentially (no parallel processing).
* **Scaling**: Manual scaling by running multiple instances (no coordination).
* **Retries**: Basic error handling, jobs marked as failed (no automatic retry).
* **Monitoring**: Console logging only, no metrics collection.
* **Resource Management**: 
  * 5-minute timeout on git clone operations
  * Temporary directory cleanup after each job
  * No repository size limits or file filtering

**Operational Gaps**:
* No health checks or monitoring dashboards
* No job queue size limits or backpressure handling
* No graceful shutdown handling
* No persistent error tracking

---

## 10) Current Reliability

**Limited Reliability**: Current implementation has basic error handling but no sophisticated reliability guarantees.

* **No Deduplication**: Same repository can be scanned multiple times with different job IDs.
* **Job Recovery**: If worker crashes mid-job, job remains in `processing` queue indefinitely.
* **State Consistency**: Job state only stored in Redis - no durability guarantees.
* **Cleanup**: Temporary directories cleaned up on completion, but not on crash.

**Missing Features**:
* No job timeout handling
* No dead letter queue for failed jobs
* No job deduplication by repository + commit
* No transactional guarantees between Redis and file system operations

---

## 12) Evolution Roadmap

### Current State (MVP)
- ✅ Basic FastAPI server with job creation
- ✅ Redis-based job queue with simple lists
- ✅ Background worker with git clone + Claude SDK
- ✅ Basic error handling and logging

### Next Steps (Integration)
1. **Frontend Integration**: Connect Next.js frontend to scan-agent API
2. **Authentication**: Add GitHub token support for private repositories  
3. **Database Integration**: Store scan results in Postgres instead of Redis
4. **Basic Security**: Input validation, rate limiting, request authentication

### Future Enhancements (Production)
1. **Advanced Queue**: Migrate to Redis Streams for better reliability
2. **Multi-tenant**: Add organization isolation and resource limits
3. **Scaling**: Container deployment with horizontal scaling
4. **Monitoring**: Add metrics, health checks, and observability

---

## 13) Current Limitations & Future Work

### Current Limitations
- **No SARIF Export**: Results stored as unstructured JSON, not industry-standard SARIF format
- **No Frontend Integration**: Scan functionality exists but not accessible from UI  
- **Single Repository Support**: No batch scanning or project-level management
- **Basic Claude Integration**: Uses hardcoded security audit prompt, no customization
- **No Result Persistence**: Scan results lost when Redis is cleared

### Future Architecture Goals
- **Structured Vulnerability Schema**: Implement proper `CodeVulnerability` model with CWE/CVE mapping
- **SARIF Export**: `CodeVulnerability → SARIF result` with proper rule mapping and locations
- **Multi-tool Integration**: Support for additional SAST tools beyond Claude
- **Advanced Queue Management**: Redis Streams with consumer groups, DLQ, and retry logic
- **Production Deployment**: Container-based deployment with proper monitoring and scaling
