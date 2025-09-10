# Repository Abstraction Architecture

## Overview

This document defines the repository abstraction layer for Fortify, designed to support multiple version control providers while initially focusing on GitHub. The abstraction enables the Project concept where users can manage repositories, run scans, and configure integrations through a unified interface.

## Core Architecture

### 1. Repository Service Layer

The repository abstraction consists of three main layers:

```
┌─────────────────────────────────────┐
│           Frontend Layer            │
│  (Repository Components & Hooks)    │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│        Repository Service           │
│     (Provider-Agnostic API)         │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│       Provider Implementations      │
│    (GitHub, GitLab, Bitbucket...)   │
└─────────────────────────────────────┘
```

### 2. Data Models

Based on the existing schema, repositories are managed within the Project context with the following key entities:

**Repository Entity:**
- Core identifiers (id, projectId, userId)
- Repository information (fullName, description, provider, repoUrl)
- Provider-specific data (externalId, defaultBranch, providerMetadata)
- Configuration flags (isActive, isPrivate, webhookConfigured)
- Security (encrypted accessToken)
- Timestamps (createdAt, updatedAt, lastScanAt, lastSyncAt)

**Supporting Entities:**
- Branch (name, sha, protected status, default flag)
- Commit (sha, message, author details, timestamps)
- RepositoryMetadata (comprehensive provider-specific information)
- WebhookSetupResult (success status, webhook ID, error details)

### 3. Repository Service Interface

The service layer provides a unified interface with the following capabilities:

**Repository Management:**
- List repositories (with optional project filtering)
- Get repository details
- Add repository to project
- Remove repository
- Sync repository metadata

**Provider Integration:**
- Validate repository access permissions
- Setup/remove webhooks
- Handle provider-specific operations

**Repository Information:**
- Retrieve branches and commits
- Access repository metadata
- Query repository status

**Scan Integration:**
- Create scan targets from repositories
- List existing scan targets
- Link scans to repositories

## Backend Architecture

### 1. API Layer Design

**Repository Endpoints:**
- `GET /repositories` - List repositories with optional project filtering
- `POST /repositories` - Add repository to project
- `GET /repositories/{id}` - Get repository details
- `POST /repositories/{id}/sync` - Sync repository metadata
- `GET /repositories/{id}/branches` - Get repository branches
- `POST /repositories/{id}/webhook` - Setup webhook

**Authentication & Authorization:**
- JWT-based authentication for all endpoints
- User-scoped repository access
- Project-based authorization

### 2. Service Layer Architecture

**Repository Service:**
- Provider registry pattern for multi-provider support
- Unified interface abstracting provider differences
- Repository lifecycle management (create, sync, delete)
- Metadata synchronization with providers

**Key Responsibilities:**
- Repository validation and access verification
- Provider-specific metadata extraction and normalization
- Database operations through Prisma ORM
- Webhook lifecycle management
- Token encryption/decryption for security

**Provider Integration Pattern:**
- Factory pattern for provider instantiation
- Strategy pattern for provider-specific operations
- Adapter pattern for normalizing provider responses

## Frontend Architecture

### 1. Repository Hook Pattern

**Custom Hooks Design:**
- `useRepositories(projectId?)` - Repository management hook
- `useGitHubRepositories()` - GitHub-specific operations
- `useRepositoryBranches(repositoryId)` - Branch management
- `useRepositorySync()` - Metadata synchronization

**Hook Responsibilities:**
- State management (repositories, loading, error states)
- API communication with backend services
- Caching and optimistic updates
- Error handling and retry logic

### 2. Component Architecture

**Repository List Component:**
- Grid-based repository display
- Repository metadata visualization
- Action buttons (sync, webhook setup, scan creation)
- Status indicators (webhook status, last scan time)
- Provider-specific badges and information

**Repository Import Components:**
- Provider-specific import dialogs
- Repository search and filtering
- Batch import capabilities
- Access validation feedback

**Repository Detail Components:**
- Branch listing and management
- Commit history visualization
- Webhook configuration interface
- Scan target management

## Integration Points

### 1. Project Integration

Repositories are tightly integrated with the Project concept:

- **Auto-Project Creation**: When a user scans a repository for the first time, a project is automatically created
- **Project-Repository Mapping**: Initially 1:1, expandable to 1:many in the future
- **Unified Dashboard**: Project overview shows aggregated repository statistics

### 2. Scan Target Integration

Repositories serve as the foundation for scan targets:

- **Automatic Scan Target Creation**: When adding a repository, create a default scan target for the main branch
- **Branch-based Targets**: Users can create multiple scan targets for different branches/paths within a repository
- **Scan History**: All scans are linked to their originating repository

### 3. Webhook Integration

Repositories support automated scanning through webhooks:

- **Push Events**: Trigger scans on code changes
- **PR Events**: Scan pull requests for security issues
- **Branch Events**: Scan new branches automatically

## Security Considerations

### 1. Access Token Management

- **Encryption**: All access tokens are encrypted before storage
- **Scoped Access**: Tokens have minimal required permissions
- **Token Refresh**: Automatic token refresh where supported by provider

### 2. Repository Access Control

- **User Ownership**: Users can only access repositories they own or have been granted access to
- **Project Isolation**: Repository access is scoped to specific projects
- **Audit Logging**: All repository operations are logged for security auditing

## Future Extensibility

### 1. Multi-Provider Support

The architecture is designed to easily add new providers:

```typescript
// Future providers
const providers = {
  GITHUB: new GitHubProvider(),
  GITLAB: new GitLabProvider(),
  BITBUCKET: new BitbucketProvider(),
  AZURE_DEVOPS: new AzureDevOpsProvider(),
};
```

### 2. Advanced Features

- **Cross-Repository Analysis**: Analyze dependencies and interactions between repositories
- **Repository Templates**: Pre-configured repository settings for common use cases
- **Batch Operations**: Bulk operations across multiple repositories
- **Repository Groups**: Organize repositories within projects

## Migration Strategy

### 1. Backward Compatibility

The new repository abstraction maintains compatibility with existing scan targets:

- **Legacy Support**: Existing scan targets continue to work without repository records
- **Gradual Migration**: Scan targets are gradually associated with repository records
- **Data Migration**: Background job to create repository records for existing scan targets

### 2. Feature Rollout

- **Phase 1**: Core repository management (MVP)
- **Phase 2**: Webhook integration and automated scanning
- **Phase 3**: Multi-provider support and advanced features
