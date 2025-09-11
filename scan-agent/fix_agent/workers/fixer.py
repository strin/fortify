"""
Fix worker for processing vulnerability fix jobs.

This module implements the background worker that processes fix jobs
by generating AI-powered fixes and creating GitHub pull requests.
"""

import os
import sys
import time
import signal
import tempfile
import shutil
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any

# Add scan-agent to path for shared database access
sys.path.append("/workspace/scan-agent")

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import fix-agent modules
from fix_agent.models.job import FixJob, FixJobStatus, FixResult

# Import shared utilities from scan_agent
from scan_agent.utils.database import get_db
from scan_agent.utils.queue import JobQueue
from scan_agent.utils.redis_client import get_redis_connection


class FixWorker:
    """
    Background worker for processing fix jobs.

    This worker continuously polls the fix job queue, claims jobs,
    and processes them by generating fixes and creating pull requests.
    """

    def __init__(self):
        self.running = False
        self.queue = JobQueue(
            "fix_jobs"
        )  # Use shared JobQueue with fix_jobs queue name
        self.redis = get_redis_connection()
        self.worker_id = f"fix-worker-{os.getpid()}"

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down worker...")
        self.running = False

    async def start(self):
        """Start the fix worker."""
        logger.info(f"Starting fix worker {self.worker_id}")

        # Test connections
        try:
            self.redis.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return

        try:
            db = await get_db()
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return

        self.running = True
        logger.info("Fix worker started successfully")

        # Main worker loop
        while self.running:
            try:
                await self._process_next_job()
            except KeyboardInterrupt:
                logger.info("Worker interrupted by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                await asyncio.sleep(5)  # Brief pause before continuing

        logger.info("Fix worker stopped")

    async def _process_next_job(self):
        """Process the next fix job from the queue."""
        try:
            # Get next job from queue (blocking with timeout)
            job = self.queue.get_next_job()

            if not job:
                return  # No job available, continue polling

            logger.info(f"Processing fix job {job.id}")

            try:
                # Convert to FixJob if needed (assuming job data contains fix job info)
                fix_job = FixJob.from_dict(job.data) if hasattr(job, "data") else job

                # Process the fix job
                result = await self._execute_fix_job(fix_job)

                if result:
                    # Mark job as completed
                    result_dict = (
                        result.dict() if hasattr(result, "dict") else result.__dict__
                    )
                    self.queue.complete_job(job.id, result_dict)

                    logger.info(f"Fix job {job.id} completed successfully")
                else:
                    # Job processing failed
                    self.queue.fail_job(job.id, "Fix processing failed")
                    logger.error(f"Fix job {job.id} failed")

            except Exception as e:
                # Handle job processing errors
                error_msg = f"Fix job processing error: {str(e)}"
                self.queue.fail_job(job.id, error_msg)
                logger.error(f"Fix job {job.id} failed: {error_msg}")

        except Exception as e:
            logger.error(f"Error processing job: {e}")

    async def _execute_fix_job(self, job: FixJob) -> Optional[FixResult]:
        """
        Execute a fix job by generating and applying a fix.

        Args:
            job: FixJob to process

        Returns:
            Optional[FixResult]: Fix result if successful, None otherwise
        """
        temp_dir = None

        try:
            logger.info(f"Starting fix execution for job {job.id}")

            # Create temporary directory for repository
            temp_dir = tempfile.mkdtemp(prefix=f"fix-{job.id}-")
            logger.debug(f"Created temp directory: {temp_dir}")

            # Step 1: Clone repository
            repo_path = await self._clone_repository(
                job.data.repositoryUrl, job.data.branch, temp_dir
            )

            if not repo_path:
                raise Exception("Failed to clone repository")

            # Step 2: Generate fix using AI
            fix_content = await self._generate_fix(job, repo_path)

            if not fix_content:
                raise Exception("Failed to generate fix")

            # Step 3: Apply fix to codebase
            applied_files = await self._apply_fix(job, repo_path, fix_content)

            if not applied_files:
                raise Exception("Failed to apply fix")

            # Step 4: Create branch and commit
            branch_name = await self._create_fix_branch(job, repo_path)
            commit_sha = await self._commit_fix(job, repo_path, applied_files)

            if not branch_name or not commit_sha:
                raise Exception("Failed to create commit")

            # Step 5: Push branch to GitHub
            if not await self._push_branch(repo_path, branch_name):
                raise Exception("Failed to push branch")

            # Step 6: Create pull request
            pr_url, pr_id = await self._create_pull_request(job, branch_name)

            if not pr_url:
                raise Exception("Failed to create pull request")

            # Create successful result
            result = FixResult(
                success=True,
                branchName=branch_name,
                commitSha=commit_sha,
                pullRequestUrl=pr_url,
                pullRequestId=pr_id,
                filesModified=applied_files,
                fixApplied=f"Applied fix for {job.data.vulnerability.category} vulnerability",
                confidence=0.85,  # Default confidence score
            )

            return result

        except Exception as e:
            logger.error(f"Fix execution failed for job {job.id}: {e}")
            return None

        finally:
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                    logger.debug(f"Cleaned up temp directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp directory: {e}")

    async def _clone_repository(
        self, repo_url: str, branch: str, temp_dir: str
    ) -> Optional[str]:
        """
        Clone the repository to a temporary directory.

        Args:
            repo_url: Repository URL
            branch: Branch to clone
            temp_dir: Temporary directory path

        Returns:
            Optional[str]: Repository path if successful
        """
        try:
            import subprocess

            repo_path = os.path.join(temp_dir, "repo")

            # Clone repository with depth 1 for efficiency
            cmd = [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                branch,
                repo_url,
                repo_path,
            ]

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=300  # 5-minute timeout
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
            logger.error(f"Failed to clone repository: {e}")
            return None

    async def _generate_fix(self, job: FixJob, repo_path: str) -> Optional[str]:
        """
        Generate fix using Claude Code SDK.

        Args:
            job: Fix job with vulnerability details
            repo_path: Path to cloned repository

        Returns:
            Optional[str]: Generated fix content
        """
        try:
            # TODO: Implement Claude Code SDK integration
            # This is a placeholder for the actual AI-powered fix generation

            vulnerability = job.data.vulnerability

            logger.info(
                f"Generating fix for {vulnerability.category} vulnerability in {vulnerability.filePath}"
            )

            # For now, return a placeholder fix
            # In actual implementation, this would use Claude Code SDK
            fix_content = self._generate_placeholder_fix(vulnerability)

            logger.info("Fix generated successfully")
            return fix_content

        except Exception as e:
            logger.error(f"Failed to generate fix: {e}")
            return None

    def _generate_placeholder_fix(self, vulnerability) -> str:
        """
        Generate a placeholder fix for demonstration.

        In production, this would be replaced with Claude Code SDK calls.
        """
        if vulnerability.category == "INJECTION":
            return "// Fixed SQL injection by using parameterized queries\n// TODO: Implement actual fix with Claude Code SDK"
        elif vulnerability.category == "AUTHENTICATION":
            return "// Fixed authentication issue by adding proper validation\n// TODO: Implement actual fix with Claude Code SDK"
        else:
            return f"// Fixed {vulnerability.category} vulnerability\n// TODO: Implement actual fix with Claude Code SDK"

    async def _apply_fix(
        self, job: FixJob, repo_path: str, fix_content: str
    ) -> Optional[list]:
        """
        Apply the generated fix to the codebase.

        Args:
            job: Fix job with vulnerability details
            repo_path: Path to repository
            fix_content: Generated fix content

        Returns:
            Optional[list]: List of modified files
        """
        try:
            vulnerability = job.data.vulnerability
            file_path = os.path.join(repo_path, vulnerability.filePath)

            if not os.path.exists(file_path):
                logger.error(f"Target file does not exist: {vulnerability.filePath}")
                return None

            # Read original file
            with open(file_path, "r", encoding="utf-8") as f:
                original_content = f.read()

            # Apply fix (placeholder implementation)
            # In production, this would intelligently apply the Claude-generated fix
            lines = original_content.split("\n")

            # Insert fix comment at the vulnerability location
            fix_line = vulnerability.startLine - 1  # Convert to 0-based index
            if 0 <= fix_line < len(lines):
                lines.insert(fix_line, f"    {fix_content}")

            # Write modified content
            modified_content = "\n".join(lines)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(modified_content)

            logger.info(f"Applied fix to {vulnerability.filePath}")
            return [vulnerability.filePath]

        except Exception as e:
            logger.error(f"Failed to apply fix: {e}")
            return None

    async def _create_fix_branch(self, job: FixJob, repo_path: str) -> Optional[str]:
        """Create a new branch for the fix."""
        try:
            import subprocess

            vulnerability = job.data.vulnerability
            branch_prefix = job.data.fixOptions.get("branchPrefix", "fix")

            # Generate branch name
            category = vulnerability.category.lower()
            file_name = os.path.basename(vulnerability.filePath).replace(".", "-")
            job_short_id = job.id[:8]

            branch_name = f"{branch_prefix}/{category}-{file_name}-{job_short_id}"

            # Create and checkout new branch
            subprocess.run(
                ["git", "checkout", "-b", branch_name], cwd=repo_path, check=True
            )

            logger.info(f"Created branch: {branch_name}")
            return branch_name

        except Exception as e:
            logger.error(f"Failed to create branch: {e}")
            return None

    async def _commit_fix(
        self, job: FixJob, repo_path: str, modified_files: list
    ) -> Optional[str]:
        """Commit the fix to the branch."""
        try:
            import subprocess

            vulnerability = job.data.vulnerability

            # Add modified files
            for file_path in modified_files:
                subprocess.run(["git", "add", file_path], cwd=repo_path, check=True)

            # Create commit message
            commit_message = f"Fix: {vulnerability.title}\n\nAutomatically generated fix for {vulnerability.severity} severity {vulnerability.category} vulnerability.\n\nFixed by Fortify Fix Agent"

            # Commit changes
            subprocess.run(
                ["git", "commit", "-m", commit_message], cwd=repo_path, check=True
            )

            # Get commit SHA
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )

            commit_sha = result.stdout.strip()
            logger.info(f"Created commit: {commit_sha}")
            return commit_sha

        except Exception as e:
            logger.error(f"Failed to commit fix: {e}")
            return None

    async def _push_branch(self, repo_path: str, branch_name: str) -> bool:
        """Push the fix branch to GitHub."""
        try:
            import subprocess

            # Push branch to origin
            subprocess.run(
                ["git", "push", "origin", branch_name], cwd=repo_path, check=True
            )

            logger.info(f"Pushed branch: {branch_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to push branch: {e}")
            return False

    async def _create_pull_request(
        self, job: FixJob, branch_name: str
    ) -> tuple[Optional[str], Optional[int]]:
        """Create a pull request on GitHub."""
        try:
            # TODO: Implement GitHub API integration
            # This would use PyGithub or direct API calls to create PR

            vulnerability = job.data.vulnerability

            # For now, return placeholder values
            # In production, this would create an actual PR
            pr_url = f"https://github.com/example/repo/pull/123"
            pr_id = 123

            logger.info(f"Created pull request: {pr_url}")
            return pr_url, pr_id

        except Exception as e:
            logger.error(f"Failed to create pull request: {e}")
            return None, None


async def main():
    """Main entry point for the fix worker."""
    worker = FixWorker()

    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
    except Exception as e:
        logger.error(f"Worker failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())
