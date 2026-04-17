import logging
import json
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.scan import ScanAsset
from app.core.config import settings
try:
    import google.generativeai as genai
    _HAS_GENAI = True
except ImportError:
    genai = None  # type: ignore
    _HAS_GENAI = False

logger = logging.getLogger(__name__)

class IntelligenceAgent:
    """
    Artificial Intelligence Agent specialized in "reasoning" about network assets.
    Uses Gemini to translate technical discovery data into human-readable insights.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.model = None
        # Guard: only configure if API key is present
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. IntelligenceAgent will use fallback responses.")
            return
        try:
            if _HAS_GENAI:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            else:
                from google import genai as _new_genai
                self._client = _new_genai.Client(api_key=settings.GEMINI_API_KEY)
                self.model = "gemini-2.0-flash"
        except Exception as e:
            logger.warning("Could not initialize Gemini model: %s", e)

    async def analyze_asset(self, scan_id: str, asset: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes a single asset's discovery data to generate security insights.
        """
        try:
            # Guard: return fallback if model not configured
            if not self.model:
                return {
                    "risk_explanation": "Vulnerability detected on open services.",
                    "business_impact": "Potential data exposure or system compromise.",
                    "remediation_advice": "Restrict network access to this device and update software.",
                    "response_priority": "High"
                }

            # Prepare context for SME Advisory role
            prompt = f"""
            As a Security Advisor for SME businesses, analyze these technical findings for a network asset.
            
            ASSET DATA: {json.dumps(asset)}
            
            Your goal is to provide human-readable advice and explain the risk simply.
            
            OUTPUT FORMAT (JSON):
            {{
                "risk_explanation": "Explain in 1 sentence why this device is currently dangerous (e.g., 'It has an open door that attackers can use to steal data').",
                "business_impact": "What happens if this is hacked? (e.g., 'Your client records could be leaked').",
                "remediation_advice": "Simple, non-technical steps to fix it.",
                "response_priority": "High/Medium/Low"
            }}
            """

            # Call Gemini — support both old SDK (model object) and new SDK (client + model name)
            if _HAS_GENAI:
                response = self.model.generate_content(prompt)
                text = response.text.strip()
            else:
                response = self._client.models.generate_content(
                    model=self.model, contents=prompt
                )
                text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:-3].strip()
            elif text.startswith('```'):
                text = text[3:-3].strip()
            
            insight = json.loads(text)
            
            # Update the database record
            _a_res = await self.db.execute(
                select(ScanAsset).filter(
                    ScanAsset.scan_id == scan_id,
                    ScanAsset.ip_address == asset.get('ip')
                )
            )
            db_asset = _a_res.scalars().first()
            
            if db_asset:
                db_asset.ai_insight = insight
                await self.db.commit()
                logger.info(f"Generated Security Advice for {asset.get('ip')}")
            
            return insight

        except Exception as e:
            exc_str = str(e).lower()
            if "429" in exc_str or "quota" in exc_str or "rate" in exc_str or "resource_exhausted" in exc_str:
                logger.warning("Gemini rate limit hit for asset %s — using fallback insight.", asset.get('ip'))
            else:
                logger.error(f"Intelligence Agent advisory failed: {e}")
            return {
                "risk_explanation": "Vulnerability detected on open services.",
                "business_impact": "Potential data exposure or system compromise.",
                "remediation_advice": "Restrict network access to this device and update software.",
                "response_priority": "High",
                "rate_limited": "429" in exc_str or "quota" in exc_str or "rate" in exc_str,
            }

    async def batch_analyze(self, scan_id: str, assets: List[Dict[str, Any]]):
        """
        Batch process all assets from a scan.
        """
        for asset in assets:
            await self.analyze_asset(scan_id, asset)
