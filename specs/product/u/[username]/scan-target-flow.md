# Scan Target Flow - Product Requirements Document

## Overview

This PRD defines the complete user flow for creating, managing, and operating scan targets in Fortify. A **Scan Target** is a precise slice of code defined by repository + branch + optional subpath that represents a scannable unit with specific ownership, policies, and scanning configurations.

## Product Context

### Vision
Enable developers to easily configure and manage targeted security scans for their codebases, providing granular control over what gets scanned, when, and how results are handled.

### Core Value Proposition
- **Precision**: Target specific parts of repositories (subpaths, branches)
- **Ownership**: Clear responsibility and blast radius management
- **Automation**: Set-and-forget scanning with intelligent scheduling
- **Integration**: Seamless workflow integration with existing development processes

## Current State Analysis

### Existing Implementation
- **Database**: ScanTarget model with basic fields (name, description, repoUrl, branch, subPath)
- **Frontend**: Scan targets dashboard with creation dialog
- **Backend**: CRUD API endpoints for scan target management
- **Integration**: GitHub OAuth and repository access

### Current Capabilities
✅ Create scan targets with repository selection  
✅ Configure branch and subpath targeting  
✅ Manual scan triggering  
✅ Basic scan target listing and management  
✅ Integration with existing scan job system  

### Current Limitations
❌ No advanced scanning policies or configurations  
❌ No team-based ownership or sharing  
❌ No automated scheduling or triggers  
❌ No risk labeling or compliance tagging  
❌ No CI/CD integration or webhook automation  
❌ Limited scan mode options (only basic scanning)  

## User Personas

### Primary: Individual Developer
- **Goals**: Secure personal repositories, understand vulnerabilities
- **Pain Points**: Manual scanning overhead, unclear scan scope
- **Usage**: 1-10 repositories, occasional scanning

### Secondary: Team Lead
- **Goals**: Manage team's security posture, enforce policies
- **Pain Points**: Inconsistent scanning across team repos, no visibility
- **Usage**: 10-50 repositories, regular scanning needs

### Future: Security Engineer
- **Goals**: Enterprise-wide security governance, compliance reporting
- **Pain Points**: No centralized policy management, limited reporting
- **Usage**: 50+ repositories, automated compliance workflows

## Core User Flows

### 1. Scan Target Creation Flow

#### Entry Points
1. **Primary**: "Add New" button on scan targets dashboard
2. **Empty State**: First-time user onboarding flow
3. **Quick Actions**: "Duplicate" existing scan target (future)

#### Step-by-Step Flow

##### Step 1: Repository Selection
**Purpose**: Choose source repository to scan

**Interface Elements**:
- Connected repositories list with GitHub integration
- Real-time search and filtering
- Repository metadata display (language, size, last updated)
- Access permission indicators

**User Actions**:
- Search repositories by name
- Select target repository
- Verify repository access permissions

**Validation**:
- Repository accessibility check
- Valid Git URL format
- User permissions verification

**Success Criteria**:
- Repository selected and validated
- User proceeds to configuration step

##### Step 2: Scan Configuration
**Purpose**: Define scan scope and parameters

**Interface Elements**:
- Branch selection dropdown with autocomplete
- Subpath configuration with file tree browser
- Scan target name (auto-generated, editable)
- Optional description field

**User Actions**:
- Select target branch (default: main/master)
- Configure subpath (optional, defaults to root)
- Customize scan target name
- Add descriptive information

**Advanced Options** (collapsed by default):
- Language/framework hints
- Build command specification
- Package manager detection

**Validation**:
- Branch exists in repository
- Subpath is valid directory
- Name uniqueness within user scope

**Success Criteria**:
- Configuration completed and validated
- User proceeds to review step

##### Step 3: Review & Create
**Purpose**: Confirm configuration and create scan target

**Interface Elements**:
- Configuration summary display
- Scan scope preview
- "Create Scan Target" primary button
- "Go Back" secondary button

**User Actions**:
- Review all configuration settings
- Confirm scan target creation
- Optionally trigger first scan immediately

**Success Criteria**:
- Scan target successfully created
- User redirected to scan target detail view
- Optional: First scan initiated

#### Error Handling
- **Repository Access**: Clear messaging for permission issues
- **Network Errors**: Retry mechanisms with user feedback
- **Validation Failures**: Inline error messages with correction guidance
- **Creation Failures**: Graceful degradation with progress preservation

### 2. Scan Target Management Flow

#### Dashboard View
**Purpose**: Overview of all user's scan targets

**Interface Elements**:
- Grid/list view toggle
- Search and filter controls
- Sort options (name, last scan, status)
- Bulk action controls (future)

**Information Display**:
- Scan target name and description
- Repository and branch information
- Last scan date and status
- Vulnerability summary (critical, high, medium, low)
- Quick action buttons (scan, view, settings)

#### Individual Scan Target Actions
1. **View Details**: Navigate to detailed scan target page
2. **Trigger Scan**: Manually initiate new scan
3. **Edit Configuration**: Modify scan target settings
4. **View History**: See all past scans and results
5. **Archive/Delete**: Remove or deactivate scan target

### 3. Scan Execution Flow

#### Manual Scan Trigger
**User Action**: Click "Scan Now" button
**System Response**:
1. Validate scan target is active
2. Create new scan job
3. Queue job for processing
4. Update UI with scan status
5. Redirect to scan job detail view

