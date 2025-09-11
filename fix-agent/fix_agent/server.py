"""
Fix Agent FastAPI server.

This module provides the REST API for the fix agent service,
handling fix job creation, status tracking, and management.
"""

import os
import sys
import logging
import uvicorn
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add scan-agent to path for shared database access
sys.path.append('/workspace/scan-agent')

from fix_agent.models.job import FixJob, FixJobType, FixJobStatus, FixJobData
from fix_agent.utils.queue import FixJobQueue
from fix_agent.utils.database import get_db_manager
from fix_agent.utils.redis_client import test_redis_connection


# Initialize FastAPI app
app = FastAPI(
    title="Fix Agent API",
    description="AI-powered vulnerability fixing service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
fix_queue: Optional[FixJobQueue] = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global fix_queue
    
    logger.info("Starting Fix Agent server...")
    
    # Test Redis connection
    if not test_redis_connection():
        logger.error("Redis connection failed - fix agent may not function properly")
    
    # Initialize fix job queue
    fix_queue = FixJobQueue()
    
    # Initialize database connection
    try:
        await get_db_manager()
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    logger.info("Fix Agent server startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Fix Agent server...")
    
    # Close database connections
    from fix_agent.utils.database import close_database
    await close_database()
    
    logger.info("Fix Agent server shutdown complete")


# Pydantic models for API
class FixVulnerabilityRequest(BaseModel):
    """Request model for creating a fix job."""
    fixJobId: str
    vulnerabilityId: str
    scanJobId: str
    repositoryUrl: str
    branch: str = "main"
    commitSha: Optional[str] = None
    vulnerability: Dict[str, Any]
    fixOptions: Dict[str, Any] = {}


class FixJobResponse(BaseModel):
    """Response model for fix job operations."""
    fixJobId: str
    status: str
    message: str


class FixJobStatusResponse(BaseModel):
    """Response model for fix job status."""
    id: str
    status: str
    stage: str
    message: str
    progress: int
    error: Optional[str] = None
    pullRequestUrl: Optional[str] = None


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Fix Agent",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test Redis connection
        redis_healthy = test_redis_connection()
        
        # Test database connection
        db_healthy = True
        try:
            db_manager = await get_db_manager()
            await db_manager.client.fixjob.count()
        except Exception:
            db_healthy = False
        
        # Get queue stats
        queue_stats = {}
        if fix_queue:
            queue_stats = fix_queue.get_queue_stats()
        
        health_status = {
            "status": "healthy" if (redis_healthy and db_healthy) else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "redis": "healthy" if redis_healthy else "unhealthy",
                "database": "healthy" if db_healthy else "unhealthy",
            },
            "queue_stats": queue_stats
        }
        
        status_code = 200 if health_status["status"] == "healthy" else 503
        return JSONResponse(content=health_status, status_code=status_code)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=503
        )


