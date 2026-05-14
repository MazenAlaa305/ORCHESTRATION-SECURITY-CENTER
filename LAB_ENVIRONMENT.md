# SME Lab Environment — Full Documentation

> **Purpose:** Intentionally vulnerable network simulation for security research, CTF training, and SIEM/SOAR dashboard testing.
> **Total containers (lite mode):** 6 | **Full profile:** 10+ additional services

---

## 1. Environment Overview

This lab simulates a small-to-medium enterprise (SME) corporate network. It has two compose stacks:

| Stack | File | Purpose |
|---|---|---|
| **Dashboard Stack** | `docker-compose.yml` | Security dashboard (backend, frontend, DB, SIEM, SOAR) |
| **Lab Stack** | `docker-compose.lab.yml` | Vulnerable target network (intentionally insecure) |

Both stacks share a bridge network called `the-dashboard-project-_lab_network` so the dashboard backend can monitor lab targets.

---

## 2. Network Topology & Subnets

```
                        ┌─────────────────────────────────┐
  INTERNET / HOST       │         HOST MACHINE             │
  (Docker bridge)       │   localhost ports exposed        │
                        └────────────┬────────────────────┘
                                     │
           ┌─────────────────────────┼───────────────────────────┐
           │                         │                           │
    ┌──────▼──────┐         ┌────────▼────────┐        ┌────────▼────────┐
    │  DMZ Network │         │  CORP Network   │        │  DATA Network   │
    │ 10.10.10.0/24│         │ 10.10.20.0/24  │        │ 10.10.30.0/24   │
    │ GW:10.10.10.1│         │ GW:10.10.20.1  │        │ GW:10.10.30.1   │
    └──────┬───────┘         └────────┬────────┘        └────────┬────────┘
           │                          │                          │
    ┌──────┼──────┐           ┌───────┼────────┐        ┌───────┼───────┐
    │      │      │           │       │        │        │       │
 web-  api- dns-          file-  mail-  work-         db-   redis-
server  gw  svr           svr    svr    station       svr   cache

                        ┌───────────────────────────────┐
                        │    MGMT Network 10.10.40.0/24 │
                        │    GW: 10.10.40.1             │
                        │   traffic-gen  log-shipper     │
                        └───────────────────────────────┘

    All stacks also connected via: lab_network (external bridge — shared with dashboard)
```

### Subnet Summary

| Network | CIDR | Gateway | Zone | `internal` |
|---|---|---|---|---|
| `dmz` | `10.10.10.0/24` | `10.10.10.1` | Internet-facing | Yes (isolation override) |
| `corp` | `10.10.20.0/24` | `10.10.20.1` | Corporate office | Yes (isolation override) |
| `data` | `10.10.30.0/24` | `10.10.30.1` | Database/cache tier | Yes (isolation override) |
| `mgmt` | `10.10.40.0/24` | `10.10.40.1` | Monitoring/utilities | No (must reach Elasticsearch) |
| `lab_network` | external bridge | — | Cross-stack shared | No |
| `default` | Docker default | — | Dashboard stack only | No |

---

## 3. Container Inventory

### 3.1 LAB STACK — DMZ Subnet

---

#### `lab_webserver` — OWASP Juice Shop

| Field | Value |
|---|---|
| **Image** | `bkimminich/juice-shop:latest` |
| **Base OS** | Node.js on Debian/Alpine |
| **Hostname** | `webserver.sme-lab.local` |
| **IP** | `10.10.10.10` (DMZ) |
| **Host Port** | `3000 → 3000` (default: LAN; isolation: `127.0.0.1:3000`) |
| **Networks** | `dmz`, `lab_network` |
| **CPU Limit** | 0.5 cores |
| **RAM Limit** | 256 MB |
| **DNS Aliases** | `portal.sme-lab.local`, `shop.sme-lab.local` (CNAME) |

**Function:** Simulates a public-facing e-commerce web application. Full OWASP Juice Shop — a deliberately vulnerable Node.js app.

**Open Ports:**

| Port | Protocol | Service |
|---|---|---|
| 3000 | TCP | HTTP (Juice Shop web UI + REST API) |

