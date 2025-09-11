#!/usr/bin/env python3
"""
Test script for GitHub webhook integration.

This script demonstrates how to test the webhook integration and provides
examples of webhook payloads for testing purposes.
"""

import json
import hmac
import hashlib
import requests
import os
from datetime import datetime

# Configuration
SCAN_AGENT_URL = os.environ.get("SCAN_AGENT_URL", "http://localhost:8000")
GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")

def generate_signature(payload_body: bytes, secret: str) -> str:
    """Generate GitHub webhook signature."""
    mac = hmac.new(secret.encode('utf-8'), payload_body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"

def test_webhook_endpoint():
    """Test the webhook configuration endpoint."""
    print("🧪 Testing webhook configuration...")
    
    try:
        response = requests.post(f"{SCAN_AGENT_URL}/webhooks/github/test")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Webhook test endpoint successful")
            print(f"   Secret configured: {'✅' if data['configuration']['webhook_secret_configured'] else '❌'}")
            print(f"   GitHub client initialized: {'✅' if data['configuration']['github_client_initialized'] else '❌'}")
            print(f"   Webhook handler initialized: {'✅' if data['configuration']['webhook_handler_initialized'] else '❌'}")
            return True
        else:
            print(f"❌ Test endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing webhook endpoint: {e}")
        return False

def test_pull_request_webhook():
    """Test webhook with a sample pull request payload."""
    print("\n🔍 Testing pull request webhook...")
    
    # Sample PR webhook payload (simplified)
    payload = {
        "action": "opened",
        "number": 1,
        "repository": {
            "full_name": "test/repo",
            "clone_url": "https://github.com/test/repo.git",
            "html_url": "https://github.com/test/repo",
            "default_branch": "main",
            "private": False
        },
        "pull_request": {
            "number": 1,
            "title": "Test PR for webhook integration",
            "state": "open",
            "html_url": "https://github.com/test/repo/pull/1",
            "head": {
                "ref": "feature-branch",
                "sha": "abc123def456",
                "repo": {
                    "clone_url": "https://github.com/test/repo.git"
                }
            },
            "base": {
                "ref": "main",
                "sha": "def456abc123"
            },
            "user": {
                "login": "test-user",
                "html_url": "https://github.com/test-user"
            }
        },
        "sender": {
            "login": "test-user",
            "html_url": "https://github.com/test-user"
        }
    }
    
    # Convert to JSON and generate signature
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": "12345678-1234-5678-9012-123456789abc",
        "User-Agent": "GitHub-Hookshot/abc123"
    }
    
    # Add signature if secret is configured
    if GITHUB_WEBHOOK_SECRET:
        signature = generate_signature(payload_bytes, GITHUB_WEBHOOK_SECRET)
        headers["X-Hub-Signature-256"] = signature
        print("   ✅ Adding webhook signature for validation")
    else:
        print("   ⚠️  No webhook secret configured - signature validation disabled")
    
    try:
        response = requests.post(
            f"{SCAN_AGENT_URL}/webhooks/github",
            data=payload_json,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Pull request webhook successful")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Job ID: {data.get('job_id', 'N/A')}")
            print(f"   Repository: {data.get('repository', 'N/A')}")
            return True
        else:
            print(f"❌ Webhook failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing webhook: {e}")
        return False

def test_push_webhook():
    """Test webhook with a sample push payload."""
    print("\n📤 Testing push webhook...")
    
    # Sample push webhook payload (simplified)
    payload = {
        "ref": "refs/heads/main",
        "repository": {
            "full_name": "test/repo",
            "clone_url": "https://github.com/test/repo.git",
            "html_url": "https://github.com/test/repo",
            "default_branch": "main",
            "private": False
        },
        "commits": [
            {
                "id": "abc123def456",
                "message": "Fix security vulnerability",
                "timestamp": datetime.now().isoformat(),
                "author": {
                    "name": "Test User",
                    "email": "test@example.com"
                },
                "url": "https://github.com/test/repo/commit/abc123def456"
            }
        ],
        "pusher": {
            "name": "test-user",
            "email": "test@example.com"
        },
        "sender": {
            "login": "test-user",
            "html_url": "https://github.com/test-user"
        }
    }
    
    # Convert to JSON and generate signature
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "push",
        "X-GitHub-Delivery": "87654321-4321-8765-2109-987654321cba",
        "User-Agent": "GitHub-Hookshot/def456"
    }
    
    # Add signature if secret is configured
    if GITHUB_WEBHOOK_SECRET:
        signature = generate_signature(payload_bytes, GITHUB_WEBHOOK_SECRET)
        headers["X-Hub-Signature-256"] = signature
        print("   ✅ Adding webhook signature for validation")
    else:
        print("   ⚠️  No webhook secret configured - signature validation disabled")
    
    try:
        response = requests.post(
            f"{SCAN_AGENT_URL}/webhooks/github",
            data=payload_json,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Push webhook successful")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Job ID: {data.get('job_id', 'N/A')}")
            print(f"   Repository: {data.get('repository', 'N/A')}")
            print(f"   Branch: {data.get('branch', 'N/A')}")
            return True
        else:
            print(f"❌ Push webhook failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing push webhook: {e}")
        return False

def main():
    """Run all webhook integration tests."""
    print("🔧 Fortify Scan Agent - GitHub Webhook Integration Test")
    print("=" * 60)
    print(f"Scan Agent URL: {SCAN_AGENT_URL}")
    print(f"Webhook Secret: {'✅ Configured' if GITHUB_WEBHOOK_SECRET else '❌ Not set'}")
    print()
    
    # Test configuration endpoint
    config_test = test_webhook_endpoint()
    
    if not config_test:
        print("\n❌ Configuration test failed. Make sure the scan agent is running.")
        return False
    
    # Test PR webhook
    pr_test = test_pull_request_webhook()
    
    # Test push webhook
    push_test = test_push_webhook()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    print(f"   Configuration Test: {'✅ Pass' if config_test else '❌ Fail'}")
    print(f"   Pull Request Test: {'✅ Pass' if pr_test else '❌ Fail'}")
    print(f"   Push Event Test: {'✅ Pass' if push_test else '❌ Fail'}")
    
    all_passed = config_test and pr_test and push_test
    print(f"\n{'✅ All tests passed!' if all_passed else '❌ Some tests failed.'}")
    
    if all_passed:
        print("\n🎉 GitHub webhook integration is working correctly!")
        print("   You can now configure GitHub webhooks to point to:")
        print(f"   {SCAN_AGENT_URL}/webhooks/github")
    
    return all_passed

if __name__ == "__main__":
    main()