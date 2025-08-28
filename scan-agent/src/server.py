"""Orchestrator server for vulnerability scanning."""
import os
import sys
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from datetime import datetime
import uvicorn

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.job import JobType, JobStatus, ScanJobData
from utils.queue import JobQueue

# Initialize FastAPI app
app = FastAPI(title="Vulnerability Scan Orchestrator", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize job queue
job_queue = JobQueue()

# Request/Response models
class ScanRepoRequest(BaseModel):
    repo_url: HttpUrl
    branch: Optional[str] = "main"
    claude_cli_args: Optional[str] = None
    scan_options: Optional[dict] = {}

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
async def scan_repository(request: ScanRepoRequest):
    """Submit a repository for vulnerability scanning."""
    try:
        # Create job data
        scan_data = ScanJobData(
            repo_url=str(request.repo_url),
            branch=request.branch,
            claude_cli_args=request.claude_cli_args,
            scan_options=request.scan_options
        )
        
        # Add job to queue
        job_id = job_queue.add_job(JobType.SCAN_REPO, scan_data.to_dict())
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING.value,
            created_at=datetime.now(),
            message=f"Scan job created for repository: {request.repo_url}"
        )
    except Exception as e:
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
        error=job.error
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
                error=job.error
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
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in {job.status.value} status")
    
    # Mark job as failed with cancellation message
    job_queue.fail_job(job_id, "Job cancelled by user")
    
    return {"message": f"Job {job_id} cancelled"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)