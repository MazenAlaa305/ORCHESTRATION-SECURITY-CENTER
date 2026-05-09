#!/usr/bin/env bash
# infra/healthcheck.sh — exit 0 only if every critical service is healthy.
#
# Usage (from repo root):
#   ./infra/healthcheck.sh
#
# Designed to be safe to run after `docker compose up` or
# `start-lite.sh` — every check is independent and catches its own errors.
set -uo pipefail

ok=0
fail=0

check() {
    local name=$1
    local cmd=$2
    if eval "$cmd" >/dev/null 2>&1; then
        printf "  [OK]   %s\n"   "$name"
        ok=$((ok + 1))
    else
        printf "  [FAIL] %s\n" "$name"
        fail=$((fail + 1))
    fi
}

echo "Orchestration Security Center — health check"
echo "--------------------------------------------"

check "Backend /health"        'curl -fsS http://localhost:8000/health'
check "Frontend (Vite dev)"    'curl -fsS http://localhost:5173 -o /dev/null'
check "Caddy proxy (HTTPS)"    'curl -fsSk https://localhost -o /dev/null'
check "Postgres ready"         'docker compose exec -T db pg_isready -U user'
check "Redis PING"             'docker compose exec -T redis redis-cli PING | grep -q PONG'
check "Celery worker reachable" 'docker compose exec -T celery_worker celery -A app.core.celery_app inspect ping'

echo "--------------------------------------------"
printf "  %d OK · %d FAIL\n" "$ok" "$fail"

if [ "$fail" -gt 0 ]; then
    exit 1
fi
exit 0
