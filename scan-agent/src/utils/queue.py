"""Job queue implementation using Redis."""
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.job import Job, JobStatus, JobType
from .redis_client import redis_connection

class JobQueue:
    """Redis-based job queue."""
    
    def __init__(self, queue_name: str = "scan_jobs"):
        self.queue_name = queue_name
        self.redis = redis_connection
        self.pending_queue = f"{queue_name}:pending"
        self.processing_queue = f"{queue_name}:processing"
        self.jobs_key = f"{queue_name}:jobs"
    
    def add_job(self, job_type: JobType, data: Dict[str, Any]) -> str:
        """Add a new job to the queue."""
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            type=job_type,
            status=JobStatus.PENDING,
            data=data,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Store job data
        self.redis.hset(self.jobs_key, job_id, json.dumps(job.to_dict()))
        
        # Add to pending queue
        self.redis.rpush(self.pending_queue, job_id)
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        job_data = self.redis.hget(self.jobs_key, job_id)
        if job_data:
            return Job.from_dict(json.loads(job_data))
        return None
    
    def get_next_job(self) -> Optional[Job]:
        """Get the next job from the queue."""
        # Move job from pending to processing queue atomically
        job_id = self.redis.brpoplpush(self.pending_queue, self.processing_queue, timeout=1)
        if job_id:
            job = self.get_job(job_id)
            if job:
                # Update status
                job.status = JobStatus.IN_PROGRESS
                job.updated_at = datetime.now()
                self.update_job(job)
                return job
        return None
    
    def update_job(self, job: Job):
        """Update job data."""
        job.updated_at = datetime.now()
        self.redis.hset(self.jobs_key, job.id, json.dumps(job.to_dict()))
    
    def complete_job(self, job_id: str, result: Dict[str, Any]):
        """Mark a job as completed."""
        job = self.get_job(job_id)
        if job:
            job.status = JobStatus.COMPLETED
            job.result = result
            self.update_job(job)
            # Remove from processing queue
            self.redis.lrem(self.processing_queue, 1, job_id)
    
    def fail_job(self, job_id: str, error: str):
        """Mark a job as failed."""
        job = self.get_job(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error = error
            self.update_job(job)
            # Remove from processing queue
            self.redis.lrem(self.processing_queue, 1, job_id)
    
    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get the status of a job."""
        job = self.get_job(job_id)
        return job.status if job else None
    
    def list_jobs(self, status: Optional[JobStatus] = None, limit: int = 100) -> List[Job]:
        """List jobs, optionally filtered by status."""
        all_job_ids = self.redis.hkeys(self.jobs_key)
        jobs = []
        
        for job_id in all_job_ids[:limit]:
            job = self.get_job(job_id)
            if job and (status is None or job.status == status):
                jobs.append(job)
        
        # Sort by created_at descending
        jobs.sort(key=lambda x: x.created_at, reverse=True)
        return jobs[:limit]