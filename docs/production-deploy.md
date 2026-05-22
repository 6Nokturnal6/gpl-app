Production Deployment Guide - agplurio.unilurio.ac.mz

Overview
This guide covers deploying the GPL app to agplurio.unilurio.ac.mz with Docker Compose, Nginx reverse proxy, SSL/TLS, and automatic certificate renewal via Let's Encrypt.

Prerequisites (on production server)
- Ubuntu/Debian-based OS (18.04+)
- Docker & Docker Compose installed
- Domain agplurio.unilurio.ac.mz pointing to server IP
- Ports 80, 443 open to the internet (for HTTP→HTTPS redirect + HTTPS access)
- A valid email for Let's Encrypt notifications

Setup Steps

1. Clone repo and prepare directory
   cd /srv
   git clone https://github.com/6Nokturnal6/gpl-app.git
   cd gpl-app
   git checkout feature/yearly-rollover

2. Create production environment file (.env)
   cp .env.example .env
   # Edit .env with production secrets:
   NODE_ENV=production
   DATABASE_URL=postgresql://gpl_user:STRONG_PASSWORD@postgres:5432/gpl_db
   JWT_SECRET=VERY_STRONG_JWT_SECRET_32_CHARS_MIN
   FRONTEND_URL=https://agplurio.unilurio.ac.mz
   REDIS_URL=redis://redis:6379
   JWT_ISSUER=agplurio.unilurio.ac.mz
   JWT_AUDIENCE=agplurio.unilurio.ac.mz

3. Create SSL certificates with Let's Encrypt (certbot)
   sudo apt-get update && sudo apt-get install -y certbot
   sudo certbot certonly --standalone -d agplurio.unilurio.ac.mz --agree-tos -m your-email@example.com
   # Certificates will be stored at /etc/letsencrypt/live/agplurio.unilurio.ac.mz/

4. Mount certificates into Docker
   Create or update docker-compose.yml to mount certs:
   volumes:
     - /etc/letsencrypt/live/agplurio.unilurio.ac.mz:/etc/nginx/ssl:ro

5. Update nginx.conf for production
   - Enable HTTPS server block (listen 443 ssl http2)
   - Set server_name agplurio.unilurio.ac.mz
   - Point ssl_certificate and ssl_certificate_key to mounted paths
   - Redirect HTTP → HTTPS

6. Build and start services
   docker compose up -d --build
   # Wait for DB to initialize (postgres healthcheck passes)

7. Run migrations
   docker compose run --rm backend bash -c "psql \"\${DATABASE_URL}\" -f backend/migrations/20260512_add_revoked_jtis.sql && psql \"\${DATABASE_URL}\" -f backend/migrations/20260513_add_refresh_tokens_and_mfa.sql"

8. Verify deployment
   curl https://agplurio.unilurio.ac.mz/api/health
   # Should return: {"status":"ok","version":4,"app":"aGPLúrio"}

9. Set up certificate renewal (auto)
   sudo systemctl enable certbot.timer
   sudo systemctl start certbot.timer
   # Certbot will renew certificates 30 days before expiration

10. Configure firewall (optional but recommended)
    sudo ufw allow 22/tcp  # SSH
    sudo ufw allow 80/tcp  # HTTP
    sudo ufw allow 443/tcp # HTTPS
    sudo ufw enable

Environment Variables (Production)
- NODE_ENV: production (enables secure cookies, HTTPS enforcement)
- FRONTEND_URL: https://agplurio.unilurio.ac.mz (for CORS, email links)
- DATABASE_URL: postgresql://user:pass@postgres:5432/gpl_db
- JWT_SECRET: strong secret, min 32 chars
- REDIS_URL: redis://redis:6379 (internal docker network)
- JWT_ISSUER: agplurio.unilurio.ac.mz (optional, for issuer verification)
- JWT_AUDIENCE: agplurio.unilurio.ac.mz (optional, for audience verification)
- SUPERADMIN_TOKEN: not needed in production (only for e2e tests)
- POSTGRES_USER, POSTGRES_PASSWORD: DB credentials

Nginx Configuration (HTTPS + HTTP→HTTPS redirect)
See nginx/nginx.conf.prod for full config. Key points:
- HTTP server (port 80) redirects all traffic to HTTPS
- HTTPS server (port 443) uses Let's Encrypt certs
- Rate limiting on /api and /api/auth routes
- X-Forwarded-Proto, X-Real-IP headers set for proper logging

Monitoring & Logs
- Backend logs: docker compose logs -f backend
- Frontend logs: docker compose logs -f frontend
- Nginx logs: docker compose logs -f nginx (if running in container)
- Redis logs: docker compose logs -f redis
- Postgres logs: docker compose logs -f postgres

Backup & Recovery
- Database backups: regular pg_dump from docker
  docker compose exec postgres pg_dump -U gpl_user gpl_db > /backups/gpl_db_$(date +%Y%m%d_%H%M%S).sql
- Certificates backup: copy /etc/letsencrypt/live/agplurio.unilurio.ac.mz to safe location
- Keep .env file (secrets) in secure location, not in repo

Troubleshooting
- Nginx fails to start: check nginx.conf syntax (nginx -t inside container)
- SSL cert fails: verify domain DNS resolution and Let's Encrypt connectivity
- Backend cannot connect to DB: check DATABASE_URL and postgres service health
- Redis connection refused: ensure REDIS_URL is set and redis service is running

CI/CD Integration
To auto-deploy on push to main branch:
1. Set up a self-hosted GitHub Actions runner on the server (see docs/ci-cd.md)
2. Runner will pull main, run migrations, restart docker-compose

Rollback & Downtime
- To revert to a previous version: git reset --hard COMMIT_HASH && docker compose up -d --build
- For zero-downtime, use docker-compose blue/green pattern (start new stack on different ports, update nginx upstream)

Support & Security
- Keep Docker and OS packages updated: apt update && apt upgrade && docker pull <image>
- Monitor certificate expiration: certbot renew --dry-run
- Review access logs for suspicious activity
- Use strong passwords and rotate secrets periodically
