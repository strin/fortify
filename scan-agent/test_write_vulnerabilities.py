#!/usr/bin/env python3
"""
Test script for the _write_vulnerabilities_to_db method.

This script tests the database vulnerability writing functionality using sample data
from a real scan result.

Usage:
    python test_write_vulnerabilities.py

Environment Variables:
    DATABASE_URL: PostgreSQL connection string (required)
"""

import asyncio
import json
import logging
import os
import sys
from typing import Dict, Any

# Add the scan_agent package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scan_agent"))

from scan_agent.workers.scanner import ScanWorker
from scan_agent.utils.database import init_database, close_database, get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Sample scan results data from the provided vulnerability report
SAMPLE_SCAN_RESULTS = {
    "summary": "Found 5 vulnerabilities",
    "vulnerabilities": [
        {
            "title": "Command Injection via Malicious Git Repository Path",
            "description": "The `MailmapDeveloperFactory._run_check_mailmap()` method executes a `git check-mailmap` command using subprocess.run() with user-controlled input (repository path). If an attacker can control the repository path passed to pydriller, they could potentially inject shell commands. The path value comes from `self._conf.get('path_to_repo')` which is user-controlled through the Repository constructor. Although the code uses a list for subprocess.run() which provides some protection against shell injection, the path itself is not sanitized and could contain special characters or path traversal sequences.",
            "severity": "MEDIUM",
            "category": "COMMAND_INJECTION",
            "filePath": "pydriller/utils/mailmap.py",
            "startLine": 41,
            "endLine": 45,
            "codeSnippet": 'result = subprocess.run(\n    ["git", "-C", f"{self._conf.get(\'path_to_repo\')}", "check-mailmap", f"{name} <{email}>"],\n    capture_output=True,\n    text=True\n)',
            "recommendation": "Validate and sanitize the repository path before using it in subprocess calls. Use os.path.abspath() and os.path.normpath() to normalize the path, and consider using a whitelist approach for allowed characters. Additionally, implement proper input validation to ensure the path points to a legitimate Git repository.",
        },
        {
            "title": "Command Injection via Malicious Author Name/Email in Git Operations",
            "description": 'The `MailmapDeveloperFactory._run_check_mailmap()` method passes user-controlled name and email values directly to a subprocess command without proper sanitization. An attacker could potentially craft malicious author names or email addresses containing shell metacharacters that could be interpreted by the shell if they somehow bypass the list-based argument passing. The values are formatted as `f"{name} <{email}>"` and passed to the git command, which could be problematic if the name or email contains special characters.',
            "severity": "LOW",
            "category": "COMMAND_INJECTION",
            "filePath": "pydriller/utils/mailmap.py",
            "startLine": 42,
            "endLine": 42,
            "codeSnippet": '["git", "-C", f"{self._conf.get(\'path_to_repo\')}", "check-mailmap", f"{name} <{email}>"]',
            "recommendation": "Validate and sanitize author names and email addresses before using them in subprocess calls. Implement proper input validation to ensure names and emails follow expected formats. Consider using shlex.quote() to properly escape the values, or validate against a strict regex pattern for author names and email addresses.",
        },
        {
            "title": "Path Traversal in Repository Path Handling",
            "description": "The Repository class accepts user-controlled paths through the `path_to_repo` parameter and uses them to access files and directories. While the code uses `Path(path).expanduser().resolve()` which provides some normalization, there is insufficient validation to prevent path traversal attacks. An attacker could potentially provide paths like '../../../etc/passwd' to access files outside the intended repository directory. The path is used in various file operations throughout the codebase including git operations and file system traversal.",
            "severity": "MEDIUM",
            "category": "INPUT_VALIDATION",
            "filePath": "pydriller/git.py",
            "startLine": 45,
            "endLine": 45,
            "codeSnippet": "self.path = Path(path).expanduser().resolve()",
            "recommendation": "Implement strict path validation to ensure repository paths are within expected boundaries. Create a whitelist of allowed base directories for repositories, validate that resolved paths don't contain path traversal sequences, and ensure paths point to legitimate Git repositories. Consider using os.path.realpath() combined with path prefix validation.",
        },
        {
            "title": "Insufficient URL Validation for Remote Repository Cloning",
            "description": "The `Repository._is_remote()` method only performs basic string prefix checks to determine if a repository URL is remote (`git@`, `https://`, `http://`, `git://`). This insufficient validation could allow attackers to provide malicious URLs that pass the basic check but point to unexpected resources or contain malicious payloads. The validated URLs are then passed to GitPython's `Repo.clone_from()` method which could potentially access unintended network resources or local files.",
            "severity": "MEDIUM",
            "category": "INPUT_VALIDATION",
            "filePath": "pydriller/repository.py",
            "startLine": 155,
            "endLine": 156,
            "codeSnippet": 'def _is_remote(repo: str) -> bool:\n    return repo.startswith(("git@", "https://", "http://", "git://"))',
            "recommendation": "Implement comprehensive URL validation using urllib.parse to properly parse and validate repository URLs. Validate the scheme, netloc, and path components. Consider implementing a whitelist of allowed domains/hosts for remote repositories. Add validation to ensure URLs point to legitimate Git repositories and don't contain malicious payloads or redirect attempts.",
        },
        {
            "title": "Potential Information Disclosure via Git Command Output",
            "description": "The `MailmapDeveloperFactory._run_check_mailmap()` method captures and processes output from git commands but includes generic exception handling that may not properly sanitize error messages. If git commands fail due to malicious input or repository issues, sensitive information about the file system, repository structure, or internal paths could be disclosed through error messages. The method returns name and email values from git output without proper validation.",
            "severity": "LOW",
            "category": "DATA_EXPOSURE",
            "filePath": "pydriller/utils/mailmap.py",
            "startLine": 55,
            "endLine": 59,
            "codeSnippet": "elif result.stderr:\n    # This is to make it robust. In case anything goes wrong, go with the knowledge\n    # that we have about the author or committer\n    return str(name), str(email)",
            "recommendation": "Implement proper error handling and sanitization of git command outputs. Log errors appropriately without exposing sensitive system information. Validate and sanitize any data extracted from git command outputs before returning it. Consider implementing structured error handling that doesn't leak internal system details.",
        },
    ],
    "vulnerability_count": 5,
    "severity_breakdown": {"MEDIUM": 3, "LOW": 2},
    "conversation_summary": "I'll perform a comprehensive security audit of this codebase. Let me start by exploring the repository structure to understand the technology stack and architecture.. Let me search for potential security vulnerabilities starting with command injection:. Now let me search for path traversal vulnerabilities and examine file operations:",
    "report_file_found": True,
    "raw_analysis": "I'll perform a comprehensive security audit of this codebase...",
}

