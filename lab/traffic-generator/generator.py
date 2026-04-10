"""
Living Lab Traffic Generator — Found 404
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
        "generator": "found404-traffic-gen"
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
