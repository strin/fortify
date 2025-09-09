"""GitHub App authentication service."""

import os
import time
import jwt
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class GitHubAppAuthService:
    """Handle GitHub App authentication and installation token management."""
    
    def __init__(self, app_id: str, private_key: str):
        self.app_id = app_id
        self.private_key = private_key
        self.token_cache: Dict[int, Dict[str, Any]] = {}
    
    def generate_jwt_token(self) -> str:
        """Generate JWT token for GitHub App authentication."""
        now = int(time.time())
        payload = {
            'iat': now,
            'exp': now + 600,  # 10 minutes
            'iss': self.app_id
        }
        
        return jwt.encode(payload, self.private_key, algorithm='RS256')
    
    async def get_installation_token(self, installation_id: int) -> str:
        """Get installation token for a specific GitHub App installation."""
        
        # Check cache first
        if installation_id in self.token_cache:
            cached = self.token_cache[installation_id]
            if datetime.utcnow() < cached['expires_at']:
                return cached['token']
        
        # Generate new token
        jwt_token = self.generate_jwt_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.github.com/app/installations/{installation_id}/access_tokens",
                headers={
                    'Authorization': f'Bearer {jwt_token}',
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Fortify-Security-Agent'
                }
            )
            
            if response.status_code != 201:
                error_data = response.json() if response.status_code != 500 else {}
                raise Exception(f"Failed to get installation token: {response.status_code} - {error_data}")
            
            token_data = response.json()
            
            # Cache the token
            expires_at = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
            self.token_cache[installation_id] = {
                'token': token_data['token'],
                'expires_at': expires_at - timedelta(minutes=5)  # Refresh 5 min early
            }
            
            return token_data['token']
    
    def clear_cache(self, installation_id: Optional[int] = None):
        """Clear token cache for specific installation or all installations."""
        if installation_id:
            self.token_cache.pop(installation_id, None)
        else:
            self.token_cache.clear()


# Global auth service instance
_auth_service = None


def get_auth_service() -> GitHubAppAuthService:
    """Get or create the global GitHub App auth service."""
    global _auth_service
    
    if _auth_service is None:
        app_id = os.environ.get('GITHUB_APP_ID')
        private_key = os.environ.get('GITHUB_APP_PRIVATE_KEY')
        
        if not app_id or not private_key:
            raise ValueError("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables are required")
        
        _auth_service = GitHubAppAuthService(app_id, private_key)
    
    return _auth_service