# Test job ID (simulating a real scan job)
TEST_JOB_ID = "test_job_12345"


async def test_write_vulnerabilities_to_db():
    """Test the _write_vulnerabilities_to_db method with sample data."""
    print("=" * 80)
    print("🧪 TESTING _write_vulnerabilities_to_db METHOD")
    print("=" * 80)

    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("❌ ERROR: DATABASE_URL environment variable is not set")
        print("Please set DATABASE_URL to your PostgreSQL connection string")
        print(
            "Example: export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'"
        )
        return False

    try:
        # Initialize database connection
        print("🔌 Initializing database connection...")
        await init_database()
        print("✅ Database connection established")

        # Create ScanWorker instance
        worker = ScanWorker()

        # Test the method
        print(f"📝 Testing with job ID: {TEST_JOB_ID}")
        print(
            f"📊 Sample data contains {len(SAMPLE_SCAN_RESULTS['vulnerabilities'])} vulnerabilities"
        )

        print("\nVulnerabilities to be stored:")
        for i, vuln in enumerate(SAMPLE_SCAN_RESULTS["vulnerabilities"], 1):
            print(f"  {i}. {vuln['title']} ({vuln['severity']})")

        print("\n💾 Calling _write_vulnerabilities_to_db...")

        # Call the method being tested
        stored_count = await worker._write_vulnerabilities_to_db(
            job_id=TEST_JOB_ID, scan_results=SAMPLE_SCAN_RESULTS
        )

        print(f"\n✅ Method completed successfully!")
        print(f"📈 Vulnerabilities stored: {stored_count}")
        print(f"📊 Expected: {SAMPLE_SCAN_RESULTS['vulnerability_count']}")

        if stored_count == SAMPLE_SCAN_RESULTS["vulnerability_count"]:
            print("🎉 SUCCESS: All vulnerabilities were stored correctly!")
            return True
        else:
            print(
                f"⚠️  WARNING: Expected {SAMPLE_SCAN_RESULTS['vulnerability_count']} but stored {stored_count}"
            )
            return False

    except Exception as e:
        print(f"❌ ERROR during test: {e}")
        logger.exception("Test failed with exception")
        return False

    finally:
        # Clean up database connection
        print("\n🧹 Cleaning up database connection...")
        await close_database()
        print("✅ Database connection closed")


