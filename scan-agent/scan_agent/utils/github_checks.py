"""GitHub Checks API client for creating and updating check runs."""

import os
import logging
from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class GitHubChecksClient:
    """Client for GitHub Checks API operations."""

    def __init__(self, access_token: str = None):
        """Initialize GitHub Checks client with access token."""
        self.access_token = access_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Fortify-Security-Scanner",
        }
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"

        # Get base URL for details links
        self.fortify_base_url = os.environ.get(
            "FORTIFY_BASE_URL", 
            os.environ.get("NEXTAUTH_URL", "https://fortify.rocks")
        )

    async def create_check_run(
        self,
        owner: str,
        repo: str,
        head_sha: str,
        job_id: str,
        name: str = "Fortify Security Scan",
        details_url: str = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new check run for a scan job.
        
        Args:
            owner: Repository owner
            repo: Repository name
            head_sha: Commit SHA to associate check with
            job_id: Scan job ID
            name: Check run name
            details_url: URL to detailed results (optional, will be generated if not provided)
        
        Returns:
            Check run data if successful, None if failed
        """
        try:
            if not details_url:
                details_url = f"{self.fortify_base_url}/jobs/{job_id}"

            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/check-runs"
                
                check_data = {
                    "name": name,
                    "head_sha": head_sha,
                    "status": "queued",
                    "details_url": details_url,
                    "output": {
                        "title": "Security scan queued",
                        "summary": "Fortify security scan has been queued and will start shortly.",
                        "text": f"Scan job ID: {job_id}\n\nThe scan will analyze your code for security vulnerabilities and provide detailed results."
                    }
                }

                logger.info(f"Creating GitHub check run for {owner}/{repo} at {head_sha}")
                logger.debug(f"Check data: {check_data}")

                response = await client.post(
                    url, json=check_data, headers=self.headers
                )

                if response.status_code == 201:
                    check_run = response.json()
                    logger.info(
                        f"Successfully created check run {check_run.get('id')} for {owner}/{repo}"
                    )
                    return check_run
                else:
                    error_detail = ""
                    try:
                        error_data = response.json()
                        error_detail = error_data.get("message", response.text)
                    except:
                        error_detail = response.text

                    logger.error(
                        f"Failed to create check run for {owner}/{repo}: {response.status_code} - {error_detail}"
                    )
                    return None

        except Exception as e:
            logger.error(
                f"Error creating check run for {owner}/{repo}: {str(e)}", exc_info=True
            )
            return None

    async def update_check_run_status(
        self,
        owner: str,
        repo: str,
        check_run_id: int,
        status: str,
        output_title: str = None,
        output_summary: str = None,
        output_text: str = None,
    ) -> bool:
        """
        Update check run status and output.
        
        Args:
            owner: Repository owner
            repo: Repository name
            check_run_id: Check run ID to update
            status: New status ("queued", "in_progress", "completed")
            output_title: Optional output title
            output_summary: Optional output summary
            output_text: Optional output text
        
        Returns:
            True if successful, False if failed
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/check-runs/{check_run_id}"
                
                update_data = {"status": status}
                
                # Add output if provided
                if any([output_title, output_summary, output_text]):
                    update_data["output"] = {}
                    if output_title:
                        update_data["output"]["title"] = output_title
                    if output_summary:
                        update_data["output"]["summary"] = output_summary
                    if output_text:
                        update_data["output"]["text"] = output_text

                logger.info(f"Updating check run {check_run_id} status to {status}")
                logger.debug(f"Update data: {update_data}")

                response = await client.patch(
                    url, json=update_data, headers=self.headers
                )

                if response.status_code == 200:
                    logger.info(f"Successfully updated check run {check_run_id}")
                    return True
                else:
                    error_detail = ""
                    try:
                        error_data = response.json()
                        error_detail = error_data.get("message", response.text)
                    except:
                        error_detail = response.text

                    logger.error(
                        f"Failed to update check run {check_run_id}: {response.status_code} - {error_detail}"
                    )
                    return False

        except Exception as e:
            logger.error(
                f"Error updating check run {check_run_id}: {str(e)}", exc_info=True
            )
            return False

    async def complete_check_run(
        self,
        owner: str,
        repo: str,
        check_run_id: int,
        conclusion: str,
        output_title: str,
        output_summary: str,
        output_text: str = None,
        annotations: List[Dict[str, Any]] = None,
    ) -> bool:
        """
        Complete a check run with final results.
        
        Args:
            owner: Repository owner
            repo: Repository name
            check_run_id: Check run ID to complete
            conclusion: Check conclusion ("success", "failure", "neutral", "cancelled", "skipped", "timed_out", "action_required")
            output_title: Output title
            output_summary: Output summary
            output_text: Optional detailed output text
            annotations: Optional list of code annotations
        
        Returns:
            True if successful, False if failed
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/check-runs/{check_run_id}"
                
                completion_data = {
                    "status": "completed",
                    "conclusion": conclusion,
                    "completed_at": datetime.utcnow().isoformat() + "Z",
                    "output": {
                        "title": output_title,
                        "summary": output_summary,
                    }
                }

                if output_text:
                    completion_data["output"]["text"] = output_text

                if annotations:
                    # Limit annotations to GitHub's limit (50 per request)
                    completion_data["output"]["annotations"] = annotations[:50]

                logger.info(f"Completing check run {check_run_id} with conclusion {conclusion}")
                logger.debug(f"Completion data: {completion_data}")

                response = await client.patch(
                    url, json=completion_data, headers=self.headers
                )

                if response.status_code == 200:
                    logger.info(f"Successfully completed check run {check_run_id}")
                    return True
                else:
                    error_detail = ""
                    try:
                        error_data = response.json()
                        error_detail = error_data.get("message", response.text)
                    except:
                        error_detail = response.text

                    logger.error(
                        f"Failed to complete check run {check_run_id}: {response.status_code} - {error_detail}"
                    )
                    return False

        except Exception as e:
            logger.error(
                f"Error completing check run {check_run_id}: {str(e)}", exc_info=True
            )
            return False

    def format_vulnerability_summary(self, vulnerabilities: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Format vulnerability results for check output.
        
        Args:
            vulnerabilities: List of vulnerability data
            
        Returns:
            Dictionary with formatted title, summary, and text
        """
        if not vulnerabilities:
            return {
                "title": "✅ No vulnerabilities found",
                "summary": "Fortify security scan completed successfully with no vulnerabilities detected.",
                "text": "🎉 Great job! Your code passed all security checks.\n\nNo security vulnerabilities were found in this scan."
            }

        # Count vulnerabilities by severity
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for vuln in vulnerabilities:
            severity = vuln.get("severity", "INFO").upper()
            if severity in severity_counts:
                severity_counts[severity] += 1

        total_count = len(vulnerabilities)
        critical_high = severity_counts["CRITICAL"] + severity_counts["HIGH"]

        # Determine overall result
        if critical_high > 0:
            icon = "🚨"
            title = f"Security issues found ({total_count} total)"
        else:
            icon = "⚠️"
            title = f"Security review needed ({total_count} issues)"

        # Create summary
        summary_parts = []
        if severity_counts["CRITICAL"] > 0:
            summary_parts.append(f"{severity_counts['CRITICAL']} critical")
        if severity_counts["HIGH"] > 0:
            summary_parts.append(f"{severity_counts['HIGH']} high")
        if severity_counts["MEDIUM"] > 0:
            summary_parts.append(f"{severity_counts['MEDIUM']} medium")
        if severity_counts["LOW"] > 0:
            summary_parts.append(f"{severity_counts['LOW']} low")
        if severity_counts["INFO"] > 0:
            summary_parts.append(f"{severity_counts['INFO']} info")

        summary = f"Found {', '.join(summary_parts)} severity vulnerabilities."

        # Create detailed text
        text_parts = [
            f"{icon} **Security Scan Results**",
            "",
            f"**Total vulnerabilities found:** {total_count}",
            "",
            "**Breakdown by severity:**"
        ]

        for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = severity_counts[severity]
            if count > 0:
                emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵", "INFO": "⚪"}.get(severity, "⚪")
                text_parts.append(f"- {emoji} **{severity.title()}**: {count}")

        text_parts.extend([
            "",
            "**Next steps:**",
            "1. Review the detailed vulnerability report in the Fortify dashboard",
            "2. Address critical and high severity issues first",
            "3. Consider the recommended fixes for each vulnerability",
            "",
            "Click **Details** above to view the full report with remediation guidance."
        ])

        return {
            "title": title,
            "summary": summary,
            "text": "\n".join(text_parts)
        }

    def get_check_conclusion(self, scan_status: str, vulnerabilities: List[Dict[str, Any]]) -> str:
        """
        Determine GitHub check conclusion based on scan results.
        
        Args:
            scan_status: Scan job status
            vulnerabilities: List of vulnerabilities found
            
        Returns:
            GitHub check conclusion
        """
        if scan_status == "FAILED":
            return "failure"
        elif scan_status != "COMPLETED":
            return "neutral"  # Should not happen for completed checks
        elif not vulnerabilities:
            return "success"
        else:
            # Count critical and high severity vulnerabilities
            critical_high_count = sum(
                1 for vuln in vulnerabilities 
                if vuln.get("severity", "").upper() in ["CRITICAL", "HIGH"]
            )
            
            # If we have critical/high vulnerabilities, use neutral (yellow)
            # This allows the PR to still be merged but draws attention
            return "neutral" if critical_high_count > 0 else "success"

    async def create_scan_annotations(
        self, vulnerabilities: List[Dict[str, Any]], repo_path: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Create GitHub check annotations from vulnerability data.
        
        Args:
            vulnerabilities: List of vulnerability data
            repo_path: Repository path prefix to remove from file paths
            
        Returns:
            List of annotation objects
        """
        annotations = []
        
        for vuln in vulnerabilities[:50]:  # GitHub limits to 50 annotations
            # Clean up file path
            file_path = vuln.get("filePath", "")
            if repo_path and file_path.startswith(repo_path):
                file_path = file_path[len(repo_path):].lstrip("/")
            
            # Map severity to annotation level
            severity = vuln.get("severity", "INFO").upper()
            annotation_level = {
                "CRITICAL": "failure",
                "HIGH": "failure", 
                "MEDIUM": "warning",
                "LOW": "notice",
                "INFO": "notice"
            }.get(severity, "notice")
            
            annotation = {
                "path": file_path,
                "start_line": vuln.get("startLine", 1),
                "end_line": vuln.get("endLine", vuln.get("startLine", 1)),
                "annotation_level": annotation_level,
                "title": f"{severity} - {vuln.get('title', 'Security Issue')}",
                "message": vuln.get("description", "No description available"),
            }
            
            # Add raw details if available
            if vuln.get("recommendation"):
                annotation["message"] += f"\n\n**Recommendation:** {vuln['recommendation']}"
            
            annotations.append(annotation)
        
        return annotations
