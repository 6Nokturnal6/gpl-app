Auth revocation and JTI migration

Overview

This document describes the admin API to revoke tokens and the database migration to support JTI-based revocation for future tokens. The implementation includes:

- POST /api/admin/revoke-token (superadmin only): Revoke a token by `jti` or by full token string.
- DB migration file: backend/migrations/20260512_add_revoked_jtis.sql
- Auth middleware: checks `jti` against revoked_jtis, falls back to legacy revoked_tokens for older tokens.

Updates in this commit

This update adds a lightweight SuperAdmin UI and tests to manage and validate JTI-based revocation. Changes include:

Frontend
- New components:
  - frontend/src/components/Admin/RevokeTokenPanel.jsx — manual revoke by jti or token.
  - frontend/src/components/Admin/JtiManagementPanel.jsx — lists issued_jtis and revoked_jtis, search and revoke actions.
  - SuperAdminDashboard integrates both panels so superadmins can manage JTIs.
- API client additions: adminApi.revokeToken, adminApi.listIssuedJtis, adminApi.listRevokedJtis (frontend/src/api/index.js).

Backend
- Admin endpoints added/updated:
  - POST /api/admin/revoke-token — (existing) revocation endpoint.
  - GET /api/admin/issued-jtis?q=&limit= — list issued JTIs.
  - GET /api/admin/revoked-jtis?q=&limit= — list revoked JTIs.
- issued_jtis and revoked_jtis tables created by migration backend/migrations/20260512_add_revoked_jtis.sql.
- Auth middleware checks jti first, falls back to full-token table for legacy tokens.
- Token issuance now records jti into issued_jtis when tokens are created (register/login).

Tests
- Backend unit test: backend/test/revoke.test.js
- Backend integration test: backend/test/revoke_integration.test.js — issues token, revokes it, validates access denied.
- Playwright API E2E test: e2e/tests/revoke.spec.js
- Playwright UI E2E test: e2e/tests/revoke-ui.spec.js — exercises SuperAdmin UI revoke flow.

How to run locally

1) Install deps (backend):
   cd gpl-app/backend && npm ci

2) Apply DB migration (backup first):
   pg_dump -Fc "$DATABASE_URL" -f /tmp/gpl-backup-$(date +%F).dump
   psql "$DATABASE_URL" -f backend/migrations/20260512_add_revoked_jtis.sql

3) Run backend tests:
   cd gpl-app/backend && npm test
   (integration tests require a writable test DB and proper JWT_SECRET)

4) Run Playwright E2E (requires app services running):
   export SUPERADMIN_TOKEN='<superadmin-jwt>'
   npx playwright test e2e/tests/revoke-ui.spec.js

See also the concise run checklist at docs/run-checklist.md for a ready-to-copy set of commands, environment-variable examples, and notes for running migrations, backend tests, and Playwright E2E locally.

Notes and operational guidance
- The UI revoke action uses the same POST /api/admin/revoke-token endpoint and requires superadmin auth.
- Tests create temporary users and may leave issued_jtis entries; run against an isolated test DB or add cleanup later.
- For production at scale, consider caching revocation lists in Redis and switching to jti-only revocation (avoid storing full tokens).
- Consider adding an "unrevoke" option and paginated admin lists for large datasets.

Files changed (high-level)
- backend/src/middleware/auth.js (jti-aware checks)
- backend/src/routes/admin.js (list endpoints)
- backend/src/routes/auth.js (record issued_jtis on token creation)
- backend/migrations/20260512_add_revoked_jtis.sql
- backend/test/revoke.test.js
- backend/test/revoke_integration.test.js
- frontend/src/components/Admin/RevokeTokenPanel.jsx
- frontend/src/components/Admin/JtiManagementPanel.jsx
- frontend/src/components/Admin/SuperAdminDashboard.jsx (integration)
- frontend/src/api/index.js
- e2e/tests/revoke.spec.js
- e2e/tests/revoke-ui.spec.js

If you want, add cleanup to tests (recommended for shared DBs) or add pagination for admin lists. The branch feature/yearly-rollover contains the changes and has been pushed.

Migrations

1. Backup DB:
   pg_dump -Fc "$DATABASE_URL" -f /tmp/gpl-backup-$(date +%F).dump

2. Apply migration:
   psql "$DATABASE_URL" -f backend/migrations/20260512_add_revoked_jtis.sql

3. Verify tables:
   psql "$DATABASE_URL" -c "\dt revoked_jtis, issued_jtis, revoked_tokens"

Issuing future tokens with JTI

When signing JWTs, include a jti claim. Example in Node.js using jsonwebtoken and uuid:

const { v4: uuidv4 } = require('uuid');
const token = jwt.sign({ sub: userId, role: userRole }, process.env.JWT_SECRET, {
  jwtid: uuidv4(),
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  expiresIn: '8h'
});

Optionally insert the jti into issued_jtis for auditing:

INSERT INTO issued_jtis (jti, user_id, issued_at, expires_at) VALUES ($1, $2, now(), $3)

Revoking tokens

- Using API (recommended):
  curl -X POST -H "Authorization: Bearer <superadmin-token>" -H "Content-Type: application/json" \
    -d '{"jti":"<jti>","reason":"Compromised"}' https://<your-host>/api/admin/revoke-token

  Or provide a full token:
  -d '{"token":"<full.jwt.token>","reason":"Compromised"}'

- Using psql (manual):
  -- revoke a jti
  INSERT INTO revoked_jtis (jti, reason) VALUES ('<jti>', 'manual revoke');

  -- revoke a full token (legacy)
  INSERT INTO revoked_tokens (token, reason) VALUES ('<full.jwt.token>', 'manual revoke');

Backwards compatibility & migration notes

- Existing tokens without jti remain supported via the legacy revoked_tokens table.
- To migrate existing revoked_tokens entries to revoked_jtis, decode stored tokens to extract jti and insert into revoked_jtis. Tokens without jti cannot be migrated and will remain in revoked_tokens.
- Recommended rollout:
  1. Deploy this change (auth checks + migrations).
  2. Update the token issuer to include jti on token creation.
  3. Optionally insert jtis into issued_jtis when creating tokens.
  4. Monitor logs for token verification failures related to missing issuer/audience claims.

Security considerations

- Storing full tokens is sensitive; prefer jti-based revocation for privacy and storage efficiency.
- Consider using short-lived access tokens and refresh tokens with rotation for better security.
- For high-scale environments, use a fast key-value store (Redis) for revocation lists and caching.
