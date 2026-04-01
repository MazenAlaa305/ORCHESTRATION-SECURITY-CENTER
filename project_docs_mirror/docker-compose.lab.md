# docker-compose.lab.yml — Documentation

## File Purpose

This is the **lab environment deployment manifest**. It defines intentionally vulnerable target containers used exclusively for testing and demonstrating the Found 404 scanning capabilities in a safe, isolated environment. It should never be exposed to the public internet.

## Key Services Defined

### `juiceshop`
The OWASP Juice Shop — a deliberately insecure Node.js web application that serves as the primary scanning target. It embeds dozens of OWASP Top 10 vulnerabilities (XSS, SQL Injection, IDOR, broken authentication, etc.) for demonstration purposes. Exposed on port `3000`.

### `dvwa` (if present)
Damn Vulnerable Web Application — a PHP/MySQL application with configurable vulnerability difficulty levels (low/medium/high). Used to test the agent's authenticated-scan capabilities.

### `webgoat` (if present)
OWASP WebGoat — a Java-based deliberately insecure application with interactive security lessons. Used for testing the agent's form-injection capabilities.

### `vulnerable_redis`
A Redis instance running without an authentication password. This service is used to validate that the `AttackAgent` correctly identifies and reports exposed Redis databases (a common critical misconfiguration in SME environments).

## Network Configuration

All lab services are connected exclusively to the `lab_network` Docker bridge network. This network is shared with the main `docker-compose.yml` services (backend, celery_worker) so that the scan agents can reach the vulnerable targets. The `lab_network` is declared as `external:true` and must be created before starting either compose stack.

## Interaction with Main Stack

The lab environment does not replace the main stack — it runs alongside it. The `trigger_lab_scans.ps1` / `trigger_lab_scans.py` scripts seed the `targets` table with the lab service addresses and trigger the AI agent pipeline against them, producing a realistic demonstration of end-to-end vulnerability discovery.

## Dependencies

- Requires the `lab_network` external Docker network to exist (created by `lab_setup.ps1`).
- Requires the main `docker-compose.yml` stack to be running so that scan results have a backend to persist to.
