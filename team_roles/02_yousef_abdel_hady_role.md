# Yousef Abdel Hady — AI Agent Pipeline & Risk Engine
# يوسف عبد الهادي — خط وكلاء الذكاء الاصطناعي ومحرك المخاطر

> **Sub-Team:** 1 — Backend & AI Core | **الفريق الفرعي:** 1 — Backend والذكاء الاصطناعي
> **Stack:** Python, Google Generative AI (Gemini 2.0 Flash), asyncio, CVSS, OWASP

---

## Role Summary | ملخص الدور

**English:** Yousef owns everything that makes Found 404 "intelligent." Every scan passes through his code — the 5-agent AI pipeline (ReconAgent → AttackAgent → ValidationAgent → ReportingAgent → SIEMAgent) and the UnifiedRiskEngine that converts raw vulnerability data into a 0-100 risk score. He is also responsible for the Gemini LLM advisory that explains findings in plain English to non-technical users.

**عربي:** يوسف يمتلك كل ما يجعل Found 404 "ذكيًا". كل مسح يمر عبر كوده — خط 5 وكلاء AI (ReconAgent → AttackAgent → ValidationAgent → ReportingAgent → SIEMAgent) ومحرك UnifiedRiskEngine الذي يحوّل بيانات الثغرات الخام إلى درجة خطر من 0 إلى 100. هو أيضًا مسؤول عن استشارة Gemini LLM التي تشرح النتائج بلغة بسيطة للمستخدمين غير التقنيين.

---

## Files He Owns | الملفات التي يمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/app/services/agent_orchestrator.py` | BaseAgent class + 5-agent sequential pipeline | الفئة الأساسية + خط 5 وكلاء متسلسلة |
| `backend/app/services/unified_risk_engine.py` | Risk Score math (0–100), Health Score, Action Items | حسابات درجة الخطر، درجة الصحة |
| `backend/app/services/intelligence_agent.py` | Gemini LLM advisory-only reasoning | استشارة Gemini LLM |
| `backend/app/services/ai_advisor.py` | AI recommendation generation per asset | توليد التوصيات AI لكل أصل |
| `backend/app/services/validation_probe.py` | Confidence filter — removes findings < 0.6 | فلتر الثقة — يحذف النتائج < 0.6 |
| `backend/app/services/discovery_agent.py` | Asset and endpoint discovery logic | منطق اكتشاف الأصول ونقاط النهاية |
| `backend/app/services/finding_dedup.py` | Deduplication of repeated vulnerability findings | إزالة تكرار نتائج الثغرات |
| `backend/app/services/framework_tagger.py` | Tags findings to OWASP/CVSS frameworks | يُرفق النتائج بإطار OWASP/CVSS |
| `backend/app/services/cvss.py` | CVSS score calculation | حساب درجة CVSS |
| `backend/app/services/llm_guard.py` | Prevents AI from executing destructive actions | يمنع AI من تنفيذ إجراءات مدمّرة |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `backend/app/services/scoring_explainer.py` | Plain-English score explanation per asset | شرح درجة الخطر بلغة بسيطة |
| `backend/tests/test_risk_engine.py` | Parametrized unit tests for score math | اختبارات وحدة لحسابات درجة الخطر |
| `backend/tests/test_agents.py` | Agent behavior tests (mock Gemini API) | اختبارات سلوك الوكلاء |

---

## Key Code Explained | شرح الكود الرئيسي

### `agent_orchestrator.py` — The 5-Agent Pipeline

**English:** This is the brain of Found 404. When a scan is triggered, the orchestrator runs 5 agents in sequence. Each agent receives a "context" dictionary from the previous agent and adds its own findings to it.

**عربي:** هذا هو دماغ Found 404. عند تشغيل مسح، ينفّذ المنسّق 5 وكلاء بالتسلسل. كل وكيل يستقبل قاموس "سياق" من الوكيل السابق ويضيف نتائجه الخاصة إليه.

```
Scan Triggered → ReconAgent → AttackAgent → ValidationAgent → ReportingAgent → SIEMAgent
(تُشغَّل المسح) → (استكشاف) → (هجوم)    → (تحقق)         → (تقرير)        → (SIEM)
```

**`BaseAgent` class (parent of all 5 agents):**

