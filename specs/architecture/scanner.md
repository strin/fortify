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
  "type": "SCAN_REPO",
  "status": "PENDING|IN_PROGRESS|COMPLETED|FAILED",
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

### 5.1) New Database-Integrated API Endpoints

**Enhanced Job Endpoints** (with database integration):

* `GET /jobs/{job_id}/vulnerabilities`

  * Query params: `?severity=HIGH&category=INJECTION&page=1&limit=20`
  * Returns: `{ "vulnerabilities": [...], "total": 15, "page": 1, "totalPages": 1 }`
  * Fetches vulnerabilities from database instead of Redis

* `GET /jobs/{job_id}/summary`

  * Returns: `{ "total": 15, "by_severity": {"HIGH": 3, "MEDIUM": 12}, "by_category": {...} }`
  * Database-driven vulnerability statistics

* `GET /vulnerabilities/{vulnerability_id}`

  * Returns: Full vulnerability details with metadata
  * Direct database lookup by vulnerability ID

**New Vulnerability Management Endpoints**:

* `GET /vulnerabilities`

  * Query params: `?filePath=src/auth&severity=HIGH&userId={user_id}&page=1&limit=50`
  * Returns: Paginated list of vulnerabilities across all scans
  * Supports filtering by user, file path, severity, category

* `PATCH /vulnerabilities/{vulnerability_id}`

  * Body: `{ "status": "acknowledged|fixed|false_positive" }`
  * Update vulnerability status (future: add status tracking to schema)

* `GET /users/{user_id}/vulnerabilities/stats`

  * Returns: User's vulnerability statistics across all scans
  * Summary dashboard data for frontend

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
   * **Extract vulnerability data** from Claude Code output (see §6.1).
   * **Save vulnerabilities to database** using Prisma (see §6.2).
   * Store summary results in job's `result` field and mark as `COMPLETED`.
   * Remove job from `processing` queue.

3. On error:
   * Store error in job's `error` field and mark as `FAILED`.
   * Remove from `processing` queue.
   * Clean up temporary directory.

**No Authentication**: Current implementation doesn't use GitHub tokens or access controls.

### 6.1) Vulnerability Extraction Process

**Primary Method**: File-based extraction from Claude Code output
```
1. Claude Code creates `vulnerability_report.json` in repository root
2. Scanner reads and validates JSON structure
3. Each vulnerability object is validated against required schema
4. Invalid/malformed vulnerabilities are logged and skipped
```

**Fallback Method**: Conversation parsing
```
1. If no file found, parse conversation for JSON blocks
2. Extract JSON arrays between ```json and ``` markers
3. Use same validation process as file-based method
```

**Expected JSON Structure**:
```json
[
  {
    "title": "SQL Injection in User Authentication",
    "description": "Direct string concatenation allows SQL injection attacks",
    "severity": "HIGH|MEDIUM|LOW|CRITICAL|INFO",
    "category": "INJECTION|AUTHENTICATION|AUTHORIZATION|...",
    "filePath": "src/auth/login.js",
    "startLine": 42,
    "endLine": 45,
    "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
    "recommendation": "Use parameterized queries to prevent injection"
  }
]
```

### 6.2) Database Integration Process

**Database Connection**: Use Prisma client to connect to Postgres database

**Transaction Flow**:
```python
# 1. Start database transaction
async with prisma.tx() as transaction:
    
    # 2. Create/update ScanJob record
    scan_job = await transaction.scanjob.upsert(
        where={"id": job_id},
        data={
            "status": "COMPLETED",
            "vulnerabilitiesFound": len(valid_vulnerabilities),
            "finishedAt": datetime.now(),
            "result": summary_data
        }
    )
    
    # 3. Bulk insert vulnerabilities
    for vulnerability in valid_vulnerabilities:
        await transaction.codevulnerability.create(
            data={
                "scanJobId": scan_job.id,
                "title": vulnerability["title"],
                "description": vulnerability["description"],
                "severity": vulnerability["severity"],
                "category": vulnerability["category"],
                "filePath": vulnerability["filePath"],
                "startLine": vulnerability["startLine"],
                "endLine": vulnerability.get("endLine"),
                "codeSnippet": vulnerability["codeSnippet"],
                "recommendation": vulnerability["recommendation"],
                "metadata": extract_metadata(vulnerability)
            }
        )
```

