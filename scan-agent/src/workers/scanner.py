"""Background worker for vulnerability scanning."""
import os
import sys
import time
import signal
import tempfile
import shutil
import subprocess
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.job import Job, JobStatus, JobType, ScanJobData
from utils.queue import JobQueue
from utils.redis_client import redis_connection

class ScanWorker:
    """Worker that processes vulnerability scan jobs."""
    
    def __init__(self):
        self.job_queue = JobQueue()
        self.running = True
        self.current_job: Optional[Job] = None
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    def _clone_repository(self, repo_url: str, branch: str, target_dir: str) -> bool:
        """Clone a repository to the target directory."""
        try:
            # Clone the repository
            cmd = ["git", "clone", "--depth", "1", "--branch", branch, repo_url, target_dir]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise Exception(f"Git clone failed: {result.stderr}")
            
            return True
        except subprocess.TimeoutExpired:
            raise Exception("Git clone timed out after 5 minutes")
        except Exception as e:
            raise Exception(f"Failed to clone repository: {str(e)}")
    
    def _run_claude_scan(self, repo_path: str, claude_cli_args: Optional[str] = None) -> Dict[str, Any]:
        """Run Claude Code CLI on the repository."""
        try:
            # Base command
            cmd = ["claude-code"]
            
            # Add custom arguments if provided
            if claude_cli_args:
                cmd.extend(claude_cli_args.split())
            
            # Add the scan prompt
            cmd.extend([
                "--model", "claude-3-haiku-20240307",
                "--prompt", "Analyze this codebase for security vulnerabilities. Look for common vulnerabilities like SQL injection, XSS, authentication issues, exposed secrets, and other security concerns. Provide a detailed report in JSON format with the structure: {vulnerabilities: [{type: string, severity: high|medium|low, file: string, line: number, description: string, recommendation: string}], summary: string, risk_level: high|medium|low}"
            ])
            
            # Run the command in the repository directory
            result = subprocess.run(
                cmd,
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=1800  # 30 minute timeout
            )
            
            if result.returncode != 0:
                raise Exception(f"Claude CLI failed: {result.stderr}")
            
            # Parse the JSON output
            try:
                # Extract JSON from the output (Claude might include explanatory text)
                output = result.stdout
                # Find JSON content between first { and last }
                start_idx = output.find('{')
                end_idx = output.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = output[start_idx:end_idx]
                    return json.loads(json_str)
                else:
                    # If no JSON found, return raw output
                    return {
                        "raw_output": output,
                        "summary": "Could not parse JSON from Claude output",
                        "risk_level": "unknown"
                    }
            except json.JSONDecodeError:
                return {
                    "raw_output": result.stdout,
                    "summary": "Failed to parse Claude output as JSON",
                    "risk_level": "unknown"
                }
                
        except subprocess.TimeoutExpired:
            raise Exception("Claude scan timed out after 30 minutes")
        except Exception as e:
            raise Exception(f"Failed to run Claude scan: {str(e)}")
    
    def _process_scan_job(self, job: Job) -> Dict[str, Any]:
        """Process a repository scan job."""
        scan_data = ScanJobData.from_dict(job.data)
        temp_dir = None
        
        try:
            # Create temporary directory for cloning
            temp_dir = tempfile.mkdtemp(prefix="scan_")
            repo_path = os.path.join(temp_dir, "repo")
            
            print(f"Processing scan job {job.id} for {scan_data.repo_url}")
            
            # Step 1: Clone the repository
            print(f"Cloning repository to {repo_path}...")
            self._clone_repository(scan_data.repo_url, scan_data.branch, repo_path)
            
            # Step 2: Run Claude Code CLI
            print("Running vulnerability scan with Claude Code CLI...")
            scan_results = self._run_claude_scan(repo_path, scan_data.claude_cli_args)
            
            # Step 3: Process results
            result = {
                "scan_completed_at": datetime.now().isoformat(),
                "repository": scan_data.repo_url,
                "branch": scan_data.branch,
                "results": scan_results
            }
            
            print(f"Scan completed for job {job.id}")
            return result
            
        finally:
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    def process_job(self, job: Job):
        """Process a single job."""
        try:
            print(f"Starting job {job.id} of type {job.type.value}")
            
            if job.type == JobType.SCAN_REPO:
                result = self._process_scan_job(job)
                self.job_queue.complete_job(job.id, result)
            else:
                raise Exception(f"Unknown job type: {job.type.value}")
                
        except Exception as e:
            error_msg = str(e)
            print(f"Job {job.id} failed: {error_msg}")
            self.job_queue.fail_job(job.id, error_msg)
    
    def run(self):
        """Main worker loop."""
        print("Scan worker started. Waiting for jobs...")
        
        while self.running:
            try:
                # Get next job from queue
                job = self.job_queue.get_next_job()
                
                if job:
                    self.current_job = job
                    self.process_job(job)
                    self.current_job = None
                else:
                    # No job available, wait a bit
                    time.sleep(1)
                    
            except Exception as e:
                print(f"Worker error: {str(e)}")
                time.sleep(5)  # Wait before retrying
        
        print("Scan worker stopped.")

def main():
    """Main entry point for the worker."""
    worker = ScanWorker()
    worker.run()

if __name__ == "__main__":
    main()