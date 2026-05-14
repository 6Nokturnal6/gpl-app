-- Migration: add refresh_tokens table and MFA columns on users
BEGIN;

-- Refresh tokens table using token_id and hashed token value for rotation
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- Add MFA fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

COMMIT;

-- Rollback (if needed):
-- BEGIN; DROP TABLE IF EXISTS refresh_tokens; ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret; ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled; COMMIT;
