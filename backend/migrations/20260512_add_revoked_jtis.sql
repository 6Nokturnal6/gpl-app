-- Migration: create revoked_jtis table to support jti-based token revocation
-- Run this in Postgres

BEGIN;

CREATE TABLE IF NOT EXISTS revoked_jtis (
  jti TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- Optional audit table to record issued JTI tokens (recommended for future tracking)
CREATE TABLE IF NOT EXISTS issued_jtis (
  jti TEXT PRIMARY KEY,
  user_id UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

COMMIT;

-- Rollback (if needed):
-- BEGIN; DROP TABLE IF EXISTS issued_jtis; DROP TABLE IF EXISTS revoked_jtis; COMMIT;
