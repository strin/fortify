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

### 2.2 Status: In Progress

#### Page Layout
**Header:**
- Scan job ID and creation timestamp
- Repository and branch being scanned
- Progress indicator (progress bar or spinner)
- Cancel scan button
- Back to project page button

**Progress Section:**
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

#### Real-time Updates (Future)
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

**Error Information:**
- **Error Type**: Classification of failure (timeout, access denied, analysis error)
- **Error Message**: Detailed error description
- **Error Code**: Technical error code for support
- **Troubleshooting**: Common solutions and next steps

**Debug Information (Collapsible):**
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

#### Actions
- **View All Vulnerabilities**: Navigate to full vulnerability list
- **Download Report**: Export in multiple formats
- **Schedule Follow-up**: Set reminder to re-scan
- **Share Results**: Send to team members

## 3. Vulnerability Display (Completed Scans)

### 3.1 Vulnerability List Page
**URL**: `/scans/[jobId]/vulnerabilities`

#### Page Layout
**Header:**
- Scan information (repository, branch, date)
- Vulnerability count and summary
- Filter and export controls

**Filters:**
- **Severity**: All, Critical, High, Medium, Low, Info
- **Category**: Injection, Authentication, Authorization, etc.
- **File**: Filter by file path or extension
- **Status**: All, New, Acknowledged, Fixed, False Positive

**Sort Options:**
- Severity (high to low)
- File path (alphabetical)
- Line number (ascending)
- Category (alphabetical)

#### Vulnerability Cards
**Card Layout:**
- **Title**: Vulnerability name/description
- **Severity Badge**: Color-coded severity indicator
- **Location**: File path and line numbers
- **Category**: Vulnerability classification
- **Code Snippet**: Relevant code with syntax highlighting
- **Recommendation**: Fix suggestion and remediation steps

**Card Actions:**
- **View Details**: Expand for full description
- **Mark as Fixed**: Update vulnerability status
- **Mark as False Positive**: Dismiss finding
- **Copy Link**: Share specific vulnerability
- **View in Repository**: Open file in GitHub/provider

### 3.2 Vulnerability Detail Modal/Page

#### Detailed Information
**Vulnerability Overview:**
- Full title and description
- CWE/OWASP mapping (if available)
- Risk assessment and impact

**Location Details:**
- File path with breadcrumb navigation
- Line numbers and affected code range
- Context lines (before/after affected code)
- Syntax-highlighted code view

**Remediation Guidance:**
- Step-by-step fix instructions
- Code examples (before/after)
- Related documentation links
- Similar vulnerabilities in codebase

**Metadata:**
- Confidence level
- First detected date
- Last seen date
- Fix priority ranking

#### Actions
- **Mark as Acknowledged**: Acknowledge but don't fix immediately
- **Mark as Fixed**: Indicate vulnerability has been resolved
- **Mark as False Positive**: Dismiss as incorrect finding
- **Create Issue**: Generate GitHub issue with details
- **Export**: Download vulnerability details

### 3.3 Bulk Actions

**Select Multiple Vulnerabilities:**
- Checkbox selection for bulk operations
- Select all/none toggles
- Filter-based selection

**Bulk Operations:**
- Mark selected as acknowledged
- Mark selected as false positive
- Export selected vulnerabilities
- Create bulk GitHub issues

## 4. Technical Requirements

### 4.1 API Endpoints

**Scan Creation:**
```
POST /api/projects/[projectId]/scans
Body: {
  repositoryId: string,
  branch: string,
  path?: string,
  options: ScanOptions
}
Response: { scanJobId: string, status: "PENDING" }
```

**Scan Status:**
```
GET /api/scans/[jobId]
Response: {
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  progress?: number,
  error?: string,
  result?: ScanResult
}
```

**Vulnerability List:**
```
GET /api/scans/[jobId]/vulnerabilities
Query: { severity?, category?, page?, limit? }
Response: {
  vulnerabilities: Vulnerability[],
  total: number,
  pagination: PaginationInfo
}
```

### 4.2 Database Schema Updates

