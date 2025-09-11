#!/usr/bin/env python3
"""
Test script for GitHub webhook proxy integration.

This script tests the complete webhook flow:
GitHub → Next.js Proxy → Scan Agent Server

Run this script to validate the webhook proxy architecture is working correctly.
"""

import json
import hmac
import hashlib
import requests
import os
from datetime import datetime

# Configuration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
SCAN_AGENT_URL = os.environ.get("SCAN_AGENT_URL", "http://localhost:8000") 
GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")

def generate_signature(payload_body: bytes, secret: str) -> str:
    """Generate GitHub webhook signature."""
    mac = hmac.new(secret.encode('utf-8'), payload_body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"

def test_frontend_proxy_health():
    """Test the Next.js proxy health check endpoint."""
    print("🏥 Testing Next.js webhook proxy health...")
    
    try:
        response = requests.get(f"{FRONTEND_URL}/api/webhooks/github", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Frontend proxy health check successful")
            print(f"   Proxy status: {data.get('status', 'unknown')}")
            print(f"   Scan agent URL: {data.get('configuration', {}).get('scan_agent_url', 'unknown')}")
            print(f"   Webhook secret configured: {'✅' if data.get('configuration', {}).get('webhook_secret_configured') else '❌'}")
            print(f"   Scan agent status: {data.get('configuration', {}).get('scan_agent_status', 'unknown')}")
            return True, data.get('configuration', {})
        else:
            print(f"❌ Frontend proxy health check failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False, {}
            
    except Exception as e:
        print(f"❌ Error testing frontend proxy: {e}")
        return False, {}

def test_scan_agent_direct():
    """Test direct connection to scan agent (for comparison)."""
    print("\n🔧 Testing direct scan agent connection...")
    
    try:
        response = requests.post(f"{SCAN_AGENT_URL}/webhooks/github/test", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Direct scan agent connection successful")
            print(f"   Secret configured: {'✅' if data.get('configuration', {}).get('webhook_secret_configured') else '❌'}")
            return True
        else:
            print(f"❌ Direct scan agent connection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to scan agent: {e}")
        return False

def test_proxy_webhook_pr():
    """Test webhook proxy with a sample pull request payload."""
    print("\n🔄 Testing pull request webhook through proxy...")
    
    # Sample PR webhook payload
    payload = {
        "action": "opened",
        "number": 1,
        "repository": {
            "full_name": "test/proxy-repo",
            "clone_url": "https://github.com/test/proxy-repo.git",
            "html_url": "https://github.com/test/proxy-repo",
            "default_branch": "main",
            "private": False
        },
        "pull_request": {
            "number": 1,
            "title": "Test PR via webhook proxy",
            "state": "open",
            "html_url": "https://github.com/test/proxy-repo/pull/1",
            "head": {
                "ref": "feature-proxy-test",
                "sha": "proxy123def456",
                "repo": {
                    "clone_url": "https://github.com/test/proxy-repo.git"
                }
            },
            "base": {
                "ref": "main",
                "sha": "main456abc123"
            },
            "user": {
                "login": "proxy-test-user",
                "html_url": "https://github.com/proxy-test-user"
            }
        },
        "sender": {
            "login": "proxy-test-user",
            "html_url": "https://github.com/proxy-test-user"
        }
    }
    
    # Convert to JSON and generate signature
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "pull_request", 
        "X-GitHub-Delivery": "proxy-test-12345678-1234-5678-9012-123456789abc",
        "User-Agent": "GitHub-Hookshot/proxy-test"
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
            f"{FRONTEND_URL}/api/webhooks/github",
            data=payload_json,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Proxy webhook test successful")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Job ID: {data.get('job_id', 'N/A')}")
            print(f"   Repository: {data.get('repository', 'N/A')}")
            print(f"   Processing time: {data.get('proxy', {}).get('processing_time_ms', 'N/A')}ms")
            print(f"   Proxy version: {data.get('proxy', {}).get('proxy_version', 'N/A')}")
            return True
        else:
            print(f"❌ Proxy webhook test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing proxy webhook: {e}")
        return False

def test_proxy_webhook_push():
    """Test webhook proxy with a sample push payload."""
    print("\n📤 Testing push webhook through proxy...")
    
    # Sample push webhook payload
    payload = {
        "ref": "refs/heads/main",
        "repository": {
            "full_name": "test/proxy-repo",
            "clone_url": "https://github.com/test/proxy-repo.git",
            "html_url": "https://github.com/test/proxy-repo",
            "default_branch": "main",
            "private": False
        },
        "commits": [
            {
                "id": "proxy123def456",
                "message": "Test commit via webhook proxy",
                "timestamp": datetime.now().isoformat(),
                "author": {
                    "name": "Proxy Test User",
                    "email": "proxy-test@example.com"
                },
                "url": "https://github.com/test/proxy-repo/commit/proxy123def456"
            }
        ],
        "pusher": {
            "name": "proxy-test-user",
            "email": "proxy-test@example.com"
        },
        "sender": {
            "login": "proxy-test-user",
            "html_url": "https://github.com/proxy-test-user"
        }
    }
    
    # Convert to JSON and generate signature
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "push",
        "X-GitHub-Delivery": "proxy-push-87654321-4321-8765-2109-987654321cba",
        "User-Agent": "GitHub-Hookshot/proxy-push-test"
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
            f"{FRONTEND_URL}/api/webhooks/github",
            data=payload_json,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Proxy push webhook test successful")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Job ID: {data.get('job_id', 'N/A')}")
            print(f"   Repository: {data.get('repository', 'N/A')}")
            print(f"   Branch: {data.get('branch', 'N/A')}")
            print(f"   Processing time: {data.get('proxy', {}).get('processing_time_ms', 'N/A')}ms")
            return True
        else:
            print(f"❌ Proxy push webhook test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing proxy push webhook: {e}")
        return False

def test_error_handling():
    """Test proxy error handling with invalid requests."""
    print("\n🚨 Testing proxy error handling...")
    
    # Test with invalid signature
    payload = {"test": "invalid"}
    payload_json = json.dumps(payload)
    
    headers = {
        "Content-Type": "application/json",
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": "error-test-12345",
        "X-Hub-Signature-256": "sha256=invalid_signature"
    }
    
    try:
        response = requests.post(
            f"{FRONTEND_URL}/api/webhooks/github",
            data=payload_json,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 403:
            print("✅ Error handling test successful - invalid signature rejected")
            return True
        else:
            print(f"⚠️  Unexpected response to invalid signature: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing error handling: {e}")
        return False

def main():
    """Run all webhook proxy integration tests."""
    print("🔧 Fortify - GitHub Webhook Proxy Integration Test")
    print("=" * 65)
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Scan Agent URL: {SCAN_AGENT_URL}")
    print(f"Webhook Secret: {'✅ Configured' if GITHUB_WEBHOOK_SECRET else '❌ Not set'}")
    print()
    
    # Test results
    results = {}
    
    # 1. Test frontend proxy health
    proxy_health, config = test_frontend_proxy_health()
    results["proxy_health"] = proxy_health
    
    if not proxy_health:
        print("\n❌ Frontend proxy health check failed. Make sure the Next.js server is running.")
        return False
    
    # 2. Test direct scan agent connection
    agent_direct = test_scan_agent_direct() 
    results["agent_direct"] = agent_direct
    
    # 3. Test PR webhook through proxy
    pr_webhook = test_proxy_webhook_pr()
    results["pr_webhook"] = pr_webhook
    
    # 4. Test push webhook through proxy
    push_webhook = test_proxy_webhook_push()
    results["push_webhook"] = push_webhook
    
    # 5. Test error handling
    error_handling = test_error_handling()
    results["error_handling"] = error_handling
    
    # Summary
    print("\n" + "=" * 65)
    print("📊 Test Summary:")
    print(f"   Frontend Proxy Health: {'✅ Pass' if results['proxy_health'] else '❌ Fail'}")
    print(f"   Scan Agent Direct: {'✅ Pass' if results['agent_direct'] else '❌ Fail'}")
    print(f"   PR Webhook Proxy: {'✅ Pass' if results['pr_webhook'] else '❌ Fail'}")
    print(f"   Push Webhook Proxy: {'✅ Pass' if results['push_webhook'] else '❌ Fail'}")
    print(f"   Error Handling: {'✅ Pass' if results['error_handling'] else '❌ Fail'}")
    
    all_passed = all(results.values())
    print(f"\n{'✅ All tests passed!' if all_passed else '❌ Some tests failed.'}")
    
    if all_passed:
        print("\n🎉 GitHub webhook proxy integration is working correctly!")
        print("   You can now configure GitHub webhooks to point to:")
        print(f"   {FRONTEND_URL}/api/webhooks/github")
        print()
        print("   GitHub Webhook Configuration:")
        print(f"   - Payload URL: {FRONTEND_URL}/api/webhooks/github")
        print("   - Content Type: application/json")
        print("   - Events: Pull requests, Pushes")
        print("   - Secret: [Your GITHUB_WEBHOOK_SECRET]")
    else:
        print("\n🔧 Troubleshooting:")
        if not results["proxy_health"]:
            print("   - Ensure Next.js frontend is running on the expected URL")
            print("   - Check environment variables in frontend service")
        if not results["agent_direct"]:
            print("   - Ensure scan agent server is running and accessible")
            print("   - Check SCAN_AGENT_URL configuration in frontend")
        if not results["pr_webhook"] or not results["push_webhook"]:
            print("   - Check webhook secret configuration")
            print("   - Verify scan agent is processing forwarded requests")
    
    return all_passed

if __name__ == "__main__":
    main()