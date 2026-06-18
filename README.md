# Algorank v2

Algorank v2 is a full-stack competitive programming contest platform. The backend is FastAPI, PostgreSQL, Redis, Judge0, and Nginx. The frontend is a Vite React TypeScript app with TailwindCSS and a block-art visual system.

## Implemented

- Application-owned auth with bcrypt passwords, JWT access tokens, refresh-token rotation, logout, and roles.
- Contest lifecycle endpoints for creation, updates, publishing, closing, registration, participants, and user registrations.
- Problem management with markdown statements, sample and hidden test cases, tags, limits, and contest attachment.
- Async submissions through Redis queue workers, Judge0 execution, durable test results, idempotency keys, and polling-friendly status reads.
- Redis-backed live leaderboard reads with PostgreSQL fallback.
- Admin queue and worker status endpoints.
- React frontend for public browsing, auth, contest rooms, problem solving, submissions, profile, and organizer/admin workflows.
- Production-style Docker Compose stack with API, worker, PostgreSQL, Redis, Judge0, and nginx serving the built frontend.

## Repository Layout

```text
.
├── app/                     # FastAPI application
├── frontend/                # Vite + React + TypeScript frontend
├── migrations/              # Alembic migrations
├── nginx/                   # Nginx frontend/API routing
├── tests/                   # Backend pytest suite
├── docker-compose.yml       # Full stack orchestration
├── Dockerfile               # Backend API/worker image
└── pyproject.toml           # Python project metadata
```

## Local Development

### Backend

Create an environment file:

```bash
cp .env.example .env
```

Run the backend tests:

```bash
python -m pytest
```

When running without Docker, provide local PostgreSQL, Redis, and Judge0 values in `.env`, then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

Install dependencies:

```bash
cd frontend
npm install
```

Start Vite:

```bash
npm run dev
```

The frontend defaults to `VITE_API_BASE_URL=/api`. In local Vite development, `/api/*` is proxied to `http://localhost:8000/*`.

Useful frontend commands:

```bash
npm run typecheck
npm test
npm run build
```

## Docker

Docker is the intended production-like path, but it was not tested on this machine because Docker installation/use is prohibited in the local environment.

Start the full stack on a Docker-capable host:

```bash
docker compose up --build
```

Run migrations inside the API container if needed:

```bash
docker compose exec api alembic upgrade head
```

Open the app:

```text
http://localhost
```

Important routes through nginx:

```text
/                 React frontend
/api/*            Proxied to FastAPI, with /api stripped
/docs             FastAPI Swagger UI
/openapi.json     FastAPI OpenAPI schema
/health           Health endpoint
```

## Default Bootstrap

If `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set, the API creates or updates that admin on startup. The first manually registered user also becomes an admin when the database is empty. Later privileged registrations require `X-Bootstrap-Token` to match `BOOTSTRAP_TOKEN`.

## Frontend Routes

```text
/                         Dashboard
/login, /register          Auth
/contests                  Contest browser
/contests/:id              Contest room
/contests/:id/leaderboard  Standings
/problems                  Problem set
/problems/:slug            Statement and editor
/submissions               Signed-in user submissions
/submissions/:id           Submission results
/profile                   Signed-in user profile
/admin                     Organizer/admin console
```

## Worker

The worker process is:

```bash
python -m app.workers.runner
```

It consumes Redis queue entries, calls local Judge0, writes results to PostgreSQL, refreshes Redis leaderboard state, and invalidates stale caches.

## Verification Performed

- Frontend `npm test`
- Frontend `npm run typecheck`
- Frontend `npm run build`
- Backend `./.venv/bin/python -m pytest`

Docker build/runtime verification is pending a Docker-capable machine.