**Vulnerabilities:**

| CVE / Type | CVSS | Description |
|---|---|---|
| SQL Injection | 9.5 | Login bypass, data extraction via `/rest/user/login` |
| XSS (Reflected/Stored) | 8.2 | Multiple input fields, product search, feedback form |
| BOLA/IDOR | 8.0 | Direct object reference in `/api/BasketItems/`, `/api/Users/` |
| Broken Authentication | 8.0 | Weak JWT secrets, token forgery possible |
| SSRF | 7.5 | Profile image URL parameter fetches internal resources |
| Sensitive Data Exposure | 7.0 | User credentials, card data accessible via API |
| Security Misconfiguration | 6.5 | Debug endpoints, verbose error messages |

---

#### `lab_api_gateway` — Nginx API Gateway

| Field | Value |
|---|---|
| **Image** | `nginx:alpine` |
| **Base OS** | Alpine Linux |
| **Hostname** | `api-gw.sme-lab.local` |
| **IP** | `10.10.10.20` (DMZ) |
| **Host Port** | `8081 → 8081` |
| **Networks** | `dmz`, `lab_network` |
| **CPU Limit** | 0.25 cores |
| **RAM Limit** | 64 MB |
| **Config** | `lab/config/nginx/api_gateway.conf` |

**Function:** Simulates a corporate API gateway. Intentionally misconfigured with information disclosure vulnerabilities.

**Open Ports:**

| Port | Protocol | Service |
|---|---|---|
| 8081 | TCP | HTTP (Nginx, faking Apache/PHP headers) |

**Exposed Endpoints:**

| Path | What It Leaks |
|---|---|
| `GET /` | Fake `Apache/2.2.14`, `PHP/5.3.2`, `X-Debug-Token: dev-abc123` headers; HTML comment revealing `/admin?debug=true` |
| `GET /api/docs` | Full Swagger JSON exposing `/employees` and `/payroll` endpoints |
| `GET /files/` | **Directory listing enabled** — exposes all files under nginx html root |
| `GET /admin` | Returns admin user list with `backup` user's password hint |
| `GET /health` | Leaks internal IPs: `db_host: 10.10.30.10:5432`, `redis: 10.10.30.20:6379` |

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| Information Disclosure (Headers) | 6.5 | Server version spoofing reveals `Apache/2.2.14 (EOL)`, `PHP/5.3.2 (EOL)` |
| Swagger/API Docs Exposure | 6.0 | Unauthenticated access to internal HR API schema |
| Directory Listing | 5.5 | `autoindex on` at `/files/` |
| Internal Network Leak | 5.0 | `/health` endpoint reveals DB and Redis internal IPs |
| HTML Comment Backdoor Hint | 4.5 | `<!-- TODO: Remove admin backdoor at /admin?debug=true -->` |
| Unauthenticated Admin Panel | 7.5 | `/admin` returns user list with credential hints — no auth |

---

#### `lab_dns_server` — CoreDNS *(full-lab profile only)*

| Field | Value |
|---|---|
| **Image** | `coredns/coredns:latest` |
| **Base OS** | Alpine/scratch |
| **Hostname** | `dns.sme-lab.local` |
| **IP** | `10.10.10.30` (DMZ), `10.10.20.30` (CORP) |
| **Host Port** | `15353 → 53/udp`, `15353 → 53/tcp` |
| **User** | `root` (uid=0) |
| **Networks** | `dmz`, `corp`, `lab_network` |

**Function:** Internal DNS for the lab domain `sme-lab.local`. Also forwards external queries to `8.8.8.8`.

**Zone Records (DNS Zone Transfer leaks ALL of these):**