**Error Handling**:
- Database connection failures → job marked as `FAILED`
- Invalid vulnerability data → skip individual vulnerability, continue processing
- Transaction failures → rollback, job marked as `FAILED`

### 6.3) Implementation Architecture

**Required Dependencies**:
```python
# Add to scan-agent/requirements.txt
prisma==0.11.0
asyncio
```

**Database Client Setup**:
```python
# scan-agent/scan_agent/utils/database.py
from prisma import Prisma
import asyncio

class DatabaseClient:
    def __init__(self):
        self.prisma = Prisma()
        
    async def connect(self):
        await self.prisma.connect()
        
    async def disconnect(self):
        await self.prisma.disconnect()
        
    async def save_scan_results(self, job_id: str, scan_results: dict):
        """Save scan results and vulnerabilities to database"""
        # Implementation in §6.4
```

**Worker Integration Points**:
1. **Job Start**: Create ScanJob record with `PENDING` status
2. **Job Progress**: Update ScanJob status to `IN_PROGRESS`
3. **Vulnerability Processing**: Parse and validate vulnerability JSON
4. **Database Transaction**: Save all vulnerabilities in single transaction
5. **Job Completion**: Update ScanJob with final status and summary

### 6.4) Detailed Implementation Flow

**Step 1: Initialize Database Connection**
```python
# In _process_scan_job method
db_client = DatabaseClient()
await db_client.connect()

try:
    # Create initial ScanJob record
    scan_job = await db_client.prisma.scanjob.create(
        data={
            "id": job.id,
            "type": job.type.value,
            "status": "IN_PROGRESS", 
            "data": job.data,
            "repoUrl": scan_data.repo_url,
            "branch": scan_data.branch,
            "startedAt": datetime.now()
        }
    )
```

**Step 2: Process Claude Code Results**
```python
# After Claude Code completes
vulnerabilities = extract_vulnerabilities_from_file(repo_path)
valid_vulnerabilities = validate_vulnerabilities(vulnerabilities)
```

**Step 3: Database Transaction**
```python
# Save all results atomically
async with db_client.prisma.tx() as transaction:
    # Update scan job
    await transaction.scanjob.update(
        where={"id": job.id},
        data={
            "status": "COMPLETED",
            "vulnerabilitiesFound": len(valid_vulnerabilities),
            "finishedAt": datetime.now(),
            "result": {
                "summary": f"Found {len(valid_vulnerabilities)} vulnerabilities",
                "severity_breakdown": calculate_severity_counts(valid_vulnerabilities)
            }
        }
    )
    
    # Insert vulnerabilities
    vulnerability_records = []
    for vuln in valid_vulnerabilities:
        vulnerability_records.append({
            "scanJobId": job.id,
            "title": vuln["title"],
            "description": vuln["description"],
            "severity": vuln["severity"],
            "category": vuln["category"],
            "filePath": vuln["filePath"],
            "startLine": vuln["startLine"],
            "endLine": vuln.get("endLine"),
            "codeSnippet": vuln["codeSnippet"],
            "recommendation": vuln["recommendation"],
            "metadata": extract_optional_metadata(vuln)
        })
    
    # Bulk insert vulnerabilities
    await transaction.codevulnerability.create_many(
        data=vulnerability_records
    )
```

**Step 4: Error Recovery**
```python
except Exception as db_error:
    logger.error(f"Database operation failed: {db_error}")
    
    # Mark job as failed in Redis (fallback)
    job.status = JobStatus.FAILED
    job.error = f"Database error: {str(db_error)}"
    job_queue.update_job(job)
    
finally:
    await db_client.disconnect()
```

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
1. **Database Integration**: ✅ Store scan results in Postgres (see §6.2-6.4)
2. **Frontend Integration**: Connect Next.js frontend to scan-agent API
3. **API Enhancement**: Add endpoints to query vulnerabilities from database
4. **Authentication**: Add GitHub token support for private repositories  
5. **Basic Security**: Input validation, rate limiting, request authentication

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
