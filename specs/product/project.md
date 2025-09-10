# Scan Project Concept

## Overview

A **Project** in Fortify is the central unit in the system.  
- Initially, each Project maps to a single repo.  
- Over time, a Project can include multiple repos for cross-repo scanning.  
- Within a Project, users can run scans, view results, configure integrations, and (later) manage policies and compliance evidence.  


## MVP Implementation (Single Repository)

### Core Concept
- **A Project = One Repository**
- Maximum simplicity for individual developers
- Zero configuration required

### User Flow
1. Developer runs their first scan on a repository
2. System automatically creates a Project with the repository name
3. All subsequent scans for that repository are grouped under this Project

## Future Vision (Multi-Repository)

### Enhanced Concept
- **A Project can include multiple repositories**
- Designed for complex development scenarios:
  - Microservices architectures
  - Polyglot repositories owned by single team
  - Related codebases that need unified oversight

### Use Case Examples
- **"Payments Project"** = 3 repositories:
  - `payments-api` (Node.js backend)
  - `payments-frontend` (React app)
  - `payments-worker` (Python background jobs)
- **"E-commerce Platform"** = 5 repositories:
  - `user-service`, `product-service`, `order-service`, `web-app`, `mobile-app`

### Advanced Capabilities
- **Cross-Repository Scans**: Analyze dependencies and interactions between repos
- **Shared Monitoring**: Unified alerting and notification system across all project repos
- **Compliance Reporting**: Generate compliance reports spanning entire project ecosystem
- **Team Collaboration**: Multiple developers can contribute to same logical project

## Project Layout

### 1. Overview (default)
The starting point for every user. Provides a high-level snapshot of project health.

**Features:**
- Vulnerabilities summary (Critical / High / Medium / Low) for main/master branch.
- Stats of scans (total, completed, failed, pending, in progress).
- List of recent scans and their high-level status, with links to details and option to view all scans.
- Quick actions: **Run Scan**, etc.

---

### 2. Scans
Comprehensive list of all scan runs (manual, PR-triggered, or scheduled).

**Table Columns:**
- **Scan ID** – unique identifier, clickable for full detail.
- **Repo / Branch / Path** – where the scan was executed (e.g., `main`, `dev/infra`).
- **Summary** – # of vulnerabilities found (Critical / High / Medium / Low), scan duration.
- **Date / Trigger** – when the scan ran and why (manual, push, PR).

**Filters:**
- By keyword.
- Branch
- Path.
- Status (completed, failed, pending, in progress).

---

### 3. Compliance Reporting
Centralized view for generating compliance evidence.

**MVP State:**
- Empty state with explainer text:
  > "Compliance reporting is coming soon. You’ll be able to generate evidence for SOC2, ISO, and HIPAA directly from your scan history."

**Future State:**
- Export reports (PDF, CSV, JSON).
- Map findings to compliance frameworks:
  - SOC2 (e.g., CC7.1: vulnerability detection)
  - ISO 27001 (e.g., A.12.6: technical vulnerability management)
  - HIPAA Security Rule (164.308(a)(8))
- Audit trail: scans, fixes, status history.

---

### 4. Policy (placeholder)
Reserved for security engineers to define automated monitors and enforcement rules.
** MVP State:**
- Empty state with explainer text:
  > "Policy management is coming soon. You’ll be able to define automated monitors and enforcement rules."

**Future Features:**
- Configure monitors (scan on PR, scan on push, nightly scans).
- Set severity thresholds for blocking merges.
- Manage waiver/ignore lists.

---

### 5. Settings
Configuration options for integrations and notifications.

** MVP State:**
- Toggle for automatically trigger scans on PRs.
- Slack integration.

**Future Features:**
- Connect to GitHub App (PR events, push events).
- Notification channels: Slack, email.
- Default branch settings.
- (Future) Add/remove repos for multi-repo projects.
- Team management: invite teammates, assign roles.

**Features:**
- Connect to GitHub App (PR events, push events).
- Notification channels: Slack, email.
- Default branch settings.
- (Future) Add/remove repos for multi-repo projects.
- Team management: invite teammates, assign roles.

## Edge Cases

### Existing Project Conflict

**Scenario**: User attempts to create a new project for a repository that already has an associated project.

**Current Behavior**: System returns an error "Repository already exists in another project" and prevents creation.

**Required Behavior**: 
1. **Detection**: When a repository is already associated with an existing project for the current user, the system should detect this conflict before attempting creation.

2. **User Choice Dialog**: Present a modal dialog with the following options:
   - **"Go to Existing Project"**: Navigate the user to the existing project page that contains this repository
   - **"Create New Project Anyway"**: Allow the user to proceed with creating a new project (this would require allowing the same repository in multiple projects in the future)
   - **"Cancel"**: Return to the project creation form

3. **Dialog Content**:
   - Clear title: "Repository Already Exists"
   - Explanation text: "The repository `[repo-name]` is already associated with the project `[existing-project-name]`"
   - Timestamp: "Created on [date]"
   - Two action buttons with clear labels

4. **Navigation**: If user chooses "Go to Existing Project", navigate directly to the project detail page (`/projects/[id]`)

**Implementation Notes**:
- This applies to both the main new project page (`/new-project`) and any embedded project creation dialogs
- The conflict check should happen on repository selection, not just on final project creation
- For MVP, prioritize the "Go to Existing Project" option since we currently enforce one-repository-per-project

## Edge Cases

If the project for repo already exists, we should ask the user if they want to go to the corresponding project page or create a new project.