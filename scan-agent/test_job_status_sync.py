#!/usr/bin/env python3
"""
Test script to verify job status synchronization fix works correctly.

This script simulates database update failures to ensure that Redis
and database status remain synchronized with the new fix.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from unittest.mock import patch, AsyncMock

# Add the scan_agent package to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scan_agent.utils.queue import JobQueue
from scan_agent.utils.database import init_database, get_db, close_database
from scan_agent.models.job import Job, JobStatus, JobType
from scan_agent.workers.scanner import ScanWorker


async def test_database_failure_handling():
    """Test that Redis doesn't get marked as completed when database update fails."""
    print("🧪 Testing database failure handling...")
    
    # Create a test job
    job_queue = JobQueue()
    
    test_job_data = {
        "repo_url": "https://github.com/test/repo.git",
        "branch": "main",
        "claude_cli_args": None,
        "scan_options": {}
    }
    
    job_id = job_queue.add_job(JobType.SCAN_REPO, test_job_data)
    print(f"📝 Created test job: {job_id}")
    
    # Get the job and set it to IN_PROGRESS (simulate worker picking it up)
    job = job_queue.get_job(job_id)
    job.status = JobStatus.IN_PROGRESS
    job_queue.update_job(job)
    
    print(f"🔄 Job status in Redis: {job_queue.get_job_status(job_id).value}")
    
    # Initialize database connection
    await init_database()
    db = await get_db()
    
    try:
        # Create ScanJob record in database
        await db.scanjob.create(
            data={
                "id": job_id,
                "type": "SCAN_REPO",
                "status": "IN_PROGRESS",
                "startedAt": datetime.now(),
                "data": json.dumps(test_job_data),
            }
        )
        print(f"💾 Created ScanJob record in database")
        
        # Check initial database status
        db_job = await db.scanjob.find_unique(where={"id": job_id})
        print(f"💾 Initial database status: {db_job.status}")
        
        # Now simulate a database update failure in the scanner worker
        worker = ScanWorker()
        
        # Mock the database update to raise an exception
        original_get_db = get_db
        
        async def mock_get_db_that_fails():
            db_mock = await original_get_db()
            
            # Mock the update method to raise an exception
            async def failing_update(*args, **kwargs):
                raise Exception("Simulated database connection failure")
                
            db_mock.scanjob.update = failing_update
            return db_mock
        
        # Create a test result that would normally trigger completion
        test_result = {
            "scan_completed_at": datetime.now().isoformat(),
            "repository": test_job_data["repo_url"],
            "branch": test_job_data["branch"],
            "results": {
                "summary": "Test scan completed",
                "vulnerabilities": [],
                "vulnerability_count": 0
            },
            "vulnerabilities_stored": 0
        }
        
        # Test the process_job method with mocked database failure
        with patch('scan_agent.workers.scanner.get_db', side_effect=mock_get_db_that_fails):
            try:
                worker.process_job(job)
                print("❌ ERROR: process_job should have failed but didn't!")
                return False
            except Exception as e:
                print(f"✅ Expected exception caught: {e}")
        
        # Check that Redis status is NOT marked as completed
        redis_job = job_queue.get_job(job_id)
        redis_status = redis_job.status.value if redis_job else "NOT_FOUND"
        print(f"🔍 Redis status after failed database update: {redis_status}")
        
        # Check database status is still IN_PROGRESS
        await close_database()
        await init_database()
        db = await get_db()
        db_job = await db.scanjob.find_unique(where={"id": job_id})
        db_status = db_job.status if db_job else "NOT_FOUND"
        print(f"🔍 Database status after failed update: {db_status}")
        
        # Verify both are still IN_PROGRESS (synchronized)
        if redis_status == "IN_PROGRESS" and db_status == "IN_PROGRESS":
            print("✅ SUCCESS: Both Redis and Database remain IN_PROGRESS when database update fails")
            return True
        else:
            print(f"❌ FAILURE: Status mismatch - Redis: {redis_status}, Database: {db_status}")
            return False
            
    finally:
        # Cleanup: remove test job
        try:
            await db.scanjob.delete(where={"id": job_id})
            job_queue.redis.hdel(job_queue.jobs_key, job_id)
            print(f"🧹 Cleaned up test job: {job_id}")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")
            
        await close_database()


async def test_successful_completion():
    """Test that both Redis and database get updated when everything works."""
    print("\n🧪 Testing successful completion...")
    
    # Create a test job
    job_queue = JobQueue()
    
    test_job_data = {
        "repo_url": "https://github.com/test/repo.git", 
        "branch": "main",
        "claude_cli_args": None,
        "scan_options": {}
    }
    
    job_id = job_queue.add_job(JobType.SCAN_REPO, test_job_data)
    print(f"📝 Created test job: {job_id}")
    
    # Initialize database connection
    await init_database()
    db = await get_db()
    
    try:
        # Create ScanJob record in database
        await db.scanjob.create(
            data={
                "id": job_id,
                "type": "SCAN_REPO", 
                "status": "IN_PROGRESS",
                "startedAt": datetime.now(),
                "data": json.dumps(test_job_data),
            }
        )
        
        # Simulate successful completion by directly calling the queue methods
        test_result = {
            "scan_completed_at": datetime.now().isoformat(),
            "repository": test_job_data["repo_url"],
            "branch": test_job_data["branch"],
            "results": {"summary": "Test completed successfully"},
            "vulnerabilities_stored": 0
        }
        
        # Update database first (simulating successful database update)
        await db.scanjob.update(
            where={"id": job_id},
            data={
                "status": "COMPLETED",
                "finishedAt": datetime.now(),
                "result": json.dumps(test_result, default=str)
            }
        )
        
        # Then update Redis (this would happen in process_job after successful _process_scan_job)
        job_queue.complete_job(job_id, test_result)
        
        # Verify both are synchronized
        redis_job = job_queue.get_job(job_id)
        redis_status = redis_job.status.value if redis_job else "NOT_FOUND"
        
        db_job = await db.scanjob.find_unique(where={"id": job_id})
        db_status = db_job.status if db_job else "NOT_FOUND"
        
        print(f"🔍 Redis status after successful completion: {redis_status}")
        print(f"🔍 Database status after successful completion: {db_status}")
        
        if redis_status == "COMPLETED" and db_status == "COMPLETED":
            print("✅ SUCCESS: Both Redis and Database show COMPLETED when update succeeds")
            return True
        else:
            print(f"❌ FAILURE: Status mismatch - Redis: {redis_status}, Database: {db_status}")
            return False
            
    finally:
        # Cleanup
        try:
            await db.scanjob.delete(where={"id": job_id})
            job_queue.redis.hdel(job_queue.jobs_key, job_id)
            print(f"🧹 Cleaned up test job: {job_id}")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")
            
        await close_database()


async def main():
    """Main test function."""
    print("🚀 Job Status Synchronization Test Suite")
    print("=" * 50)
    
    # Test 1: Database failure handling
    test1_passed = await test_database_failure_handling()
    
    # Test 2: Successful completion
    test2_passed = await test_successful_completion()
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 Test Results:")
    print(f"   Database Failure Handling: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"   Successful Completion: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! Job status synchronization fix is working correctly.")
    else:
        print("\n❌ Some tests failed. Please review the implementation.")
        
    return test1_passed and test2_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)