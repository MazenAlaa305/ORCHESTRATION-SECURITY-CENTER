#!/usr/bin/env bash
# ============================================================
# Found 404 — Lite startup (Linux/macOS). Mirrors start-lite.ps1:
# core stack + lite lab, with a backend health wait and demo seeding.
#
#   ./start-lite.sh              start + build + seed
#   ./start-lite.sh --no-build   start without rebuilding images
#   ./start-lite.sh --skip-seed  start without seeding demo targets
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"
source "./scripts/_common.sh"

BUILD="--build"
SEED="run"
for arg in "$@"; do
    case "$arg" in
        --no-build)  BUILD="" ;;
        --skip-seed) SEED="skip" ;;
        *) c_warn "Unknown option: $arg" ;;
    esac
done

assert_docker
ensure_lab_network

c_hdr "Starting Main Stack (Lite)"
docker compose up -d $BUILD
c_ok "Main stack started (caddy, backend, frontend, db, redis, celery_worker)"

wait_backend 30 3

c_hdr "Starting Lab Environment (Lite)"
docker compose -f "$LAB_COMPOSE" up -d $BUILD
c_ok "Lab started (webserver, api_gateway, fileserver, database, redis_cache, traffic_gen)"

seed_lab "$SEED" 8

c_hdr "Ready"
c_ok "Dashboard  : https://localhost  (accept self-signed cert)"
c_ok "API docs   : http://localhost:8000/docs"
c_ok "Juice Shop : http://localhost:3000"
echo ""
echo "Full mode: ./start-full.sh  (adds OpenVAS, ELK, Wazuh, n8n)"