| Record | Type | Value | Issue |
|---|---|---|---|
| `webserver` | A | `10.10.10.10` | — |
| `api-gw` | A | `10.10.10.20` | — |
| `dns` | A | `10.10.10.30` | — |
| `fileserver` | A | `10.10.20.10` | — |
| `mail` | A | `10.10.20.20` | — |
| `workstation` | A | `10.10.20.40` | — |
| `db` | A | `10.10.30.10` | **SHOULD NOT be public** |
| `cache` | A | `10.10.30.20` | **SHOULD NOT be public** |
| `db-backup` | A | `10.10.30.30` | **SHOULD NOT be public** |
| `monitoring` | A | `10.10.40.10` | **CRITICAL — mgmt exposed** |
| `logserver` | A | `10.10.40.20` | **CRITICAL — mgmt exposed** |
| `wazuh-agent` | A | `10.10.40.30` | **CRITICAL — mgmt exposed** |

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| DNS Zone Transfer (AXFR) | 5.0 | `transfer { to * }` allows any host to dump all zone records |
| DNS Amplification | 5.0 | Recursive forwarding enabled on public-facing port |
| Sensitive Internal IPs in DNS | 6.0 | DB, cache, management IPs resolvable externally |
| Running as root | 4.5 | Container runs with `user: "0"` |

---

### 3.2 LAB STACK — Corporate Subnet

---

#### `lab_fileserver` — Samba File Server

| Field | Value |
|---|---|
| **Image** | `dperson/samba:latest` |
| **Base OS** | Debian |
| **Hostname** | `fileserver.sme-lab.local` |
| **IP** | `10.10.20.10` (CORP) |
| **Host Ports** | `4445 → 445` (SMB), `1139 → 139` (NetBIOS) |
| **Networks** | `corp`, `lab_network` |
| **CPU Limit** | 0.5 cores |
| **RAM Limit** | 128 MB |

**Function:** Corporate file server with SMB shares.

**Shares & Credentials:**

| Share | Path | Read | Guest | Write | Users | Sensitive Data |
|---|---|---|---|---|---|---|
| `public` | `/public` | Yes | Yes | No | All | `welcome.txt` |
| `hr_data` | `/hr_data` | No | No | No | `admin`, `hr_backup` | **employees.csv with SSNs & salaries** |
| `it_backups` | `/it_backups` | No | No | No | `admin` | **backup_notes.txt with all credentials** |
| `shared` | `/shared` | Yes | Yes | Yes | All | `meeting_notes.txt` |

**Hardcoded Credentials (in docker-compose):**

| Username | Password | Access |
|---|---|---|
| `admin` | `admin123` | All shares |
| `guest` | `guest` | Public/shared only |
| `hr_backup` | `Password1` | HR data share |

**Critical Data Exposed:**
- `hr_data/employees.csv` — 5 employees with name, email, department, **salary, SSN**
- `it_backups/backup_notes.txt` — lists DB password (`password123`), Redis no-auth, admin portal URL, Wazuh default creds

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| Weak/Default Credentials | 8.0 | `admin:admin123`, `hr_backup:Password1` |
| SMB Share Enumeration | 6.0 | Null session or guest allows share listing |
| Sensitive Data Exposure (PII) | 8.5 | SSNs, salaries in plaintext CSV |
| Credential Store in Share | 9.0 | `it_backups` contains ALL system passwords |
| Writable Guest Share | 5.0 | `shared` share writeable by all |

---

#### `lab_mailserver` — GreenMail SMTP/POP3/IMAP *(full-lab profile only)*

| Field | Value |
|---|---|
| **Image** | `greenmail/standalone:2.0.1` |
| **Hostname** | `mail.sme-lab.local` |
| **IP** | `10.10.20.20` (CORP) |
| **Networks** | `corp`, `lab_network` |

**Open Ports:**

| Host Port | Container Port | Protocol | Service |
|---|---|---|---|
| 3025 | 3025 | TCP | SMTP (plaintext) |
| 3110 | 3110 | TCP | POP3 (plaintext) |
| 3143 | 3143 | TCP | IMAP (plaintext) |
| 8082 | 8080 | TCP | Web admin UI |

**Hardcoded Users:**

| Username | Password |
|---|---|
| `admin` | `admin123` |
| `user` | `password` |
| `hr` | `hr2024` |

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| Plaintext Protocols | 7.0 | SMTP/POP3/IMAP without TLS — credentials sent in clear |
| Weak Credentials | 7.0 | `admin:admin123`, `user:password` |
| User Enumeration | 5.0 | SMTP VRFY/RCPT TO allows user enumeration |

---

