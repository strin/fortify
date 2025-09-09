"""GitHub API client for making authenticated requests."""

import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from .auth import get_auth_service

logger = logging.getLogger(__name__)


class GitHubAPIClient:
    """GitHub API client with authentication and error handling."""

    def __init__(self):
        self.auth_service = get_auth_service()
        self.base_url = "https://api.github.com"

    async def make_request(
        self,
        method: str,
        endpoint: str,
        installation_id: Optional[int] = None,
        github_token: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make authenticated request to GitHub API.

        Args:
            method: HTTP method
            endpoint: GitHub API endpoint
            installation_id: GitHub App installation ID (for app tokens)
            github_token: Direct GitHub OAuth token (alternative to installation_id)
            data: Request body data
            params: Query parameters
        """

        # Get token - either from installation or direct token
        if github_token:
            token = github_token
        elif installation_id:
            token = await self.auth_service.get_installation_token(installation_id)
        else:
            raise ValueError("Either installation_id or github_token must be provided")

        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Fortify-Security-Agent",
        }

        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method, url=url, headers=headers, json=data, params=params
            )

            # Log request for debugging
            logger.debug(f"GitHub API {method} {endpoint}: {response.status_code}")

            if response.status_code >= 400:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    pass

                raise GitHubAPIError(
                    f"GitHub API error: {response.status_code}",
                    status_code=response.status_code,
                    response_data=error_data,
                )

            return response.json() if response.content else {}


class GitHubAPIError(Exception):
    """Exception for GitHub API errors."""

    def __init__(self, message: str, status_code: int, response_data: Dict[str, Any]):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data
