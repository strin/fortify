"""Orchestrator server for vulnerability scanning."""

import os
import sys
import logging
import hmac
import hashlib
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, ValidationError
from datetime import datetime
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Package imports

from scan_agent.models.job import JobType, JobStatus, ScanJobData
from scan_agent.utils.queue import JobQueue
from scan_agent.workers.scanner import ScanWorker
from scan_agent.utils.github_client import GitHubClient, GitHubWebhookHandler

# Initialize FastAPI app
app = FastAPI(title="Vulnerability Scan Orchestrator", version="1.0.0")


# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed logging."""
    logger.error(f"Validation error for {request.method} {request.url}")
    logger.error(f"Validation errors: {exc.errors()}")

    # Try to get request body for debugging (may fail if already consumed)
    try:
        body = await request.body()
        logger.error(f"Request body: {body}")
        body_str = body.decode("utf-8") if body else "Empty body"
    except Exception as e:
        logger.error(f"Could not read request body: {e}")
        body_str = "Could not read body"

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Request validation failed",
            "url": str(request.url),
            "method": request.method,
        },
    )


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize job queue and worker
job_queue = JobQueue()
scan_worker = ScanWorker()

# Initialize GitHub webhook handler
github_webhook_handler = GitHubWebhookHandler()


def normalize_repo_url(repo_url: str) -> str:
    """Normalize repository URL by removing .git suffix if present."""
    if repo_url.endswith('.git'):
        normalized_url = repo_url[:-4]  # Remove .git suffix
        logger.debug(f"Normalized repository URL: {repo_url} -> {normalized_url}")
        return normalized_url
    return repo_url


