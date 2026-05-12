-- Migration: create revoked_tokens table to allow token revocation checks
-- Run this in Postgres

BEGIN;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

COMMIT;

-- Rollback (if needed):
-- BEGIN; DROP TABLE IF EXISTS revoked_tokens; COMMIT;
