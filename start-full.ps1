# ============================================================
# Found 404 — Full Startup Script
# Starts the full stack (~32 GB RAM recommended). Includes OpenVAS,
# Elasticsearch, Kibana, Wazuh, n8n and the full-lab profile.
#
#   .\start-full.ps1              start + build + seed
#   .\start-full.ps1 -NoBuild     start without rebuilding images
#   .\start-full.ps1 -SkipSeed    start without seeding demo targets
# ============================================================

param(
    [switch]$SkipSeed,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

# Run from the repo root regardless of the caller's CWD so the compose
# files resolve, then load the shared helpers.
Push-Location $PSScriptRoot
try {
    . "$PSScriptRoot/scripts/_common.ps1"

    Write-Host "Found 404 — Full stack (~32 GB RAM recommended)" -ForegroundColor Gray

    Assert-Docker
    Ensure-LabNetwork

    $build = if ($NoBuild) { @() } else { @("--build") }

    Write-Hdr "Starting Main Stack (Full Mode)"
    Invoke-Compose -Arguments (@("--profile", "full", "up", "-d") + $build) -What "Main stack"
    Write-Ok "Main stack started with Full profile"

    # Full mode boots more services — allow a longer window to become healthy.
    Wait-Backend -Retries 40 -DelaySec 5

    Write-Hdr "Starting Lab Environment (Full-Lab Mode)"
    Invoke-Compose -Arguments (@("-f", $script:LAB_COMPOSE, "--profile", "full-lab", "up", "-d") + $build) -What "Lab stack"
    Write-Ok "Lab started with full-lab profile"

    Invoke-Seed -Skip:$SkipSeed -WarmupSec 15

    Write-Hdr "System Ready (Full Mode)"
    Write-Host ""
    Write-Ok  "Dashboard  : https://localhost"
    Write-Ok  "Backend API: http://localhost:8000/docs"
    Write-Ok  "Kibana     : http://localhost:5601"
    Write-Ok  "n8n SOAR   : http://localhost:5678"
    Write-Ok  "OpenVAS    : https://localhost:9392 (admin/admin)"
    Write-Ok  "Juice Shop : http://localhost:3000"
    Write-Host ""
    Write-Info "Full mode needs significant RAM (~32 GB). If services crash, raise Docker Desktop resource limits."
    Write-Host ""
}
finally {
    Pop-Location
}
