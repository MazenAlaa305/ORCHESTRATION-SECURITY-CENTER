# Mariz Ehap — SIEM & Log Analytics
# ماريز إيهاب — SIEM وتحليلات السجلات

> **Sub-Team:** 3 — Security & Scanning Engine | **الفريق الفرعي:** 3 — محرك الأمن والمسح
> **Stack:** Wazuh, Elasticsearch, Kibana, Python httpx, Docker log drivers

---

## Role Summary | ملخص الدور

**English:** Mariz owns the SIEM (Security Information and Event Management) layer of Found 404. Her job is to make security alerts from Wazuh appear on the Found 404 dashboard in real-time. She connects the lab containers → log shipper → Elasticsearch → Wazuh → Found 404 API → dashboard. She also builds the Kibana dashboards used in the demo.

**عربي:** ماريز تمتلك طبقة SIEM (إدارة معلومات الأمن والأحداث) في Found 404. مهمتها هي جعل تنبيهات الأمن من Wazuh تظهر على لوحة تحكم Found 404 في الوقت الفعلي. تصل حاويات المختبر → ناقل السجلات → Elasticsearch → Wazuh → API Found 404 → لوحة التحكم. كما تبني لوحات تحكم Kibana المستخدمة في العرض التوضيحي.

---

## Files She Owns | الملفات التي تمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/app/services/wazuh_integration.py` | Wazuh REST API client (auth, get alerts, get agents) | عميل Wazuh REST API |
| `backend/app/services/elastic_integration.py` | Elasticsearch query wrapper | غلاف استعلام Elasticsearch |
| `backend/app/api/v1/endpoints/siem.py` | SIEM alert feed endpoint for the dashboard | نقطة نهاية تغذية تنبيهات SIEM |
| `lab/log-shipper/shipper.py` | Log shipping agent (forwards lab logs to Wazuh/Elastic) | وكيل شحن السجلات |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `backend/app/services/alert_correlator.py` | Maps Wazuh alerts → scan vulnerability records | تعيين تنبيهات Wazuh → سجلات ثغرات المسح |
| `lab/kibana/dashboards/sme_overview.ndjson` | Kibana dashboard export (importable) | تصدير لوحة تحكم Kibana |
| `lab/wazuh/custom_rules.xml` | Wazuh custom detection rules for lab scenarios | قواعد Wazuh مخصصة |
| `backend/tests/test_siem_integration.py` | Mock Wazuh API tests | اختبارات Wazuh API وهمية |

---

## Key Code Explained | شرح الكود الرئيسي

### `wazuh_integration.py` — The Wazuh Client

**English:** Wazuh is a SIEM that collects and analyzes security logs from all systems. The Found 404 backend calls Wazuh's REST API to fetch alerts and display them on the dashboard. Authentication uses HTTP Basic Auth (username:password encoded in Base64), which then returns a JWT token for subsequent calls.

**عربي:** Wazuh هو SIEM يجمع ويحلل سجلات أمنية من جميع الأنظمة. يستدعي الـ backend في Found 404 Wazuh REST API لجلب التنبيهات وعرضها على لوحة التحكم. المصادقة تستخدم HTTP Basic Auth (اسم المستخدم:كلمة المرور مُشفّرة في Base64)، ثم تُرجع رمز JWT للاستدعاءات التالية.

```python
class WazuhIntegration:
    def __init__(self):
        self.api_url = settings.WAZUH_API_URL    # "https://wazuh:55000"
        self.user = settings.WAZUH_API_USER      # "wazuh"
        self.password = settings.WAZUH_API_PASSWORD  # "wazuh"
        self.token = None  # JWT token (obtained after login)

    async def get_token(self):
        """
        Step 1: Authenticate to Wazuh API.
        Wazuh uses Basic Auth → returns JWT token for all future calls.
        """
        # Encode "wazuh:wazuh" in Base64 for the Authorization header
        auth_str = f"{self.user}:{self.password}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        # "wazuh:wazuh" → "d2F6dWg6d2F6dWg=" (Base64)
        
        headers = {"Authorization": f"Basic {b64_auth}"}
        
        async with httpx.AsyncClient(verify=False) as client:
            # verify=False because Wazuh uses a self-signed SSL cert in lab
            response = await client.post(
                f"{self.api_url}/security/user/authenticate",
                headers=headers,
                timeout=10.0
            )
            if response.status_code == 200:
                self.token = response.json()["data"]["token"]
                # Token looks like: "eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9..."
                return self.token
```

