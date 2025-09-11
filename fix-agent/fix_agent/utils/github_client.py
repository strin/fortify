"""GitHub API client for creating PRs and managing fix operations."""

import os
import json
import logging
import base64
from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class GitHubFixClient:
    """Client for interacting with GitHub API for fix operations."""

    def __init__(self, access_token: str = None):
        """Initialize GitHub client with access token."""
        self.access_token = access_token or os.environ.get("GITHUB_ACCESS_TOKEN")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Fortify-Fix-Agent",
        }
        if self.access_token:
            self.headers["Authorization"] = f"Bearer {self.access_token}"

    async def get_repository_info(
        self, owner: str, repo: str
    ) -> Optional[Dict[str, Any]]:
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
                    logger.error(
                        f"GitHub API error {response.status_code}: {response.text}"
                    )
                    return None

        except Exception as e:
            logger.error(
                f"Error fetching repository info for {owner}/{repo}: {str(e)}",
                exc_info=True,
            )
            return None

    async def create_branch(
        self, owner: str, repo: str, branch_name: str, base_branch: str = "main"
    ) -> Optional[Dict[str, Any]]:
        """Create a new branch from base branch."""
        try:
            async with httpx.AsyncClient() as client:
                # First get the SHA of the base branch
                base_url = f"{self.base_url}/repos/{owner}/{repo}/git/refs/heads/{base_branch}"
                response = await client.get(base_url, headers=self.headers)
                
                if response.status_code != 200:
                    logger.error(f"Failed to get base branch {base_branch}: {response.text}")
                    return None
                
                base_sha = response.json()["object"]["sha"]
                
                # Create new branch
                create_url = f"{self.base_url}/repos/{owner}/{repo}/git/refs"
                create_data = {
                    "ref": f"refs/heads/{branch_name}",
                    "sha": base_sha
                }
                
                response = await client.post(
                    create_url, 
                    headers=self.headers,
                    json=create_data
                )
                
                if response.status_code == 201:
                    logger.info(f"Successfully created branch {branch_name}")
                    return response.json()
                else:
                    logger.error(f"Failed to create branch: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error creating branch {branch_name}: {str(e)}")
            return None

    async def update_file(
        self,
        owner: str,
        repo: str,
        file_path: str,
        content: str,
        message: str,
        branch: str,
        sha: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a file in the repository."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/contents/{file_path}"
                
                # Get current file info if SHA not provided
                if not sha:
                    get_response = await client.get(
                        f"{url}?ref={branch}", 
                        headers=self.headers
                    )
                    if get_response.status_code == 200:
                        sha = get_response.json()["sha"]
                    elif get_response.status_code != 404:
                        logger.error(f"Error getting file info: {get_response.text}")
                        return None

                # Encode content to base64
                encoded_content = base64.b64encode(content.encode()).decode()
                
                data = {
                    "message": message,
                    "content": encoded_content,
                    "branch": branch
                }
                
                if sha:
                    data["sha"] = sha
                
                response = await client.put(url, headers=self.headers, json=data)
                
                if response.status_code in [200, 201]:
                    logger.info(f"Successfully updated file {file_path}")
                    return response.json()
                else:
                    logger.error(f"Failed to update file: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error updating file {file_path}: {str(e)}")
            return None

    async def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main"
    ) -> Optional[Dict[str, Any]]:
        """Create a pull request."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/pulls"
                
                data = {
                    "title": title,
                    "body": body,
                    "head": head_branch,
                    "base": base_branch
                }
                
                response = await client.post(url, headers=self.headers, json=data)
                
                if response.status_code == 201:
                    pr_info = response.json()
                    logger.info(f"Successfully created PR #{pr_info['number']}: {title}")
                    return pr_info
                else:
                    logger.error(f"Failed to create PR: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error creating pull request: {str(e)}")
            return None

    async def get_file_content(
        self, owner: str, repo: str, file_path: str, branch: str = "main"
    ) -> Optional[Dict[str, Any]]:
        """Get file content from repository."""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/repos/{owner}/{repo}/contents/{file_path}"
                response = await client.get(
                    f"{url}?ref={branch}", 
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    file_info = response.json()
                    # Decode base64 content
                    content = base64.b64decode(file_info["content"]).decode()
                    file_info["decoded_content"] = content
                    return file_info
                elif response.status_code == 404:
                    logger.warning(f"File not found: {file_path}")
                    return None
                else:
                    logger.error(f"Error getting file: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting file {file_path}: {str(e)}")
            return None

    def parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """Parse GitHub repository URL to extract owner and repo name."""
        # Handle both HTTPS and SSH URLs
        if repo_url.startswith("git@github.com:"):
            # SSH format: git@github.com:owner/repo.git
            repo_path = repo_url.replace("git@github.com:", "")
        elif "github.com/" in repo_url:
            # HTTPS format: https://github.com/owner/repo.git
            repo_path = repo_url.split("github.com/")[1]
        else:
            raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
        
        # Remove .git suffix if present
        if repo_path.endswith(".git"):
            repo_path = repo_path[:-4]
        
        owner, repo = repo_path.split("/", 1)
        return owner, repo