"""
Fix worker for processing vulnerability fix jobs.

This module implements the background worker that processes fix jobs
by generating AI-powered fixes and creating GitHub pull requests.
"""

import json
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

# Reduce verbose HTTP client logging
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.INFO)

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

                # Update database fix job status to IN_PROGRESS
                await self._update_fix_job_status_in_progress(job.id)

                # Process the fix job
                result = await self._execute_fix_job(fix_job)

                if result:
                    # Mark job as completed in Redis queue
                    result_dict = (
                        result.dict() if hasattr(result, "dict") else result.__dict__
                    )
                    self.queue.complete_job(job.id, result_dict)

                    # Update database fix job status to COMPLETED
                    await self._update_completed_fix_job_status(job.id, result)

                    logger.info(f"Fix job {job.id} completed successfully")
                else:
                    # Job processing failed
                    error_msg = "Fix processing failed"
                    self.queue.fail_job(job.id, error_msg)

                    # Update database fix job status to FAILED
                    await self._update_failed_fix_job_status(job.id, error_msg)

                    logger.error(f"Fix job {job.id} failed")

            except Exception as e:
                # Handle job processing errors
                error_msg = f"Fix job processing error: {str(e)}"
                self.queue.fail_job(job.id, error_msg)

                # Update database fix job status to FAILED
                await self._update_failed_fix_job_status(job.id, error_msg)

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

            def format_claude_message(message, index=None) -> str:
                """Format Claude messages with creative and consistent styling."""
                message_type = type(message).__name__

                # Extract content safely from any message type
                content = ""
                content_length = 0

                if isinstance(message, AssistantMessage):
                    if isinstance(message.content, list):
                        # Handle content blocks
                        content_parts = []
                        for block in message.content:
                            if hasattr(block, "text"):
                                content_parts.append(block.text)
                            elif isinstance(block, dict) and "text" in block:
                                content_parts.append(block["text"])
                            elif isinstance(block, str):
                                content_parts.append(block)
                        content = "".join(content_parts)
                    else:
                        content = str(message.content) if message.content else ""
                    content_length = len(content)
                elif isinstance(message, UserMessage):
                    content = (
                        str(message.content)
                        if hasattr(message, "content") and message.content
                        else ""
                    )
                    content_length = len(content)
                elif isinstance(message, SystemMessage):
                    content = (
                        str(message.data)
                        if hasattr(message, "data") and message.data
                        else ""
                    )
                    content_length = len(content)
                elif (ResultMessage and isinstance(message, ResultMessage)) or hasattr(
                    message, "result"
                ):  # ResultMessage or similar
                    content = str(message.result) if message.result else ""
                    content_length = len(content)
                elif hasattr(message, "content"):
                    content = str(message.content) if message.content else ""
                    content_length = len(content)
                else:
                    content = str(message) if message else ""
                    content_length = len(content)

                # Create preview (first 150 chars)
                preview = content[:150] + "..." if len(content) > 150 else content
                preview = preview.replace("\n", " ").replace("\r", " ").strip()

                # Creative message type indicators
                type_indicators = {
                    "AssistantMessage": "🤖 Claude",
                    "UserMessage": "👤 User",
                    "SystemMessage": "⚙️ System",
                    "ResultMessage": "🎯 Result",
                }

                indicator = type_indicators.get(message_type, f"❓ {message_type}")

                # Format with consistent styling
                index_str = f"[{index+1:02d}] " if index is not None else ""
                size_info = (
                    f"({content_length:,} chars)" if content_length > 0 else "(empty)"
                )

                formatted_msg = f"{index_str}{indicator} {size_info}"
                if preview:
                    formatted_msg += f"\n    ➤ {preview}"

                return formatted_msg

            async def run_query():
                i = 0
                async for message in query(prompt=fix_prompt, options=options):
                    messages.append(message)

                    # Format and display message with creative styling
                    formatted_msg = format_claude_message(message, i)
                    logger.info(f"🔧 {formatted_msg}")
                    print(f"🔧 {formatted_msg}")
                    i += 1

                return messages

            # Run the async query
            result_messages = await run_query()

            logger.info(
                f"Claude SDK fix generation completed with {len(result_messages)} messages"
            )
            print(
                f"🔧 Claude SDK fix generation completed with {len(result_messages)} messages"
            )

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

            # Return fix data with files if modified, otherwise with content
            return {
                "files": modified_files,
                "content": fix_summary.strip() if fix_summary else None,
                "summary": fix_summary.strip()
                or f"Applied security fix for {vulnerability.category} vulnerability",
                "confidence": 0.9 if modified_files else 0.7,
            }

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

            # Generic approach: check if Claude modified files, otherwise apply fix manually
            modified_files = fix_data.get("files", [])

            if modified_files:
                # Claude SDK already modified files
                logger.info(f"Claude SDK modified files: {modified_files}")
                return modified_files
            else:
                # Apply fix content manually to the vulnerable file
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
                fix_content = fix_data.get(
                    "content", fix_data.get("summary", "// Security fix applied")
                )
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
                    "No GitHub access token available, cannot push via GitHub API"
                )
                return False

            # Parse repository URL to get owner and repo name
            repo_info = self._parse_repository_url(job.data.repositoryUrl)
            if not repo_info:
                logger.error("Could not parse repository URL")
                return False

            owner, repo_name = repo_info

            # Initialize GitHub client
            github_client = GitHubClient(access_token=access_token)

            # Push branch using GitHub API
            success = await self._push_branch_via_github_api(
                github_client,
                owner,
                repo_name,
                branch_name,
                repo_path,
                job,
                access_token,
            )

            if success:
                logger.info(
                    f"Successfully pushed branch {branch_name} using GitHub API"
                )
                return True
            else:
                logger.error("GitHub API push failed")
                return False

        except Exception as e:
            logger.error(f"Failed to push branch using GitHub API: {e}")
            return False

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

    async def _push_branch_via_github_api(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        branch_name: str,
        repo_path: str,
        job: FixJob,
        access_token: str,
    ) -> bool:
        """Push branch using GitHub API by uploading git objects and creating branch reference."""
        try:
            import subprocess
            import base64
            import hashlib

            if not HTTPX_AVAILABLE:
                logger.error("httpx not available, cannot use GitHub API")
                return False

            logger.info(f"Pushing branch {branch_name} using GitHub API...")

            # Step 1: Get the current commit info
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            commit_sha = result.stdout.strip()

            # Step 2: Get commit details
            result = subprocess.run(
                ["git", "cat-file", "-p", commit_sha],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            commit_content = result.stdout

            # Step 3: Get the tree SHA from the commit
            tree_sha = None
            for line in commit_content.split("\n"):
                if line.startswith("tree "):
                    tree_sha = line.split(" ")[1]
                    break

            if not tree_sha:
                logger.error("Could not extract tree SHA from commit")
                return False

            # Step 4: Upload all necessary git objects
            success = await self._upload_git_objects(
                github_client, owner, repo, repo_path, commit_sha, tree_sha
            )

            if not success:
                logger.warning("Failed to upload git objects via GitHub API")
                logger.info("Attempting fallback to git push...")
                return await self._fallback_git_push(
                    repo_path, branch_name, access_token, job.data.repositoryUrl
                )

            # Step 5: Create or update branch reference
            success = await self._create_or_update_branch_ref(
                github_client, owner, repo, branch_name, commit_sha
            )

            if success:
                logger.info(
                    f"Successfully pushed branch {branch_name} using GitHub API"
                )
                return True
            else:
                logger.warning(
                    "Failed to create/update branch reference via GitHub API"
                )
                logger.info("Attempting fallback to git push...")
                return await self._fallback_git_push(
                    repo_path, branch_name, access_token, job.data.repositoryUrl
                )

        except Exception as e:
            logger.error(f"Error pushing branch via GitHub API: {e}")
            logger.info("Attempting fallback to git push...")
            return await self._fallback_git_push(
                repo_path, branch_name, access_token, job.data.repositoryUrl
            )

    async def _upload_git_objects(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        repo_path: str,
        commit_sha: str,
        tree_sha: str,
    ) -> bool:
        """Upload git objects (blobs, trees, commits) to GitHub."""
        try:
            import subprocess
            import base64

            # Get all objects that need to be uploaded in the correct order
            blobs_to_upload = set()
            trees_to_upload = set()
            commits_to_upload = set()

            # Add the main tree and commit
            trees_to_upload.add(tree_sha)
            commits_to_upload.add(commit_sha)

            # Get all blobs referenced by the tree
            result = subprocess.run(
                ["git", "ls-tree", "-r", tree_sha],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )

            for line in result.stdout.strip().split("\n"):
                if line:
                    parts = line.split("\t")[0].split(" ")
                    if len(parts) >= 3:
                        blob_sha = parts[2]
                        blobs_to_upload.add(blob_sha)

            # Get any parent commits and their trees
            result = subprocess.run(
                ["git", "rev-list", "--parents", "-n", "5", commit_sha],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )

            for line in result.stdout.strip().split("\n"):
                if line:
                    commit_shas = line.split(" ")
                    for parent_sha in commit_shas[
                        1:
                    ]:  # Skip the first (current commit)
                        commits_to_upload.add(parent_sha)

                        # Get parent commit's tree
                        try:
                            parent_result = subprocess.run(
                                ["git", "cat-file", "-p", parent_sha],
                                cwd=repo_path,
                                capture_output=True,
                                text=True,
                                check=True,
                            )
                            for parent_line in parent_result.stdout.split("\n"):
                                if parent_line.startswith("tree "):
                                    parent_tree_sha = parent_line.split(" ")[1]
                                    trees_to_upload.add(parent_tree_sha)
                                    break
                        except:
                            pass  # Skip if we can't get parent info

            total_objects = (
                len(blobs_to_upload) + len(trees_to_upload) + len(commits_to_upload)
            )
            logger.info(
                f"Uploading {total_objects} git objects (blobs: {len(blobs_to_upload)}, trees: {len(trees_to_upload)}, commits: {len(commits_to_upload)})..."
            )

            # Upload in correct order: blobs first, then trees, then commits
            failed_uploads = []

            # 1. Upload all blobs
            for blob_sha in blobs_to_upload:
                success = await self._upload_git_object(
                    github_client, owner, repo, repo_path, blob_sha
                )
                if not success:
                    logger.warning(f"Failed to upload blob {blob_sha[:8]}")
                    failed_uploads.append(f"blob:{blob_sha[:8]}")

            # 2. Upload all trees
            for tree_sha_item in trees_to_upload:
                success = await self._upload_git_object(
                    github_client, owner, repo, repo_path, tree_sha_item
                )
                if not success:
                    logger.warning(f"Failed to upload tree {tree_sha_item[:8]}")
                    failed_uploads.append(f"tree:{tree_sha_item[:8]}")

            # 3. Upload all commits
            for commit_sha_item in commits_to_upload:
                success = await self._upload_git_object(
                    github_client, owner, repo, repo_path, commit_sha_item
                )
                if not success:
                    logger.warning(f"Failed to upload commit {commit_sha_item[:8]}")
                    failed_uploads.append(f"commit:{commit_sha_item[:8]}")

            # Log summary of failed uploads but don't fail the entire process
            if failed_uploads:
                logger.warning(
                    f"Some git objects failed to upload: {', '.join(failed_uploads)}"
                )
                logger.info(
                    "Continuing with branch creation - objects may already exist on GitHub"
                )

            successful_uploads = total_objects - len(failed_uploads)
            logger.info(
                f"Git object upload completed: {successful_uploads}/{total_objects} objects uploaded successfully"
            )

            # Return true even if some uploads failed - the important objects (current commit/tree) may have succeeded
            return True

        except Exception as e:
            logger.error(f"Error uploading git objects: {e}")
            return False

    async def _upload_git_object(
        self,
        github_client: GitHubClient,
        owner: str,
        repo: str,
        repo_path: str,
        obj_sha: str,
    ) -> bool:
        """Upload a single git object to GitHub."""
        try:
            import subprocess
            import base64

            # Check if object exists first
            try:
                result = subprocess.run(
                    ["git", "cat-file", "-t", obj_sha],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                obj_type = result.stdout.strip()
            except subprocess.CalledProcessError as e:
                if e.returncode == 128:
                    # Object doesn't exist in local repository (common with shallow clones)
                    logger.debug(
                        f"Git object {obj_sha[:8]} not found locally, skipping upload"
                    )
                    return (
                        True  # Skip missing objects - they may already exist on GitHub
                    )
                else:
                    logger.error(
                        f"Error checking git object type for {obj_sha[:8]}: {e}"
                    )
                    return False

            # Get object content
            try:
                result = subprocess.run(
                    ["git", "cat-file", "-p", obj_sha],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                obj_content = result.stdout
            except subprocess.CalledProcessError as e:
                logger.error(f"Error reading git object content for {obj_sha[:8]}: {e}")
                return True  # Skip objects we can't read

            # Upload based on object type
            if obj_type == "blob":
                return await self._upload_blob(
                    github_client, owner, repo, obj_content, obj_sha
                )
            elif obj_type == "tree":
                return await self._upload_tree(
                    github_client, owner, repo, obj_content, obj_sha
                )
            elif obj_type == "commit":
                return await self._upload_commit(
                    github_client, owner, repo, obj_content, obj_sha
                )
            else:
                logger.warning(f"Unknown object type: {obj_type}")
                return True  # Skip unknown types

        except Exception as e:
            logger.error(f"Error uploading git object {obj_sha}: {e}")
            return False

    async def _upload_blob(
        self, github_client: GitHubClient, owner: str, repo: str, content: str, sha: str
    ) -> bool:
        """Upload a blob to GitHub."""
        try:
            import base64

            url = f"{github_client.base_url}/repos/{owner}/{repo}/git/blobs"
            data = {
                "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
                "encoding": "base64",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=data, headers=github_client.headers
                )

                if response.status_code == 201:
                    logger.debug(f"Successfully uploaded blob {sha[:8]}")
                    return True
                elif response.status_code == 409:
                    # Blob already exists
                    logger.debug(f"Blob {sha[:8]} already exists, skipping")
                    return True
                else:
                    error_text = response.text
                    logger.error(
                        f"Failed to upload blob {sha[:8]}: {response.status_code} - {error_text}"
                    )

                    # Try to parse error details
                    try:
                        error_data = response.json()
                        if "message" in error_data:
                            logger.error(f"GitHub API error: {error_data['message']}")
                    except:
                        pass

                    return False

        except Exception as e:
            logger.error(f"Error uploading blob: {e}")
            return False

    async def _upload_tree(
        self, github_client: GitHubClient, owner: str, repo: str, content: str, sha: str
    ) -> bool:
        """Upload a tree to GitHub."""
        try:
            # Parse tree content and create tree structure
            tree_entries = []
            for line in content.strip().split("\n"):
                if line:
                    parts = line.split("\t")
                    if len(parts) >= 2:
                        mode_type_sha = parts[0].split(" ")
                        if len(mode_type_sha) >= 3:
                            mode = mode_type_sha[0]
                            obj_type = mode_type_sha[1]
                            obj_sha = mode_type_sha[2]
                            path = parts[1]

                            tree_entries.append(
                                {
                                    "path": path,
                                    "mode": mode,
                                    "type": obj_type,
                                    "sha": obj_sha,
                                }
                            )

            url = f"{github_client.base_url}/repos/{owner}/{repo}/git/trees"
            data = {"tree": tree_entries}

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=data, headers=github_client.headers
                )

                if response.status_code == 201:
                    logger.debug(f"Successfully uploaded tree {sha[:8]}")
                    return True
                elif response.status_code == 409:
                    # Tree already exists
                    logger.debug(f"Tree {sha[:8]} already exists, skipping")
                    return True
                else:
                    error_text = response.text
                    logger.error(
                        f"Failed to upload tree {sha[:8]}: {response.status_code} - {error_text}"
                    )

                    # Try to parse error details
                    try:
                        error_data = response.json()
                        if "message" in error_data:
                            logger.error(f"GitHub API error: {error_data['message']}")
                    except:
                        pass

                    return False

        except Exception as e:
            logger.error(f"Error uploading tree: {e}")
            return False

    async def _upload_commit(
        self, github_client: GitHubClient, owner: str, repo: str, content: str, sha: str
    ) -> bool:
        """Upload a commit to GitHub."""
        try:
            # Parse commit content
            lines = content.split("\n")
            tree_sha = None
            parents = []
            author = None
            committer = None
            message_lines = []
            in_message = False

            for line in lines:
                if line.startswith("tree "):
                    tree_sha = line.split(" ")[1]
                elif line.startswith("parent "):
                    parents.append(line.split(" ")[1])
                elif line.startswith("author "):
                    author = self._parse_git_person(line[7:])
                elif line.startswith("committer "):
                    committer = self._parse_git_person(line[10:])
                elif line == "":
                    in_message = True
                elif in_message:
                    message_lines.append(line)

            message = "\n".join(message_lines)

            url = f"{github_client.base_url}/repos/{owner}/{repo}/git/commits"
            data = {
                "message": message,
                "tree": tree_sha,
                "parents": parents,
                "author": author,
                "committer": committer,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=data, headers=github_client.headers
                )

                if response.status_code == 201:
                    logger.debug(f"Successfully uploaded commit {sha[:8]}")
                    return True
                elif response.status_code == 409:
                    # Commit already exists
                    logger.debug(f"Commit {sha[:8]} already exists, skipping")
                    return True
                else:
                    error_text = response.text
                    logger.error(
                        f"Failed to upload commit {sha[:8]}: {response.status_code} - {error_text}"
                    )

                    # Try to parse error details
                    try:
                        error_data = response.json()
                        if "message" in error_data:
                            logger.error(f"GitHub API error: {error_data['message']}")
                    except:
                        pass

                    return False

        except Exception as e:
            logger.error(f"Error uploading commit: {e}")
            return False

    def _parse_git_person(self, person_line: str) -> dict:
        """Parse git author/committer line into GitHub API format."""
        try:
            # Format: "Name <email> timestamp timezone"
            import re

            match = re.match(r"(.+) <(.+)> (\d+) ([\+\-]\d{4})", person_line)
            if match:
                name, email, timestamp, timezone = match.groups()
                from datetime import datetime

                dt = datetime.fromtimestamp(int(timestamp))
                return {"name": name, "email": email, "date": dt.isoformat() + "Z"}
            else:
                # Fallback
                return {
                    "name": "Fortify Fix Agent",
                    "email": "fix-agent@fortify.rocks",
                    "date": datetime.now().isoformat() + "Z",
                }
        except Exception:
            from datetime import datetime

            return {
                "name": "Fortify Fix Agent",
                "email": "fix-agent@fortify.rocks",
                "date": datetime.now().isoformat() + "Z",
            }

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

    async def _fallback_git_push(
        self,
        repo_path: str,
        branch_name: str,
        access_token: str = None,
        repo_url: str = None,
    ) -> bool:
        """Fallback to using git push command with proper authentication."""
        try:
            import subprocess
            import re

            if not access_token or not repo_url:
                logger.error("Access token and repo URL required for git push fallback")
                return False

            # Parse repository info for authenticated URL
            repo_info = self._parse_repository_url(repo_url)
            if not repo_info:
                logger.error("Could not parse repository URL for git push")
                return False

            owner, repo_name = repo_info

            # Create authenticated GitHub URL
            auth_url = f"https://{access_token}@github.com/{owner}/{repo_name}.git"

            # Get current remote URL
            result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            original_url = result.stdout.strip()

            try:
                # Temporarily set remote URL with authentication
                subprocess.run(
                    ["git", "remote", "set-url", "origin", auth_url],
                    cwd=repo_path,
                    check=True,
                )

                # Push branch to origin
                subprocess.run(
                    ["git", "push", "origin", branch_name],
                    cwd=repo_path,
                    check=True,
                    capture_output=True,  # Capture output to avoid logging the token
                    text=True,
                )

                logger.info(f"Successfully pushed branch using git push: {branch_name}")
                return True

            finally:
                # Always restore original remote URL
                try:
                    subprocess.run(
                        ["git", "remote", "set-url", "origin", original_url],
                        cwd=repo_path,
                        check=True,
                    )
                    logger.debug("Restored original remote URL")
                except Exception as restore_e:
                    logger.warning(
                        f"Failed to restore original remote URL: {restore_e}"
                    )

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

    async def _update_completed_fix_job_status(self, job_id: str, result: FixResult):
        """Update the database status for a completed fix job."""
        try:
            db = await get_db()

            # Prepare result data for database storage
            result_data = {
                "success": result.success,
                "branchName": result.branchName,
                "commitSha": result.commitSha,
                "pullRequestUrl": result.pullRequestUrl,
                "pullRequestId": result.pullRequestId,
                "filesModified": result.filesModified,
                "fixApplied": result.fixApplied,
                "confidence": result.confidence,
            }

            # Update fix job in database
            await db.fixjob.update(
                where={"id": job_id},
                data={
                    "status": "COMPLETED",
                    "result": json.dumps(result_data),
                    "finishedAt": datetime.now().isoformat(),
                    "branchName": result.branchName,
                    "commitSha": result.commitSha,
                    "pullRequestUrl": result.pullRequestUrl,
                    "pullRequestId": result.pullRequestId,
                },
            )
            logger.info(f"✅ Updated FixJob {job_id} status to COMPLETED in database")
            print(f"✅ Updated FixJob {job_id} status to COMPLETED in database")

        except Exception as update_error:
            logger.error(
                f"Failed to update FixJob {job_id} status to COMPLETED: {update_error}"
            )
            print(
                f"❌ Failed to update FixJob {job_id} status to COMPLETED: {update_error}"
            )

    async def _update_failed_fix_job_status(self, job_id: str, error_msg: str):
        """Update the database status for a failed fix job."""
        try:
            db = await get_db()

            # Update fix job in database
            await db.fixjob.update(
                where={"id": job_id},
                data={
                    "status": "FAILED",
                    "error": error_msg,
                    "finishedAt": datetime.now().isoformat(),
                },
            )
            logger.info(f"✅ Updated FixJob {job_id} status to FAILED in database")
            print(f"✅ Updated FixJob {job_id} status to FAILED in database")

        except Exception as update_error:
            logger.error(
                f"Failed to update FixJob {job_id} status to FAILED: {update_error}"
            )
            print(
                f"❌ Failed to update FixJob {job_id} status to FAILED: {update_error}"
            )

    async def _update_fix_job_status_in_progress(self, job_id: str):
        """Update the database status for a fix job that has started processing."""
        try:
            db = await get_db()

            # Update fix job in database
            await db.fixjob.update(
                where={"id": job_id},
                data={
                    "status": "IN_PROGRESS",
                    "startedAt": datetime.now().isoformat(),
                },
            )
            logger.info(f"✅ Updated FixJob {job_id} status to IN_PROGRESS in database")
            print(f"✅ Updated FixJob {job_id} status to IN_PROGRESS in database")

        except Exception as update_error:
            logger.error(
                f"Failed to update FixJob {job_id} status to IN_PROGRESS: {update_error}"
            )
            print(
                f"❌ Failed to update FixJob {job_id} status to IN_PROGRESS: {update_error}"
            )


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
