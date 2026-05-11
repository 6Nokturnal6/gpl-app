Yearly rollover: migration, scheduler and API changes

This document lists all steps to implement automatic per-year submission generation while preserving history.

1) Create DB migration
 - File: backend/migrations/20260512_add_submission_year.sql
 - Action: add submission_year INT, backfill from created_at, create index.
 - Run: psql -d $DATABASE_URL -f backend/migrations/20260512_add_submission_year.sql
 - Backup: pg_dump before running.

2) Backfill & data verification
 - Run queries to verify counts per year and detect missing years.
 - Manual reconciliation scripts may be necessary for ambiguous records.

3) Add year helper and middleware
 - File: backend/src/utils/yearHelper.js (created)
 - Add middleware to routes to set req.year defaulting to current year.
 - Update route handlers to filter by submission_year when reading/writing.

4) Implement rollover job
 - File: backend/src/jobs/yearlyRollover.js (created)
 - Schedule: prefer system cron or node-cron on a single leader instance.
 - Env: SCHEDULER_ACTIVE=true on the worker instance only.
 - Cron expression example: At 00:05 on Jan 1 -> '5 0 1 1 *'

5) Wire into server
 - Require the job in backend/src/index.js or app.js and schedule when SCHEDULER_ACTIVE=true.
 - Example (node-cron):
   const { runYearlyRollover } = require('./jobs/yearlyRollover');
   if (process.env.SCHEDULER_ACTIVE === 'true') {
     const cron = require('node-cron');
     cron.schedule('5 0 1 1 *', async () => runYearlyRollover(db, { logger: console }));
   }

6) API changes
 - Default behavior: endpoints return currentYear data if no ?year provided.
 - Add support for ?year=YYYY to read historical submissions.
 - Ensure POST/PUT specify the year when creating new submissions (default to currentYear).
 - Example endpoints to update: GET /api/submissions, GET /api/submissions/:id, POST /api/submissions

7) Frontend changes
 - Add Year selector in UI (default current year). Allow switching to archived years (read-only or editable depending on policy).
 - Include year in export filenames and PDF cover pages.

8) Tests
 - Unit tests: migration, helper functions, route year filtering.
 - Integration/E2E: Playwright tests verifying rollover cloning (use dryRun or test DB), and that ?year returns correct data and exports include year.

9) CI / Deployment
 - Create branch: feature/yearly-rollover
 - Steps to deploy: run DB migration, run backfill checks, deploy backend with SCHEDULER_ACTIVE on single instance, deploy frontend.
 - Add healthcheck for scheduler (optional).

10) Rollback
 - Rollback SQL provided in migration file comments.
 - To remove generated drafts: DELETE FROM submissions WHERE created_by='system' AND submission_year=<year> AND status='draft';

11) PR & code review
 - Commit files on feature/yearly-rollover branch and open PR. Include migration, job, helper, docs and tests.
 - Suggested PR body: "Add yearly rollover: DB migration to add submission_year, scheduler stub to auto-create next-year drafts, year helper middleware, and docs."

12) Post-deploy
 - Monitor audit_log and system logs on Jan 1; run manual reports to confirm generation.
 - Inform admins and provide UI notice about new year availability.
