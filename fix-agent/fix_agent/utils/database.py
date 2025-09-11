"""
Database utility module for fix-agent.

This module provides database connection management and operations
for fix jobs using the Prisma client. It shares the same database
as scan-agent but focuses on fix job operations.
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from datetime import datetime

# Import the generated Prisma client from scan-agent
# Fix-agent shares the same database schema
import sys
sys.path.append('/workspace/scan-agent')

from generated.prisma_client import Prisma
from fix_agent.models.job import FixJob, FixJobStatus, FixResult


logger = logging.getLogger(__name__)


class FixDatabaseManager:
    """
    Database manager for fix-agent operations.
    
    Provides methods for managing fix jobs in the shared database
    while maintaining separation from scan-agent operations.
    """
    
    def __init__(self):
        self._client: Optional[Prisma] = None
        self._database_url = os.getenv("DATABASE_URL")
        
        if not self._database_url:
            logger.warning("DATABASE_URL environment variable not set")
    
    @property
    def client(self) -> Prisma:
        """
        Get the Prisma client instance.
        
        Returns:
            Prisma: The Prisma client instance
            
        Raises:
            RuntimeError: If client is not initialized
        """
        if self._client is None:
            raise RuntimeError("Database client not initialized. Call connect() first.")
        return self._client
    
    async def connect(self) -> None:
        """
        Initialize and connect to the database.
        
        Raises:
            RuntimeError: If DATABASE_URL is not configured
        """
        if not self._database_url:
            raise RuntimeError(
                "DATABASE_URL environment variable must be set to connect to the database"
            )
        
        if self._client is None:
            self._client = Prisma(auto_register=True)
        
        if not self._client.is_connected():
            logger.info("Connecting to database...")
            await self._client.connect()
            logger.info("Database connection established")
    
    async def disconnect(self) -> None:
        """Disconnect from the database."""
        if self._client and self._client.is_connected():
            logger.info("Disconnecting from database...")
            await self._client.disconnect()
            logger.info("Database disconnected")
    
    async def create_fix_job(self, job: FixJob) -> bool:
        """
        Create a new fix job in the database.
        
        Args:
            job: FixJob instance to create
            
        Returns:
            bool: True if creation was successful
        """
        try:
            await self.client.fixjob.create(
                data={
                    'id': job.id,
                    'userId': None,  # Will be set by API layer
                    'type': job.type.value,
                    'status': job.status.value,
                    'vulnerabilityId': job.data.vulnerabilityId,
                    'scanJobId': job.data.scanJobId,
                    'data': json.dumps(job.data.dict(), default=str),
                    'createdAt': job.created_at,
                    'updatedAt': job.updated_at,
                }
            )
            
            logger.info(f"Fix job {job.id} created in database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create fix job {job.id} in database: {e}")
            return False
    
    async def update_fix_job_status(
        self, 
        job_id: str, 
        status: FixJobStatus,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
        error: Optional[str] = None
    ) -> bool:
        """
        Update fix job status in the database.
        
        Args:
            job_id: Fix job identifier
            status: New status
            started_at: When job started (for IN_PROGRESS)
            finished_at: When job finished (for COMPLETED/FAILED)
            error: Error message (for FAILED)
            
        Returns:
            bool: True if update was successful
        """
        try:
            update_data = {
                'status': status.value,
                'updatedAt': datetime.utcnow(),
            }
            
            if started_at:
                update_data['startedAt'] = started_at
            
            if finished_at:
                update_data['finishedAt'] = finished_at
                
            if error:
                update_data['error'] = error
            
            await self.client.fixjob.update(
                where={'id': job_id},
                data=update_data
            )
            
            logger.debug(f"Fix job {job_id} status updated to {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update fix job {job_id} status: {e}")
            return False
    
    async def save_fix_result(
        self, 
        job_id: str, 
        result: FixResult,
        branch_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        pull_request_url: Optional[str] = None,
        pull_request_id: Optional[int] = None
    ) -> bool:
        """
        Save fix job results to the database.
        
        Args:
            job_id: Fix job identifier
            result: Fix result data
            branch_name: Created branch name
            commit_sha: Commit SHA of the fix
            pull_request_url: URL of created pull request
            pull_request_id: ID of created pull request
            
        Returns:
            bool: True if save was successful
        """
        try:
            update_data = {
                'status': 'COMPLETED',
                'result': json.dumps(result.dict(), default=str),
                'finishedAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow(),
            }
            
            if branch_name:
                update_data['branchName'] = branch_name
                
            if commit_sha:
                update_data['commitSha'] = commit_sha
                
            if pull_request_url:
                update_data['pullRequestUrl'] = pull_request_url
                
            if pull_request_id:
                update_data['pullRequestId'] = pull_request_id
            
            await self.client.fixjob.update(
                where={'id': job_id},
                data=update_data
            )
            
            logger.info(f"Fix job {job_id} results saved to database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save fix job {job_id} results: {e}")
            return False
    
    async def get_fix_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get fix job from database by ID.
        
        Args:
            job_id: Fix job identifier
            
        Returns:
            Optional[Dict[str, Any]]: Fix job data or None if not found
        """
        try:
            fix_job = await self.client.fixjob.find_first(
                where={'id': job_id},
                include={
                    'vulnerability': True,
                    'scanJob': True,
                    'user': True,
                }
            )
            
            if fix_job:
                return fix_job.dict()
            return None
            
        except Exception as e:
            logger.error(f"Failed to get fix job {job_id}: {e}")
            return None
    
    async def get_vulnerability_fix_jobs(self, vulnerability_id: str) -> List[Dict[str, Any]]:
        """
        Get all fix jobs for a specific vulnerability.
        
        Args:
            vulnerability_id: Vulnerability identifier
            
        Returns:
            List[Dict[str, Any]]: List of fix jobs
        """
        try:
            fix_jobs = await self.client.fixjob.find_many(
                where={'vulnerabilityId': vulnerability_id},
                order_by={'createdAt': 'desc'}
            )
            
            return [job.dict() for job in fix_jobs]
            
        except Exception as e:
            logger.error(f"Failed to get fix jobs for vulnerability {vulnerability_id}: {e}")
            return []
    
    async def get_user_fix_jobs(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get fix jobs for a specific user.
        
        Args:
            user_id: User identifier
            status: Optional status filter
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            
        Returns:
            List[Dict[str, Any]]: List of fix jobs
        """
        try:
            where_clause = {'userId': user_id}
            if status:
                where_clause['status'] = status
            
            fix_jobs = await self.client.fixjob.find_many(
                where=where_clause,
                include={
                    'vulnerability': {
                        'select': {
                            'id': True,
                            'title': True,
                            'severity': True,
                            'category': True,
                            'filePath': True,
                        }
                    }
                },
                order_by={'createdAt': 'desc'},
                take=limit,
                skip=offset
            )
            
            return [job.dict() for job in fix_jobs]
            
        except Exception as e:
            logger.error(f"Failed to get fix jobs for user {user_id}: {e}")
            return []
    
    async def get_fix_job_stats(self) -> Dict[str, int]:
        """
        Get fix job statistics.
        
        Returns:
            Dict[str, int]: Statistics by status
        """
        try:
            stats = {}
            
            # Count by status
            for status in ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']:
                count = await self.client.fixjob.count(
                    where={'status': status}
                )
                stats[status.lower()] = count
            
            # Total count
            stats['total'] = await self.client.fixjob.count()
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get fix job stats: {e}")
            return {}


# Global database manager instance
_db_manager: Optional[FixDatabaseManager] = None


async def get_db_manager() -> FixDatabaseManager:
    """
    Get the global database manager instance.
    
    Returns:
        FixDatabaseManager: Global database manager
    """
    global _db_manager
    
    if _db_manager is None:
        _db_manager = FixDatabaseManager()
        await _db_manager.connect()
    
    return _db_manager


@asynccontextmanager
async def get_database_session():
    """
    Context manager for database operations.
    
    Yields:
        FixDatabaseManager: Database manager instance
    """
    db_manager = await get_db_manager()
    try:
        yield db_manager
    except Exception as e:
        logger.error(f"Database operation failed: {e}")
        raise
    finally:
        # Keep connection alive for reuse
        pass


async def init_database() -> FixDatabaseManager:
    """
    Initialize database connection.
    
    Returns:
        FixDatabaseManager: Connected database manager
    """
    return await get_db_manager()


async def close_database() -> None:
    """Close database connection."""
    global _db_manager
    
    if _db_manager:
        await _db_manager.disconnect()
        _db_manager = None