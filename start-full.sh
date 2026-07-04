#!/usr/bin/env bash
# ============================================================
# Found 404 — Full startup (Linux/macOS). Mirrors start-full.ps1:
# full profile main stack + full-lab, with health wait and seeding.
#
#   ./start-full.sh              start + build + seed
#   ./start-full.sh --no-build   start without rebuilding images
#   ./start-full.sh --skip-seed  start without seeding demo targets
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

c_hdr "Starting Main Stack (Full Mode)"
docker compose --profile full up -d $BUILD
c_ok "Main stack started with Full profile"

# Full mode boots more services — allow a longer window to become healthy.
wait_backend 40 5

c_hdr "Starting Lab Environment (Full-Lab Mode)"
docker compose -f "$LAB_COMPOSE" --profile full-lab up -d $BUILD
c_ok "Lab started with full-lab profile"

seed_lab "$SEED" 15

c_hdr "System Ready (Full Mode)"
c_ok "Dashboard  : https://localhost"
c_ok "API docs   : http://localhost:8000/docs"
c_ok "Kibana     : http://localhost:5601"
c_ok "n8n SOAR   : http://localhost:5678"
c_ok "OpenVAS    : https://localhost:9392 (admin/admin)"
c_ok "Juice Shop : http://localhost:3000"
echo ""
c_info "Full mode needs significant RAM (~32 GB). If services crash, raise Docker resource limits."
