#!/bin/bash
# Stop all running stacks
echo "Stopping lab environment..."
docker compose -f docker-compose.lab.yml down

echo "Stopping main stack..."
docker compose down

echo "All containers stopped."
