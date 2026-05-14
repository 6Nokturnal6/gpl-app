CI/CD deployment steps (GitHub Actions + server deploy)

Overview
- CI: run linters, unit tests, backend integration tests, and Playwright e2e against a test stack.
- CD: build Docker images, push to registry, deploy to server via SSH (or self-hosted runner) + docker compose, run migrations.

Files introduced in this repo
- docker-compose.local.yml — local full-stack (db, redis, backend, frontend, scheduler).
- docker-compose.playwright.yml — Playwright test runner service that depends on backend+frontend.
- .github/workflows/deploy.yml — SSH deploy workflow (workflow_dispatch + push to main).

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
          psql "postgresql://gpl@gplpass@localhost:5432/gpl_db" -f gpl-app/backend/migrations/20260513_add_refresh_tokens_and_mfa.sql
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

- On production server (gpl.unilurio.ac.mz) via SSH workflow
  - Ensure the repository is cloned on the server at DEPLOY_PATH and Docker + docker compose are installed.
  - Pull latest images: docker compose pull
  - Stop stack: docker compose down
  - Run migrations (ensure envs set): psql "$DATABASE_URL" -f gpl-app/backend/migrations/20260512_add_revoked_jtis.sql && psql "$DATABASE_URL" -f gpl-app/backend/migrations/20260513_add_refresh_tokens_and_mfa.sql
  - Start stack: docker compose up -d --remove-orphans

Deploying to a local/private server
- If GitHub Actions runners cannot reach your local server (NAT/firewall), two options:
  1) Install a self-hosted GitHub Actions runner on the server and target it (recommended). The runner pulls the repo locally and executes the workflow without SSH from Actions.
  2) Expose SSH to Actions (not recommended for private networks) using VPN or port-forwarding.

Self-hosted runner install (short snippet)
1. On the server (example: Ubuntu 22.04):
   sudo mkdir -p /opt/actions-runner && cd /opt/actions-runner
   # download the runner tarball (replace {os} and {arch} if needed)
   curl -o actions-runner-linux-x64-2.308.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.308.0/actions-runner-linux-x64-2.308.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.308.0.tar.gz
2. Register runner (obtain token from your repo settings > Actions > Runners):
   ./config.sh --url https://github.com/<OWNER>/<REPO> --token <RUNNER_TOKEN> --work _work --labels gpl-self-hosted
3. Run the runner as a service:
   sudo ./svc.sh install
   sudo ./svc.sh start

- Add the label (gpl-self-hosted) to your workflow: replace runs-on: ubuntu-latest with runs-on: [self-hosted, gpl-self-hosted]
- Use GitHub Secrets to store any server-specific values (DATABASE_URL, JWT_SECRET) or rely on the server's environment.

Notes & Best Practices
- When using a self-hosted runner, ensure the server is secured and access is limited; runners execute arbitrary workflow steps from PRs — use protection rules (e.g., only main branch deploys).
- Keep runner software up to date. Use service accounts or dedicated user for the runner.
- For Playwright e2e in CI, use the docker-compose.playwright.yml to run tests in a containerized runner if browsers or dependencies are heavy.
- Provide secrets via environment or a secrets manager (GitHub Secrets, Vault/KMS). Do NOT hardcode JWT_SECRET or DB passwords.
- For secure cookies: ensure NODE_ENV=production and TLS termination at reverse proxy (nginx) with secure flag set.
- For zero-downtime deploys, use rolling updates or orchestration (swarm/k8s) or a blue/green strategy.

Where to find the new workflow
- .github/workflows/deploy.yml — SSH deploy workflow (uses appleboy/ssh-action). To deploy to a local server, prefer installing a self-hosted runner and change runs-on accordingly.

If desired, add a deploy helper script (deploy.sh) in the repo to standardize migration order and env checks. Keep SSH keys and runner tokens in GitHub Secrets or a secrets manager.
