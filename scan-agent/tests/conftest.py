"""
Pytest configuration and fixtures for scan-agent tests.
"""
import pytest
import asyncio
import os
import time
import subprocess
import signal
import threading
import requests
import redis
from typing import Generator, Optional


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_config():
    """Test configuration."""
    return {
        "api_base_url": os.getenv("TEST_API_URL", "http://localhost:8000"),
        "redis_host": os.getenv("TEST_REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("TEST_REDIS_PORT", "6379")),
        "redis_db": int(os.getenv("TEST_REDIS_DB", "1")),  # Use different DB for tests
        "test_timeout": int(os.getenv("TEST_TIMEOUT", "300")),  # 5 minutes
        "worker_startup_timeout": int(os.getenv("WORKER_STARTUP_TIMEOUT", "30")),
    }


@pytest.fixture(scope="session")
def redis_client(test_config):
    """Redis client fixture for tests."""
    client = redis.Redis(
        host=test_config["redis_host"],
        port=test_config["redis_port"],
        db=test_config["redis_db"],
        decode_responses=True
    )
    
    # Test connection
    try:
        client.ping()
    except redis.ConnectionError:
        pytest.skip("Redis not available for testing")
    
    yield client
    
    # Cleanup: flush test database
    client.flushdb()
    client.close()


class ServiceManager:
    """Helper class to manage test services."""
    
    def __init__(self, config):
        self.config = config
        self.processes = {}
        self.running = False
    
    def start_scan_server(self) -> subprocess.Popen:
        """Start the scan server for testing."""
        env = os.environ.copy()
        env.update({
            "REDIS_HOST": self.config["redis_host"],
            "REDIS_PORT": str(self.config["redis_port"]),
            "REDIS_DB": str(self.config["redis_db"]),
            "PORT": "8000"
        })
        
        # Start server
        process = subprocess.Popen(
            ["python", "-m", "scan_agent.server"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        return process
    
    def start_worker(self) -> subprocess.Popen:
        """Start a worker for testing."""
        env = os.environ.copy()
        env.update({
            "REDIS_HOST": self.config["redis_host"],
            "REDIS_PORT": str(self.config["redis_port"]),
            "REDIS_DB": str(self.config["redis_db"])
        })
        
        # Start worker
        process = subprocess.Popen(
            ["python", "-m", "scan_agent.workers.scanner"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        return process
    
    def wait_for_service(self, url: str, timeout: int = 30) -> bool:
        """Wait for a service to become available."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{url}/health", timeout=5)
                if response.status_code == 200:
                    return True
            except requests.exceptions.RequestException:
                pass
            time.sleep(1)
        return False
    
    def stop_all_processes(self):
        """Stop all managed processes."""
        for name, process in self.processes.items():
            if process.poll() is None:  # Process is still running
                try:
                    process.terminate()
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                print(f"Stopped {name}")


@pytest.fixture(scope="session")
def service_manager(test_config):
    """Service manager fixture."""
    manager = ServiceManager(test_config)
    yield manager
    manager.stop_all_processes()


@pytest.fixture(scope="session")
def scan_server(service_manager, test_config):
    """Start scan server for tests."""
    print("Starting scan server...")
    
    # Start the server
    server_process = service_manager.start_scan_server()
    service_manager.processes["scan_server"] = server_process
    
    # Wait for server to be ready
    if not service_manager.wait_for_service(test_config["api_base_url"], timeout=30):
        # Print server logs for debugging
        stdout, stderr = server_process.communicate(timeout=5)
        print(f"Server stdout: {stdout.decode() if stdout else 'None'}")
        print(f"Server stderr: {stderr.decode() if stderr else 'None'}")
        pytest.fail("Scan server failed to start within timeout")
    
    print("Scan server started successfully")
    yield server_process
    
    # Cleanup is handled by service_manager


@pytest.fixture(scope="function")
def clean_redis(redis_client):
    """Clean Redis before each test."""
    # Clean up any existing test data
    redis_client.flushdb()
    yield redis_client
    # Clean up after test
    redis_client.flushdb()


@pytest.fixture
def test_job_data():
    """Sample job data for testing."""
    return {
        "repo_url": "https://github.com/octocat/Hello-World.git",
        "branch": "main",
        "claude_cli_args": "--max-tokens 1000",
        "scan_options": {
            "deep_scan": False,
            "include_tests": True
        }
    }


@pytest.fixture
def mock_scan_result():
    """Mock scan result for testing."""
    return {
        "vulnerabilities": [
            {
                "type": "hardcoded_secret",
                "severity": "high",
                "file": "config.py",
                "line": 42,
                "description": "Potential API key found in source code",
                "recommendation": "Move sensitive data to environment variables"
            }
        ],
        "summary": "1 high severity vulnerability found",
        "risk_level": "high"
    }


# Pytest markers
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
