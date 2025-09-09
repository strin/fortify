"""GitHub webhook event processing."""

import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from .checks import GitHubChecksClient
from ..utils.database import get_db

logger = logging.getLogger(__name__)


class EventStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class WebhookEvent:
    delivery_id: str
    event_type: str
    event_action: Optional[str]
    installation_id: Optional[int]
    repository_full_name: Optional[str]
    payload: Dict[str, Any]


class GitHubWebhookProcessor:
    """Process GitHub webhook events for PR security scanning."""

    def __init__(self, webhook_secret: str):
        self.webhook_secret = webhook_secret
        self.checks_client = GitHubChecksClient()
        self.handlers = {
            "pull_request": self.handle_pull_request,
            "check_run": self.handle_check_run,
            "installation": self.handle_installation,
            "installation_repositories": self.handle_installation_repositories,
        }

    def verify_signature(self, payload_body: bytes, signature_header: str) -> bool:
        """Verify GitHub webhook signature."""
        if not signature_header.startswith("sha256="):
            return False

        expected_signature = hmac.new(
            self.webhook_secret.encode("utf-8"), payload_body, hashlib.sha256
        ).hexdigest()

        received_signature = signature_header[7:]  # Remove 'sha256=' prefix

        return hmac.compare_digest(expected_signature, received_signature)

    async def process_event(self, event: WebhookEvent) -> Dict[str, Any]:
        """Process webhook event with error handling and logging."""

        try:
            # Store event in database for audit trail
            db = await get_db()
            db_event = await db.gitHubWebhookEvent.create(
                data={
                    "deliveryId": event.delivery_id,
                    "eventType": event.event_type,
                    "eventAction": event.event_action,
                    "installationId": event.installation_id,
                    "repositoryFullName": event.repository_full_name,
                    "payload": event.payload,
                    "status": EventStatus.PENDING.value,
                }
            )

            logger.info(
                f"Processing webhook event {event.delivery_id}: {event.event_type}.{event.event_action}"
            )

            # Update status to processing
            await db.gitHubWebhookEvent.update(
                where={"id": db_event.id}, data={"status": EventStatus.PROCESSING.value}
            )

            # Get handler for event type
            handler = self.handlers.get(event.event_type)
            if not handler:
                logger.warning(f"No handler for event type: {event.event_type}")
                await db.gitHubWebhookEvent.update(
                    where={"id": db_event.id},
                    data={
                        "status": EventStatus.COMPLETED.value,
                        "processedAt": datetime.utcnow(),
                    },
                )
                return {"status": "ignored", "reason": "No handler for event type"}

            # Process event
            result = await handler(event)

            # Mark as completed
            await db.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={
                    "status": EventStatus.COMPLETED.value,
                    "processedAt": datetime.utcnow(),
                },
            )

            return {"status": "processed", "result": result}
    
    async def get_user_github_token(self, repository_full_name: str) -> Optional[str]:
        """Look up user's GitHub token from database based on repository."""
        try:
            db = await get_db()
            
            # For now, we need a way to associate repositories with users
            # This could be done through:
            # 1. A repository configuration table
            # 2. Scan target associations
            # 3. User repository permissions
            
            # Let's try to find a user who has scanned this repository before
            # by looking at scan jobs with this repo URL
            repo_url = f"https://github.com/{repository_full_name}"
            
            # Find the most recent scan job for this repository
            recent_scan = await db.scanjob.find_first(
                where={
                    "data": {
                        "path": ["repo_url"],
                        "equals": repo_url
                    }
                },
                include={"user": True},
                order_by={"createdAt": "desc"}
            )
            
            if recent_scan and recent_scan.user and recent_scan.user.githubAccessToken:
                logger.info(f"Found GitHub token for {repository_full_name} via user {recent_scan.user.email}")
                return recent_scan.user.githubAccessToken
            
            # Fallback: try to find via scan targets
            scan_target = await db.scantarget.find_first(
                where={"repoUrl": repo_url},
                include={"user": True}
            )
            
            if scan_target and scan_target.user and scan_target.user.githubAccessToken:
                logger.info(f"Found GitHub token for {repository_full_name} via scan target")
                return scan_target.user.githubAccessToken
            
            logger.warning(f"No GitHub token found for repository {repository_full_name}")
            return None
            
        except Exception as e:
            logger.error(f"Error looking up GitHub token for {repository_full_name}: {e}")
            return None
    
    async def process_event(self, event: WebhookEvent) -> Dict[str, Any]:
        """Process webhook event with error handling and logging."""
        
        try:
            # Store event in database for audit trail
            db = await get_db()
            db_event = await db.gitHubWebhookEvent.create(
                data={
                    "deliveryId": event.delivery_id,
                    "eventType": event.event_type,
                    "eventAction": event.event_action,
                    "installationId": event.installation_id,
                    "repositoryFullName": event.repository_full_name,
                    "payload": event.payload,
                    "status": EventStatus.PENDING.value
                }
            )
            
            logger.info(f"Processing webhook event {event.delivery_id}: {event.event_type}.{event.event_action}")
            
            # Update status to processing
            await db.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={"status": EventStatus.PROCESSING.value}
            )
            
            # Get handler for event type
            handler = self.handlers.get(event.event_type)
            if not handler:
                logger.warning(f"No handler for event type: {event.event_type}")
                await db.gitHubWebhookEvent.update(
                    where={"id": db_event.id},
                    data={
                        "status": EventStatus.COMPLETED.value,
                        "processedAt": datetime.utcnow()
                    }
                )
                return {"status": "ignored", "reason": "No handler for event type"}
            
            # Process event
            result = await handler(event)
            
            # Mark as completed
            await db.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={
                    "status": EventStatus.COMPLETED.value,
                    "processedAt": datetime.utcnow(),
                },
            )

            return {"status": "processed", "result": result}
            
        except Exception as e:
            # Mark as failed with error message
            logger.error(
                f"Failed to process webhook event {event.delivery_id}: {e}",
                exc_info=True,
            )

            try:
                await db.gitHubWebhookEvent.update(
                    where={"id": db_event.id},
                    data={
                        "status": EventStatus.FAILED.value,
                        "errorMessage": str(e),
                        "processedAt": datetime.utcnow(),
                    },
                )
            except:
                pass  # Don't fail if we can't update the database

            return {"status": "failed", "error": str(e)}

    async def handle_pull_request(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle pull request events by creating check runs and triggering scans."""
        action = event.event_action
        payload = event.payload

        if action not in ["opened", "synchronize", "reopened"]:
            return {"status": "ignored", "reason": f"Action {action} not handled"}

        # Extract PR information
        pr_data = {
            "installation_id": event.installation_id,
            "repository": event.repository_full_name,
            "pr_number": payload["number"],
            "head_sha": payload["pull_request"]["head"]["sha"],
            "base_sha": payload["pull_request"]["base"]["sha"],
            "branch": payload["pull_request"]["head"]["ref"],
            "base_branch": payload["pull_request"]["base"]["ref"],
        }

        logger.info(f"Processing PR {pr_data['pr_number']} for {pr_data['repository']}")

        # Look up user's GitHub token from database
        github_token = await self.get_user_github_token(pr_data["repository"])
        if not github_token:
            logger.warning(f"No GitHub token found for repository {pr_data['repository']}")
            return {"status": "ignored", "reason": "No GitHub token found for repository"}

        # Create check run immediately using user's OAuth token
        check_run = await self.checks_client.create_check_run(
            repo=pr_data["repository"],
            head_sha=pr_data["head_sha"],
            name="Fortify Security Scan",
            status="in_progress",
            output={
                "title": "🔍 Security scan in progress...",
                "summary": "Analyzing your code for security vulnerabilities",
            },
            github_token=github_token
        )

        # Trigger security scan via scan-agent (this will be handled by the server endpoint)
        from ..workers.scanner import ScanWorker
        from ..models.job import JobType, ScanJobData
        from ..utils.queue import JobQueue

        # Create enhanced scan job data with GitHub context
        scan_data = ScanJobData(
            repo_url=f"https://github.com/{pr_data['repository']}.git",
            branch=pr_data["branch"],
            scan_options={
                "mode": "pr_diff",
                "github_context": {
                    "repository": pr_data["repository"],
                    "pr_number": pr_data["pr_number"],
                    "head_sha": pr_data["head_sha"],
                    "base_sha": pr_data["base_sha"],
                    "check_run_id": check_run["id"],
                    "github_token": github_token
                },
            },
        )

        # Add job to queue
        job_queue = JobQueue()
        job_id = job_queue.add_job(JobType.SCAN_REPO, scan_data.to_dict())

        # Process job in background
        scan_worker = ScanWorker()
        # Note: In production, this should be handled by a background worker
        # For now, we'll trigger it synchronously
        try:
            job = job_queue.get_job(job_id)
            scan_worker.process_job(job)
            
            # Update check run with results after scan completes
            await self.update_check_run_with_results(job, pr_data["repository"], check_run["id"], github_token)
            
        except Exception as scan_error:
            logger.error(f"Scan failed for PR {pr_data['pr_number']}: {scan_error}")

            # Update check run with error
            await self.checks_client.update_check_run(
                repo=pr_data["repository"],
                check_run_id=check_run["id"],
                status="completed",
                conclusion="failure",
                completed_at=datetime.utcnow().isoformat(),
                output={
                    "title": "❌ Security scan failed",
                    "summary": f"Scan failed due to: {str(scan_error)}",
                },
                github_token=github_token
            )

        return {
            "status": "scan_triggered",
            "job_id": job_id,
            "check_run_id": check_run["id"],
            "pr_number": pr_data["pr_number"],
        }

    async def handle_check_run(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle check run re-run requests and custom actions."""
        action = event.event_action
        payload = event.payload

        if action == "rerequested":
            # User clicked re-run button
            check_run = payload["check_run"]
            if check_run["name"] == "Fortify Security Scan":
                logger.info(f"Re-running security scan for check run {check_run['id']}")
                # TODO: Implement re-run logic
                return {"status": "rerun_triggered", "check_run_id": check_run["id"]}

        elif action == "requested_action":
            # User clicked custom action button
            requested_action = payload["requested_action"]
            action_id = requested_action["identifier"]

            logger.info(
                f"Handling action {action_id} for check run {payload['check_run']['id']}"
            )

            if action_id == "apply_fixes":
                return await self.handle_apply_fixes(payload)
            elif action_id == "view_dashboard":
                return await self.handle_view_dashboard(payload)

        return {"status": "ignored", "reason": f"Action {action} not handled"}

    async def handle_installation(self, event: WebhookEvent) -> Dict[str, Any]:
        """Handle GitHub App installation events."""
        action = event.event_action
        payload = event.payload

        installation = payload["installation"]

        if action == "created":
            logger.info(
                f"GitHub App installed: {installation['id']} for {installation['account']['login']}"
            )
            # TODO: Store installation data in database

        elif action == "deleted":
            logger.info(f"GitHub App uninstalled: {installation['id']}")
            # TODO: Clean up installation data

        return {
            "status": "processed",
            "action": action,
            "installation_id": installation["id"],
        }

    async def handle_installation_repositories(
        self, event: WebhookEvent
    ) -> Dict[str, Any]:
        """Handle repository selection changes."""
        action = event.event_action
        payload = event.payload

        installation_id = payload["installation"]["id"]

        if action == "added":
            repos = payload["repositories_added"]
            logger.info(
                f"Repositories added to installation {installation_id}: {[r['full_name'] for r in repos]}"
            )

        elif action == "removed":
            repos = payload["repositories_removed"]
            logger.info(
                f"Repositories removed from installation {installation_id}: {[r['full_name'] for r in repos]}"
            )

        return {
            "status": "processed",
            "action": action,
            "installation_id": installation_id,
        }

    async def handle_apply_fixes(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle auto-fix application."""
        # TODO: Implement auto-fix logic
        logger.info("Auto-fix action requested")
        return {"status": "not_implemented", "action": "apply_fixes"}

    async def handle_view_dashboard(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle dashboard redirect."""
        # TODO: Implement dashboard redirect logic
        logger.info("Dashboard view action requested")
        return {"status": "not_implemented", "action": "view_dashboard"}
    
    async def update_check_run_with_results(self, job, repository: str, check_run_id: int, github_token: str):
        """Update GitHub check run with scan results."""
        try:
            # Get scan results from job
            if job.result and "results" in job.result:
                scan_results = job.result["results"]
                vulnerabilities = scan_results.get("vulnerabilities", [])
                
                if vulnerabilities:
                    # Format vulnerabilities for check run
                    output = self.checks_client.format_vulnerability_output(vulnerabilities, scan_results)
                    actions = self.checks_client.get_check_actions(
                        vulnerabilities,
                        auto_fixable_count=sum(1 for v in vulnerabilities if v.get("auto_fixable"))
                    )
                    
                    # Update check run with failure
                    await self.checks_client.update_check_run(
                        repo=repository,
                        check_run_id=check_run_id,
                        status="completed",
                        conclusion="failure",
                        completed_at=datetime.utcnow().isoformat(),
                        output=output,
                        actions=actions,
                        github_token=github_token
                    )
                    logger.info(f"Updated check run {check_run_id} with {len(vulnerabilities)} vulnerabilities")
                else:
                    # Update check run with success
                    await self.checks_client.update_check_run(
                        repo=repository,
                        check_run_id=check_run_id,
                        status="completed",
                        conclusion="success",
                        completed_at=datetime.utcnow().isoformat(),
                        output={
                            "title": "✅ No security issues found",
                            "summary": "Your code passed all security checks!"
                        },
                        github_token=github_token
                    )
                    logger.info(f"Updated check run {check_run_id} with success")
            else:
                logger.warning(f"No scan results found for job {job.id}")
                
        except Exception as e:
            logger.error(f"Failed to update check run with results: {e}", exc_info=True)
