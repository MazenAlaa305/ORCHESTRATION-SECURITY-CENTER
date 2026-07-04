# ============================================================
# Found 404 — shared helpers for the run scripts (PowerShell)
# Dot-source from a launcher:  . "$PSScriptRoot/scripts/_common.ps1"
# Centralises Docker checks, health waits and seeding so start-lite.ps1
# and start-full.ps1 differ only in the compose profiles they pass.
# ============================================================

$script:LAB_NETWORK = "the-dashboard-project-_lab_network"
$script:LAB_COMPOSE = "docker-compose.lab.yml"
$script:HEALTH_URL  = "http://localhost:8000/health"
$script:SEED_URL    = "http://localhost:8000/api/v1/lab/seed"

function Write-Ok   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[..] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "[!!] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "[XX] $msg" -ForegroundColor Red }
function Write-Hdr  { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Yellow }

# Fail fast unless Docker Desktop is up — every downstream step needs it.
function Assert-Docker {
    Write-Hdr "Checking Docker"
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -ne 0) { throw "docker info returned $LASTEXITCODE" }
        Write-Ok "Docker is running"
    } catch {
        Write-Err "Docker Desktop is not running. Start it and try again."
        exit 1
    }
}

# Create the external lab network if it isn't already present (idempotent).
function Ensure-LabNetwork {
    Write-Hdr "Lab Network"
    $exists = docker network ls --filter "name=$script:LAB_NETWORK" --format "{{.Name}}" 2>&1
    if ($exists -match [regex]::Escape($script:LAB_NETWORK)) {
        Write-Ok "$script:LAB_NETWORK already exists"
    } else {
        docker network create $script:LAB_NETWORK | Out-Null
        Write-Ok "Created $script:LAB_NETWORK"
    }
}

# Run `docker compose <args>` and abort the script on a non-zero exit.
function Invoke-Compose {
    param([Parameter(Mandatory)][string[]]$Arguments, [string]$What = "stack")
    Write-Info "docker compose $($Arguments -join ' ')"
    docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$What failed (exit $LASTEXITCODE). Inspect logs with: docker compose logs"
        exit 1
    }
}

# Poll /health until the backend reports healthy, or give up and abort.
function Wait-Backend {
    param([int]$Retries = 30, [int]$DelaySec = 3)
    Write-Hdr "Waiting for Backend"
    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $resp = Invoke-RestMethod -Uri $script:HEALTH_URL -TimeoutSec 3 -ErrorAction Stop
            if ($resp.status -in @("ok", "healthy")) { Write-Ok "Backend is healthy"; return }
        } catch {}
        Write-Info "Waiting... ($i/$Retries)"
        Start-Sleep -Seconds $DelaySec
    }
    Write-Err "Backend did not become healthy. Check: docker compose logs backend"
    exit 1
}

# Seed the demo lab targets (best-effort — never aborts the run).
function Invoke-Seed {
    param([switch]$Skip, [int]$WarmupSec = 8)
    if ($Skip) { Write-Info "Skipping lab seed (--SkipSeed)"; return }
    Write-Hdr "Seeding Lab Targets"
    if ($WarmupSec -gt 0) { Start-Sleep -Seconds $WarmupSec }
    try {
        $seed = Invoke-RestMethod -Method Post -Uri $script:SEED_URL -TimeoutSec 30 -ErrorAction Stop
        Write-Ok "Seeded $($seed.seeded) target(s) ($($seed.skipped) already existed)"
    } catch {
        Write-Warn "Seed request failed (lab may still be initializing). Run manually:"
        Write-Warn "  Invoke-RestMethod -Method Post $script:SEED_URL"
    }
}
