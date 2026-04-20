# GPL App — Formulário de Recolha Estatística IES 2024

Web application for collecting higher education statistics for Mozambican institutions (IES).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| API | Node.js + Express |
| Database | PostgreSQL 16 |
| Reverse Proxy | Nginx |
| Containers | Docker Compose |
| CI/CD | GitHub Actions |

## Features

- Login / registration per institution
- 7-section form (ID IES, Estudantes, Docentes, Investigadores, Finanças, Infraestrutura, Previsão 2025)
- Auto-save with 1.5s debounce — no data loss
- Server-side validation with Joi
- Export to formatted `.xlsx` matching the original form layout
- Dashboard with charts and progress tracking
- Submit to ministry with status tracking

---

## Local Development

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for local dev without Docker)

### 1. Clone and configure

```bash
git clone https://github.com/6Nokturnal6/gpl-app.git
cd gpl-app
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and JWT_SECRET
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

App runs at: **http://localhost**
API health check: http://localhost/api/health

### 3. Local dev (without Docker)

Terminal 1 — Database:
```bash
docker run -d --name gpl_pg \
  -e POSTGRES_DB=gpl_db \
  -e POSTGRES_USER=gpl_user \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 postgres:16-alpine
```

Terminal 2 — Backend:
```bash
cd backend
npm install
DATABASE_URL=postgresql://gpl_user:devpassword@localhost:5432/gpl_db \
JWT_SECRET=devsecret \
FRONTEND_URL=http://localhost:5173 \
npm run dev
```

Terminal 3 — Frontend:
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Production Deployment

### Server setup (Ubuntu 22.04)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repo
sudo mkdir /opt/gpl-app
sudo chown $USER /opt/gpl-app
cd /opt/gpl-app
git clone https://github.com/6Nokturnal6/gpl-app.git .

# Configure env
cp .env.example .env
nano .env   # Set strong POSTGRES_PASSWORD and JWT_SECRET

# Start
docker compose up -d --build
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

Then uncomment the HTTPS server block in `nginx/nginx.conf`.

### GitHub Actions CD

Add these secrets in GitHub → Settings → Secrets:

| Secret | Value |
|---|---|
| `SERVER_HOST` | Your server IP or domain |
| `SERVER_USER` | SSH username (e.g. `ubuntu`) |
| `SERVER_SSH_KEY` | Private SSH key (`cat ~/.ssh/id_rsa`) |

On every push to `main`, the workflow SSHs into your server, pulls the latest code, and rebuilds the containers.

---

## API Reference

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create institution account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/submissions/current` | Load full form data |
| PUT | `/api/submissions/idies` | Save ID IES section |
| PUT | `/api/submissions/estudantes` | Save students section |
| PUT | `/api/submissions/docentes` | Save teaching staff |
| PUT | `/api/submissions/investigadores` | Save researchers |
| PUT | `/api/submissions/financas` | Save finances |
| PUT | `/api/submissions/infra` | Save infrastructure |
| PUT | `/api/submissions/previsao` | Save 2025 forecast |
| POST | `/api/submissions/submit` | Mark as submitted |
| GET | `/api/export/xlsx` | Download filled Excel file |

---

## Database

Schema is auto-applied from `backend/src/models/schema.sql` on first container start.

Default admin: `admin@mined.gov.mz` / `admin123` — **change immediately in production**.

---

## Project Structure

```
gpl-app/
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── api/           # Axios API client
│   │   ├── components/
│   │   │   ├── Dashboard/ # Charts and summary
│   │   │   ├── FormSections/  # One component per section
│   │   │   └── Layout/    # Reusable form elements
│   │   ├── hooks/         # useAuth, useSubmission
│   │   ├── pages/         # LoginPage, FormPage
│   │   └── utils/         # validation.js
├── backend/               # Node.js + Express
│   └── src/
│       ├── middleware/    # JWT auth
│       ├── models/        # schema.sql, db.js
│       ├── routes/        # auth, submissions, export
│       └── utils/         # excelExport.js
├── nginx/                 # Reverse proxy config
├── .github/workflows/     # CI/CD
└── docker-compose.yml
```