#### `lab_workstation` — HR Workstation *(full-lab profile only)*

| Field | Value |
|---|---|
| **Image** | `nginx:alpine` |
| **Hostname** | `ws01.sme-lab.local` |
| **IP** | `10.10.20.40` (CORP) |
| **Host Port** | `8083 → 80` |

**Open Ports:** `80/tcp` (HTTP)

**Leaks on `GET /`:** Employee name (Jane Smith), department (HR), last login, internal UNC path `\\10.10.20.10\shared`

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| Internal Network Topology Leak | 4.0 | Exposes internal IP/share paths to anyone who can reach port 80 |
| CGI Interface Active | 3.5 | `/cgi-bin/` responds — potential Shellshock surface if actual CGI runs |

---

### 3.3 LAB STACK — Data Subnet

---

#### `lab_database` — PostgreSQL 13

| Field | Value |
|---|---|
| **Image** | `postgres:13-alpine` |
| **Base OS** | Alpine Linux |
| **Hostname** | `db.sme-lab.local` |
| **IP** | `10.10.30.10` (DATA) |
| **Host Port** | `5433 → 5432` |
| **Networks** | `data`, `lab_network` |
| **CPU Limit** | 0.25 cores |
| **RAM Limit** | 96 MB |

**Credentials:** `app_user` / `password123` | DB: `sme_production`

**Function:** Production database with intentionally insecure schema and sensitive data.

**Database Schema:**

| Table | Sensitive Columns |
|---|---|
| `employees` | `ssn` (plaintext), `salary`, `password_hash` (MD5) |
| `customers` | `credit_card` (plaintext PAN — PCI violation) |
| `api_keys` | `api_key` (Stripe, SendGrid, AWS, Slack tokens in plaintext) |
| `audit_log` | IP addresses, user actions |

**Misconfiguration in `init.sql`:**
- `listen_addresses = '*'` — accepts connections from all IPs
- SSL not enforced
- User `readonly_user` with password `readonly` has `ALL PRIVILEGES` (not read-only at all)

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| Weak Password | 9.0 | `password123` — brute-forceable |
| No SSL/TLS | 7.5 | All DB traffic in plaintext |
| PII in Plaintext | 9.0 | SSNs, salaries, credit card numbers unencrypted |
| API Keys in Plaintext | 9.5 | AWS, Stripe, Slack tokens stored unencrypted |
| MD5 Password Hashes | 7.0 | Easily crackable with rainbow tables |
| Privilege Escalation | 7.5 | `readonly_user` has `ALL PRIVILEGES` despite name |
| World-listen DB | 7.0 | `listen_addresses='*'` with no host-based auth restrictions |

---

#### `lab_redis_cache` — Redis 6.0

| Field | Value |
|---|---|
| **Image** | `redis:6.0-alpine` |
| **Base OS** | Alpine Linux |
| **Hostname** | `cache.sme-lab.local` |
| **IP** | `10.10.30.20` (DATA) |
| **Host Port** | `6380 → 6380` |
| **Networks** | `data`, `lab_network` |
| **CPU Limit** | 0.10 cores |
| **RAM Limit** | 48 MB |

**Command:** `redis-server --port 6380 --protected-mode no --bind 0.0.0.0`

**Vulnerabilities:**

| Type | CVSS | Description |
|---|---|---|
| No Authentication | 8.5 | No `requirepass` set |
| Protected Mode Disabled | 8.5 | `--protected-mode no` removes last safety check |
| Bind All Interfaces | 7.0 | `--bind 0.0.0.0` — reachable from all container networks |
| Data Exfiltration | 8.0 | Attacker can `KEYS *`, `GET`, dump all cached sessions/tokens |
| CONFIG SET (write to disk) | 8.0 | Can use `CONFIG SET dir` + `CONFIG SET dbfilename` to write files |

---

### 3.4 LAB STACK — Management Subnet

---

#### `lab_traffic_gen` — Traffic Generator

| Field | Value |
|---|---|
| **Build** | `lab/traffic-generator/Dockerfile` |
| **Hostname** | `traffic-gen.sme-lab.local` |
| **IP** | `10.10.40.10` (MGMT) |
| **Networks** | `mgmt`, `dmz`, `corp`, `data` (multi-homed) |
| **RAM Limit** | 80 MB |

