#!/usr/bin/env python3
"""
Fix job status synchronization between Redis and Database.

This script identifies and fixes jobs where Redis shows COMPLETED 
but the database shows IN_PROGRESS, which can happen due to database
update failures that were previously silently swallowed.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

# Add the scan_agent package to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scan_agent.utils.queue import JobQueue
from scan_agent.utils.database import init_database, get_db, close_database
from scan_agent.models.job import JobStatus


async def find_inconsistent_jobs() -> List[Dict[str, Any]]:
    """Find jobs where Redis and database status don't match."""
    print("🔍 Finding jobs with inconsistent status between Redis and Database...")
    
    # Initialize database connection
    await init_database()
    db = await get_db()
    
    # Get job queue
    job_queue = JobQueue()
    
    inconsistent_jobs = []
    
    try:
        # Get all jobs from Redis
        redis_jobs = job_queue.list_jobs(limit=1000)
        print(f"📊 Found {len(redis_jobs)} jobs in Redis")
        
        for redis_job in redis_jobs:
            try:
                # Get corresponding database record
                db_job = await db.scanjob.find_unique(where={"id": redis_job.id})
                
                if db_job:
                    redis_status = redis_job.status.value
                    db_status = db_job.status
                    
                    if redis_status != db_status:
                        inconsistent_jobs.append({
                            "job_id": redis_job.id,
                            "redis_status": redis_status,
                            "db_status": db_status,
                            "created_at": redis_job.created_at.isoformat(),
                            "updated_at": redis_job.updated_at.isoformat() if redis_job.updated_at else None,
                            "db_started_at": db_job.startedAt.isoformat() if db_job.startedAt else None,
                            "db_finished_at": db_job.finishedAt.isoformat() if db_job.finishedAt else None,
                            "redis_result": bool(redis_job.result),
                            "db_result": bool(db_job.result),
                        })
                        print(f"⚠️  Inconsistent job found: {redis_job.id}")
                        print(f"   Redis: {redis_status}, Database: {db_status}")
                else:
                    # Job exists in Redis but not in database
                    inconsistent_jobs.append({
                        "job_id": redis_job.id,
                        "redis_status": redis_job.status.value,
                        "db_status": "MISSING",
                        "created_at": redis_job.created_at.isoformat(),
                        "updated_at": redis_job.updated_at.isoformat() if redis_job.updated_at else None,
                        "db_started_at": None,
                        "db_finished_at": None,
                        "redis_result": bool(redis_job.result),
                        "db_result": False,
                    })
                    print(f"⚠️  Job missing from database: {redis_job.id}")
                    
            except Exception as e:
                print(f"❌ Error checking job {redis_job.id}: {e}")
                continue
                
    finally:
        await close_database()
    
    return inconsistent_jobs


async def fix_inconsistent_job(job_info: Dict[str, Any], dry_run: bool = True) -> bool:
    """Fix a single inconsistent job."""
    job_id = job_info["job_id"]
    redis_status = job_info["redis_status"]
    db_status = job_info["db_status"]
    
    print(f"\n🔧 {'[DRY RUN] ' if dry_run else ''}Fixing job {job_id}")
    print(f"   Redis: {redis_status}, Database: {db_status}")
    
    if dry_run:
        print(f"   Would update database status from {db_status} to {redis_status}")
        return True
        
    try:
        await init_database()
        db = await get_db()
        
        if db_status == "MISSING":
            print(f"   Skipping job {job_id} - missing from database entirely")
            return False
            
        # Update database status to match Redis
        update_data = {"status": redis_status}
        
        # If Redis shows COMPLETED, set finishedAt if not already set
        if redis_status == "COMPLETED" and not job_info["db_finished_at"]:
            update_data["finishedAt"] = datetime.now()
            
        # If Redis shows IN_PROGRESS, set startedAt if not already set  
        elif redis_status == "IN_PROGRESS" and not job_info["db_started_at"]:
            update_data["startedAt"] = datetime.now()
        
        await db.scanjob.update(
            where={"id": job_id},
            data=update_data
        )
        
        print(f"   ✅ Updated database status to {redis_status}")
        
        # Get Redis job result and copy to database if needed
        job_queue = JobQueue()
        redis_job = job_queue.get_job(job_id)
        
        if redis_job and redis_job.result and not job_info["db_result"]:
            try:
                # Copy result from Redis to database
                await db.scanjob.update(
                    where={"id": job_id},
                    data={"result": json.dumps(redis_job.result, default=str)}
                )
                print(f"   ✅ Copied result from Redis to database")
            except Exception as e:
                print(f"   ⚠️  Failed to copy result: {e}")
        
        await close_database()
        return True
        
    except Exception as e:
        print(f"   ❌ Failed to fix job {job_id}: {e}")
        await close_database()
        return False


