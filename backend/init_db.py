import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import engine, Base

from app.models.scan import ScanJob
from app.models.asset import ScanAsset, AssetService
from app.models.vulnerability import Vulnerability
from app.models.finding import Finding
from app.models.action_item import ActionItem
from app.models.target import LabTarget
from app.models.user import User
from app.models.config import RuntimeConfig
from app.models.report import ReportSignature

def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

if __name__ == "__main__":
    init()
