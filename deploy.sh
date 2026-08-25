#!/usr/bin/env bash
set -euo pipefail

# Incremental deployment. This script never removes database volumes.
# Usage: ./deploy.sh [branch] [--prod] [--skip-migrations]

BRANCH=main
USE_PROD=0
SKIP_MIGRATIONS=0

for arg in "$@"; do
  case "$arg" in
    --prod) USE_PROD=1 ;;
    --skip-migrations) SKIP_MIGRATIONS=1 ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) BRANCH="$arg" ;;
  esac
done

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

COMPOSE_FILE=docker-compose.yml
if [ "$USE_PROD" -eq 1 ]; then
  COMPOSE_FILE=docker-compose.prod.yml
fi
[ -f "$COMPOSE_FILE" ] || { echo "Missing $COMPOSE_FILE" >&2; exit 1; }

DC=(docker compose -f "$COMPOSE_FILE")
if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example and configure production secrets first." >&2
  exit 1
fi

set -a
source .env
set +a

DB_USER="${POSTGRES_USER:-gpl_user}"
DB_NAME="${POSTGRES_DB:-gpl_db}"

echo "Deploying ${BRANCH} with ${COMPOSE_FILE}"
git fetch --all --prune
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

echo "Starting database..."
"${DC[@]}" up -d postgres
until "${DC[@]}" exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 2
done

if [ "$SKIP_MIGRATIONS" -eq 0 ]; then
  echo "Applying schema and migrations..."
  "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    < backend/src/models/schema.sql
  for migration in backend/migrations/*.sql; do
    [ -f "$migration" ] || continue
    echo "  Applying $migration"
    "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$migration"
  done
fi

echo "Building and restarting application..."
"${DC[@]}" up -d --build --remove-orphans
# Recreate/reload the proxy so it does not retain an old backend container IP.
"${DC[@]}" up -d --force-recreate nginx
"${DC[@]}" ps
