"""Orchestrator server for vulnerability scanning."""

import os
import sys
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
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


if __name__ == "__main__":
def main():
    """Main entry point for the server."""
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
