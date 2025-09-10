# GitHub Provider Architecture

## Overview

This document defines the GitHub-specific provider architecture for Fortify's repository abstraction layer. As the initial and primary provider, GitHub integration focuses on seamless developer experience, robust webhook support, and comprehensive repository management while maintaining architectural patterns that support future multi-provider expansion.

## GitHub Provider Architecture

### 1. Provider Interface Design

**Core GitHub Provider Capabilities:**
- Repository access validation using GitHub API
- Comprehensive metadata extraction (stars, forks, language, topics, etc.)
- Branch and commit information retrieval
- Webhook lifecycle management (create, update, delete)
- File content access for security scanning
- Rate limiting and error handling

**GitHub API Integration Pattern:**
- RESTful API v3 integration with GitHub's official API
- Bearer token authentication using OAuth tokens
- Paginated data handling for large repositories
- Comprehensive error handling and retry logic

### 2. Base Provider Interface

**Abstract Provider Interface:**
- Standardized method signatures for all providers
- Consistent data models across providers (RepositoryMetadata, Branch, Commit)
- Webhook result standardization
- Error handling patterns

**Key Data Models:**
- **RepositoryMetadata**: Full repository information with provider-specific metadata
- **Branch**: Branch information with protection status
- **Commit**: Commit details with author and timing information
- **WebhookSetupResult**: Webhook operation results with success/error states

**Provider Interface Methods:**
- `validate_access()` - Repository access verification
- `get_repository_metadata()` - Comprehensive repository information
- `get_branches()` - Branch listing with metadata
- `get_commits()` - Commit history retrieval
- `setup_webhook()` / `remove_webhook()` - Webhook management
- `get_file_content()` - Individual file access

## GitHub-Specific Features

### 1. Repository Metadata Extraction

**GitHub Metadata Mapping:**
- Repository statistics (stars, forks, watchers)
- Repository settings (issues, projects, wiki, pages)
- Language detection and topic tags
- License information and homepage links
- Repository status (archived, disabled, private)
- Timestamps (created, updated, last push)

**URL Parsing Strategy:**
- Support for HTTPS GitHub URLs (`https://github.com/owner/repo`)
- Support for SSH URLs (`git@github.com:owner/repo.git`)
- Support for owner/repo shorthand format
- Automatic `.git` suffix handling

### 2. Branch Management

**Branch Information:**
- Branch name and latest commit SHA
- Protection status (protected/unprotected)
- Default branch identification
- Paginated branch listing for large repositories

**Commit History:**
- Commit SHA, message, and timestamps
- Author and committer information
- Commit URLs for GitHub integration
- Configurable commit history depth

### 3. Webhook Architecture

**Webhook Event Handling:**
- Push events for automatic scanning
- Pull request events (opened, synchronized, reopened)
- Repository events for metadata updates
- Release events for version tracking

**Webhook Configuration:**
- JSON payload format
- HMAC signature verification using shared secrets
- HTTPS-only webhook endpoints
- Automatic webhook deduplication

**Webhook Lifecycle:**
- Webhook creation with event filtering
- Existing webhook detection and reuse
- Webhook removal and cleanup
- Error handling for webhook failures

## Frontend GitHub Integration

### 1. GitHub Authentication

**OAuth Integration:**
- NextAuth.js GitHub provider configuration
- Enhanced OAuth scopes for repository access
- Token management and refresh handling
- User session integration

**Required GitHub Scopes:**
- `repo` - Full repository access
- `read:user` - User profile information
- `user:email` - User email access
- `admin:repo_hook` - Webhook management

### 2. Repository Import Flow

**GitHub Repository Discovery:**
- User repository listing via GitHub API
- Repository search and filtering capabilities
- Repository metadata display (language, stars, forks)
- Repository topic and description visualization

**Import Process:**
- Repository selection from GitHub account
- Access validation before import
- Project association during import
- Automatic scan target creation

### 3. GitHub-Specific UI Components

**Repository Import Dialog:**
- GitHub repository browser with search
- Repository metadata cards with GitHub-specific information
- Batch import capabilities
- Real-time access validation feedback

**GitHub Repository Display:**
- GitHub-specific badges and indicators
- Star and fork count visualization
- GitHub links and external navigation
- Repository topic display

## Webhook Integration Architecture

### 1. Webhook Endpoint Design

**Webhook Handler Architecture:**
- Dedicated GitHub webhook endpoint (`/webhooks/github`)
- Signature verification using HMAC-SHA256
- Event type routing and processing
- Payload validation and sanitization

**Event Processing Pipeline:**
- Webhook signature verification
- Event type identification and routing
- Repository lookup and validation
- Scan job creation and queuing

