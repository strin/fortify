"""GitHub API client and webhook handling utilities."""

import os
import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

class GitHubClient:
    """Client for interacting with GitHub API."""
    
    def __init__(self, access_token: str = None):
        """Initialize GitHub client with access token."""
        self.access_token = access_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Fortify-Security-Scanner",
        }
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"
    
    async def get_repository_info(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """Get repository information from GitHub API."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}"
                logger.info(f"Fetching repository info: {owner}/{repo}")
                
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 200:
                    repo_info = response.json()
                    logger.info(f"Successfully fetched repo info for {owner}/{repo}")
                    return repo_info
                elif response.status_code == 404:
                    logger.warning(f"Repository not found: {owner}/{repo}")
                    return None
                else:
                    logger.error(f"GitHub API error {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching repository info for {owner}/{repo}: {str(e)}", exc_info=True)
            return None
    
    async def get_pull_request_info(self, owner: str, repo: str, pr_number: int) -> Optional[Dict[str, Any]]:
        """Get pull request information from GitHub API."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
                logger.info(f"Fetching PR info: {owner}/{repo}#{pr_number}")
                
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 200:
                    pr_info = response.json()
                    logger.info(f"Successfully fetched PR info for {owner}/{repo}#{pr_number}")
                    return pr_info
                elif response.status_code == 404:
                    logger.warning(f"Pull request not found: {owner}/{repo}#{pr_number}")
                    return None
                else:
                    logger.error(f"GitHub API error {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching PR info for {owner}/{repo}#{pr_number}: {str(e)}", exc_info=True)
            return None

class GitHubWebhookHandler:
    """Handler for GitHub webhook events."""
    
    def __init__(self):
        """Initialize webhook handler."""
        self.webhook_secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
        if not self.webhook_secret:
            logger.warning("GITHUB_WEBHOOK_SECRET environment variable not set - webhook signature validation will be disabled")
    
    def verify_signature(self, payload_body: bytes, signature_header: str) -> bool:
        """Verify GitHub webhook signature using HMAC-SHA256."""
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured - skipping signature verification")
            return True
            
        if not signature_header:
            logger.error("No signature header provided")
            return False
        
        try:
            # GitHub sends signature as "sha256=<signature>"
            if not signature_header.startswith("sha256="):
                logger.error(f"Invalid signature format: {signature_header}")
                return False
            
            expected_signature = signature_header[7:]  # Remove "sha256=" prefix
            
            # Calculate expected signature
            mac = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload_body,
                hashlib.sha256
            )
            calculated_signature = mac.hexdigest()
            
            # Compare signatures using constant-time comparison
            is_valid = hmac.compare_digest(expected_signature, calculated_signature)
            
            if is_valid:
                logger.info("Webhook signature verification successful")
            else:
                logger.error("Webhook signature verification failed")
                logger.debug(f"Expected: {expected_signature}")
                logger.debug(f"Calculated: {calculated_signature}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}", exc_info=True)
            return False
    
    def parse_webhook_payload(self, payload: Dict[str, Any], event_type: str) -> Optional[Dict[str, Any]]:
        """Parse GitHub webhook payload and extract relevant information."""
        try:
            logger.info(f"Parsing webhook payload for event type: {event_type}")
            
            if event_type == "pull_request":
                return self._parse_pull_request_payload(payload)
            elif event_type == "push":
                return self._parse_push_payload(payload)
            else:
                logger.info(f"Unsupported event type: {event_type}")
                return None
                
        except Exception as e:
            logger.error(f"Error parsing webhook payload: {str(e)}", exc_info=True)
            return None
    
    def _parse_pull_request_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse pull request webhook payload."""
        action = payload.get("action", "")
        pull_request = payload.get("pull_request", {})
        repository = payload.get("repository", {})
        
        # We're interested in PR events that trigger scans
        scan_triggering_actions = ["opened", "synchronize", "reopened"]
        
        logger.info(f"PR action: {action}")
        
        if action not in scan_triggering_actions:
            logger.info(f"PR action '{action}' does not trigger scan")
            return None
        
        parsed_data = {
            "event_type": "pull_request",
            "action": action,
            "repository": {
                "full_name": repository.get("full_name", ""),
                "clone_url": repository.get("clone_url", ""),
                "html_url": repository.get("html_url", ""),
                "default_branch": repository.get("default_branch", "main"),
                "private": repository.get("private", False)
            },
            "pull_request": {
                "number": pull_request.get("number", 0),
                "title": pull_request.get("title", ""),
                "state": pull_request.get("state", ""),
                "head": {
                    "ref": pull_request.get("head", {}).get("ref", ""),
                    "sha": pull_request.get("head", {}).get("sha", ""),
                    "repo": {
                        "clone_url": pull_request.get("head", {}).get("repo", {}).get("clone_url", "")
                    }
                },
                "base": {
                    "ref": pull_request.get("base", {}).get("ref", ""),
                    "sha": pull_request.get("base", {}).get("sha", "")
                },
                "html_url": pull_request.get("html_url", ""),
                "user": {
                    "login": pull_request.get("user", {}).get("login", ""),
                    "html_url": pull_request.get("user", {}).get("html_url", "")
                }
            },
            "sender": {
                "login": payload.get("sender", {}).get("login", ""),
                "html_url": payload.get("sender", {}).get("html_url", "")
            }
        }
        
        logger.info(f"Parsed PR event: {parsed_data['repository']['full_name']} PR #{parsed_data['pull_request']['number']} ({action})")
        return parsed_data
    
    def _parse_push_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse push webhook payload."""
        repository = payload.get("repository", {})
        ref = payload.get("ref", "")
        commits = payload.get("commits", [])
        
        # Extract branch name from ref (refs/heads/branch_name)
        branch = ref.replace("refs/heads/", "") if ref.startswith("refs/heads/") else ""
        
        parsed_data = {
            "event_type": "push",
            "repository": {
                "full_name": repository.get("full_name", ""),
                "clone_url": repository.get("clone_url", ""),
                "html_url": repository.get("html_url", ""),
                "default_branch": repository.get("default_branch", "main"),
                "private": repository.get("private", False)
            },
            "ref": ref,
            "branch": branch,
            "commits": [
                {
                    "id": commit.get("id", ""),
                    "message": commit.get("message", ""),
                    "timestamp": commit.get("timestamp", ""),
                    "author": {
                        "name": commit.get("author", {}).get("name", ""),
                        "email": commit.get("author", {}).get("email", "")
                    },
                    "url": commit.get("url", "")
                }
                for commit in commits[-5:]  # Keep last 5 commits for logging
            ],
            "pusher": {
                "name": payload.get("pusher", {}).get("name", ""),
                "email": payload.get("pusher", {}).get("email", "")
            },
            "sender": {
                "login": payload.get("sender", {}).get("login", ""),
                "html_url": payload.get("sender", {}).get("html_url", "")
            }
        }
        
        logger.info(f"Parsed push event: {parsed_data['repository']['full_name']} to {branch} ({len(commits)} commits)")
        return parsed_data

    async def setup_webhook(self, owner: str, repo: str, webhook_url: str, secret: str) -> Optional[Dict[str, Any]]:
        """Create or update webhook for repository."""
        try:
            async with httpx.AsyncClient() as client:
                # Check if webhook already exists
                existing_webhook = await self._get_existing_webhook(client, owner, repo, webhook_url)
                
                if existing_webhook:
                    logger.info(f"Webhook already exists for {owner}/{repo}")
                    return existing_webhook
                
                # Create new webhook
                url = f"{self.base_url}/repos/{owner}/{repo}/hooks"
                webhook_config = {
                    "name": "web",
                    "active": True,
                    "events": ["pull_request", "push"],
                    "config": {
                        "url": webhook_url,
                        "content_type": "json",
                        "secret": secret,
                        "insecure_ssl": "0"
                    }
                }
                
                logger.info(f"Creating webhook for {owner}/{repo} with URL: {webhook_url}")
                response = await client.post(url, json=webhook_config, headers=self.headers)
                
                if response.status_code == 201:
                    webhook_info = response.json()
                    logger.info(f"Successfully created webhook for {owner}/{repo} with ID: {webhook_info.get('id')}")
                    return webhook_info
                else:
                    logger.error(f"Failed to create webhook for {owner}/{repo}: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error setting up webhook for {owner}/{repo}: {str(e)}", exc_info=True)
            return None

    async def remove_webhook(self, owner: str, repo: str, webhook_id: int) -> bool:
        """Remove webhook from repository."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/hooks/{webhook_id}"
                logger.info(f"Removing webhook {webhook_id} from {owner}/{repo}")
                
                response = await client.delete(url, headers=self.headers)
                
                if response.status_code == 204:
                    logger.info(f"Successfully removed webhook {webhook_id} from {owner}/{repo}")
                    return True
                else:
                    logger.error(f"Failed to remove webhook {webhook_id} from {owner}/{repo}: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error removing webhook from {owner}/{repo}: {str(e)}", exc_info=True)
            return False

    async def get_webhooks(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get all webhooks for repository."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/hooks"
                logger.info(f"Fetching webhooks for {owner}/{repo}")
                
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 200:
                    webhooks = response.json()
                    logger.info(f"Found {len(webhooks)} webhooks for {owner}/{repo}")
                    return webhooks
                else:
                    logger.error(f"Failed to fetch webhooks for {owner}/{repo}: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching webhooks for {owner}/{repo}: {str(e)}", exc_info=True)
            return []

    async def _get_existing_webhook(self, client: httpx.AsyncClient, owner: str, repo: str, webhook_url: str) -> Optional[Dict[str, Any]]:
        """Check if webhook already exists for repository."""
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/hooks"
            response = await client.get(url, headers=self.headers)
            
            if response.status_code == 200:
                hooks = response.json()
                for hook in hooks:
                    if hook.get("config", {}).get("url") == webhook_url:
                        logger.info(f"Found existing webhook for {owner}/{repo}: {hook.get('id')}")
                        return hook
                return None
            else:
                logger.error(f"Failed to fetch existing webhooks for {owner}/{repo}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error checking existing webhooks for {owner}/{repo}: {str(e)}", exc_info=True)
            return None