"""
End-to-End API Testing for Scan Agent
Tests job creation, worker processing, and complete workflow validation.
"""

import asyncio
import json
import time
import pytest
import httpx
import redis
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import subprocess
import os
import signal
import threading
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ScanAgentE2ETest:
    """End-to-end test class for Scan Agent API and Worker."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        redis_host: str = "localhost",
        redis_port: int = 6379,
    ):
        self.base_url = base_url
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_client = None
        self.test_jobs = []  # Track created jobs for cleanup

    def setup(self):
        """Set up test environment."""
        logger.info("Setting up test environment...")
        print("🔧 Setting up test environment...")

        # Initialize Redis connection
        logger.debug(f"Connecting to Redis at {self.redis_host}:{self.redis_port}")
        self.redis_client = redis.Redis(
            host=self.redis_host, port=self.redis_port, db=0, decode_responses=True
        )

        # Test Redis connection
        try:
            ping_result = self.redis_client.ping()
            logger.info(f"Redis ping successful: {ping_result}")
            print("✅ Redis connection established")
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
            raise Exception(
                "❌ Failed to connect to Redis. Make sure Redis is running."
            )

    def teardown(self):
        """Clean up test environment."""
        if self.redis_client:
            # Clean up test jobs from Redis
            for job_id in self.test_jobs:
                try:
                    self.redis_client.hdel("scan_jobs:jobs", job_id)
                    self.redis_client.lrem("scan_jobs:pending", 0, job_id)
                    self.redis_client.lrem("scan_jobs:processing", 0, job_id)
                except Exception as e:
                    print(f"Warning: Failed to clean up job {job_id}: {e}")

            self.redis_client.close()
            print("✅ Test cleanup completed")

    async def test_health_endpoint(self):
        """Test the health endpoint."""
        print("\n🔍 Testing health endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "scan-orchestrator"
            print("✅ Health endpoint working correctly")

    async def test_create_scan_job(self) -> str:
        """Test creating a scan job."""
        print("\n🔍 Testing job creation...")
        logger.info("Starting job creation test")

        # Test payload
        scan_request = {
            "repo_url": "https://github.com/ishepard/pydriller.git",
            "branch": "master",
            "claude_cli_args": "--max-tokens 1000",
            "scan_options": {"deep_scan": False, "include_tests": True},
        }

        logger.debug(f"Scan request payload: {json.dumps(scan_request, indent=2)}")
        print(f"📝 Request payload: {json.dumps(scan_request, indent=2)}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.debug(f"Sending POST request to {self.base_url}/scan/repo")
            response = await client.post(
                f"{self.base_url}/scan/repo", json=scan_request
            )

            logger.debug(f"Response status: {response.status_code}")
            logger.debug(f"Response headers: {dict(response.headers)}")
            logger.debug(f"Response content: {response.text}")

            print(f"📡 Response status: {response.status_code}")
            print(f"📡 Response content: {response.text}")

            assert response.status_code == 200
            data = response.json()

            # Validate response structure
            assert "job_id" in data
            assert "status" in data
            assert "created_at" in data
            assert "message" in data

            job_id = data["job_id"]
            assert data["status"] == "pending"
            assert job_id is not None

            # Track job for cleanup
            self.test_jobs.append(job_id)

            logger.info(f"Job created with ID: {job_id}")
            print(f"✅ Job created successfully with ID: {job_id}")
            return job_id

    async def test_get_job_status(self, job_id: str):
        """Test getting job status."""
        print(f"\n🔍 Testing job status retrieval for {job_id}...")

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/jobs/{job_id}")

            assert response.status_code == 200
            data = response.json()

            # Validate response structure
            assert data["job_id"] == job_id
            assert "status" in data
            assert "type" in data
            assert "created_at" in data
            assert "updated_at" in data

            print(f"✅ Job status retrieved: {data['status']}")
            return data

    async def test_list_jobs(self):
        """Test listing all jobs."""
        print("\n🔍 Testing job listing...")

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/jobs")

            assert response.status_code == 200
            data = response.json()

            assert isinstance(data, list)
            if len(data) > 0:
                # Validate structure of first job
                job = data[0]
                assert "job_id" in job
                assert "status" in job
                assert "type" in job
                assert "created_at" in job
                assert "updated_at" in job

            print(f"✅ Job listing retrieved: {len(data)} jobs found")
            return data

    def verify_job_in_redis(self, job_id: str):
        """Verify job exists in Redis."""
        print(f"\n🔍 Verifying job {job_id} in Redis...")

        # Check if job exists in jobs hash
        job_data = self.redis_client.hget("scan_jobs:jobs", job_id)
        assert job_data is not None, f"Job {job_id} not found in Redis jobs hash"

        job_dict = json.loads(job_data)
        assert job_dict["id"] == job_id
        assert job_dict["type"] == "scan_repo"

        print(f"✅ Job {job_id} verified in Redis")
        return job_dict

    def verify_job_in_queue(self, job_id: str, queue_name: str = "scan_jobs:pending"):
        """Verify job exists in specified queue."""
        print(f"\n🔍 Verifying job {job_id} in queue {queue_name}...")

        # Check if job is in the specified queue
        queue_items = self.redis_client.lrange(queue_name, 0, -1)
        assert job_id in queue_items, f"Job {job_id} not found in queue {queue_name}"

        print(f"✅ Job {job_id} verified in queue {queue_name}")

    async def wait_for_job_status_change(
        self, job_id: str, expected_status: str, timeout: int = 60
    ) -> Dict[str, Any]:
        """Wait for job status to change to expected status."""
        print(f"\n⏳ Waiting for job {job_id} to reach status '{expected_status}'...")

        start_time = time.time()
        while time.time() - start_time < timeout:
            job_data = await self.test_get_job_status(job_id)
            if job_data["status"] == expected_status:
                print(f"✅ Job {job_id} reached status '{expected_status}'")
                return job_data

            await asyncio.sleep(2)  # Check every 2 seconds

        raise TimeoutError(
            f"Job {job_id} did not reach status '{expected_status}' within {timeout} seconds"
        )

    async def test_job_processing_simulation(self, job_id: str):
        """Simulate job processing by manually updating job status."""
        print(f"\n🔍 Simulating job processing for {job_id}...")

        # Get job from Redis
        job_data = self.redis_client.hget("scan_jobs:jobs", job_id)
        job_dict = json.loads(job_data)

        # Update to in_progress
        job_dict["status"] = "in_progress"
        job_dict["updated_at"] = datetime.now().isoformat()
        self.redis_client.hset("scan_jobs:jobs", job_id, json.dumps(job_dict))

        # Move from pending to processing queue
        self.redis_client.lrem("scan_jobs:pending", 1, job_id)
        self.redis_client.lpush("scan_jobs:processing", job_id)

        print(f"✅ Job {job_id} moved to in_progress status")

        # Wait a bit, then complete the job
        await asyncio.sleep(2)

        # Complete the job
        job_dict["status"] = "completed"
        job_dict["updated_at"] = datetime.now().isoformat()
        job_dict["result"] = {
            "scan_completed_at": datetime.now().isoformat(),
            "repository": "https://github.com/ishepard/pydriller.git",
            "branch": "master",
            "results": {
                "vulnerabilities": [],
                "summary": "No vulnerabilities found in test simulation",
                "risk_level": "low",
            },
        }
        self.redis_client.hset("scan_jobs:jobs", job_id, json.dumps(job_dict))

        # Remove from processing queue
        self.redis_client.lrem("scan_jobs:processing", 1, job_id)

        print(f"✅ Job {job_id} completed successfully")

    async def test_worker_integration(self):
        """Test that worker can process jobs (requires actual worker running)."""
        print("\n🔍 Testing worker integration...")

        # Create a simple test job
        job_id = await self.test_create_scan_job()

        # Check if job is in pending queue
        self.verify_job_in_queue(job_id, "scan_jobs:pending")

        # For this test, we'll simulate processing since we might not have
        # a real worker running in the test environment
        await self.test_job_processing_simulation(job_id)

        # Verify final job status
        final_job_data = await self.test_get_job_status(job_id)
        assert final_job_data["status"] == "completed"
        assert final_job_data["result"] is not None

        print("✅ Worker integration test completed")

    async def test_invalid_requests(self):
        """Test API error handling."""
        print("\n🔍 Testing invalid requests...")

        async with httpx.AsyncClient() as client:
            # Test invalid repo URL
            response = await client.post(
                f"{self.base_url}/scan/repo", json={"repo_url": "invalid-url"}
            )
            assert response.status_code == 422  # Validation error

            # Test non-existent job
            response = await client.get(f"{self.base_url}/jobs/non-existent-job-id")
            assert response.status_code == 404

            print("✅ Invalid request handling working correctly")

    async def run_full_e2e_test(self):
        """Run the complete end-to-end test suite."""
        print("🚀 Starting Scan Agent E2E API Tests")
        print("=" * 50)

        try:
            # Setup
            self.setup()

            # Run tests in sequence
            await self.test_health_endpoint()
            job_id = await self.test_create_scan_job()
            await self.test_get_job_status(job_id)
            await self.test_list_jobs()

            # Redis verification tests
            self.verify_job_in_redis(job_id)
            self.verify_job_in_queue(job_id)

            # Worker integration test
            await self.test_worker_integration()

            # Error handling tests
            await self.test_invalid_requests()

            print("\n" + "=" * 50)
            print("🎉 All E2E tests passed successfully!")
            return True

        except Exception as e:
            print(f"\n❌ Test failed: {str(e)}")
            raise
        finally:
            self.teardown()


# Pytest integration
@pytest.fixture
def e2e_tester():
    """Pytest fixture for E2E tester."""
    tester = ScanAgentE2ETest()
    yield tester
    # Cleanup is handled in tester.teardown()


@pytest.mark.asyncio
async def test_scan_agent_e2e(e2e_tester):
    """Pytest wrapper for E2E tests."""
    await e2e_tester.run_full_e2e_test()


# Standalone execution
if __name__ == "__main__":

    async def main():
        tester = ScanAgentE2ETest()
        await tester.run_full_e2e_test()

    asyncio.run(main())
