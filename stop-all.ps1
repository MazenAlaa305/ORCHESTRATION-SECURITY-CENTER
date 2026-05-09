# ============================================================
# Found 404 — Shutdown Script
# Stops all containers and networks for both stacks.
# ============================================================

Write-Host "=== Stopping Lab Environment ===" -ForegroundColor Yellow
docker compose -f docker-compose.lab.yml --profile full-lab down

Write-Host "`n=== Stopping Main Dashboard Stack ===" -ForegroundColor Yellow
docker compose --profile full down

Write-Host "`n[OK] All services stopped." -ForegroundColor Green