**عربي للكود:**
```python
async def get_token(self):
    """
    الخطوة 1: المصادقة إلى Wazuh API.
    Wazuh يستخدم Basic Auth → يُرجع رمز JWT لجميع الاستدعاءات المستقبلية.
    
    verify=False لأن Wazuh يستخدم شهادة SSL موقّعة ذاتيًا في المختبر
    """
```

```python
async def get_alerts(self, limit=50, severity=None):
    """
    Fetches security alerts from Wazuh.
    Each alert represents a suspicious event detected in the lab.
    """
    if not self.token:
        await self.get_token()
    
    headers = {"Authorization": f"Bearer {self.token}"}
    params = {
        "limit": limit,              # Max 50 alerts per request
        "sort": "-timestamp",        # Newest first (- means descending)
    }
    if severity:
        params["level"] = severity   # "high", "critical", etc.
    
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(
            f"{self.api_url}/alerts",
            headers=headers,
            params=params,
            timeout=15.0
        )
        alerts = response.json()["data"]["affected_items"]
        # Each alert has: rule.description, rule.level (1-15), agent.name, timestamp
        return alerts
```

---

### `elastic_integration.py` — Elasticsearch Queries

**English:** Elasticsearch stores all the log data (indexed as JSON documents). The backend queries it to find specific log patterns — for example, "show me all log entries from the last hour that contain the word 'ATTACK'". It uses the Elasticsearch Query DSL (Domain Specific Language).

**عربي:** Elasticsearch يخزن جميع بيانات السجلات (مفهرسة كوثائق JSON). يستعلم الـ backend منه لإيجاد أنماط سجلات محددة — مثلًا، "أرني جميع مدخلات السجل من الساعة الأخيرة التي تحتوي على كلمة 'ATTACK'". يستخدم Elasticsearch Query DSL (لغة الاستعلام المحددة المجال).

```python
# Example Elasticsearch query — find high-severity events in last 24h
{
    "query": {
        "bool": {
            "must": [
                { "range": {
                    "@timestamp": {
                        "gte": "now-24h",    # Greater than or equal to 24 hours ago
                        "lte": "now"         # Less than or equal to now
                    }
                }},
                { "match": {
                    "rule.level": "high"    # Only high severity
                }}
            ]
        }
    },
    "sort": [{ "@timestamp": "desc" }],  # Newest first
    "size": 50                            # Return max 50 results
}
```

**عربي للاستعلام:**
```python
# مثال استعلام Elasticsearch — إيجاد أحداث عالية الخطورة في آخر 24 ساعة
{
    "query": {
        "bool": {
            "must": [
                { "range": { "@timestamp": { "gte": "now-24h" }}},  # آخر 24 ساعة
                { "match": { "rule.level": "high" }}                 # خطورة عالية فقط
            ]
        }
    },
    "sort": [{ "@timestamp": "desc" }],  # الأحدث أولًا
    "size": 50                            # أرجع 50 نتيجة كحد أقصى
}
```

---

### The Data Flow Mariz Must Understand

**English:** The complete path from "something happens in the lab" to "alert appears on the Found 404 dashboard":

**عربي:** المسار الكامل من "يحدث شيء ما في المختبر" إلى "يظهر التنبيه على لوحة تحكم Found 404":

