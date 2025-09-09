# Claude Development Context for Fortify

## Project Overview
Fortify is an AI-powered security scanning platform that validates AI-generated code, dependencies, and vulnerabilities in real-time. The system focuses on low false positives (<1%), auto-fixes, and seamless integration into developer workflows.

## Architecture & Documentation Location
**CRITICAL**: All architecture and product documentation is stored in the `specs/` directory. Always consult these files when making decisions or understanding the system:

### Core Architecture Documents
- `specs/mvp.md` - Complete MVP architecture design, technology stack, and implementation roadmap
- `specs/scanner.md` - Detailed scan system architecture, current implementation, and Redis-based queue system
- `specs/orchestrator.md` - Orchestration layer design and workflow management
- `specs/frontend.md` - Frontend architecture, UI specifications, and component structure
- `specs/reporter.md` - Reporting engine and compliance documentation system
- `specs/fixer.md` - Auto-fix generation system and PR automation
- `specs/schema.md` - Database schema, data models, and relationships

### Product Documentation
- `specs/product/mvp.md` - Product requirements, user stories, and MVP specifications
- `specs/product/landing.md` - Landing page requirements and conversion optimization
- `specs/product/login-flow.md` - Authentication flows and user onboarding
- `specs/product/u/[username]/` - User experience flows, wireframes, and interface designs

### Integration & Team Documentation
- `specs/integrations/github.md` - GitHub integration specifications and OAuth setup
- `specs/teams/scan-target.md` - Team management, scan target configuration, and multi-tenant features

## Current System State (as of latest implementation)

### Backend Architecture
- **Service**: Python FastAPI application (`scan-agent/`)
- **Queue System**: Redis Lists with brpoplpush pattern for job processing
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: Claude Code SDK for vulnerability analysis
- **Authentication**: JWT-based with GitHub OAuth support

### Frontend Architecture
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict typing
- **UI**: Tailwind CSS + shadcn/ui component library
- **Authentication**: NextAuth.js with GitHub provider
- **State Management**: React Query for server state

### Key Implementation Details
- Scan jobs follow a lifecycle: pending → in_progress → completed/failed
- Repository cloning with temporary workspace management
- Background worker processes scan jobs asynchronously
- RESTful API design with proper error handling
- Database operations exclusively through Prisma client

## Development Context Rules

### Before Making Any Changes
1. **MUST READ**: Review relevant documentation in `specs/` directory
2. Understand current implementation state from `specs/scanner.md`
3. Check database schema in `db/schema.prisma`
4. Review existing patterns in codebase
5. Consider impact on both frontend and backend

### When Adding Features
1. Update relevant documentation in `specs/` first
2. Add database migrations if schema changes needed
3. Implement backend API endpoints with proper validation
4. Add frontend components with TypeScript interfaces
5. Include error handling and loading states
6. Add appropriate logging and monitoring

### Code Quality Standards
- TypeScript for all frontend code with strict types
- Python type hints for all backend code
- Prisma for all database operations
- Proper async/await patterns
- Comprehensive error handling
- Unit tests for business logic

### Security Requirements
- Input validation on all endpoints
- Parameterized queries (Prisma handles this)
- Authentication checks on protected routes
- No sensitive data in API responses
- Environment variables for all secrets

## File Structure Understanding
```
/specs/                 # Architecture & product docs (SOURCE OF TRUTH)
/scan-agent/           # Python FastAPI backend service
/frontend/             # Next.js TypeScript frontend
/db/                   # Database schema, migrations, Prisma clients
/docs/                 # Legacy docs (use specs/ for new documentation)
```

## Integration Points
- GitHub OAuth for authentication
- Claude Code SDK for AI-powered vulnerability scanning
- Redis for job queue management
- PostgreSQL for persistent data storage
- Docker for containerization and deployment

**Remember**: The `specs/` directory contains the authoritative documentation for all architectural decisions, product requirements, and implementation details. Always consult these documents to understand the system's design and current state before making changes.