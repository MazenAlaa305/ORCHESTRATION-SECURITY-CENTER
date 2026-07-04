# ============================================================
# Found 404 — Lite Startup Script
# Starts the lean stack (~3-4 GB RAM total). Heavy optional services
# (OpenVAS, Elasticsearch, Kibana, Wazuh, n8n, celery_beat) are NOT started.
# For everything, use:  .\start-full.ps1
#
#   .\start-lite.ps1              start + build + seed
#   .\start-lite.ps1 -NoBuild     start without rebuilding images
#   .\start-lite.ps1 -SkipSeed    start without seeding demo targets
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

    Write-Host "Found 404 — Lite stack (~3-4 GB containers)" -ForegroundColor Gray

    Assert-Docker
    Ensure-LabNetwork

    $build = if ($NoBuild) { @() } else { @("--build") }

    Write-Hdr "Starting Main Stack (Lite)"
    Invoke-Compose -Arguments (@("up", "-d") + $build) -What "Main stack"
    Write-Ok "Main stack started (caddy, backend, frontend, db, redis, celery_worker)"

    Wait-Backend -Retries 30 -DelaySec 3

    Write-Hdr "Starting Lab Environment (Lite)"
    Invoke-Compose -Arguments (@("-f", $script:LAB_COMPOSE, "up", "-d") + $build) -What "Lab stack"
    Write-Ok "Lab started (webserver, api_gateway, fileserver, database, redis_cache, traffic_gen)"

    Invoke-Seed -Skip:$SkipSeed -WarmupSec 8

    Write-Hdr "Ready"
    Write-Host ""
    Write-Ok  "Dashboard  : https://localhost  (accept self-signed cert)"
    Write-Ok  "Backend API: http://localhost:8000/docs"
    Write-Ok  "Juice Shop : http://localhost:3000"
    Write-Ok  "API Gateway: http://localhost:8081"
    Write-Host ""
    Write-Host "RAM budget : ~3-4 GB containers  (Windows + Docker ~4.5 GB = ~8 GB total)" -ForegroundColor Gray
    Write-Host "Full mode  : .\start-full.ps1  (adds OpenVAS, ELK, Wazuh, n8n)" -ForegroundColor Gray
    Write-Host ""
}
finally {
    Pop-Location
}
