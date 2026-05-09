# ============================================================
# Found 404 — Full Startup Script
# Starts the full stack (~32 GB RAM recommended).
# Includes OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, etc.
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

# ── 3. Start full main stack ─────────────────────────────────────────────────
Write-Hdr "Starting Main Stack (Full Mode)"
$buildFlag = if ($NoBuild) { "" } else { "--build" }
if ($NoBuild) {
    docker compose --profile full up -d
} else {
    docker compose --profile full up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Err "Main stack failed to start. Check logs with: docker compose logs"
    exit 1
}
Write-Ok "Main stack started with Full profile"

# ── 4. Wait for backend health ────────────────────────────────────────────────
Write-Hdr "Waiting for Backend"
$retries = 40
$ready   = $false
for ($i = 1; $i -le $retries; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        if ($resp.status -eq "ok" -or $resp.status -eq "healthy") {
            $ready = $true; break
        }
    } catch {}
    Write-Info "Waiting for backend... ($i/$retries)"
    Start-Sleep -Seconds 5
}
if (-not $ready) {
    Write-Err "Backend did not become healthy. Check: docker compose logs backend"
    exit 1
}
Write-Ok "Backend is healthy"

# ── 5. Start full lab ────────────────────────────────────────────────────────
Write-Hdr "Starting Lab Environment (Full-Lab Mode)"
if ($NoBuild) {
    docker compose -f docker-compose.lab.yml --profile full-lab up -d
} else {
    docker compose -f docker-compose.lab.yml --profile full-lab up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Err "Lab stack failed to start. Check: docker compose -f docker-compose.lab.yml logs"
    exit 1
}
Write-Ok "Lab started with full-lab profile"

# ── 6. Seed lab targets ───────────────────────────────────────────────────────
if (-not $SkipSeed) {
    Write-Hdr "Seeding Lab Targets"
    Write-Info "Waiting 15 seconds for lab containers to initialize..."
    Start-Sleep -Seconds 15
    try {
        $seed = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/lab/seed" -TimeoutSec 30 -ErrorAction Stop
        Write-Ok "Seeded $($seed.seeded) targets ($($seed.skipped) already existed)"
    } catch {
        Write-Info "Seed request failed (lab may still be initializing). You can run it manually later:"
        Write-Info "  Invoke-RestMethod -Method Post http://localhost:8000/api/v1/lab/seed"
    }
}

# ── 7. Summary ────────────────────────────────────────────────────────────────
Write-Hdr "System Ready (Full Mode)"
Write-Host ""
Write-Ok  "Dashboard  : https://localhost"
Write-Ok  "Backend API: http://localhost:8000/docs"
Write-Ok  "Kibana     : http://localhost:5601"
Write-Ok  "n8n SOAR   : http://localhost:5678"
Write-Ok  "OpenVAS    : https://localhost:9392 (admin/admin)"
Write-Ok  "Juice Shop : http://localhost:3000"
Write-Host ""
Write-Info "Note: Full mode requires significant RAM (~32GB). If services crash, check Docker Desktop resource limits."
Write-Host ""
