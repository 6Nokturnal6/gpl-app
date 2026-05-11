-- Migration: add submission_year to submissions and backfill from created_at
-- Run this in Postgres (run inside deployment migration tool)

BEGIN;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_year INTEGER;

-- Backfill submission_year using created_at where missing
UPDATE submissions
SET submission_year = EXTRACT(YEAR FROM COALESCE(created_at, now()))::INT
WHERE submission_year IS NULL;

-- Index for fast year-based queries
CREATE INDEX IF NOT EXISTS idx_submissions_year ON submissions (submission_year);

COMMIT;

-- Rollback (if needed):
-- BEGIN; ALTER TABLE submissions DROP COLUMN IF EXISTS submission_year; DROP INDEX IF EXISTS idx_submissions_year; COMMIT;
