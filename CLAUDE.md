# Claude Development Context for Fortify

## Project Overview
Fortify is an AI-powered security scanning platform that validates AI-generated code, dependencies, and vulnerabilities in real-time. The system focuses on low false positives (<1%), auto-fixes, and seamless integration into developer workflows.

## Architecture & Documentation Location
**CRITICAL**: All architecture and product documentation is stored in the `specs/` directory and its subdirectories. Always consult these files when making decisions or understanding the system:

### Documentation Structure
The `specs/` directory contains the source of truth for all architectural decisions and product requirements:

- **Architecture**: `specs/architecture/` contains system architecture, implementation details, and technical specifications
- **Product Requirements**: `specs/product/` contains all PRDs, user flows, feature specifications, and UI/UX documentation  
- **Integration Specifications**: `specs/architecture/integrations/` contains third-party integration specs and API documentation
- **Team & Configuration**: `specs/architecture/teams/` contains team management, configuration, and multi-tenant specifications
- **Additional Subdirectories**: Any new subdirectories in `specs/` follow the same documentation standards

### Key Documents to Always Reference
- `specs/architecture/mvp.md` - Complete MVP architecture design and implementation roadmap
- `specs/architecture/scanner.md` - Current scan system implementation and Redis-based queue system
- `specs/architecture/schema.md` - Database schema, data models, and relationships
- `specs/product/` - All product requirements, user stories, and specifications
- Any other `.md` files in `specs/` and its subdirectories

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
1. **MUST READ**: Search and review relevant documentation in `specs/` directory and all subdirectories
2. Check for related PRDs in `specs/product/` that might affect your changes
3. Understand current implementation state from architecture docs in `specs/architecture/`
4. Check database schema in `db/schema.prisma`
5. Review existing patterns in codebase
6. Consider impact on both frontend and backend

### When Adding Features
1. Create or update relevant documentation in appropriate `specs/` subdirectories first
2. For product features, create/update PRDs in `specs/product/`
3. For technical features, update architecture docs in `specs/architecture/`
4. Add database migrations if schema changes needed
5. Implement backend API endpoints with proper validation
6. Add frontend components with TypeScript interfaces
7. Include error handling and loading states
8. Add appropriate logging and monitoring

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
  /architecture/        # All technical architecture and implementation specs
    /integrations/      # Third-party integration specifications
    /teams/             # Team management and configuration specs
    /*.md               # Core architecture documents (mvp, scanner, schema, etc.)
  /product/             # All PRDs, user flows, feature specifications
    /u/                 # User experience flows and wireframes
    /*.md               # Product requirements and specifications
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

**Remember**: The `specs/` directory and all its subdirectories contain the authoritative documentation for all architectural decisions, product requirements, and implementation details. Always search and consult relevant documents in `specs/` to understand the system's design and current state before making changes. New PRDs should be added to `specs/product/` and new architecture docs to `specs/architecture/` or its subdirectories.