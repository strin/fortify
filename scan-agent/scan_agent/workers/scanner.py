"""Background worker for vulnerability scanning."""

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
import anyio
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
    from claude_code_sdk.types import AssistantMessage, SystemMessage

    CLAUDE_SDK_AVAILABLE = True
    logger.info("Claude Code SDK imported successfully")
except ImportError as e:
    CLAUDE_SDK_AVAILABLE = False
    logger.error(f"Failed to import Claude Code SDK: {e}")
    logger.error("Please install claude-code-sdk: pip install claude-code-sdk")

# Package imports

from scan_agent.models.job import Job, JobStatus, JobType, ScanJobData
from scan_agent.utils.queue import JobQueue
from scan_agent.utils.redis_client import redis_connection


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
            logger.info(
                f"Cloning repository {repo_url} (branch: {branch}) to {target_dir}"
            )
            print(
                f"🔄 Cloning repository {repo_url} (branch: {branch}) to {target_dir}"
            )

            # Clone the repository
            cmd = [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                branch,
                repo_url,
                target_dir,
            ]

            logger.debug(f"Git clone command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            logger.debug(f"Git clone return code: {result.returncode}")
            logger.debug(f"Git clone stdout: {result.stdout}")
            logger.debug(f"Git clone stderr: {result.stderr}")

            if result.returncode != 0:
                logger.error(f"Git clone failed with return code {result.returncode}")
                print(f"❌ Git clone failed: {result.stderr}")
                raise Exception(f"Git clone failed: {result.stderr}")

            logger.info("Repository cloned successfully")
            print("✅ Repository cloned successfully")
            return True
        except subprocess.TimeoutExpired:
            logger.error("Git clone timed out after 5 minutes")
            raise Exception("Git clone timed out after 5 minutes")
        except Exception as e:
            logger.error(f"Failed to clone repository: {str(e)}")
            raise Exception(f"Failed to clone repository: {str(e)}")

    def _run_claude_scan(
        self, repo_path: str, claude_cli_args: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run Claude Code SDK scan on the repository."""
        logger.info("=== ENTERING _run_claude_scan METHOD ===")
        print("🔍 DEBUG: Entering _run_claude_scan method")

        if not CLAUDE_SDK_AVAILABLE:
            error_msg = "Claude Code SDK is not available. Please install: pip install claude-code-sdk"
            logger.error(error_msg)
            print(f"❌ {error_msg}")
            raise Exception(error_msg)

        try:
            logger.info(f"Starting Claude Code SDK scan on {repo_path}")
            print(f"🤖 Starting Claude Code SDK scan on {repo_path}")
            print(f"🔍 DEBUG: CLAUDE_SDK_AVAILABLE = {CLAUDE_SDK_AVAILABLE}")
            print(f"🔍 DEBUG: repo_path = {repo_path}")
            print(f"🔍 DEBUG: claude_cli_args = {claude_cli_args}")

            # Define the security audit prompt
            prompt = """Audit my project for security issues: public Supabase endpoints, unsecured API routes, weak or missing access control, and improperly configured auth rules. Specifically: 
            1. Check if Supabase tables or RPC functions are publicly accessible without proper Row Level Security (RLS) or role-based permissions. 
            2. Confirm that users can't upgrade their own account privileges or delete/edit other users' data. 
            3. Ensure all write operations (POST, PUT, PATCH, DELETE) are protected by server-side auth and validation, not just client checks. 
            4. Identify any hardcoded secrets, misconfigured environment variables, or sensitive data leaks. 
            5. Generate a security checklist based on my current stack and suggest immediate high-priority fixes.
            
            Assume I want to go from a vibe-coded prototype to a real production-ready app. Refactor anything risky, and explain what you're doing as you go.
            
            Please provide your analysis in a structured format that includes:
            - A summary of findings
            - Specific vulnerabilities found with file locations
            - Risk level assessment (high/medium/low)
            - Recommended fixes for each issue"""

            # Configure Claude Code SDK options
            options = ClaudeCodeOptions(
                max_turns=3,
                system_prompt="You are a security auditor analyzing a code repository for vulnerabilities and security issues. Focus on identifying real security risks and provide actionable recommendations.",
                cwd=repo_path,
                allowed_tools=["Read", "Write", "Bash"],
                permission_mode="acceptEdits",
                model="claude-sonnet-4-20250514",
            )

            logger.debug(f"Claude SDK options: max_turns=3, cwd={repo_path}")
            logger.debug(f"Security audit prompt: {prompt[:200]}...")
            print(f"📝 Running Claude SDK with security audit prompt...")
            print(
                f"⚙️ Options: max_turns=3, model=claude-sonnet-4-20250514, cwd={repo_path}"
            )

            # Run the Claude Code SDK query
            logger.info("Executing Claude SDK query...")
            print("⏳ Executing Claude SDK query (this may take several minutes)...")

            # Use anyio to run the async query function
            messages = []

            async def run_query():
                async for message in query(prompt=prompt, options=options):
                    messages.append(message)
                    # Handle different message types properly
                    if isinstance(message, AssistantMessage):
                        logger.debug(
                            f"Received assistant message: {message.content[:100]}..."
                        )
                        print(
                            f"📨 Received assistant message from Claude ({len(message.content)} chars)"
                        )
                    elif isinstance(message, SystemMessage):
                        logger.debug(
                            f"Received system message with data: {str(message.data)[:100]}..."
                        )
                        print(f"📨 Received system message from Claude")
                    else:
                        logger.debug(
                            f"Received message of unknown type: {type(message)}"
                        )
                        print(f"📨 Received message of type: {type(message).__name__}")
                return messages

            # Run the async query
            result_messages = anyio.run(run_query)

            logger.info(f"Claude SDK completed with {len(result_messages)} messages")
            print(f"📊 Claude SDK completed with {len(result_messages)} messages")

            # Combine all message content
            full_response = ""
            for i, message in enumerate(result_messages):
                logger.info(f"=== CLAUDE SDK MESSAGE {i+1} ===")
                if isinstance(message, AssistantMessage):
                    # Handle both string and list content
                    if isinstance(message.content, list):
                        # Extract text from content blocks
                        content_text = ""
                        for block in message.content:
                            if hasattr(block, "text"):
                                content_text += block.text
                            elif isinstance(block, dict) and "text" in block:
                                content_text += block["text"]
                            elif isinstance(block, str):
                                content_text += block
                        logger.info(content_text)
                        full_response += content_text + "\n\n"
                    else:
                        # Handle string content
                        logger.info(message.content)
                        full_response += message.content + "\n\n"
                elif isinstance(message, SystemMessage):
                    logger.info(f"System message data: {message.data}")
                    full_response += f"System: {str(message.data)}\n\n"
                else:
                    logger.info(f"Unknown message type: {type(message)}")
                    full_response += (
                        f"Unknown message type: {type(message).__name__}\n\n"
                    )

            logger.info("=== END CLAUDE SDK OUTPUT ===")

            print("\n" + "=" * 60)
            print("🤖 CLAUDE SDK FULL OUTPUT:")
            print("=" * 60)
            print(full_response)
            print("=" * 60 + "\n")

            # Try to parse structured output or return as raw analysis
            try:
                # Look for JSON in the response
                start_idx = full_response.find("{")
                end_idx = full_response.rfind("}") + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = full_response[start_idx:end_idx]
                    logger.debug(f"Found JSON structure, attempting to parse...")
                    parsed_json = json.loads(json_str)
                    logger.info("Successfully parsed Claude SDK output as JSON")
                    print("✅ Successfully parsed Claude SDK output as JSON")
                    return parsed_json
                else:
                    # Return structured response with raw analysis
                    logger.info(
                        "No JSON found, returning structured response with raw analysis"
                    )
                    print("📋 Returning structured response with raw analysis")
                    return {
                        "analysis": full_response,
                        "summary": "Security audit completed using Claude Code SDK",
                        "risk_level": "unknown",  # Could be parsed from response
                        "vulnerabilities": [],  # Could be extracted from text
                        "recommendations": [],  # Could be extracted from text
                        "raw_output": full_response,
                    }

            except json.JSONDecodeError as json_error:
                logger.warning(f"JSON parsing failed: {json_error}")
                print(f"⚠️ JSON parsing failed: {json_error}")
                return {
                    "analysis": full_response,
                    "summary": "Security audit completed using Claude Code SDK (JSON parsing failed)",
                    "risk_level": "unknown",
                    "vulnerabilities": [],
                    "recommendations": [],
                    "raw_output": full_response,
                }

        except Exception as e:
            error_msg = f"Failed to run Claude SDK scan: {str(e)}"
            logger.error(error_msg, exc_info=True)
            print(f"❌ {error_msg}")
            raise Exception(error_msg)

    def _process_scan_job(self, job: Job) -> Dict[str, Any]:
        """Process a repository scan job."""
        logger.info(f"=== ENTERING _process_scan_job METHOD ===")
        print(f"🔍 DEBUG: Entering _process_scan_job method for job {job.id}")

        try:
            scan_data = ScanJobData.from_dict(job.data)
            logger.debug(f"Parsed scan data: {scan_data}")
            print(f"🔍 DEBUG: Parsed scan data successfully")
        except Exception as parse_error:
            logger.error(f"Failed to parse job data: {parse_error}", exc_info=True)
            print(f"❌ Failed to parse job data: {parse_error}")
            raise

        temp_dir = None

        try:
            logger.info(f"Starting to process scan job {job.id}")
            logger.debug(f"Job data: {job.data}")

            # Create temporary directory for cloning
            temp_dir = tempfile.mkdtemp(prefix="scan_")
            repo_path = os.path.join(temp_dir, "repo")

            logger.info(f"Created temporary directory: {temp_dir}")
            print(f"📁 Created temporary directory: {temp_dir}")
            print(f"🔍 Processing scan job {job.id} for {scan_data.repo_url}")
            print(f"🔍 DEBUG: temp_dir = {temp_dir}")
            print(f"🔍 DEBUG: repo_path = {repo_path}")

            # Step 1: Clone the repository
            logger.info("Step 1: Cloning repository")
            print(f"📥 Step 1: Cloning repository to {repo_path}...")
            self._clone_repository(scan_data.repo_url, scan_data.branch, repo_path)

            logger.info("✅ Repository cloning completed, proceeding to Claude scan")
            print("✅ Repository cloning completed, proceeding to Claude scan")

            # Step 2: Run Claude Code SDK scan
            logger.info("Step 2: Running Claude Code SDK scan")
            print("🤖 Step 2: Running vulnerability scan with Claude Code SDK...")

            # Add debug info about the repository
            try:
                repo_contents = os.listdir(repo_path)
                logger.debug(
                    f"Repository contents: {repo_contents[:10]}..."
                )  # Show first 10 items
                print(
                    f"🔍 DEBUG: Repository cloned successfully, contains {len(repo_contents)} items"
                )
            except Exception as list_error:
                logger.error(f"Could not list repository contents: {list_error}")
                print(f"⚠️ Could not list repository contents: {list_error}")

            try:
                logger.info("About to call _run_claude_scan method")
                print("🔍 DEBUG: About to call _run_claude_scan method")

                scan_results = self._run_claude_scan(
                    repo_path, scan_data.claude_cli_args
                )

                logger.info("Claude Code SDK scan completed successfully")
                print("✅ Claude Code SDK scan completed successfully")
            except Exception as scan_error:
                logger.error(
                    f"Claude Code SDK scan failed: {scan_error}", exc_info=True
                )
                print(f"❌ Claude Code SDK scan failed: {scan_error}")
                print(f"🔍 DEBUG: Exception type: {type(scan_error).__name__}")
                print(f"🔍 DEBUG: Exception args: {scan_error.args}")

                # Return partial result with error information
                scan_results = {
                    "error": str(scan_error),
                    "summary": "Scan failed due to Claude SDK error",
                    "risk_level": "unknown",
                    "exception_type": type(scan_error).__name__,
                }

            # Step 3: Process results
            logger.info("Step 3: Processing scan results")
            print("📊 Step 3: Processing scan results...")
            result = {
                "scan_completed_at": datetime.now().isoformat(),
                "repository": scan_data.repo_url,
                "branch": scan_data.branch,
                "results": scan_results,
            }

            # Print detailed scan results
            print("\n" + "=" * 80)
            print("📋 DETAILED SCAN RESULTS")
            print("=" * 80)
            print(f"Repository: {scan_data.repo_url}")
            print(f"Branch: {scan_data.branch}")
            print(f"Scan completed at: {result['scan_completed_at']}")
            print("\nScan Results:")
            if isinstance(scan_results, dict):
                for key, value in scan_results.items():
                    if key == "analysis" or key == "raw_output":
                        print(
                            f"{key}: {str(value)[:500]}..."
                            if len(str(value)) > 500
                            else f"{key}: {value}"
                        )
                    else:
                        print(f"{key}: {value}")
            else:
                print(f"Results: {scan_results}")
            print("=" * 80 + "\n")

            logger.info(f"Scan completed successfully for job {job.id}")
            logger.debug(f"Final result keys: {list(result.keys())}")
            logger.info("=== FINAL SCAN RESULT ===")
            logger.info(json.dumps(result, indent=2, default=str))
            logger.info("=== END FINAL SCAN RESULT ===")
            print(f"✅ Scan completed for job {job.id}")
            return result

        finally:
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                logger.info(f"Cleaning up temporary directory: {temp_dir}")
                print(f"🧹 Cleaning up temporary directory: {temp_dir}")
                shutil.rmtree(temp_dir)
            else:
                logger.debug("No temporary directory to clean up")

    def process_job(self, job: Job):
        """Process a single job."""
        try:
            logger.info(f"Starting job {job.id} of type {job.type.value}")
            print(f"🚀 Starting job {job.id} of type {job.type.value}")

            if job.type == JobType.SCAN_REPO:
                result = self._process_scan_job(job)

                # Mark job as completed and log the result
                self.job_queue.complete_job(job.id, result)
                logger.info(f"Job {job.id} completed successfully")
                print(f"🎉 Job {job.id} completed successfully")

                # Print a final summary
                print("\n" + "=" * 80)
                print("🎯 JOB COMPLETION SUMMARY")
                print("=" * 80)
                print(f"Job ID: {job.id}")
                print(f"Repository: {result.get('repository', 'Unknown')}")
                print(f"Branch: {result.get('branch', 'Unknown')}")
                print(f"Completed at: {result.get('scan_completed_at', 'Unknown')}")

                if "results" in result:
                    scan_results = result["results"]
                    if isinstance(scan_results, dict):
                        if "error" in scan_results:
                            print(f"❌ Scan failed: {scan_results['error']}")
                        else:
                            print(f"✅ Scan completed successfully")
                            if "summary" in scan_results:
                                print(f"Summary: {scan_results['summary']}")
                            if "risk_level" in scan_results:
                                print(f"Risk Level: {scan_results['risk_level']}")

                print("=" * 80 + "\n")

            else:
                raise Exception(f"Unknown job type: {job.type.value}")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Job {job.id} failed: {error_msg}", exc_info=True)
            print(f"❌ Job {job.id} failed: {error_msg}")
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
