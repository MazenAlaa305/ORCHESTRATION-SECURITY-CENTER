# Living Lab Architecture Plan — Orchestration Security Center

## Objective

Rebuild the "Living Lab" as an isolated, small-scale virtual environment that realistically simulates a Small-to-Medium Enterprise (SME) network. The lab must generate realistic background traffic, expose intentional vulnerabilities across multiple attack vectors, produce SIEM-compatible telemetry, and integrate seamlessly with the Orchestration Security Center dashboard for centralized security orchestration demonstrations.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — Lab Network Infrastructure](#phase-1--lab-network-infrastructure)
3. [Phase 2 — Vulnerable Services & Attack Vectors](#phase-2--vulnerable-services--attack-vectors)
4. [Phase 3 — Background Traffic & Noise Generation](#phase-3--background-traffic--noise-generation)
5. [Phase 4 — SIEM Telemetry & Event Pipeline](#phase-4--siem-telemetry--event-pipeline)
6. [Phase 5 — Network Isolation & Security Boundaries](#phase-5--network-isolation--security-boundaries)
7. [Phase 6 — Backend Integration (API & Config)](#phase-6--backend-integration-api--config)
8. [Phase 7 — Frontend Integration (Dashboard UI)](#phase-7--frontend-integration-dashboard-ui)
9. [Phase 8 — Orchestration Workflow End-to-End](#phase-8--orchestration-workflow-end-to-end)
10. [Phase 9 — Testing & Validation](#phase-9--testing--validation)
11. [File Change Index](#file-change-index)
12. [Network Diagram](#network-diagram)

---

## 1. Architecture Overview

### Current State

The existing lab (`docker-compose.lab.yml`) has 4 containers across 3 subnets:
- `lab_broken_web` (Juice Shop) — port 3000
- `lab_api_gateway` (Nginx stub) — port 8081
- `lab_misconfig_infra` (Samba) — ports 1139/4445
- `lab_shadow_asset` (Redis) — port 63790

**Problems with current lab:**
- No background traffic (environment is silent, unrealistic)
- No event/log generation (no SIEM telemetry flows to Wazuh/Elasticsearch)
- Limited vulnerability surface (only 4 services, no mail/DNS/database exposure)
- No Wazuh agent instrumentation inside lab containers
- Seed script references containers that don't exist (`lab_juice_shop`, IPs like `172.30.0.x`)
- No dashboard UI to dynamically manage lab connection settings
- No health monitoring of the lab environment from the dashboard

### Target State

A 3-tier SME network simulation with 8 services across 4 subnets, complete with:
- Wazuh agent sidecar generating SIEM events
- Background traffic generator producing realistic HTTP, DNS, SMB, SSH noise
- Log shipper pushing events to Elasticsearch in real-time
- Dashboard UI panel for lab lifecycle management (connect, configure, scan, monitor)
- Full isolation via Docker networks — dashboard connects only through `lab_network` bridge

### Network Topology

```
                    +---------------------------+
                    |   ORCHESTRATION SECURITY CENTER DASHBOARD     |
                    |  (default Docker network) |
                    |                           |
                    |  backend:8000             |
                    |  frontend:5173            |
                    |  db:5432  redis:6379      |
                    |  elasticsearch:9200       |
                    |  wazuh:55000              |
                    +----------+----------------+
                               |
                    lab_network (bridge - single controlled gateway)
                               |
          +--------------------+--------------------+
          |                    |                    |
    +-----+------+    +-------+-------+    +-------+-------+
    | DMZ Subnet |    | CORP Subnet   |    | DATA Subnet   |
    | 10.10.10.0 |    | 10.10.20.0    |    | 10.10.30.0    |
    +-----+------+    +-------+-------+    +-------+-------+
          |                    |                    |
    lab_webserver        lab_fileserver       lab_database
    lab_api_gateway      lab_mailserver       lab_redis_cache
    lab_dns_server       lab_workstation      lab_log_shipper
          |                    |                    |
    +-----+--------------------+--------------------+-------+
    |               MGMT Subnet 10.10.40.0                  |
    |  lab_traffic_gen  |  lab_wazuh_agent  |  lab_attacker  |
    +-------------------------------------------------------|
```

---

## Phase 1 — Lab Network Infrastructure

### Goal
Define the complete Docker Compose topology with 4 isolated subnets and an external bridge to the dashboard stack.

### Step 1.1 — Replace `docker-compose.lab.yml`

**File:** `docker-compose.lab.yml` (full rewrite)

Replace the entire file with the content below. This defines all 8 vulnerable services plus 3 management/utility containers across 4 subnets.

```yaml
# ============================================================
# LIVING LAB - Orchestration Security Center
# SME Network Simulation Environment
# 4 subnets, 11 containers, realistic enterprise topology
# ============================================================

services:

  # ════════════════════════════════════════════════════════════
  # DMZ SUBNET (10.10.10.0/24) — Internet-facing services
  # ════════════════════════════════════════════════════════════

  lab_webserver:
    image: bkimminich/juice-shop:latest
    container_name: lab_webserver
    hostname: webserver.sme-lab.local
    ports:
      - "3000:3000"
    networks:
      dmz:
        ipv4_address: 10.10.10.10
      lab_network:
    labels:
      lab.zone: "dmz"
      lab.persona: "ecommerce-webserver"
      lab.vulns: "sqli,xss,bola,idor,broken-auth,ssrf"
      lab.cvss: "9.5"
      lab.description: "Public-facing e-commerce platform (OWASP Juice Shop). Primary web application attack surface."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  lab_api_gateway:
    image: nginx:alpine
    container_name: lab_api_gateway
    hostname: api-gw.sme-lab.local
    command: >
      sh -c "mkdir -p /etc/nginx/conf.d && cat > /etc/nginx/conf.d/default.conf << 'NGINX'
      server {
          listen 8081;
          server_tokens on;

          # Exposed Swagger / API docs (information disclosure)
          location /api/docs {
              default_type application/json;
              return 200 '{\"swagger\": \"2.0\", \"info\": {\"title\": \"Internal HR API\", \"version\": \"1.0.0\"}, \"basePath\": \"/api/v1\", \"paths\": {\"/employees\": {\"get\": {\"summary\": \"List all employees\"}}, \"/payroll\": {\"get\": {\"summary\": \"Get payroll data\"}}}}';
          }

          # Version leak via headers
          location / {
              default_type text/html;
              add_header Server 'Apache/2.2.14 (Unix)';
              add_header X-Powered-By 'PHP/5.3.2';
              add_header X-AspNet-Version '4.0.30319';
              add_header X-Debug-Token 'dev-abc123';
              return 200 '<html><head><title>SME Corp Portal</title></head><body><h1>Welcome to SME Corp</h1><p>Internal portal v2.1.3-beta</p><!-- TODO: Remove admin backdoor at /admin?debug=true --></body></html>';
          }

          # Directory listing enabled (misconfiguration)
          location /files/ {
              alias /usr/share/nginx/html/;
              autoindex on;
          }

          # Fake admin panel (weak auth)
          location /admin {
              default_type application/json;
              return 200 '{\"admin\": true, \"users\": [{\"username\": \"admin\", \"role\": \"superuser\"}, {\"username\": \"backup\", \"password_hint\": \"company name + 123\"}]}';
          }

          # Health endpoint (allows enumeration)
          location /health {
              default_type application/json;
              return 200 '{\"status\": \"ok\", \"hostname\": \"api-gw-01\", \"uptime\": \"47d 3h\", \"db_host\": \"10.10.30.10:5432\", \"redis\": \"10.10.30.20:6379\"}';
          }
      }
      NGINX
      nginx -g 'daemon off;'"
    ports:
      - "8081:8081"
    networks:
      dmz:
        ipv4_address: 10.10.10.20
      lab_network:
    labels:
      lab.zone: "dmz"
      lab.persona: "api-gateway"
      lab.vulns: "info-disclosure,header-leak,directory-listing,swagger-exposure"
      lab.cvss: "6.0"
      lab.description: "Corporate API gateway with information disclosure, outdated headers, and exposed Swagger docs."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 64M

  lab_dns_server:
    image: coredns/coredns:latest
    container_name: lab_dns_server
    hostname: dns.sme-lab.local
    volumes:
      - ./lab/config/coredns/Corefile:/root/Corefile
      - ./lab/config/coredns/sme-lab.local.zone:/root/sme-lab.local.zone
    command: ["-conf", "/root/Corefile"]
    ports:
      - "5353:53/udp"
      - "5353:53/tcp"
    networks:
      dmz:
        ipv4_address: 10.10.10.30
      corp:
        ipv4_address: 10.10.20.30
      lab_network:
    labels:
      lab.zone: "dmz"
      lab.persona: "dns-server"
      lab.vulns: "dns-zone-transfer,dns-amplification"
      lab.cvss: "5.0"
      lab.description: "DNS server allowing zone transfers and recursive queries (amplification risk)."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 64M

  # ════════════════════════════════════════════════════════════
  # CORPORATE SUBNET (10.10.20.0/24) — Internal office network
  # ════════════════════════════════════════════════════════════

  lab_fileserver:
    image: dperson/samba:latest
    container_name: lab_fileserver
    hostname: fileserver.sme-lab.local
    command: >
      -u "admin;admin123"
      -u "guest;guest"
      -u "hr_backup;Password1"
      -s "public;/public;yes;no;no;all;none;"
      -s "hr_data;/hr_data;no;no;no;admin,hr_backup;none;"
      -s "it_backups;/it_backups;no;no;no;admin;none;"
      -s "shared;/shared;yes;yes;yes;all;none;"
    ports:
      - "4445:445"
      - "1139:139"
    volumes:
      - ./lab/data/samba/public:/public
      - ./lab/data/samba/hr_data:/hr_data
      - ./lab/data/samba/it_backups:/it_backups
      - ./lab/data/samba/shared:/shared
    networks:
      corp:
        ipv4_address: 10.10.20.10
      lab_network:
    labels:
      lab.zone: "corp"
      lab.persona: "corporate-fileserver"
      lab.vulns: "weak-credentials,smb-enum,default-login,sensitive-data-exposure"
      lab.cvss: "8.0"
      lab.description: "Corporate file server with weak credentials (admin/admin123), exposed SMB shares, and sensitive HR data."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  lab_mailserver:
    image: greenmail/standalone:2.0.1
    container_name: lab_mailserver
    hostname: mail.sme-lab.local
    ports:
      - "3025:3025"   # SMTP
      - "3110:3110"   # POP3
      - "3143:3143"   # IMAP
      - "8082:8080"   # Web admin
    environment:
      - GREENMAIL_OPTS=-Dgreenmail.setup.test.all -Dgreenmail.users=admin:admin123,user:password,hr:hr2024
    networks:
      corp:
        ipv4_address: 10.10.20.20
      lab_network:
    labels:
      lab.zone: "corp"
      lab.persona: "mail-server"
      lab.vulns: "weak-credentials,plaintext-protocols,user-enum"
      lab.cvss: "7.0"
      lab.description: "Corporate mail server with plaintext SMTP/POP3/IMAP, weak credentials, and user enumeration."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  lab_workstation:
    image: nginx:alpine
    container_name: lab_workstation
    hostname: ws01.sme-lab.local
    command: >
      sh -c "cat > /etc/nginx/conf.d/default.conf << 'NGINX'
      server {
          listen 80;
          location / {
              default_type text/html;
              return 200 '<html><body><h1>HR Workstation</h1><p>Employee: Jane Smith</p><p>Department: Human Resources</p><p>Last login: 2024-03-15</p><p>Printers: \\\\10.10.20.10\\shared</p></body></html>';
          }
          location /cgi-bin/ {
              default_type text/plain;
              return 200 'CGI interface active';
          }
      }
      NGINX
      nginx -g 'daemon off;'"
    ports:
      - "8083:80"
    networks:
      corp:
        ipv4_address: 10.10.20.40
      lab_network:
    labels:
      lab.zone: "corp"
      lab.persona: "employee-workstation"
      lab.vulns: "info-disclosure,internal-network-leak"
      lab.cvss: "4.0"
      lab.description: "Employee workstation exposing internal network topology and user information."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 64M

  # ════════════════════════════════════════════════════════════
  # DATA SUBNET (10.10.30.0/24) — Database and cache tier
  # ════════════════════════════════════════════════════════════

  lab_database:
    image: postgres:13-alpine
    container_name: lab_database
    hostname: db.sme-lab.local
    environment:
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=password123
      - POSTGRES_DB=sme_production
    ports:
      - "5433:5432"
    volumes:
      - ./lab/config/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    networks:
      data:
        ipv4_address: 10.10.30.10
      lab_network:
    labels:
      lab.zone: "data"
      lab.persona: "production-database"
      lab.vulns: "weak-credentials,default-config,sensitive-data,no-encryption"
      lab.cvss: "9.0"
      lab.description: "Production PostgreSQL with weak password (password123), no SSL, and sensitive employee/financial data."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  lab_redis_cache:
    image: redis:6.0-alpine
    container_name: lab_redis_cache
    hostname: cache.sme-lab.local
    command: redis-server --port 6380 --protected-mode no --bind 0.0.0.0
    ports:
      - "6380:6380"
    networks:
      data:
        ipv4_address: 10.10.30.20
      lab_network:
    labels:
      lab.zone: "data"
      lab.persona: "redis-cache"
      lab.vulns: "no-auth,unauthenticated-access,data-exfiltration"
      lab.cvss: "8.5"
      lab.description: "Redis cache with no authentication and protected-mode disabled. Accessible from all subnets."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

  # ════════════════════════════════════════════════════════════
  # MANAGEMENT SUBNET (10.10.40.0/24) — Monitoring & utilities
  # ════════════════════════════════════════════════════════════

  lab_traffic_gen:
    build:
      context: ./lab/traffic-generator
      dockerfile: Dockerfile
    container_name: lab_traffic_gen
    hostname: traffic-gen.sme-lab.local
    environment:
      - TARGET_WEBSERVER=http://10.10.10.10:3000
      - TARGET_API=http://10.10.10.20:8081
      - TARGET_FILESERVER=10.10.20.10
      - TARGET_MAIL=10.10.20.20
      - TARGET_DB=10.10.30.10
      - TARGET_REDIS=10.10.30.20:6380
      - TARGET_DNS=10.10.10.30
      - TRAFFIC_INTENSITY=medium
      - LOG_OUTPUT=/var/log/traffic/traffic.log
    volumes:
      - lab_traffic_logs:/var/log/traffic
    networks:
      mgmt:
        ipv4_address: 10.10.40.10
      dmz:
      corp:
      data:
    labels:
      lab.zone: "mgmt"
      lab.persona: "traffic-generator"
      lab.description: "Generates realistic background network traffic across all lab subnets."
    restart: unless-stopped
    depends_on:
      - lab_webserver
      - lab_api_gateway
      - lab_fileserver
      - lab_redis_cache
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  lab_log_shipper:
    build:
      context: ./lab/log-shipper
      dockerfile: Dockerfile
    container_name: lab_log_shipper
    hostname: log-shipper.sme-lab.local
    environment:
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - WAZUH_MANAGER=wazuh
      - LOG_SOURCES=/var/log/traffic/traffic.log
      - INDEX_PREFIX=sme-lab
      - SHIP_INTERVAL=10
    volumes:
      - lab_traffic_logs:/var/log/traffic:ro
    networks:
      mgmt:
        ipv4_address: 10.10.40.20
      lab_network:
    labels:
      lab.zone: "mgmt"
      lab.persona: "log-shipper"
      lab.description: "Ships lab events and traffic logs to Elasticsearch and Wazuh for SIEM integration."
    restart: unless-stopped
    depends_on:
      - lab_traffic_gen
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

  lab_wazuh_agent:
    image: wazuh/wazuh-agent:4.7.2
    container_name: lab_wazuh_agent
    hostname: wazuh-agent.sme-lab.local
    environment:
      - WAZUH_MANAGER=wazuh
      - WAZUH_AGENT_GROUP=sme-lab
      - WAZUH_AGENT_NAME=lab-monitor
    volumes:
      - lab_traffic_logs:/var/log/traffic:ro
    networks:
      mgmt:
        ipv4_address: 10.10.40.30
      dmz:
      corp:
      data:
      lab_network:
    labels:
      lab.zone: "mgmt"
      lab.persona: "wazuh-agent"
      lab.description: "Wazuh agent monitoring all lab subnets and forwarding security events to dashboard SIEM."
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

# ════════════════════════════════════════════════════════════
# NETWORK DEFINITIONS
# ════════════════════════════════════════════════════════════

networks:
  dmz:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.10.0/24
          gateway: 10.10.10.1
  corp:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.20.0/24
          gateway: 10.10.20.1
  data:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.30.0/24
          gateway: 10.10.30.1
  mgmt:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.40.0/24
          gateway: 10.10.40.1
  lab_network:
    external: true
    name: the-dashboard-project-_lab_network

# ════════════════════════════════════════════════════════════
# VOLUMES
# ════════════════════════════════════════════════════════════

volumes:
  lab_traffic_logs:
    driver: local
```

### Step 1.2 — Create Lab Directory Structure

Create the following directory tree. Every file referenced below is created in subsequent phases.

```
lab/
├── config/
│   ├── coredns/
│   │   ├── Corefile
│   │   └── sme-lab.local.zone
│   └── postgres/
│       └── init.sql
├── data/
│   └── samba/
│       ├── public/
│       │   └── welcome.txt
│       ├── hr_data/
│       │   └── employees.csv
│       ├── it_backups/
│       │   └── backup_notes.txt
│       └── shared/
│           └── meeting_notes.txt
├── traffic-generator/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── generator.py
└── log-shipper/
    ├── Dockerfile
    ├── requirements.txt
    └── shipper.py
```

**Commands to create the directories:**

```bash
mkdir -p lab/config/coredns
mkdir -p lab/config/postgres
mkdir -p lab/data/samba/public
mkdir -p lab/data/samba/hr_data
mkdir -p lab/data/samba/it_backups
mkdir -p lab/data/samba/shared
mkdir -p lab/traffic-generator
mkdir -p lab/log-shipper
```

---

## Phase 2 — Vulnerable Services & Attack Vectors

### Goal
Configure each lab service with intentional, realistic vulnerabilities that the Orchestration Security Center scanner agents can discover.

### Step 2.1 — DNS Server Configuration (Zone Transfer Vulnerability)

**File:** `lab/config/coredns/Corefile`

```
sme-lab.local:53 {
    file /root/sme-lab.local.zone
    transfer {
        to *
    }
    log
    errors
}

.:53 {
    forward . 8.8.8.8 8.8.4.4
    log
    errors
    cache 30
}
```

**File:** `lab/config/coredns/sme-lab.local.zone`

```
$ORIGIN sme-lab.local.
$TTL 3600

@       IN  SOA   dns.sme-lab.local. admin.sme-lab.local. (
                   2024031501  ; Serial
                   3600        ; Refresh
                   900         ; Retry
                   604800      ; Expire
                   86400       ; Minimum TTL
        )

; Nameserver
@             IN  NS    dns.sme-lab.local.

; DMZ Zone
dns           IN  A     10.10.10.30
webserver     IN  A     10.10.10.10
api-gw        IN  A     10.10.10.20
portal        IN  CNAME webserver.sme-lab.local.
shop          IN  CNAME webserver.sme-lab.local.

; Corporate Zone
fileserver    IN  A     10.10.20.10
mail          IN  A     10.10.20.20
workstation   IN  A     10.10.20.40
printer       IN  A     10.10.20.50
vpn           IN  A     10.10.20.60

; Data Zone (should NOT be in public DNS - intentional leak)
db            IN  A     10.10.30.10
cache         IN  A     10.10.30.20
db-backup     IN  A     10.10.30.30

; Management Zone (should NEVER be in DNS - critical leak)
monitoring    IN  A     10.10.40.10
logserver     IN  A     10.10.40.20
wazuh-agent   IN  A     10.10.40.30

; MX Record
@             IN  MX    10 mail.sme-lab.local.

; TXT Records (information leak)
@             IN  TXT   "v=spf1 include:_spf.sme-lab.local ~all"
_dmarc        IN  TXT   "v=DMARC1; p=none; rua=mailto:admin@sme-lab.local"
```

**Vulnerabilities exposed:**
- DNS zone transfer allowed to any client (AXFR)
- Internal IP addresses leaked via DNS records
- Database and management hosts exposed in public zone
- Recursive DNS enabled (amplification attack vector)

### Step 2.2 — PostgreSQL Database with Sensitive Data

**File:** `lab/config/postgres/init.sql`

```sql
-- SME Production Database - Intentionally Vulnerable
-- Weak password: password123 (set via docker env)
-- No SSL enforcement
-- Sensitive data in plaintext

-- Enable remote connections (intentional misconfiguration)
ALTER SYSTEM SET listen_addresses = '*';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Create application tables with sensitive data
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    ssn VARCHAR(11),              -- PII stored in plaintext (vulnerability)
    salary DECIMAL(10,2),         -- Financial data unencrypted
    department VARCHAR(100),
    hire_date DATE,
    password_hash VARCHAR(255)    -- Weak MD5 hashes
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    credit_card VARCHAR(19),      -- Card numbers in plaintext (PCI violation)
    address TEXT,
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100),
    api_key VARCHAR(255),         -- API keys stored unencrypted
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_name VARCHAR(100),
    action VARCHAR(255),
    ip_address VARCHAR(45),
    details TEXT
);

-- Insert realistic fake data
INSERT INTO employees (first_name, last_name, email, ssn, salary, department, hire_date, password_hash) VALUES
('Jane',   'Smith',    'jane.smith@sme-corp.com',    '123-45-6789', 85000.00, 'Human Resources', '2019-03-15', md5('password123')),
('Bob',    'Johnson',  'bob.johnson@sme-corp.com',   '234-56-7890', 72000.00, 'Engineering',     '2020-07-01', md5('bob2020')),
('Alice',  'Williams', 'alice.w@sme-corp.com',       '345-67-8901', 95000.00, 'Finance',         '2018-11-20', md5('alice!')),
('Carlos', 'Garcia',   'carlos.g@sme-corp.com',      '456-78-9012', 68000.00, 'IT Support',      '2021-01-10', md5('carlos1')),
('Sarah',  'Chen',     'sarah.chen@sme-corp.com',    '567-89-0123', 110000.00,'Engineering',     '2017-06-15', md5('s4r4h'));

INSERT INTO customers (name, email, credit_card, address, phone) VALUES
('Acme Corp',       'billing@acme.com',       '4111-1111-1111-1111', '123 Main St, Springfield', '555-0101'),
('Widget Inc',      'accounts@widget.co',     '5500-0000-0000-0004', '456 Oak Ave, Portland',    '555-0202'),
('TechStart LLC',   'finance@techstart.io',   '3400-0000-0000-009',  '789 Pine Rd, Austin',      '555-0303');

INSERT INTO api_keys (service_name, api_key, is_active) VALUES
('Stripe Payment Gateway',  'fake_payment_api_key_1234567890',  true),
('SendGrid Email',           'SG.xxxxxxxxxxxxxxxxxxxx',           true),
('AWS S3 Access',            'AKIAIOSFODNN7EXAMPLE',              true),
('Slack Webhook',            'xoxb-xxxxx-xxxxx-xxxxx',            false);

INSERT INTO audit_log (user_name, action, ip_address, details) VALUES
('admin',      'LOGIN_SUCCESS',    '10.10.20.40', 'Admin login from HR workstation'),
('admin',      'USER_CREATED',     '10.10.20.40', 'Created user carlos.g'),
('bob.johnson','LOGIN_FAILED',     '192.168.1.50','3 failed attempts'),
('system',     'BACKUP_COMPLETED', '10.10.30.30', 'Full database backup to /it_backups/');

-- Create a user with excessive privileges (vulnerability)
CREATE USER readonly_user WITH PASSWORD 'readonly';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO readonly_user;
```

**Vulnerabilities exposed:**
- Weak database password (`password123`)
- PII stored in plaintext (SSN, credit cards)
- API keys stored unencrypted
- Excessive database user privileges
- No SSL/TLS enforcement
- MD5 password hashes (weak algorithm)

### Step 2.3 — Samba File Server Seed Data

**File:** `lab/data/samba/public/welcome.txt`

```
Welcome to SME Corp File Server
================================
For IT support: it-help@sme-corp.com
VPN Guide: \\fileserver\shared\vpn_setup.pdf
Admin contact: admin@sme-corp.com (password hint: company name + 123)
```

**File:** `lab/data/samba/hr_data/employees.csv`

```csv
ID,Name,Email,Department,Salary,SSN,Start Date
1,Jane Smith,jane.smith@sme-corp.com,HR,85000,123-45-6789,2019-03-15
2,Bob Johnson,bob.johnson@sme-corp.com,Engineering,72000,234-56-7890,2020-07-01
3,Alice Williams,alice.w@sme-corp.com,Finance,95000,345-67-8901,2018-11-20
4,Carlos Garcia,carlos.g@sme-corp.com,IT Support,68000,456-78-9012,2021-01-10
5,Sarah Chen,sarah.chen@sme-corp.com,Engineering,110000,567-89-0123,2017-06-15
```

**File:** `lab/data/samba/it_backups/backup_notes.txt`

```
IT Backup Notes - Q1 2024
==========================
Database backup schedule: Daily at 02:00 UTC
Backup location: \\fileserver\it_backups\db_dumps\
DB credentials: app_user / password123
Redis: No auth configured (port 6380)
Admin portal: http://api-gw:8081/admin (no auth required)
Wazuh: wazuh/wazuh (default credentials)
```

**File:** `lab/data/samba/shared/meeting_notes.txt`

```
Q1 Security Review Meeting Notes
=================================
Date: 2024-03-01
Attendees: IT Team

Action Items:
- [ ] Change default passwords on all services (OVERDUE)
- [ ] Enable SSL on PostgreSQL connections
- [ ] Restrict Redis access to application subnet only
- [ ] Disable zone transfers on DNS server
- [ ] Remove API debug headers from production gateway

NOTE: Delayed until Q3 due to budget constraints.
```

### Step 2.4 — Vulnerability Matrix

| Service | Container | Port(s) | Vulnerabilities | CVSS | Zone |
|---------|-----------|---------|-----------------|------|------|
| Juice Shop (Web App) | `lab_webserver` | 3000 | SQLi, XSS, BOLA, IDOR, Broken Auth, SSRF | 9.5 | DMZ |
| API Gateway (Nginx) | `lab_api_gateway` | 8081 | Info Disclosure, Header Leak, Directory Listing, Swagger Exposure | 6.0 | DMZ |
| DNS Server (CoreDNS) | `lab_dns_server` | 5353 | Zone Transfer, DNS Amplification, Internal IP Leak | 5.0 | DMZ |
| File Server (Samba) | `lab_fileserver` | 4445, 1139 | Weak Credentials, SMB Enum, Sensitive Data | 8.0 | Corp |
| Mail Server (GreenMail) | `lab_mailserver` | 3025, 3110, 3143, 8082 | Weak Credentials, Plaintext Protocols, User Enum | 7.0 | Corp |
| Workstation (Nginx) | `lab_workstation` | 8083 | Info Disclosure, Internal Network Leak | 4.0 | Corp |
| PostgreSQL Database | `lab_database` | 5433 | Weak Password, PII in Plaintext, No SSL | 9.0 | Data |
| Redis Cache | `lab_redis_cache` | 6380 | No Authentication, Data Exfiltration | 8.5 | Data |

**Total unique vulnerability classes: 18+**

---

## Phase 3 — Background Traffic & Noise Generation

### Goal
Create a Python-based traffic generator that produces realistic, continuous background noise across all lab subnets to simulate a live SME network.

### Step 3.1 — Traffic Generator Dockerfile

**File:** `lab/traffic-generator/Dockerfile`

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    dnsutils \
    smbclient \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY generator.py .

RUN mkdir -p /var/log/traffic

CMD ["python", "-u", "generator.py"]
```

**File:** `lab/traffic-generator/requirements.txt`

```
httpx==0.27.0
redis==5.0.0
psycopg2-binary==2.9.9
schedule==1.2.1
faker==22.0.0
```

### Step 3.2 — Traffic Generator Script

**File:** `lab/traffic-generator/generator.py`

```python
"""
Living Lab Traffic Generator — Orchestration Security Center
Generates realistic background network traffic across all lab subnets.
Produces structured JSON log lines for the log shipper to consume.

Traffic profiles:
  - HTTP browsing (web app, API gateway, workstation)
  - DNS lookups (internal and external domains)
  - SMB file access (file server)
  - SMTP/IMAP email activity (mail server)
  - Database queries (PostgreSQL)
  - Redis cache operations (Redis)
  - Periodic suspicious activity (brute-force attempts, port probes)
"""

import os
import sys
import json
import time
import random
import logging
import subprocess
import socket
from datetime import datetime, timezone
from threading import Thread

import httpx
import redis
import psycopg2
from faker import Faker

# ── Configuration ──────────────────────────────────────────────────────────────

TARGETS = {
    "webserver":  os.environ.get("TARGET_WEBSERVER", "http://10.10.10.10:3000"),
    "api":        os.environ.get("TARGET_API", "http://10.10.10.20:8081"),
    "fileserver": os.environ.get("TARGET_FILESERVER", "10.10.20.10"),
    "mail":       os.environ.get("TARGET_MAIL", "10.10.20.20"),
    "db":         os.environ.get("TARGET_DB", "10.10.30.10"),
    "redis":      os.environ.get("TARGET_REDIS", "10.10.30.20:6380"),
    "dns":        os.environ.get("TARGET_DNS", "10.10.10.30"),
}

INTENSITY = os.environ.get("TRAFFIC_INTENSITY", "medium")  # low, medium, high
LOG_FILE = os.environ.get("LOG_OUTPUT", "/var/log/traffic/traffic.log")

INTERVALS = {
    "low":    {"http": 30, "dns": 45, "smb": 60, "db": 40, "redis": 20, "mail": 120, "suspicious": 300},
    "medium": {"http": 10, "dns": 15, "smb": 30, "db": 20, "redis": 10, "mail": 60,  "suspicious": 120},
    "high":   {"http": 3,  "dns": 5,  "smb": 10, "db": 8,  "redis": 5,  "mail": 30,  "suspicious": 60},
}

fake = Faker()
logger = logging.getLogger("traffic-gen")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")


# ── Structured Log Emitter ─────────────────────────────────────────────────────

def emit_event(category: str, action: str, source_ip: str, dest_ip: str,
               dest_port: int, protocol: str, status: str, details: dict = None):
    """Write a structured JSON event to the log file and stdout."""
    event = {
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "event_category": category,
        "event_action": action,
        "source_ip": source_ip,
        "destination_ip": dest_ip,
        "destination_port": dest_port,
        "protocol": protocol,
        "status": status,
        "severity": _severity_for(category, status),
        "details": details or {},
        "lab_zone": _zone_for_ip(dest_ip),
        "generator": "osc-traffic-gen"
    }

    line = json.dumps(event)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass
    print(line, flush=True)


def _severity_for(category: str, status: str) -> str:
    if status == "failure" and category == "authentication":
        return "high"
    if category == "suspicious":
        return "high"
    if status == "failure":
        return "medium"
    return "low"


def _zone_for_ip(ip: str) -> str:
    if ip.startswith("10.10.10"):
        return "dmz"
    if ip.startswith("10.10.20"):
        return "corp"
    if ip.startswith("10.10.30"):
        return "data"
    if ip.startswith("10.10.40"):
        return "mgmt"
    return "unknown"


# ── Traffic Generators ─────────────────────────────────────────────────────────

def gen_http_traffic():
    """Simulate employee browsing the web app and API gateway."""
    interval = INTERVALS[INTENSITY]["http"]
    client = httpx.Client(timeout=5.0, follow_redirects=True)
    source_ip = f"10.10.20.{random.randint(40, 60)}"

    web_paths = ["/", "/search", "/rest/products", "/api/Feedbacks",
                 "/rest/user/login", "/rest/basket/1", "/api/Cards",
                 "/#/search?q=test", "/#/login", "/#/register"]
    api_paths = ["/", "/health", "/api/docs", "/files/", "/admin"]

    while True:
        try:
            # Web app traffic
            path = random.choice(web_paths)
            url = f"{TARGETS['webserver']}{path}"
            resp = client.get(url)
            emit_event("web", "http_request", source_ip, "10.10.10.10",
                       3000, "HTTP", "success" if resp.status_code < 400 else "failure",
                       {"method": "GET", "path": path, "status_code": resp.status_code,
                        "user_agent": fake.user_agent()})
        except Exception as e:
            emit_event("web", "http_request", source_ip, "10.10.10.10",
                       3000, "HTTP", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))

        try:
            # API gateway traffic
            path = random.choice(api_paths)
            url = f"{TARGETS['api']}{path}"
            resp = client.get(url)
            emit_event("web", "http_request", source_ip, "10.10.10.20",
                       8081, "HTTP", "success" if resp.status_code < 400 else "failure",
                       {"method": "GET", "path": path, "status_code": resp.status_code})
        except Exception as e:
            emit_event("web", "http_request", source_ip, "10.10.10.20",
                       8081, "HTTP", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_dns_traffic():
    """Simulate DNS lookups for internal and external domains."""
    interval = INTERVALS[INTENSITY]["dns"]
    internal_domains = [
        "webserver.sme-lab.local", "api-gw.sme-lab.local", "mail.sme-lab.local",
        "fileserver.sme-lab.local", "db.sme-lab.local", "cache.sme-lab.local",
        "monitoring.sme-lab.local"
    ]
    external_domains = [
        "google.com", "office365.com", "slack.com", "github.com",
        "zoom.us", "salesforce.com", "aws.amazon.com"
    ]

    while True:
        domain = random.choice(internal_domains + external_domains)
        try:
            result = subprocess.run(
                ["dig", f"@{TARGETS['dns']}", domain, "+short", "+time=2"],
                capture_output=True, text=True, timeout=5
            )
            status = "success" if result.returncode == 0 else "failure"
            resolved = result.stdout.strip() or "NXDOMAIN"
            emit_event("dns", "lookup", "10.10.40.10", "10.10.10.30",
                       53, "DNS", status,
                       {"query": domain, "result": resolved, "query_type": "A"})
        except Exception as e:
            emit_event("dns", "lookup", "10.10.40.10", "10.10.10.30",
                       53, "DNS", "error", {"query": domain, "error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_smb_traffic():
    """Simulate file server access attempts."""
    interval = INTERVALS[INTENSITY]["smb"]
    shares = ["public", "shared", "hr_data", "it_backups"]
    users = [
        ("admin", "admin123", True),
        ("guest", "guest", True),
        ("hr_backup", "Password1", True),
        ("unknown_user", "wrongpassword", False),
        ("admin", "wrongpassword", False),
    ]

    while True:
        share = random.choice(shares)
        user, password, should_succeed = random.choice(users)
        try:
            result = subprocess.run(
                ["smbclient", f"//{TARGETS['fileserver']}/{share}",
                 "-U", f"{user}%{password}", "-c", "ls", "--port=445"],
                capture_output=True, text=True, timeout=10
            )
            succeeded = result.returncode == 0
            status = "success" if succeeded else "failure"
            category = "file_access" if succeeded else "authentication"
            emit_event(category, "smb_access", "10.10.20.40", "10.10.20.10",
                       445, "SMB", status,
                       {"share": share, "user": user,
                        "expected": should_succeed, "output": result.stdout[:200]})
        except Exception as e:
            emit_event("file_access", "smb_access", "10.10.20.40", "10.10.20.10",
                       445, "SMB", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_db_traffic():
    """Simulate database queries and occasional failed login attempts."""
    interval = INTERVALS[INTENSITY]["db"]
    queries = [
        "SELECT COUNT(*) FROM employees;",
        "SELECT first_name, last_name FROM employees WHERE department = 'Engineering';",
        "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10;",
        "SELECT name, email FROM customers LIMIT 5;",
        "INSERT INTO audit_log (user_name, action, ip_address) VALUES ('app', 'HEALTH_CHECK', '10.10.20.40');",
    ]

    while True:
        # Occasionally try wrong credentials (simulating brute force)
        if random.random() < 0.15:
            try:
                conn = psycopg2.connect(
                    host=TARGETS["db"], port=5432, dbname="sme_production",
                    user="admin", password=fake.password(), connect_timeout=3
                )
                conn.close()
            except Exception:
                emit_event("authentication", "db_login", "10.10.20.40", "10.10.30.10",
                           5432, "PostgreSQL", "failure",
                           {"user": "admin", "reason": "invalid_credentials"})
            time.sleep(random.uniform(interval * 0.5, interval * 1.5))
            continue

        try:
            conn = psycopg2.connect(
                host=TARGETS["db"], port=5432, dbname="sme_production",
                user="app_user", password="password123", connect_timeout=5
            )
            cur = conn.cursor()
            query = random.choice(queries)
            cur.execute(query)
            if query.strip().upper().startswith("SELECT"):
                rows = cur.fetchall()
                row_count = len(rows)
            else:
                row_count = cur.rowcount
                conn.commit()
            cur.close()
            conn.close()
            emit_event("database", "query", "10.10.20.40", "10.10.30.10",
                       5432, "PostgreSQL", "success",
                       {"query_type": query.split()[0], "rows": row_count})
        except Exception as e:
            emit_event("database", "query", "10.10.20.40", "10.10.30.10",
                       5432, "PostgreSQL", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_redis_traffic():
    """Simulate Redis cache operations."""
    interval = INTERVALS[INTENSITY]["redis"]
    redis_host, redis_port = TARGETS["redis"].split(":")
    keys = ["session:user1", "session:user2", "cache:products", "cache:homepage",
            "rate_limit:api", "queue:emails", "temp:upload_xyz"]

    while True:
        try:
            r = redis.Redis(host=redis_host, port=int(redis_port), socket_timeout=3)
            op = random.choice(["get", "set", "keys", "info"])
            if op == "get":
                key = random.choice(keys)
                r.get(key)
                emit_event("cache", "redis_get", "10.10.10.10", "10.10.30.20",
                           6380, "Redis", "success", {"key": key})
            elif op == "set":
                key = random.choice(keys)
                r.set(key, fake.text(max_nb_chars=50), ex=3600)
                emit_event("cache", "redis_set", "10.10.10.10", "10.10.30.20",
                           6380, "Redis", "success", {"key": key})
            elif op == "keys":
                result = r.keys("*")
                emit_event("cache", "redis_keys", "10.10.10.10", "10.10.30.20",
                           6380, "Redis", "success", {"key_count": len(result)})
            elif op == "info":
                r.info()
                emit_event("cache", "redis_info", "10.10.10.10", "10.10.30.20",
                           6380, "Redis", "success", {"command": "INFO"})
            r.close()
        except Exception as e:
            emit_event("cache", "redis_operation", "10.10.10.10", "10.10.30.20",
                       6380, "Redis", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_mail_traffic():
    """Simulate email-related activity (SMTP connection attempts)."""
    interval = INTERVALS[INTENSITY]["mail"]

    while True:
        try:
            sock = socket.create_connection((TARGETS["mail"], 3025), timeout=5)
            banner = sock.recv(1024).decode("utf-8", errors="ignore")
            sock.send(b"EHLO sme-corp.com\r\n")
            response = sock.recv(1024).decode("utf-8", errors="ignore")
            sock.close()
            emit_event("email", "smtp_connect", "10.10.20.40", "10.10.20.20",
                       3025, "SMTP", "success",
                       {"banner": banner[:100], "ehlo_response": response[:200]})
        except Exception as e:
            emit_event("email", "smtp_connect", "10.10.20.40", "10.10.20.20",
                       3025, "SMTP", "error", {"error": str(e)[:200]})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


def gen_suspicious_traffic():
    """
    Periodically generate suspicious activity:
    - Port scanning probes
    - Brute-force login bursts
    - Unusual data queries
    """
    interval = INTERVALS[INTENSITY]["suspicious"]

    while True:
        attack_type = random.choice(["port_scan", "brute_force", "data_exfil"])

        if attack_type == "port_scan":
            target_ip = random.choice(["10.10.10.10", "10.10.20.10", "10.10.30.10"])
            ports = random.sample(range(1, 1024), k=random.randint(5, 20))
            for port in ports:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(1)
                    result = sock.connect_ex((target_ip, port))
                    status = "open" if result == 0 else "closed"
                    sock.close()
                except Exception:
                    status = "error"
                emit_event("suspicious", "port_scan", "10.10.40.10", target_ip,
                           port, "TCP", status,
                           {"scan_type": "syn_probe", "port_count": len(ports)})
                time.sleep(0.1)

        elif attack_type == "brute_force":
            target = random.choice(["db", "smb"])
            for _ in range(random.randint(5, 15)):
                user = random.choice(["admin", "root", "sa", "postgres", "backup"])
                emit_event("suspicious", "brute_force_attempt",
                           "10.10.40.10",
                           "10.10.30.10" if target == "db" else "10.10.20.10",
                           5432 if target == "db" else 445,
                           "PostgreSQL" if target == "db" else "SMB",
                           "failure",
                           {"user": user, "password": "***", "attempt_burst": True})
                time.sleep(0.5)

        elif attack_type == "data_exfil":
            emit_event("suspicious", "bulk_data_query", "10.10.20.40", "10.10.30.10",
                       5432, "PostgreSQL", "success",
                       {"query": "SELECT * FROM employees",
                        "rows_returned": random.randint(100, 5000),
                        "data_volume_kb": random.randint(500, 10000)})

        time.sleep(random.uniform(interval * 0.5, interval * 1.5))


# ── Main Entry Point ──────────────────────────────────────────────────────────

def main():
    logger.info(f"Starting traffic generator | Intensity: {INTENSITY}")
    logger.info(f"Targets: {json.dumps(TARGETS, indent=2)}")

    # Wait for services to be ready
    logger.info("Waiting 15 seconds for lab services to initialize...")
    time.sleep(15)

    threads = [
        Thread(target=gen_http_traffic, name="http-traffic", daemon=True),
        Thread(target=gen_dns_traffic, name="dns-traffic", daemon=True),
        Thread(target=gen_smb_traffic, name="smb-traffic", daemon=True),
        Thread(target=gen_db_traffic, name="db-traffic", daemon=True),
        Thread(target=gen_redis_traffic, name="redis-traffic", daemon=True),
        Thread(target=gen_mail_traffic, name="mail-traffic", daemon=True),
        Thread(target=gen_suspicious_traffic, name="suspicious-traffic", daemon=True),
    ]

    for t in threads:
        logger.info(f"Starting thread: {t.name}")
        t.start()

    # Keep main thread alive
    try:
        while True:
            time.sleep(60)
            logger.info(f"Traffic generator running | Threads active: {sum(1 for t in threads if t.is_alive())}/{len(threads)}")
    except KeyboardInterrupt:
        logger.info("Shutting down traffic generator")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

---

## Phase 4 — SIEM Telemetry & Event Pipeline

### Goal
Build a log shipper that reads traffic generator events and pushes them to Elasticsearch (and optionally Wazuh) in SIEM-compatible formats, so the dashboard's SIEM panel displays real lab telemetry.

### Step 4.1 — Log Shipper Dockerfile

**File:** `lab/log-shipper/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shipper.py .

CMD ["python", "-u", "shipper.py"]
```

**File:** `lab/log-shipper/requirements.txt`

```
httpx==0.27.0
```

### Step 4.2 — Log Shipper Script

**File:** `lab/log-shipper/shipper.py`

```python
"""
Living Lab Log Shipper — Orchestration Security Center
Reads structured JSON events from the traffic generator's log file and
ships them to Elasticsearch in Wazuh-compatible format.

The shipper:
1. Tail-follows the traffic log file
2. Transforms each event into ECS (Elastic Common Schema) + Wazuh-compatible format
3. Bulk-indexes events into Elasticsearch every SHIP_INTERVAL seconds
4. Creates proper index templates for dashboard SIEM queries
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict

import httpx

# ── Configuration ──────────────────────────────────────────────────────────────

ES_URL = os.environ.get("ELASTICSEARCH_URL", "http://elasticsearch:9200")
LOG_FILE = os.environ.get("LOG_SOURCES", "/var/log/traffic/traffic.log")
INDEX_PREFIX = os.environ.get("INDEX_PREFIX", "sme-lab")
SHIP_INTERVAL = int(os.environ.get("SHIP_INTERVAL", "10"))

logger = logging.getLogger("log-shipper")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")


# ── Index Template ─────────────────────────────────────────────────────────────

INDEX_TEMPLATE = {
    "index_patterns": [f"{INDEX_PREFIX}-events-*"],
    "template": {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "index.lifecycle.name": "sme-lab-policy"
        },
        "mappings": {
            "properties": {
                "@timestamp":       {"type": "date"},
                "event_category":   {"type": "keyword"},
                "event_action":     {"type": "keyword"},
                "source_ip":        {"type": "ip"},
                "destination_ip":   {"type": "ip"},
                "destination_port": {"type": "integer"},
                "protocol":         {"type": "keyword"},
                "status":           {"type": "keyword"},
                "severity":         {"type": "keyword"},
                "lab_zone":         {"type": "keyword"},
                "generator":        {"type": "keyword"},
                "details":          {"type": "object", "enabled": True},
                "rule": {
                    "properties": {
                        "id":          {"type": "keyword"},
                        "level":       {"type": "integer"},
                        "description": {"type": "text"},
                        "groups":      {"type": "keyword"}
                    }
                },
                "agent": {
                    "properties": {
                        "id":   {"type": "keyword"},
                        "name": {"type": "keyword"},
                        "ip":   {"type": "ip"}
                    }
                }
            }
        }
    }
}

# Wazuh-compatible alert index template
WAZUH_TEMPLATE = {
    "index_patterns": ["wazuh-alerts-*"],
    "template": {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "@timestamp":   {"type": "date"},
                "rule":         {"properties": {
                    "id":          {"type": "keyword"},
                    "level":       {"type": "integer"},
                    "description": {"type": "text"},
                    "groups":      {"type": "keyword"}
                }},
                "agent":        {"properties": {
                    "id":   {"type": "keyword"},
                    "name": {"type": "keyword"},
                    "ip":   {"type": "ip"}
                }},
                "data":         {"type": "object", "enabled": True},
                "location":     {"type": "keyword"},
                "full_log":     {"type": "text"}
            }
        }
    }
}

# ── Wazuh Rule Mapping ────────────────────────────────────────────────────────

WAZUH_RULES = {
    ("authentication", "failure"):  {"id": "5710", "level": 5,  "description": "Authentication failure",            "groups": ["authentication_failure"]},
    ("suspicious", "port_scan"):    {"id": "510",  "level": 6,  "description": "Port scan detected",                "groups": ["recon", "network_scan"]},
    ("suspicious", "brute_force"):  {"id": "5712", "level": 10, "description": "Brute force attack detected",       "groups": ["authentication_failure", "brute_force"]},
    ("suspicious", "data_exfil"):   {"id": "9001", "level": 12, "description": "Possible data exfiltration",        "groups": ["data_loss", "suspicious_activity"]},
    ("web", "failure"):             {"id": "31101","level": 5,  "description": "Web application error",             "groups": ["web", "accesslog"]},
    ("database", "error"):          {"id": "50100","level": 7,  "description": "Database connection error",          "groups": ["database", "service_availability"]},
    ("cache", "error"):             {"id": "50200","level": 7,  "description": "Cache service error",                "groups": ["cache", "service_availability"]},
    ("email", "error"):             {"id": "3601", "level": 4,  "description": "SMTP connection failure",            "groups": ["smtp", "email"]},
    ("dns", "failure"):             {"id": "12100","level": 3,  "description": "DNS query failure",                  "groups": ["dns", "network"]},
    ("file_access", "success"):     {"id": "18100","level": 2,  "description": "File share accessed",                "groups": ["smb", "file_integrity"]},
}


def to_wazuh_alert(event: Dict) -> Dict:
    """Transform a traffic generator event into a Wazuh-compatible alert document."""
    category = event.get("event_category", "")
    status = event.get("status", "")
    action = event.get("event_action", "")

    # Find matching rule
    rule = WAZUH_RULES.get((category, status))
    if not rule:
        rule = WAZUH_RULES.get((category, action))
    if not rule:
        rule = {"id": "99999", "level": 1, "description": f"Lab event: {category}/{action}", "groups": ["sme-lab"]}

    return {
        "@timestamp": event.get("@timestamp", datetime.now(timezone.utc).isoformat()),
        "rule": rule,
        "agent": {
            "id": "100",
            "name": "lab-monitor",
            "ip": "10.10.40.30"
        },
        "data": {
            "srcip": event.get("source_ip", ""),
            "dstip": event.get("destination_ip", ""),
            "dstport": str(event.get("destination_port", "")),
            "protocol": event.get("protocol", ""),
            "lab_zone": event.get("lab_zone", ""),
            **event.get("details", {})
        },
        "location": f"lab/{event.get('lab_zone', 'unknown')}/{event.get('event_category', 'unknown')}",
        "full_log": json.dumps(event)
    }


def to_ecs_event(event: Dict) -> Dict:
    """Transform a traffic generator event into ECS-compatible format."""
    return {
        "@timestamp": event.get("@timestamp", datetime.now(timezone.utc).isoformat()),
        "event": {
            "category": event.get("event_category"),
            "action": event.get("event_action"),
            "outcome": event.get("status"),
        },
        "source": {"ip": event.get("source_ip")},
        "destination": {
            "ip": event.get("destination_ip"),
            "port": event.get("destination_port"),
        },
        "network": {"protocol": event.get("protocol", "").lower()},
        "rule": to_wazuh_alert(event).get("rule"),
        "agent": {"id": "100", "name": "lab-monitor", "type": "traffic-gen"},
        "severity": event.get("severity"),
        "lab_zone": event.get("lab_zone"),
        "details": event.get("details", {}),
    }


# ── Elasticsearch Operations ──────────────────────────────────────────────────

def wait_for_es(client: httpx.Client, max_retries: int = 30):
    """Wait until Elasticsearch is available."""
    for i in range(max_retries):
        try:
            resp = client.get(f"{ES_URL}/_cluster/health")
            if resp.status_code == 200:
                logger.info(f"Elasticsearch is ready (status: {resp.json().get('status')})")
                return True
        except Exception:
            pass
        logger.info(f"Waiting for Elasticsearch... ({i+1}/{max_retries})")
        time.sleep(5)
    logger.error("Elasticsearch not available after max retries")
    return False


def setup_templates(client: httpx.Client):
    """Create index templates in Elasticsearch."""
    for name, template in [("sme-lab-events", INDEX_TEMPLATE), ("wazuh-alerts", WAZUH_TEMPLATE)]:
        try:
            resp = client.put(
                f"{ES_URL}/_index_template/{name}",
                json=template,
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code in (200, 201):
                logger.info(f"Index template '{name}' created/updated")
            else:
                logger.warning(f"Template '{name}' response: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Failed to create template '{name}': {e}")


def bulk_index(client: httpx.Client, events: List[Dict]):
    """Bulk-index events into Elasticsearch."""
    if not events:
        return

    today = datetime.now(timezone.utc).strftime("%Y.%m.%d")
    lines = []

    for event in events:
        # Index as both ECS event and Wazuh alert
        ecs_doc = to_ecs_event(event)
        wazuh_doc = to_wazuh_alert(event)

        # ECS event index
        lines.append(json.dumps({"index": {"_index": f"{INDEX_PREFIX}-events-{today}"}}))
        lines.append(json.dumps(ecs_doc))

        # Wazuh-compatible alert index (only for non-trivial events)
        severity = event.get("severity", "low")
        if severity in ("medium", "high"):
            lines.append(json.dumps({"index": {"_index": f"wazuh-alerts-4.x-{today}"}}))
            lines.append(json.dumps(wazuh_doc))

    body = "\n".join(lines) + "\n"

    try:
        resp = client.post(
            f"{ES_URL}/_bulk",
            content=body,
            headers={"Content-Type": "application/x-ndjson"}
        )
        if resp.status_code == 200:
            result = resp.json()
            errors = result.get("errors", False)
            items = result.get("items", [])
            logger.info(f"Bulk indexed {len(items)} docs | Errors: {errors}")
        else:
            logger.error(f"Bulk index failed: {resp.status_code} {resp.text[:300]}")
    except Exception as e:
        logger.error(f"Bulk index error: {e}")


# ── Main Loop ─────────────────────────────────────────────────────────────────

def tail_and_ship():
    """Tail the traffic log file and ship events to Elasticsearch in batches."""
    client = httpx.Client(timeout=30.0)

    # Wait for ES
    if not wait_for_es(client):
        logger.error("Exiting: Elasticsearch not available")
        sys.exit(1)

    # Setup templates
    setup_templates(client)

    # Wait for log file to appear
    while not os.path.exists(LOG_FILE):
        logger.info(f"Waiting for log file: {LOG_FILE}")
        time.sleep(5)

    logger.info(f"Tailing log file: {LOG_FILE}")

    buffer: List[Dict] = []
    last_ship = time.time()

    with open(LOG_FILE, "r") as f:
        # Start from end of file
        f.seek(0, 2)

        while True:
            line = f.readline()
            if line:
                line = line.strip()
                if line:
                    try:
                        event = json.loads(line)
                        buffer.append(event)
                    except json.JSONDecodeError:
                        pass

            # Ship batch if interval elapsed or buffer is large
            now = time.time()
            if (now - last_ship >= SHIP_INTERVAL) or len(buffer) >= 50:
                if buffer:
                    bulk_index(client, buffer)
                    buffer = []
                last_ship = now

            if not line:
                time.sleep(1)


if __name__ == "__main__":
    tail_and_ship()
```

---

## Phase 5 — Network Isolation & Security Boundaries

### Goal
Ensure the lab is fully isolated from the dashboard application except through the controlled `lab_network` bridge.

### Step 5.1 — Isolation Architecture

The isolation model uses Docker networks:

```
Dashboard Stack (docker-compose.yml)     Lab Stack (docker-compose.lab.yml)
┌─────────────────────────────┐          ┌──────────────────────────────┐
│  "default" network          │          │  "dmz" network (10.10.10/24) │
│  backend, frontend, db,     │          │  "corp" network (10.10.20/24)│
│  redis, celery, openvas,    │          │  "data" network (10.10.30/24)│
│  elasticsearch, wazuh, n8n  │          │  "mgmt" network (10.10.40/24)│
│                             │          │                              │
│  Connected to lab_network:  │          │  Connected to lab_network:   │
│  - backend ✓                │          │  - all 8 target services ✓   │
│  - celery_worker ✓          │          │  - lab_log_shipper ✓         │
│  - openvas ✓                │          │  - lab_wazuh_agent ✓         │
│  - elasticsearch ✓          │          │                              │
│  - wazuh ✓                  │          │  NOT connected to lab_network│
│                             │          │  - lab_traffic_gen ✗ (mgmt)  │
│  NOT connected to lab:      │          │                              │
│  - frontend ✗               │          │                              │
│  - db ✗                     │          │                              │
└─────────────────────────────┘          └──────────────────────────────┘
              │                                      │
              └──────── lab_network (bridge) ─────────┘
                    External Docker Network
                    Created before either stack starts
```

**Key isolation rules:**
1. The dashboard **frontend** NEVER connects to the lab directly — all data flows through the backend API
2. The dashboard **database** (PostgreSQL) is on a separate network from the lab database
3. The lab **traffic generator** stays in the `mgmt` subnet — it cannot be scanned by the dashboard
4. The lab **log shipper** and **Wazuh agent** connect to `lab_network` to push telemetry to the dashboard's Elasticsearch/Wazuh but do NOT expose any ports on the host
5. Lab services expose ports on the host ONLY for direct browser-based verification during development; the dashboard backend reaches them via the `lab_network` Docker DNS

### Step 5.2 — Network Creation Script Update

The external network must be created before either stack starts. Update the lab setup script to handle this.

No changes needed to `docker-compose.yml` — it already has:
```yaml
networks:
  lab_network:
    external: true
    name: the-dashboard-project-_lab_network
```

And backend/celery/openvas/elasticsearch/wazuh are already connected to `lab_network`.

---

## Phase 6 — Backend Integration (API & Config)

### Goal
Add backend configuration, API endpoints, and services to let the dashboard dynamically manage, connect to, and scan the lab environment.

### Step 6.1 — Add Lab Configuration Settings

**File to modify:** `backend/app/core/config.py`

Add the following fields to the `Settings` class:

```python
# Living Lab
LAB_ENABLED: bool = True
LAB_COMPOSE_FILE: str = "docker-compose.lab.yml"
LAB_NETWORK_NAME: str = "the-dashboard-project-_lab_network"
LAB_DNS_SUFFIX: str = "sme-lab.local"
LAB_TRAFFIC_INTENSITY: str = "medium"  # low, medium, high
LAB_ELASTICSEARCH_INDEX: str = "sme-lab-events-*"
LAB_WAZUH_ALERT_INDEX: str = "wazuh-alerts-*"
```

### Step 6.2 — Create Lab Management Service

**File to create:** `backend/app/services/lab_manager.py`

This service manages the lab lifecycle and provides health/status information.

```python
"""
Living Lab Manager Service — Orchestration Security Center
Manages the lab environment lifecycle and provides status information.
"""

import logging
import subprocess
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timezone

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Lab Container Registry ─────────────────────────────────────────────────────

LAB_TARGETS = [
    {
        "container": "lab_webserver",
        "name": "E-Commerce Web Server",
        "hostname": "lab_webserver",
        "zone": "dmz",
        "port": 3000,
        "protocol": "http",
        "url": "http://lab_webserver:3000",
        "vulns": ["sqli", "xss", "bola", "idor", "broken-auth", "ssrf"],
        "cvss": 9.5,
        "description": "OWASP Juice Shop — intentionally vulnerable web application",
    },
    {
        "container": "lab_api_gateway",
        "name": "Corporate API Gateway",
        "hostname": "lab_api_gateway",
        "zone": "dmz",
        "port": 8081,
        "protocol": "http",
        "url": "http://lab_api_gateway:8081",
        "vulns": ["info-disclosure", "header-leak", "directory-listing", "swagger-exposure"],
        "cvss": 6.0,
        "description": "API gateway with information disclosure vulnerabilities",
    },
    {
        "container": "lab_dns_server",
        "name": "DNS Server",
        "hostname": "lab_dns_server",
        "zone": "dmz",
        "port": 53,
        "protocol": "dns",
        "url": "dns://lab_dns_server:53",
        "vulns": ["dns-zone-transfer", "dns-amplification"],
        "cvss": 5.0,
        "description": "CoreDNS server allowing zone transfers",
    },
    {
        "container": "lab_fileserver",
        "name": "Corporate File Server",
        "hostname": "lab_fileserver",
        "zone": "corp",
        "port": 445,
        "protocol": "smb",
        "url": "smb://lab_fileserver:445",
        "vulns": ["weak-credentials", "smb-enum", "sensitive-data-exposure"],
        "cvss": 8.0,
        "description": "Samba file server with weak credentials and exposed shares",
    },
    {
        "container": "lab_mailserver",
        "name": "Corporate Mail Server",
        "hostname": "lab_mailserver",
        "zone": "corp",
        "port": 3025,
        "protocol": "smtp",
        "url": "smtp://lab_mailserver:3025",
        "vulns": ["weak-credentials", "plaintext-protocols", "user-enum"],
        "cvss": 7.0,
        "description": "GreenMail server with plaintext protocols and weak credentials",
    },
    {
        "container": "lab_workstation",
        "name": "HR Workstation",
        "hostname": "lab_workstation",
        "zone": "corp",
        "port": 80,
        "protocol": "http",
        "url": "http://lab_workstation:80",
        "vulns": ["info-disclosure", "internal-network-leak"],
        "cvss": 4.0,
        "description": "Employee workstation leaking internal network information",
    },
    {
        "container": "lab_database",
        "name": "Production Database",
        "hostname": "lab_database",
        "zone": "data",
        "port": 5432,
        "protocol": "postgresql",
        "url": "postgresql://lab_database:5432",
        "vulns": ["weak-credentials", "pii-plaintext", "no-encryption"],
        "cvss": 9.0,
        "description": "PostgreSQL with weak password and sensitive data in plaintext",
    },
    {
        "container": "lab_redis_cache",
        "name": "Redis Cache",
        "hostname": "lab_redis_cache",
        "zone": "data",
        "port": 6380,
        "protocol": "redis",
        "url": "redis://lab_redis_cache:6380",
        "vulns": ["no-auth", "unauthenticated-access", "data-exfiltration"],
        "cvss": 8.5,
        "description": "Redis with no authentication and protected-mode disabled",
    },
]


class LabManager:
    """Manages the Living Lab environment lifecycle."""

    async def get_status(self) -> Dict:
        """Get the current status of all lab containers."""
        containers = []
        for target in LAB_TARGETS:
            status = await self._check_container(target["container"])
            containers.append({
                **target,
                "status": status,
            })

        running = sum(1 for c in containers if c["status"] == "running")
        total = len(containers)

        return {
            "lab_enabled": settings.LAB_ENABLED,
            "overall_status": "healthy" if running == total else ("degraded" if running > 0 else "offline"),
            "running": running,
            "total": total,
            "containers": containers,
            "network": settings.LAB_NETWORK_NAME,
            "traffic_intensity": settings.LAB_TRAFFIC_INTENSITY,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    async def _check_container(self, container_name: str) -> str:
        """Check if a Docker container is running."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "inspect", "--format", "{{.State.Status}}", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            return stdout.decode().strip() if proc.returncode == 0 else "not_found"
        except Exception:
            return "unknown"

    async def get_telemetry_stats(self) -> Dict:
        """Fetch telemetry stats from Elasticsearch for the lab indices."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            stats = {"events": 0, "alerts": 0, "indices": []}
            try:
                # Lab events count
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_ELASTICSEARCH_INDEX}/_count",
                    json={"query": {"match_all": {}}},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    stats["events"] = resp.json().get("count", 0)
            except Exception:
                pass

            try:
                # Wazuh alerts count
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_WAZUH_ALERT_INDEX}/_count",
                    json={"query": {"match_all": {}}},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    stats["alerts"] = resp.json().get("count", 0)
            except Exception:
                pass

            return stats

    async def seed_targets(self, db_session) -> List[Dict]:
        """Register all lab targets in the dashboard database."""
        from app.models.scan import Target
        from sqlalchemy import select

        seeded = []
        for lab_target in LAB_TARGETS:
            # Only seed HTTP-based targets (scannable by the orchestrator)
            if lab_target["protocol"] not in ("http", "https"):
                continue

            # Check if already exists
            result = await db_session.execute(
                select(Target).filter(Target.base_url == lab_target["url"])
            )
            existing = result.scalars().first()
            if existing:
                seeded.append({"name": lab_target["name"], "status": "exists", "id": existing.id})
                continue

            target = Target(
                name=f"[Lab] {lab_target['name']}",
                base_url=lab_target["url"],
                source="lab",
                auth_method="none",
            )
            db_session.add(target)
            await db_session.flush()
            seeded.append({"name": lab_target["name"], "status": "created", "id": target.id})

        await db_session.commit()
        return seeded

    async def get_event_feed(self, limit: int = 50) -> List[Dict]:
        """Fetch recent lab events from Elasticsearch."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.post(
                    f"{settings.ELASTICSEARCH_URL}/{settings.LAB_ELASTICSEARCH_INDEX}/_search",
                    json={
                        "size": limit,
                        "sort": [{"@timestamp": {"order": "desc"}}],
                        "query": {"match_all": {}}
                    },
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    hits = resp.json().get("hits", {}).get("hits", [])
                    return [hit.get("_source", {}) for hit in hits]
            except Exception as e:
                logger.error(f"Failed to fetch lab events: {e}")
            return []


lab_manager = LabManager()
```

### Step 6.3 — Create Lab API Endpoints

**File to create:** `backend/app/api/v1/endpoints/lab.py`

```python
"""
Living Lab API Endpoints — Orchestration Security Center
Manage, monitor, and interact with the SME simulation lab.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_async_db
from app.services.lab_manager import lab_manager

router = APIRouter()


@router.get("/status")
async def get_lab_status():
    """
    Get the current status of the Living Lab environment.
    Returns container states, network info, and telemetry stats.
    """
    status = await lab_manager.get_status()
    telemetry = await lab_manager.get_telemetry_stats()
    return {**status, "telemetry": telemetry}


@router.post("/seed")
async def seed_lab_targets(db: AsyncSession = Depends(get_async_db)):
    """
    Register all lab targets in the dashboard database.
    Only seeds HTTP-based targets that the scanner can reach.
    Idempotent — skips targets that already exist.
    """
    result = await lab_manager.seed_targets(db)
    return {"seeded": result, "count": len(result)}


@router.get("/events")
async def get_lab_events(limit: int = 50, category: Optional[str] = None):
    """
    Fetch recent lab events from Elasticsearch.
    Optionally filter by event category (web, dns, database, suspicious, etc.).
    """
    events = await lab_manager.get_event_feed(limit=limit)
    if category:
        events = [e for e in events if e.get("event", {}).get("category") == category]
    return {"events": events, "count": len(events)}


@router.get("/targets")
async def get_lab_targets():
    """
    List all lab targets with their vulnerability profiles.
    Used by the frontend to display the lab network map.
    """
    from app.services.lab_manager import LAB_TARGETS
    return {"targets": LAB_TARGETS}


@router.get("/telemetry")
async def get_lab_telemetry():
    """
    Get aggregated telemetry statistics from the lab.
    """
    return await lab_manager.get_telemetry_stats()
```

### Step 6.4 — Register Lab Router in Main App

**File to modify:** `backend/app/main.py`

Add the following import and router registration alongside the existing route registrations:

```python
from app.api.v1.endpoints import lab as lab_endpoints

# Add with other router includes:
app.include_router(lab_endpoints.router, prefix="/api/v1/lab", tags=["lab"])
```

### Step 6.5 — Updated Seed Script

**File to modify:** `lab_setup.ps1`

Update the `Invoke-SeedTargets` function to use the new `/api/v1/lab/seed` endpoint instead of manually POSTing individual targets. Replace the `$targets` array and foreach loop inside the function with:

```powershell
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
```

Also update the `Show-Status` function's `$containers` array to include all 8 targets plus 3 management containers:

```powershell
function Show-Status {
    Write-Header "Lab Container Status"

    $containers = @(
        @{ Name="lab_webserver";     Zone="DMZ";  Role="E-Commerce Web App (Juice Shop)";   URL="http://localhost:3000" },
        @{ Name="lab_api_gateway";   Zone="DMZ";  Role="Corporate API Gateway";              URL="http://localhost:8081" },
        @{ Name="lab_dns_server";    Zone="DMZ";  Role="DNS Server (CoreDNS)";               URL="udp://localhost:5353" },
        @{ Name="lab_fileserver";    Zone="CORP"; Role="File Server (Samba)";                 URL="smb://localhost:4445" },
        @{ Name="lab_mailserver";    Zone="CORP"; Role="Mail Server (GreenMail)";             URL="http://localhost:8082" },
        @{ Name="lab_workstation";   Zone="CORP"; Role="HR Workstation";                      URL="http://localhost:8083" },
        @{ Name="lab_database";      Zone="DATA"; Role="PostgreSQL Database";                 URL="postgresql://localhost:5433" },
        @{ Name="lab_redis_cache";   Zone="DATA"; Role="Redis Cache (no auth)";               URL="redis://localhost:6380" },
        @{ Name="lab_traffic_gen";   Zone="MGMT"; Role="Traffic Generator";                   URL="(internal)" },
        @{ Name="lab_log_shipper";   Zone="MGMT"; Role="Log Shipper → Elasticsearch";        URL="(internal)" },
        @{ Name="lab_wazuh_agent";   Zone="MGMT"; Role="Wazuh Agent";                        URL="(internal)" }
    )

    foreach ($c in $containers) {
        $state = docker inspect --format '{{.State.Status}}' $c.Name 2>&1
        if ($state -eq "running") {
            Write-Ok "[$($c.Zone)] $($c.Name) - $($c.Role)"
        } elseif ($LASTEXITCODE -ne 0 -or $state -match "No such") {
            Write-Err "[$($c.Zone)] $($c.Name) - NOT FOUND"
        } else {
            Write-Info "[$($c.Zone)] $($c.Name) - State: $state"
        }
    }
}
```

---

## Phase 7 — Frontend Integration (Dashboard UI)

### Goal
Add a "Lab Environment" panel to the dashboard that lets users view lab status, configure the connection, monitor telemetry, and launch scans against lab targets.

### Step 7.1 — Add Lab API Service

**File to modify:** `frontend/src/services/api.js`

Add the following service object alongside the existing services:

```javascript
export const labService = {
    // Get lab environment status (containers, network, telemetry)
    getStatus: () => api.get('/lab/status'),

    // Seed lab targets into dashboard database
    seedTargets: () => api.post('/lab/seed'),

    // Get recent lab events from Elasticsearch
    getEvents: (limit = 50, category = null) =>
        api.get('/lab/events', { params: { limit, category } }),

    // Get lab target definitions (vulnerability profiles)
    getTargets: () => api.get('/lab/targets'),

    // Get telemetry stats
    getTelemetry: () => api.get('/lab/telemetry'),
};
```

### Step 7.2 — Create Lab Environment Panel Component

**File to create:** `frontend/src/components/dashboard/LabEnvironment.jsx`

This is the main Lab panel shown in the dashboard. It contains 4 sub-sections:
1. **Lab Status** — container health, network status
2. **Network Map** — visual representation of the 4 subnets and 8 targets
3. **Event Feed** — live telemetry from the lab (SIEM events)
4. **Scan Launcher** — quick-scan buttons for each lab target

```jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService, pentesterService } from '../../services/api';
import {
    Server, Activity, Shield, Wifi, Database,
    Mail, Globe, HardDrive, AlertTriangle, Play,
    RefreshCw, CheckCircle, XCircle, Loader,
} from 'lucide-react';

// ── Zone Colors ──────────────────────────────────────────────────────────────
const ZONE_COLORS = {
    dmz:  { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    label: 'DMZ' },
    corp: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'CORP' },
    data: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: 'DATA' },
    mgmt: { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'MGMT' },
};

const PROTOCOL_ICONS = {
    http: Globe, https: Globe, smtp: Mail, smb: HardDrive,
    dns: Wifi, postgresql: Database, redis: Database,
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const config = {
        running:   { icon: CheckCircle, color: 'text-green-400', label: 'Running' },
        not_found: { icon: XCircle,     color: 'text-red-400',   label: 'Offline' },
        unknown:   { icon: AlertTriangle, color: 'text-yellow-400', label: 'Unknown' },
    };
    const { icon: Icon, color, label } = config[status] || config.unknown;
    return (
        <span className={`flex items-center gap-1 text-xs ${color}`}>
            <Icon size={12} /> {label}
        </span>
    );
};

// ── Lab Status Header ────────────────────────────────────────────────────────
const LabStatusHeader = ({ status, onRefresh, isRefreshing }) => {
    if (!status) return null;
    const statusColor = {
        healthy:  'text-green-400',
        degraded: 'text-yellow-400',
        offline:  'text-red-400',
    };
    return (
        <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Server className="text-cyan-400" size={20} />
                    <h3 className="text-white font-semibold">Living Lab Environment</h3>
                    <span className={`text-sm font-mono ${statusColor[status.overall_status] || 'text-gray-400'}`}>
                        {status.overall_status?.toUpperCase()}
                    </span>
                </div>
                <button onClick={onRefresh} disabled={isRefreshing}
                    className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50">
                    <RefreshCw size={16} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{status.running}/{status.total}</div>
                    <div className="text-gray-500">Containers</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{status.telemetry?.events || 0}</div>
                    <div className="text-gray-500">Events</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{status.telemetry?.alerts || 0}</div>
                    <div className="text-gray-500">Alerts</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{status.traffic_intensity || 'N/A'}</div>
                    <div className="text-gray-500">Traffic</div>
                </div>
            </div>
        </div>
    );
};

// ── Target Card ──────────────────────────────────────────────────────────────
const TargetCard = ({ target, onScan, isScanning }) => {
    const zone = ZONE_COLORS[target.zone] || ZONE_COLORS.dmz;
    const Icon = PROTOCOL_ICONS[target.protocol] || Server;

    return (
        <div className={`${zone.bg} ${zone.border} border rounded-lg p-3`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={zone.text} />
                    <span className="text-white text-sm font-medium">{target.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={target.status} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${zone.bg} ${zone.text} border ${zone.border}`}>
                        {zone.label}
                    </span>
                </div>
            </div>
            <p className="text-gray-500 text-xs mb-2">{target.description}</p>
            <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                    {(target.vulns || []).slice(0, 3).map((v, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                            {v}
                        </span>
                    ))}
                    {(target.vulns || []).length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-gray-500">
                            +{target.vulns.length - 3}
                        </span>
                    )}
                </div>
                {target.protocol === 'http' && target.status === 'running' && (
                    <button onClick={() => onScan(target)} disabled={isScanning}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50">
                        {isScanning ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                        Scan
                    </button>
                )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600">
                <span>Port: {target.port}</span>
                <span>CVSS: {target.cvss}</span>
                <span>{target.hostname}</span>
            </div>
        </div>
    );
};

// ── Event Feed ───────────────────────────────────────────────────────────────
const EventFeed = ({ events }) => {
    if (!events || events.length === 0) {
        return (
            <div className="glass-card p-4 text-center text-gray-500 text-sm">
                No lab events yet. Start the lab and wait for telemetry.
            </div>
        );
    }

    const severityColor = {
        low: 'text-green-400', medium: 'text-yellow-400', high: 'text-red-400',
    };

    return (
        <div className="glass-card p-4 max-h-[300px] overflow-y-auto">
            <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" /> Live Event Feed
            </h4>
            <div className="space-y-1">
                {events.slice(0, 30).map((evt, i) => {
                    const e = evt.event || evt;
                    const sev = e.severity || evt.severity || 'low';
                    return (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                            <span className={`w-1.5 h-1.5 rounded-full ${severityColor[sev] || 'text-gray-400'} bg-current`} />
                            <span className="text-gray-500 font-mono w-[140px] shrink-0">
                                {(evt['@timestamp'] || '').slice(11, 19)}
                            </span>
                            <span className="text-gray-400 w-[80px] shrink-0">{e.category || evt.event_category || ''}</span>
                            <span className="text-gray-300 truncate">{e.action || evt.event_action || ''}</span>
                            <span className={`ml-auto ${e.outcome === 'success' || evt.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {e.outcome || evt.status || ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────
const LabEnvironment = () => {
    const queryClient = useQueryClient();
    const [scanningTarget, setScanningTarget] = useState(null);

    // Fetch lab status
    const { data: statusData, isLoading: statusLoading, refetch: refetchStatus, isRefetching } = useQuery({
        queryKey: ['lab-status'],
        queryFn: () => labService.getStatus().then(r => r.data),
        refetchInterval: 30000,
    });

    // Fetch lab events
    const { data: eventsData } = useQuery({
        queryKey: ['lab-events'],
        queryFn: () => labService.getEvents(30).then(r => r.data),
        refetchInterval: 15000,
    });

    // Seed mutation
    const seedMutation = useMutation({
        mutationFn: () => labService.seedTargets(),
        onSuccess: () => {
            queryClient.invalidateQueries(['lab-status']);
        },
    });

    // Scan mutation
    const scanMutation = useMutation({
        mutationFn: (target) => pentesterService.startAIScanByUrl(target.url),
        onSuccess: () => {
            setScanningTarget(null);
            queryClient.invalidateQueries(['scans']);
        },
        onError: () => {
            setScanningTarget(null);
        },
    });

    const handleScan = (target) => {
        setScanningTarget(target.container);
        scanMutation.mutate(target);
    };

    if (statusLoading) {
        return (
            <div className="glass-card flex items-center justify-center min-h-[200px]">
                <div className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
            </div>
        );
    }

    const containers = statusData?.containers || [];

    // Group by zone
    const zones = {};
    containers.forEach(c => {
        if (!zones[c.zone]) zones[c.zone] = [];
        zones[c.zone].push(c);
    });

    return (
        <div className="space-y-4">
            {/* Status Header */}
            <LabStatusHeader status={statusData} onRefresh={refetchStatus} isRefreshing={isRefetching} />

            {/* Actions Bar */}
            <div className="flex gap-2">
                <button onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                    <Database size={14} />
                    {seedMutation.isPending ? 'Seeding...' : 'Seed Targets'}
                </button>
            </div>

            {/* Network Map — Targets by Zone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(ZONE_COLORS).map(([zoneKey, zoneStyle]) => {
                    const zoneTargets = zones[zoneKey] || [];
                    if (zoneTargets.length === 0) return null;
                    return (
                        <div key={zoneKey}>
                            <h4 className={`text-sm font-semibold mb-2 ${zoneStyle.text}`}>
                                <Shield size={14} className="inline mr-1" />
                                {zoneStyle.label} Zone ({zoneTargets.length} services)
                            </h4>
                            <div className="space-y-2">
                                {zoneTargets.map(target => (
                                    <TargetCard
                                        key={target.container}
                                        target={target}
                                        onScan={handleScan}
                                        isScanning={scanningTarget === target.container}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Event Feed */}
            <EventFeed events={eventsData?.events} />
        </div>
    );
};

export default LabEnvironment;
```

### Step 7.3 — Register Lab Panel in Dashboard Page

**File to modify:** `frontend/src/pages/Dashboard.jsx`

Add a lazy import for the LabEnvironment component at the top of the file, alongside the other lazy imports:

```javascript
const LabEnvironment = lazy(() => import('../components/dashboard/LabEnvironment'));
```

Add a new tab to the `MAIN_TABS` array (or as a sub-tab under the "Config" or "Ops" tab):

```javascript
// Option A: Add as a new main tab
{ id: 'lab', label: 'Lab', icon: <Network /> },

// Option B: Add as a sub-tab under 'operations'
// In the sub-tab definitions for 'operations', add: 'lab'
```

Then render the component in the appropriate tab content section:

```jsx
{/* Inside the tab content rendering switch/conditional */}
{activeSubTab === 'lab' && (
    <Suspense fallback={<PanelLoader />}>
        <LabEnvironment />
    </Suspense>
)}
```

---

## Phase 8 — Orchestration Workflow End-to-End

### Goal
Define the complete workflow for using the Living Lab as a demonstration environment for the dashboard's security orchestration capabilities.

### Step 8.1 — Startup Sequence

The complete startup order:

```
1. docker network create the-dashboard-project-_lab_network
2. docker compose up -d                         ← Main dashboard stack
3. docker compose -f docker-compose.lab.yml up -d  ← Lab environment
4. Wait 30 seconds for all services to initialize
5. POST /api/v1/lab/seed                         ← Register lab targets
```

### Step 8.2 — Scan Workflow

Once lab targets are seeded, the dashboard can orchestrate scans:

```
Dashboard UI                     Backend API                    Lab Environment
    │                                │                               │
    ├─ Click "Scan" on lab target ──►│                               │
    │                                ├─ POST /scans/ai ──────────────►│
    │                                │   (target_url = lab_webserver) │
    │                                │                               │
    │                                ├─ AgentOrchestrator starts ────►│
    │                                │                               │
    │                                │   ReconAgent                  │
    │                                │     ├── Nmap scan ────────────►│ (port scan)
    │                                │     └── Playwright crawl ─────►│ (web crawl)
    │                                │                               │
    │                                │   AttackAgent                 │
    │                                │     ├── SQLi payloads ────────►│
    │                                │     ├── XSS payloads ─────────►│
    │                                │     └── BOLA tests ───────────►│
    │                                │                               │
    │ ◄── WebSocket SCAN_PROGRESS ──│                               │
    │ ◄── WebSocket LOG_STREAM ─────│                               │
    │                                │                               │
    │                                │   ValidationAgent             │
    │                                │     └── Confidence filtering   │
    │                                │                               │
    │                                │   UnifiedRiskEngine           │
    │                                │     └── Score calculation      │
    │                                │                               │
    │                                │   ReportingAgent              │
    │                                │     └── PDF/Markdown report    │
    │                                │                               │
    │ ◄── WebSocket RISK_UPDATE ────│                               │
    │                                │                               │
    ├─ Dashboard updates KPIs       │                               │
    ├─ Vuln panel shows findings    │                               │
    └─ Report available for export  │                               │
```

### Step 8.3 — Telemetry Flow

While scans run, the lab continuously generates telemetry:

```
Lab Services                     Traffic Generator              Log Shipper
    │                                │                               │
    ├── Respond to requests ────────►│                               │
    │                                ├── Generate traffic events     │
    │                                ├── Write JSON to log file      │
    │                                │                               │
    │                                │              /var/log/traffic/traffic.log
    │                                │                               │
    │                                │                    ┌──────────┤
    │                                │                    │ Tail     │
    │                                │                    │ Parse    │
    │                                │                    │ Transform│
    │                                │                    └──────────┤
    │                                │                               │
    │                                │          Elasticsearch        │
    │                                │         ┌─────────────────────┤
    │                                │         │ sme-lab-events-*    │
    │                                │         │ wazuh-alerts-4.x-*  │
    │                                │         └─────────────────────┤
    │                                │                               │
    │                                │              Dashboard        │
    │                                │         ┌─────────────────────┤
    │                                │         │ SIEM panel queries   │
    │                                │         │ GET /api/v1/siem/   │
    │                                │         │ GET /api/v1/lab/    │
    │                                │         └─────────────────────┘
```

### Step 8.4 — Full Demonstration Script

A recommended demo sequence to showcase the dashboard's capabilities:

```
1. SETUP (5 min)
   - Show empty dashboard → explain the platform
   - Start lab: docker compose -f docker-compose.lab.yml up -d
   - Show lab status panel → all containers green

2. DISCOVERY (2 min)
   - Click "Seed Targets" in lab panel
   - Show targets appear in Targets Manager
   - Explain auto-discovery of lab services

3. SCANNING (10 min)
   - Click "Scan" on Juice Shop target
   - Watch OrchestrationFeed in real-time:
     - ReconAgent discovering ports, endpoints
     - AttackAgent testing payloads
     - Findings appearing in Vuln panel
   - Show Risk Heatmap updating live
   - Show StatCards KPIs changing

4. ANALYSIS (5 min)
   - Switch to Vulnerabilities panel
   - Drill into a SQLi finding → show evidence, PoC, remediation
   - Show confidence scores from ValidationAgent
   - Demonstrate false positive marking

5. TELEMETRY (3 min)
   - Switch to Lab panel → Event Feed
   - Show background traffic events
   - Switch to SIEM panel → show Wazuh alerts
   - Explain correlation between scan events and SIEM alerts

6. REPORTING (3 min)
   - Generate PDF report
   - Show executive summary, risk scores, action items
   - Demonstrate the "Map of Truth"
```

---

## Phase 9 — Testing & Validation

### Goal
Verify every component of the Living Lab works end-to-end.

### Step 9.1 — Infrastructure Tests

Run these checks after `docker compose -f docker-compose.lab.yml up -d`:

```bash
# 1. All containers running
docker compose -f docker-compose.lab.yml ps

# 2. Network connectivity (from backend container)
docker exec sme_dashboard_backend ping -c 1 lab_webserver
docker exec sme_dashboard_backend ping -c 1 lab_api_gateway
docker exec sme_dashboard_backend ping -c 1 lab_fileserver
docker exec sme_dashboard_backend ping -c 1 lab_database
docker exec sme_dashboard_backend ping -c 1 lab_redis_cache

# 3. Service-level checks
curl http://localhost:3000                    # Juice Shop
curl http://localhost:8081/health             # API Gateway
curl http://localhost:8083                    # Workstation
docker exec lab_redis_cache redis-cli -p 6380 ping   # Redis

# 4. DNS zone transfer test
dig @localhost -p 5353 sme-lab.local AXFR

# 5. SMB share enumeration
smbclient -L //localhost -p 4445 -U guest%guest

# 6. PostgreSQL connection test
psql -h localhost -p 5433 -U app_user -d sme_production -c "SELECT COUNT(*) FROM employees;"
```

### Step 9.2 — Telemetry Pipeline Tests

```bash
# 1. Check traffic generator is producing events
docker logs lab_traffic_gen --tail 20

# 2. Check log shipper is indexing
docker logs lab_log_shipper --tail 20

# 3. Verify Elasticsearch indices exist
curl http://localhost:9200/_cat/indices?v | grep sme-lab

# 4. Query lab events
curl -s http://localhost:9200/sme-lab-events-*/_count | python -m json.tool

# 5. Query Wazuh alerts from lab
curl -s http://localhost:9200/wazuh-alerts-*/_count | python -m json.tool
```

### Step 9.3 — API Integration Tests

```bash
# 1. Lab status endpoint
curl -s http://localhost:8000/api/v1/lab/status | python -m json.tool

# 2. Seed targets
curl -s -X POST http://localhost:8000/api/v1/lab/seed | python -m json.tool

# 3. List seeded targets
curl -s http://localhost:8000/api/v1/targets/ | python -m json.tool

# 4. Lab events
curl -s http://localhost:8000/api/v1/lab/events?limit=5 | python -m json.tool

# 5. SIEM alerts (should include lab telemetry)
curl -s http://localhost:8000/api/v1/siem/alerts?size=5 | python -m json.tool

# 6. Trigger AI scan against lab target
curl -s -X POST http://localhost:8000/api/v1/scans/ai \
  -H "Content-Type: application/json" \
  -d '{"target_url": "http://lab_webserver:3000", "scan_type": "full"}'
```

### Step 9.4 — Frontend Validation Checklist

- [ ] Lab panel loads without errors
- [ ] All 8 target containers show correct status (green/red)
- [ ] Telemetry counters display non-zero values after traffic gen starts
- [ ] "Seed Targets" button works and shows confirmation
- [ ] "Scan" button on HTTP targets triggers AI scan
- [ ] OrchestrationFeed shows live agent logs during scan
- [ ] VulnTrend and RiskHeatmap update after scan completes
- [ ] Event Feed shows streaming lab events
- [ ] SIEM panel shows Wazuh-compatible alerts from the lab

---

## File Change Index

### New Files to Create

| File | Type | Phase |
|------|------|-------|
| `docker-compose.lab.yml` | Docker Compose (full rewrite) | 1 |
| `lab/config/coredns/Corefile` | Config | 2 |
| `lab/config/coredns/sme-lab.local.zone` | DNS Zone | 2 |
| `lab/config/postgres/init.sql` | SQL Init | 2 |
| `lab/data/samba/public/welcome.txt` | Seed Data | 2 |
| `lab/data/samba/hr_data/employees.csv` | Seed Data | 2 |
| `lab/data/samba/it_backups/backup_notes.txt` | Seed Data | 2 |
| `lab/data/samba/shared/meeting_notes.txt` | Seed Data | 2 |
| `lab/traffic-generator/Dockerfile` | Docker | 3 |
| `lab/traffic-generator/requirements.txt` | Python Deps | 3 |
| `lab/traffic-generator/generator.py` | Python | 3 |
| `lab/log-shipper/Dockerfile` | Docker | 4 |
| `lab/log-shipper/requirements.txt` | Python Deps | 4 |
| `lab/log-shipper/shipper.py` | Python | 4 |
| `backend/app/services/lab_manager.py` | Python Service | 6 |
| `backend/app/api/v1/endpoints/lab.py` | FastAPI Router | 6 |
| `frontend/src/components/dashboard/LabEnvironment.jsx` | React Component | 7 |

### Existing Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `backend/app/core/config.py` | Add `LAB_*` settings (6 fields) | 6 |
| `backend/app/main.py` | Register `/api/v1/lab` router | 6 |
| `frontend/src/services/api.js` | Add `labService` object | 7 |
| `frontend/src/pages/Dashboard.jsx` | Add Lab tab + lazy import | 7 |
| `lab_setup.ps1` | Update seed/status functions | 6 |

---

## Network Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION SECURITY CENTER - LIVING LAB TOPOLOGY                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ DASHBOARD STACK (docker-compose.yml)                               │     │
│  │                                                                     │     │
│  │  Frontend:5173 ─── Backend:8000 ─── PostgreSQL:5432                │     │
│  │                         │              Redis:6379                   │     │
│  │                         │              Celery Workers               │     │
│  │                         │                                           │     │
│  │  OpenVAS:9392 ──────────┤                                           │     │
│  │  Wazuh:55000 ───────────┤                                           │     │
│  │  Elasticsearch:9200 ────┤                                           │     │
│  │  Kibana:5601 ───────────┤                                           │     │
│  │  n8n:5678 ──────────────┘                                           │     │
│  └────────────────────────────┬────────────────────────────────────────┘     │
│                               │                                              │
│                    ┌──────────┴──────────┐                                   │
│                    │   lab_network       │                                   │
│                    │   (Docker Bridge)   │                                   │
│                    └──────────┬──────────┘                                   │
│                               │                                              │
│  ┌────────────────────────────┴───────────────────────────────────────┐      │
│  │ LIVING LAB (docker-compose.lab.yml)                                │      │
│  │                                                                     │      │
│  │  ┌─── DMZ (10.10.10.0/24) ────────────────────────────────────┐   │      │
│  │  │  lab_webserver:3000    Juice Shop         CVSS:9.5         │   │      │
│  │  │  lab_api_gateway:8081  Corporate API      CVSS:6.0         │   │      │
│  │  │  lab_dns_server:53     CoreDNS            CVSS:5.0         │   │      │
│  │  └────────────────────────────────────────────────────────────┘   │      │
│  │                                                                     │      │
│  │  ┌─── CORP (10.10.20.0/24) ───────────────────────────────────┐   │      │
│  │  │  lab_fileserver:445    Samba File Server   CVSS:8.0         │   │      │
│  │  │  lab_mailserver:3025   GreenMail           CVSS:7.0         │   │      │
│  │  │  lab_workstation:80    HR Workstation      CVSS:4.0         │   │      │
│  │  └────────────────────────────────────────────────────────────┘   │      │
│  │                                                                     │      │
│  │  ┌─── DATA (10.10.30.0/24) ───────────────────────────────────┐   │      │
│  │  │  lab_database:5432     PostgreSQL          CVSS:9.0         │   │      │
│  │  │  lab_redis_cache:6380  Redis (no auth)     CVSS:8.5         │   │      │
│  │  └────────────────────────────────────────────────────────────┘   │      │
│  │                                                                     │      │
│  │  ┌─── MGMT (10.10.40.0/24) ───────────────────────────────────┐  │      │
│  │  │  lab_traffic_gen       Background Traffic                   │  │      │
│  │  │  lab_log_shipper       Events → Elasticsearch               │  │      │
│  │  │  lab_wazuh_agent       Security Monitoring                  │  │      │
│  │  └────────────────────────────────────────────────────────────┘  │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Phase | Effort | Description |
|----------|-------|--------|-------------|
| P0 | Phase 1 | Medium | Docker Compose topology (foundation for everything) |
| P0 | Phase 2 | Low | Vulnerable service configs (enables scanning) |
| P1 | Phase 3 | Medium | Traffic generator (enables realistic telemetry) |
| P1 | Phase 4 | Medium | Log shipper (enables SIEM integration) |
| P0 | Phase 5 | Low | Network isolation (already mostly done) |
| P1 | Phase 6 | Medium | Backend API endpoints (enables frontend) |
| P2 | Phase 7 | Medium | Frontend Lab panel (user-facing integration) |
| P2 | Phase 8 | Low | Workflow documentation (demo readiness) |
| P1 | Phase 9 | Low | Testing & validation (quality assurance) |

**Recommended build order:** Phase 1 → 2 → 5 → 6 → 3 → 4 → 7 → 9 → 8

---

*Plan created for the Orchestration Security Center project — 2026-04-10*
*All file paths are relative to the project root: `d:\FINAL PROJECT\the-dashboard-project-\`*
