-- CreateEnum
CREATE TYPE "FixJobType" AS ENUM ('VULNERABILITY_FIX', 'SECURITY_ENHANCEMENT');

-- CreateEnum  
CREATE TYPE "FixJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fix_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "FixJobType" NOT NULL DEFAULT 'VULNERABILITY_FIX',
    "status" "FixJobStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "vulnerabilityId" TEXT NOT NULL,
    "scanJobId" TEXT NOT NULL,
    "branchName" TEXT,
    "commitSha" TEXT,
    "pullRequestUrl" TEXT,
    "pullRequestId" INTEGER,

    CONSTRAINT "fix_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fix_jobs_status_created_at_idx" ON "fix_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "fix_jobs_userId_idx" ON "fix_jobs"("userId");

-- CreateIndex
CREATE INDEX "fix_jobs_vulnerabilityId_idx" ON "fix_jobs"("vulnerabilityId");

-- CreateIndex
CREATE INDEX "fix_jobs_scanJobId_idx" ON "fix_jobs"("scanJobId");

-- AddForeignKey
ALTER TABLE "fix_jobs" ADD CONSTRAINT "fix_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_jobs" ADD CONSTRAINT "fix_jobs_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "code_vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_jobs" ADD CONSTRAINT "fix_jobs_scanJobId_fkey" FOREIGN KEY ("scanJobId") REFERENCES "scan_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;