### 2. GitHub Event Handling

**Push Event Processing:**
- Branch identification from push payload
- Repository matching in Fortify database
- Automatic scan job creation for configured repositories
- Commit information extraction and storage

**Pull Request Event Processing:**
- PR state change detection (opened, synchronized, reopened)
- Branch-specific scanning for PR changes
- PR metadata extraction (number, title, author)
- Integration with existing scan pipeline

**Repository Event Processing:**
- Repository metadata updates
- Repository configuration changes
- Webhook reconfiguration as needed

## Authentication & Authorization

### 1. GitHub OAuth Flow

**OAuth Configuration:**
- GitHub App registration with required permissions
- Secure client credential management
- OAuth callback URL configuration
- Token scope validation

**Token Management:**
- OAuth token storage with encryption
- Token refresh mechanisms where supported
- Token scope verification
- Token revocation handling

### 2. Repository Access Control

**Access Validation:**
- Repository existence verification
- User permission validation
- Organization access checks
- Private repository access verification

**Security Patterns:**
- Minimal privilege OAuth scopes
- Token encryption at rest
- Secure token transmission
- Access audit logging

## Error Handling & Resilience

### 1. GitHub API Rate Limiting

**Rate Limit Management:**
- GitHub API rate limit monitoring
- Automatic backoff and retry strategies
- Rate limit header processing
- Queue-based request throttling

**Rate Limit Patterns:**
- Exponential backoff for rate limit errors
- Request prioritization based on criticality
- Batch request optimization
- Rate limit status reporting

### 2. Error Recovery Strategies

**API Error Handling:**
- HTTP status code interpretation
- GitHub-specific error message processing
- Automatic retry for transient failures
- Graceful degradation for service unavailability

**Network Resilience:**
- Connection timeout handling
- DNS resolution failures
- SSL/TLS certificate validation
- Network partition recovery

## Security Considerations

### 1. GitHub Token Security

**Token Protection:**
- Encryption of stored GitHub tokens
- Secure token transmission protocols
- Token scope minimization
- Regular token rotation policies

**Access Control:**
- User-scoped token access
- Repository-level permissions
- Organization access validation
- Audit trail for token usage

### 2. Webhook Security

**Webhook Verification:**
- HMAC signature validation for all webhook payloads
- Timestamp validation to prevent replay attacks
- IP address validation for GitHub webhook sources
- Payload size limits and validation

**Security Headers:**
- HTTPS enforcement for all webhook endpoints
- Proper CORS configuration
- Rate limiting on webhook endpoints
- DDoS protection considerations

## Testing Strategy

### 1. GitHub Provider Testing

**Unit Testing:**
- Provider method testing with mocked GitHub API responses
- Error condition testing and validation
- Rate limiting behavior verification
- URL parsing and validation testing

**Integration Testing:**
- Live GitHub API testing with test repositories
- OAuth flow testing with test accounts
- Webhook delivery testing with test payloads
- End-to-end repository import workflows

### 2. Webhook Testing

**Webhook Simulation:**
- GitHub webhook payload simulation
- Signature verification testing
- Event processing pipeline validation
- Error handling and recovery testing

**Load Testing:**
- High-volume webhook processing
- Concurrent webhook handling
- Rate limiting under load
- Database performance under webhook load

## Performance Optimization

### 1. GitHub API Optimization

**Request Optimization:**
- Batch API requests where possible
- Conditional requests using ETags
- Parallel request processing
- Response caching strategies

**Data Efficiency:**
- Selective field requests to minimize payload size
- Pagination optimization for large datasets
- Incremental data synchronization
- Metadata caching with TTL

### 2. Webhook Performance

**Processing Optimization:**
- Asynchronous webhook processing
- Queue-based event handling
- Batch processing for similar events
- Background job processing

**Scalability Patterns:**
- Horizontal scaling of webhook handlers
- Load balancing for webhook endpoints
- Database connection pooling
- Redis-based job queuing

## Migration and Compatibility

### 1. Backward Compatibility

**Legacy Integration:**
- Support for existing scan targets without repository records
- Gradual migration of scan targets to repository model
- Compatibility with existing GitHub OAuth tokens
- Preservation of existing webhook configurations

### 2. Future GitHub Features

**GitHub API Evolution:**
- GraphQL API integration planning
- GitHub Apps vs OAuth Apps migration
- New GitHub features integration
- API versioning and deprecation handling

**Feature Expansion:**
- GitHub Actions integration
- GitHub Security Advisory integration
- GitHub Packages scanning
- GitHub Codespaces integration

This GitHub provider architecture establishes a robust, secure, and scalable foundation for GitHub integration within Fortify while maintaining flexibility for future enhancements and multi-provider support.