# Background task to process a specific job
async def process_job_task(job_id: str):
    """Background task to process a specific job."""
    try:
        logger.info(f"Starting background processing for job {job_id}")

        # Get the job from the queue
        job = job_queue.get_job(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Process the job using the worker
        scan_worker.process_job(job)
        logger.info(f"Background processing completed for job {job_id}")

    except Exception as e:
        logger.error(
            f"Background processing failed for job {job_id}: {str(e)}", exc_info=True
        )


# Request/Response models
class ScanRepoRequest(BaseModel):
    repo_url: HttpUrl
    branch: Optional[str] = "main"
    claude_cli_args: Optional[str] = None
    scan_options: Optional[dict] = {}
    job_id: Optional[str] = None
    user_id: Optional[str] = None  # Required for database scan jobs
    project_id: Optional[str] = None  # Required for database scan jobs
    scan_target_id: Optional[str] = None  # Optional scan target ID


class JobResponse(BaseModel):
    job_id: str
    status: str
    created_at: datetime
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    type: str
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    result: Optional[dict] = None
    error: Optional[str] = None


# Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "scan-orchestrator"}


@app.post("/scan/repo", response_model=JobResponse)
async def scan_repository(request: ScanRepoRequest, background_tasks: BackgroundTasks):
    """Submit a repository for vulnerability scanning."""
    try:
        logger.info(f"Received scan request for repo: {request.repo_url}")
        logger.debug(
            f"Request details: repo_url={request.repo_url}, branch={request.branch}, claude_cli_args={request.claude_cli_args}, scan_options={request.scan_options}"
        )

        # Create job data
        scan_data = ScanJobData(
            repo_url=normalize_repo_url(str(request.repo_url)),
            branch=request.branch,
            claude_cli_args=request.claude_cli_args,
            scan_options=request.scan_options,
        )

        logger.debug(f"Created scan data: {scan_data.to_dict()}")

        # Create scan job with database record if user_id and project_id provided
        if request.user_id and request.project_id:
            job_id = await create_scan_job_with_database(
                user_id=request.user_id,
                project_id=request.project_id,
                scan_data=scan_data,
                scan_target_id=request.scan_target_id,
                job_type=JobType.SCAN_REPO,
            )
            logger.info(f"Created database scan job with ID: {job_id}")
        else:
            # Legacy mode: use provided job ID or generate new one
            job_id = job_queue.add_job(
                JobType.SCAN_REPO, scan_data.to_dict(), request.job_id
            )
            logger.info(f"Created queue-only job with ID: {job_id}")

        # Trigger background processing of the job
        background_tasks.add_task(process_job_task, job_id)
        logger.info(f"Added background task for job {job_id}")

        response = JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING.value,
            created_at=datetime.now(),
            message=f"Scan job created for repository: {request.repo_url}",
        )

        logger.debug(f"Returning response: {response.model_dump()}")
        return response

    except Exception as e:
        logger.error(f"Error creating scan job: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status of a specific job."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get timing information from database
    started_at = None
    finished_at = None
    try:
        from scan_agent.utils.database import get_db

        db = await get_db()
        scan_job = await db.scanjob.find_unique(
            where={"id": job_id}, select={"startedAt": True, "finishedAt": True}
        )
        if scan_job:
            started_at = scan_job.startedAt
            finished_at = scan_job.finishedAt
    except Exception as e:
        logger.warning(f"Failed to fetch timing info from database: {e}")

    return JobStatusResponse(
        job_id=job.id,
        status=job.status.value,
        type=job.type.value,
        created_at=job.created_at,
        updated_at=job.updated_at,
        started_at=started_at,
        finished_at=finished_at,
        result=job.result,
        error=job.error,
    )


@app.get("/jobs", response_model=List[JobStatusResponse])
async def list_jobs(status: Optional[str] = None, limit: int = 50):
    """List all jobs, optionally filtered by status."""
    try:
        # Parse status if provided
        status_filter = None
        if status:
            try:
                status_filter = JobStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

        # Get jobs from queue
        jobs = job_queue.list_jobs(status=status_filter, limit=limit)

        # Convert to response format
        return [
            JobStatusResponse(
                job_id=job.id,
                status=job.status.value,
                type=job.type.value,
                created_at=job.created_at,
                updated_at=job.updated_at,
                result=job.result,
                error=job.error,
            )
            for job in jobs
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a pending job."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatus.PENDING, JobStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=400, detail=f"Cannot cancel job in {job.status.value} status"
        )

    # Mark job as cancelled
    job_queue.cancel_job(job_id, "Job cancelled by user")

    return {"message": f"Job {job_id} cancelled"}


@app.post("/jobs/{job_id}/cancel")
async def cancel_job_post(job_id: str):
    """Cancel a job via POST method (for frontend compatibility)."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatus.PENDING, JobStatus.IN_PROGRESS]:
        raise HTTPException(
            status_code=400, detail=f"Cannot cancel job in {job.status.value} status"
        )

    # Mark job as cancelled
    job_queue.cancel_job(job_id, "Job cancelled by user")
    
    # Signal the worker if the job is currently being processed
    if job.status == JobStatus.IN_PROGRESS:
        scan_worker.request_cancellation(job_id)

    return {"message": f"Job {job_id} cancelled", "job_id": job_id, "status": "CANCELLED"}


@app.post("/webhooks/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_github_delivery: str = Header(None),
    x_hub_signature_256: str = Header(None),
    x_github_hook_id: str = Header(None),
):
    """Handle GitHub webhook events for pull requests and pushes."""
    try:
        # Log incoming webhook
        logger.info(
            f"Received GitHub webhook: event={x_github_event}, delivery={x_github_delivery}, hook_id={x_github_hook_id}"
        )

        # Read request body
        body = await request.body()
        logger.debug(f"Webhook payload size: {len(body)} bytes")

        # Verify webhook signature
        if not github_webhook_handler.verify_signature(body, x_hub_signature_256):
            logger.error("Webhook signature verification failed")
            raise HTTPException(status_code=403, detail="Invalid signature")

        # Parse JSON payload
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in webhook payload: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        # Log payload summary for debugging
        repo_name = payload.get("repository", {}).get("full_name", "unknown")
        logger.info(f"Processing webhook for repository: {repo_name}")

        # Require X-GitHub-Hook-ID header to identify the webhook mapping
        if not x_github_hook_id:
            logger.error(
                "Missing X-GitHub-Hook-ID header - cannot identify webhook mapping"
            )
            raise HTTPException(
                status_code=400,
                detail="Missing X-GitHub-Hook-ID header - webhook cannot be processed without webhook identification",
            )

        # Look up webhook mapping using X-GitHub-Hook-ID header
        webhook_mapping = None
        try:
            from generated.prisma_client import Prisma

            prisma = Prisma()
            await prisma.connect()

            webhook_mapping = await prisma.repowebhookmapping.find_first(
                where={
                    "webhookId": x_github_hook_id,
                    "provider": "GITHUB",
                },
                include={
                    "user": True,
                    "project": True,
                    "repository": True,
                },
            )

            await prisma.disconnect()

            if webhook_mapping:
                logger.info(
                    f"Found webhook mapping for hook_id={x_github_hook_id}: userId={webhook_mapping.userId}, projectId={webhook_mapping.projectId}"
                )

                # Update last triggered timestamp
                try:
                    await prisma.connect()
                    await prisma.repowebhookmapping.update(
                        where={"id": webhook_mapping.id},
                        data={"lastTriggeredAt": datetime.now()},
                    )
                    await prisma.disconnect()
                except Exception as update_error:
                    logger.error(
                        f"Failed to update lastTriggeredAt: {str(update_error)}"
                    )
            else:
                logger.error(f"No webhook mapping found for hook_id={x_github_hook_id}")
                raise HTTPException(
                    status_code=404,
                    detail=f"Webhook mapping not found for hook_id={x_github_hook_id} - webhook may not be registered in our system",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error looking up webhook mapping: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail="Internal error looking up webhook mapping"
            )

        # Parse webhook payload
        parsed_data = github_webhook_handler.parse_webhook_payload(
            payload, x_github_event
        )

        if not parsed_data:
            logger.info(f"Webhook event '{x_github_event}' does not require processing")
            return {
                "status": "ignored",
                "message": f"Event '{x_github_event}' not processed",
            }

        # Create scan job based on event type
        if parsed_data["event_type"] == "pull_request":
            job_id = await _handle_pull_request_event(
                parsed_data, background_tasks, webhook_mapping
            )
            logger.info(f"Created scan job {job_id} for PR event")

            return {
                "status": "success",
                "message": f"Scan job created for PR #{parsed_data['pull_request']['number']}",
                "job_id": job_id,
                "repository": parsed_data["repository"]["full_name"],
                "pull_request": parsed_data["pull_request"]["number"],
            }

        elif parsed_data["event_type"] == "push":
            job_id = await _handle_push_event(
                parsed_data, background_tasks, webhook_mapping
            )
            logger.info(f"Created scan job {job_id} for push event")

            return {
                "status": "success",
                "message": f"Scan job created for push to {parsed_data['branch']}",
                "job_id": job_id,
                "repository": parsed_data["repository"]["full_name"],
                "branch": parsed_data["branch"],
            }

        else:
            logger.warning(f"Unsupported event type: {parsed_data['event_type']}")
            return {
                "status": "ignored",
                "message": f"Event type '{parsed_data['event_type']}' not supported",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing GitHub webhook: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Internal server error processing webhook"
        )


async def create_scan_job_with_database(
    user_id: str,
    project_id: str,
    scan_data: ScanJobData,
    scan_target_id: str = None,
    job_type: JobType = JobType.SCAN_REPO,
) -> str:
    """
    Centralized function to create a scan job with proper database record.

    Args:
        user_id: User ID who owns the scan
        project_id: Project ID the scan belongs to
        scan_data: Scan job data
        scan_target_id: Optional scan target ID
        job_type: Type of scan job

    Returns:
        Job ID of the created scan job
    """
    try:
        from generated.prisma_client import Prisma

        prisma = Prisma()
        await prisma.connect()

        # Create database scan job record
        db_scan_job = await prisma.scanjob.create(
            data={
                "userId": user_id,
                "projectId": project_id,
                "scanTargetId": scan_target_id,
                "type": job_type.value,
                "status": "PENDING",
                "data": json.dumps(scan_data.to_dict()),
            }
        )

        await prisma.disconnect()

        job_id = db_scan_job.id
        logger.info(
            f"Created database scan job record: {job_id} for user {user_id}, project {project_id}"
        )

        # Add to Redis queue for processing
        job_queue.add_job(job_type, scan_data.to_dict(), job_id)

        return job_id

    except Exception as e:
        logger.error(
            f"Failed to create scan job with database: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to create scan job: {str(e)}"
        )


async def _handle_pull_request_event(
    parsed_data: Dict[str, Any], background_tasks: BackgroundTasks, webhook_mapping=None
) -> str:
    """Handle pull request webhook event and create scan job."""
    try:
        pr_data = parsed_data["pull_request"]
        repo_data = parsed_data["repository"]

        # Log PR details
        logger.info(
            f"Handling PR event: {repo_data['full_name']} PR #{pr_data['number']}"
        )
        logger.info(f"PR title: {pr_data['title']}")
        logger.info(f"PR branch: {pr_data['head']['ref']} -> {pr_data['base']['ref']}")
        logger.info(f"PR action: {parsed_data['action']}")

        # Create job data for scanning the PR branch
        scan_data = ScanJobData(
            repo_url=normalize_repo_url(pr_data["head"]["repo"]["clone_url"]),
            branch=pr_data["head"]["ref"],
            claude_cli_args=None,
            scan_options={
                "trigger": "pull_request",
                "pr_number": pr_data["number"],
                "pr_title": pr_data["title"],
                "pr_url": pr_data["html_url"],
                "pr_author": pr_data["user"]["login"],
                "pr_action": parsed_data["action"],
                "base_branch": pr_data["base"]["ref"],
                "head_sha": pr_data["head"]["sha"],
                "base_sha": pr_data["base"]["sha"],
            },
        )

        # Create scan job using centralized function
        if webhook_mapping:
            # Use centralized function for webhook-triggered scans
            job_id = await create_scan_job_with_database(
                user_id=webhook_mapping.userId,
                project_id=webhook_mapping.projectId,
                scan_data=scan_data,
                job_type=JobType.SCAN_REPO,
            )
        else:
            # Fallback for webhooks without mapping (backward compatibility)
            job_id_suffix = f"pr-{pr_data['number']}-{pr_data['head']['sha'][:8]}"
            job_id = job_queue.add_job(
                JobType.SCAN_REPO, scan_data.to_dict(), job_id_suffix
            )

        # Trigger background processing
        background_tasks.add_task(process_job_task, job_id)

        logger.info(f"Created PR scan job: {job_id}")
        return job_id

    except Exception as e:
        logger.error(f"Error handling PR event: {str(e)}", exc_info=True)
        raise


async def _handle_push_event(
    parsed_data: Dict[str, Any], background_tasks: BackgroundTasks, webhook_mapping=None
) -> str:
    """Handle push webhook event and create scan job."""
    try:
        repo_data = parsed_data["repository"]
        branch = parsed_data["branch"]
        commits = parsed_data["commits"]

        # Log push details
        logger.info(f"Handling push event: {repo_data['full_name']} to {branch}")
        logger.info(f"Number of commits: {len(commits)}")
        if commits:
            latest_commit = commits[-1]
            logger.info(
                f"Latest commit: {latest_commit['id'][:8]} - {latest_commit['message'][:100]}"
            )

        # Create job data for scanning the pushed branch
        scan_data = ScanJobData(
            repo_url=normalize_repo_url(repo_data["clone_url"]),
            branch=branch,
            claude_cli_args=None,
            scan_options={
                "trigger": "push",
                "branch": branch,
                "ref": parsed_data["ref"],
                "commits": commits,
                "pusher": (
                    parsed_data["pusher"]["name"]
                    if parsed_data.get("pusher")
                    else "unknown"
                ),
            },
        )

        # Create job with descriptive ID and webhook mapping context
        job_id_suffix = (
            f"push-{branch}-{commits[-1]['id'][:8]}" if commits else f"push-{branch}"
        )

        # Create scan job using centralized function
        if webhook_mapping:
            # Use centralized function for webhook-triggered scans
            job_id = await create_scan_job_with_database(
                user_id=webhook_mapping.userId,
                project_id=webhook_mapping.projectId,
                scan_data=scan_data,
                job_type=JobType.SCAN_REPO,
            )
        else:
            # Fallback for webhooks without mapping (backward compatibility)
            job_id = job_queue.add_job(
                JobType.SCAN_REPO, scan_data.to_dict(), job_id_suffix
            )

        # Trigger background processing
        background_tasks.add_task(process_job_task, job_id)

        logger.info(f"Created push scan job: {job_id}")
        return job_id

    except Exception as e:
        logger.error(f"Error handling push event: {str(e)}", exc_info=True)
        raise


@app.post("/test/url-normalization")
async def test_url_normalization(request: Request):
    """Test endpoint to validate URL normalization function."""
    try:
        body = await request.json()
        test_url = body.get("url")
        
        if not test_url:
            raise HTTPException(status_code=400, detail="Missing 'url' parameter")
        
        normalized_url = normalize_repo_url(test_url)
        
        return {
            "status": "success",
            "original_url": test_url,
            "normalized_url": normalized_url,
            "was_normalized": test_url != normalized_url,
            "timestamp": datetime.now().isoformat(),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in URL normalization test: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@app.post("/webhooks/github/test")
async def test_github_webhook():
    """Test endpoint to validate GitHub webhook integration setup."""
    try:
        logger.info("GitHub webhook test endpoint called")

        # Check environment configuration
        webhook_secret = os.environ.get("GITHUB_WEBHOOK_SECRET")
        secret_configured = bool(webhook_secret)

        # Test GitHub client initialization
        test_client = GitHubClient()
        client_initialized = True

        # Test webhook handler
        test_handler = GitHubWebhookHandler()
        handler_initialized = True

        # Test URL normalization
        test_urls = [
            "https://github.com/strin/fortify.git",
            "https://github.com/strin/fortify",
            "git@github.com:strin/fortify.git"
        ]
        
        url_normalization_tests = []
        for url in test_urls:
            normalized = normalize_repo_url(url)
            url_normalization_tests.append({
                "original": url,
                "normalized": normalized,
                "was_normalized": url != normalized
            })

        # Create test response
        response = {
            "status": "success",
            "message": "GitHub webhook integration test completed",
            "configuration": {
                "webhook_secret_configured": secret_configured,
                "github_client_initialized": client_initialized,
                "webhook_handler_initialized": handler_initialized,
                "endpoint_url": "/webhooks/github",
                "supported_events": ["pull_request", "push"],
                "pr_triggering_actions": ["opened", "synchronize", "reopened"],
            },
            "url_normalization_tests": url_normalization_tests,
            "setup_instructions": {
                "environment_variables": {
                    "GITHUB_WEBHOOK_SECRET": "Set this to match your GitHub webhook secret for signature validation",
                    "optional_note": "If not set, signature validation will be disabled (not recommended for production)",
                },
                "github_webhook_config": {
                    "payload_url": "https://your-domain.com/webhooks/github",
                    "content_type": "application/json",
                    "events": ["pull_request", "push"],
                    "active": True,
                },
            },
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(
            f"Webhook test completed successfully - secret configured: {secret_configured}"
        )
        return response

    except Exception as e:
        logger.error(f"Error in webhook test endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@app.post("/setup-webhook")
async def setup_webhook(request: Request, background_tasks: BackgroundTasks):
    """Setup webhook for a repository automatically."""
    try:
        body = await request.json()
        owner = body.get("owner")
        repo = body.get("repo")
        webhook_url = body.get("webhook_url")
        secret = body.get("secret")

        if not all([owner, repo, webhook_url, secret]):
            raise HTTPException(
                status_code=400,
                detail="Missing required parameters: owner, repo, webhook_url, secret",
            )

        # Get access token from Authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        access_token = auth_header.split(" ")[1]

        # Initialize GitHub client with user's access token
        github_client = GitHubClient(access_token=access_token)

        # Setup webhook
        webhook_result = await github_client.setup_webhook(
            owner, repo, webhook_url, secret
        )

        if webhook_result:
            # Check if result contains an error
            if "error" in webhook_result:
                error_type = webhook_result.get("error")
                message = webhook_result.get("message", "Unknown error")
                status_code = webhook_result.get("status_code", 500)

                if error_type == "insufficient_permissions":
                    raise HTTPException(
                        status_code=403,
                        detail=f"Insufficient permissions: You need admin access to {owner}/{repo} to create webhooks. Please ensure you have admin permissions on this repository.",
                    )
                elif error_type == "permission_denied":
                    raise HTTPException(
                        status_code=403,
                        detail=f"Permission denied: {message}. Please check your GitHub permissions and OAuth scopes.",
                    )
                elif error_type == "validation_failed":
                    raise HTTPException(
                        status_code=422, detail=f"Webhook validation failed: {message}"
                    )
                else:
                    raise HTTPException(
                        status_code=status_code,
                        detail=f"Webhook setup failed: {message}",
                    )

            # Success case
            return {
                "status": "success",
                "message": f"Webhook configured for {owner}/{repo}",
                "webhook_id": webhook_result.get("id"),
                "webhook_url": webhook_result.get("config", {}).get("url"),
                "events": webhook_result.get("events", []),
                "active": webhook_result.get("active", False),
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to setup webhook")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in webhook setup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/setup-webhook")
async def remove_webhook(request: Request):
    """Remove webhook from a repository."""
    try:
        body = await request.json()
        owner = body.get("owner")
        repo = body.get("repo")
        webhook_id = body.get("webhook_id")

        if not all([owner, repo, webhook_id]):
            raise HTTPException(
                status_code=400,
                detail="Missing required parameters: owner, repo, webhook_id",
            )

        # Get access token from Authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        access_token = auth_header.split(" ")[1]

        # Initialize GitHub client with user's access token
        github_client = GitHubClient(access_token=access_token)

        # Remove webhook
        success = await github_client.remove_webhook(owner, repo, webhook_id)

        if success:
            return {
                "status": "success",
                "message": f"Webhook removed from {owner}/{repo}",
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to remove webhook")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/webhooks/{owner}/{repo}")
async def get_repository_webhooks(owner: str, repo: str, request: Request):
    """Get webhooks for a repository."""
    try:
        # Get access token from Authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        access_token = auth_header.split(" ")[1]

        # Initialize GitHub client with user's access token
        github_client = GitHubClient(access_token=access_token)

        # Get webhooks
        webhooks = await github_client.get_webhooks(owner, repo)

        return {
            "status": "success",
            "repository": f"{owner}/{repo}",
            "webhooks": webhooks,
            "total": len(webhooks),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching webhooks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


def main():
    """Main entry point for the server."""
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
