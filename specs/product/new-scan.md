# New Scan PRD - Step-by-Step Scan Creation and Job Management

## Overview

This PRD defines the user experience for creating new scans from the project page and managing scan job status throughout the scan lifecycle. The feature enables users to initiate targeted security scans with granular control over scan parameters, then monitor progress and view results through dedicated scan job pages.

## Goals

### Primary Goals
- **Simplified Scan Creation**: Provide an intuitive step-by-step flow for creating scans from the project page
- **Granular Control**: Allow users to specify branch, path, and scan configuration options
- **Real-time Status Tracking**: Keep users informed of scan progress with clear status indicators
- **Actionable Results**: Present scan results in a way that enables immediate action on vulnerabilities

### Success Metrics
- **Adoption**: 70% of project users create at least one scan within first week
- **Completion Rate**: 90% of users complete the scan creation flow once started
- **Time to Value**: Users can view scan results within 5 minutes of scan creation
- **Engagement**: 60% of users view detailed vulnerability results when scans complete

## User Personas

### Primary: Security Engineer
- **Context**: Managing security for team's repositories
- **Goals**: Run targeted scans on specific branches before releases
- **Pain Points**: Need to scan specific paths or branches, not entire repository

### Secondary: Individual Developer  
- **Context**: Working on feature branches
- **Goals**: Validate security of code changes before merging
- **Pain Points**: Want quick feedback on specific code changes

## User Journey

### Phase 1: Scan Initiation
1. User navigates to project detail page
2. User clicks "Create Scan" or "Run Scan" button
3. System launches step-by-step scan creation flow
4. User completes configuration and initiates scan
5. System creates scan job and redirects to scan job page

### Phase 2: Progress Monitoring
1. User lands on scan job page showing "In Progress" status
2. System provides real-time updates on scan progress
3. User can navigate away and return to check status
4. System sends notifications when scan completes

### Phase 3: Results Review
1. User views completed scan results
2. System displays vulnerability summary and detailed findings
3. User can filter, sort, and export vulnerability data
4. User can take action on individual vulnerabilities

## Feature Specifications

## 1. Scan Creation Flow

### 1.1 Entry Points

**Primary Entry Point: Project Page**
- **Location**: Project detail page (`/projects/[id]`)
- **Trigger**: "Create Scan" or "Run Scan" button in header
- **Context**: User has selected project and wants to scan associated repositories


### 1.2 Step-by-Step Flow

#### Step 1: Repository Selection
**For Single-Repository Projects:**
- Skip this step, use project's repository
- Display repository name and description for confirmation

**For Multi-Repository Projects:**
- Display list of repositories in project
- Show repository cards with:
  - Repository name and description
  - Last scan date
  - Current branch
  - Private/public indicator
- Allow single repository selection
- Include search/filter for projects with many repositories

#### Step 2: Scan Target Configuration
**Branch Selection:**
- **Default**: Repository's default branch (main/master)
- **Options**: Dropdown/autocomplete of available branches
- **Recent Branches**: Show last 5-10 recently updated branches at top
- **Search**: Allow typing to search branch names
- **Validation**: Verify branch exists before allowing continuation

**Path Specification:**
- **Default**: Root directory (`/`)
- **Path Input**: Text input with autocomplete suggestions
- **Common Paths**: Quick-select buttons for common paths:
  - `/src`
  - `/lib`  
  - `/api`
  - `/components`
- **Path Browser**: Optional file tree browser for complex repositories
- **Validation**: Verify path exists in selected branch

**Scan Options:** (Future)
- **Scan Depth**: Shallow (faster) vs Deep (comprehensive)
- **File Types**: Include/exclude specific file extensions
- **Ignore Patterns**: Specify files/directories to ignore (beyond .gitignore)
- **Severity Threshold**: Minimum severity to report (INFO, LOW, MEDIUM, HIGH, CRITICAL)

#### Step 3: Review and Confirm
**Scan Summary:**
- Repository: `owner/repo-name`
- Branch: `feature/authentication`  
- Path: `/src/auth`
- Options: Deep scan, all file types, MEDIUM+ severity (Future)
- Estimated Duration: 2-5 minutes (Futre)

**Actions:**
- **Start Scan**: Create and initiate scan job
- **Back**: Return to previous step to modify

### 1.3 Advanced Options (Future)

**Scheduled Scans:**
- One-time vs recurring
- Schedule configuration (daily, weekly, on push)
- Notification preferences

**Comparison Scans:**
- Compare against previous scan
- Compare against different branch
- Delta reporting (new/fixed vulnerabilities)

**Integration Options:**
- Block PR merge on high severity findings
- Auto-create GitHub issues for vulnerabilities
- Slack/email notification configuration

## 2. Scan Job Status Pages

### 2.1 URL Structure
- **Scan Job Page**: `/scans/[jobId]`

Every scan job page will have the same layout: top level *Header*, *Summary Section*, the *Full Content* below and *Actions* near the *Header*.

### 2.2 Status: In Progress

#### Page Layout
**Header:**
- Scan job ID and creation timestamp
- Repository and branch being scanned
- Progress indicator (progress bar or spinner)
- Cancel scan button
- Back to project page button

