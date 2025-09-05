"""
Example usage of the database utility.

This file demonstrates how to use the database utility for various operations.
"""

import asyncio
import logging
from scan_agent.utils import (
    init_database,
    close_database,
    get_db,
    get_db_transaction,
    check_database_health,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def example_basic_usage():
    """Example of basic database usage."""
    try:
        # Initialize database connection
        await init_database()

        # Get database client
        db = await get_db()

        # Example: Get all scan jobs (adjust based on your actual models)
        # jobs = await db.scanjob.find_many()
        # logger.info(f"Found {len(jobs)} scan jobs")

        # Check database health
        is_healthy = await check_database_health()
        logger.info(f"Database health: {'OK' if is_healthy else 'FAILED'}")

    except Exception as e:
        logger.error(f"Error in basic usage: {e}")
    finally:
        # Close database connection
        await close_database()


async def example_transaction_usage():
    """Example of using database transactions."""
    try:
        # Initialize database connection
        await init_database()

        # Use transaction context manager
        async with get_db_transaction() as tx:
            # Example operations within transaction
            # result = await tx.scanjob.create(data={...})
            # await tx.scanresult.create(data={...})
            logger.info("Transaction completed successfully")

    except Exception as e:
        logger.error(f"Error in transaction usage: {e}")
        # Transaction will be automatically rolled back
    finally:
        await close_database()


async def example_with_error_handling():
    """Example with comprehensive error handling."""
    try:
        # Initialize database
        await init_database()

        # Check health before operations
        if not await check_database_health():
            raise RuntimeError("Database is not healthy")

        db = await get_db()

        # Your database operations here
        # ...

        logger.info("Operations completed successfully")

    except RuntimeError as e:
        logger.error(f"Runtime error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await close_database()


if __name__ == "__main__":
    # Run examples
    asyncio.run(example_basic_usage())
    # asyncio.run(example_transaction_usage())
    # asyncio.run(example_with_error_handling())
