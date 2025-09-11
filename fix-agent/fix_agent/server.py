"""FastAPI server for vulnerability fix orchestration."""

import os
import sys
import logging
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Package imports
from fix_agent.models.job import JobType, JobStatus, FixJobData, VulnerabilityData
from fix_agent.utils.queue import FixJobQueue
from fix_agent.workers.fixer import FixWorker

# Initialize FastAPI app
app = FastAPI(title="Vulnerability Fix Agent", version="1.0.0")

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Handle validation errors with detailed logging."""
    logger.error(f"Validation error for {request.method} {request.url}")
    logger.error(f"Validation errors: {exc.errors()}")
    
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
fix_job_queue = FixJobQueue()
fix_worker = FixWorker()

# Pydantic models for API requests/responses

class VulnerabilityRequest(BaseModel):
    """Vulnerability data from the API request."""
    id: str
    title: str
    description: str
    severity: str
    category: str
    filePath: str
    startLine: int
    endLine: Optional[int] = None
    codeSnippet: str
    recommendation: str
    metadata: Optional[Dict[str, Any]] = None

class FixJobRequest(BaseModel):
    """Request to create a fix job."""
    type: str  # Should be "FIX_VULNERABILITY"
    data: Dict[str, Any]  # Contains the FixJobData

class FixJobResponse(BaseModel):
    """Response for fix job creation."""
    job_id: str
    message: str
    status: str = "PENDING"

class JobStatusResponse(BaseModel):
    """Response for job status queries."""
    id: str
    type: str
    status: str
    data: Dict[str, Any]
    created_at: str
    updated_at: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Background task to process a specific job
async def process_fix_job_task(job_id: str):
    """Background task to process a specific fix job."""
    try:
        logger.info(f"Starting background processing for fix job {job_id}")
        
        # Get the job from the queue
        job = fix_job_queue.get_job(job_id)
        if not job:
            logger.error(f"Fix job {job_id} not found")
            return
        
        # Process the job using the worker
        fix_worker._process_fix_job(job)
        
        logger.info(f"Completed background processing for fix job {job_id}")
        
    except Exception as e:
        logger.error(f"Error in background fix job processing: {e}")
        # Mark job as failed
        try:
            fix_job_queue.fail_job(job_id, f"Background processing error: {str(e)}")
        except Exception as fail_error:
            logger.error(f"Failed to mark job as failed: {fail_error}")

# API Routes

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    queue_health = fix_job_queue.health_check()
    
    return {
        "status": "healthy",
        "service": "fix-agent",
        "queue": queue_health,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/fix/create", response_model=FixJobResponse)
async def create_fix_job(request: FixJobRequest, background_tasks: BackgroundTasks):
    """Create a new vulnerability fix job."""
    try:
        logger.info(f"Creating fix job with type: {request.type}")
        
        # Validate job type
        if request.type != "FIX_VULNERABILITY":
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported job type: {request.type}"
            )
        
        # Parse and validate the fix job data
        try:
            fix_data = FixJobData.from_dict(request.data)
        except Exception as e:
            logger.error(f"Invalid fix job data: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid fix job data: {str(e)}"
            )
        
        # Create job in queue
        job_type = JobType.FIX_VULNERABILITY
        job_id = fix_job_queue.add_job(job_type, request.data)
        
        # Add background task to process the job
        background_tasks.add_task(process_fix_job_task, job_id)
        
        logger.info(f"Created fix job {job_id}")
        
        return FixJobResponse(
            job_id=job_id,
            message="Fix job created successfully",
            status="PENDING"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fix job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/fix/jobs/{job_id}", response_model=JobStatusResponse)
async def get_fix_job(job_id: str):
    """Get fix job status and details."""
    try:
        job = fix_job_queue.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return JobStatusResponse(
            id=job.id,
            type=job.type.value,
            status=job.status.value,
            data=job.data,
            created_at=job.created_at.isoformat(),
            updated_at=job.updated_at.isoformat(),
            result=job.result,
            error=job.error
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fix job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/fix/jobs")
async def list_fix_jobs(
    status: Optional[str] = None,
    limit: int = 50
):
    """List fix jobs, optionally filtered by status."""
    try:
        if status:
            try:
                job_status = JobStatus(status)
                jobs = fix_job_queue.get_jobs_by_status(job_status, limit)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status: {status}"
                )
        else:
            # Get all jobs (this is a simplified implementation)
            jobs = []
            for status_enum in JobStatus:
                jobs.extend(fix_job_queue.get_jobs_by_status(status_enum, limit))
            jobs = jobs[:limit]  # Limit total results
        
        return {
            "jobs": [
                {
                    "id": job.id,
                    "type": job.type.value,
                    "status": job.status.value,
                    "created_at": job.created_at.isoformat(),
                    "updated_at": job.updated_at.isoformat(),
                }
                for job in jobs
            ],
            "total": len(jobs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing fix jobs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/fix/jobs/{job_id}/cancel")
async def cancel_fix_job(job_id: str):
    """Cancel a fix job."""
    try:
        job = fix_job_queue.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job in {job.status.value} status"
            )
        
        # Request cancellation from worker
        fix_worker.request_cancellation(job_id)
        
        # Mark as cancelled in queue
        fix_job_queue.cancel_job(job_id)
        
        return {"message": f"Fix job {job_id} cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling fix job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/fix/queue/stats")
async def get_queue_stats():
    """Get fix queue statistics."""
    try:
        return {
            "pending_jobs": fix_job_queue.get_queue_size(),
            "processing_jobs": fix_job_queue.get_processing_count(),
            "queue_name": fix_job_queue.queue_name,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    # Get port from environment or default to 8001
    port = int(os.environ.get("PORT", "8001"))
    host = os.environ.get("HOST", "0.0.0.0")
    
    logger.info(f"Starting Fix Agent server on {host}:{port}")
    print(f"🔧 Starting Fix Agent server on {host}:{port}")
    
    uvicorn.run(
        "fix_agent.server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )