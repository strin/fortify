# Fix for Job Cancellation Error

## Problem
When clicking "Cancel" on a scan job, you're getting this error:
```
Error [PrismaClientUnknownRequestError]: invalid input value for enum "JobStatus": "CANCELLED"
```

## Root Cause
The database schema doesn't have the `CANCELLED` value in the `JobStatus` enum, even though:
1. The migration file `20250909044604_add_cancelled_job_status/migration.sql` exists
2. The Prisma schema defines `CANCELLED` in the `JobStatus` enum
3. The frontend and backend code correctly handle job cancellation

This indicates the migration hasn't been applied to the actual database.

## Solution

### Option 1: Run Database Migration (Recommended)
1. **Start your database** (if not already running):
   ```bash
   cd /workspace
   docker compose up -d postgres
   ```

2. **Set environment variables and run migration**:
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fortify"
   export POSTGRES_PRISMA_URL="postgresql://postgres:postgres@localhost:5432/fortify" 
   export POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@localhost:5432/fortify"
   
   cd db
   npx prisma migrate deploy
   ```

### Option 2: Manual Database Fix
If the migration doesn't work, you can manually add the enum value:

1. **Connect to PostgreSQL**:
   ```bash
   docker exec -it postgres psql -U postgres -d fortify
   ```

2. **Run the SQL command**:
   ```sql
   ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';
   ```

3. **Verify the fix**:
   ```sql
   SELECT e.enumlabel as value
   FROM pg_enum e 
   JOIN pg_type t ON e.enumtypid = t.oid 
   WHERE t.typname = 'JobStatus'
   ORDER BY e.enumsortorder;
   ```

   You should see: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`

4. **Exit PostgreSQL**:
   ```sql
   \q
   ```

### Option 3: Using the Fix Script
I've created a Python script that can automatically fix this:

```bash
cd /workspace
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fortify"
python3 fix_cancelled_enum.py
```

## Verification
After applying the fix:

1. **Try cancelling a job** - the error should be gone
2. **Check the job status** - it should show as "CANCELLED"
3. **The frontend should display** the cancelled state properly

## What the Fix Does
The fix adds the `CANCELLED` value to the PostgreSQL enum type `JobStatus`, which allows the Prisma client to successfully update job records with this status.

## Prevention
To prevent this in the future:
1. Always run `npx prisma migrate deploy` after pulling changes that include new migrations
2. Check migration status with `npx prisma migrate status` before deploying
3. Ensure environment variables are set correctly for database connections

## Files Created
- `fix_cancelled_enum.py` - Python script to automatically fix the enum
- `fix-cancelled-enum.sql` - Raw SQL script for manual application