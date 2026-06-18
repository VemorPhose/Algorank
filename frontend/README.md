# Algorank Frontend

Vite React TypeScript frontend for Algorank v2.

## Stack

- React 18
- TypeScript
- TailwindCSS
- React Router
- CodeMirror for the solver
- React Markdown for problem statements
- Vitest for focused unit tests

## Environment

Copy the example file when custom values are needed:

```bash
cp .env.example .env
```

Default:

```text
VITE_API_BASE_URL=/api
```

In Vite dev mode, `/api/*` is proxied to `http://localhost:8000/*`. In Docker, nginx serves the built frontend and proxies `/api/*` to the API container.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

## Source Layout

```text
src/
├── api/          # Typed API client and DTOs
├── auth/         # Browser session and auth context
├── components/   # Shell, guards, reusable UI primitives
├── lib/          # Formatting, status, boilerplate, id helpers
├── pages/        # Route-level screens
├── styles/       # Tailwind entry and global CSS
└── test/         # Unit tests
```

## Auth Notes

The backend currently returns access and refresh tokens as JSON, so the frontend stores the active session in `localStorage`. The API client automatically refreshes once after a `401` and clears the session if refresh fails.

## Production Build

The frontend is built into the nginx image by `frontend/Dockerfile` from the repository root Docker build context.