async def test_edge_cases():
    """Test edge cases and error handling."""
    print("\n" + "=" * 80)
    print("🧪 TESTING EDGE CASES")
    print("=" * 80)

    try:
        await init_database()
        worker = ScanWorker()

        # Test 1: Empty vulnerabilities
        print("\n📝 Test 1: Empty vulnerabilities list")
        result = await worker._write_vulnerabilities_to_db(
            job_id="test_empty", scan_results={"vulnerabilities": []}
        )
        print(f"Result: {result} (expected: 0)")

        # Test 2: Missing vulnerabilities key
        print("\n📝 Test 2: Missing vulnerabilities key")
        result = await worker._write_vulnerabilities_to_db(
            job_id="test_missing", scan_results={"summary": "No vulnerabilities"}
        )
        print(f"Result: {result} (expected: 0)")

        # Test 3: Invalid vulnerability data
        print("\n📝 Test 3: Invalid vulnerability data")
        invalid_data = {
            "vulnerabilities": [
                {
                    "title": "Valid vulnerability",
                    "severity": "HIGH",
                },  # Missing required fields
                {"invalid": "data"},  # Completely invalid
                {  # Valid vulnerability
                    "title": "Valid Test Vulnerability",
                    "description": "Test description",
                    "severity": "LOW",
                    "category": "OTHER",
                    "filePath": "test.py",
                    "startLine": 1,
                    "codeSnippet": "test code",
                    "recommendation": "test recommendation",
                },
            ]
        }
        result = await worker._write_vulnerabilities_to_db(
            job_id="test_invalid", scan_results=invalid_data
        )
        print(f"Result: {result} (expected: 1, only valid vulnerability stored)")

        print("\n✅ Edge case testing completed!")

    except Exception as e:
        print(f"❌ ERROR during edge case testing: {e}")
        logger.exception("Edge case testing failed")

    finally:
        await close_database()


def print_usage():
    """Print usage instructions."""
    print("=" * 80)
    print("🧪 TEST SCRIPT FOR _write_vulnerabilities_to_db")
    print("=" * 80)
    print()
    print("This script tests the vulnerability database writing functionality.")
    print()
    print("REQUIREMENTS:")
    print("1. Set DATABASE_URL environment variable")
    print("2. Ensure PostgreSQL database is running and accessible")
    print("3. Ensure database schema is up to date (run migrations)")
    print()
    print("USAGE:")
    print("  export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'")
    print("  python test_write_vulnerabilities.py")
    print()
    print("The script will:")
    print("- Test storing 5 sample vulnerabilities")
    print("- Test edge cases (empty data, invalid data)")
    print("- Verify database operations work correctly")
    print()


async def main():
    """Main test function."""
    print_usage()

    # Run main test
    success = await test_write_vulnerabilities_to_db()

    # Run edge case tests
    await test_edge_cases()

    print("\n" + "=" * 80)
    if success:
        print("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
    else:
        print("❌ SOME TESTS FAILED - CHECK OUTPUT ABOVE")
    print("=" * 80)

    return success


if __name__ == "__main__":
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ ERROR: Python 3.7 or higher is required")
        sys.exit(1)

    # Run the test
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
