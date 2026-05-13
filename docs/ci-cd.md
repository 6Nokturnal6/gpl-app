CI/CD deployment steps (GitHub Actions + server deploy)

Overview
- CI: run linters, unit tests, backend integration tests, and Playwright e2e against a test stack.
- CD: build Docker images, push to registry, deploy to server via SSH + docker compose, run migrations.

GitHub Actions example (ci.yml)

name: CI
on: [push, pull_request]

jobs:
  services:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: gpl
          POSTGRES_PASSWORD: gplpass
          POSTGRES_DB: gpl_db
        ports:
          - 5432
      redis:
        image: redis:7
        ports:
          - 6379
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install backend deps
        working-directory: gpl-app/backend
        run: npm ci
      - name: Apply DB migrations (local test)
        run: |
          until pg_isready -h localhost -p 5432; do sleep 1; done
          psql "postgresql://gpl:gplpass@localhost:5432/gpl_db" -f gpl-app/backend/migrations/20260512_add_revoked_jtis.sql
          psql "postgresql://gpl:gplpass@localhost:5432/gpl_db" -f gpl-app/backend/migrations/20260513_add_refresh_tokens_and_mfa.sql
      - name: Run backend tests
        working-directory: gpl-app
        run: npm test --if-present
      - name: Install Playwright deps and run e2e
        run: |
          npm --prefix gpl-app install
          npx playwright install --with-deps
          npx playwright test --config=gpl-app/e2e/playwright.config.js

Deploy (example via SSH + docker-compose)

- Build and push images to registry (GitHub Packages, Docker Hub, ECR):
  - docker build -t registry.example.com/gpl-app/backend:latest -f gpl-app/backend/Dockerfile gpl-app
  - docker push registry.example.com/gpl-app/backend:latest
  - (repeat for frontend)

- On production server (gpl.unilurio.ac.mz):
  - Pull latest images: docker compose pull
  - Stop stack: docker compose down
  - Run migrations (ensure envs set): psql "$DATABASE_URL" -f gpl-app/backend/migrations/20260512_add_revoked_jtis.sql
    then psql .../20260513_add_refresh_tokens_and_mfa.sql
  - Start stack: docker compose up -d --remove-orphans

Notes & Best Practices
- Always run migrations in a maintenance window / or with a deployment script that checks compatibility.
- Provide secrets via environment or a secrets manager (GitHub Secrets for Actions, Vault/KMS in production). Do NOT hardcode JWT_SECRET or DB passwords.
- For secure cookies: ensure NODE_ENV=production and TLS termination at reverse proxy (nginx) with secure flag set.
- For zero-downtime deploys, use rolling updates or additional orchestration (docker swarm, k8s, or deploy blue/green).

If desired, generate a deploy workflow that SSHs into server and runs the "docker compose pull && docker compose up -d && psql ..." commands. Keep SSH keys in GitHub Secrets and use the actions/ssh-deploy or appleboy/ssh-action actions.