```python
class BaseAgent(ABC):
    def __init__(self, name, scan_id, db_session, max_rps=10):
        self.name = name          # "ReconAgent", "AttackAgent", etc.
        self.scan_id = scan_id   # Which scan this agent is working on
        self.db = db_session     # Async DB session for saving findings
        self.llm = None          # Gemini client (None if no API key)
        self.rate_limiter = AsyncLimiter(max_rps, time_period=1)  # 10 req/sec max

    async def log_action(self, action, reasoning=None, input_data=None, output_data=None):
        # Saves agent activity to AgentLog table in DB
        # Each log entry is hash-chained (like a blockchain) for tamper evidence
        # sha256(prev_hash + this_entry) = tamper-proof audit trail

    async def llm_reason(self, prompt):
        # Calls Gemini 2.0 Flash with the given prompt
        # Returns the AI's text response
        # If GEMINI_API_KEY is missing → returns fallback text

    @abstractmethod
    async def execute(self, context: dict) -> dict:
        # Each agent MUST implement this method
        # Receives context from previous agent, returns enriched context
```

**عربي للكود:**
```python
class BaseAgent(ABC):
    # كل وكيل يرث من هذه الفئة الأساسية
    # log_action: يحفظ نشاط الوكيل في جدول AgentLog بقاعدة البيانات
    # كل مدخلة سجل مُربوطة بتجزئة (مثل blockchain) لإثبات عدم التلاعب
    # llm_reason: يستدعي Gemini 2.0 Flash بالمطالبة المعطاة
    # execute: كل وكيل يجب أن يطبّق هذه الطريقة - يستقبل السياق ويُرجع سياقًا مُثرًا
```

**The 5 Agents explained:**