**Enhanced ScanJob model:**
```prisma
model ScanJob {
  // ... existing fields
  progress: Int? // 0-100 percentage
  currentStage: String? // "cloning", "analyzing", "reporting"
  estimatedDuration: Int? // seconds
  actualDuration: Int? // seconds
}
```

### 4.3 Real-time Updates

**Implementation Options:**
1. **Polling**: Frontend polls every 10 seconds for status updates
2. **Server-Sent Events**: Real-time progress updates via SSE
3. **WebSocket**: Bi-directional real-time communication (future)

### 4.4 Performance Considerations

**Scan Performance:**
- Repository size limits (max 1GB for MVP)
- File count limits (max 10,000 files)
- Timeout handling (15 minute maximum)

**UI Performance:**
- Pagination for large vulnerability lists (50 per page)
- Virtual scrolling for very large result sets
- Lazy loading of vulnerability details

## 5. User Experience Guidelines

### 5.1 Progressive Disclosure
- Start with simple options, reveal advanced options on demand
- Use sensible defaults to minimize configuration burden
- Provide contextual help and tooltips

### 5.2 Status Communication
- Use clear, non-technical language for status updates
- Provide estimated time remaining when possible
- Show progress visually with progress bars/spinners

### 5.3 Error Handling
- Provide actionable error messages with next steps
- Offer retry mechanisms for transient failures
- Include contact information for complex issues

### 5.4 Mobile Responsiveness
- Optimize scan creation flow for mobile devices
- Ensure vulnerability lists are readable on small screens
- Provide touch-friendly interactions

## 6. Future Enhancements

### 6.1 Advanced Scanning
- **Incremental Scans**: Only scan changed files since last scan
- **Multi-branch Comparison**: Compare security across branches
- **Historical Trending**: Track vulnerability trends over time

### 6.2 Collaboration Features
- **Team Notifications**: Alert team members of scan results
- **Assignment**: Assign vulnerabilities to team members
- **Comments**: Add notes and discussions to vulnerabilities

### 6.3 Integration Enhancements
- **CI/CD Integration**: Automated scans on code pushes
- **IDE Extensions**: In-editor vulnerability highlighting
- **SARIF Export**: Export results in industry-standard format

### 6.4 AI-Powered Features
- **Smart Prioritization**: AI-ranked vulnerability priority
- **Fix Suggestions**: Automated code fix generation
- **False Positive Detection**: ML-based false positive reduction

## 7. Implementation Phases

### Phase 1: Core Functionality (2-3 weeks)
- Basic scan creation flow (steps 1-3)
- Scan job status pages (in progress, failed, completed)
- Basic vulnerability list display
- Essential API endpoints

### Phase 2: Enhanced UX (1-2 weeks)
- Real-time progress updates
- Advanced filtering and sorting
- Bulk vulnerability actions
- Export functionality

### Phase 3: Polish & Optimization (1 week)
- Mobile responsiveness
- Performance optimizations
- Error handling improvements
- User testing feedback integration

## 8. Success Criteria

### Functional Requirements
- ✅ Users can create scans with branch and path specification
- ✅ Scan status is clearly communicated throughout lifecycle
- ✅ Vulnerability results are actionable and well-organized
- ✅ All scan states (pending, in progress, failed, completed) are handled

### Non-Functional Requirements
- ✅ Scan creation flow completion rate >90%
- ✅ Page load times <2 seconds for vulnerability lists
- ✅ Mobile usability score >85% in user testing
- ✅ Error recovery rate >80% for failed scans

### User Experience Goals
- ✅ Users understand scan progress without confusion
- ✅ Vulnerability information enables immediate action
- ✅ Error messages provide clear next steps
- ✅ Flow feels integrated with existing project management

---

## Appendix

### A. Wireframe References
- Scan creation flow mockups
- Status page layouts
- Vulnerability list designs

### B. Technical Architecture
- Database schema changes
- API endpoint specifications
- Real-time update implementation

### C. User Research
- User interview findings
- Usability testing results
- Competitive analysis insights
