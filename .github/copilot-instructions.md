# Copilot instructions for GPL App repository

Purpose
- Short guidance to help Copilot sessions understand project layout, build/run commands, and important conventions.

Build, test, and lint commands
- Backend (gpl-app/backend):
  - Install: npm install
  - Run dev: npm run dev (uses nodemon)
  - Start (production): npm start
  - Lint: npm run lint
- Frontend (gpl-app/frontend):
  - Install: npm install
  - Dev server: npm run dev (Vite)
  - Build: npm run build
  - Preview built site: npm run preview
- Docker / Compose (project root gpl-app/):
  - Build & run: docker compose up -d --build
  - Logs: docker compose logs -f
  - Check containers: docker compose ps
- Tests: No test scripts found in repository package.json files. If tests are added, run them from the package.json in the relevant subfolder (e.g., cd backend && npm test). To run a single test depends on the test runner (e.g., Jest: npm test -- -t "test name").

High-level architecture
- Monorepo-like layout with the canonical runtime in gpl-app/ (check gpl-app/ for current Dockerfile and docker-compose.yml). Older snapshots exist (gpl-app-v2..v6, backups) — prefer gpl-app/.
- Services (docker-compose): postgres (PostgreSQL 16), backend (Node/Express), frontend (Vite React → built and served by nginx), nginx reverse-proxy.
- Backend exposes a REST API under /api (routes mounted in backend/src/index.js). Health endpoint: GET /api/health
- Database schema and seeds live at backend/src/models/schema.sql; docker-compose maps this to postgres init scripts so DB is initialized on first run.
- Backend code layout (backend/src): routes/ (Express route modules), models/ (DB schema + helpers), other modules; entrypoint: src/index.js.
- Frontend is a Vite React app (frontend/) that calls the backend API at runtime. The frontend Dockerfile performs a production build and copies dist into an nginx image.

Key conventions and repository specifics
- Environment: Node 20 is used in Dockerfiles (node:20-alpine). Respect that when running locally.
- .env-based config: root gpl-app/.env.example documents required env vars (POSTGRES_*, JWT_SECRET, FRONTEND_URL, NODE_ENV). Backend reads process.env via dotenv.
- DB init: schema.sql is applied automatically via docker-compose volume mapping to /docker-entrypoint-initdb.d/ — migrations are not present; schema.sql is authoritative for DB schema and initial seed data.
- Seeded superadmin account is present in schema.sql (change default credentials before production).
- API prefix: all primary endpoints are under /api/* (auth, submissions, export, admin, campuses, universities, locks, audit, users).
- Rate limiting and body size: backend config sets express.json limit to 2mb and a rateLimit window of 15m / 300 requests — be mindful when changing these.
- Multiple copies/versions: the repository contains numerous archived app versions (gpl-app-v2..v6, backups). Use gpl-app/ as the active root unless instructed otherwise.
- Linting: backend includes an eslint script (npm run lint). No repository-wide linter config discovered—look for .eslintrc.* if adding rules.

Files and docs consulted
- README.md (deployment and server setup, health check, SSL steps)
- gpl-app/docker-compose.yml, gpl-app/backend/Dockerfile, gpl-app/frontend/Dockerfile
- gpl-app/backend/package.json, gpl-app/frontend/package.json
- gpl-app/backend/src/index.js, gpl-app/backend/src/models/schema.sql

AI assistant config files checked
- Searched for common assistant files (CLAUDE.md, .cursorrules, .cursor/, AGENTS.md, CONVENTIONS.md, AIDER_CONVENTIONS.md, .windsurfrules, .clinerules, .cline_rules, .github/copilot-instructions.md). None were found and a new copilot file was created under .github/.

Notes for Copilot sessions
- Prefer working in gpl-app/ (this contains the canonical docker-compose, Dockerfiles, and current backend/frontend). Use Docker Compose to reproduce full stack.
- When modifying DB schema, update backend/src/models/schema.sql and verify docker-compose volume mapping; test by recreating the postgres container.
- Be conservative with secrets — .env.example exists; do not commit real secrets.

Playwright E2E setup (added)
- Location: gpl-app/e2e — contains package.json, playwright.config.js and tests/
- Run locally (example):
  1. From repository root: docker compose -f gpl-app/docker-compose.yml up -d --build
  2. Wait for services to be reachable (nginx/backend). Then:
     cd gpl-app/e2e
     npm ci
     npx playwright install --with-deps
     npx playwright test --base-url=http://localhost
- Run via Compose (recommended for CI/MCP):
  docker compose -f gpl-app/docker-compose.yml -f gpl-app/docker-compose.playwright.yml up --build --abort-on-container-exit playwright
  The playwright service runs tests against the nginx service via the gpl_network (PLAYWRIGHT_BASE_URL=http://nginx).
- Tests provided: gpl-app/e2e/tests/example.spec.js — checks API health and that the frontend root responds.
- Notes: use the playwright image or install browsers locally; ensure PLAYWRIGHT_BASE_URL points to the reachable host inside the test runtime (http://nginx in compose, http://localhost for local runs).

