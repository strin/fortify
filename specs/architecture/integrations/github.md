# GitHub Integration Architecture

> **Version:** v1.0  
> **Status:** Design  
> **Target Release:** Q2 2025  
> **Team:** Fortify Security Platform  

---

## 1. Executive Summary

### Architecture Overview
The GitHub Integration Architecture enables seamless integration between Fortify's security platform and GitHub's ecosystem, supporting both OAuth-based user authentication and GitHub App-based repository management. This architecture powers direct PR security integration using GitHub Checks API, providing real-time vulnerability scanning without requiring GitHub Actions workflows.

### Key Capabilities
- **GitHub OAuth Integration**: User authentication and repository access
- **GitHub App Framework**: Organization-level installation and management
- **Webhook Processing**: Real-time event handling for PR workflows
- **GitHub Checks API Integration**: Rich PR status reporting with annotations and actions
- **Direct Scan Integration**: Webhook-triggered security scanning via scan-agent
- **Security Model**: Token management and permission scoping

---

## 2. Integration Components

### 2.1 GitHub OAuth Provider

#### Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Fortify App
    participant G as GitHub OAuth
    participant D as Database
    
    U->>F: Click "Sign in with GitHub"
    F->>G: Redirect to OAuth authorize
    G->>U: User grants permissions
    G->>F: Return with auth code
    F->>G: Exchange code for access token
    G->>F: Return access token + user info
    F->>D: Store/update user + token
    F->>U: Redirect to dashboard
```

#### OAuth Configuration
- **Client Credentials**: GitHub OAuth App registration required
- **Scopes**: Defined based on feature requirements
- **Redirect Handling**: Secure callback URL processing
- **Token Exchange**: Authorization code to access token flow

#### Required OAuth Scopes
- `read:user` - Read user profile information
- `user:email` - Access user email addresses
- `public_repo` - Access public repositories
- `repo` - Full repository access (for private repos)
- `admin:repo_hook` - Create and manage webhooks

### 2.2 GitHub App Architecture

#### Dual Installation Flow Support

The architecture supports two primary installation flows:

**Flow 1: Fortify Onboarding (Post-Scan Installation)**
```mermaid
sequenceDiagram
    participant U as User
    participant F as Fortify App
    participant G as GitHub
    participant W as Webhook
    participant D as Database
    
    U->>F: Complete free scan
    F->>U: Show "Enable PR Protection" CTA
    U->>F: Click install button
    F->>G: Redirect to GitHub App installation
    G->>U: Select repositories & grant permissions
    G->>W: Send installation webhook
    W->>D: Store installation data
    W->>F: Link installation to user account
    F->>G: Enable branch protection with checks
    F->>U: Show success confirmation
```

**Flow 2: GitHub Marketplace Installation**
```mermaid
sequenceDiagram
    participant U as User
    participant GM as GitHub Marketplace
    participant G as GitHub
    participant W as Webhook
    participant F as Fortify App
    participant D as Database
    
    U->>GM: Browse GitHub Marketplace
    GM->>U: Show Fortify App
    U->>G: Install Fortify App
    G->>U: Select repositories & permissions
    G->>W: Send installation webhook
    W->>D: Store installation data
    W->>F: Trigger user account creation/linking
    F->>U: Redirect to Fortify onboarding
    U->>F: Complete account setup
    F->>G: Enable repository features
```

#### Installation Flow Comparison
| Aspect                   | Fortify Onboarding             | GitHub Marketplace             |
| ------------------------ | ------------------------------ | ------------------------------ |
| **Entry Point**          | Post-scan CTA in Fortify       | GitHub Marketplace             |
| **User Context**         | Has seen vulnerability results | Discovering security tools     |
| **Account Status**       | Existing Fortify account       | May need account creation      |
| **Repository Selection** | Pre-selected from scan         | User chooses repositories      |
| **Workflow Setup**       | Immediate after installation   | Requires onboarding completion |

#### App Permissions Required

**Repository Permissions:**
- `contents: read` - Access repository contents for scanning
- `metadata: read` - Access repository metadata
- `pull_requests: write` - Create PR comments and reviews
- `checks: write` - Create and update check runs for PR blocking

**Organization Permissions:**
- `members: read` - Read organization membership (optional)

**Webhook Events:**
- `pull_request` - PR creation, updates, and merges
- `check_run` - Check run re-run requests and actions
- `installation` - App installation lifecycle
- `installation_repositories` - Repository selection changes

### 2.3 Webhook Event Processing

#### Webhook Architecture
```mermaid
graph LR
    A[GitHub Webhook] --> B[Webhook Receiver]
    B --> C[Event Validator]
    C --> D[Event Router]
    
    D --> E[PR Event Handler]
    D --> F[Installation Handler]
    D --> G[Check Run Handler]
    
    E --> H[Create Check Run & Trigger Scan]
    F --> I[Update Installation]
    G --> J[Handle Re-run & Actions]
