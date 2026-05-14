#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - standardized deployment helper
# Usage: ./deploy.sh [branch] [--skip-migrations]
# Example: ./deploy.sh main

BRANCH=${1:-main}
SKIP_MIGRATIONS=0
for arg in "${@}"; do
  if [ "$arg" = "--skip-migrations" ]; then
    SKIP_MIGRATIONS=1
  fi
done

echo "Deploying branch: ${BRANCH}"

# Prerequisites
command -v git >/dev/null || { echo "git required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker required" >&2; exit 1; }

DC="docker compose"

# Git fetch and checkout
echo "Fetching and checking out ${BRANCH}..."
git fetch --all --prune
git checkout "${BRANCH}" 2>/dev/null || git checkout -B "${BRANCH}"
git reset --hard "origin/${BRANCH}" 2>/dev/null || true

# Pull images
echo "Pulling images..."
$DC pull || true

# Stop stack
echo "Stopping existing stack..."
$DC down || true

# Run migrations if not skipped
if [ "$SKIP_MIGRATIONS" -eq 0 ]; then
  echo "Running migrations..."
  $DC run --rm backend bash -c "psql \"\${DATABASE_URL:-postgresql://gpl:gplpass@db:5432/gpl_db}\" -f backend/migrations/20260512_add_revoked_jtis.sql || true; psql \"\${DATABASE_URL:-postgresql://gpl:gplpass@db:5432/gpl_db}\" -f backend/migrations/20260513_add_refresh_tokens_and_mfa.sql || true" || true
fi

# Start stack
echo "Starting stack..."
$DC up -d --remove-orphans

echo "Deployment complete. Use '$DC ps' to check services."
