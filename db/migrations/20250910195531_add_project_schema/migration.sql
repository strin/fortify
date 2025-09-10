-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB', 'BITBUCKET', 'GITLAB', 'AZURE_DEVOPS', 'OTHER');

-- AlterTable
ALTER TABLE "scan_jobs" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "scan_targets" ADD COLUMN     "repositoryId" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastScanAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "repoUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "providerMetadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "webhookConfigured" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastScanAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_userId_isActive_idx" ON "projects"("userId", "isActive");

-- CreateIndex
CREATE INDEX "projects_lastScanAt_idx" ON "projects"("lastScanAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_userId_name_key" ON "projects"("userId", "name");

-- CreateIndex
CREATE INDEX "repositories_projectId_isActive_idx" ON "repositories"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "repositories_userId_idx" ON "repositories"("userId");

-- CreateIndex
CREATE INDEX "repositories_provider_idx" ON "repositories"("provider");

-- CreateIndex
CREATE INDEX "repositories_lastScanAt_idx" ON "repositories"("lastScanAt");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_projectId_provider_fullName_key" ON "repositories"("projectId", "provider", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_provider_externalId_key" ON "repositories"("provider", "externalId");

-- CreateIndex
CREATE INDEX "scan_jobs_projectId_idx" ON "scan_jobs"("projectId");

-- CreateIndex
CREATE INDEX "scan_targets_repositoryId_idx" ON "scan_targets"("repositoryId");

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_targets" ADD CONSTRAINT "scan_targets_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
