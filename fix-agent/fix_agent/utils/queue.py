"""Job queue implementation using Redis for fix operations."""

import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from fix_agent.models.job import Job, JobStatus, JobType
from .redis_client import redis_connection


class FixJobQueue:
    """Redis-based job queue for fix operations."""

    def __init__(self, queue_name: str = "fix_jobs"):
        self.queue_name = queue_name
        self.redis = redis_connection
        self.pending_queue = f"{queue_name}:pending"
        self.processing_queue = f"{queue_name}:processing"
        self.jobs_key = f"{queue_name}:jobs"

    def add_job(
        self, job_type: JobType, data: Dict[str, Any], job_id: Optional[str] = None
    ) -> str:
        """Add a new fix job to the queue.

        Args:
            job_type: The type of fix job to enqueue
            data: Arbitrary job payload
            job_id: Optional externally provided job id
        """
        job_id = job_id or str(uuid.uuid4())
        job = Job(
            id=job_id,
            type=job_type,
            status=JobStatus.PENDING,
            data=data,
            created_at=datetime.now(),
            updated_at=datetime.now(),
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
        job_id = self.redis.brpoplpush(
            self.pending_queue, self.processing_queue, timeout=1
        )
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
            # Ensure result is JSON-serializable before storing
            try:
                job.result = json.loads(json.dumps(result, default=str))
            except (TypeError, ValueError):
                # Fallback: convert to string if serialization fails
                job.result = str(result)
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

    def cancel_job(self, job_id: str):
        """Mark a job as cancelled."""
        job = self.get_job(job_id)
        if job:
            job.status = JobStatus.CANCELLED
            self.update_job(job)
            # Remove from processing queue if present
            self.redis.lrem(self.processing_queue, 1, job_id)
            # Remove from pending queue if present
            self.redis.lrem(self.pending_queue, 1, job_id)

    def get_jobs_by_status(self, status: JobStatus, limit: int = 100) -> List[Job]:
        """Get jobs by status."""
        jobs = []
        job_ids = self.redis.hkeys(self.jobs_key)
        
        for job_id in job_ids[:limit]:
            job = self.get_job(job_id)
            if job and job.status == status:
                jobs.append(job)
        
        return jobs

    def get_queue_size(self) -> int:
        """Get the number of pending jobs."""
        return self.redis.llen(self.pending_queue)

    def get_processing_count(self) -> int:
        """Get the number of jobs currently being processed."""
        return self.redis.llen(self.processing_queue)

    def health_check(self) -> Dict[str, Any]:
        """Get queue health information."""
        try:
            pending = self.get_queue_size()
            processing = self.get_processing_count()
            
            return {
                "status": "healthy",
                "pending_jobs": pending,
                "processing_jobs": processing,
                "queue_name": self.queue_name
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "queue_name": self.queue_name
            }