**Function:** Generates realistic background HTTP, SMB, DB, and Redis traffic across all lab subnets to simulate real user activity. Logs written to `lab_traffic_logs` volume.

**Target Environment Variables:**

| Var | Value |
|---|---|
| `TARGET_WEBSERVER` | `http://10.10.10.10:3000` |
| `TARGET_API` | `http://10.10.10.20:8081` |
| `TARGET_FILESERVER` | `10.10.20.10` |
| `TARGET_MAIL` | `10.10.20.20` |
| `TARGET_DB` | `10.10.30.10` |
| `TARGET_REDIS` | `10.10.30.20:6380` |
| `TARGET_DNS` | `10.10.10.30` |

> This container is **multi-homed** — it has access to ALL subnets, making it a pivot point if compromised.

---

#### `lab_log_shipper` — Log Shipper *(full-lab profile only)*

| Field | Value |
|---|---|
| **Build** | `lab/log-shipper/Dockerfile` |
| **Hostname** | `log-shipper.sme-lab.local` |
| **IP** | `10.10.40.20` (MGMT) |
| **Networks** | `mgmt`, `lab_network` |

**Function:** Reads traffic logs from the shared `lab_traffic_logs` volume and ships them to Elasticsearch and Wazuh every 10 seconds.

---

### 3.5 DASHBOARD STACK

---

#### `sme_dashboard_backend` — FastAPI Backend

| Field | Value |
|---|---|
| **Build** | `./backend` |
| **Host Port** | `8000 → 8000` |
| **Networks** | `default`, `lab_network` |
| **RAM Limit** | 384 MB |

**Critical:** Mounts `/var/run/docker.sock:ro` — can enumerate and inspect all running containers on the host.

**Environment / Secrets:**

| Variable | Value / Risk |
|---|---|
| `DATABASE_URL` | `postgresql://user:password@db:5432/sme_cyber_db` |
| `REDIS_URL` | `redis://redis:6379/0` |
| `JWT_SECRET` | `dc55bc5d1009c3c64613d9df6e64e98cfa1d1d9e0d113cd9496ac4e252c5843e` (hardcoded in `.env`) |
| `CREDENTIAL_ENCRYPTION_KEY` | `dsroDGKN6HEYLl3SqEIeipPuO2XpXswcXV2ZbTDLWr4=` (hardcoded) |
| `GEMINI_API_KEY` | `your-gemini-key-here` (placeholder — not set) |
| `WAZUH_API_PASSWORD` | `wazuh` (default) |

---

#### `sme_dashboard_celery` — Celery Worker

| Field | Value |
|---|---|
| **User** | `root` |
| **Cap Add** | `NET_RAW`, `NET_ADMIN` |
| **RAM Limit** | 512 MB |

> Runs as root with raw socket capabilities — can perform network scanning and packet capture inside containers.

---

#### `sme_dashboard_db` — PostgreSQL 15

| Field | Value |
|---|---|
| **Image** | `postgres:15-alpine` |
| **Host Port** | `5432 → 5432` |
| **Credentials** | `user` / `password` |
| **DB Name** | `sme_cyber_db` |

---

#### `sme_dashboard_redis` — Redis 7

| Field | Value |
|---|---|
| **Image** | `redis:7-alpine` |
| **Host Port** | `6379 → 6379` |
| **Auth** | None configured |

---

#### `sme_dashboard_caddy` — TLS Reverse Proxy

| Field | Value |
|---|---|
| **Image** | `caddy:2-alpine` |
| **Host Ports** | `80 → 80`, `443 → 443` |

Routes HTTPS to backend and frontend.

---

#### Optional Full-Profile Services

