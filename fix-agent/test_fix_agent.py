#!/usr/bin/env python3
"""
Simple test script to verify fix-agent functionality.
"""

import requests
import json
import time
import sys

def test_fix_agent_api():
    """Test the fix-agent API endpoints."""
    base_url = "http://localhost:8001"
    
    print("🧪 Testing Fix Agent API...")
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print("❌ Health check failed")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to fix-agent server")
        print("   Make sure the server is running: ./start_server.sh")
        return False
    
    # Test queue stats
    try:
        response = requests.get(f"{base_url}/fix/queue/stats")
        if response.status_code == 200:
            print("✅ Queue stats endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print("❌ Queue stats endpoint failed")
    except Exception as e:
        print(f"❌ Queue stats error: {e}")
    
    # Test fix job creation (with mock data)
    sample_fix_job = {
        "type": "FIX_VULNERABILITY",
        "data": {
            "repo_url": "https://github.com/test/repo",
            "branch": "main",
            "vulnerability": {
                "id": "test-vuln-123",
                "title": "Test SQL Injection",
                "description": "Test vulnerability for API testing",
                "severity": "HIGH",
                "category": "INJECTION",
                "filePath": "src/test.js",
                "startLine": 42,
                "codeSnippet": "const query = 'SELECT * FROM users WHERE id = ' + userId;",
                "recommendation": "Use parameterized queries"
            },
            "scan_job_id": "test-scan-456",
            "user_id": "test-user-789"
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/fix/create",
            json=sample_fix_job,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            job_id = result["job_id"]
            print("✅ Fix job creation passed")
            print(f"   Job ID: {job_id}")
            
            # Test getting job status
            time.sleep(1)  # Brief delay
            response = requests.get(f"{base_url}/fix/jobs/{job_id}")
            if response.status_code == 200:
                print("✅ Job status endpoint working")
                job_status = response.json()
                print(f"   Status: {job_status['status']}")
            else:
                print("❌ Job status endpoint failed")
                
        else:
            print("❌ Fix job creation failed")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
    
    except Exception as e:
        print(f"❌ Fix job creation error: {e}")
    
    print("\n🧪 Fix Agent API test completed")
    return True

if __name__ == "__main__":
    success = test_fix_agent_api()
    sys.exit(0 if success else 1)