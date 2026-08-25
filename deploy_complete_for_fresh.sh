#!/usr/bin/env bash
set -euo pipefail

# Destructive fresh deployment. It removes this Compose project's volumes.
# Usage:
#   SUPERADMIN_PASSWORD='...' DIRECTOR_PASSWORD='...' ./deploy_complete_for_fresh.sh [branch] [--prod]

BRANCH=main
USE_PROD=0
for arg in "$@"; do
  case "$arg" in
    --prod) USE_PROD=1 ;;
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
[ -f .env ] || { echo "Missing .env" >&2; exit 1; }

set -a
source .env
set +a

: "${SUPERADMIN_PASSWORD:?Set SUPERADMIN_PASSWORD for the fresh Super Admin account}"
: "${DIRECTOR_PASSWORD:?Set DIRECTOR_PASSWORD for the fresh Director GPL account}"

DB_USER="${POSTGRES_USER:-gpl_user}"
DB_NAME="${POSTGRES_DB:-gpl_db}"
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-admin@mined.gov.mz}"
SUPERADMIN_NAME="${SUPERADMIN_NAME:-Super Administrador}"
SUPERADMIN_INSTITUTION="${SUPERADMIN_INSTITUTION:-Ministério da Educação}"
DIRECTOR_EMAIL="${DIRECTOR_EMAIL:-director@unilurio.ac.mz}"
DIRECTOR_NAME="${DIRECTOR_NAME:-Director GPL}"
DIRECTOR_INSTITUTION="${DIRECTOR_INSTITUTION:-Universidade Lúrio}"
DIRECTOR_UNIVERSITY_NAME="${DIRECTOR_UNIVERSITY_NAME:-Universidade Lúrio}"
DIRECTOR_UNIVERSITY_SIGLA="${DIRECTOR_UNIVERSITY_SIGLA:-UNILURIO}"
DIRECTOR_UNIVERSITY_NUIT="${DIRECTOR_UNIVERSITY_NUIT:-}"

DC=(docker compose -f "$COMPOSE_FILE")

echo "WARNING: this will permanently delete the database volumes for this Compose project."
if [ "${CONFIRM_FRESH_DEPLOY:-}" != "YES" ]; then
  echo "Set CONFIRM_FRESH_DEPLOY=YES to continue." >&2
  exit 1
fi

echo "Deploying fresh ${BRANCH} with ${COMPOSE_FILE}"
git fetch --all --prune
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

echo "Removing old stack and database volumes..."
"${DC[@]}" down --volumes --remove-orphans

echo "Initializing PostgreSQL from schema..."
"${DC[@]}" up -d postgres
until "${DC[@]}" exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 2
done

# The schema is mounted into the init directory for the new volume. Reapply it
# explicitly as well so the script remains correct if the volume was reused.
"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  < backend/src/models/schema.sql
for migration in backend/migrations/*.sql; do
  [ -f "$migration" ] || continue
  echo "  Applying $migration"
  "${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$migration"
done

echo "Building backend image for password hashing..."
"${DC[@]}" build backend
SUPERADMIN_HASH=$("${DC[@]}" run --rm -T backend node -e \
  'require("bcrypt").hash(process.argv[1], 12).then(console.log)' "$SUPERADMIN_PASSWORD")
DIRECTOR_HASH=$("${DC[@]}" run --rm -T backend node -e \
  'require("bcrypt").hash(process.argv[1], 12).then(console.log)' "$DIRECTOR_PASSWORD")

echo "Recreating Super Admin and Director GPL accounts..."
UNIVERSITY_ID=$("${DC[@]}" exec -T postgres psql -At -v ON_ERROR_STOP=1 \
  -U "$DB_USER" -d "$DB_NAME" \
  -v university_name="$DIRECTOR_UNIVERSITY_NAME" \
  -v university_sigla="$DIRECTOR_UNIVERSITY_SIGLA" \
  -v university_nuit="$DIRECTOR_UNIVERSITY_NUIT" \
  -c "INSERT INTO universities (nome, sigla, nuit)
      VALUES (:'university_name', NULLIF(:'university_sigla',''), NULLIF(:'university_nuit',''))
      RETURNING id;")
UNIVERSITY_ID="$(printf '%s' "$UNIVERSITY_ID" | tr -d '[:space:]')"

"${DC[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  -v super_email="$SUPERADMIN_EMAIL" \
  -v super_hash="$SUPERADMIN_HASH" \
  -v super_name="$SUPERADMIN_NAME" \
  -v super_institution="$SUPERADMIN_INSTITUTION" \
  -v director_email="$DIRECTOR_EMAIL" \
  -v director_hash="$DIRECTOR_HASH" \
  -v director_name="$DIRECTOR_NAME" \
  -v director_institution="$DIRECTOR_INSTITUTION" \
  -v university_id="$UNIVERSITY_ID" <<'SQL'
INSERT INTO users (email, password, nome, institution, role, university_id)
VALUES (:'super_email', :'super_hash', :'super_name', :'super_institution', 'superadmin', NULL)
ON CONFLICT (email) DO UPDATE SET
  password=EXCLUDED.password, nome=EXCLUDED.nome, institution=EXCLUDED.institution,
  role='superadmin', university_id=NULL, campus_id=NULL, is_active=TRUE,
  deactivated_at=NULL, deactivated_by=NULL;

INSERT INTO users (email, password, nome, institution, role, university_id)
VALUES (:'director_email', :'director_hash', :'director_name', :'director_institution', 'director_gpl', :'university_id'::uuid)
ON CONFLICT (email) DO UPDATE SET
  password=EXCLUDED.password, nome=EXCLUDED.nome, institution=EXCLUDED.institution,
  role='director_gpl', university_id=EXCLUDED.university_id, campus_id=NULL,
  is_active=TRUE, deactivated_at=NULL, deactivated_by=NULL;
SQL

echo "Building and starting full stack..."
"${DC[@]}" up -d --build --remove-orphans
"${DC[@]}" ps
if [ "$USE_PROD" -eq 1 ]; then
  echo "Production URL: https://agplurio.unilurio.ac.mz"
fi
