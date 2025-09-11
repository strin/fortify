-- Fix for missing CANCELLED enum value in JobStatus
-- This script adds CANCELLED to the JobStatus enum if it doesn't already exist

-- Check if CANCELLED value already exists, if not, add it
DO $$
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'JobStatus' AND e.enumlabel = 'CANCELLED'
    ) THEN
        -- Add the CANCELLED value to the JobStatus enum
        ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';
        RAISE NOTICE 'Added CANCELLED value to JobStatus enum';
    ELSE
        RAISE NOTICE 'CANCELLED value already exists in JobStatus enum';
    END IF;
END
$$;