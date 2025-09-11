#!/usr/bin/env python3
"""
Script to fix the missing CANCELLED enum value in the JobStatus enum.
This addresses the error: invalid input value for enum "JobStatus": "CANCELLED"
"""

import os
import sys
import asyncio
import asyncpg

async def fix_cancelled_enum():
    """Add CANCELLED value to JobStatus enum if it doesn't exist."""
    
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/fortify')
    
    print(f"Connecting to database...")
    print(f"Database URL: {database_url}")
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database successfully")
        
        # Check if CANCELLED value already exists in JobStatus enum
        check_query = """
        SELECT EXISTS (
            SELECT 1 FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'JobStatus' AND e.enumlabel = 'CANCELLED'
        ) as cancelled_exists
        """
        
        result = await conn.fetchrow(check_query)
        cancelled_exists = result['cancelled_exists']
        
        if cancelled_exists:
            print("ℹ️  CANCELLED value already exists in JobStatus enum")
        else:
            print("⚠️  CANCELLED value missing from JobStatus enum, adding it...")
            
            # Add CANCELLED to the JobStatus enum
            alter_query = 'ALTER TYPE "JobStatus" ADD VALUE \'CANCELLED\''
            await conn.execute(alter_query)
            
            print("✅ Successfully added CANCELLED value to JobStatus enum")
        
        # Verify the fix by checking all enum values
        verify_query = """
        SELECT e.enumlabel as value
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'JobStatus'
        ORDER BY e.enumsortorder
        """
        
        enum_values = await conn.fetch(verify_query)
        print(f"\nCurrent JobStatus enum values:")
        for row in enum_values:
            print(f"  - {row['value']}")
        
        await conn.close()
        print("\n✅ Database connection closed")
        print("✅ Fix completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def main():
    """Main function."""
    print("🔧 Fixing CANCELLED enum value in JobStatus...")
    print("=" * 50)
    
    success = await fix_cancelled_enum()
    
    if success:
        print("\n🎉 All done! The CANCELLED enum value should now be available.")
        print("You can now try cancelling jobs again.")
        sys.exit(0)
    else:
        print("\n❌ Fix failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())