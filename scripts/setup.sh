#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_TESTS=1
RUN_FRONTEND_BUILD=1
RUN_DOCKER_BUILD=0

usage() {
  cat <<'EOF'
Usage: ./scripts/setup.sh [options]

Prepare a local Algorank development checkout.

Options:
  --skip-tests             Install dependencies and build without running tests.
  --skip-frontend-build    Install frontend dependencies without building the frontend.
  --docker-build           Also run `docker compose build` after local verification.
  -h, --help               Show this help text.
EOF
}

info() {
  printf '\n[setup] %s\n' "$*"
}

die() {
  printf '[setup] %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      RUN_TESTS=0
      ;;
    --skip-frontend-build)
      RUN_FRONTEND_BUILD=0
      ;;
    --docker-build)
      RUN_DOCKER_BUILD=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
  shift
done

cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  info "Creating .env from .env.example"
  cp ".env.example" ".env"
else
  info "Using existing .env"
fi

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="$PYTHON"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  die "Python 3.9+ is required. Set PYTHON=/path/to/python if it is not on PATH."
fi

info "Preparing Python virtual environment"
if [[ ! -d ".venv" ]]; then
  "$PYTHON_BIN" -m venv ".venv"
fi

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  VENV_PY="$ROOT_DIR/.venv/bin/python"
elif [[ -x "$ROOT_DIR/.venv/Scripts/python.exe" ]]; then
  VENV_PY="$ROOT_DIR/.venv/Scripts/python.exe"
else
  die "Could not find the virtual environment Python executable."
fi

"$VENV_PY" -m pip install --upgrade pip
"$VENV_PY" -m pip install ".[dev]"

require_command npm

info "Installing frontend dependencies"
pushd "$ROOT_DIR/frontend" >/dev/null
if [[ -f "package-lock.json" ]]; then
  npm ci
else
  npm install
fi

if [[ "$RUN_FRONTEND_BUILD" -eq 1 ]]; then
  info "Checking and building frontend"
  npm run typecheck
  if [[ "$RUN_TESTS" -eq 1 ]]; then
    npm test
  fi
  npm run build
fi
popd >/dev/null

if [[ "$RUN_TESTS" -eq 1 ]]; then
  info "Running backend tests"
  "$VENV_PY" -m pytest
fi

if [[ "$RUN_DOCKER_BUILD" -eq 1 ]]; then
  require_command docker
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."
  info "Building Docker images"
  docker compose build
fi

info "Setup complete"
