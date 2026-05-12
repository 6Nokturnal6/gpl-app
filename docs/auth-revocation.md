Auth revocation and JTI migration

Overview

This document describes the admin API to revoke tokens and the database migration to support JTI-based revocation for future tokens. The implementation includes:

- POST /api/admin/revoke-token (superadmin only): Revoke a token by `jti` or by full token string.
- DB migration file: backend/migrations/20260512_add_revoked_jtis.sql
- Auth middleware: checks `jti` against revoked_jtis, falls back to legacy revoked_tokens for older tokens.

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