```

#### Event Handler Architecture

**Webhook Receiver:**
- **Signature Validation**: Verify webhook authenticity using GitHub's signature
- **Event Routing**: Direct events to appropriate handlers based on event type
- **Error Handling**: Graceful failure handling with retry mechanisms
- **Logging**: Comprehensive event logging for debugging and monitoring

**Event Handlers:**
- **Pull Request Handler**: Process PR events to create check runs and trigger security scans
- **Installation Handler**: Manage app installation lifecycle events
- **Check Run Handler**: Handle check run re-runs, custom actions, and user interactions
- **Repository Handler**: Handle repository selection and permission changes

**Event Processing Flow:**
1. **Receive Webhook** → Validate signature and extract metadata
2. **Store Event** → Log event for processing and audit trail
3. **Route Event** → Direct to appropriate handler based on event type
4. **Process Event** → Execute business logic for event type
5. **Update Status** → Mark event as processed or failed

---

## 3. Data Models and Schema

### 3.1 Enhanced Database Schema

#### GitHub Integration Data Models

**GitHub Installations Table:**
- **Installation Tracking**: Store GitHub App installation metadata
- **Account Association**: Link installations to GitHub accounts (User/Organization)
- **Permission Management**: Track granted permissions and events
- **Status Tracking**: Monitor installation lifecycle (active, suspended, deleted)
- **Repository Selection**: Track whether all or selected repositories are included

**GitHub Repositories Table:**
- **Repository Metadata**: Store GitHub repository information and settings
- **Fortify Configuration**: Repository-specific scanning and workflow settings
- **Branch Protection**: Track branch protection rule status
- **Sync Status**: Monitor last synchronization with GitHub API

**Webhook Events Table:**
- **Event Logging**: Comprehensive log of all webhook events received
- **Processing Status**: Track event processing state (pending, processed, failed)
- **Context Preservation**: Store PR, repository, and installation context
- **Audit Trail**: Maintain event payload for debugging and compliance

**Check Run Tracking Table:**
- **Check Run History**: Monitor all Fortify check runs and their results
- **Configuration Storage**: Store scan configuration and customizations per repository
- **Execution Status**: Track check run status and completion times
- **Action Tracking**: Handle custom action execution and user interactions

#### Schema Integration Points

**Extended User Model:**
- **GitHub OAuth Integration**: Store encrypted GitHub access tokens
- **GitHub Profile Linking**: Associate GitHub username and profile data
- **Installation Relationships**: Link users to their GitHub App installations

**Enhanced Scan Job Model:**
- **GitHub Context**: Store PR number, head/base SHA for PR-triggered scans
- **Installation Tracking**: Link scans to specific GitHub App installations
- **Repository Metadata**: Associate scans with specific repositories and branches

**Relationship Architecture:**
- **User ↔ GitHub Installation**: Many-to-many relationship for organization access
- **Installation ↔ Repositories**: One-to-many for repository management
- **Repository ↔ Check Runs**: One-to-many for check run tracking
- **Scan Jobs ↔ GitHub Context**: Enhanced scan jobs with GitHub metadata and check run IDs

---

## 4. API Integration Patterns

### 4.1 GitHub REST API Integration

#### API Client Architecture

**Centralized API Client:**
- **Authentication Management**: Handle OAuth tokens and GitHub App installation tokens
- **Request/Response Handling**: Standardized request formatting and response parsing
- **Error Handling**: Comprehensive error handling with retry logic and rate limiting
- **Rate Limit Management**: Respect GitHub API rate limits with intelligent backoff

**Key Design Principles:**
- **Single Responsibility**: Dedicated client for GitHub API interactions
- **Resilience**: Automatic retry with exponential backoff for transient failures
- **Security**: Secure token handling and transmission
- **Observability**: Comprehensive logging and metrics collection

**Error Handling Strategy:**
- **Retry Logic**: Exponential backoff for 5xx errors and rate limits
- **Circuit Breaker**: Prevent cascading failures during GitHub API outages
- **Graceful Degradation**: Fallback behaviors when API is unavailable
- **Error Classification**: Distinguish between retryable and non-retryable errors

#### Repository Operations Service

**Core Repository Functions:**
- **Repository Information**: Fetch repository metadata, settings, and configuration
- **Repository Listing**: List user/organization repositories with filtering and pagination
- **File Management**: Create, update, and manage repository files (especially workflow files)
- **Branch Operations**: Manage branches, protection rules, and status checks

**Check Run Management:**
- **Dynamic Creation**: Create check runs for PR events with appropriate status
- **Status Updates**: Handle real-time status updates as scans progress
- **Rich Formatting**: Format vulnerability data into check run annotations and actions
- **Action Handling**: Process custom action button clicks from check runs

**Branch Protection Management:**
- **Protection Rules**: Configure required status checks and review requirements
- **Status Check Integration**: Set up Fortify security scans as required checks
- **Administrative Controls**: Manage admin enforcement and bypass permissions
- **Compliance Settings**: Ensure branch protection meets security requirements

### 4.2 GitHub App Authentication

#### Installation Token Management Architecture

**JWT Token Generation:**
- **App Authentication**: Generate JWT tokens using GitHub App private key
- **Token Lifecycle**: Short-lived JWT tokens (10 minutes) for app authentication
- **Security**: Secure private key storage and handling
- **Validation**: Proper token claims and expiration management

**Installation Token Caching:**
- **Token Cache**: Cache installation tokens to reduce API calls
- **Expiration Handling**: Automatic token refresh before expiration
- **Cache Strategy**: In-memory cache with TTL-based invalidation
- **Fallback Mechanism**: Graceful handling of cache misses and token failures

**Authentication Flow:**
1. **Generate JWT** → Create app-level authentication token
2. **Request Installation Token** → Exchange JWT for installation-specific token
3. **Cache Token** → Store token with expiration metadata
4. **Use Token** → Make API requests with installation token
5. **Refresh on Expiry** → Automatic token refresh before expiration

---

## 5. Dual Installation Flow Architecture

### 5.1 Installation Flow Support

The GitHub integration architecture fully supports both installation methods:

#### Flow 1: Fortify Onboarding Installation

**Context**: User has completed a free scan and sees vulnerability results
**Entry Point**: "Install GitHub Actions" CTA in scan results page
**User State**: Authenticated Fortify user with scan context

**Installation Process:**
1. **Pre-Installation Setup**: Store scan context and repository information
2. **GitHub App Redirect**: Direct user to GitHub App installation with pre-selected repository
3. **Installation Webhook**: Receive installation confirmation from GitHub
4. **Account Linking**: Associate GitHub installation with existing Fortify user account
5. **Automatic Protection Setup**: Enable branch protection with Fortify check requirements
6. **Success Confirmation**: Show user that PR protection is now active

**Key Benefits:**
- **Contextual**: User understands value after seeing scan results
- **Streamlined**: Pre-selected repository based on scan
- **Immediate Value**: Protection setup happens automatically
- **High Conversion**: User is already engaged and sees clear benefit

#### Flow 2: GitHub Marketplace Installation

**Context**: User discovers Fortify through GitHub Marketplace
**Entry Point**: GitHub Marketplace listing and installation
**User State**: May or may not have existing Fortify account

**Installation Process:**
1. **Marketplace Discovery**: User finds Fortify in GitHub Marketplace
2. **GitHub App Installation**: User installs app and selects repositories
3. **Installation Webhook**: Receive installation confirmation from GitHub
4. **Account Resolution**: Check for existing Fortify account or create new one
5. **Onboarding Flow**: Guide user through Fortify platform setup
6. **Repository Configuration**: Allow user to configure scanning for selected repositories

**Key Benefits:**
- **Discovery**: Reaches users actively looking for security tools
- **GitHub Native**: Feels natural within GitHub ecosystem
- **Flexible**: User can select multiple repositories
- **Trust**: GitHub Marketplace provides credibility

### 5.2 Installation Flow Handling Architecture

#### Webhook Event Differentiation

**Installation Source Detection:**
- **Setup Action Parameter**: GitHub provides `setup_action` in webhook payload
- **Referrer Tracking**: Track installation source through URL parameters
- **User Context**: Check for existing authenticated Fortify sessions
- **Repository Context**: Detect if installation matches recent scan activity

**Flow-Specific Processing:**

**Fortify Onboarding Flow:**
```mermaid
graph TD
    A[User Clicks Install CTA] --> B[Store Installation Request]
    B --> C[Redirect to GitHub App]
    C --> D[User Selects Repository]
    D --> E[GitHub Sends Installation Webhook]
    E --> F[Match to Pending Request]
    F --> G[Link to User Account]
    G --> H[Auto-Create Workflows]
    H --> I[Show Success Page]
