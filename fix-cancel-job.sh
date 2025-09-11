#!/bin/bash

# Fix for Job Cancellation Error
# This script fixes the missing CANCELLED enum value in the JobStatus enum

echo "🔧 Fixing CANCELLED enum value in JobStatus..."
echo "=" * 50

# Set database connection environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fortify"
export POSTGRES_PRISMA_URL="postgresql://postgres:postgres@localhost:5432/fortify" 
export POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@localhost:5432/fortify"

echo "✅ Database environment variables set"

# Check if PostgreSQL is running
echo "🔍 Checking if PostgreSQL is running..."
if ! docker ps | grep -q postgres; then
    echo "⚠️  PostgreSQL container not running, starting it..."
    docker compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to start..."
    sleep 5
else
    echo "✅ PostgreSQL is running"
fi

# Method 1: Try to run pending migrations
echo ""
echo "🔄 Attempting to apply database migrations..."
cd db
if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Database migrations applied successfully"
    success=true
else
    echo "⚠️  Migration deploy failed, trying manual fix..."
    success=false
fi

# Method 2: Manual enum fix if migration failed
if [ "$success" = false ]; then
    echo ""
    echo "🔧 Applying manual fix..."
    
    # Use Docker to run the SQL command directly
    docker exec -i postgres psql -U postgres -d fortify << 'EOF'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'JobStatus' AND e.enumlabel = 'CANCELLED'
    ) THEN
        ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';
        RAISE NOTICE 'Added CANCELLED value to JobStatus enum';
    ELSE
        RAISE NOTICE 'CANCELLED value already exists in JobStatus enum';
    END IF;
END
$$;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Manual fix applied successfully"
        success=true
    else
        echo "❌ Manual fix failed"
    fi
fi

# Verify the fix
if [ "$success" = true ]; then
    echo ""
    echo "🔍 Verifying the fix..."
    docker exec -i postgres psql -U postgres -d fortify -t << 'EOF'
SELECT e.enumlabel as value
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'JobStatus'
ORDER BY e.enumsortorder;
EOF
    
    echo ""
    echo "🎉 Fix completed successfully!"
    echo "✅ You can now try cancelling jobs again."
    echo ""
    echo "To test:"
    echo "1. Go to https://fortify.rocks/jobs/cmffvrnh30001brcy4wqw4ycj"
    echo "2. Click 'Cancel Scan'"
    echo "3. The job should be cancelled without errors"
    
else
    echo ""
    echo "❌ Fix failed. Please:"
    echo "1. Check that PostgreSQL is running: docker compose ps"
    echo "2. Check database connectivity"
    echo "3. Try the manual steps in fix-cancel-job-issue.md"
    exit 1
fi