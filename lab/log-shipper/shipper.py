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
