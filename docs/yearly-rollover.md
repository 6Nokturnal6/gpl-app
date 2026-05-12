Yearly rollover: migration, scheduler and deployment guide

Purpose

This document describes exact steps to add automatic yearly submission generation (create next year drafts on Jan 1) while preserving historical data and enabling retrieval by year. It contains commands for local and remote (Docker) servers, dry-run instructions, rollback, testing and operational notes.

Prerequisites
- Confirm database schema access and backup procedures.
- Have a staging environment for verification.
- CI or deploy user with rights to push new images or pull on servers.

1) DB migration (local/remote)
- File: backend/migrations/20260512_add_submission_year.sql
- Purpose: add submission_year INT, backfill using created_at, add idx_submissions_year.

Local (direct Postgres):
1. Export DATABASE_URL, e.g. export DATABASE_URL=postgres://user:pass@localhost:5432/gpl
2. Backup: pg_dump -Fc "$DATABASE_URL" -f /tmp/gpl-backup-$(date +%F).dump
3. Apply migration: psql "$DATABASE_URL" -f gpl-app/backend/migrations/20260512_add_submission_year.sql

Remote (Docker Compose):
1. Copy migration into container or mount it via volume (we used repo path in image). Example run from repo root:
   docker compose -f gpl-app/docker-compose.yml exec -T postgres \
     psql "$DATABASE_URL" -f /app/backend/migrations/20260512_add_submission_year.sql
2. Verify: psql "$DATABASE_URL" -c "SELECT submission_year, count(*) FROM submissions GROUP BY submission_year ORDER BY submission_year DESC;"

Notes:
- Always run migration during a maintenance window and keep DB backups.
- If your deployment uses a migration tool (Flyway, migrate, etc.) integrate the SQL there instead of running psql directly.

2) Backfill verification
- Confirm submission_year populated:
  SELECT COUNT(*) FROM submissions WHERE submission_year IS NULL;
- Investigate any NULLs; fix by manual update using created_at or other metadata.

3) Scheduler & job wiring
- Files added:
  - backend/src/jobs/yearlyRollover.js (generation logic)
  - backend/src/utils/yearHelper.js (helpers + middleware)
- Scheduler wiring is in backend/src/index.js and uses node-cron. Env controls:
  - SCHEDULER_ACTIVE=true  -> enable cron scheduling on this instance
  - ROLL_OVER_DRY_RUN=true  -> run a dry-run at startup

Deployment recommendation:
- Enable SCHEDULER_ACTIVE on exactly one instance (leader). If using multiple replicas, choose via orchestration (systemd unit, Docker node label, or separate worker service).
- Alternative: use system cron on a single host that runs a small script which invokes the job via CLI or HTTP endpoint.

4) Dry-run and testing (recommended before Jan 1)
- Local dry-run via Node:
  node -e "const db=require('./gpl-app/backend/src/models/db'); const {runYearlyRollover}=require('./gpl-app/backend/src/jobs/yearlyRollover'); runYearlyRollover(db,{dryRun:true}).then(()=>console.log('dry-run done')).catch(e=>console.error(e));"
- Start backend with dry-run at startup:
  SCHEDULER_ACTIVE=true ROLL_OVER_DRY_RUN=true npm run dev
- Inspect logs for intended clone operations; no database inserts when dryRun=true.

5) API changes and testing
- Routes updated to support ?year=YYYY; default to current year when omitted.
- Update frontend to display Year selector (default current year). Exports must include year in filename and PDF cover.
- Tests added: unit tests for yearHelper and integration tests planned for rollout (Playwright for E2E).

6) CI / branch / PR
- Branch: feature/yearly-rollover contains migration, job, helper, tests and docs.
- PR: open for review and include testing notes and migration verification steps.

7) Apply to production
1. Merge PR and deploy the release to a staging environment first.
2. Run migration on staging and verify UI and dry-run.
3. Schedule production maintenance window.
4. Backup production DB (pg_dump).
5. Pull new image or git and run deploy steps; run migration against production DB.
6. Start backend and enable SCHEDULER_ACTIVE on single instance.
7. Optionally perform an immediate dry-run on production (ROLL_OVER_DRY_RUN=true) and inspect logs.

8) Rollback
- Migration rollback (if necessary): the migration file contains a rollback snippet. To delete auto-generated drafts for a year:
  DELETE FROM submissions WHERE created_by='system' AND submission_year = <year> AND status = 'draft';
- If rollback requires history restore: restore from pg_dump backup.

9) Monitoring & audits
- Generated drafts are recorded in audit_log by the job. Verify:
  SELECT * FROM audit_log WHERE action='generate_year' ORDER BY created_at DESC LIMIT 200;
- Monitor logs and set alerting if job fails.

10) Operational notes
- Keep templates (is_template flag) updated to control default values for next-year drafts.
- If schema changes occur, add migration steps to copy default/new fields into generated drafts.
- Consider partitioning submissions by year if table size grows significantly.

11) Security
- Do not run scheduler on a machine without proper network and DB access controls.
- Ensure the job user (system) is audited and limited in privileges if desired.

12) Quick commands (summary)
- Run migration locally:
  export DATABASE_URL=postgres://user:pass@host:5432/db && pg_dump -Fc "$DATABASE_URL" -f /tmp/backup.dump && psql "$DATABASE_URL" -f gpl-app/backend/migrations/20260512_add_submission_year.sql

- Dry-run locally:
  node -e "const db=require('./gpl-app/backend/src/models/db'); const {runYearlyRollover}=require('./gpl-app/backend/src/jobs/yearlyRollover'); runYearlyRollover(db,{dryRun:true});"

- Enable scheduler in Docker Compose (example env):
  SCHEDULER_ACTIVE=true ROLL_OVER_DRY_RUN=false

13) PR text (suggested)
"Add yearly rollover: DB migration to add submission_year, scheduler job, year helper middleware, tests and documentation. This enables automatic creation of next-year drafts on Jan 1 while preserving historical submissions. See docs/yearly-rollover.md for deployment and migration steps."

If you want, I can now:
- Commit this update (on feature/yearly-rollover) and push the updated doc.
- Add an integration Playwright test that validates year selection and export filenames.
Which should I do next?