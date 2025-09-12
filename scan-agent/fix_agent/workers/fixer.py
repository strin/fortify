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

# Optional dependencies
try:
    import anyio

    ANYIO_AVAILABLE = True
except ImportError:
    ANYIO_AVAILABLE = False

try:
    import httpx

    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

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
from scan_agent.utils.github_client import GitHubClient

# Claude Code SDK imports
try:
    from claude_code_sdk import query, ClaudeCodeOptions
    from claude_code_sdk.types import (
        AssistantMessage,
        SystemMessage,
        UserMessage,
        ResultMessage,
    )

    # Try to import ResultMessage, but handle if it doesn't exist
    try:
        from claude_code_sdk.types import ResultMessage
    except ImportError:
        ResultMessage = None
        logger.debug("ResultMessage not available in claude-code-sdk")

    CLAUDE_SDK_AVAILABLE = True
    logger.info("Claude Code SDK imported successfully")
except ImportError as e:
    CLAUDE_SDK_AVAILABLE = False
    logger.error(f"Failed to import Claude Code SDK: {e}")
    logger.error("Please install claude-code-sdk: pip install claude-code-sdk")


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
            fix_data = await self._generate_fix(job, repo_path)

            if not fix_data:
                raise Exception("Failed to generate fix")

            # Step 3: Apply fix to codebase
            applied_files = await self._apply_fix(job, repo_path, fix_data)

            if not applied_files:
                raise Exception("Failed to apply fix")

            # Step 4: Create branch and commit
            branch_name = await self._create_fix_branch(job, repo_path)
            commit_sha = await self._commit_fix(job, repo_path, applied_files)

            if not branch_name or not commit_sha:
                raise Exception("Failed to create commit")

            # Step 5: Push branch to GitHub
            if not await self._push_branch(job, repo_path, branch_name):
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
                fixApplied=fix_data.get(
                    "summary",
                    f"Applied fix for {job.data.vulnerability.category} vulnerability",
                ),
                confidence=fix_data.get("confidence", 0.85),
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

    async def _generate_fix(
        self, job: FixJob, repo_path: str
    ) -> Optional[Dict[str, Any]]:
        """
        Generate fix using Claude Code SDK.

        Args:
            job: Fix job with vulnerability details
            repo_path: Path to cloned repository

        Returns:
            Optional[Dict[str, Any]]: Generated fix with content and metadata
        """
        try:
            if not CLAUDE_SDK_AVAILABLE:
                logger.error(
                    "Claude Code SDK not available, falling back to placeholder"
                )
                return self._generate_placeholder_fix(job.data.vulnerability)

            vulnerability = job.data.vulnerability

            logger.info(
                f"Generating fix for {vulnerability.category} vulnerability in {vulnerability.filePath}"
            )

            # Create fix generation prompt
            fix_prompt = self._create_fix_prompt(vulnerability, repo_path)

            # Configure Claude Code SDK options
            options = ClaudeCodeOptions(
                max_turns=3,
                system_prompt="You are a security expert that generates precise code fixes for vulnerabilities. Focus on minimal, targeted changes that address the specific security issue without breaking functionality.",
                cwd=repo_path,
                allowed_tools=["Read", "Write"],
                permission_mode="acceptEdits",
                model="claude-sonnet-4-20250514",
            )

            logger.debug(f"Claude SDK options: max_turns=3, cwd={repo_path}")
            logger.info("Executing Claude SDK query for fix generation...")

            # Run the Claude Code SDK query
            if not ANYIO_AVAILABLE:
                logger.error("anyio not available, cannot run Claude SDK query")
                return self._generate_placeholder_fix(vulnerability)

            messages = []

            async def run_query():
                async for message in query(prompt=fix_prompt, options=options):
                    messages.append(message)
                return messages

            # Run the async query
            result_messages = await run_query()

            if result_messages:
                logger.info(f"Claude SDK returned {len(result_messages)} messages")

                # Extract fix information from Claude's response
                fix_data = self._extract_fix_from_messages(
                    result_messages, vulnerability
                )

                if fix_data:
                    logger.info("Fix generated successfully using Claude Code SDK")
                    return fix_data
                else:
                    logger.warning(
                        "No fix extracted from Claude response, using fallback"
                    )
                    return self._generate_placeholder_fix(vulnerability)
            else:
                logger.warning("No valid response from Claude SDK, using fallback")
                return self._generate_placeholder_fix(vulnerability)

        except Exception as e:
            logger.error(f"Failed to generate fix using Claude SDK: {e}")
            logger.info("Falling back to placeholder fix")
            return self._generate_placeholder_fix(job.data.vulnerability)

    def _create_fix_prompt(self, vulnerability, repo_path: str) -> str:
        """Create a detailed prompt for Claude to generate a fix."""
        return f"""I need you to generate a precise security fix for a vulnerability found in this codebase.

**Vulnerability Details:**
- Type: {vulnerability.category}
- Severity: {vulnerability.severity}
- File: {vulnerability.filePath}
- Lines: {vulnerability.startLine}-{vulnerability.endLine if hasattr(vulnerability, 'endLine') else vulnerability.startLine}
- Title: {vulnerability.title}
- Description: {vulnerability.description}

**Current vulnerable code:**
```
{vulnerability.codeSnippet if hasattr(vulnerability, 'codeSnippet') else 'Code snippet not available'}
```

**Instructions:**
1. First, read the vulnerable file to understand the context
2. Analyze the security vulnerability and understand the root cause
3. Generate a minimal, targeted fix that addresses the specific security issue
4. Apply the fix by modifying the vulnerable file
5. Ensure the fix doesn't break existing functionality
6. Write a summary of what was changed and why

**Focus areas for {vulnerability.category} vulnerabilities:**
{self._get_category_specific_guidance(vulnerability.category)}

Please start by reading the vulnerable file and then provide a secure fix."""

    def _get_category_specific_guidance(self, category: str) -> str:
        """Get category-specific guidance for fixes."""
        guidance = {
            "INJECTION": "Use parameterized queries, input validation, and proper escaping",
            "AUTHENTICATION": "Implement proper authentication checks, secure session management",
            "AUTHORIZATION": "Add proper access controls and permission checks",
            "CRYPTOGRAPHY": "Use secure cryptographic algorithms and proper key management",
            "DATA_EXPOSURE": "Remove sensitive data exposure and add proper access controls",
            "BUSINESS_LOGIC": "Fix logical flaws that could be exploited",
            "CONFIGURATION": "Secure configuration settings and remove hardcoded secrets",
            "DEPENDENCY": "Update vulnerable dependencies or add security patches",
            "INPUT_VALIDATION": "Add proper input validation and sanitization",
            "OUTPUT_ENCODING": "Implement proper output encoding to prevent XSS",
            "SESSION_MANAGEMENT": "Secure session handling and management",
        }
        return guidance.get(
            category, "Apply security best practices for this vulnerability type"
        )

    def _extract_fix_from_messages(
        self, messages, vulnerability
    ) -> Optional[Dict[str, Any]]:
        """Extract fix information from Claude's response messages."""
        try:
            # Look for file modifications in the messages
            modified_files = []
            fix_summary = ""

            def extract_message_content(message) -> str:
                """Extract content from any message type safely (based on scanner.py)."""
                if isinstance(message, AssistantMessage):
                    if isinstance(message.content, list):
                        content_parts = []
                        for block in message.content:
                            if hasattr(block, "text"):
                                content_parts.append(block.text)
                            elif isinstance(block, dict) and "text" in block:
                                content_parts.append(block["text"])
                            elif isinstance(block, str):
                                content_parts.append(block)
                        return "".join(content_parts)
                    else:
                        return str(message.content) if message.content else ""
                elif isinstance(message, UserMessage):
                    return (
                        str(message.content)
                        if hasattr(message, "content") and message.content
                        else ""
                    )
                elif isinstance(message, SystemMessage):
                    return (
                        str(message.data)
                        if hasattr(message, "data") and message.data
                        else ""
                    )
                elif (ResultMessage and isinstance(message, ResultMessage)) or hasattr(
                    message, "result"
                ):
                    return str(message.result) if message.result else ""
                elif hasattr(message, "content"):
                    return str(message.content) if message.content else ""
                else:
                    return str(message) if message else ""

            for message in messages:
                content = extract_message_content(message)

                # Extract fix summary from assistant messages
                if isinstance(message, AssistantMessage) and content:
                    # Look for fix-related content
                    if any(
                        keyword in content.lower()
                        for keyword in [
                            "fix",
                            "changed",
                            "modified",
                            "updated",
                            "applied",
                        ]
                    ):
                        fix_summary += content + "\n"

                # Check if any files were modified by looking for tool usage patterns
                if hasattr(message, "tool_calls"):
                    for tool_call in message.tool_calls:
                        if hasattr(tool_call, "name") and tool_call.name == "Write":
                            if hasattr(tool_call, "parameters"):
                                file_path = tool_call.parameters.get("file_path", "")
                                if file_path and file_path not in modified_files:
                                    modified_files.append(file_path)

                # Also check for file modifications mentioned in content
                if content and vulnerability.filePath in content:
                    # Look for indications that the file was modified
                    if any(
                        keyword in content.lower()
                        for keyword in ["wrote", "updated", "modified", "changed"]
                    ):
                        if vulnerability.filePath not in modified_files:
                            modified_files.append(vulnerability.filePath)

            # If we have file modifications, this is a successful fix
            if modified_files:
                return {
                    "type": "file_modification",
                    "files": modified_files,
                    "summary": fix_summary.strip()
                    or f"Applied security fix for {vulnerability.category} vulnerability",
                    "confidence": 0.9,
                }
            else:
                # Look for code snippets or recommendations in the response
                if fix_summary:
                    return {
                        "type": "code_suggestion",
                        "content": fix_summary.strip(),
                        "summary": f"Generated fix recommendation for {vulnerability.category} vulnerability",
                        "confidence": 0.7,
                    }

            return None

        except Exception as e:
            logger.error(f"Error extracting fix from messages: {e}")
            return None

    def _generate_placeholder_fix(self, vulnerability) -> Dict[str, Any]:
        """
        Generate a placeholder fix for demonstration.

        In production, this would be replaced with Claude Code SDK calls.
        """
        fix_templates = {
            "INJECTION": "Fixed SQL injection by using parameterized queries",
            "AUTHENTICATION": "Fixed authentication issue by adding proper validation",
            "AUTHORIZATION": "Fixed authorization bypass by adding proper access controls",
            "CRYPTOGRAPHY": "Fixed cryptographic issue by using secure algorithms",
            "DATA_EXPOSURE": "Fixed data exposure by removing sensitive information",
            "BUSINESS_LOGIC": "Fixed business logic vulnerability",
            "CONFIGURATION": "Fixed configuration security issue",
            "DEPENDENCY": "Fixed vulnerable dependency issue",
            "INPUT_VALIDATION": "Fixed input validation vulnerability",
            "OUTPUT_ENCODING": "Fixed output encoding issue to prevent XSS",
            "SESSION_MANAGEMENT": "Fixed session management vulnerability",
        }

        fix_content = fix_templates.get(
            vulnerability.category, f"Fixed {vulnerability.category} vulnerability"
        )

        return {
            "type": "placeholder",
            "content": f"// {fix_content}\n// TODO: This is a placeholder fix - actual implementation would use Claude Code SDK",
            "summary": fix_content,
            "confidence": 0.5,
        }

    async def _apply_fix(
        self, job: FixJob, repo_path: str, fix_data: Dict[str, Any]
    ) -> Optional[list]:
        """
        Apply the generated fix to the codebase.

        Args:
            job: Fix job with vulnerability details
            repo_path: Path to repository
            fix_data: Generated fix data with content and metadata

        Returns:
            Optional[list]: List of modified files
        """
        try:
            vulnerability = job.data.vulnerability

            # Handle different fix types
            if fix_data.get("type") == "file_modification":
                # Claude SDK already modified files
                modified_files = fix_data.get("files", [])
                logger.info(f"Claude SDK modified files: {modified_files}")
                return modified_files

            elif fix_data.get("type") in ["code_suggestion", "placeholder"]:
                # Need to apply the fix content manually
                file_path = os.path.join(repo_path, vulnerability.filePath)

                if not os.path.exists(file_path):
                    logger.error(
                        f"Target file does not exist: {vulnerability.filePath}"
                    )
                    return None

                # Read original file
                with open(file_path, "r", encoding="utf-8") as f:
                    original_content = f.read()

                # Apply fix content
                fix_content = fix_data.get("content", "")
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

            else:
                logger.error(f"Unknown fix type: {fix_data.get('type')}")
                return None

        except Exception as e:
            logger.error(f"Failed to apply fix: {e}")
            return None

    async def _create_fix_branch(self, job: FixJob, repo_path: str) -> Optional[str]:
        """Create a new branch for the fix."""
        try:
            import subprocess

            vulnerability = job.data.vulnerability
            branch_prefix = getattr(job.data.fixOptions, "branchPrefix", "fortify/fix")

            # Generate branch name with fortify prefix
            category = vulnerability.category.lower()
            file_name = os.path.basename(vulnerability.filePath).replace(".", "-")
            job_short_id = job.id[:8]

            # Ensure branch name starts with fortify/
            if not branch_prefix.startswith("fortify/"):
                branch_prefix = f"fortify/{branch_prefix}"

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

    async def _push_branch(self, job: FixJob, repo_path: str, branch_name: str) -> bool:
        """Push the fix branch to GitHub using GitHub API."""
        try:
            # Get GitHub access token from database
            access_token = await self._get_github_access_token(job)
            if not access_token:
                logger.error(
                    "No GitHub access token available, falling back to git push"
                )
                return await self._fallback_git_push(repo_path, branch_name)

            # Parse repository URL to get owner and repo name
            repo_info = self._parse_repository_url(job.data.repositoryUrl)
            if not repo_info:
                logger.error("Could not parse repository URL")
                return False

            owner, repo_name = repo_info

            # Get current commit SHA
            import subprocess

            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            commit_sha = result.stdout.strip()

            # Initialize GitHub client
            github_client = GitHubClient(access_token=access_token)

            # Create or update branch reference using GitHub API
            success = await self._create_or_update_branch_ref(
                github_client, owner, repo_name, branch_name, commit_sha
            )

            if success:
                logger.info(
                    f"Successfully pushed branch {branch_name} using GitHub API"
                )
                return True
            else:
                logger.warning("GitHub API push failed, falling back to git push")
                return await self._fallback_git_push(repo_path, branch_name)

        except Exception as e:
            logger.error(f"Failed to push branch using GitHub API: {e}")
            logger.info("Falling back to git push")
            return await self._fallback_git_push(repo_path, branch_name)

    async def _get_github_access_token(self, job: FixJob) -> Optional[str]:
        """Get GitHub access token from database."""
        try:
            db = await get_db()

            # Get the fix job from database with user information
            fix_job_record = await db.fixjob.find_unique(
                where={"id": job.id}, include={"user": True}
            )

            if not fix_job_record or not fix_job_record.user:
                logger.warning("No user found for fix job")
                return None

            access_token = fix_job_record.user.githubAccessToken
            if not access_token:
                logger.warning("No GitHub access token found for user")
                return None

            return access_token

        except Exception as e:
            logger.error(f"Error getting GitHub access token: {e}")
            return None

    def _parse_repository_url(self, repo_url: str) -> Optional[tuple[str, str]]:
        """Parse repository URL to extract owner and repo name."""
        try:
            import re

            # Handle both HTTPS and SSH URLs
            # HTTPS: https://github.com/owner/repo.git
            # SSH: git@github.com:owner/repo.git

            if repo_url.startswith("https://github.com/"):
                match = re.match(
                    r"https://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", repo_url
                )
            elif repo_url.startswith("git@github.com:"):
                match = re.match(
                    r"git@github\.com:([^/]+)/([^/]+?)(?:\.git)?/?$", repo_url
                )
            else:
                logger.error(f"Unsupported repository URL format: {repo_url}")
                return None

            if match:
                owner, repo_name = match.groups()
                return owner, repo_name
            else:
                logger.error(f"Could not parse repository URL: {repo_url}")
                return None

        except Exception as e:
            logger.error(f"Error parsing repository URL: {e}")
            return None

    async def _create_or_update_branch_ref(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        branch_name: str,
        commit_sha: str,
    ) -> bool:
        """Create or update branch reference using GitHub API."""
        try:
            if not HTTPX_AVAILABLE:
                logger.error("httpx not available, cannot use GitHub API")
                return False

            # Try to create the branch reference
            ref_url = f"{github_client.base_url}/repos/{owner}/{repo}/git/refs"
            ref_data = {"ref": f"refs/heads/{branch_name}", "sha": commit_sha}

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    ref_url, json=ref_data, headers=github_client.headers
                )

                if response.status_code == 201:
                    logger.info(f"Created branch reference: {branch_name}")
                    return True
                elif response.status_code == 422:
                    # Branch already exists, try to update it
                    logger.info(f"Branch {branch_name} already exists, updating...")
                    return await self._update_branch_ref(
                        github_client, owner, repo, branch_name, commit_sha
                    )
                else:
                    logger.error(
                        f"Failed to create branch reference: {response.status_code} - {response.text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error creating branch reference: {e}")
            return False

    async def _update_branch_ref(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        branch_name: str,
        commit_sha: str,
    ) -> bool:
        """Update existing branch reference using GitHub API."""
        try:
            if not HTTPX_AVAILABLE:
                logger.error("httpx not available, cannot use GitHub API")
                return False

            # Update the branch reference
            ref_url = f"{github_client.base_url}/repos/{owner}/{repo}/git/refs/heads/{branch_name}"
            ref_data = {
                "sha": commit_sha,
                "force": True,  # Force update even if not fast-forward
            }

            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    ref_url, json=ref_data, headers=github_client.headers
                )

                if response.status_code == 200:
                    logger.info(f"Updated branch reference: {branch_name}")
                    return True
                else:
                    logger.error(
                        f"Failed to update branch reference: {response.status_code} - {response.text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error updating branch reference: {e}")
            return False

    async def _fallback_git_push(self, repo_path: str, branch_name: str) -> bool:
        """Fallback to using git push command."""
        try:
            import subprocess

            # Push branch to origin
            subprocess.run(
                ["git", "push", "origin", branch_name], cwd=repo_path, check=True
            )

            logger.info(f"Pushed branch using git push: {branch_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to push branch using git push: {e}")
            return False

    async def _create_pull_request(
        self, job: FixJob, branch_name: str
    ) -> tuple[Optional[str], Optional[int]]:
        """Create a pull request on GitHub using GitHub API."""
        try:
            # Get GitHub access token
            access_token = await self._get_github_access_token(job)
            if not access_token:
                logger.error("No GitHub access token available for PR creation")
                return None, None

            # Parse repository URL
            repo_info = self._parse_repository_url(job.data.repositoryUrl)
            if not repo_info:
                logger.error("Could not parse repository URL for PR creation")
                return None, None

            owner, repo_name = repo_info
            vulnerability = job.data.vulnerability

            # Initialize GitHub client
            github_client = GitHubClient(access_token=access_token)

            # Create PR title and body
            pr_title = f"Fix: {vulnerability.title}"
            pr_body = self._create_pr_description(vulnerability, job)

            # Create pull request using GitHub API
            pr_data = await self._create_github_pr(
                github_client,
                owner,
                repo_name,
                branch_name,
                job.data.branch,
                pr_title,
                pr_body,
            )

            if pr_data:
                pr_url = pr_data.get("html_url")
                pr_id = pr_data.get("number")
                logger.info(f"Created pull request: {pr_url} (#{pr_id})")
                return pr_url, pr_id
            else:
                logger.error("Failed to create pull request")
                return None, None

        except Exception as e:
            logger.error(f"Failed to create pull request: {e}")
            return None, None

    def _create_pr_description(self, vulnerability, job: FixJob) -> str:
        """Create a detailed pull request description."""
        description = f"""## 🔒 Security Fix: {vulnerability.category} Vulnerability

**Vulnerability Details:**
- **Severity:** {vulnerability.severity}
- **Category:** {vulnerability.category}
- **File:** `{vulnerability.filePath}`
- **Line:** {vulnerability.startLine}

**Description:**
{vulnerability.description}

**Fix Applied:**
This pull request contains an automated fix generated by Fortify's AI-powered security remediation system.

**What Changed:**
- Applied security fix to address the {vulnerability.category.lower()} vulnerability
- Maintained existing functionality while improving security posture

**Verification:**
Please review the changes and run your test suite to ensure the fix doesn't break existing functionality.

---

*🤖 This pull request was automatically generated by [Fortify Fix Agent](https://fortify.rocks)*
*Fix Job ID: `{job.id}`*
"""
        return description

    async def _create_github_pr(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        head_branch: str,
        base_branch: str,
        title: str,
        body: str,
    ) -> Optional[Dict[str, Any]]:
        """Create a pull request using GitHub API."""
        try:
            if not HTTPX_AVAILABLE:
                logger.error("httpx not available, cannot use GitHub API")
                return None

            pr_url = f"{github_client.base_url}/repos/{owner}/{repo}/pulls"
            pr_data = {
                "title": title,
                "body": body,
                "head": head_branch,
                "base": base_branch,
                "maintainer_can_modify": True,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    pr_url, json=pr_data, headers=github_client.headers
                )

                if response.status_code == 201:
                    pr_info = response.json()
                    logger.info(f"Successfully created PR #{pr_info.get('number')}")
                    return pr_info
                else:
                    error_text = response.text
                    logger.error(
                        f"Failed to create PR: {response.status_code} - {error_text}"
                    )

                    # Try to parse error details
                    try:
                        error_data = response.json()
                        if "errors" in error_data:
                            for error in error_data["errors"]:
                                logger.error(f"PR creation error: {error}")
                    except:
                        pass

                    return None

        except Exception as e:
            logger.error(f"Error creating GitHub PR: {e}")
            return None


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
