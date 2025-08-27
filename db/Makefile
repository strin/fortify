# Fortify Database Management
# 
# This Makefile provides convenient commands for managing the Fortify database
# schema, migrations, and client generation.

.PHONY: help install install-js install-py setup dev migrate generate-all generate-js generate-py push reset status studio clean

# Default target
help:
	@echo "Fortify Database Commands:"
	@echo "  install     - Install all dependencies (JS + Python)"
	@echo "  setup       - Complete setup: install deps + generate clients"
	@echo "  dev         - Start Prisma Studio for database exploration"
	@echo "  migrate     - Run database migrations"
	@echo "  generate-all- Generate both JS and Python clients"
	@echo "  push        - Push schema changes without migration"
	@echo "  reset       - Reset database (destructive!)"
	@echo "  status      - Show migration status"
	@echo "  clean       - Clean generated files"

# Installation targets
install: install-js install-py

install-js:
	@echo "Installing JavaScript dependencies..."
	yarn install

install-py:
	@echo "Installing Python Prisma client..."
	pip install -U prisma

# Setup for new developers
setup: install generate-all
	@echo "Setup complete! Database clients generated."
	@echo "Next steps:"
	@echo "  1. Set up your .env file with database connection"
	@echo "  2. Run 'make migrate' to create the database schema"
	@echo "  3. Run 'make dev' to explore the database"

# Development
dev:
	@echo "Starting Prisma Studio..."
	npx prisma studio

# Database operations
migrate:
	@echo "Running database migrations..."
	npx prisma migrate dev

push:
	@echo "Pushing schema changes..."
	npx prisma db push

reset:
	@echo "⚠️  Resetting database (this will delete all data)..."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	npx prisma migrate reset --force

status:
	@echo "Checking migration status..."
	npx prisma migrate status

# Client generation
generate-all: generate-js generate-py

generate-js:
	@echo "Generating JavaScript client..."
	npx prisma@5.17.0 generate --generator javascript

generate-py:
	@echo "Generating Python client..."
	npx prisma@5.17.0 generate --generator python

# Cleanup
clean:
	@echo "Cleaning generated files..."
	rm -rf ./generated/
	rm -rf node_modules/.prisma/
