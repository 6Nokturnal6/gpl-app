#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - standardized deployment helper for docker-compose stacks
# Usage: ./deploy.sh [branch] [--skip-migrations] [--prod]
# Example: ./deploy.sh main --prod  (uses docker-compose.prod.yml)
# Example: ./deploy.sh feature/yearly-rollover (uses docker-compose.yml)

BRANCH=${1:-main}
SKIP_MIGRATIONS=0
USE_PROD=0

for arg in "${@}"; do
  if [ "$arg" = "--skip-migrations" ]; then
    SKIP_MIGRATIONS=1
  fi
  if [ "$arg" = "--prod" ]; then
    USE_PROD=1
  fi
done

if [ "$USE_PROD" -eq 1 ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  echo "Using production compose file: $COMPOSE_FILE"
else
  COMPOSE_FILE="docker-compose.yml"
  echo "Using standard compose file: $COMPOSE_FILE"
fi

echo "Deploying branch: ${BRANCH}"

# Prerequisites
command -v git >/dev/null || { echo "git required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker required" >&2; exit 1; }

DC="docker compose -f $COMPOSE_FILE"

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
  $DC run --rm backend bash -c "psql \"\${DATABASE_URL:-postgresql://gpl_user:gplpass@postgres:5432/gpl_db}\" -f backend/migrations/20260512_add_revoked_jtis.sql || true; psql \"\${DATABASE_URL:-postgresql://gpl_user:gplpass@postgres:5432/gpl_db}\" -f backend/migrations/20260513_add_refresh_tokens_and_mfa.sql || true" || true
fi

# Start stack
echo "Starting stack..."
$DC up -d --remove-orphans

echo "Deployment complete. Use '$DC ps' to check services."
if [ "$USE_PROD" -eq 1 ]; then
  echo "App should be live at: https://agplurio.unilurio.ac.mz"
fi
