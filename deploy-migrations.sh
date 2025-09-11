#!/bin/bash

# Fortify Production Migration Deployment Script
# This script applies pending database migrations and regenerates Prisma clients

set -e  # Exit on any error

echo "🚀 Starting Fortify migration deployment..."

# Change to database directory
cd "$(dirname "$0")/db"

echo "📋 Checking migration status..."

# Check if required environment variables are set
if [ -z "$POSTGRES_PRISMA_URL" ]; then
    echo "❌ Error: POSTGRES_PRISMA_URL environment variable is not set"
    exit 1
fi

if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
    echo "❌ Error: POSTGRES_URL_NON_POOLING environment variable is not set"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔍 Checking current migration status..."
npx prisma migrate status || echo "⚠️  Some migrations may be pending"

echo "🔄 Applying pending migrations..."
npx prisma migrate deploy

echo "✅ All migrations applied successfully!"

echo "🔧 Regenerating Prisma clients..."

# Generate JavaScript client (for frontend)
echo "📝 Generating JavaScript client..."
npx prisma generate --generator javascript

# Generate Python client if the generator is available
if npx prisma generate --generator python 2>/dev/null; then
    echo "📝 Generated Python client successfully"
else
    echo "⚠️  Python client generator not available (this is okay for frontend-only deployments)"
fi

echo "🎉 Migration deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your application services"
echo "2. Test the job cancellation functionality"
echo "3. Verify no more 'CANCELLED' enum errors occur"

exit 0