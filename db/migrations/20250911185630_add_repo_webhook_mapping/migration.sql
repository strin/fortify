-- CreateTable
CREATE TABLE "repo_webhook_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "repo_webhook_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repo_webhook_mappings_userId_idx" ON "repo_webhook_mappings"("userId");

-- CreateIndex
CREATE INDEX "repo_webhook_mappings_projectId_idx" ON "repo_webhook_mappings"("projectId");

-- CreateIndex
CREATE INDEX "repo_webhook_mappings_repositoryId_idx" ON "repo_webhook_mappings"("repositoryId");

-- CreateIndex
CREATE INDEX "repo_webhook_mappings_webhookId_idx" ON "repo_webhook_mappings"("webhookId");

-- CreateIndex
CREATE UNIQUE INDEX "repo_webhook_mappings_provider_webhookId_key" ON "repo_webhook_mappings"("provider", "webhookId");

-- CreateIndex
CREATE UNIQUE INDEX "repo_webhook_mappings_repositoryId_provider_key" ON "repo_webhook_mappings"("repositoryId", "provider");

-- AddForeignKey
ALTER TABLE "repo_webhook_mappings" ADD CONSTRAINT "repo_webhook_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_webhook_mappings" ADD CONSTRAINT "repo_webhook_mappings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_webhook_mappings" ADD CONSTRAINT "repo_webhook_mappings_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
