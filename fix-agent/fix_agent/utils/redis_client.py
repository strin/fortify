"""
Redis client utility for fix-agent.

This module provides Redis connection management and helper functions
for the fix agent's queue and caching operations.
"""

import os
import logging
from typing import Optional
import redis
from redis import Redis, ConnectionPool


logger = logging.getLogger(__name__)


def get_redis_connection() -> Redis:
    """
    Get a Redis connection instance.
    
    Returns:
        Redis: Connected Redis client instance
        
    Raises:
        redis.ConnectionError: If connection fails
    """
    # Check for Redis URL first (production environments)
    redis_url = os.getenv("REDIS_URL")
    
    if redis_url:
        logger.debug("Connecting to Redis using REDIS_URL")
        return redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_keepalive=True,
            socket_keepalive_options={},
            health_check_interval=30,
        )
    
    # Fallback to individual environment variables (development)
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_db = int(os.getenv("REDIS_DB", "1"))  # Different from scan-agent (which uses 0)
    redis_password = os.getenv("REDIS_PASSWORD")
    
    logger.debug(f"Connecting to Redis at {redis_host}:{redis_port}, DB {redis_db}")
    
    return Redis(
        host=redis_host,
        port=redis_port,
        db=redis_db,
        password=redis_password,
        encoding="utf-8",
        decode_responses=True,
        socket_keepalive=True,
        socket_keepalive_options={},
        health_check_interval=30,
    )


def get_redis_pool() -> ConnectionPool:
    """
    Get a Redis connection pool for more efficient connection management.
    
    Returns:
        ConnectionPool: Redis connection pool
    """
    redis_url = os.getenv("REDIS_URL")
    
    if redis_url:
        return ConnectionPool.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_db = int(os.getenv("REDIS_DB", "1"))
    redis_password = os.getenv("REDIS_PASSWORD")
    
    return ConnectionPool(
        host=redis_host,
        port=redis_port,
        db=redis_db,
        password=redis_password,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )


# Global Redis connection - lazy initialization
_redis_connection: Optional[Redis] = None


def redis_connection() -> Redis:
    """
    Get the global Redis connection instance (singleton pattern).
    
    Returns:
        Redis: Global Redis connection
    """
    global _redis_connection
    
    if _redis_connection is None:
        _redis_connection = get_redis_connection()
        
    return _redis_connection


def test_redis_connection() -> bool:
    """
    Test the Redis connection.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        client = get_redis_connection()
        client.ping()
        logger.info("Redis connection test successful")
        return True
    except Exception as e:
        logger.error(f"Redis connection test failed: {e}")
        return False


class RedisNamespace:
    """
    Redis key namespace manager for fix-agent operations.
    
    This class provides consistent key naming for different Redis data structures
    used by the fix agent.
    """
    
    # Fix job queues
    FIX_JOBS_PENDING = "fix_jobs:pending"
    FIX_JOBS_PROCESSING = "fix_jobs:processing"
    FIX_JOBS_COMPLETED = "fix_jobs:completed"
    FIX_JOBS_FAILED = "fix_jobs:failed"
    
    # Fix job metadata storage
    FIX_JOBS_DATA = "fix_jobs:data"
    
    # Fix job status tracking
    FIX_JOB_STATUS_PREFIX = "fix_job:status:"
    
    # Temporary storage for work in progress
    FIX_JOBS_TEMP = "fix_jobs:temp"
    
    # Worker management
    WORKERS_ACTIVE = "fix_workers:active"
    WORKER_HEARTBEAT_PREFIX = "fix_worker:heartbeat:"
    
    @classmethod
    def fix_job_key(cls, job_id: str) -> str:
        """Get Redis key for storing fix job data."""
        return f"{cls.FIX_JOBS_DATA}:{job_id}"
    
    @classmethod
    def fix_job_status_key(cls, job_id: str) -> str:
        """Get Redis key for fix job status."""
        return f"{cls.FIX_JOB_STATUS_PREFIX}{job_id}"
    
    @classmethod
    def worker_heartbeat_key(cls, worker_id: str) -> str:
        """Get Redis key for worker heartbeat."""
        return f"{cls.WORKER_HEARTBEAT_PREFIX}{worker_id}"
    
    @classmethod
    def temp_job_key(cls, job_id: str) -> str:
        """Get Redis key for temporary job storage."""
        return f"{cls.FIX_JOBS_TEMP}:{job_id}"