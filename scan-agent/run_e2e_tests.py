#!/usr/bin/env python3
"""
E2E Test Runner for Scan Agent
Manages test environment setup, execution, and cleanup.
"""
import os
import sys
import time
import signal
import subprocess
import argparse
import requests
import redis
from typing import Optional, List
import json


class E2ETestRunner:
    """Manages the complete E2E test lifecycle."""
    
    def __init__(self, args):
        self.args = args
        self.processes = {}
        self.redis_client = None
        self.original_cwd = os.getcwd()
        
        # Test configuration
        self.config = {
            "redis_host": args.redis_host,
            "redis_port": args.redis_port,
            "redis_db": args.redis_db,
            "api_url": f"http://localhost:{args.port}",
            "port": args.port,
            "timeout": args.timeout,
            "verbose": args.verbose
        }
    
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp."""
        if level == "DEBUG" and not self.args.verbose:
            return
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def setup_redis(self) -> bool:
        """Setup and verify Redis connection."""
        self.log("Setting up Redis connection...")
        
        try:
            self.redis_client = redis.Redis(
                host=self.config["redis_host"],
                port=self.config["redis_port"],
                db=self.config["redis_db"],
                decode_responses=True
            )
            
            # Test connection
            self.redis_client.ping()
            
            # Clear test database
            self.redis_client.flushdb()
            self.log("Redis connection established and test DB cleared")
            return True
            
        except redis.ConnectionError as e:
            self.log(f"Failed to connect to Redis: {e}", "ERROR")
            return False
    
    def start_scan_server(self) -> bool:
        """Start the scan server."""
        self.log("Starting scan server...")
        
        env = os.environ.copy()
        env.update({
            "REDIS_HOST": self.config["redis_host"],
            "REDIS_PORT": str(self.config["redis_port"]),
            "REDIS_DB": str(self.config["redis_db"]),
            "PORT": str(self.config["port"])
        })
        
        try:
            # Change to scan-agent directory
            scan_agent_dir = os.path.dirname(os.path.abspath(__file__))
            
            process = subprocess.Popen(
                [sys.executable, "-m", "scan_agent.server"],
                cwd=scan_agent_dir,
                env=env,
                stdout=subprocess.PIPE if not self.args.verbose else None,
                stderr=subprocess.PIPE if not self.args.verbose else None
            )
            
            self.processes["scan_server"] = process
            
            # Wait for server to be ready
            if self.wait_for_service(f"{self.config['api_url']}/health"):
                self.log("Scan server started successfully")
                return True
            else:
                self.log("Scan server failed to start within timeout", "ERROR")
                self.print_process_logs("scan_server")
                return False
                
        except Exception as e:
            self.log(f"Failed to start scan server: {e}", "ERROR")
            return False
    
    def start_worker(self) -> bool:
        """Start a worker (optional for some tests)."""
        if not self.args.start_worker:
            self.log("Skipping worker startup (--no-worker specified)")
            return True
        
        self.log("Starting scan worker...")
        
        env = os.environ.copy()
        env.update({
            "REDIS_HOST": self.config["redis_host"],
            "REDIS_PORT": str(self.config["redis_port"]),
            "REDIS_DB": str(self.config["redis_db"])
        })
        
        try:
            scan_agent_dir = os.path.dirname(os.path.abspath(__file__))
            
            process = subprocess.Popen(
                [sys.executable, "-m", "scan_agent.workers.scanner"],
                cwd=scan_agent_dir,
                env=env,
                stdout=subprocess.PIPE if not self.args.verbose else None,
                stderr=subprocess.PIPE if not self.args.verbose else None
            )
            
            self.processes["scan_worker"] = process
            
            # Give worker a moment to start
            time.sleep(2)
            
            if process.poll() is None:
                self.log("Scan worker started successfully")
                return True
            else:
                self.log("Scan worker failed to start", "ERROR")
                self.print_process_logs("scan_worker")
                return False
                
        except Exception as e:
            self.log(f"Failed to start scan worker: {e}", "ERROR")
            return False
    
    def wait_for_service(self, url: str, timeout: int = None) -> bool:
        """Wait for a service to become available."""
        timeout = timeout or self.config["timeout"]
        self.log(f"Waiting for service at {url}...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    self.log(f"Service at {url} is ready")
                    return True
            except requests.exceptions.RequestException:
                pass
            time.sleep(1)
        
        self.log(f"Service at {url} not ready within {timeout} seconds", "ERROR")
        return False
    
    def print_process_logs(self, process_name: str):
        """Print logs from a process for debugging."""
        if process_name in self.processes:
            process = self.processes[process_name]
            try:
                stdout, stderr = process.communicate(timeout=5)
                if stdout:
                    self.log(f"{process_name} stdout:", "DEBUG")
                    self.log(stdout.decode(), "DEBUG")
                if stderr:
                    self.log(f"{process_name} stderr:", "DEBUG")
                    self.log(stderr.decode(), "DEBUG")
            except subprocess.TimeoutExpired:
                self.log(f"Timeout getting logs from {process_name}", "DEBUG")
    
    def run_tests(self) -> bool:
        """Run the actual tests."""
        self.log("Running E2E tests...")
        
        test_env = os.environ.copy()
        test_env.update({
            "TEST_API_URL": self.config["api_url"],
            "TEST_REDIS_HOST": self.config["redis_host"],
            "TEST_REDIS_PORT": str(self.config["redis_port"]),
            "TEST_REDIS_DB": str(self.config["redis_db"])
        })
        
        try:
            # Determine test command
            if self.args.use_pytest:
                cmd = [
                    sys.executable, "-m", "pytest",
                    "tests/test_e2e_api.py",
                    "-v",
                    "--tb=short"
                ]
                if self.args.verbose:
                    cmd.append("-s")
            else:
                # Run standalone test
                cmd = [sys.executable, "tests/test_e2e_api.py"]
            
            # Run tests
            result = subprocess.run(
                cmd,
                cwd=os.path.dirname(os.path.abspath(__file__)),
                env=test_env,
                capture_output=not self.args.verbose
            )
            
            if result.returncode == 0:
                self.log("All tests passed successfully! 🎉")
                return True
            else:
                self.log("Some tests failed ❌", "ERROR")
                if not self.args.verbose and result.stdout:
                    print(result.stdout.decode())
                if not self.args.verbose and result.stderr:
                    print(result.stderr.decode())
                return False
                
        except Exception as e:
            self.log(f"Failed to run tests: {e}", "ERROR")
            return False
    
    def cleanup(self):
        """Clean up all resources."""
        self.log("Cleaning up resources...")
        
        # Stop all processes
        for name, process in self.processes.items():
            if process.poll() is None:  # Process is still running
                self.log(f"Stopping {name}...")
                try:
                    process.terminate()
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    self.log(f"Force killing {name}...")
                    process.kill()
                    process.wait()
        
        # Clean Redis
        if self.redis_client:
            try:
                self.redis_client.flushdb()
                self.redis_client.close()
                self.log("Redis test DB cleaned")
            except Exception as e:
                self.log(f"Failed to clean Redis: {e}", "ERROR")
        
        # Restore working directory
        os.chdir(self.original_cwd)
        
        self.log("Cleanup completed")
    
    def run(self) -> bool:
        """Run the complete E2E test suite."""
        self.log("Starting E2E Test Runner for Scan Agent")
        self.log("=" * 50)
        
        success = False
        
        try:
            # Setup phase
            if not self.setup_redis():
                return False
            
            if not self.start_scan_server():
                return False
            
            if not self.start_worker():
                return False
            
            # Test execution phase
            success = self.run_tests()
            
        except KeyboardInterrupt:
            self.log("Test run interrupted by user", "ERROR")
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
        finally:
            # Always cleanup
            self.cleanup()
        
        self.log("=" * 50)
        if success:
            self.log("E2E Test Run Completed Successfully! 🎉")
        else:
            self.log("E2E Test Run Failed ❌", "ERROR")
        
        return success


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="E2E Test Runner for Scan Agent")
    
    # Service configuration
    parser.add_argument("--redis-host", default="localhost", help="Redis host")
    parser.add_argument("--redis-port", type=int, default=6379, help="Redis port")
    parser.add_argument("--redis-db", type=int, default=1, help="Redis database number for tests")
    parser.add_argument("--port", type=int, default=8000, help="API server port")
    
    # Test configuration
    parser.add_argument("--timeout", type=int, default=30, help="Service startup timeout")
    parser.add_argument("--no-worker", dest="start_worker", action="store_false", 
                       help="Don't start worker (for API-only tests)")
    parser.add_argument("--use-pytest", action="store_true", 
                       help="Use pytest instead of standalone test runner")
    
    # Output configuration
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Run tests
    runner = E2ETestRunner(args)
    success = runner.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
