# Production Database Deployment Fix - CANCELLED JobStatus

## Issue Summary

The job cancellation feature is failing with the error:
```
Invalid `prisma.scanJob.update()` invocation:
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "22P02", message: "invalid input value for enum \"JobStatus\": \"CANCELLED\"", severity: "ERROR", detail: None, column: None, hint: None })
```

## Root Cause

You are correct that the schema.prisma file includes `CANCELLED` in the JobStatus enum and the migration file exists. However, the error indicates that **the migration has not been applied to the production database yet**.

The issue is a **deployment gap**:

1. ✅ The schema.prisma file includes `CANCELLED` in the JobStatus enum (line 304)
2. ✅ The migration file exists: `db/migrations/20250909044604_add_cancelled_job_status/migration.sql`
3. ✅ The frontend and backend code correctly uses "CANCELLED" as a valid status
4. ❌ **The migration hasn't been run against the production database**

This is why PostgreSQL is returning `invalid input value for enum "JobStatus": "CANCELLED"` - the production database's JobStatus enum doesn't include CANCELLED yet, even though our code expects it to.

## Migration Content

The missing migration adds:
```sql
-- Add CANCELLED status to JobStatus enum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';
```

## Fix Instructions

### Step 1: Apply the Pending Migration

In the production environment where the database is deployed:

```bash
cd /path/to/fortify/db
npx prisma migrate deploy
```

This will apply all pending migrations, including the CANCELLED status addition.

### Step 2: Regenerate Prisma Client (If Needed)

If the production environment generates Prisma clients at runtime:

```bash
# For JavaScript client (frontend)
npx prisma generate --generator javascript

# For Python client (scan-agent) - if available in production
npx prisma generate --generator python
```

### Step 3: Restart Services

Restart the following services to ensure they pick up the updated database schema:
- Frontend application (Next.js)
- Scan agent workers
- Any other services using the database

### Step 4: Verify Fix

Test job cancellation:
1. Start a new scan job
2. Click the "Cancel Scan" button
3. Verify the job status updates to "CANCELLED" without errors

## Prevention

To prevent similar issues in the future:

1. **Automated Migration Deployment**: Ensure `prisma migrate deploy` is included in the production deployment pipeline
2. **Migration Verification**: Add a step to verify all migrations are applied after deployment
3. **Database Schema Validation**: Consider adding a health check that validates the database schema matches expectations

## Environment Variables Required

Ensure these environment variables are set in production:
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

## Files Affected

- `/db/migrations/20250909044604_add_cancelled_job_status/migration.sql` - The migration to apply
- `/db/schema.prisma` - Contains the correct JobStatus enum with CANCELLED
- `/frontend/src/app/api/jobs/[jobId]/route.ts` - Uses CANCELLED status
- `/scan-agent/scan_agent/models/job.py` - Defines CANCELLED status