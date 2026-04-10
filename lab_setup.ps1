#!/usr/bin/env pwsh
# =============================================================
# lab_setup.ps1 - Found 404 Dashboard Lab Manager
# Manages the test lab environment (SME Network Simulation)
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
$LAB_NETWORK = "the-dashboard-project-_lab_network"

# ANSI Colors
function Write-Header($msg)  { Write-Host "`n==[ $msg ]==" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg)    { Write-Host "  [..] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "  [!!] $msg" -ForegroundColor Red }

# ─────────────────────────────────────────────────────────────
# START - Launch all lab containers
# ─────────────────────────────────────────────────────────────
function Start-Lab {
    Write-Header "Starting Living Lab Environment (SME Network Simulation)"

    # Create network if it doesn't exist
    $netExists = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$LAB_NETWORK`$"
    if (-not $netExists) {
        Write-Info "Creating external bridge network: $LAB_NETWORK"
        docker network create $LAB_NETWORK
        Write-Ok "Network created."
    } else {
        Write-Info "External network $LAB_NETWORK already exists."
    }

    Write-Info "Pulling images (first run may take a few minutes)..."
    docker compose -f $LAB_COMPOSE pull

    Write-Info "Checking for running lab containers..."
    $running = docker compose -f $LAB_COMPOSE ps --format "{{.Status}}"
    if ($running -match "Up") {
        Write-Info "Lab containers are already running."
    } else {
        Write-Info "Starting lab containers..."
        docker compose -f $LAB_COMPOSE up --build -d
    }

    Start-Sleep -Seconds 5
    
    Write-Header "Lab Status"
    Show-Status

    Write-Host ""
    Write-Ok "Lab is UP."
    Write-Ok "You can seed the dashboard lab targets by running: .\lab_setup.ps1 seed"
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
        @{ Name="lab_webserver";    Zone="DMZ";  Role="OWASP Juice Shop";      URL="http://localhost:3000" },
        @{ Name="lab_api_gateway";  Zone="DMZ";  Role="API Gateway (Nginx)";   URL="http://localhost:8081" },
        @{ Name="lab_dns_server";   Zone="DMZ";  Role="DNS Server (CoreDNS)";  URL="dns://localhost:5353" },
        @{ Name="lab_fileserver";   Zone="Corp"; Role="Samba File Server";     URL="smb://10.10.20.10" },
        @{ Name="lab_mailserver";   Zone="Corp"; Role="GreenMail Server";      URL="smtp://10.10.20.20:3025" },
        @{ Name="lab_workstation";  Zone="Corp"; Role="HR Workstation";        URL="http://10.10.20.40" },
        @{ Name="lab_database";     Zone="Data"; Role="Postgres Database";     URL="postgresql://10.10.30.10" },
        @{ Name="lab_redis_cache";  Zone="Data"; Role="Redis Cache";           URL="redis://10.10.30.20" },
        @{ Name="lab_traffic_gen";  Zone="Mgmt"; Role="Traffic Generator";     URL="Internal" },
        @{ Name="lab_log_shipper";  Zone="Mgmt"; Role="SIEM Log Shipper";      URL="Internal" }
    )

    foreach ($c in $containers) {
        $state = docker inspect --format '{{.State.Status}}' $c.Name 2>&1
        if ($state -eq "running") {
            Write-Ok "[$($c.Zone)] $($c.Name) - $($c.Role) - $($c.URL)"
        } elseif ($LASTEXITCODE -ne 0 -or $state -match "No such") {
            Write-Err "[$($c.Zone)] $($c.Name) - NOT FOUND (not started)"
        } else {
            Write-Info "[$($c.Zone)] $($c.Name) - State: $state"
        }
    }
}

# ─────────────────────────────────────────────────────────────
# SEED - Register test targets in the dashboard API
# ─────────────────────────────────────────────────────────────
function Invoke-SeedTargets {
    Write-Header "Seeding Lab Targets via API"

    # Check if API is reachable
    try {
        Invoke-RestMethod -Uri "$API_BASE/dashboard/risk-overview" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Ok "Dashboard API is reachable."
    } catch {
        Write-Err "Dashboard API at $API_BASE is not reachable. Start the main stack first."
        exit 1
    }

    # Use the new lab seed endpoint
    try {
        $result = Invoke-RestMethod -Uri "$API_BASE/lab/seed" -Method POST -ContentType "application/json" -ErrorAction Stop
        foreach ($item in $result.seeded) {
            if ($item.status -eq "created") {
                Write-Ok "Created: $($item.name) (ID: $($item.id))"
            } else {
                Write-Info "Already exists: $($item.name) (skipped)"
            }
        }
        Write-Host ""
        Write-Ok "Done! $($result.count) targets processed."
    } catch {
        Write-Err "Failed to seed targets: $_"
        exit 1
    }

    Write-Host "  Open the dashboard: http://localhost:5173" -ForegroundColor Cyan
}

# ─────────────────────────────────────────────────────────────
# RESET - Remove all lab containers and volumes
# ─────────────────────────────────────────────────────────────
function Reset-Lab {
    Write-Header "Resetting Lab (removing containers + volumes)"
    docker compose -f $LAB_COMPOSE down -v --remove-orphans
    # Optionally remove network too?
    # docker network rm $LAB_NETWORK >$null 2>&1
    Write-Ok "Lab fully reset."
}

# ─────────────────────────────────────────────────────────────
# LOGS - Stream logs from a specific container
# ─────────────────────────────────────────────────────────────
function Show-Logs {
    Write-Header "Available Lab Containers"
    docker compose -f $LAB_COMPOSE ps --format "table {{.Name}}`t{{.Status}}"
    Write-Host ""
    $container = Read-Host "Enter container name to follow logs (Ctrl+C to stop)"
    docker logs -f $container
}

# ─────────────────────────────────────────────────────────────
# MAIN DISPATCH
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Found 404 - Lab Manager (SME Simulation)" -ForegroundColor Magenta
Write-Host "  Action: $Action" -ForegroundColor DarkGray

switch ($Action) {
    "start"  { Start-Lab }
    "stop"   { Stop-Lab }
    "status" { Show-Status }
    "seed"   { Invoke-SeedTargets }
    "reset"  { Reset-Lab }
    "logs"   { Show-Logs }
}
