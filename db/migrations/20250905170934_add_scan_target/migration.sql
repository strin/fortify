-- AlterTable
ALTER TABLE "scan_jobs" ADD COLUMN     "scanTargetId" TEXT;

-- CreateTable
CREATE TABLE "scan_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "subPath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastScanAt" TIMESTAMP(3),

    CONSTRAINT "scan_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_targets_userId_isActive_idx" ON "scan_targets"("userId", "isActive");

-- CreateIndex
CREATE INDEX "scan_targets_lastScanAt_idx" ON "scan_targets"("lastScanAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_targets_userId_repoUrl_branch_subPath_key" ON "scan_targets"("userId", "repoUrl", "branch", "subPath");

-- CreateIndex
CREATE INDEX "scan_jobs_scanTargetId_idx" ON "scan_jobs"("scanTargetId");

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_scanTargetId_fkey" FOREIGN KEY ("scanTargetId") REFERENCES "scan_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_targets" ADD CONSTRAINT "scan_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
