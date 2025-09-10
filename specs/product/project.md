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