| Container | Image | Host Port | Function |
|---|---|---|---|
| `sme_dashboard_openvas` | `immauss/openvas` | `9392`, `9390` | Vulnerability scanner |
| `sme_dashboard_elastic` | `elasticsearch:8.11.1` | `9200` | Log indexing (security **disabled**) |
| `sme_dashboard_kibana` | `kibana:8.11.1` | `5601` | Log visualization |
| `sme_dashboard_wazuh` | `wazuh-manager:4.7.2` | `1514`, `1515`, `55000` | SIEM/EDR manager |
| `sme_dashboard_n8n` | `n8nio/n8n` | `5678` | SOAR workflow automation |
| `sme_dashboard_beat` | `./backend` | — | Celery scheduled tasks |

**Elasticsearch misconfiguration:** `xpack.security.enabled=false` — no auth, no TLS on the index.

---

## 4. Complete Port Map

### Host-Exposed Ports (Default — LAN accessible)

| Host Port | Container | Service | Protocol |
|---|---|---|---|
| 80 | `sme_dashboard_caddy` | HTTP redirect | TCP |
| 443 | `sme_dashboard_caddy` | HTTPS dashboard | TCP |
| 3000 | `lab_webserver` | Juice Shop (HTTP) | TCP |
| 5432 | `sme_dashboard_db` | PostgreSQL (dashboard) | TCP |
| 5678 | `sme_dashboard_n8n` | n8n SOAR | TCP |
| 6379 | `sme_dashboard_redis` | Redis (no auth) | TCP |
| 8000 | `sme_dashboard_backend` | FastAPI backend | TCP |
| 8081 | `lab_api_gateway` | API Gateway (HTTP) | TCP |
| 8082 | `lab_mailserver` | GreenMail web admin | TCP |
| 8083 | `lab_workstation` | HR Workstation (HTTP) | TCP |
| 1139 | `lab_fileserver` | NetBIOS | TCP |
| 4445 | `lab_fileserver` | SMB | TCP |
| 5433 | `lab_database` | PostgreSQL lab DB | TCP |
| 6380 | `lab_redis_cache` | Redis (no auth) | TCP |
| 9200 | `sme_dashboard_elastic` | Elasticsearch (no auth) | TCP |
| 9390 | `sme_dashboard_openvas` | OpenVAS OMP | TCP |
| 9392 | `sme_dashboard_openvas` | OpenVAS web UI | TCP |
| 5601 | `sme_dashboard_kibana` | Kibana | TCP |
| 15353 | `lab_dns_server` | DNS (UDP+TCP) | UDP/TCP |
| 1514 | `sme_dashboard_wazuh` | Wazuh agent events | TCP |
| 1515 | `sme_dashboard_wazuh` | Wazuh agent enrollment | TCP |
| 55000 | `sme_dashboard_wazuh` | Wazuh REST API | TCP |
| 3025 | `lab_mailserver` | SMTP | TCP |
| 3110 | `lab_mailserver` | POP3 | TCP |
| 3143 | `lab_mailserver` | IMAP | TCP |

### Isolation Override (loopback-only — scanner on host only)

When running with `infra/isolation/docker-compose.lab.isolation.override.yml`, all lab ports are rebound to `127.0.0.1` — unreachable from LAN. Also marks `dmz`, `corp`, `data` networks as `internal: true` (no outbound NAT). Only `mgmt` remains bridged.

---

## 5. Traffic Flow

```
External User / Attacker
         │
         ▼
    [Host :443/80]
         │
    Caddy TLS proxy
         │
   ┌─────┴──────┐
   │            │
backend      frontend
:8000         (static)
   │
   ├── PostgreSQL :5432 (dashboard DB)
   ├── Redis :6379 (task queue)
   ├── Docker socket (read lab state)
   └── lab_network ──► Lab containers (via Celery scanning tasks)

Background Traffic (generated by lab_traffic_gen):
   traffic-gen (10.10.40.10)
         │
         ├──► webserver  10.10.10.10:3000   (HTTP GET/POST)
         ├──► api-gw     10.10.10.20:8081   (HTTP GET)
         ├──► fileserver 10.10.20.10:445    (SMB)
         ├──► mailserver 10.10.20.20:3025   (SMTP)
         ├──► database   10.10.30.10:5432   (PostgreSQL queries)
         └──► redis      10.10.30.20:6380   (Redis GET/SET)

Log Flow:
   traffic-gen → lab_traffic_logs (volume)
   lab_log_shipper reads volume → Elasticsearch :9200
                                → Wazuh manager :1514
```