| Agent | What it does | ماذا يفعل |
|-------|-------------|-----------|
| **ReconAgent** | Runs Nmap port scan + Playwright web crawl → discovers open ports, technologies, endpoints | يشغّل مسح Nmap + Playwright → يكتشف المنافذ والتقنيات |
| **AttackAgent** | Tests hardcoded payloads (SQLi, XSS, BOLA, SSRF) via httpx → creates Vulnerability records | يختبر حمولات محدّدة → ينشئ سجلات ثغرات |
| **ValidationAgent** | Filters confidence < 0.6 as FALSE_POSITIVE | يصفّي الثقة < 0.6 كنتائج زائفة |
| **ReportingAgent** | Generates markdown/PDF executive report | يولّد تقرير تنفيذي |
| **SIEMAgent** | Dormant (returns empty mock data — awaiting Mariz's work) | خامل (يرجع بيانات وهمية — ينتظر عمل ماريز) |

---

### `unified_risk_engine.py` — The Score Calculator

**English:** The risk score (0–100) is calculated using a mathematical formula that combines three factors:

**عربي:** يُحسب درجة الخطر (0-100) باستخدام صيغة رياضية تجمع ثلاثة عوامل:

```python
# Factor 1: Vulnerability penalties × confidence score
SEVERITY_WEIGHTS = {
    CRITICAL: 25,   # Each CRITICAL vuln adds 25 × confidence to the score
    HIGH: 15,       # Each HIGH vuln adds 15 × confidence
    MEDIUM: 7,      # Each MEDIUM vuln adds 7 × confidence
    LOW: 2,         # Each LOW vuln adds 2 × confidence
    INFO: 0         # INFO findings don't affect the score
}

# Factor 2: Port penalties (dangerous open ports increase risk)
HIGH_RISK_PORTS = {
    21: ("FTP", 15),       # FTP on internet = 15 points added
    23: ("Telnet", 20),    # Telnet = 20 points (plaintext protocol)
    445: ("SMB", 20),      # SMB = 20 points (WannaCry attack vector)
    3389: ("RDP", 15),     # RDP = 15 points (brute-force target)
    6379: ("Redis", 10),   # Redis open = 10 points (often no auth)
    5432: ("PostgreSQL", 10),  # DB on internet = 10 points
}

# Factor 3: Exposure modifier
# Internal IPs (10.x, 192.168.x, 172.16-31.x) → multiply by 0.6
# (internal = less exposed = lower risk)
# Public IPs → multiply by 1.0

# Final formula:
# score = (vuln_penalties × confidence) + port_penalties
# score × asset_multiplier (1.5 for CRITICAL assets, 0.8 for LOW)
# score × exposure_modifier (0.6 for internal, 1.0 for external)
# score = min(score, 100)  ← capped at 100

# Health Score = 100 - risk_score
```

**عربي للصيغة:**
```python
# العامل 1: عقوبات الثغرات × درجة الثقة
# CRITICAL: 25 نقطة لكل ثغرة (× درجة الثقة)
# HIGH: 15 نقطة، MEDIUM: 7، LOW: 2، INFO: 0

# العامل 2: عقوبات المنافذ (المنافذ الخطرة المفتوحة تزيد المخاطرة)
# FTP: +15، Telnet: +20، SMB: +20، RDP: +15

# العامل 3: معدّل التعرض
# IPs الداخلية → اضرب في 0.6 (أقل تعرضًا = مخاطرة أقل)
# IPs العامة → اضرب في 1.0

# درجة الصحة = 100 - درجة الخطر
```

---

### `backend/app/services/intelligence_agent.py` — Gemini AI Advisory

**English:** This agent does NOT make security decisions. It only provides human-readable explanations. It receives the scan results and asks Gemini: "Here are the vulnerabilities found. Explain in plain English what they mean for a small business and what the owner should do." The response is stored in the DB and shown in the Asset Detail Panel.

**عربي:** هذا الوكيل لا يتخذ قرارات أمنية. يُقدّم فقط تفسيرات مقروءة للإنسان. يستقبل نتائج المسح ويسأل Gemini: "هذه هي الثغرات المكتشفة. اشرح بلغة بسيطة ما تعنيه لشركة صغيرة وما يجب على المالك فعله." تُخزَّن الاستجابة في قاعدة البيانات وتُعرض في لوحة تفاصيل الأصل.

```python
# The prompt template (simplified):
prompt = f"""
You are a cybersecurity advisor for a small business.
The following vulnerabilities were found on {target_name}:
{vulnerability_list}

Provide:
1. risk_explanation: What does this mean in plain English?
2. business_impact: What is the worst that could happen?
3. remediation_advice: What should the IT admin do first?
4. response_priority: IMMEDIATE / THIS_WEEK / THIS_MONTH

Respond ONLY in valid JSON format.
"""
```

---

## What Yousef Must Learn | ما يجب على يوسف تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| Google Generative AI Python SDK | Core tool for LLM calls | الأداة الأساسية لاستدعاءات LLM |
| Prompt engineering (JSON output forcing) | Make Gemini return structured data | جعل Gemini يُرجع بيانات منظّمة |
| Python `asyncio` — `async def`, `await`, `create_task` | All agents are async | جميع الوكلاء غير متزامنة |
| CVSS v3.1 scoring formula | Correctly tag severity to findings | وسم الخطورة بشكل صحيح |
| OWASP Top 10 (2021) categories | Correctly classify vulnerability types | تصنيف أنواع الثغرات بشكل صحيح |
| `pytest-asyncio` + mocking | Test agents without real Gemini API calls | اختبار الوكلاء بدون استدعاءات API حقيقية |

**Resources | الموارد:**
- Gemini Python SDK: https://ai.google.dev/gemini-api/docs/quickstart?lang=python
- OWASP Top 10: https://owasp.org/Top10/
- CVSS v3.1 Calculator: https://www.first.org/cvss/calculator/3.1
- pytest-asyncio: https://pytest-asyncio.readthedocs.io/

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Add `scoring_explainer.py` — plain-English risk explanation per asset | إضافة شارح درجة الخطر |
| 11 | Improve Gemini prompt → structured JSON remediation steps | تحسين مطالبة Gemini → خطوات معالجة منظّمة |
| 12 | Add CVSS score to every vulnerability record; tag with OWASP category | إضافة درجة CVSS لكل ثغرة |
| 13 | Write ≥ 10 passing tests for risk engine + agent pipeline | كتابة ≥ 10 اختبارات ناجحة |

---

## Presentation Duty | دور التقديم

**English:** Yousef supports Reem's backend segment by demonstrating the AI reasoning panel live — showing the Orchestration Feed during a scan and explaining what each agent is doing.

**عربي:** يوسف يدعم مقطع ريم للـ backend بعرض لوحة التفكير AI مباشرةً — يُظهر Orchestration Feed أثناء المسح ويشرح ما يفعله كل وكيل.