```

**Marketplace Installation Flow:**
```mermaid
graph TD
    A[User Finds App in Marketplace] --> B[Install GitHub App]
    B --> C[Select Repositories]
    C --> D[GitHub Sends Installation Webhook]
    D --> E{Existing User?}
    E -->|Yes| F[Link to Account]
    E -->|No| G[Create Pending Account]
    F --> H[Send Welcome Notification]
    G --> I[Send Onboarding Invitation]
    H --> J[Configure Repositories]
    I --> J
```

### 5.3 Account Linking and User Management

#### User Account Resolution

**Existing User Scenarios:**
- **GitHub Username Match**: Link installation to user with matching GitHub username
- **Email Address Match**: Link installation to user with matching email
- **OAuth Token Match**: Link installation to user with existing GitHub OAuth

**New User Scenarios:**
- **Pending Account Creation**: Create incomplete user record pending onboarding
- **Onboarding Invitation**: Send email invitation to complete account setup
- **Progressive Registration**: Allow partial feature access during onboarding

#### Installation-User Relationship Management

**Data Model Relationships:**
- **User-Installation Mapping**: Many-to-many relationship for organization access
- **Installation Ownership**: Track primary contact for each installation
- **Permission Inheritance**: Manage repository access based on GitHub permissions
- **Team Access**: Support organization-wide installations with team-based access

### 5.4 Repository Configuration Management

#### Post-Installation Repository Setup

**Fortify Onboarding Flow:**
- **Automatic Configuration**: Use scan results to pre-configure repository settings
- **Immediate Protection Setup**: Enable branch protection with Fortify check requirements
- **Repository Integration**: Configure repository for automatic security scanning
- **Scan History Integration**: Link existing scan results to repository configuration

**Marketplace Installation Flow:**
- **Repository Discovery**: Analyze selected repositories for language and framework detection
- **Configuration Wizard**: Guide user through repository-specific security settings
- **Bulk Configuration**: Allow configuration of multiple repositories simultaneously
- **Gradual Activation**: Enable features progressively as user completes setup

### 5.5 Security Model

#### Token Security and Permission Management

**Token Encryption and Storage:**
- **Encryption at Rest**: All GitHub tokens encrypted before database storage
- **Key Management**: Secure encryption key management with rotation capabilities
- **Access Control**: Restricted token access with audit logging
- **Token Lifecycle**: Automatic token refresh and expiration handling

**Permission Validation Framework:**
- **OAuth Scope Validation**: Verify user tokens have required permissions
- **Installation Permission Checks**: Validate GitHub App installation permissions
- **Dynamic Permission Assessment**: Real-time permission checking before operations
- **Permission Degradation**: Graceful handling when permissions are insufficient

**Security Best Practices:**
- **Principle of Least Privilege**: Request minimal required permissions
- **Token Rotation**: Regular token refresh and rotation policies
- **Audit Logging**: Comprehensive logging of all permission-related operations
- **Error Handling**: Secure error messages that don't leak sensitive information

---

## 6. GitHub Checks API Integration

### 6.1 Check Run Management

#### GitHub Checks API Client
```python
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