async def main():
    """Main function."""
    print("🚀 Job Status Synchronization Fix Tool")
    print("=" * 50)
    
    # Find inconsistent jobs
    inconsistent_jobs = await find_inconsistent_jobs()
    
    if not inconsistent_jobs:
        print("\n✅ No inconsistent jobs found! All job statuses are synchronized.")
        return
        
    print(f"\n📊 Found {len(inconsistent_jobs)} inconsistent jobs:")
    print("\nSummary:")
    
    status_combos = {}
    for job in inconsistent_jobs:
        combo = f"Redis:{job['redis_status']} -> DB:{job['db_status']}"
        status_combos[combo] = status_combos.get(combo, 0) + 1
        
    for combo, count in status_combos.items():
        print(f"   {combo}: {count} jobs")
    
    print("\nDetailed list:")
    for job in inconsistent_jobs[:10]:  # Show first 10
        print(f"   {job['job_id']}: Redis={job['redis_status']}, DB={job['db_status']}")
    
    if len(inconsistent_jobs) > 10:
        print(f"   ... and {len(inconsistent_jobs) - 10} more")
    
    # Ask user what to do
    print(f"\n{'='*50}")
    print("Options:")
    print("1. Show detailed analysis (dry run)")
    print("2. Fix all inconsistencies by updating database to match Redis")
    print("3. Exit without making changes")
    
    try:
        choice = input("\nEnter your choice (1-3): ").strip()
    except KeyboardInterrupt:
        print("\n\n👋 Exiting...")
        return
        
    if choice == "1":
        print("\n🔍 Performing dry run...")
        fixed_count = 0
        for job in inconsistent_jobs:
            success = await fix_inconsistent_job(job, dry_run=True)
            if success:
                fixed_count += 1
        print(f"\n📊 Dry run complete: {fixed_count}/{len(inconsistent_jobs)} jobs would be fixed")
        
    elif choice == "2":
        print(f"\n⚠️  You are about to fix {len(inconsistent_jobs)} inconsistent jobs.")
        print("This will update the database status to match Redis status.")
        
        try:
            confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
        except KeyboardInterrupt:
            print("\n\n👋 Cancelled.")
            return
            
        if confirm in ["yes", "y"]:
            print("\n🔧 Fixing inconsistent jobs...")
            fixed_count = 0
            failed_count = 0
            
            for job in inconsistent_jobs:
                success = await fix_inconsistent_job(job, dry_run=False)
                if success:
                    fixed_count += 1
                else:
                    failed_count += 1
                    
            print(f"\n📊 Fix complete:")
            print(f"   ✅ Fixed: {fixed_count} jobs")
            print(f"   ❌ Failed: {failed_count} jobs")
            print(f"   📊 Total: {len(inconsistent_jobs)} jobs processed")
            
            if fixed_count > 0:
                print(f"\n🎉 Successfully synchronized {fixed_count} job statuses!")
        else:
            print("\n👋 Operation cancelled.")
            
    else:
        print("\n👋 Exiting without making changes.")


if __name__ == "__main__":
    asyncio.run(main())