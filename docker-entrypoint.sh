#!/usr/bin/env bash
set -euo pipefail

# docker-entrypoint.sh
# Entrypoint for ldc-store Docker container
# 1. Pass-through: if arguments provided, exec them directly
# 2. Normal startup: check DATABASE_URL, run migrations, start server

# Pass-through mode: exec arguments directly (for `docker run ... whoami`)
if [ $# -gt 0 ]; then
  exec "$@"
fi

# Check DATABASE_URL before attempting migrations
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERROR: DATABASE_URL is not set. Cannot start without database connection."
  exit 1
fi

MAX_RETRIES=30
RETRY_INTERVAL=2

echo "🚀 Starting ldc-store container..."

# Run migrations with bounded retries
attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
  echo "📦 Running migrations (attempt $attempt/$MAX_RETRIES)..."
  
  if node scripts/docker-migrate.mjs; then
    echo "✅ Migrations completed successfully"
    break
  fi
  
  if [ $attempt -eq $MAX_RETRIES ]; then
    echo "❌ Failed to run migrations after $MAX_RETRIES attempts"
    exit 1
  fi
  
  echo "⏳ Migration failed, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
  attempt=$((attempt + 1))
done

# Start Next.js server
echo "🌐 Starting Next.js server..."
exec node server.js
