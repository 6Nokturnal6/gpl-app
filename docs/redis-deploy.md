Redis, migrations, and deployment checklist — local → production

Purpose

Explain REDIS_URL and why Redis is needed, how to run Redis locally for testing, and concrete steps to move to an online server (managed Redis or self-hosted). Include commands, docker-compose examples, environment variables to change, and safety notes (backups, secure cookies, TLS).

1. What REDIS_URL is

- REDIS_URL is the connection string the backend uses to reach Redis. Example local value:
  REDIS_URL="redis://127.0.0.1:6379"
- For a password-protected Redis (recommended in production):
  REDIS_URL="redis://:YOURPASSWORD@redis-host.example.com:6379"
- For TLS endpoints (managed Redis):
  REDIS_URL="rediss://:PASSWORD@host:port"

2. Why Redis is required now

- Redis is used to cache revoked_jti entries to avoid a DB lookup on every authenticated request — improves latency and scalability.
- If Redis is unavailable, middleware falls back to DB lookups but may log errors. Still, for production use add Redis.

3. Local testing (single machine)

A. Option A — install Redis locally (Debian/Ubuntu):
   sudo apt update && sudo apt install -y redis-server
   sudo systemctl enable --now redis
   # test
   redis-cli ping   # should reply PONG

   Then set env and start backend:
   export REDIS_URL="redis://127.0.0.1:6379"
   export DATABASE_URL='postgres://user:pass@localhost:5432/gpl'
   cd gpl-app/backend && npm ci && npm run dev

B. Option B — use Docker (clean, reproducible):
   docker run -d --name gpl-redis -p 6379:6379 redis:6.2-alpine
   export REDIS_URL="redis://127.0.0.1:6379"

4. Docker Compose snippet (local / staging)

Add a redis service and set REDIS_URL for backend and scheduler services in docker-compose.yml:

services:
  redis:
    image: redis:6.2-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data

  backend:
    image: gpl-backend:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - redis

  gpl_scheduler:
    image: gpl-backend:latest
    environment:
      - SCHEDULER_ACTIVE=true
      - REDIS_URL=redis://redis:6379
    depends_on:
      - backend
      - redis

volumes:
  redis-data:

Note: when using docker-compose the hostname is "redis" (service name).

5. Production (online) guidance — managed Redis

- Prefer a managed Redis (AWS ElastiCache, Azure Cache, Redis Cloud). Acquire host, port, password, and TLS requirement.
- Set REDIS_URL accordingly, for example:
  export REDIS_URL="rediss://:PASSWORD@my-redis-cluster.cache.amazonaws.com:6379"
- Ensure backend has network access (VPC/subnet/security groups) to the Redis endpoint.

6. Database migrations & ordering

Before enabling refresh-token or MFA features in production, run DB migrations on production DB.

1) Backup production DB:
   pg_dump -Fc "$DATABASE_URL" -f /tmp/gpl-backup-$(date +%F).dump

2) Apply migrations (order matters):
   psql "$DATABASE_URL" -f backend/migrations/20260512_add_revoked_jtis.sql
   psql "$DATABASE_URL" -f backend/migrations/20260513_add_refresh_tokens_and_mfa.sql

3) Verify tables exist:
   psql "$DATABASE_URL" -c "\dt revoked_jtis, issued_jtis, refresh_tokens"

7. Env variables to set (local vs production)

REQUIRED (both):
- DATABASE_URL=postgres://user:pass@host:5432/dbname
- JWT_SECRET=<strong-random-secret>
- REDIS_URL=redis://... or rediss://... (see above)
- NODE_ENV=production (set in production to enable secure cookies)
- FRONTEND_URL=https://app.yourdomain.example
- JWT_ISSUER=https://auth.yourdomain.example
- JWT_AUDIENCE=gpl-client

Optional but recommended:
- REDIS_PASSWORD (encoded in REDIS_URL) or use protected Redis instance
- SCHEDULER_ACTIVE=true for a dedicated scheduler container

8. Cookie & HTTPS considerations

- refresh token cookie is set with secure: process.env.NODE_ENV === 'production'. Ensure NODE_ENV=production and serve via HTTPS in production to transmit httpOnly secure cookies.
- Use a TLS-terminating reverse proxy (Nginx) or cloud load balancer. Example Nginx proxy snippet:

server {
  listen 443 ssl;
  server_name gpl.unilurio.ac.mz;
  ssl_certificate /etc/letsencrypt/live/gpl.unilurio.ac.mz/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/gpl.unilurio.ac.mz/privkey.pem;

  location / {
    proxy_pass http://backend:4000; # inside docker network
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

- Set HSTS and other security headers (helmet already sets basic headers). Ensure cookies have SameSite=strict.

9. Operational checklist before switching to production

- Ensure migrations applied and tested in staging.
- Ensure Redis reachable and Redis AUTH/TLS configured if public-facing.
- Rotate JWT_SECRET and set JWT_ISSUER/JWT_AUDIENCE; coordinate token rotation strategy for clients.
- Enable SCHEDULER_ACTIVE on only one scheduler service (or use leader election)
- Test MFA flow and refresh token rotation on staging.
- Configure monitoring/alerts for Redis latency/failures and revoked_jti growth.

10. Rollback plan

- If a migration causes an issue, restore DB from the dump taken before migration:
  pg_restore -d "$DATABASE_URL" /tmp/gpl-backup-YYYY-MM-DD.dump

- If Redis misbehaves, set REDIS_URL to an empty value so backend falls back to DB (not recommended long-term).

11. Documentation & references (where to find files in repo)

- Redis helper: backend/src/utils/redisClient.js
- Auth middleware: backend/src/middleware/auth.js
- Admin revoke: backend/src/routes/admin.js
- Refresh & MFA endpoints: backend/src/routes/auth.js
- Migrations: backend/migrations/20260512_add_revoked_jtis.sql and backend/migrations/20260513_add_refresh_tokens_and_mfa.sql
- Docker-compose example: modify docker-compose.yml as above and set REDIS_URL=redis://redis:6379

If you want, I can:
- Add a docker-compose full example including backend, db, redis, scheduler and frontend for local testing.
- Add a small systemd/Ansible snippet to deploy to a single VM and configure env vars + TLS with certbot.

All steps above are saved in this file: docs/redis-deploy.md
