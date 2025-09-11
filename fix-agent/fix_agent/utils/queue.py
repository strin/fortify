"""
Fix job queue management using Redis.

This module provides a Redis-based queue system for managing fix jobs,
following the same pattern as scan-agent but optimized for fix operations.
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from redis import Redis

from fix_agent.models.job import FixJob, FixJobStatus, ensure_json_serializable
from fix_agent.utils.redis_client import redis_connection, RedisNamespace


logger = logging.getLogger(__name__)


class FixJobQueue:
    """
    Redis-based queue for managing fix jobs.
    
    Uses Redis lists for atomic job operations and Redis hashes for job metadata.
    Follows the brpoplpush pattern for atomic job claiming between queues.
    """
    
    def __init__(self, redis_client: Optional[Redis] = None):
        """
        Initialize the fix job queue.
        
        Args:
            redis_client: Optional Redis client. If not provided, uses global connection.
        """
        self.redis = redis_client or redis_connection()
        self.namespace = RedisNamespace()
        
    def enqueue_fix_job(self, job: FixJob) -> bool:
        """
        Add a fix job to the pending queue.
        
        Args:
            job: FixJob instance to enqueue
            
        Returns:
            bool: True if job was successfully enqueued
        """
        try:
            # Store job metadata in hash
            job_key = self.namespace.fix_job_key(job.id)
            job_data = ensure_json_serializable(job.to_dict())
            
            # Use Redis pipeline for atomic operation
            with self.redis.pipeline() as pipe:
                # Store job data
                pipe.hset(job_key, mapping=job_data)
                
                # Add job ID to pending queue
                pipe.lpush(self.namespace.FIX_JOBS_PENDING, job.id)
                
                # Set job status
                pipe.hset(self.namespace.fix_job_status_key(job.id), "status", job.status.value)
                
                # Execute all operations atomically
                pipe.execute()
                
            logger.info(f"Fix job {job.id} enqueued successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enqueue fix job {job.id}: {e}")
            return False
    
    def claim_fix_job(self, timeout: int = 5) -> Optional[FixJob]:
        """
        Atomically claim a fix job from the pending queue.
        
        Uses brpoplpush to atomically move job from pending to processing queue.
        
        Args:
            timeout: Timeout in seconds for blocking pop operation
            
        Returns:
            FixJob: Claimed job instance or None if no job available
        """
        try:
            # Atomic pop from pending and push to processing
            job_id = self.redis.brpoplpush(
                self.namespace.FIX_JOBS_PENDING,
                self.namespace.FIX_JOBS_PROCESSING,
                timeout=timeout
            )
            
            if not job_id:
                return None  # Timeout occurred
            
            # Get job data
            job_key = self.namespace.fix_job_key(job_id)
            job_data = self.redis.hgetall(job_key)
            
            if not job_data:
                logger.error(f"Job data not found for job {job_id}")
                # Remove from processing queue since data is missing
                self.redis.lrem(self.namespace.FIX_JOBS_PROCESSING, 1, job_id)
                return None
            
            # Parse job data
            job_data['id'] = job_id
            job = FixJob.from_dict(job_data)
            
            # Update job status to IN_PROGRESS
            job.status = FixJobStatus.IN_PROGRESS
            job.started_at = datetime.utcnow()
            
            # Update job in Redis
            self.update_fix_job(job)
            
            logger.info(f"Fix job {job_id} claimed successfully")
            return job
            
        except Exception as e:
            logger.error(f"Failed to claim fix job: {e}")
            return None
    
    def update_fix_job(self, job: FixJob) -> bool:
        """
        Update fix job data and status.
        
        Args:
            job: Updated FixJob instance
            
        Returns:
            bool: True if update was successful
        """
        try:
            job.updated_at = datetime.utcnow()
            job_key = self.namespace.fix_job_key(job.id)
            job_data = ensure_json_serializable(job.to_dict())
            
            # Update job data and status atomically
            with self.redis.pipeline() as pipe:
                pipe.hset(job_key, mapping=job_data)
                pipe.hset(self.namespace.fix_job_status_key(job.id), "status", job.status.value)
                pipe.execute()
                
            logger.debug(f"Fix job {job.id} updated with status {job.status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update fix job {job.id}: {e}")
            return False
    
    def complete_fix_job(self, job: FixJob) -> bool:
        """
        Mark fix job as completed and move to completed queue.
        
        Args:
            job: Completed FixJob instance
            
        Returns:
            bool: True if completion was successful
        """
        try:
            # Update job status
            job.status = FixJobStatus.COMPLETED
            job.finished_at = datetime.utcnow()
            
            # Atomic operation: update data and move between queues
            with self.redis.pipeline() as pipe:
                # Update job data
                job_key = self.namespace.fix_job_key(job.id)
                job_data = ensure_json_serializable(job.to_dict())
                pipe.hset(job_key, mapping=job_data)
                
                # Update status
                pipe.hset(self.namespace.fix_job_status_key(job.id), "status", job.status.value)
                
                # Move from processing to completed queue
                pipe.lrem(self.namespace.FIX_JOBS_PROCESSING, 1, job.id)
                pipe.lpush(self.namespace.FIX_JOBS_COMPLETED, job.id)
                
                pipe.execute()
                
            logger.info(f"Fix job {job.id} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete fix job {job.id}: {e}")
            return False
    
    def fail_fix_job(self, job: FixJob, error_message: str) -> bool:
        """
        Mark fix job as failed and move to failed queue.
        
        Args:
            job: Failed FixJob instance
            error_message: Error description
            
        Returns:
            bool: True if failure was recorded successfully
        """
        try:
            # Update job status
            job.status = FixJobStatus.FAILED
            job.finished_at = datetime.utcnow()
            job.error = error_message
            
            # Atomic operation: update data and move between queues
            with self.redis.pipeline() as pipe:
                # Update job data
                job_key = self.namespace.fix_job_key(job.id)
                job_data = ensure_json_serializable(job.to_dict())
                pipe.hset(job_key, mapping=job_data)
                
                # Update status
                pipe.hset(self.namespace.fix_job_status_key(job.id), "status", job.status.value)
                
                # Move from processing to failed queue
                pipe.lrem(self.namespace.FIX_JOBS_PROCESSING, 1, job.id)
                pipe.lpush(self.namespace.FIX_JOBS_FAILED, job.id)
                
                pipe.execute()
                
            logger.error(f"Fix job {job.id} failed: {error_message}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to record fix job failure for {job.id}: {e}")
            return False
    
    def get_fix_job(self, job_id: str) -> Optional[FixJob]:
        """
        Get fix job by ID.
        
        Args:
            job_id: Fix job identifier
            
        Returns:
            FixJob: Job instance or None if not found
        """
        try:
            job_key = self.namespace.fix_job_key(job_id)
            job_data = self.redis.hgetall(job_key)
            
            if not job_data:
                return None
            
            job_data['id'] = job_id
            return FixJob.from_dict(job_data)
            
        except Exception as e:
            logger.error(f"Failed to get fix job {job_id}: {e}")
            return None
    
    def get_queue_stats(self) -> Dict[str, int]:
        """
        Get current queue statistics.
        
        Returns:
            Dict[str, int]: Queue length statistics
        """
        try:
            stats = {
                "pending": self.redis.llen(self.namespace.FIX_JOBS_PENDING),
                "processing": self.redis.llen(self.namespace.FIX_JOBS_PROCESSING),
                "completed": self.redis.llen(self.namespace.FIX_JOBS_COMPLETED),
                "failed": self.redis.llen(self.namespace.FIX_JOBS_FAILED),
            }
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
    
    def cleanup_stale_jobs(self, max_age_hours: int = 24) -> int:
        """
        Clean up old completed and failed jobs.
        
        Args:
            max_age_hours: Maximum age in hours before cleanup
            
        Returns:
            int: Number of jobs cleaned up
        """
        try:
            cutoff_time = time.time() - (max_age_hours * 3600)
            cleaned_count = 0
            
            # Clean up completed jobs
            completed_jobs = self.redis.lrange(self.namespace.FIX_JOBS_COMPLETED, 0, -1)
            for job_id in completed_jobs:
                job = self.get_fix_job(job_id)
                if job and job.finished_at and job.finished_at.timestamp() < cutoff_time:
                    self.redis.lrem(self.namespace.FIX_JOBS_COMPLETED, 1, job_id)
                    self.redis.delete(self.namespace.fix_job_key(job_id))
                    self.redis.delete(self.namespace.fix_job_status_key(job_id))
                    cleaned_count += 1
            
            # Clean up failed jobs
            failed_jobs = self.redis.lrange(self.namespace.FIX_JOBS_FAILED, 0, -1)
            for job_id in failed_jobs:
                job = self.get_fix_job(job_id)
                if job and job.finished_at and job.finished_at.timestamp() < cutoff_time:
                    self.redis.lrem(self.namespace.FIX_JOBS_FAILED, 1, job_id)
                    self.redis.delete(self.namespace.fix_job_key(job_id))
                    self.redis.delete(self.namespace.fix_job_status_key(job_id))
                    cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} stale fix jobs")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup stale jobs: {e}")
            return 0