#### Scan Progress Tracking
**Real-time Updates**:
- Scan status indicators (queued, running, completed, failed)
- Progress estimation where possible
- Live vulnerability discovery count
- ETA for completion

#### Scan Completion
**Success State**:
- Vulnerability summary display
- Detailed findings breakdown
- Actionable remediation suggestions
- Share/export options

**Failure State**:
- Clear error messaging
- Troubleshooting guidance
- Retry options
- Support contact information

### 4. Results & Remediation Flow

#### Vulnerability Review
**Purpose**: Understand and prioritize security findings

**Interface Elements**:
- Severity-based filtering and sorting
- Code context with syntax highlighting
- Remediation recommendations
- False positive reporting

**User Actions**:
- Review individual vulnerabilities
- Mark as resolved or false positive
- Copy/export findings
- Access detailed remediation guidance

## Technical Requirements

### Performance Requirements
- **Scan Target Creation**: Complete flow in < 2 minutes
- **Repository Loading**: < 3 seconds for repository list
- **Branch/Metadata Loading**: < 5 seconds
- **Dashboard Loading**: < 2 seconds for up to 100 scan targets
- **Real-time Updates**: < 1 second latency for status changes

### Scalability Requirements
- Support up to 100 scan targets per user (MVP)
- Handle repositories up to 10GB in size
- Concurrent scan execution (up to 5 simultaneous scans)
- Efficient pagination for large result sets

### Security Requirements
- Repository access validation
- User permission enforcement
- Secure credential handling
- Audit logging for all actions

### Integration Requirements
- GitHub OAuth and API integration
- Webhook support for automated triggers (future)
- REST API for programmatic access
- Export capabilities (JSON, CSV, SARIF)

## User Experience Guidelines

### Design Principles
1. **Clarity**: Clear visual hierarchy and information organization
2. **Efficiency**: Minimize clicks and cognitive load
3. **Feedback**: Immediate response to user actions
4. **Recovery**: Graceful error handling and recovery paths
5. **Consistency**: Align with existing Fortify design patterns

### Interaction Patterns
- **Progressive Disclosure**: Advanced options hidden by default
- **Contextual Help**: Tooltips and inline guidance
- **Keyboard Navigation**: Full keyboard accessibility
- **Mobile Responsive**: Functional on all device sizes

### Visual Design
- **Status Indicators**: Clear, color-coded status representations
- **Data Visualization**: Charts for vulnerability trends
- **Loading States**: Skeleton screens and progress indicators
- **Empty States**: Helpful guidance for new users

## Success Metrics

### User Engagement
- **Adoption Rate**: % of users who create their first scan target
- **Active Usage**: % of scan targets scanned in last 30 days
- **Retention**: % of users who create multiple scan targets
- **Time to Value**: Average time from signup to first scan

### Product Performance
- **Scan Success Rate**: % of scans that complete successfully
- **User Satisfaction**: NPS score from post-scan surveys
- **Support Tickets**: Volume of scan-related support requests
- **Feature Usage**: Adoption of advanced configuration options

### Business Impact
- **Vulnerability Discovery**: Average vulnerabilities found per scan
- **Remediation Rate**: % of vulnerabilities marked as resolved
- **Repository Coverage**: % of user repositories with scan targets
- **Upgrade Conversion**: % of users upgrading for team features

## Future Enhancements

### Phase 2: Team Collaboration
- Team-based scan target sharing
- Role-based access control
- Centralized policy management
- Team dashboard and reporting

### Phase 3: Automation & Integration
- Automated scan scheduling
- CI/CD pipeline integration
- Webhook-triggered scans
- Custom notification channels

### Phase 4: Enterprise Features
- Compliance reporting and auditing
- Advanced policy engines
- SAML/SSO integration
- API rate limiting and quotas

## Implementation Roadmap

### MVP (Current)
✅ Basic scan target CRUD operations  
✅ Manual scan triggering  
✅ Repository integration  
✅ Simple configuration options  

### v0.2 (Next 4-6 weeks)
🔄 Enhanced UI/UX improvements  
🔄 Advanced configuration options  
🔄 Better error handling and validation  
🔄 Performance optimizations  

### v0.3 (Next 8-12 weeks)
📋 Team-based features  
📋 Automated scheduling  
📋 Webhook integration  
📋 Enhanced reporting  

### v1.0 (Next 16-20 weeks)
📋 Enterprise-grade features  
📋 Advanced policy management  
📋 Comprehensive API  
📋 Third-party integrations  

## Risk Assessment

### High Risk
- **Repository Access**: GitHub API rate limits and permission changes
- **Scan Performance**: Large repository scanning performance
- **User Adoption**: Complexity of configuration deterring usage

### Medium Risk
- **Integration Reliability**: Third-party service dependencies
- **Data Privacy**: Handling of repository content and credentials
- **Scalability**: Database and infrastructure scaling needs

### Low Risk
- **UI/UX Changes**: Iterative improvements based on user feedback
- **Feature Expansion**: Gradual addition of advanced capabilities
- **Documentation**: Maintaining up-to-date user guidance

## Conclusion

The scan target flow represents the core user experience of Fortify, enabling precise, manageable, and scalable security scanning. This PRD provides a comprehensive framework for delivering a world-class scan target management experience that grows with user needs from individual developers to enterprise security teams.

The focus on simplicity, clarity, and progressive enhancement ensures that users can quickly achieve value while providing a foundation for advanced features as their security practices mature.
