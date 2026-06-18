#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DETACHED=0
NO_BUILD=0
PULL=0

usage() {
  cat <<'EOF'
Usage: ./scripts/start-full-stack.sh [options]

Start the complete Algorank stack with Docker Compose.

Options:
  -d, --detached    Start services in the background.
  --no-build        Reuse existing images instead of building first.
  --pull            Ask Compose to pull newer base images before starting.
  -h, --help        Show this help text.
EOF
}

info() {
  printf '[start] %s\n' "$*"
}

die() {
  printf '[start] %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d | --detached)
      DETACHED=1
      ;;
    --no-build)
      NO_BUILD=1
      ;;
    --pull)
      PULL=1
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
fi

command -v docker >/dev/null 2>&1 || die "Docker is required to start the full stack."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."

# ---------------------------------------------------------------------------
# Pre-flight: warn about host ports already in use
# ---------------------------------------------------------------------------
check_port() {
  local port="$1"
  local service="$2"
  if ss -tlnH "sport = :$port" 2>/dev/null | grep -q ":$port"; then
    info "WARNING: Host port $port ($service) is already in use. Docker may fail to bind it."
  fi
}

check_port 5433 "PostgreSQL (algorank)"
check_port 6379 "Redis (algorank)"
check_port 8000 "API"
check_port 80   "Nginx frontend"
check_port 2358 "Judge0 server"

compose_args=(compose up)
if [[ "$PULL" -eq 1 ]]; then
  compose_args+=(--pull always)
fi
if [[ "$NO_BUILD" -eq 0 ]]; then
  compose_args+=(--build)
fi
if [[ "$DETACHED" -eq 1 ]]; then
  compose_args+=(-d)
fi

info "Starting Algorank. Frontend: http://localhost  API docs: http://localhost/docs"
exec docker "${compose_args[@]}"
