# New Scan Target Creation Flow - Product Requirements Document

## Overview

This PRD defines the comprehensive flow for creating new scan targets in Fortify, building upon the existing scan target architecture. A **Scan Target** is a precise slice of code to be scanned, defined by a repository + branch + optional subpath, with specific ownership, policies, and scanning configurations.

## Definition Reference

Based on the scan target definition in `architecture/teams/scan-target.md`:

- **Core Definition**: A Scan Target is a precise slice of code you scan—defined by a repo + branch + optional subpath
- **Scanning Modes**: diff_only (PR fast checks) vs full_scan (deep/nightly)
- **Configuration Hints**: language/runtime, build commands, package manager
- **Risk Labels**: tags like PCI, HIPAA, public for policy overlays & reporting
- **Ownership**: Precise ownership & blast radius for different teams/folders in monorepos

## Current State Analysis

### Existing Architecture
- **Database Schema**: Users, ScanJobs, CodeVulnerabilities with proper relations
- **Backend**: Python FastAPI with Redis queue, Claude SDK integration
- **Frontend**: Next.js with GitHub OAuth, repository listing, basic scan triggers
- **Repository Integration**: GitHub API integration for fetching user repositories

### Current Limitations
- No formal "Scan Target" entity - scans are job-based only
- Limited configuration options for scan parameters
- No team/ownership management
- No policy or risk labeling system
- No subpath targeting within repositories
- No scan scheduling or automation

## User Journey & Flow

### 1. Entry Points

#### Primary Entry Points
- **"Add New" Button**: Main CTA on scan targets dashboard with dropdown menu
- **Empty State**: First-time user flow when no scan targets exist

#### Secondary Entry Points (later)
- **Quick Actions**: "Duplicate" existing scan target with modifications
- **Import Flow**: Bulk import from CI/CD configurations or existing tools

### 2. Multi-Step Creation Wizard

#### Step 1: Repository Selection
**Purpose**: Choose the source repository to scan

**Interface**:
- **Connected Repositories Tab**: Show GitHub repos with connection status
- **Search & Filter**: Real-time search across repositories

**Data Collected**:
- Repository URL (GitHub/GitLab/Bitbucket)
- Repository metadata (name, description, default branch)
- Access permissions verification

#### Step 2: Scan Scope Configuration
**Purpose**: Define what parts of the repository to scan

**Interface**:
- **Branch Selection**: Dropdown with branch autocomplete
- **Subpath Configuration**: 
  - File tree browser for visual selection
  - Manual path input with validation
  - Common patterns (e.g., `/src`, `/apps/web`, `/services/api`)

### Later: Risk labeling and compliance tags. 

### Later: Scanning Policies & Gates

### Step 3: Review & Confirmation

**Interface**:
- **Configuration Summary**: All selected options in readable format
- **Preview**: What the first scan will include
- **Name & Description**: 
  - Auto-generated name (editable)
  - Optional description
- **Create Button**: Primary CTA to finalize creation

## User Experience Requirements

### Performance
- **Wizard Completion**: < 2 minutes for basic configuration
- **Repository Loading**: < 3 seconds for repository list
- **Branch/Tree Loading**: < 5 seconds for repository metadata
- **Validation**: Real-time validation with < 1 second response

### Error Handling
- **Validation Errors**: Inline validation with clear error messages
- **Network Errors**: Retry mechanisms with user feedback
- **Permission Errors**: Clear guidance on resolving access issues
- **Partial Failures**: Save progress and allow resumption

## Integration Requirements

### Repository Providers
- **GitHub**: OAuth integration, repository access, webhook setup
- Later: GitLab, Bitbucket, Generic Git

### CI/CD Integration

Once the scan target is created, we can automatically create a GitHub Actions workflow to scan the repository. This is similar to how Vercel does it. It'll add a new workflow to the repository and enables a run on PR.

- **GitHub Actions**: Automatic workflow generation

### Later: Notification Systems
- **Email**: Scan completion and alert notifications
- **Slack, Microsoft Teams**

## Success Metrics

