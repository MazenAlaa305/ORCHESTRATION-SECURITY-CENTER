import sys
import os
from sqlalchemy import create_all, select
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import SessionLocal
from app.models.scan import Scan, Vulnerability, ScanAsset, ActionItem, NetworkAsset

db = SessionLocal()

print("--- Recent Scans ---")
scans = db.query(Scan).order_by(Scan.started_at.desc()).limit(10).all()
for s in scans:
    v_count = db.query(Vulnerability).filter(Vulnerability.scan_id == s.id).count()
    a_count = db.query(ScanAsset).filter(ScanAsset.scan_id == s.id).count()
    print(f"ID: {s.id} | Status: {s.status} | Target: {s.target_url} | Start: {s.started_at} | Vulns: {v_count} | Assets: {a_count} | Risk: {s.risk_score}")

print("\n--- Action Items ---")
actions = db.query(ActionItem).filter(ActionItem.status == "OPEN").limit(5).all()
for a in actions:
    print(f"ID: {a.id} | ScanID: {a.scan_id} | Title: {a.title} | Priority: {a.priority}")

print("\n--- Network Assets ---")
network_assets = db.query(NetworkAsset).all()
for na in network_assets:
    print(f"ID: {na.id} | IP: {na.ip_address} | Risk: {na.risk_score}")

db.close()
