"""GitHub Checks API client for Fortify security scanning."""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from .client import GitHubAPIClient

logger = logging.getLogger(__name__)


class GitHubChecksClient:
    """GitHub Checks API client for Fortify security scanning."""

    def __init__(self):
        self.api = GitHubAPIClient()

    async def create_check_run(
        self,
        repo: str,
        head_sha: str,
        name: str = "Fortify Security Scan",
        status: str = "in_progress",
        started_at: Optional[str] = None,
        output: Optional[Dict[str, Any]] = None,
        installation_id: Optional[int] = None,
        github_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new check run for a commit.

        Args:
            repo: Repository full name (owner/repo)
            head_sha: Commit SHA
            name: Check run name
            status: Check run status
            started_at: Start timestamp
            output: Check run output
            installation_id: GitHub App installation ID (for app auth)
            github_token: Direct GitHub OAuth token (for user auth)
        """

        check_data = {
            "name": name,
            "head_sha": head_sha,
            "status": status,
            "started_at": started_at or datetime.utcnow().isoformat(),
        }

        if output:
            check_data["output"] = output

        result = await self.api.make_request(
            "POST",
            f"/repos/{repo}/check-runs",
            installation_id=installation_id,
            github_token=github_token,
            data=check_data,
        )

        logger.info(f"Created check run {result['id']} for {repo}@{head_sha}")
        return result

    async def update_check_run(
        self,
        repo: str,
        check_run_id: int,
        status: str = "completed",
        conclusion: Optional[str] = None,
        completed_at: Optional[str] = None,
        output: Optional[Dict[str, Any]] = None,
        actions: Optional[List[Dict[str, Any]]] = None,
        installation_id: Optional[int] = None,
        github_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update an existing check run with results.

        Args:
            repo: Repository full name (owner/repo)
            check_run_id: Check run ID to update
            status: Check run status
            conclusion: Check run conclusion
            completed_at: Completion timestamp
            output: Check run output
            actions: Action buttons
            installation_id: GitHub App installation ID (for app auth)
            github_token: Direct GitHub OAuth token (for user auth)
        """

        update_data = {
            "status": status,
        }

        if conclusion:
            update_data["conclusion"] = conclusion
        if completed_at:
            update_data["completed_at"] = completed_at
        if output:
            update_data["output"] = output
        if actions:
            update_data["actions"] = actions

        result = await self.api.make_request(
            "PATCH",
            f"/repos/{repo}/check-runs/{check_run_id}",
            installation_id=installation_id,
            github_token=github_token,
            data=update_data,
        )

        logger.info(
            f"Updated check run {check_run_id} for {repo}: {conclusion or status}"
        )
        return result

    def format_vulnerability_output(
        self, vulnerabilities: List[Dict[str, Any]], scan_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format vulnerability data for GitHub Checks output."""

        if not vulnerabilities:
            return {
                "title": "✅ No security issues found",
                "summary": "Your code passed all security checks!",
                "text": "Fortify found no security vulnerabilities in your code changes.",
            }

        # Count by severity
        severity_counts = {}
        for vuln in vulnerabilities:
            severity = vuln.get("severity", "UNKNOWN")
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        # Create annotations (max 50)
        annotations = []
        for vuln in vulnerabilities[:50]:
            level = "failure" if vuln["severity"] in ["HIGH", "CRITICAL"] else "warning"
            annotations.append(
                {
                    "path": vuln["filePath"],
                    "start_line": vuln["startLine"],
                    "end_line": vuln.get("endLine", vuln["startLine"]),
                    "annotation_level": level,
                    "title": vuln["title"],
                    "message": f"{vuln['description']}\n\n**Recommendation:** {vuln['recommendation']}",
                }
            )

        # Format summary
        critical_count = severity_counts.get("CRITICAL", 0)
        high_count = severity_counts.get("HIGH", 0)
        total_count = len(vulnerabilities)

        if critical_count > 0:
            title = f"🚨 {critical_count} Critical Security Issues Found"
            emoji = "🚨"
        elif high_count > 0:
            title = f"⚠️ {high_count} High Severity Issues Found"
            emoji = "⚠️"
        else:
            title = f"ℹ️ {total_count} Security Issues Found"
            emoji = "ℹ️"

        # Generate detailed report
        text = f"""## {emoji} Fortify Security Report

### Issues by Severity
"""

        for severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = severity_counts.get(severity, 0)
            if count > 0:
                text += f"- **{severity}**: {count} issues\n"

        text += f"""
### Summary
- **Total Issues:** {total_count}
- **Files Affected:** {len(set(v['filePath'] for v in vulnerabilities))}
- **Scan Duration:** {scan_summary.get('duration', 'N/A')}

### Next Steps
1. Review the annotated code lines above
2. Apply suggested fixes for high-priority issues
3. Use the action buttons below for automated remediation

[📊 View Full Report](https://app.fortify.dev/scans/{scan_summary.get('scan_id', '')})
"""

        return {
            "title": title,
            "summary": f"Found {total_count} security issues across {len(set(v['filePath'] for v in vulnerabilities))} files",
            "text": text,
            "annotations": annotations,
        }

    def get_check_actions(
        self, vulnerabilities: List[Dict[str, Any]], auto_fixable_count: int = 0
    ) -> List[Dict[str, Any]]:
        """Generate action buttons for check run."""

        actions = []

        if auto_fixable_count > 0:
            actions.append(
                {
                    "label": f"🔧 Apply {auto_fixable_count} Auto-fixes",
                    "description": f"Automatically fix {auto_fixable_count} security issues",
                    "identifier": "apply_fixes",
                }
            )

        actions.extend(
            [
                {
                    "label": "🔄 Re-run Security Scan",
                    "description": "Run the security scan again",
                    "identifier": "rerun_scan",
                },
                {
                    "label": "📊 View Dashboard",
                    "description": "Open Fortify security dashboard",
                    "identifier": "view_dashboard",
                },
            ]
        )

        return actions
