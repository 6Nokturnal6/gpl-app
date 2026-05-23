```bash
#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# GPL Deployment Script
# =========================================================
# Usage:
#
#   ./deploy.sh
#   ./deploy.sh main
#   ./deploy.sh main --prod
#   ./deploy.sh main --skip-migrations
#
# =========================================================

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

# =========================================================
# Compose file
# =========================================================

if [ "$USE_PROD" -eq 1 ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
else
  COMPOSE_FILE="docker-compose.yml"
fi

DC="docker compose -f $COMPOSE_FILE"

echo "=================================================="
echo "GPL Deployment"
echo "=================================================="
echo "Branch: $BRANCH"
echo "Compose: $COMPOSE_FILE"
echo "=================================================="

# =========================================================
# Requirements
# =========================================================

command -v git >/dev/null || {
  echo "git is required"
  exit 1
}

command -v docker >/dev/null || {
  echo "docker is required"
  exit 1
}

# =========================================================
# Git update
# =========================================================

echo ""
echo "Updating repository..."

git fetch --all --prune

git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH"

git reset --hard "origin/$BRANCH" 2>/dev/null || true

# =========================================================
# Pull images
# =========================================================

echo ""
echo "Pulling images..."

$DC pull || true

# =========================================================
# Stop old stack
# =========================================================

echo ""
echo "Stopping existing containers..."

$DC down || true

# =========================================================
# Start PostgreSQL first
# =========================================================

echo ""
echo "Starting PostgreSQL..."

$DC up -d postgres

# =========================================================
# Wait for PostgreSQL health
# =========================================================

echo ""
echo "Waiting for PostgreSQL..."

until docker inspect \
  --format='{{json .State.Health.Status}}' \
  gpl_postgres 2>/dev/null | grep -q healthy; do

  sleep 2
  echo "Waiting for PostgreSQL..."
done

echo "PostgreSQL is healthy."

# =========================================================
# Enable extensions
# =========================================================

echo ""
echo "Enabling PostgreSQL extensions..."

docker exec -i gpl_postgres psql \
  -U gpl_user \
  -d gpl_db \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# =========================================================
# Detect fresh install
# =========================================================

echo ""
echo "Checking database initialization..."

TABLE_EXISTS=$(
docker exec -i gpl_postgres psql \
  -U gpl_user \
  -d gpl_db \
  -tAc "
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema='public'
      AND table_name='users'
    );
  "
)

if [ "$TABLE_EXISTS" != "t" ]; then

  echo ""
  echo "Fresh installation detected."
  echo "Importing base schema..."

  docker exec -i gpl_postgres psql \
    -U gpl_user \
    -d gpl_db \
    < backend/src/models/schema.sql

  echo "Base schema imported."

else

  echo ""
  echo "Existing database detected."
  echo "Skipping base schema import."

fi

# =========================================================
# Incremental migrations
# =========================================================

if [ "$SKIP_MIGRATIONS" -eq 0 ]; then

echo ""
echo "Running database migrations..."

docker exec -i gpl_postgres psql \
  -U gpl_user \
  -d gpl_db <<'SQL'

-- =====================================================
-- USERS
-- =====================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nome TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS university_id UUID;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS campus_id UUID;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deactivated_by UUID;

-- =====================================================
-- SUBMISSIONS
-- =====================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS campus_id UUID;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS university_id UUID;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE submissions
  ALTER COLUMN year DROP DEFAULT;

-- =====================================================
-- SUBMISSION YEAR
-- =====================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submission_year INTEGER;

-- Backfill existing rows safely

UPDATE submissions
SET submission_year =
  EXTRACT(YEAR FROM COALESCE(created_at, now()))::INT
WHERE submission_year IS NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_year
  ON submissions (submission_year);

-- =====================================================
-- REVOKED TOKENS
-- =====================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token TEXT PRIMARY KEY,

  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  reason TEXT
);

-- =====================================================
-- UNIVERSITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  sigla TEXT,
  nuit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CAMPUSES
-- =====================================================

CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  university_id UUID NOT NULL
    REFERENCES universities(id)
    ON DELETE CASCADE,

  nome TEXT NOT NULL,

  provincia TEXT,
  distrito TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- UNIVERSITY IES
-- =====================================================

CREATE TABLE IF NOT EXISTS university_id_ies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  university_id UUID NOT NULL
    REFERENCES universities(id)
    ON DELETE CASCADE,

  nome TEXT,
  sigla TEXT,
  nuit TEXT,
  ano_inicio INTEGER,

  provincia TEXT,
  distrito TEXT,

  website TEXT,
  contacto TEXT,
  email TEXT,

  responsavel TEXT,
  funcao TEXT,
  email_resp TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(university_id)
);

-- =====================================================
-- SECTION LOCKS
-- =====================================================

CREATE TABLE IF NOT EXISTS section_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  submission_id UUID NOT NULL
    REFERENCES submissions(id)
    ON DELETE CASCADE,

  section TEXT NOT NULL,

  locked_by UUID REFERENCES users(id),

  locked_at TIMESTAMPTZ DEFAULT NOW(),

  unlock_requested BOOLEAN DEFAULT FALSE,

  unlock_requested_at TIMESTAMPTZ,

  UNIQUE(submission_id, section)
);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES users(id),

  user_email TEXT,
  user_role TEXT,

  action TEXT NOT NULL,

  entity_type TEXT,
  entity_id TEXT,

  section TEXT,

  detail JSONB,

  ip_address TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user
  ON audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_log(created_at DESC);

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name='users_university_id_fkey'
  ) THEN

    ALTER TABLE users
      ADD CONSTRAINT users_university_id_fkey
      FOREIGN KEY (university_id)
      REFERENCES universities(id);

  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name='users_campus_id_fkey'
  ) THEN

    ALTER TABLE users
      ADD CONSTRAINT users_campus_id_fkey
      FOREIGN KEY (campus_id)
      REFERENCES campuses(id);

  END IF;

END $$;

-- =====================================================
-- DATA FIXES
-- =====================================================

UPDATE users
SET role='superadmin'
WHERE email='ciul@unilurio.ac.mz';

UPDATE submissions s
SET university_id = u.university_id
FROM users u
WHERE s.user_id = u.id
  AND s.university_id IS NULL
  AND u.university_id IS NOT NULL;

SQL

echo "Database migrations completed."

fi

# =========================================================
# Existing migration files
# =========================================================

if [ "$SKIP_MIGRATIONS" -eq 0 ]; then

echo ""
echo "Running migration SQL files..."

$DC run --rm backend bash -c '
  psql "${DATABASE_URL:-postgresql://gpl_user:gplpass@postgres:5432/gpl_db}" \
    -f backend/migrations/20260512_add_revoked_jtis.sql || true

  psql "${DATABASE_URL:-postgresql://gpl_user:gplpass@postgres:5432/gpl_db}" \
    -f backend/migrations/20260513_add_refresh_tokens_and_mfa.sql || true
' || true

fi

# =========================================================
# Start full stack
# =========================================================

echo ""
echo "Starting application stack..."

$DC up -d --remove-orphans

# =========================================================
# Final status
# =========================================================

echo ""
echo "=================================================="
echo "Deployment completed."
echo "=================================================="

$DC ps

if [ "$USE_PROD" -eq 1 ]; then
  echo ""
  echo "Production URL:"
  echo "https://agplurio.unilurio.ac.mz"
fi
```
