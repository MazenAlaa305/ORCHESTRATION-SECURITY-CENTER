#!/usr/bin/env bash
# ============================================================
# Found 404 — shared helpers for the run scripts (bash)
# Source from a launcher:  source "$(dirname "$0")/scripts/_common.sh"
# Mirrors scripts/_common.ps1 so the Linux/macOS path behaves like Windows.
# ============================================================

LAB_NETWORK="the-dashboard-project-_lab_network"
LAB_COMPOSE="docker-compose.lab.yml"
HEALTH_URL="http://localhost:8000/health"
SEED_URL="http://localhost:8000/api/v1/lab/seed"

c_ok()   { printf '\033[32m[OK]\033[0m %s\n' "$*"; }
c_info() { printf '\033[36m[..]\033[0m %s\n' "$*"; }
c_warn() { printf '\033[33m[!!]\033[0m %s\n' "$*"; }
c_err()  { printf '\033[31m[XX]\033[0m %s\n' "$*"; }
c_hdr()  { printf '\n\033[33m=== %s ===\033[0m\n' "$*"; }

assert_docker() {
    c_hdr "Checking Docker"
    if ! docker info >/dev/null 2>&1; then
        c_err "Docker is not running. Start it and try again."
        exit 1
    fi
    c_ok "Docker is running"
}

ensure_lab_network() {
    c_hdr "Lab Network"
    if docker network ls --format '{{.Name}}' | grep -qx "$LAB_NETWORK"; then
        c_ok "$LAB_NETWORK already exists"
    else
        docker network create "$LAB_NETWORK" >/dev/null && c_ok "Created $LAB_NETWORK"
    fi
}

# wait_backend [retries] [delay_seconds]
wait_backend() {
    local retries="${1:-30}" delay="${2:-3}" i
    c_hdr "Waiting for Backend"
    for ((i = 1; i <= retries; i++)); do
        if curl -fs --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
            c_ok "Backend is healthy"
            return 0
        fi
        c_info "Waiting... ($i/$retries)"
        sleep "$delay"
    done
    c_err "Backend did not become healthy. Check: docker compose logs backend"
    exit 1
}

# seed_lab <run|skip> [warmup_seconds]
seed_lab() {
    if [[ "${1:-run}" == "skip" ]]; then
        c_info "Skipping lab seed"
        return 0
    fi
    local warmup="${2:-8}"
    c_hdr "Seeding Lab Targets"
    sleep "$warmup"
    if curl -fs --max-time 30 -X POST "$SEED_URL" >/dev/null 2>&1; then
        c_ok "Seed request accepted"
    else
        c_warn "Seed failed (lab may still be initializing). Run: curl -X POST $SEED_URL"
    fi
}
