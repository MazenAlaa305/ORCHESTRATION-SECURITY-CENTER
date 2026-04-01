# backend/scripts/simulate_attack.py — Documentation

## File Purpose

A **security demonstration script** for the lab environment that simulates realistic attack behaviors against the vulnerable lab targets. Used to generate meaningful SIEM alerts in Wazuh and Elasticsearch, demonstrating the platform's threat detection and SOAR response capabilities.

## Key Functions

### `simulate_sql_injection(target_url)`
Sends HTTP requests containing common SQL injection payloads to the target application's search and login endpoints. Generates database error responses that would trigger SIEM rules, producing Wazuh alerts classified as SQL Injection attempts.

### `simulate_xss_attack(target_url)`
Submits XSS payloads through form fields and URL parameters. Logs the reflected/stored response to confirm payload delivery.

### `simulate_brute_force(target_url, username)`
Sends a configurable number of failed login attempts to the target's authentication endpoint using generated false passwords. Generates authentication failure events that trigger brute-force detection rules in Wazuh.

### `simulate_port_scan(target_ip)`
Uses subprocess to invoke Nmap against the target IP. Produces network traffic that would trigger IDS alerts. Logs discovered open ports.

### `simulate_data_exfiltration(target_url)`
Sends HTTP requests to data-retrieval endpoints with manipulated ID parameters (IDOR/BOLA simulation), attempting to retrieve records belonging to other users by exhausting a range of IDs.

### `run_full_simulation()`
Orchestrates all simulation functions in sequence, introducing delays between each to produce a realistic multi-stage attack timeline in the SIEM logs.

## Usage Context

Run manually from the host machine after lab setup to populate the SIEM with realistic alerts. Not executed automatically — requires explicit invocation by the demonstration operator.

## Dependencies

### External
- `requests` — HTTP client for attack simulations
- `subprocess` — For Nmap invocation
- `time` — For introducing delays between attack phases