---

## 6. OS & Software Details

| Container | Base OS | Key Software | Version |
|---|---|---|---|
| `lab_webserver` | Node.js/Debian | OWASP Juice Shop | latest |
| `lab_api_gateway` | Alpine Linux | Nginx | alpine |
| `lab_dns_server` | scratch/Alpine | CoreDNS | latest |
| `lab_fileserver` | Debian | Samba | dperson/samba:latest |
| `lab_mailserver` | JVM/Debian | GreenMail | 2.0.1 |
| `lab_workstation` | Alpine Linux | Nginx | alpine |
| `lab_database` | Alpine Linux | PostgreSQL | **13** (not latest) |
| `lab_redis_cache` | Alpine Linux | Redis | **6.0** (not latest) |
| `sme_dashboard_db` | Alpine Linux | PostgreSQL | 15 |
| `sme_dashboard_redis` | Alpine Linux | Redis | 7 |
| `sme_dashboard_caddy` | Alpine Linux | Caddy | 2 |
| `sme_dashboard_elastic` | RHEL-based | Elasticsearch | 8.11.1 |
| `sme_dashboard_wazuh` | Amazon Linux | Wazuh Manager | 4.7.2 |
| `sme_dashboard_openvas` | Debian | OpenVAS/GVM | immauss/openvas |

---

## 7. Vulnerabilities — Consolidated Summary

### Critical (CVSS 9.0+)

| ID | Location | Type | Detail |
|---|---|---|---|
| V-01 | `lab_database` | PII/PAN in plaintext | SSNs, credit card numbers unencrypted in PostgreSQL |
| V-02 | `lab_database` | API keys in plaintext | AWS, Stripe, Slack tokens in `api_keys` table |
| V-03 | `lab_webserver` | SQLi (OWASP JS) | Full DB dump possible via login endpoint |
| V-04 | `it_backups` share | Credential store | All system passwords in `backup_notes.txt` |

### High (CVSS 7.0–8.9)

| ID | Location | Type | Detail |
|---|---|---|---|
| V-05 | `lab_fileserver` | Weak credentials | `admin:admin123`, `hr_backup:Password1` |
| V-06 | `lab_fileserver` | PII exposure | `employees.csv` with SSNs/salaries on SMB share |
| V-07 | `lab_redis_cache` | No auth | Redis 6.0, `--protected-mode no`, bind all |
| V-08 | `lab_database` | Weak password | `password123`, no SSL, world-listen |
| V-09 | `lab_database` | Priv escalation | `readonly_user` has ALL PRIVILEGES |
| V-10 | `sme_dashboard_backend` | Secrets in `.env` | JWT secret and encryption key hardcoded in repo |
| V-11 | `lab_mailserver` | Plaintext protocols | SMTP/POP3/IMAP without TLS |
| V-12 | `lab_webserver` | BOLA/IDOR | Insecure direct object refs in Juice Shop API |
| V-13 | `celery_worker` | Dangerous caps | Runs as root with `NET_RAW` + `NET_ADMIN` |
| V-14 | `elasticsearch` | No auth | `xpack.security.enabled=false` |

### Medium (CVSS 4.0–6.9)

| ID | Location | Type | Detail |
|---|---|---|---|
| V-15 | `lab_api_gateway` | Info disclosure | Fake EOL server headers (`Apache/2.2.14`, `PHP/5.3.2`) |
| V-16 | `lab_api_gateway` | Swagger exposure | Unauthenticated API schema at `/api/docs` |
| V-17 | `lab_api_gateway` | Dir listing | `autoindex on` at `/files/` |
| V-18 | `lab_api_gateway` | Admin panel no auth | `/admin` returns user list |
| V-19 | `lab_dns_server` | Zone transfer | `transfer { to * }` leaks full internal DNS |
| V-20 | `lab_dns_server` | DNS amplification | Recursive forwarding on public port |
| V-21 | `lab_dns_server` | Internal IP leak | DB, cache, mgmt IPs in public zone |
| V-22 | `lab_workstation` | Network leak | Internal UNC path exposed on HTTP |
| V-23 | `lab_database` | MD5 password hash | Easily crackable password hashes in `employees` table |
| V-24 | `sme_dashboard_redis` | No auth | Dashboard Redis on `:6379` without password |

