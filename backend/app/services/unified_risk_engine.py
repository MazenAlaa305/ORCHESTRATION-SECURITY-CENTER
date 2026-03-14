import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.scan import Scan, Vulnerability, ScanStatus, SeverityLevel, VulnStatus, ActionItem, ScanAsset, AssetService, NetworkAsset

logger = logging.getLogger(__name__)

class UnifiedRiskEngine:
    """
    Unified, deterministic risk engine for SME security orchestration.
    Calculates risk based on tool-provided CVSS scores, asset criticality, and port weightings.
    """
    
    HIGH_RISK_PORTS = {
        21: ("FTP", 15),
        23: ("Telnet", 20),
        445: ("SMB", 20),
        3389: ("RDP", 15),
        6379: ("Redis", 10),
        3000: ("Dev App", 5),
        8080: ("Proxy/App", 5),
        5432: ("PostgreSQL", 10),
        3306: ("MySQL", 10)
    }

    SEVERITY_WEIGHTS = {
        SeverityLevel.CRITICAL: 25,
        SeverityLevel.HIGH: 15,
        SeverityLevel.MEDIUM: 7,
        SeverityLevel.LOW: 2,
        SeverityLevel.INFO: 0
    }

    ASSET_VALUE_MAP = {
        "CRITICAL": 1.5,
        "HIGH": 1.2,
        "MEDIUM": 1.0,
        "LOW": 0.8
    }

    def __init__(self, db: Session):
        self.db: Session = db
        # Ensure HIGH_RISK_PORTS is available as explicit float for linter
        self.port_weights: dict = self.__class__.HIGH_RISK_PORTS

    def calculate_scan_risk(self, scan: Scan) -> float:
        """
        Calculates a global risk score for a scan (0-100).
        Logic:
        1. Start with aggregate penalties from all vulnerabilities.
        2. Apply asset-specific multipliers.
        3. Normalize to 0-100 scale where 100 is "Maximum Risk".
        Note: The project previously used 100 as "Perfectly Secure". 
        We will stick to 0-100 where higher is MORE RISK to align with CVSS/SME expectations.
        """
        if not scan.vulnerabilities and not scan.assets:
            return 0.0

        total_penalty = 0.0
        
        # 1. Vulnerability Penalties
        for vuln in scan.vulnerabilities:
            penalty = self.SEVERITY_WEIGHTS.get(vuln.severity, 0)
            # Confidence multiplier (if tool provided)
            confidence = vuln.confidence_score if vuln.confidence_score is not None else 1.0
            from typing import cast
            p_val = float(cast(float, penalty))
            c_val = float(cast(float, confidence))
            total_penalty = float(cast(float, total_penalty)) + (p_val * c_val)

        # 2. Port Penalties (from ScanAssets)
        for asset in scan.assets:
            for service in asset.services:
                ports_map = UnifiedRiskEngine.HIGH_RISK_PORTS
                if isinstance(ports_map, dict) and service.port in ports_map:
                    port_data = ports_map[service.port]
                    if isinstance(port_data, tuple) and len(port_data) >= 2:
                        _, penalty = port_data
                        from typing import cast
                        p_val = float(cast(float, penalty))
                        total_penalty = float(float(total_penalty) + p_val)

        # 3. Asset Criticality Multiplier
        target_val = "MEDIUM"
        target_ip = ""
        if scan.target:
            target_ip = scan.target.base_url if scan.target else scan.target_url or ""
            if hasattr(scan.target, 'asset_value'):
                target_val = str(scan.target.asset_value).upper()
        
        asset_multiplier = self.ASSET_VALUE_MAP.get(target_val, 1.0)
        
        # 4. Exposure Modifier
        # Standard private block detection (RFC 1918)
        exposure_multiplier = 1.0  # Assume public by default
        if any(target_ip.startswith(prefix) for prefix in ['10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.2', '172.30.', '172.31.', '127.', 'localhost']):
            exposure_multiplier = 0.6  # Internal/NAT asset
            
        a_mult = float(asset_multiplier)
        e_mult = float(exposure_multiplier)
        temp_score = float(float(total_penalty) * a_mult)
        final_score = float(temp_score * e_mult)

        # Normalize/Cap
        res_val = float(final_score)
        return float(min(100.0, res_val))

    def calculate_health_score(self, scan: Scan) -> float:
        """
        Legacy-inspired Health Score (100 = Safe, 0 = Dangerous).
        Provides a better "At-a-glance" metric for SME owners.
        """
        score = 100.0
        
        # 1. Vulnerability Penalty
        score_val = 100.0
        for vuln in scan.vulnerabilities:
            s_val = float(score_val)
            if vuln.severity == SeverityLevel.CRITICAL:
                score_val = float(s_val - 20.0)
            elif vuln.severity == SeverityLevel.HIGH:
                score_val = float(s_val - 10.0)
            elif vuln.severity == SeverityLevel.MEDIUM:
                score_val = float(s_val - 5.0)
        
        # 2. Port Penalty
        for asset in scan.assets:
            for service in asset.services:
                if service.state == 'open' and service.port in [21, 23, 445, 3389]:
                    s_val = float(score_val)
                    score_val = float(s_val - 15.0)

        # 3. Cap
        safe_score: float = float(score_val)
        if scan.vulnerabilities and safe_score > 90.0:
            safe_score = 90.0

        return float(max(0.0, safe_score))

    def update_scan_risk(self, scan_id: str) -> float:
        """Calculates and saves both Risk and Health scores."""
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            risk_score: float = float(self.calculate_scan_risk(scan))
            health_score: float = float(self.calculate_health_score(scan))
            
            # We store the deterministic risk_score in the main field for now
            scan.risk_score = risk_score
            # We can store health_score in agent_thoughts for the UI to pick up
            if not isinstance(scan.agent_thoughts, dict):
                scan.agent_thoughts = {}
            
            thoughts: dict = scan.agent_thoughts
            thoughts["health_score"] = health_score
            scan.agent_thoughts = thoughts
            
            self.db.commit()
            logger.info(f"Updated scores for scan {scan_id}: Risk={risk_score}, Health={health_score}")
            return risk_score
        return 0.0

    def generate_action_items(self, scan_id: str):
        """
        Deterministic task generation.
        Translates raw findings into ActionItem records.
        """
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return []

        new_actions = []
        
        # 1. Create actions from HIGH/CRITICAL vulnerabilities
        for vuln in scan.vulnerabilities:
            if vuln.severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]:
                title = vuln.title or f"Fix {vuln.type or 'Vulnerability'}"
                description = vuln.description or f"Critical security issue detected on {vuln.host or 'target'}."
                
                # Deduplicate
                existing = self.db.query(ActionItem).filter(
                    ActionItem.scan_id == scan_id,
                    ActionItem.title == title
                ).first()
                
                if not existing:
                    action = ActionItem(
                        scan_id=scan_id,
                        title=title,
                        description=description,
                        priority=vuln.severity.value.upper(),  # BUG FIX: use .value to get str from Enum
                        status="OPEN",
                        type="REMEDIATION",
                        created_at=datetime.utcnow()
                    )
                    self.db.add(action)
                    new_actions.append(action)

        # 2. Create actions for dangerously open ports
        for asset in scan.assets:
            for service in asset.services:
                ports_map = UnifiedRiskEngine.HIGH_RISK_PORTS
                if isinstance(ports_map, dict) and service.port in ports_map:
                    port_data = ports_map[service.port]
                    if isinstance(port_data, tuple) and len(port_data) >= 1:
                        name = port_data[0]
                        title = f"Secure {name} service on {asset.ip_address}"
                        description = f"The {name} service (Port {service.port}) is exposed. SMEs should restrict this or use a VPN."
                    
                    existing = self.db.query(ActionItem).filter(
                        ActionItem.scan_id == scan_id,
                        ActionItem.title == title
                    ).first()
                    
                    if not existing:
                        action = ActionItem(
                            scan_id=scan_id,
                            title=title,
                            description=description,
                            priority="HIGH",
                            status="OPEN",
                            type="CONFIGURATION",
                            created_at=datetime.utcnow()
                        )
                        self.db.add(action)
                        new_actions.append(action)

        self.db.commit()
        return new_actions