@app.post("/fix/vulnerability")
async def create_fix_job(request: FixVulnerabilityRequest, background_tasks: BackgroundTasks):
    """
    Create a new fix job for a vulnerability.
    
    This endpoint receives fix requests from the NextJS backend
    and queues them for processing by the fix worker.
    """
    try:
        if not fix_queue:
            raise HTTPException(status_code=503, detail="Fix queue not initialized")
        
        # Create FixJobData from request
        fix_data = FixJobData(
            vulnerabilityId=request.vulnerabilityId,
            scanJobId=request.scanJobId,
            repositoryUrl=request.repositoryUrl,
            branch=request.branch,
            commitSha=request.commitSha,
            vulnerability=request.vulnerability,
            fixOptions=request.fixOptions
        )
        
        # Create FixJob instance
        fix_job = FixJob(
            id=request.fixJobId,
            type=FixJobType.VULNERABILITY_FIX,
            status=FixJobStatus.PENDING,
            data=fix_data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Enqueue the fix job
        if fix_queue.enqueue_fix_job(fix_job):
            logger.info(f"Fix job {fix_job.id} enqueued successfully")
            
            return FixJobResponse(
                fixJobId=fix_job.id,
                status=fix_job.status.value,
                message="Fix job created and queued successfully"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to enqueue fix job"
            )
            
    except Exception as e:
        logger.error(f"Failed to create fix job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fix/jobs/{fix_job_id}")
async def get_fix_job(fix_job_id: str):
    """Get fix job details by ID."""
    try:
        if not fix_queue:
            raise HTTPException(status_code=503, detail="Fix queue not initialized")
        
        job = fix_queue.get_fix_job(fix_job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Fix job not found")
        
        return job.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get fix job {fix_job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fix/jobs/{fix_job_id}/status")
async def get_fix_job_status(fix_job_id: str):
    """Get lightweight fix job status for polling."""
    try:
        if not fix_queue:
            raise HTTPException(status_code=503, detail="Fix queue not initialized")
        
        job = fix_queue.get_fix_job(fix_job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Fix job not found")
        
        # Create lightweight status response
        progress_info = get_progress_info(job.status, job.started_at)
        
        return FixJobStatusResponse(
            id=job.id,
            status=job.status.value,
            stage=progress_info["stage"],
            message=progress_info["message"],
            progress=progress_info["progress"],
            error=job.error,
            pullRequestUrl=job.result.pullRequestUrl if job.result else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get fix job status {fix_job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fix/jobs/{fix_job_id}/cancel")
async def cancel_fix_job(fix_job_id: str):
    """Cancel an in-progress fix job."""
    try:
        if not fix_queue:
            raise HTTPException(status_code=503, detail="Fix queue not initialized")
        
        job = fix_queue.get_fix_job(fix_job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Fix job not found")
        
        if job.status not in [FixJobStatus.PENDING, FixJobStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job with status {job.status.value}"
            )
        
        # Update job to cancelled status
        job.status = FixJobStatus.CANCELLED
        job.finished_at = datetime.utcnow()
        job.error = "Cancelled by user request"
        
        if fix_queue.update_fix_job(job):
            return FixJobResponse(
                fixJobId=job.id,
                status=job.status.value,
                message="Fix job cancelled successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel fix job")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel fix job {fix_job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fix/stats")
async def get_fix_stats():
    """Get fix agent statistics."""
    try:
        stats = {}
        
        # Queue statistics
        if fix_queue:
            stats["queue"] = fix_queue.get_queue_stats()
        
        # Database statistics
        try:
            db_manager = await get_db_manager()
            stats["database"] = await db_manager.get_fix_job_stats()
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            stats["database"] = {"error": str(e)}
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get fix stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_progress_info(status: FixJobStatus, started_at: Optional[datetime]) -> Dict[str, Any]:
    """Get progress information for a fix job status."""
    progress_map = {
        FixJobStatus.PENDING: {
            "stage": "queued",
            "message": "Fix job queued for processing",
            "progress": 10
        },
        FixJobStatus.IN_PROGRESS: {
            "stage": "processing",
            "message": "Generating fix with AI...",
            "progress": 50
        },
        FixJobStatus.COMPLETED: {
            "stage": "completed",
            "message": "Fix completed successfully",
            "progress": 100
        },
        FixJobStatus.FAILED: {
            "stage": "failed",
            "message": "Fix job failed",
            "progress": 0
        },
        FixJobStatus.CANCELLED: {
            "stage": "cancelled",
            "message": "Fix job cancelled",
            "progress": 0
        }
    }
    
    return progress_map.get(status, {
        "stage": "unknown",
        "message": "Unknown status",
        "progress": 0
    })


def main():
    """Main entry point for the fix agent server."""
    port = int(os.getenv("PORT", "8001"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting Fix Agent server on {host}:{port}")
    
    uvicorn.run(
        "fix_agent.server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    main()