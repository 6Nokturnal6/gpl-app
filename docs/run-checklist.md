Run checklist — testing & migrations

Follow these steps before running unit and E2E tests locally. Run against an isolated test or staging database to avoid polluting production.

1) Install backend dependencies

   cd gpl-app/backend
   npm ci

2) Apply DB migrations (backup first)

   export DATABASE_URL="postgres://user:pass@localhost:5432/gpl"
   pg_dump -Fc "$DATABASE_URL" -f /tmp/gpl-backup-$(date +%F).dump
   psql "$DATABASE_URL" -f backend/migrations/20260512_add_revoked_jtis.sql

3) Set Playwright / test env variables

   # Superadmin token used by e2e revoke UI test
   export SUPERADMIN_TOKEN='<superadmin-jwt>'

   # Ensure JWT_SECRET is set for backend tests (or tests use fallback 'testsecret')
   export JWT_SECRET='<your-jwt-secret>'

4) Run backend unit & integration tests

   cd gpl-app/backend
   npm test

5) Run Playwright E2E tests

   # from repo root (ensure frontend & backend are running or Playwright is configured to start them in CI)
   npx playwright test e2e/tests/revoke-ui.spec.js
   npx playwright test e2e/tests/revoke.spec.js

Notes
- Tests create and delete temporary users/JTIs; use a dedicated test DB or isolated environment.
- If migration already applied, skip step 2; ensure issued_jtis/revoked_jtis tables exist.
- For CI: provide SUPERADMIN_TOKEN and a test DATABASE_URL; prefer creating a test superadmin account.
