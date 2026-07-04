# ============================================================
# Found 404 — Shutdown Script
# Stops all containers for both stacks. Covers every profile so a
# stack started with either start-lite or start-full comes fully down.
#
#   .\stop-all.ps1                  stop containers
#   .\stop-all.ps1 -RemoveVolumes   also delete named volumes (data reset)
#   .\stop-all.ps1 -RemoveNetwork   also remove the shared lab network
# ============================================================

param(
    [switch]$RemoveVolumes,
    [switch]$RemoveNetwork
)

# Best-effort teardown — keep going even if one stack is already down.
$ErrorActionPreference = "Continue"

Push-Location $PSScriptRoot
try {
    . "$PSScriptRoot/scripts/_common.ps1"

    $vol = if ($RemoveVolumes) { @("-v") } else { @() }

    Write-Hdr "Stopping Lab Environment"
    docker compose -f $script:LAB_COMPOSE --profile full-lab down @vol

    Write-Hdr "Stopping Main Dashboard Stack"
    docker compose --profile full down @vol

    if ($RemoveNetwork) {
        Write-Hdr "Removing Lab Network"
        docker network rm $script:LAB_NETWORK 2>$null | Out-Null
        Write-Ok "Removed $script:LAB_NETWORK (if it existed)"
    }

    Write-Host ""
    Write-Ok "All services stopped."
    if ($RemoveVolumes) { Write-Warn "Named volumes were deleted — database/lab data was reset." }
}
finally {
    Pop-Location
}