---

## 8. Attack Surface & Lateral Movement Paths

### Entry Points

1. **Web (Port 3000)** — Juice Shop: SQLi → dump all DB data, SSRF → probe internal IPs
2. **API Gateway (Port 8081)** — `/health` leaks DB/Redis IPs; `/admin` needs no auth; Swagger exposes API schema
3. **SMB (Port 4445)** — guest session → share enumeration → `hr_data` with credentials → `it_backups` with all passwords
4. **Redis (Port 6380)** — unauthenticated → dump all keys → steal sessions/tokens
5. **PostgreSQL (Port 5433)** — `password123` → dump employees, customers, api_keys tables
6. **DNS (Port 15353)** — AXFR zone transfer → map entire internal network

### Lateral Movement Chain

```
1. Port Scan host → find 8081 open
2. GET /health → reveals db:10.10.30.10:5432, redis:10.10.30.20:6379
3. Connect Redis 10.10.30.20:6380 → no auth → dump session tokens
4. Connect PostgreSQL 10.10.30.10:5433 (password123) → dump api_keys table → get AWS/Stripe tokens
5. SMB 4445 guest → enumerate shares → read it_backups/backup_notes.txt → get wazuh:wazuh creds
6. Use Wazuh API (55000) with wazuh:wazuh → access SIEM → disable alerts
7. DNS AXFR → full network map → identify monitoring (10.10.40.10), logserver (10.10.40.20)
8. Attack log shipper → manipulate or blind the SIEM
```

### Privilege Escalation Paths

- `celery_worker` runs as root with `NET_RAW` + `NET_ADMIN` → packet capture on `lab_network`
- `sme_dashboard_backend` has `/var/run/docker.sock` → can `docker exec` into any container
- `readonly_user` in PostgreSQL lab DB has full `ALL PRIVILEGES` → not actually read-only

---

## 9. Sensitive Data Inventory

| Data Type | Location | Format | Risk |
|---|---|---|---|
| Employee SSNs | `lab_database.employees.ssn` | Plaintext | PII breach |
| Employee SSNs | `lab_fileserver/hr_data/employees.csv` | Plaintext CSV | PII breach |
| Employee salaries | Both above | Plaintext | PII breach |
| Credit card PANs | `lab_database.customers.credit_card` | Plaintext | PCI-DSS violation |
| AWS Access Key | `lab_database.api_keys` | Plaintext | Cloud account takeover |
| Stripe API Key | `lab_database.api_keys` | Plaintext | Financial fraud |
| Slack Webhook | `lab_database.api_keys` | Plaintext | Message interception |
| JWT Secret | `.env` file | Hardcoded | Token forgery |
| Encryption Key | `.env` file | Hardcoded | Decrypt stored credentials |
| All system passwords | `it_backups/backup_notes.txt` | Plaintext | Full network compromise |
| Wazuh default creds | `it_backups/backup_notes.txt` + docker-compose | Plaintext | SIEM blind |
| DB password | `docker-compose.lab.yml` + backup notes | Plaintext | DB access |

---

## 10. Isolation Override — Remediation Status

The file `infra/isolation/docker-compose.lab.isolation.override.yml` partially hardens the lab:

| Finding | Status | Fix Applied |
|---|---|---|
| F-01: Networks not `internal` | Partially fixed | `dmz`, `corp`, `data` → `internal: true`; `mgmt` still bridged |
| F-02: Host ports LAN-exposed | Fixed | All lab ports rebound to `127.0.0.1` |
| F-05: DNS resolvable outside | Fixed | Port 15353 → `127.0.0.1:15353` |

**Remaining risks even with isolation override:**
- All intentional application-layer vulnerabilities remain
- Credentials remain weak/default
- `mgmt` network still has outbound internet access
- `lab_network` bridge shared with dashboard stack (not internal)
- Docker socket still mounted in backend container

---

*Generated: 2026-05-14 | Environment: SME Lab — Found404 Graduation Project*
