#!/usr/bin/env python3
"""
Simple test script to verify database vulnerability writing works after fixes.
"""

import asyncio
import json
import logging
import os
import sys

# Add the scan_agent package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from scan_agent.utils.database import get_db, init_database, close_database

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


async def test_vulnerability_creation():
    """Test creating a vulnerability record with proper relationships."""

    # Initialize database connection
    await init_database()

    # First create a test scan job
    db = await get_db()

    # Get the database URL from the db object if possible, otherwise from environment
    db_url = getattr(db, "_database_url", None)
    print(f"Database URL (from db): {db_url}")

    print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")
    # INSERT_YOUR_CODE
    # Get the first role from the user and print it
    # For this context, let's assume "role" means a user role in the database.
    # We'll query the first user and print their role, if the user table exists.

    # Create a test scan job (matching the simplified schema)
    scan_job = await db.scanjob.create(
        data={
            "type": "SCAN_REPO",
            "status": "COMPLETED",
            "data": json.dumps(
                {
                    "repo_url": "https://github.com/test/repo",
                    "branch": "main",
                    "scan_options": {},
                    "claude_cli_args": None,
                }
            ),
        }
    )

    print(f"✅ Created test scan job: {scan_job.id}")

    # Now test creating a vulnerability with proper relationship and JSON metadata
    metadata_dict = {
        "cwe": "CWE-78",
        "owasp": "A03:2021",
        "confidence": "high",
        "original_category": "COMMAND_INJECTION",
        "original_severity": "MEDIUM",
    }

    vulnerability = await db.codevulnerability.create(
        data={
            "scanJobId": scan_job.id,
            "title": "Test Vulnerability",
            "description": "This is a test vulnerability",
            "severity": "MEDIUM",
            "category": "OTHER",
            "filePath": "test/file.py",
            "startLine": 10,
            "endLine": 15,
            "codeSnippet": "test code snippet",
            "recommendation": "Fix this test issue",
            "metadata": json.dumps(metadata_dict),
        }
    )

    print(f"✅ Created test vulnerability: {vulnerability.id}")
    print(f"   Title: {vulnerability.title}")
    print(f"   Severity: {vulnerability.severity}")
    print(f"   Metadata: {vulnerability.metadata}")

    # Test querying the relationship
    scan_job_with_vulns = await db.scanjob.find_unique(
        where={"id": scan_job.id}, include={"vulnerabilities": True}
    )

    print(f"✅ Scan job has {len(scan_job_with_vulns.vulnerabilities)} vulnerabilities")

    # Clean up
    await db.codevulnerability.delete(where={"id": vulnerability.id})
    await db.scanjob.delete(where={"id": scan_job.id})
    print("✅ Cleaned up test records")

    # Close database connection
    await close_database()

    return True


async def main():
    """Main test function."""
    print("🧪 Testing database vulnerability creation with fixes...")

    try:
        result = await test_vulnerability_creation()
        if result:
            print("✅ All tests passed! Database writing is working correctly.")
        else:
            print("❌ Tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        logger.error("Test failed", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
