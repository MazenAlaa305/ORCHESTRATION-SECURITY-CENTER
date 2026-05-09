# ============================================================
# Found 404 — Lite Startup Script
# Starts the lean stack (~3-4 GB RAM total).
# Heavy optional services (OpenVAS, Elasticsearch, Kibana,
# Wazuh, n8n, celery_beat) are NOT started.
# To start everything: docker compose --profile full up -d
# ============================================================

param(
    [switch]$SkipSeed,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

function Write-Ok   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[..] $msg" -ForegroundColor Cyan }
function Write-Err  { param($msg) Write-Host "[!!] $msg" -ForegroundColor Red }
function Write-Hdr  { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Yellow }

# ── 1. Check Docker Desktop ───────────────────────────────────────────────────
Write-Hdr "Checking Docker"
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Ok "Docker is running"
} catch {
    Write-Err "Docker Desktop is not running. Please start it and try again."
    exit 1
}

# ── 2. Create external lab network (idempotent) ───────────────────────────────
Write-Hdr "Lab Network"
$netExists = docker network ls --filter name=the-dashboard-project-_lab_network --format "{{.Name}}" 2>&1
if ($netExists -match "the-dashboard-project-_lab_network") {
    Write-Ok "lab_network already exists"
} else {
    docker network create the-dashboard-project-_lab_network | Out-Null
    Write-Ok "Created lab_network"
}

# ── 3. Start lean main stack (6 services, no --profile full) ─────────────────
Write-Hdr "Starting Main Stack (Lite)"
$buildFlag = if ($NoBuild) { "" } else { "--build" }
if ($NoBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Err "Main stack failed to start. Check logs with: docker compose logs"
    exit 1
}
Write-Ok "Main stack started (caddy, backend, frontend, db, redis, celery_worker)"

# ── 4. Wait for backend health ────────────────────────────────────────────────
Write-Hdr "Waiting for Backend"
$retries = 30
$ready   = $false
for ($i = 1; $i -le $retries; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        if ($resp.status -eq "ok" -or $resp.status -eq "healthy") {
            $ready = $true; break
        }
    } catch {}
    Write-Info "Waiting... ($i/$retries)"
    Start-Sleep -Seconds 3
}
if (-not $ready) {
    Write-Err "Backend did not become healthy. Check: docker compose logs backend"
    exit 1
}
Write-Ok "Backend is healthy"

# ── 5. Start lean lab (6 containers, default profile) ────────────────────────
Write-Hdr "Starting Lab Environment (Lite)"
if ($NoBuild) {
    docker compose -f docker-compose.lab.yml up -d
} else {
    docker compose -f docker-compose.lab.yml up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Err "Lab stack failed to start. Check: docker compose -f docker-compose.lab.yml logs"
    exit 1
}
Write-Ok "Lab started (webserver, api_gateway, fileserver, database, redis_cache, traffic_gen)"

# ── 6. Seed lab targets ───────────────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Hdr "Seeding Lab Targets"
    Start-Sleep -Seconds 8
    try {
        $seed = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/lab/seed" -TimeoutSec 15 -ErrorAction Stop
        Write-Ok "Seeded $($seed.seeded) targets ($($seed.skipped) already existed)"
    } catch {
        Write-Info "Seed request failed (lab may still be initializing). Run manually:"
        Write-Info "  Invoke-RestMethod -Method Post http://localhost:8000/api/v1/lab/seed"
    }
}

# ── 7. Summary ────────────────────────────────────────────────────────────────
Write-Hdr "Ready"
Write-Host ""
Write-Ok  "Dashboard  : https://localhost  (accept self-signed cert)"
Write-Ok  "Backend API: http://localhost:8000/docs"
Write-Ok  "Juice Shop : http://localhost:3000"
Write-Ok  "API Gateway: http://localhost:8081"
Write-Host ""
Write-Host "RAM budget : ~3-4 GB containers  (Windows + Docker ~4.5 GB = ~8 GB total)" -ForegroundColor Gray
Write-Host "Full mode  : docker compose --profile full up -d  (adds OpenVAS, ELK, Wazuh, n8n)" -ForegroundColor Gray
Write-Host ""
