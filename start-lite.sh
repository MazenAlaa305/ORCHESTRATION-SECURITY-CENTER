#!/bin/bash
# Minimum footprint startup — core services only, lab in lite mode
set -e

echo "[1/3] Starting main stack (core services, no optional integrations)..."
docker compose up -d

echo "[2/3] Creating lab network if not present..."
docker network create the-dashboard-project-_lab_network 2>/dev/null || true

echo "[3/3] Starting lite lab (6 containers, ~672 MB)..."
docker compose -f docker-compose.lab.yml up -d

echo ""
echo "Stack is up (lite mode)."
echo ""
echo "  Main dashboard : http://localhost:5173"
echo "  API docs       : http://localhost:8000/docs"
echo "  Juice Shop lab : http://localhost:3000"
echo ""
echo "  To add SIEM/SOAR/OpenVAS integrations:"
echo "  docker compose --profile full up -d"
