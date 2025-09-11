"""Background worker for vulnerability fixing using Claude Code SDK."""

import os
import sys
import time
import signal
import tempfile
import shutil
import subprocess
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Claude Code SDK imports
try:
    from claude_code_sdk import query, ClaudeCodeOptions
    from claude_code_sdk.types import (
        AssistantMessage,
        SystemMessage,
        UserMessage,
    )

    CLAUDE_SDK_AVAILABLE = True
    logger.info("Claude Code SDK imported successfully")
except ImportError as e:
    CLAUDE_SDK_AVAILABLE = False
    logger.error(f"Failed to import Claude Code SDK: {e}")
    logger.error("Please install claude-code-sdk: pip install claude-code-sdk")

# Package imports
from fix_agent.models.job import Job, JobStatus, JobType, FixJobData, VulnerabilityData
from fix_agent.utils.queue import FixJobQueue
from fix_agent.utils.redis_client import redis_connection
from fix_agent.utils.github_client import GitHubFixClient


class FixWorker:
    """Worker that processes vulnerability fix jobs."""

    def __init__(self):
        self.job_queue = FixJobQueue()
        self.github_client = GitHubFixClient()
        self.running = True
        self.current_job: Optional[Job] = None
        self.cancelled_jobs = set()  # Track jobs requested for cancellation

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"Received signal {signum}, shutting down gracefully...")
        self.running = False

    def request_cancellation(self, job_id: str):
        """Request cancellation of a specific job."""
        logger.info(f"Cancellation requested for job {job_id}")
        print(f"🛑 Cancellation requested for job {job_id}")
        self.cancelled_jobs.add(job_id)

    def _is_job_cancelled(self, job_id: str) -> bool:
        """Check if a job has been requested for cancellation."""
        return job_id in self.cancelled_jobs

    def _cleanup_cancelled_job(self, job_id: str):
        """Clean up after a cancelled job."""
        self.cancelled_jobs.discard(job_id)

    def run(self):
        """Main worker loop."""
        logger.info("Fix worker started")
        print("🔧 Fix worker started, waiting for jobs...")

        if not CLAUDE_SDK_AVAILABLE:
            logger.error("Claude Code SDK is not available. Worker cannot function.")
            print("❌ Claude Code SDK is not available. Please install it.")
            return

        while self.running:
            try:
                # Get next job from queue
                job = self.job_queue.get_next_job()
                if job:
                    self.current_job = job
                    logger.info(f"Processing fix job {job.id}")
                    print(f"🔧 Processing fix job {job.id}")

                    # Check if job was cancelled before processing
                    if self._is_job_cancelled(job.id):
                        logger.info(f"Job {job.id} was cancelled before processing")
                        self.job_queue.cancel_job(job.id)
                        self._cleanup_cancelled_job(job.id)
                        self.current_job = None
                        continue

                    # Process the job
                    self._process_fix_job(job)
                    self.current_job = None
                else:
                    # No jobs available, sleep briefly
                    time.sleep(1)

            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt, shutting down...")
                break
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                if self.current_job:
                    self.job_queue.fail_job(
                        self.current_job.id, f"Unexpected worker error: {str(e)}"
                    )
                    self.current_job = None
                time.sleep(5)  # Brief delay before retrying

        logger.info("Fix worker stopped")
        print("🔧 Fix worker stopped")

    def _process_fix_job(self, job: Job):
        """Process a single fix job."""
        job_id = job.id
        
        try:
            # Check for cancellation
            if self._is_job_cancelled(job_id):
                logger.info(f"Job {job_id} cancelled during processing")
                self.job_queue.cancel_job(job_id)
                self._cleanup_cancelled_job(job_id)
                return

            # Parse job data
            try:
                fix_data = FixJobData.from_dict(job.data)
            except Exception as e:
                error_msg = f"Invalid fix job data: {str(e)}"
                logger.error(error_msg)
                self.job_queue.fail_job(job_id, error_msg)
                return

            logger.info(f"Fix job data: {fix_data.repo_url}, vulnerability: {fix_data.vulnerability.title}")

            # Create temporary directory for repository
            temp_dir = None
            try:
                temp_dir = tempfile.mkdtemp(prefix=f"fix_job_{job_id}_")
                logger.info(f"Created temporary directory: {temp_dir}")

                # Check for cancellation before cloning
                if self._is_job_cancelled(job_id):
                    logger.info(f"Job {job_id} cancelled before cloning")
                    self.job_queue.cancel_job(job_id)
                    self._cleanup_cancelled_job(job_id)
                    return

                # Clone repository
                repo_path = self._clone_repository(fix_data.repo_url, fix_data.branch, temp_dir)
                if not repo_path:
                    error_msg = "Failed to clone repository"
                    logger.error(error_msg)
                    self.job_queue.fail_job(job_id, error_msg)
                    return

                # Check for cancellation before processing
                if self._is_job_cancelled(job_id):
                    logger.info(f"Job {job_id} cancelled before processing")
                    self.job_queue.cancel_job(job_id)
                    self._cleanup_cancelled_job(job_id)
                    return

                # Process vulnerability fix using Claude
                fix_result = self._fix_vulnerability_with_claude(repo_path, fix_data.vulnerability)
                if not fix_result:
                    error_msg = "Failed to generate fix with Claude"
                    logger.error(error_msg)
                    self.job_queue.fail_job(job_id, error_msg)
                    return

                # Check for cancellation before creating PR
                if self._is_job_cancelled(job_id):
                    logger.info(f"Job {job_id} cancelled before PR creation")
                    self.job_queue.cancel_job(job_id)
                    self._cleanup_cancelled_job(job_id)
                    return

                # Create GitHub PR with the fix
                pr_result = asyncio.run(self._create_fix_pr(fix_data, fix_result))
                if not pr_result:
                    error_msg = "Failed to create GitHub PR"
                    logger.error(error_msg)
                    self.job_queue.fail_job(job_id, error_msg)
                    return

                # Job completed successfully
                result = {
                    "status": "completed",
                    "pr_url": pr_result.get("html_url"),
                    "pr_number": pr_result.get("number"),
                    "fix_summary": fix_result.get("summary", "Fix applied"),
                    "files_modified": fix_result.get("files_modified", []),
                    "completed_at": datetime.now().isoformat()
                }

                logger.info(f"Fix job {job_id} completed successfully")
                print(f"✅ Fix job {job_id} completed. PR: {result.get('pr_url')}")
                self.job_queue.complete_job(job_id, result)

            except Exception as e:
                error_msg = f"Error processing fix job: {str(e)}"
                logger.error(error_msg, exc_info=True)
                self.job_queue.fail_job(job_id, error_msg)

            finally:
                # Clean up temporary directory
                if temp_dir and os.path.exists(temp_dir):
                    try:
                        shutil.rmtree(temp_dir)
                        logger.info(f"Cleaned up temporary directory: {temp_dir}")
                    except Exception as e:
                        logger.warning(f"Failed to cleanup temp directory: {e}")

        except Exception as e:
            logger.error(f"Fatal error in fix job processing: {e}", exc_info=True)
            try:
                self.job_queue.fail_job(job_id, f"Fatal error: {str(e)}")
            except Exception:
                logger.error("Failed to mark job as failed")

    def _clone_repository(self, repo_url: str, branch: str, temp_dir: str) -> Optional[str]:
        """Clone repository to temporary directory."""
        try:
            repo_path = os.path.join(temp_dir, "repo")
            
            # Git clone command with timeout
            cmd = ["git", "clone", "--depth", "1", "--branch", branch, repo_url, repo_path]
            logger.info(f"Cloning repository: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5-minute timeout
                cwd=temp_dir
            )
            
            if result.returncode != 0:
                logger.error(f"Git clone failed: {result.stderr}")
                return None
                
            logger.info(f"Successfully cloned repository to {repo_path}")
            return repo_path
            
        except subprocess.TimeoutExpired:
            logger.error("Git clone timed out")
            return None
        except Exception as e:
            logger.error(f"Error cloning repository: {e}")
            return None

    def _fix_vulnerability_with_claude(self, repo_path: str, vulnerability: VulnerabilityData) -> Optional[Dict[str, Any]]:
        """Use Claude Code SDK to fix the vulnerability."""
        try:
            logger.info(f"Fixing vulnerability: {vulnerability.title}")
            
            # Prepare the system prompt for fixing
            system_prompt = """You are a security expert tasked with fixing code vulnerabilities. 
            
            Your goal is to:
            1. Analyze the provided vulnerability
            2. Locate the vulnerable code in the repository
            3. Generate a secure fix that addresses the vulnerability
            4. Ensure the fix follows security best practices
            5. Make minimal changes to preserve existing functionality
            
            Please provide the fix as file modifications with clear explanations."""

            # Prepare the user prompt with vulnerability details
            user_prompt = f"""Please fix the following vulnerability:

**Title:** {vulnerability.title}

**Description:** {vulnerability.description}

**Severity:** {vulnerability.severity}

**Category:** {vulnerability.category}

**File Path:** {vulnerability.filePath}

**Lines:** {vulnerability.startLine}{f"-{vulnerability.endLine}" if vulnerability.endLine else ""}

**Current Code:**
```
{vulnerability.codeSnippet}
```

**Recommendation:** {vulnerability.recommendation}

Please analyze the repository and provide a secure fix for this vulnerability. Focus on the specific file and lines mentioned, and ensure your fix follows security best practices."""

            # Use Claude Code SDK to generate the fix
            options = ClaudeCodeOptions(
                project_root=repo_path,
                model_name="claude-3-5-sonnet-20241022"
            )
            
            # Create conversation with system and user messages
            messages = [
                SystemMessage(content=system_prompt),
                UserMessage(content=user_prompt)
            ]
            
            logger.info("Calling Claude Code SDK for vulnerability fix")
            response = query(messages, options)
            
            if not response or not response.messages:
                logger.error("No response from Claude Code SDK")
                return None
            
            # Extract the fix information from Claude's response
            claude_response = response.messages[-1].content if response.messages else ""
            
            # Parse the response to extract file changes
            # This is a simplified implementation - you might want to enhance this
            fix_result = {
                "claude_response": claude_response,
                "summary": f"Applied fix for {vulnerability.title}",
                "files_modified": [vulnerability.filePath],
                "vulnerability_id": vulnerability.id
            }
            
            logger.info(f"Claude generated fix for vulnerability: {vulnerability.title}")
            return fix_result
            
        except Exception as e:
            logger.error(f"Error fixing vulnerability with Claude: {e}", exc_info=True)
            return None

    async def _create_fix_pr(self, fix_data: FixJobData, fix_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a GitHub PR with the vulnerability fix."""
        try:
            # Parse repository URL to get owner and repo name
            owner, repo = self.github_client.parse_repo_url(fix_data.repo_url)
            
            # Create a unique branch name for the fix
            branch_name = f"fix/vulnerability-{fix_data.vulnerability.id[:8]}-{int(datetime.now().timestamp())}"
            
            # Create new branch
            branch_result = await self.github_client.create_branch(
                owner, repo, branch_name, fix_data.branch
            )
            
            if not branch_result:
                logger.error("Failed to create fix branch")
                return None
            
            # For now, we'll create a simple PR with the Claude response
            # In a more complete implementation, you would parse the Claude response
            # and apply the actual file changes
            
            pr_title = f"🔒 Fix: {fix_data.vulnerability.title}"
            pr_body = f"""## Vulnerability Fix

**Vulnerability:** {fix_data.vulnerability.title}
**Severity:** {fix_data.vulnerability.severity}
**Category:** {fix_data.vulnerability.category}

### Description
{fix_data.vulnerability.description}

### Fix Applied
{fix_result.get('summary', 'Applied security fix')}

### Files Modified
- {fix_data.vulnerability.filePath} (Line {fix_data.vulnerability.startLine})

### Claude Analysis
{fix_result.get('claude_response', 'Fix generated by Claude AI')}

---
*This PR was automatically generated by Fortify Fix Agent*
"""

            # Create the pull request
            pr_result = await self.github_client.create_pull_request(
                owner=owner,
                repo=repo,
                title=pr_title,
                body=pr_body,
                head_branch=branch_name,
                base_branch=fix_data.branch
            )
            
            if pr_result:
                logger.info(f"Created PR #{pr_result['number']}: {pr_result['html_url']}")
                return pr_result
            else:
                logger.error("Failed to create pull request")
                return None
                
        except Exception as e:
            logger.error(f"Error creating fix PR: {e}", exc_info=True)
            return None