"""Redis connection and configuration."""
import os
import redis
from redis import Redis
from typing import Optional

def get_redis_connection() -> Redis:
    """Get Redis connection instance."""
    # Check if REDIS_URL is provided (production style)
    redis_url = os.environ.get("REDIS_URL")
    
    if redis_url:
        # Use REDIS_URL (e.g., redis://user:pass@host:port/db)
        return redis.from_url(redis_url, decode_responses=True)
    else:
        # Fallback to individual environment variables (for backward compatibility)
        redis_host = os.environ.get("REDIS_HOST", "localhost")
        redis_port = int(os.environ.get("REDIS_PORT", "6379"))
        redis_db = int(os.environ.get("REDIS_DB", "0"))
        redis_password = os.environ.get("REDIS_PASSWORD", None)
        
        return redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            decode_responses=True
        )

# Global connection instance
redis_connection = get_redis_connection()