# sys_cleanup.ps1 — Documentation

## File Purpose

A concise PowerShell utility script for **completely tearing down and resetting the lab environment**. It stops and removes all containers, networks, and optionally volumes defined by both Docker Compose stacks. Intended for use between demonstrations or when resetting to a clean state.

## Key Logic

### Container Teardown
Executes `docker compose down` against both `docker-compose.yml` and `docker-compose.lab.yml`, stopping all running containers and removing the containers and networks created by those stacks.

### Volume Cleanup (Optional)
If called with a `-CleanVolumes` flag (or equivalent), appends `--volumes` to the `docker compose down` command, which removes all named Docker volumes (`postgres_data`, `gvm_data`, etc.). This results in a completely clean state — all scan history, vulnerability data, and OpenVAS feed data is erased.

### Network Removal
Removes the `the-dashboard-project-_lab_network` external Docker network if it exists, using `docker network rm`.

## Usage Context

Typically run as the final step in a demonstration session to clean up resources, or as the first step before re-running `lab_setup.ps1` to ensure a fresh, reproducible environment.

## Dependencies

- **External Tools**: Docker CLI (`docker`), PowerShell.
- **Interacts with**: `docker-compose.yml`, `docker-compose.lab.yml`.