```
1. lab_traffic_gen generates HTTP requests to lab_webserver
   مولّد الحركة يُنشئ طلبات HTTP إلى خادم الويب
   ↓
2. lab_webserver logs the requests (access.log, error.log)
   خادم الويب يسجّل الطلبات
   ↓
3. lab_log_shipper reads those logs every 10 seconds
   ناقل السجلات يقرأ تلك السجلات كل 10 ثوانٍ
   ↓
4. log_shipper POSTs logs to Elasticsearch index "sme-lab-*"
   الناقل يُرسل السجلات إلى Elasticsearch
   ↓
5. Wazuh reads from Elasticsearch + applies detection rules
   Wazuh يقرأ من Elasticsearch + يطبّق قواعد الكشف
   (If a rule matches → creates an Alert)
   (إذا تطابقت قاعدة → ينشئ تنبيهًا)
   ↓
6. Found 404 dashboard calls GET /api/v1/siem/alerts (every 30s)
   لوحة تحكم Found 404 تستدعي API كل 30 ثانية
   ↓
7. siem.py endpoint calls wazuh_integration.get_alerts()
   نقطة نهاية siem.py تستدعي wazuh_integration.get_alerts()
   ↓
8. Alerts appear on the SIEM tab of the dashboard
   تظهر التنبيهات في تبويب SIEM للوحة التحكم
```

---

### `alert_correlator.py` — What Mariz Must Build (Week 11)

**English:** Currently, Wazuh alerts and scan vulnerability findings are in separate data silos. Mariz must build a correlator that links them: "This Wazuh alert about port 445 brute-force corresponds to THIS vulnerability in the scan results."

**عربي:** حاليًا، تنبيهات Wazuh ونتائج ثغرات المسح في صوامع بيانات منفصلة. يجب على ماريز بناء مُرتّب يربطهما: "هذا التنبيه من Wazuh حول قوة غاشمة على المنفذ 445 يتوافق مع هذه الثغرة في نتائج المسح."

```python
# Logic for alert_correlator.py (Mariz must implement this)
async def correlate_alerts_with_findings(scan_id: str, db: AsyncSession):
    """
    For each Wazuh alert, find matching vulnerability in the scan:
    - Same target IP
    - Same port/service
    - Overlapping time window
    """
    alerts = await wazuh_service.get_alerts(limit=100)
    scan_vulns = await db.execute(
        select(Vulnerability).where(Vulnerability.scan_id == scan_id)
    )
    
    for alert in alerts:
        alert_ip = alert.get("agent", {}).get("ip")
        alert_port = extract_port_from_alert(alert)
        
        # Find matching vulnerability
        matching_vuln = find_vuln_by_ip_and_port(scan_vulns, alert_ip, alert_port)
        if matching_vuln:
            matching_vuln.wazuh_alert_id = alert["id"]
            # Now the dashboard can show: "Wazuh also saw this!"
    
    await db.commit()
```

---

## What Mariz Must Learn | ما يجب على ماريز تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| Wazuh REST API: `/security/user/authenticate`, `/alerts` | Core SIEM integration | التكامل الأساسي مع SIEM |
| Elasticsearch Query DSL: `bool`, `match`, `range`, `aggs` | Query logs from the backend | الاستعلام عن السجلات |
| Kibana: dashboard creation, visualization types, index patterns | Build the demo dashboard | بناء لوحة تحكم العرض |
| Docker log drivers: `json-file`, `syslog` | How container logs flow | كيف تتدفق سجلات الحاوية |
| Base64 encoding (for Wazuh Basic Auth) | Debug auth failures | تصحيح فشل المصادقة |
| httpx async client | All Wazuh + Elasticsearch calls | جميع استدعاءات Wazuh + Elasticsearch |

**Resources | الموارد:**
- Wazuh REST API: https://documentation.wazuh.com/current/user-manual/api/reference.html
- Elasticsearch Query DSL: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
- Kibana dashboard guide: https://www.elastic.co/guide/en/kibana/current/dashboard.html

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Verify Wazuh receives logs from all lab containers; fix broken shippers | التحقق من استقبال Wazuh للسجلات |
| 11 | Build `alert_correlator.py`; Wazuh alerts → Found 404 findings link | بناء مُرتّب التنبيهات |
| 12 | Create + export Kibana dashboard for the demo | إنشاء + تصدير لوحة تحكم Kibana |
| 13 | Full SIEM pipeline test: attack → Wazuh alert → dashboard display | اختبار خط SIEM الكامل |
