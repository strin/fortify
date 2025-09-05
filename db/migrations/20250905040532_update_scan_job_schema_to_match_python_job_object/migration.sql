/*
  Warnings:

  - You are about to drop the column `branch` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `commitSha` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `filesScanned` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `llmConfig` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `llmModel` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `redisMessageId` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `repoName` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `repoOwner` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `repoUrl` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `sourceBytes` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `scan_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `workerId` on the `scan_jobs` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `scan_jobs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "scan_jobs_repoUrl_commitSha_requestId_key";

-- DropIndex
DROP INDEX "scan_jobs_status_createdAt_idx";

-- AlterTable
ALTER TABLE "scan_jobs" DROP COLUMN "branch",
DROP COLUMN "commitSha",
DROP COLUMN "createdAt",
DROP COLUMN "filesScanned",
DROP COLUMN "llmConfig",
DROP COLUMN "llmModel",
DROP COLUMN "redisMessageId",
DROP COLUMN "repoName",
DROP COLUMN "repoOwner",
DROP COLUMN "repoUrl",
DROP COLUMN "requestId",
DROP COLUMN "sourceBytes",
DROP COLUMN "updatedAt",
DROP COLUMN "webhookUrl",
DROP COLUMN "workerId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "scan_jobs_status_created_at_idx" ON "scan_jobs"("status", "created_at");
