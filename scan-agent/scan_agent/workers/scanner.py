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

# Package imports

from scan_agent.models.job import Job, JobStatus, JobType, ScanJobData
from scan_agent.utils.queue import JobQueue
from scan_agent.utils.redis_client import redis_connection
from scan_agent.utils.database import get_db, init_database, close_database


def ensure_json_serializable(data: Any) -> Any:
    """
    Ensure data is JSON-serializable by converting to JSON and back.
    This handles datetime objects, complex objects, etc. by converting them to strings.
    
    Args:
        data: Any data structure that may contain non-serializable objects
        
    Returns:
        JSON-serializable version of the data
    """
    try:
        return json.loads(json.dumps(data, default=str))
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to serialize data to JSON: {e}")
        # Fallback: convert the entire structure to string
        return str(data)


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

    async def _run_claude_scan(
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

            # Define the security audit prompt for Claude Code
            prompt = """I need you to perform a comprehensive security audit of this codebase. Please:

1. **Explore the codebase** using the available tools to understand the structure and technology stack
2. **Identify security vulnerabilities** focusing on real, exploitable issues
3. **Create a vulnerability report** by writing a file called `vulnerability_report.json` with your findings

The vulnerability report should be a JSON array with this exact structure:

```json
[
  {
    "title": "Brief vulnerability title",
    "description": "Detailed description of the vulnerability and why it's a security risk",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
    "category": "INJECTION|AUTHENTICATION|AUTHORIZATION|CRYPTOGRAPHY|DATA_EXPOSURE|BUSINESS_LOGIC|CONFIGURATION|DEPENDENCY|INPUT_VALIDATION|OUTPUT_ENCODING|SESSION_MANAGEMENT|OTHER",
    "filePath": "relative/path/to/file.js",
    "startLine": 42,
    "endLine": 45,
    "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
    "recommendation": "Use parameterized queries to prevent SQL injection: const query = 'SELECT * FROM users WHERE id = ?'; db.query(query, [userId]);"
  }
]
```

**Focus on these vulnerability types:**
- SQL injection (unsanitized database queries)
- Cross-site scripting (XSS) in web applications  
- Authentication/authorization bypasses
- Hardcoded secrets or credentials
- Insecure cryptographic practices
- Path traversal vulnerabilities
- Command injection
- Missing input validation
- Insecure direct object references

**Instructions:**
1. Start by exploring the codebase structure
2. Read key files to understand the application
3. Look for the vulnerability patterns listed above
4. For each vulnerability found, include exact file paths and line numbers
5. Write your findings to `vulnerability_report.json` in the root directory
6. Provide actionable remediation for each issue

Please begin the security audit now."""

            # Configure Claude Code SDK options
            options = ClaudeCodeOptions(
                max_turns=None,
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
                async for message in query(prompt=prompt, options=options):
                    messages.append(message)

                    # Format and display message with creative styling
                    formatted_msg = format_claude_message(message, i)
                    logger.info(f"📬 {formatted_msg}")
                    i += 1

                return messages

            # Run the async query
            result_messages = await run_query()

            logger.info(f"Claude SDK completed with {len(result_messages)} messages")
            print(f"📊 Claude SDK completed with {len(result_messages)} messages")

            # Process and combine all message content with enhanced formatting
            print("\n" + "🔄 " + "=" * 60)
            print("📋 PROCESSING CLAUDE SDK MESSAGES")
            print("=" * 68)

            full_response = ""
            assistant_messages = []
            conversation_stats = {
                "assistant_msgs": 0,
                "user_msgs": 0,
                "system_msgs": 0,
                "result_msgs": 0,
                "unknown_msgs": 0,
                "total_chars": 0,
            }

            def extract_message_content(message) -> str:
                """Extract content from any message type safely."""
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

            for i, message in enumerate(result_messages):
                message_type = type(message).__name__
                content = extract_message_content(message)
                content_length = len(content)
                conversation_stats["total_chars"] += content_length

                # Display formatted message processing
                formatted_msg = format_claude_message(message, i)
                logger.info(f"🔍 Processing: {formatted_msg}")
                print(f"🔍 Processing: {formatted_msg}")

                logger.info(f"=== CLAUDE SDK MESSAGE {i+1} ({message_type}) ===")
                logger.info(f"Content length: {content_length} chars")
                logger.info(
                    f"Content preview: {content[:200]}..." if content else "No content"
                )

                if isinstance(message, AssistantMessage):
                    conversation_stats["assistant_msgs"] += 1
                    if content:
                        assistant_messages.append(content)
                        full_response += content + "\n\n"

                elif isinstance(message, UserMessage):
                    conversation_stats["user_msgs"] += 1
                    if content:
                        full_response += f"👤 USER: {content}\n\n"

                elif isinstance(message, SystemMessage):
                    conversation_stats["system_msgs"] += 1
                    # System messages don't contribute to main response

                elif (
                    ResultMessage and isinstance(message, ResultMessage)
                ) or message_type == "ResultMessage":
                    conversation_stats["result_msgs"] += 1
                    if content:
                        assistant_messages.append(content)
                        full_response += content + "\n\n"

                    # Display metadata with enhanced formatting
                    if hasattr(message, "total_cost_usd"):
                        cost = message.total_cost_usd
                        print(f"💰 Total Cost: ${cost:.4f}")
                        logger.info(f"Total cost: ${cost:.4f}")
                    if hasattr(message, "duration_ms"):
                        duration = message.duration_ms
                        duration_sec = duration / 1000
                        print(f"⏱️  Duration: {duration_sec:.1f}s ({duration:,}ms)")
                        logger.info(f"Duration: {duration}ms")

                else:
                    conversation_stats["unknown_msgs"] += 1
                    logger.info(f"Unknown message type: {message_type}")
                    if hasattr(message, "__dict__"):
                        logger.debug(
                            f"Message attributes: {list(message.__dict__.keys())}"
                        )

            # Display conversation statistics
            print("\n📊 Conversation Statistics:")
            print(f"   🤖 Assistant messages: {conversation_stats['assistant_msgs']}")
            print(f"   👤 User messages: {conversation_stats['user_msgs']}")
            print(f"   ⚙️  System messages: {conversation_stats['system_msgs']}")
            print(f"   🎯 Result messages: {conversation_stats['result_msgs']}")
            if conversation_stats["unknown_msgs"] > 0:
                print(f"   ❓ Unknown messages: {conversation_stats['unknown_msgs']}")
            print(
                f"   📝 Total content: {conversation_stats['total_chars']:,} characters"
            )
            print("=" * 68)

            logger.info("=== END CLAUDE SDK OUTPUT ===")

            # Display full conversation output with enhanced formatting
            print("\n" + "🤖 " + "=" * 58)
            print("📄 CLAUDE SDK FULL CONVERSATION OUTPUT")
            print("=" * 68)
            if full_response.strip():
                # Truncate very long responses for readability
                if len(full_response) > 5000:
                    truncated_response = (
                        full_response[:5000]
                        + f"\n\n... [TRUNCATED - showing first 5,000 of {len(full_response):,} characters] ..."
                    )
                    print(truncated_response)
                else:
                    print(full_response)
            else:
                print("(No conversation content to display)")
            print("=" * 68 + "\n")

            # Process the response by looking for the vulnerability report file
            try:
                logger.info(
                    "Looking for vulnerability_report.json file created by Claude Code"
                )
                print(
                    "🔍 Looking for vulnerability_report.json file created by Claude Code..."
                )

                # Check if vulnerability_report.json was created in the repo directory
                vulnerability_report_path = os.path.join(
                    repo_path, "vulnerability_report.json"
                )
                vulnerabilities = []

                if os.path.exists(vulnerability_report_path):
                    try:
                        with open(
                            vulnerability_report_path, "r", encoding="utf-8"
                        ) as f:
                            vulnerabilities = json.load(f)
                        logger.info(
                            f"Successfully loaded {len(vulnerabilities)} vulnerabilities from report file"
                        )
                        print(
                            f"✅ Successfully loaded {len(vulnerabilities)} vulnerabilities from report file"
                        )
                    except json.JSONDecodeError as e:
                        logger.warning(
                            f"Failed to parse vulnerability report JSON: {e}"
                        )
                        print(f"⚠️ Failed to parse vulnerability report JSON: {e}")
                    except Exception as e:
                        logger.warning(f"Failed to read vulnerability report file: {e}")
                        print(f"⚠️ Failed to read vulnerability report file: {e}")
                else:
                    logger.info(
                        "No vulnerability_report.json file found, trying to extract from conversation"
                    )
                    print(
                        "🔍 No vulnerability_report.json file found, trying to extract from conversation..."
                    )

                    # Fallback: try to extract JSON from the conversation
                    analysis_content = full_response.strip()
                    import re

                    # Look for JSON array in the response
                    json_pattern = r"```json\s*\n(\[.*?\])\s*\n```"
                    json_matches = re.findall(json_pattern, analysis_content, re.DOTALL)

                    if json_matches:
                        try:
                            vulnerabilities = json.loads(json_matches[-1].strip())
                            logger.info(
                                f"Extracted {len(vulnerabilities)} vulnerabilities from conversation"
                            )
                            print(
                                f"✅ Extracted {len(vulnerabilities)} vulnerabilities from conversation"
                            )
                        except json.JSONDecodeError as e:
                            logger.warning(
                                f"Failed to parse JSON from conversation: {e}"
                            )

                # Validate vulnerability structure
                valid_vulnerabilities = []
                for vuln in vulnerabilities:
                    if isinstance(vuln, dict) and all(
                        key in vuln
                        for key in [
                            "title",
                            "description",
                            "severity",
                            "category",
                            "filePath",
                            "startLine",
                            "recommendation",
                        ]
                    ):
                        valid_vulnerabilities.append(vuln)
                    else:
                        logger.warning(f"Invalid vulnerability structure: {vuln}")

                # Calculate summary stats
                severity_counts = {}
                for vuln in valid_vulnerabilities:
                    severity = vuln.get("severity", "UNKNOWN")
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1

                # Include conversation analysis for context
                conversation_summary = self._extract_conversation_summary(full_response)

                return {
                    "summary": f"Found {len(valid_vulnerabilities)} vulnerabilities",
                    "vulnerabilities": valid_vulnerabilities,
                    "vulnerability_count": len(valid_vulnerabilities),
                    "severity_breakdown": severity_counts,
                    "conversation_summary": conversation_summary,
                    "report_file_found": os.path.exists(vulnerability_report_path),
                    "raw_analysis": full_response,
                }

            except Exception as parse_error:
                logger.error(
                    f"Response processing failed: {parse_error}", exc_info=True
                )
                print(f"❌ Response processing failed: {parse_error}")
                return {
                    "summary": "Security audit completed but failed to process results",
                    "vulnerabilities": [],
                    "vulnerability_count": 0,
                    "severity_breakdown": {},
                    "conversation_summary": "Error processing results",
                    "report_file_found": False,
                    "raw_analysis": full_response,
                    "error": str(parse_error),
                }

        except Exception as e:
            error_msg = f"Failed to run Claude SDK scan: {str(e)}"
            logger.error(error_msg, exc_info=True)
            print(f"❌ {error_msg}")
            raise Exception(error_msg)

    def _extract_conversation_summary(self, full_response: str) -> str:
        """Extract a brief summary from the Claude Code conversation."""
        try:
            # Look for summary-like content in the conversation
            lines = full_response.split("\n")
            summary_lines = []

            for line in lines:
                line = line.strip()
                if any(
                    keyword in line.lower()
                    for keyword in [
                        "found",
                        "identified",
                        "discovered",
                        "vulnerabilities",
                        "issues",
                        "security",
                    ]
                ):
                    if len(line) > 20 and len(line) < 200:  # Reasonable summary length
                        summary_lines.append(line)

            if summary_lines:
                return ". ".join(summary_lines[:3])  # Take first 3 relevant lines
            else:
                return "Security audit completed via Claude Code interaction"

        except Exception as e:
            logger.debug(f"Failed to extract conversation summary: {e}")
            return "Security audit completed"

    async def _write_vulnerabilities_to_db(
        self, job_id: str, scan_results: Dict[str, Any]
    ) -> int:
        """
        Write vulnerabilities from scan results to the database.

        Args:
            job_id: The job ID to associate vulnerabilities with
            scan_results: The scan results containing vulnerabilities

        Returns:
            int: Number of vulnerabilities written to database
        """
        try:
            # Get database client
            db = await get_db()

            # Extract vulnerabilities from scan results
            vulnerabilities = []
            if isinstance(scan_results, dict) and "vulnerabilities" in scan_results:
                vulnerabilities = scan_results["vulnerabilities"]

            if not vulnerabilities:
                logger.info("No vulnerabilities found in scan results")
                print("ℹ️  No vulnerabilities to store in database")
                return 0

            stored_count = 0

            # Map severity levels to database enum values
            severity_mapping = {
                "INFO": "INFO",
                "LOW": "LOW",
                "MEDIUM": "MEDIUM",
                "HIGH": "HIGH",
                "CRITICAL": "CRITICAL",
            }

            # Map category types to database enum values
            category_mapping = {
                "INJECTION": "INJECTION",
                "AUTHENTICATION": "AUTHENTICATION",
                "AUTHORIZATION": "AUTHORIZATION",
                "CRYPTOGRAPHY": "CRYPTOGRAPHY",
                "DATA_EXPOSURE": "DATA_EXPOSURE",
                "BUSINESS_LOGIC": "BUSINESS_LOGIC",
                "CONFIGURATION": "CONFIGURATION",
                "DEPENDENCY": "DEPENDENCY",
                "INPUT_VALIDATION": "INPUT_VALIDATION",
                "OUTPUT_ENCODING": "OUTPUT_ENCODING",
                "SESSION_MANAGEMENT": "SESSION_MANAGEMENT",
                "OTHER": "OTHER",
            }

            for vuln in vulnerabilities:
                try:
                    # Map severity with fallback
                    severity = severity_mapping.get(
                        vuln.get("severity", "").upper(), "MEDIUM"
                    )

                    # Map category with fallback
                    category = category_mapping.get(
                        vuln.get("category", "").upper(), "OTHER"
                    )

                    # Prepare metadata as JSON string
                    import json

                    metadata_dict = {
                        "cwe": vuln.get("cwe"),
                        "owasp": vuln.get("owasp"),
                        "confidence": vuln.get("confidence"),
                        "original_category": vuln.get("category"),
                        "original_severity": vuln.get("severity"),
                    }

                    # Create vulnerability record (matching test_db_fix.py approach)
                    await db.codevulnerability.create(
                        data={
                            "scanJobId": job_id,
                            "title": vuln.get("title", "Security Issue")[
                                :255
                            ],  # Limit length
                            "description": vuln.get("description", "")[
                                :1000
                            ],  # Limit length
                            "severity": severity,
                            "category": category,
                            "filePath": vuln.get("filePath", vuln.get("file", ""))[
                                :500
                            ],  # Limit length
                            "startLine": int(
                                vuln.get("startLine", vuln.get("line", 0))
                            ),
                            "endLine": int(vuln.get("endLine", vuln.get("line", 0))),
                            "codeSnippet": vuln.get(
                                "codeSnippet", vuln.get("code_snippet", "")
                            )[
                                :2000
                            ],  # Limit length
                            "recommendation": vuln.get("recommendation", "")[
                                :1000
                            ],  # Limit length
                            "metadata": json.dumps(metadata_dict),
                        }
                    )
                    stored_count += 1

                except Exception as vuln_error:
                    logger.error(f"Failed to store vulnerability: {vuln_error}")
                    logger.debug(f"Vulnerability data: {vuln}")
                    continue

            # Update scan job with vulnerability count
            try:
                await db.scanjob.update(
                    where={"id": job_id}, data={"vulnerabilitiesFound": stored_count}
                )
                logger.info(
                    f"Updated scan job {job_id} with {stored_count} vulnerabilities"
                )
            except Exception as update_error:
                logger.error(
                    f"Failed to update scan job vulnerability count: {update_error}"
                )

            logger.info(
                f"Successfully stored {stored_count} vulnerabilities to database"
            )
            print(f"✅ Stored {stored_count} vulnerabilities to database")

            return stored_count

        except Exception as e:
            logger.error(f"Failed to write vulnerabilities to database: {e}")
            print(f"❌ Failed to store vulnerabilities: {e}")
            return 0

    async def _process_scan_job(self, job: Job) -> Dict[str, Any]:
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
            logger.info(f"Starting to process scan job {job.id}, {job.type.value}")
            logger.debug(f"Job data: {job.data}")

            # Step 0: Create ScanJob record in database
            logger.info("Step 0: Creating ScanJob record in database")
            print("💾 Step 0: Creating ScanJob record in database...")
            # Initialize database connection
            await init_database()

            try:
                db = await get_db()

                # Get the database URL from the db object if possible, otherwise from environment
                db_url = getattr(db, "_database_url", None)
                logger.info(f"Database URL (from db): {db_url}")

                # Upsert scan job record: if created by frontend as PENDING, update it to IN_PROGRESS; otherwise create it
                scan_job_record = await db.scanjob.upsert(
                    where={"id": job.id},
                    data={
                        "update": {
                            "status": "IN_PROGRESS",
                            "data": json.dumps(job.data),
                        },
                        "create": {
                            "id": job.id,
                            "type": "SCAN_REPO",
                            "status": "IN_PROGRESS",
                            "data": json.dumps(job.data),
                        },
                    },
                )

                logger.info(
                    f"✅ Upserted ScanJob record in database: {scan_job_record.id}"
                )
                print(f"✅ Upserted ScanJob record in database: {scan_job_record.id}")

            except Exception as db_error:
                logger.error(f"Failed to upsert ScanJob record: {db_error}")
                print(f"❌ Failed to upsert ScanJob record: {db_error}")
                # Continue with scan even if DB record upsert fails

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

                scan_results = await self._run_claude_scan(
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

            # Step 4: Write vulnerabilities to database
            logger.info("Step 4: Writing vulnerabilities to database")
            print("💾 Step 4: Writing vulnerabilities to database...")

            vulnerability_count = await self._write_vulnerabilities_to_db(
                job.id, scan_results
            )

            # Update result with database info
            result["vulnerabilities_stored"] = vulnerability_count

            # Step 5: Update ScanJob status to COMPLETED
            logger.info("Step 5: Updating ScanJob status to COMPLETED")
            print("💾 Step 5: Updating ScanJob status to COMPLETED...")

            try:
                # Ensure result is JSON-serializable by converting to JSON and back
                # This handles datetime objects, complex objects, etc.
                json_serializable_result = ensure_json_serializable(result)
                
                db = await get_db()
                await db.scanjob.update(
                    where={"id": job.id},
                    data={
                        "status": "COMPLETED",
                        "result": json_serializable_result,
                        "finishedAt": datetime.now().isoformat(),
                        "vulnerabilitiesFound": result.get("vulnerabilities_stored", 0),
                    },
                )
                logger.info(f"✅ Updated ScanJob {job.id} status to COMPLETED")
                print(f"✅ Updated ScanJob {job.id} status to COMPLETED")
            except Exception as update_error:
                logger.error(f"Failed to update ScanJob status: {update_error}")
                print(f"❌ Failed to update ScanJob status: {update_error}")

            logger.info(f"Scan completed successfully for job {job.id}")
            logger.debug(f"Final result keys: {list(result.keys())}")
            # logger.info("=== FINAL SCAN RESULT ===")
            # logger.info(json.dumps(result, indent=2, default=str))
            # logger.info("=== END FINAL SCAN RESULT ===")
            print(f"✅ Scan completed for job {job.id}")
            await close_database()

            return result

        finally:
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                logger.info(f"Cleaning up temporary directory: {temp_dir}")
                print(f"🧹 Cleaning up temporary directory: {temp_dir}")
                shutil.rmtree(temp_dir)
            else:
                logger.debug("No temporary directory to clean up")

    async def _update_failed_job_status(self, job_id: str, error_msg: str):
        """Update the database status for a failed job."""
        try:
            await init_database()
            db = await get_db()
            await db.scanjob.update(
                where={"id": job_id},
                data={
                    "status": "FAILED",
                    "error": error_msg,
                    "finishedAt": datetime.now().isoformat(),
                },
            )
            logger.info(f"Updated ScanJob {job_id} status to FAILED")
            print(f"💾 Updated ScanJob {job_id} status to FAILED")
        except Exception as update_error:
            logger.error(f"Failed to update ScanJob status to FAILED: {update_error}")
        finally:
            try:
                await close_database()
            except Exception as close_error:
                logger.error(f"Failed to close database connection: {close_error}")

    def process_job(self, job: Job):
        """Process a single job."""
        try:
            logger.info(f"Starting job {job.id} of type {job.type.value}")
            print(f"🚀 Starting job {job.id} of type {job.type.value}")

            if job.type == JobType.SCAN_REPO:
                result = anyio.run(self._process_scan_job, job)

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

            # Update ScanJob status to FAILED in database using a separate async context
            anyio.run(self._update_failed_job_status, job.id, error_msg)

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
