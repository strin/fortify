/*
  Warnings:

  - You are about to drop the column `scanJobId` on the `fix_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `fix_jobs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fix_jobs" DROP CONSTRAINT "fix_jobs_scanJobId_fkey";

-- DropIndex
DROP INDEX "fix_jobs_scanJobId_idx";

-- AlterTable
ALTER TABLE "fix_jobs" DROP COLUMN "scanJobId",
DROP COLUMN "type";

-- DropEnum
DROP TYPE "FixJobType";