**Summary Section:**
- **Current Stage**: "Cloning repository", "Analyzing code", "Generating report"
- **Time Elapsed**: Real-time counter
- **Estimated Time Remaining**: Based on repository size and historical data
- **Progress Bar**: Visual progress indicator (0-100%)

**Configuration Summary:**
- Repository: `owner/repo-name`
- Branch: `main`
- Path: `/src`
- Options: Deep scan, JavaScript/TypeScript files only

**Actions:**
- **Cancel Scan**: Stop scan and mark as cancelled
- **View Project**: Return to project page button
- **Refresh**: Manual refresh button (with auto-refresh every 10s)

#### Content: Real-time Updates (Future) from the scan agent.
- **Auto-refresh**: Page updates every 10 seconds
- **WebSocket Updates**: Real-time progress updates (future enhancement)
- **Browser Notifications**: Alert when scan completes (with permission)

### 2.3 Status: Failed

#### Page Layout
**Header:**
- Scan job ID and timestamps (created, started, failed)
- Repository and branch
- Failed status indicator (red badge/icon)
- Retry scan button

**Summary: Error Information:**
- **Error Type**: Classification of failure (timeout, access denied, analysis error)
- **Error Message**: Detailed error description
- **Error Code**: Technical error code for support
- **Troubleshooting**: Common solutions and next steps

**Content: Debug Information (Collapsible):**
- **Log Output**: Last 20 lines of scan logs
- **Configuration**: Full scan configuration used
- **Environment**: System information (for support)

**Actions:**
- **Retry Scan**: Re-run scan with same configuration
- **Modify and Retry**: Edit configuration and retry
- **View Project**: Return to project page

#### Common Error Scenarios
**Repository Access Error:**
- Message: "Unable to access repository. Please check permissions."
- Actions: Verify GitHub access token, check repository visibility

**Branch Not Found:**
- Message: "Branch 'feature/auth' not found in repository."
- Actions: Select different branch, verify branch name

**Timeout Error:**
- Message: "Scan timed out after 15 minutes. Repository may be too large."
- Actions: Try scanning smaller path, contact support for large repos

**Analysis Error:**
- Message: "Code analysis failed. Some files may be corrupted or unsupported."
- Actions: Review file types, exclude problematic files, retry

### 2.4 Status: Completed

#### Page Layout
**Header:**
- Scan job ID and timestamps (created, started, completed)
- Repository and branch scanned
- Completed status indicator (green badge/icon)
- Duration and completion time

**Vulnerability Summary:**
- **Total Count**: Total vulnerabilities found
- **Severity Breakdown**: Count by severity (Critical, High, Medium, Low, Info)
- **Category Breakdown**: Count by vulnerability type
- **Comparison**: Change from previous scan (if available)

**Quick Actions:**
- **Export Results**: Download as PDF, CSV, or JSON
- **Share Report**: Generate shareable link or send via email
- **Run New Scan**: Start another scan with same configuration
- **View All Vulnerabilities**: Link to full vulnerability list

#### Vulnerability Summary Cards
**Critical Vulnerabilities (if any):**
- Count and percentage of total
- Top 3 critical findings with file locations
- "View All Critical" link

**High-Priority Findings:**
- Most common vulnerability types
- Files with most vulnerabilities
- "View Details" links

**Scan Statistics:**
- Files scanned: 247
- Lines of code analyzed: 15,432
- Scan duration: 3m 42s
- Analysis engine: Claude Code v2.1

**Content: Full list of vulnerabilities:**

**Advanced Filtering System:**
- **Search Input**: Full-text search across title, description, and file paths
- **Severity Filter**: Dropdown with All, Critical, High, Medium, Low, Info options
- **Category Filter**: Dropdown with comprehensive vulnerability categories:
  - Injection, Authentication, Authorization, Cryptography
  - Data Exposure, Business Logic, Configuration, Dependency
  - Input Validation, Output Encoding, Session Management, Other
- **File Filter**: Dropdown populated with files that have vulnerabilities (shows count per file)
- **Real-time Filtering**: Server-side filtering with URL parameters
- **Client-side Search**: Additional local filtering for search terms

**Vulnerability Cards (Detailed Layout):**
- **Header Section**:
  - Alert icon with vulnerability title
  - Color-coded severity badge (Critical: red, High: orange, Medium: yellow, Low: blue, Info: gray)
  - Category badge with human-readable labels
- **Location Information**:
  - File path with intelligent truncation (shows last 2 path segments)
  - Line number range (start-end if applicable)
  - File and location icons for visual clarity
- **Content Sections**:
  - **Description**: Full vulnerability description
  - **Code Snippet**: Syntax-highlighted code in dark theme with scroll
  - **Recommendation**: Detailed remediation guidance
  - **Additional Information**: Metadata displayed as badges when available

**Pagination System:**
- **Server-side Pagination**: 20 vulnerabilities per page
- **Navigation Controls**: Previous/Next buttons with disabled states
- **Page Information**: "Showing X to Y of Z vulnerabilities" counter
- **Current Page Indicator**: "Page X of Y" display

**Empty States:**
- **No Vulnerabilities**: Green check icon with congratulatory message
- **No Filter Results**: Explains that filters don't match any vulnerabilities
- **Loading State**: Centered spinner with "Loading vulnerabilities..." message
- **Error State**: Alert icon with error message and retry button
