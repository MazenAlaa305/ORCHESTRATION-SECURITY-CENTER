import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import engine, Base

from app.models.scan import Scan, Target, Vulnerability, Finding, AgentLog, Endpoint, ScanAsset, AssetService, NetworkAsset, ActionItem, Report
from app.models.user import User
from app.models.config import RuntimeConfig

def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

if __name__ == "__main__":
    init()
