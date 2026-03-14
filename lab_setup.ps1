#!/usr/bin/env pwsh
# =============================================================
# lab_setup.ps1 - Found 404 Dashboard Lab Manager
# Manages the test lab environment (3 test triples)
# Usage: .\lab_setup.ps1 [start|stop|status|seed|reset]
# =============================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("start","stop","status","seed","reset","logs")]
    [string]$Action = "status"
)

$PROJECT_DIR = $PSScriptRoot
$API_BASE    = "http://localhost:8000/api/v1"
$LAB_COMPOSE = Join-Path $PROJECT_DIR "docker-compose.lab.yml"

# ANSI Colors
function Write-Header($msg)  { Write-Host "`n==[ $msg ]==" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg)    { Write-Host "  [..] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "  [!!] $msg" -ForegroundColor Red }

# ─────────────────────────────────────────────────────────────
# START - Launch all lab containers
# ─────────────────────────────────────────────────────────────
function Start-Lab {
    Write-Header "Starting Lab Environment (3 Test Triples)"

    Write-Info "Pulling images (first run may take a few minutes)..."
    docker compose -f $LAB_COMPOSE pull 2>&1 | Out-Null

    Write-Info "Starting lab containers..."
    docker compose -f $LAB_COMPOSE up -d

    Start-Sleep -Seconds 5
    
    Write-Header "Lab Status"
    Show-Status

    Write-Host ""
    Write-Ok "Lab is UP. Run: .\lab_setup.ps1 seed  -- to register targets in the dashboard"
}

# ─────────────────────────────────────────────────────────────
# STOP - Tear down lab containers
# ─────────────────────────────────────────────────────────────
function Stop-Lab {
    Write-Header "Stopping Lab Environment"
    docker compose -f $LAB_COMPOSE down
    Write-Ok "All lab containers stopped."
}

# ─────────────────────────────────────────────────────────────
# STATUS - Show container states
# ─────────────────────────────────────────────────────────────
function Show-Status {
    Write-Header "Lab Container Status"

    $containers = @(
        @{ Name="lab_juice_shop";    Triple="1"; Role="OWASP Juice Shop (Web App)";      URL="http://localhost:3000" },
        @{ Name="lab_gateway";       Triple="2"; Role="Corporate Router (Telnet/HTTP)";   URL="172.30.0.10" },
        @{ Name="lab_hr_pc";         Triple="2"; Role="HR Workstation (RDP/SMB)";         URL="172.30.0.20" },
        @{ Name="lab_dev_pc";        Triple="2"; Role="Dev Laptop (SSH/HTTP)";            URL="172.30.0.30" },
        @{ Name="lab_file_server";   Triple="2"; Role="File Server (Samba)";              URL="172.30.0.40" },
        @{ Name="lab_redis_exposed"; Triple="3"; Role="Exposed Redis (no auth)";          URL="172.30.0.50:6379" },
        @{ Name="lab_api_server";    Triple="3"; Role="Mock REST API (HTTPBin)";          URL="http://localhost:8081" }
    )

    foreach ($c in $containers) {
        $state = docker inspect --format '{{.State.Status}}' $c.Name 2>&1
        if ($state -eq "running") {
            Write-Ok "[Triple $($c.Triple)] $($c.Name) - $($c.Role) - $($c.URL)"
        } elseif ($LASTEXITCODE -ne 0 -or $state -match "No such") {
            Write-Err "[Triple $($c.Triple)] $($c.Name) - NOT FOUND (not started)"
        } else {
            Write-Info "[Triple $($c.Triple)] $($c.Name) - State: $state"
        }
    }
}

# ─────────────────────────────────────────────────────────────
# SEED - Register test targets in the dashboard API
# ─────────────────────────────────────────────────────────────
function Seed-Targets {
    Write-Header "Seeding Test Targets into Dashboard"
    
    # Check if API is reachable
    try {
        $ping = Invoke-RestMethod -Uri "$API_BASE/dashboard/summary" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Ok "Dashboard API is reachable."
    } catch {
        Write-Err "Dashboard API at $API_BASE is not reachable. Start the main stack first:"
        Write-Host "  docker compose up -d" -ForegroundColor White
        exit 1
    }

    $targets = @(
        @{
            name             = "[T1] OWASP Juice Shop"
            base_url         = "http://lab_juice_shop:3000"
            auth_method      = "form"
            auth_credentials = @{ username = "admin@juice-sh.op"; password = "admin123" }
            description      = "Triple 1 - Intentionally vulnerable web app. Tests XSS, SQLi, IDOR, Broken Auth."
        },
        @{
            name             = "[T2] Corporate Gateway"
            base_url         = "http://172.30.0.10"
            auth_method      = "none"
            auth_credentials = @{}
            description      = "Triple 2 - Router exposing Telnet (23) and HTTP (80). Tests network exposure."
        },
        @{
            name             = "[T2] HR Workstation"
            base_url         = "http://172.30.0.20"
            auth_method      = "none"
            auth_credentials = @{}
            description      = "Triple 2 - Simulated Windows PC with RDP (3389) and SMB (445)."
        },
        @{
            name             = "[T2] Developer Laptop"
            base_url         = "http://172.30.0.30"
            auth_method      = "none"
            auth_credentials = @{}
            description      = "Triple 2 - Linux dev machine with open SSH (22) and dev server (8080)."
        },
        @{
            name             = "[T3] Exposed Redis"
            base_url         = "redis://172.30.0.50:6379"
            auth_method      = "none"
            auth_credentials = @{}
            description      = "Triple 3 - Redis with no auth and no protected mode. Simulates DB exposure."
        },
        @{
            name             = "[T3] Mock REST API"
            base_url         = "http://lab_api_server:80"
            auth_method      = "none"
            auth_credentials = @{}
            description      = "Triple 3 - HTTPBin server simulating an open REST API without authentication."
        }
    )

    $seeded = 0
    foreach ($target in $targets) {
        try {
            $body = $target | ConvertTo-Json -Depth 5
            $result = Invoke-RestMethod -Uri "$API_BASE/targets/" `
                -Method POST `
                -Body $body `
                -ContentType "application/json" `
                -ErrorAction Stop
            Write-Ok "Seeded: $($target.name) (ID: $($result.id))"
            $seeded++
        } catch {
            $errMsg = $_.Exception.Response.StatusCode
            if ($errMsg -eq 400) {
                Write-Info "Already exists: $($target.name) (skipped)"
            } else {
                Write-Err "Failed: $($target.name) - $_"
            }
        }
    }

    Write-Host ""
    Write-Ok "Done! $seeded new targets registered."
    Write-Host "  Open the dashboard: http://localhost:5173" -ForegroundColor Cyan
}

# ─────────────────────────────────────────────────────────────
# RESET - Remove all lab containers and volumes
# ─────────────────────────────────────────────────────────────
function Reset-Lab {
    Write-Header "Resetting Lab (removing containers + volumes)"
    docker compose -f $LAB_COMPOSE down -v --remove-orphans
    Write-Ok "Lab fully reset."
}

# ─────────────────────────────────────────────────────────────
# LOGS - Stream logs from a specific container
# ─────────────────────────────────────────────────────────────
function Show-Logs {
    Write-Header "Available Lab Containers"
    docker compose -f $LAB_COMPOSE ps --format "table {{.Name}}\t{{.Status}}"
    Write-Host ""
    $container = Read-Host "Enter container name to follow logs (Ctrl+C to stop)"
    docker logs -f $container
}

# ─────────────────────────────────────────────────────────────
# MAIN DISPATCH
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Found 404 - Lab Manager v1.0" -ForegroundColor Magenta
Write-Host "  Action: $Action" -ForegroundColor DarkGray

switch ($Action) {
    "start"  { Start-Lab }
    "stop"   { Stop-Lab }
    "status" { Show-Status }
    "seed"   { Seed-Targets }
    "reset"  { Reset-Lab }
    "logs"   { Show-Logs }
}
