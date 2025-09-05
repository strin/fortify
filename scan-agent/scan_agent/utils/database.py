"""
Database utility module for accessing the database using Prisma client.

This module provides a centralized way to access the database with proper
connection management, error handling, and environment configuration.
"""

import os
import logging
from typing import Optional
from contextlib import asynccontextmanager

from generated.prisma_client import Prisma

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Database manager class that handles Prisma client lifecycle and provides
    easy access to database operations.
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
            self._client = Prisma()

        if not self._client.is_connected():
            logger.info("Connecting to database...")
            await self._client.connect()
            logger.info("Database connection established")

    async def disconnect(self) -> None:
        """
        Disconnect from the database.
        """
        if self._client and self._client.is_connected():
            logger.info("Disconnecting from database...")
            await self._client.disconnect()
            logger.info("Database connection closed")

    async def ensure_connected(self) -> None:
        """
        Ensure the database connection is established.
        If not connected, attempt to connect.
        """
        if self._client is None or not self._client.is_connected():
            await self.connect()

    @asynccontextmanager
    async def transaction(self):
        """
        Context manager for database transactions.

        Usage:
            async with db_manager.transaction() as tx:
                # Perform database operations
                pass
        """
        await self.ensure_connected()
        async with self._client.tx() as tx:
            yield tx

    async def health_check(self) -> bool:
        """
        Check if the database connection is healthy.

        Returns:
            bool: True if connection is healthy, False otherwise
        """
        try:
            await self.ensure_connected()
            # Simple query to test connection
            await self._client.query_raw("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()


async def get_db() -> Prisma:
    """
    Get a connected database client.

    Returns:
        Prisma: Connected Prisma client instance
    """
    await db_manager.ensure_connected()
    return db_manager.client


@asynccontextmanager
async def get_db_transaction():
    """
    Get a database transaction context.

    Usage:
        async with get_db_transaction() as tx:
            # Perform database operations
            pass
    """
    async with db_manager.transaction() as tx:
        yield tx


async def init_database() -> None:
    """
    Initialize the database connection.
    Should be called during application startup.
    """
    await db_manager.connect()


async def close_database() -> None:
    """
    Close the database connection.
    Should be called during application shutdown.
    """
    await db_manager.disconnect()


async def check_database_health() -> bool:
    """
    Check database health.

    Returns:
        bool: True if database is healthy, False otherwise
    """
    return await db_manager.health_check()
