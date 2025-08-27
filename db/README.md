# Fortify Database

This directory contains the database schema and migration tools for the Fortify AI Security Scanning Platform.

## Overview

The Fortify database is designed to support a comprehensive security scanning platform that:
- Manages users, organizations, and projects
- Tracks security scans and their results
- Stores vulnerability data and auto-generated fixes
- Handles integrations with external tools (GitHub, CI/CD, etc.)
- Maintains compliance reports and audit logs

## Schema Architecture

The database schema is organized into several key domains:

### 🔐 User Management
- **Users**: Platform users with authentication and preferences
- **Organizations**: Team/company entities with members and roles
- **OrganizationMembers**: Many-to-many relationship with role-based access

### 📁 Project Management
- **Projects**: Code repositories/projects to be scanned
- Supports both personal and organizational projects
- Configurable scan settings per project

### 🔍 Scanning & Analysis
- **Scans**: Individual security scans with status tracking
- **ScanTriggers**: Track how scans were initiated (manual, webhook, scheduled)
- **DependencyAnalysis**: Analysis of third-party dependencies and their risks

### 🚨 Security & Vulnerabilities
- **Vulnerabilities**: Security issues found during scans
- **VulnerabilityFixes**: Auto-generated or manual fixes for vulnerabilities
- **VulnerabilityComments**: Discussion and notes on vulnerabilities
- Supports AI-specific vulnerability types (hallucinations, exposed endpoints)

### 🔗 Integrations
- **Integrations**: External tool connections (GitHub, Slack, etc.)
- **Notifications**: Multi-channel notification system
- **ApiKeys**: Secure API access management

### 📊 Compliance & Auditing
- **ComplianceReports**: Automated compliance framework reports
- **AuditLogs**: Complete audit trail of all system actions

## Key Features

### AI-First Design
- Tracks AI-generated code vulnerabilities
- Supports AI model attribution for fixes
- Confidence scoring for AI-generated content

### Multi-Language Support
- Language-agnostic vulnerability tracking
- Ecosystem-specific dependency analysis (npm, PyPI, Maven, etc.)

### Enterprise Ready
- Role-based access control
- Audit logging
- Compliance reporting
- API key management

### Developer Experience
- GitHub integration for PR-based fixes
- Real-time notifications
- Configurable scan policies

## Environment Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.8+ and pip
- PostgreSQL 12+

### Installation

1. **Install dependencies:**
   ```bash
   make install
   ```
   This installs both JavaScript and Python Prisma clients.

2. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   POSTGRES_PRISMA_URL="postgresql://username:password@localhost:5432/fortify?schema=public"
   POSTGRES_URL_NON_POOLING="postgresql://username:password@localhost:5432/fortify?schema=public"
   ```

3. **Run initial migration:**
   ```bash
   npx prisma migrate dev --name "init"
   ```

## Available Commands

### Development
```bash
# Start Prisma Studio (database GUI)
npm run dev

# Run a new migration
npm run migrate
# or with custom name
npx prisma migrate dev --name "add_new_feature"

# Reset database (⚠️ destructive)
npm run reset
```

### Client Generation
```bash
# Generate all clients
make generate-all

# Generate only JavaScript client
make generate-js

# Generate only Python client
make generate-py
```

### Database Operations
```bash
# Push schema changes without migration
make push

# View current database status
npx prisma db status

# Apply pending migrations
npx prisma migrate deploy
```

## Schema Highlights

### Vulnerability Types
The system supports various vulnerability categories:
- **Traditional**: SQL Injection, XSS, CSRF, Authentication/Authorization issues
- **AI-Specific**: AI Hallucinations, Exposed Endpoints, Insecure AI-generated code
- **Dependencies**: Third-party package vulnerabilities, "vibe-coded" packages
- **Configuration**: Hardcoded secrets, weak cryptography, insecure configurations

### Scan Types
- **FULL**: Complete codebase analysis
- **INCREMENTAL**: Changes since last scan
- **DEPENDENCY**: Third-party package analysis only
- **SECURITY**: Security-focused scan
- **AI_GENERATED**: Focus on AI-generated code

### Risk Assessment
- Severity levels: Critical, High, Medium, Low, Info
- Confidence scoring for AI-generated findings
- Trust scores for dependencies
- OWASP and CWE mappings

## Integration Points

### GitHub Integration
- Automatic PR creation for fixes
- Webhook-triggered scans on push/PR
- Repository metadata synchronization

### CI/CD Integration
- GitHub Actions workflow triggers
- Jenkins pipeline integration
- Automated scan scheduling

### Notification Channels
- In-app notifications
- Email alerts
- Slack/Discord integration
- Custom webhooks

## Security Considerations

### Data Protection
- API keys are hashed before storage
- Audit logging for all sensitive operations
- Role-based access control at organization level

### Code Security
- No direct code execution on user data
- Isolated scan environments
- Encrypted data at rest and in transit

## Migration Strategy

When updating the schema:

1. **Create migration:**
   ```bash
   npx prisma migrate dev --name "descriptive_name"
   ```

2. **Review generated SQL:**
   Check the migration file in `migrations/` directory

3. **Test migration:**
   Run on a copy of production data first

4. **Deploy:**
   ```bash
   npx prisma migrate deploy
   ```

## Troubleshooting

### Common Issues

**Migration conflicts:**
```bash
npx prisma migrate reset
npx prisma migrate dev
```

**Client generation errors:**
```bash
npx prisma generate
```

**Database connection issues:**
- Verify PostgreSQL is running
- Check connection string in `.env`
- Ensure database exists

### Performance Considerations

- Indexes are automatically created for foreign keys
- Consider adding custom indexes for frequently queried fields
- Use `@@index()` directives for composite queries
- Monitor scan performance for large repositories

## Contributing

When modifying the schema:

1. Follow existing naming conventions (snake_case for database, camelCase for Prisma)
2. Add appropriate indexes for performance
3. Update this README with any new concepts
4. Test migrations thoroughly
5. Consider backward compatibility

## Related Documentation

- [Architecture Overview](../architecture/mvp.md)
- [API Documentation](../docs/api.md) (when available)
- [Deployment Guide](../docs/deployment.md) (when available)