### Adoption Metrics
- **Scan Target Creation Rate**: Targets created per user per month
- **Wizard Completion Rate**: % of users completing the full wizard
- **Time to First Scan**: Average time from signup to first scan
- **Configuration Accuracy**: % of scan targets requiring post-creation edits

### Engagement Metrics
- **Active Scan Targets**: % of created targets with recent scans
- **Team Adoption**: % of users creating team-based scan targets
- **Policy Usage**: % of users configuring custom policies
- **Schedule Adoption**: % of users enabling automated scanning

### Quality Metrics
- **Scan Success Rate**: % of scans completing successfully
- **False Positive Rate**: User-reported false positives per scan
- **Configuration Errors**: Setup issues requiring support
- **User Satisfaction**: NPS score for the creation flow

## Implementation Phases

### v0.1: Core Creation Flow

**Goal**: Establish the fundamental scan target creation flow with minimal viable functionality to replace the current ad-hoc scanning approach.

#### Database Schema Changes
- **New ScanTarget Model**: Add core scan target entity to replace job-only scanning
  - Basic fields: `id`, `userId`, `name`, `description`, `repoUrl`, `branch`, `subPath`
  - Do not support scan mode yet.
  - Metadata: `createdAt`, `updatedAt`, `lastScanAt`
  - Relations: Link to User and ScanJob models
- **ScanJob Enhancement**: Add `scanTargetId` foreign key to link jobs to targets
- **Migration Strategy**: Preserve existing scan jobs while adding new structure

#### Frontend Components
- **Scan Targets Dashboard** (`/scan-targets`)
  - List view of all user's scan targets with status indicators
  - "Create New Scan Target" primary CTA button
  - Basic filtering and search functionality
- **Creation Wizard** (`/scan-targets/new`)
  - **Step 1**: Repository selection from GitHub repos (reuse existing `/repositories` logic)
  - **Step 2**: Basic configuration (branch selection, optional subpath)
  - **Step 3**: Review and create with auto-generated name
- **Target Detail View** (`/scan-targets/[id]`)
  - Configuration display and basic edit functionality
  - Manual scan trigger
  - Recent scan history

#### Backend API Endpoints
- `GET /api/scan-targets` - List user's scan targets
- `POST /api/scan-targets` - Create new scan target
- `GET /api/scan-targets/[id]` - Get scan target details
- `PUT /api/scan-targets/[id]` - Update scan target (basic fields only)
- `POST /api/scan-targets/[id]/scan` - Trigger manual scan
- `GET /api/repos/branches/[owner]/[repo]` - Get repository branches for wizard

#### Integration Points
- **GitHub API**: Extend existing repo fetching to include branch listing
- **Scan Worker**: Update scanner to accept scan target context instead of raw repo data
- **Job Queue**: Modify job creation to reference scan target ID

#### User Experience
- **Simplified Flow**: 3-step wizard completing in <2 minutes
- **Progressive Enhancement**: Start with manual scanning, build toward automation
- **Familiar Patterns**: Leverage existing repository selection UX
- **Clear Feedback**: Success states, error handling, loading indicators

#### Technical Constraints
- **No Team Management**: Individual user scope only (teams in v0.2+)
- **No Advanced Policies**: Basic scan mode selection only
- **No Scheduling**: Manual trigger only (automation in v0.2+)
- **No Risk Labeling**: Simple active/inactive status only
- **No CI/CD Integration**: Manual scans only (GitHub Actions in v0.2+)

#### Success Criteria
- Users can create scan targets for their repositories
- Scan targets can be triggered manually and show results
- Migration from current job-only model is seamless
- Foundation exists for v0.2 enhancements (teams, policies, scheduling)

#### Implementation Order
1. Database schema migration with ScanTarget model
2. Backend API endpoints for CRUD operations
3. Frontend scan targets dashboard and list view
4. Creation wizard (repository selection → configuration → review)
5. Target detail view with manual scan trigger
6. Integration with existing scan worker and job system
7. Migration script for existing scan jobs (optional scan target assignment)