class GitHubChecksClient:
    """GitHub Checks API client for Fortify security scanning"""
    
    def __init__(self, api_client: GitHubAPIClient):
        self.api = api_client
    
    async def create_check_run(
        self,
        installation_id: int,
        repo: str,
        head_sha: str,
        name: str = "Fortify Security Scan",
        status: str = "in_progress",
        started_at: Optional[str] = None,
        output: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new check run for a commit"""
        
        token = await self.api.get_installation_token(installation_id)
        
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
            token,
            data=check_data
        )
        
        return result
    
    async def update_check_run(
        self,
        installation_id: int,
        repo: str,
        check_run_id: int,
        status: str = "completed",
        conclusion: Optional[str] = None,
        completed_at: Optional[str] = None,
        output: Optional[Dict[str, Any]] = None,
        actions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Update an existing check run with results"""
        
        token = await self.api.get_installation_token(installation_id)
        
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
            token,
            data=update_data
        )
        
        return result
    
    def format_vulnerability_output(
        self,
        vulnerabilities: List[Dict[str, Any]],
        scan_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format vulnerability data for GitHub Checks output"""
        
        if not vulnerabilities:
            return {
                "title": "✅ No security issues found",
                "summary": "Your code passed all security checks!",
                "text": "Fortify found no security vulnerabilities in your code changes."
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
            annotations.append({
                "path": vuln["filePath"],
                "start_line": vuln["startLine"],
                "end_line": vuln.get("endLine", vuln["startLine"]),
                "annotation_level": level,
                "title": vuln["title"],
                "message": f"{vuln['description']}\n\n**Recommendation:** {vuln['recommendation']}"
            })
        
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
            "annotations": annotations
        }
    
    def get_check_actions(
        self,
        vulnerabilities: List[Dict[str, Any]],
        auto_fixable_count: int = 0
    ) -> List[Dict[str, Any]]:
        """Generate action buttons for check run"""
        
        actions = []
        
        if auto_fixable_count > 0:
            actions.append({
                "label": f"🔧 Apply {auto_fixable_count} Auto-fixes",
                "description": f"Automatically fix {auto_fixable_count} security issues",
                "identifier": "apply_fixes"
            })
        
        actions.extend([
            {
                "label": "🔄 Re-run Security Scan",
                "description": "Run the security scan again",
                "identifier": "rerun_scan"
            },
            {
                "label": "📊 View Dashboard",
                "description": "Open Fortify security dashboard",
                "identifier": "view_dashboard"
            }
        ])
        
        return actions
```

### 6.2 Branch Protection Management

#### Automated Branch Protection Setup
```python
class BranchProtectionService:
    """Manage GitHub branch protection rules"""
    
    def __init__(self, api_client: GitHubAPIClient):
        self.api = api_client
    
    async def setup_fortify_protection(
        self,
        token: str,
        owner: str,
        repo: str,
        branch: str = "main",
        additional_checks: List[str] = None
    ) -> Dict[str, Any]:
        """Setup branch protection with Fortify requirements"""
        
        required_checks = ["Fortify Security Scan"]
        if additional_checks:
            required_checks.extend(additional_checks)
        
        protection_config = {
            "required_status_checks": {
                "strict": True,
                "checks": [{"context": check} for check in required_checks]
            },
            "enforce_admins": False,
            "required_pull_request_reviews": {
                "required_approving_review_count": 1,
                "dismiss_stale_reviews": True,
                "require_code_owner_reviews": False
            },
            "restrictions": None,
            "allow_force_pushes": False,
            "allow_deletions": False
        }
        
        try:
            result = await self.api.make_request(
                "PUT",
                f"/repos/{owner}/{repo}/branches/{branch}/protection",
                token,
                data=protection_config
            )
            
            # Update repository record
            await prisma.gitHubRepository.update(
                where={"fullName": f"{owner}/{repo}"},
                data={"branchProtectionEnabled": True}
            )
            
            return {"success": True, "protection": result}
            
        except GitHubAPIError as e:
            return {"success": False, "error": str(e)}
```

---

## 7. Event Processing Pipeline

### 7.1 Webhook Event Processing

#### Event Processing Architecture
```mermaid
graph TD
    A[GitHub Webhook] --> B[Webhook Receiver]
    B --> C[Signature Validation]
    C --> D[Event Storage]
    D --> E[Event Processor]
    
    E --> F{Event Type}
    F -->|pull_request| G[PR Event Handler]
    F -->|check_run| H[Check Run Handler]
    F -->|installation| I[Installation Handler]
    
    G --> J[Create Check Run]
    J --> K[Call Scan Agent API]
    K --> L[Update Check Run with Results]
    
    H --> M[Handle Re-run/Actions]
    M --> N[Trigger New Scan]
    
    I --> O[Update Installation Data]
```

#### Event Processing Implementation
```python
import asyncio
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

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

class WebhookEventProcessor:
    """Process GitHub webhook events asynchronously"""
    
    def __init__(self):
        self.handlers = {
            "pull_request": self.handle_pull_request,
            "check_run": self.handle_check_run,
            "installation": self.handle_installation,
            "installation_repositories": self.handle_installation_repositories
        }
        self.checks_client = GitHubChecksClient(GitHubAPIClient())
        self.scan_agent_client = ScanAgentClient()
    
    async def process_event(self, event: WebhookEvent):
        """Process webhook event with error handling and logging"""
        
        # Store event in database
        db_event = await prisma.gitHubWebhookEvent.create(
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
        
        try:
            # Update status to processing
            await prisma.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={"status": EventStatus.PROCESSING.value}
            )
            
            # Get handler for event type
            handler = self.handlers.get(event.event_type)
            if not handler:
                raise ValueError(f"No handler for event type: {event.event_type}")
            
            # Process event
            await handler(event)
            
            # Mark as completed
            await prisma.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={
                    "status": EventStatus.COMPLETED.value,
                    "processedAt": datetime.utcnow()
                }
            )
            
        except Exception as e:
            # Mark as failed with error message
            await prisma.gitHubWebhookEvent.update(
                where={"id": db_event.id},
                data={
                    "status": EventStatus.FAILED.value,
                    "errorMessage": str(e),
                    "processedAt": datetime.utcnow()
                }
            )
            
            # Log error for monitoring
            logger.error(f"Failed to process webhook event {event.delivery_id}: {e}")
            raise
    
    async def handle_pull_request(self, event: WebhookEvent):
        """Handle pull request events by creating check runs and triggering scans"""
        action = event.event_action
        payload = event.payload
        
        if action not in ["opened", "synchronize", "reopened"]:
            return
        
        # Extract PR information
        pr_data = {
            "installation_id": event.installation_id,
            "repository": event.repository_full_name,
            "pr_number": payload["number"],
            "head_sha": payload["pull_request"]["head"]["sha"],
            "base_sha": payload["pull_request"]["base"]["sha"],
            "branch": payload["pull_request"]["head"]["ref"],
            "base_branch": payload["pull_request"]["base"]["ref"]
        }
        
        # Check if repository has Fortify enabled
        repo = await prisma.gitHubRepository.find_unique(
            where={"fullName": event.repository_full_name}
        )
        
        if not repo or not repo.fortifyEnabled:
            return
        
        # Create check run immediately
        check_run = await self.checks_client.create_check_run(
            installation_id=pr_data["installation_id"],
            repo=pr_data["repository"],
            head_sha=pr_data["head_sha"],
            name="Fortify Security Scan",
            status="in_progress",
            output={
                "title": "🔍 Security scan in progress...",
                "summary": "Analyzing your code for security vulnerabilities"
            }
        )
        
        # Trigger security scan via scan-agent API
        await self.trigger_security_scan(pr_data, check_run["id"])
    
    async def trigger_security_scan(self, pr_data: Dict[str, Any], check_run_id: int):
        """Trigger security scan via scan-agent API and update check run"""
        
        try:
            # Call scan-agent API directly
            scan_result = await self.scan_agent_client.scan_repository(
                repo_url=f"https://github.com/{pr_data['repository']}.git",
                branch=pr_data["branch"],
                head_sha=pr_data["head_sha"],
                pr_number=pr_data["pr_number"],
                scan_options={"mode": "pr_diff"}
            )
            
            # Format results for GitHub Checks
            if scan_result.get("vulnerabilities"):
                vulnerabilities = scan_result["vulnerabilities"]
                output = self.checks_client.format_vulnerability_output(
                    vulnerabilities, scan_result
                )
                actions = self.checks_client.get_check_actions(
                    vulnerabilities, 
                    auto_fixable_count=sum(1 for v in vulnerabilities if v.get("auto_fixable"))
                )
                
                # Update check run with failure
                await self.checks_client.update_check_run(
                    installation_id=pr_data["installation_id"],
                    repo=pr_data["repository"],
                    check_run_id=check_run_id,
                    status="completed",
                    conclusion="failure",
                    completed_at=datetime.utcnow().isoformat(),
                    output=output,
                    actions=actions
                )
            else:
                # Update check run with success
                await self.checks_client.update_check_run(
                    installation_id=pr_data["installation_id"],
                    repo=pr_data["repository"],
                    check_run_id=check_run_id,
                    status="completed",
                    conclusion="success",
                    completed_at=datetime.utcnow().isoformat(),
                    output={
                        "title": "✅ No security issues found",
                        "summary": "Your code passed all security checks!"
                    }
                )
                
        except Exception as e:
            # Update check run with error
            await self.checks_client.update_check_run(
                installation_id=pr_data["installation_id"],
                repo=pr_data["repository"], 
                check_run_id=check_run_id,
                status="completed",
                conclusion="failure",
                completed_at=datetime.utcnow().isoformat(),
                output={
                    "title": "❌ Security scan failed",
                    "summary": f"Scan failed due to: {str(e)}"
                }
            )
    
    async def handle_check_run(self, event: WebhookEvent):
        """Handle check run re-run requests and custom actions"""
        action = event.event_action
        payload = event.payload
        
        if action == "rerequested":
            # User clicked re-run button
            check_run = payload["check_run"]
            if check_run["name"] == "Fortify Security Scan":
                # Extract PR info from check run
                pr_data = {
                    "installation_id": event.installation_id,
                    "repository": event.repository_full_name,
                    "head_sha": check_run["head_sha"],
                    # Would need to lookup PR number from head_sha
                }
                await self.trigger_security_scan(pr_data, check_run["id"])
        
        elif action == "requested_action":
            # User clicked custom action button
            requested_action = payload["requested_action"]
            action_id = requested_action["identifier"]
            
            if action_id == "apply_fixes":
                await self.handle_apply_fixes(payload)
            elif action_id == "view_dashboard":
                await self.handle_view_dashboard(payload)
    
    async def handle_apply_fixes(self, payload: Dict[str, Any]):
        """Handle auto-fix application"""
        # Implementation for applying auto-fixes
        pass
    
    async def handle_view_dashboard(self, payload: Dict[str, Any]):
        """Handle dashboard redirect"""
        # Implementation for dashboard redirect
        pass
```

---

## 8. Monitoring and Observability

### 8.1 Integration Health Monitoring

#### Health Check Endpoints
```python
from fastapi import FastAPI
from datetime import datetime, timedelta

@app.get("/health/github-integration")
async def github_integration_health():
    """Health check for GitHub integration components"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {}
    }
    
    # Check GitHub API connectivity
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.github.com/rate_limit")
            if response.status_code == 200:
                rate_limit = response.json()
                health_status["components"]["github_api"] = {
                    "status": "healthy",
                    "rate_limit_remaining": rate_limit["rate"]["remaining"],
                    "rate_limit_reset": rate_limit["rate"]["reset"]
                }
            else:
                health_status["components"]["github_api"] = {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}"
                }
    except Exception as e:
        health_status["components"]["github_api"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check webhook processing
    recent_events = await prisma.gitHubWebhookEvent.count(
        where={
            "createdAt": {"gte": datetime.utcnow() - timedelta(minutes=5)},
            "status": "failed"
        }
    )
    
    health_status["components"]["webhook_processing"] = {
        "status": "healthy" if recent_events == 0 else "degraded",
        "failed_events_last_5min": recent_events
    }
    
    # Check installation count
    active_installations = await prisma.gitHubInstallation.count(
        where={"suspendedAt": None}
    )
    
    health_status["components"]["installations"] = {
        "status": "healthy",
        "active_count": active_installations
    }
    
    # Set overall status
    component_statuses = [
        comp["status"] for comp in health_status["components"].values()
    ]
    
    if "unhealthy" in component_statuses:
        health_status["status"] = "unhealthy"
    elif "degraded" in component_statuses:
        health_status["status"] = "degraded"
    
    return health_status
```

### 8.2 Metrics and Analytics

#### Integration Metrics Collection
```python
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge

# Prometheus metrics
webhook_events_total = Counter(
    'github_webhook_events_total',
    'Total number of GitHub webhook events received',
    ['event_type', 'status']
)

api_requests_total = Counter(
    'github_api_requests_total',
    'Total number of GitHub API requests',
    ['endpoint', 'status_code']
)

scan_trigger_duration = Histogram(
    'github_pr_scan_trigger_duration_seconds',
    'Time taken to trigger PR scan from webhook'
)

active_installations = Gauge(
    'github_active_installations',
    'Number of active GitHub App installations'
)

class GitHubMetricsCollector:
    """Collect and export GitHub integration metrics"""
    
    def record_webhook_event(self, event_type: str, status: str):
        webhook_events_total.labels(
            event_type=event_type,
            status=status
        ).inc()
    
    def record_api_request(self, endpoint: str, status_code: int):
        api_requests_total.labels(
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
    
    @scan_trigger_duration.time()
    async def trigger_scan_with_metrics(self, pr_data: Dict[str, Any]):
        """Trigger scan with duration metrics"""
        await self.trigger_pr_security_scan(pr_data)
    
    async def update_installation_metrics(self):
        """Update installation count metrics"""
        count = await prisma.gitHubInstallation.count(
            where={"suspendedAt": None}
        )
        active_installations.set(count)
```

---

## 9. Deployment and Configuration

### 9.1 Environment Configuration

#### Required Environment Variables
```bash
# GitHub OAuth Application
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret

# GitHub App Configuration
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Security
TOKEN_ENCRYPTION_KEY=your_32_byte_base64_encryption_key
NEXTAUTH_SECRET=your_nextauth_secret

# Database
POSTGRES_PRISMA_URL=postgresql://user:password@host:5432/database
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:5432/database

# Redis (for job queues)
REDIS_URL=redis://localhost:6379

# Monitoring
PROMETHEUS_PORT=9090
```

### 9.2 GitHub App Setup

#### GitHub App Configuration
```yaml
# GitHub App Manifest (for automated setup)
name: "Fortify Security Platform"
url: "https://fortify.dev"
hook_attributes:
  url: "https://api.fortify.dev/api/webhooks/github"
  active: true
redirect_url: "https://fortify.dev/auth/github/callback"
callback_urls:
  - "https://fortify.dev/auth/github/callback"
public: true
default_events:
  - pull_request
  - installation
  - installation_repositories
  - push
default_permissions:
  contents: read
  metadata: read
  pull_requests: write
  checks: write
  actions: write
  security_events: write
```

---

## 10. Testing Strategy

### 10.1 Integration Testing

#### GitHub API Mock Server
```python
import pytest
from unittest.mock import AsyncMock, patch
import httpx

class MockGitHubAPI:
    """Mock GitHub API for testing"""
    
    def __init__(self):
        self.responses = {}
        self.requests = []
    
    def add_response(self, method: str, url: str, response: dict, status: int = 200):
        key = f"{method}:{url}"
        self.responses[key] = {
            "json": response,
            "status_code": status
        }
    
    async def request(self, method: str, url: str, **kwargs):
        self.requests.append({
            "method": method,
            "url": url,
            "kwargs": kwargs
        })
        
        key = f"{method}:{url}"
        if key in self.responses:
            response_data = self.responses[key]
            response = httpx.Response(
                status_code=response_data["status_code"],
                json=response_data["json"]
            )
            return response
        
        # Default 404 response
        return httpx.Response(status_code=404, json={"message": "Not Found"})

@pytest.fixture
def mock_github_api():
    return MockGitHubAPI()

@pytest.mark.asyncio
async def test_create_workflow_file(mock_github_api):
    """Test workflow file creation"""
    
    # Setup mock response
    mock_github_api.add_response(
        "PUT",
        "/repos/owner/repo/contents/.github/workflows/fortify-security.yml",
        {"commit": {"sha": "abc123"}}
    )
    
    # Test workflow creation
    generator = GitHubWorkflowGenerator()
    
    with patch('httpx.AsyncClient.request', mock_github_api.request):
        result = await generator.create_workflow_file(
            installation_id=12345,
            owner="owner",
            repo="repo",
            config={"scan_mode": "full"}
        )
    
    assert result["commit"]["sha"] == "abc123"
    assert len(mock_github_api.requests) == 1
```

### 10.2 Webhook Testing

#### Webhook Event Simulation
```python
@pytest.mark.asyncio
async def test_pull_request_webhook():
    """Test pull request webhook processing"""
    
    payload = {
        "action": "opened",
        "number": 123,
        "pull_request": {
            "head": {"sha": "abc123", "ref": "feature-branch"},
            "base": {"sha": "def456", "ref": "main"}
        },
        "repository": {
            "full_name": "owner/repo"
        },
        "installation": {
            "id": 12345
        }
    }
    
    event = WebhookEvent(
        delivery_id="test-delivery-123",
        event_type="pull_request",
        event_action="opened",
        installation_id=12345,
        repository_full_name="owner/repo",
        payload=payload
    )
    
    processor = WebhookEventProcessor()
    
    with patch('prisma.scanJob.create') as mock_create:
        mock_create.return_value = AsyncMock(id="scan-job-123")
        
        await processor.process_event(event)
        
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]["data"]
        assert call_args["data"]["pr_number"] == 123
        assert call_args["data"]["head_sha"] == "abc123"
```

---

## 11. Future Enhancements

### 11.1 Advanced Features

#### Multi-Repository Scanning
- **Monorepo Support**: Handle multiple projects in single repository
- **Cross-Repository Dependencies**: Analyze dependencies across repositories
- **Organization-Level Policies**: Centralized security policies

#### Enhanced Analytics
- **Security Metrics Dashboard**: Repository security scores and trends
- **Compliance Reporting**: Automated compliance report generation
- **Developer Security Training**: Personalized security recommendations

#### Integration Expansions
- **GitLab Integration**: Support for GitLab CI/CD pipelines
- **Azure DevOps**: Integration with Azure Repos and Pipelines
- **Bitbucket**: Support for Atlassian Bitbucket

### 11.2 Performance Optimizations

#### Caching Strategy
- **API Response Caching**: Cache GitHub API responses for better performance
- **Token Caching**: Intelligent token refresh and caching
- **Repository Metadata Caching**: Cache repository information

#### Scalability Improvements
- **Horizontal Scaling**: Support for multiple webhook processors
- **Database Sharding**: Partition data across multiple databases
- **CDN Integration**: Global distribution of static assets

---

## 12. Conclusion

This GitHub Integration Architecture provides a comprehensive foundation for implementing the GitHub Actions PR Security Integration. The architecture ensures:

### Key Strengths
1. **Security-First Design**: Encrypted token storage, proper permission validation
2. **Scalable Architecture**: Event-driven processing with proper queuing
3. **Robust Error Handling**: Comprehensive error handling and retry logic
4. **Monitoring & Observability**: Built-in metrics and health monitoring
5. **Testing Strategy**: Comprehensive testing approach with mocks and fixtures

### Implementation Readiness
The architecture includes:
- ✅ Complete API integration patterns
- ✅ Database schema and models
- ✅ Webhook event processing pipeline
- ✅ Security and authentication framework
- ✅ Monitoring and metrics collection
- ✅ Testing strategy and examples

This architecture enables the seamless implementation of the GitHub Actions PR Security Integration while maintaining security, scalability, and reliability standards.
