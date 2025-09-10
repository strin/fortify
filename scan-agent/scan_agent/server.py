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
            repo_url=str(request.repo_url),
            branch=request.branch,
            claude_cli_args=request.claude_cli_args,
            scan_options=request.scan_options,
        )

        logger.debug(f"Created scan data: {scan_data.to_dict()}")

        # Add job to queue
        job_id = job_queue.add_job(JobType.SCAN_REPO, scan_data.to_dict(), request.job_id)
        logger.info(f"Created job with ID: {job_id}")

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

    return JobStatusResponse(
        job_id=job.id,
        status=job.status.value,
        type=job.type.value,
        created_at=job.created_at,
        updated_at=job.updated_at,
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

    if job.status != JobStatus.PENDING:
        raise HTTPException(
            status_code=400, detail=f"Cannot cancel job in {job.status.value} status"
        )

    # Mark job as failed with cancellation message
    job_queue.fail_job(job_id, "Job cancelled by user")

    return {"message": f"Job {job_id} cancelled"}


@app.post("/webhooks/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_github_delivery: str = Header(None),
    x_hub_signature_256: str = Header(None)
):
    """Handle GitHub webhook events for pull requests and pushes."""
    try:
        # Log incoming webhook
        logger.info(f"Received GitHub webhook: event={x_github_event}, delivery={x_github_delivery}")
        
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
        
        # Parse webhook payload
        parsed_data = github_webhook_handler.parse_webhook_payload(payload, x_github_event)
        
        if not parsed_data:
            logger.info(f"Webhook event '{x_github_event}' does not require processing")
            return {"status": "ignored", "message": f"Event '{x_github_event}' not processed"}
        
        # Create scan job based on event type
        if parsed_data["event_type"] == "pull_request":
            job_id = await _handle_pull_request_event(parsed_data, background_tasks)
            logger.info(f"Created scan job {job_id} for PR event")
            
            return {
                "status": "success",
                "message": f"Scan job created for PR #{parsed_data['pull_request']['number']}",
                "job_id": job_id,
                "repository": parsed_data["repository"]["full_name"],
                "pull_request": parsed_data["pull_request"]["number"]
            }
        
        elif parsed_data["event_type"] == "push":
            job_id = await _handle_push_event(parsed_data, background_tasks)
            logger.info(f"Created scan job {job_id} for push event")
            
            return {
                "status": "success", 
                "message": f"Scan job created for push to {parsed_data['branch']}",
                "job_id": job_id,
                "repository": parsed_data["repository"]["full_name"],
                "branch": parsed_data["branch"]
            }
        
        else:
            logger.warning(f"Unsupported event type: {parsed_data['event_type']}")
            return {"status": "ignored", "message": f"Event type '{parsed_data['event_type']}' not supported"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing GitHub webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error processing webhook")


async def _handle_pull_request_event(parsed_data: Dict[str, Any], background_tasks: BackgroundTasks) -> str:
    """Handle pull request webhook event and create scan job."""
    try:
        pr_data = parsed_data["pull_request"]
        repo_data = parsed_data["repository"]
        
        # Log PR details
        logger.info(f"Handling PR event: {repo_data['full_name']} PR #{pr_data['number']}")
        logger.info(f"PR title: {pr_data['title']}")
        logger.info(f"PR branch: {pr_data['head']['ref']} -> {pr_data['base']['ref']}")
        logger.info(f"PR action: {parsed_data['action']}")
        
        # Create job data for scanning the PR branch
        scan_data = ScanJobData(
            repo_url=pr_data["head"]["repo"]["clone_url"],
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
                "base_sha": pr_data["base"]["sha"]
            }
        )
        
        # Create job with descriptive ID
        job_id_suffix = f"pr-{pr_data['number']}-{pr_data['head']['sha'][:8]}"
        job_id = job_queue.add_job(JobType.SCAN_REPO, scan_data.to_dict(), job_id_suffix)
        
        # Trigger background processing
        background_tasks.add_task(process_job_task, job_id)
        
        logger.info(f"Created PR scan job: {job_id}")
        return job_id
        
    except Exception as e:
        logger.error(f"Error handling PR event: {str(e)}", exc_info=True)
        raise


async def _handle_push_event(parsed_data: Dict[str, Any], background_tasks: BackgroundTasks) -> str:
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
            logger.info(f"Latest commit: {latest_commit['id'][:8]} - {latest_commit['message'][:100]}")
        
        # Create job data for scanning the pushed branch
        scan_data = ScanJobData(
            repo_url=repo_data["clone_url"],
            branch=branch,
            claude_cli_args=None,
            scan_options={
                "trigger": "push",
                "branch": branch,
                "ref": parsed_data["ref"],
                "commits": commits,
                "pusher": parsed_data["pusher"]["name"] if parsed_data.get("pusher") else "unknown"
            }
        )
        
        # Create job with descriptive ID
        job_id_suffix = f"push-{branch}-{commits[-1]['id'][:8]}" if commits else f"push-{branch}"
        job_id = job_queue.add_job(JobType.SCAN_REPO, scan_data.to_dict(), job_id_suffix)
        
        # Trigger background processing
        background_tasks.add_task(process_job_task, job_id)
        
        logger.info(f"Created push scan job: {job_id}")
        return job_id
        
    except Exception as e:
        logger.error(f"Error handling push event: {str(e)}", exc_info=True)
        raise


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
                "pr_triggering_actions": ["opened", "synchronize", "reopened"]
            },
            "setup_instructions": {
                "environment_variables": {
                    "GITHUB_WEBHOOK_SECRET": "Set this to match your GitHub webhook secret for signature validation",
                    "optional_note": "If not set, signature validation will be disabled (not recommended for production)"
                },
                "github_webhook_config": {
                    "payload_url": "https://your-domain.com/webhooks/github",
                    "content_type": "application/json", 
                    "events": ["pull_request", "push"],
                    "active": True
                }
            },
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Webhook test completed successfully - secret configured: {secret_configured}")
        return response
        
    except Exception as e:
        logger.error(f"Error in webhook test endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@app.post("/setup-webhook")
async def setup_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Setup webhook for a repository automatically."""
    try:
        body = await request.json()
        owner = body.get("owner")
        repo = body.get("repo")
        webhook_url = body.get("webhook_url")
        secret = body.get("secret")
        
        if not all([owner, repo, webhook_url, secret]):
            raise HTTPException(status_code=400, detail="Missing required parameters: owner, repo, webhook_url, secret")
        
        # Get access token from Authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = auth_header.split(" ")[1]
        
        # Initialize GitHub client with user's access token
        github_client = GitHubClient(access_token=access_token)
        
        # Setup webhook
        webhook_result = await github_client.setup_webhook(owner, repo, webhook_url, secret)
        
        if webhook_result:
            return {
                "status": "success",
                "message": f"Webhook configured for {owner}/{repo}",
                "webhook_id": webhook_result.get("id"),
                "webhook_url": webhook_result.get("config", {}).get("url"),
                "events": webhook_result.get("events", []),
                "active": webhook_result.get("active", False)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to setup webhook")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in webhook setup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/setup-webhook")
async def remove_webhook(
    request: Request
):
    """Remove webhook from a repository."""
    try:
        body = await request.json()
        owner = body.get("owner")
        repo = body.get("repo")
        webhook_id = body.get("webhook_id")
        
        if not all([owner, repo, webhook_id]):
            raise HTTPException(status_code=400, detail="Missing required parameters: owner, repo, webhook_id")
        
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
                "message": f"Webhook removed from {owner}/{repo}"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to remove webhook")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/webhooks/{owner}/{repo}")
async def get_repository_webhooks(
    owner: str,
    repo: str,
    request: Request
):
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
            "total": len(webhooks)
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
