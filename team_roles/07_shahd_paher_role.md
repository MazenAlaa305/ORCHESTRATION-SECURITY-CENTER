# Shahd Paher — Security Scanning Sub-Leader
# شهد باهر — مسؤولة فريق الأمن والمسح

> **Sub-Team:** 3 — Security & Scanning Engine | **الفريق الفرعي:** 3 — محرك الأمن والمسح
> **Stack:** Nmap, Nuclei, OpenVAS, python-nmap, python-gvm, Docker networking, OWASP

---

## Role Summary | ملخص الدور

**English:** Shahd owns the scan pipeline from target discovery through vulnerability detection. She is also the **lab environment manager** — she keeps all 10 lab containers healthy, designs attack scenarios for the demo, and ensures the Nmap → Nuclei → OpenVAS pipeline produces real, demonstrable findings. She presents the 5-minute security demo segment at the university presentation.

**عربي:** شهد تمتلك خط أنابيب المسح من اكتشاف الهدف إلى اكتشاف الثغرات. هي أيضًا **مديرة بيئة المختبر** — تُبقي جميع حاويات المختبر الـ 10 بصحة جيدة، وتصمم سيناريوهات الهجوم للعرض التوضيحي، وتضمن أن خط Nmap → Nuclei → OpenVAS ينتج نتائج حقيقية قابلة للإثبات. تقدّم مقطع العرض الأمني لمدة 5 دقائق في تقديم الجامعة.

---

## Files She Owns | الملفات التي تمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/app/services/nmap_wrapper.py` | Nmap scan execution + XML result parsing | تنفيذ مسح Nmap + تحليل نتائج XML |
| `backend/app/services/nuclei_wrapper.py` | Nuclei template runner + result ingestion | مشغّل قوالب Nuclei + استيعاب النتائج |
| `backend/app/services/openvas.py` | OpenVAS GMP API wrapper | غلاف OpenVAS GMP API |
| `backend/app/services/infrastructure_agent.py` | Port/service/OS fingerprinting agent | وكيل بصمة المنافذ/الخدمات/نظام التشغيل |
| `backend/app/api/v1/endpoints/findings.py` | Findings CRUD, filter by severity/type | CRUD النتائج، فرز حسب الخطورة |
| `backend/app/api/v1/endpoints/openvas.py` | OpenVAS task management API | API إدارة مهام OpenVAS |
| `lab_setup.ps1` | Lab lifecycle management | إدارة دورة حياة المختبر |
| `docker-compose.lab.yml` | 4-subnet vulnerable lab environment | بيئة المختبر الضعيفة |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `lab/scenarios/sqli_scenario.md` | Documented SQL injection scenario | سيناريو حقن SQL موثّق |
| `lab/scenarios/xss_scenario.md` | Documented XSS scenario | سيناريو XSS موثّق |
| `lab/scenarios/misconfig_scenario.md` | SMB/Redis misconfiguration scenario | سيناريو إعداد خاطئ SMB/Redis |
| `backend/app/services/scope_guard.py` | Scan scope validator | مُحقق نطاق المسح |
| `backend/tests/test_nmap_wrapper.py` | Unit tests for Nmap result parser | اختبارات محلل نتائج Nmap |

---

## Key Code Explained | شرح الكود الرئيسي

### `nmap_wrapper.py` — The Port Scanner

**English:** Nmap is the industry-standard port scanner. This file wraps the `python-nmap` library to give the backend a clean Python API for running scans and parsing results.

**عربي:** Nmap هو ماسح المنافذ القياسي في الصناعة. يلفّ هذا الملف مكتبة `python-nmap` ليمنح الـ backend واجهة Python نظيفة لتشغيل المسوح وتحليل النتائج.

```python
class NmapWrapper:
    def __init__(self):
        self.nm = nmap.PortScanner()  # The python-nmap object

    def scan_target(self, target, scan_type="quick"):
        """
        3 scan modes:
        
        "quick"  → -sV -F -T4
                    -sV: detect service versions (Apache 2.4.51, OpenSSH 8.2, etc.)
                    -F:  fast mode — scan top 100 ports only (not all 65535)
                    -T4: aggressive timing template (faster, noisier)
        
        "full"   → -sV -O -T4
                    -O: OS detection (Windows 10, Ubuntu 20.04, etc.)
                    Scans all common ports (more thorough, takes ~2 min)
        
        "deep"   → -sV -O -A -T4 --script=vulners,banner,http-enum,smb-os-discovery
                    -A: enables OS detection, version detection, script scanning
                    --script=vulners: matches open services to CVE database
                    --script=http-enum: enumerates web directories
                    --script=smb-os-discovery: deep SMB service fingerprinting
        """
        if scan_type == "deep":
            self.nm.scan(target, arguments="-sV -O -A -T4 --script=vulners,banner,http-enum,smb-os-discovery")
        elif scan_type == "full":
            self.nm.scan(target, arguments="-sV -O -T4")
        else:
            self.nm.scan(target, arguments="-sV -F -T4")
        
        return self._parse_results()
```

**عربي لأنواع المسح:**
```python
# "quick" → سريع: يمسح أفضل 100 منفذ + يكتشف إصدارات الخدمات
# "full"  → كامل: يمسح المنافذ الشائعة + يكتشف نظام التشغيل
# "deep"  → عميق: كل شيء + NSE scripts للثغرات + قاعدة CVE
```

```python
def _parse_results(self):
    """
    Converts raw Nmap XML output → clean Python list of dicts.
    For each host found:
    """
    scan_data = []
    for host in self.nm.all_hosts():
        host_info = {
            "ip": host,                           # e.g., "10.10.10.10"
            "status": self.nm[host].state(),      # "up" or "down"
            "hostnames": self.nm[host].hostname(), # "webserver.sme-lab.local"
            "os_name": None,                      # "Linux 4.15-5.8" if -O flag
            "services": []
        }
        
        # For each protocol (TCP, UDP) on this host:
        for proto in self.nm[host].all_protocols():
            for port in self.nm[host][proto].keys():
                service = self.nm[host][proto][port]
                host_info["services"].append({
                    "port": port,                  # e.g., 22
                    "protocol": proto,             # "tcp"
                    "state": service["state"],     # "open"
                    "name": service["name"],       # "ssh"
                    "product": service["product"], # "OpenSSH"
                    "version": service["version"], # "8.2p1"
                })
        scan_data.append(host_info)
    return scan_data
```

---

### Nuclei — The Vulnerability Template Scanner

**English:** Nuclei uses YAML templates to test for specific vulnerabilities. Each template describes: what to send, what to look for in the response, and what it means. Shahd's `nuclei_wrapper.py` selects which templates to run based on what Nmap discovered (the "deterministic chaining" that makes Found 404 special).

**عربي:** يستخدم Nuclei قوالب YAML لاختبار ثغرات محددة. كل قالب يصف: ما يجب إرساله، ما يجب البحث عنه في الاستجابة، وما تعنيه. `nuclei_wrapper.py` الخاص بشهد يختار القوالب لتشغيلها بناءً على ما اكتشفه Nmap ("التسلسل الحتمي" الذي يجعل Found 404 مميزًا).

```
Deterministic Chaining Logic (how Nuclei templates are selected):
التسلسل الحتمي (كيف يتم اختيار قوالب Nuclei):

Port 80/443 found → run: http-sqli.yaml, http-xss.yaml, bola.yaml, ssrf.yaml
Port 445 found   → run: smb-enum.yaml, smb-default-creds.yaml
Port 6379 found  → run: redis-unauth.yaml, redis-rce.yaml
Port 5432 found  → run: postgres-weak-creds.yaml
Port 21 found    → run: ftp-anon.yaml, ftp-weak-creds.yaml

NOT:
Port 445 found → DO NOT run http-sqli.yaml (SMB has no web form to inject into!)
This prevents false positives and saves time.
```

---

### The Lab Environment — Shahd's Responsibility

**English:** Shahd must keep all lab containers running and configured correctly. The lab has 4 subnets with specific vulnerable targets:

**عربي:** يجب على شهد إبقاء جميع حاويات المختبر تعمل وأن تكون مُهيّأة بشكل صحيح. يحتوي المختبر على 4 شبكات فرعية مع أهداف ضعيفة محددة:

```
LAB NETWORK MAP (Shahd owns this entirely):
خريطة شبكة المختبر (شهد تمتلك هذا بالكامل):

DMZ (10.10.10.0/24) — Internet-facing:
  10.10.10.10 → lab_webserver (Juice Shop) — SQLi, XSS, BOLA, SSRF, CVSS 9.5
  10.10.10.20 → lab_api_gateway (Nginx)    — Info disclosure, header leak, CVSS 6.0
  10.10.10.30 → lab_dns_server (CoreDNS)  — Zone transfer, DNS amplification, CVSS 5.0

CORP (10.10.20.0/24) — Internal office:
  10.10.20.10 → lab_fileserver (Samba)    — Weak creds admin/admin123, SMB enum, CVSS 8.0
  10.10.20.20 → lab_mailserver (GreenMail) — Plaintext SMTP/POP3, user enum, CVSS 7.0
  10.10.20.40 → lab_workstation (Nginx)   — Internal network info disclosure, CVSS 4.0

DATA (10.10.30.0/24) — Database tier:
  10.10.30.10 → lab_database (PostgreSQL) — Weak password, no SSL, CVSS 9.0
  10.10.30.20 → lab_redis_cache (Redis)   — No auth, protected-mode off, CVSS 8.5

MGMT (10.10.40.0/24) — Monitoring:
  10.10.40.10 → lab_traffic_gen           — Generates realistic background traffic
  10.10.40.20 → lab_log_shipper           — Forwards logs to Elasticsearch/Wazuh
```

**Lab management commands Shahd runs daily:**
```powershell
# Check lab status
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status

# Start lab
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 start

# View logs from a specific container
docker logs lab_webserver --tail 50
docker logs lab_fileserver --tail 50

# Test that a vulnerable service is reachable
curl http://localhost:3000          # Juice Shop
curl http://localhost:8081          # API Gateway
```

---

### The 3 Demo Scenarios Shahd Must Document

**English:** For the university presentation, Shahd must write 3 scenario files that explain exactly what vulnerability is being demonstrated and what the examiner should see on screen.

**عربي:** لتقديم الجامعة، يجب على شهد كتابة 3 ملفات سيناريو تشرح بالضبط الثغرة المُوضَّحة وما يجب أن يراه الممتحن على الشاشة.

**Scenario 1: SQL Injection (lab_webserver — Juice Shop)**
```
Target: http://10.10.10.10:3000
What happens: AttackAgent sends: ' OR '1'='1' in login form
Expected Nmap finding: Port 3000 open, HTTP service
Expected Nuclei finding: SQLi template matches
Expected dashboard: Risk Score 95/100, CRITICAL severity card
```

**Scenario 2: SMB Weak Credentials (lab_fileserver)**
```
Target: 10.10.20.10 (port 4445)
What happens: Nuclei smb-default-creds template tries admin/admin123
Expected: Login succeeds → CRITICAL finding created
Expected dashboard: "Disable default SMB credentials" action item
```

**Scenario 3: Unauthenticated Redis (lab_redis_cache)**
```
Target: 10.10.30.20 (port 6380)
What happens: Nuclei redis-unauth template sends PING
Expected: Redis responds without password → HIGH finding
Expected dashboard: Risk Score 85/100, "Unauthenticated Redis" in findings list
```

---

## What Shahd Must Learn | ما يجب على شهد تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| Nmap scan flags: `-sV`, `-sS`, `-O`, `-A`, `--script=` | Run the right scan for each target type | تشغيل المسح الصحيح لكل نوع هدف |
| Nmap NSE (Nmap Scripting Engine) | Understand `vulners` and `smb-os-discovery` scripts | فهم الـ scripts |
| Nuclei YAML template structure | Read templates, understand what they test | قراءة القوالب وفهم ما تختبره |
| OpenVAS GMP API (`python-gvm`) | `create_task()`, `start_task()`, `get_results()` | إدارة مهام OpenVAS |
| Docker networking: subnets, DNS resolution | Debug why scanner can't reach lab targets | تصحيح عدم وصول الماسح |
| OWASP Top 10 (2021) — ALL 10 categories | Correctly explain findings to examiners | شرح النتائج للممتحنين بشكل صحيح |

**Resources | الموارد:**
- Nmap book: https://nmap.org/book/man.html
- Nuclei docs: https://docs.projectdiscovery.io/tools/nuclei/overview
- OpenVAS GMP: https://greenbone.github.io/python-gvm/
- OWASP Top 10: https://owasp.org/Top10/

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Add DVWA + 2 more vulnerable lab nodes; verify all 10 containers run | إضافة عقد مختبر ضعيفة |
| 11 | Write 3 attack scenario docs; integrate IDS simulation in Wazuh | كتابة وثائق سيناريوهات الهجوم |
| 12 | Capture live traffic with TShark during scan; export PCAP for demo | التقاط حركة مرور حية |
| 13 | Full end-to-end scan on all lab containers; verify findings in DB | مسح شامل على جميع الحاويات |

---

## Presentation Duty | دور التقديم

**English:** Shahd presents the 5-minute **Security & Lab walkthrough** — showing the lab topology diagram, demonstrating the SMB attack scenario live (scanner finds admin/admin123 → CRITICAL alert), and explaining why deterministic tool chaining prevents alert fatigue.

**عربي:** شهد تقدّم مقطع **جولة الأمن والمختبر** لمدة 5 دقائق — تُظهر مخطط طوبولوجيا المختبر، وتُوضّح سيناريو هجوم SMB مباشرةً (الماسح يجد admin/admin123 → تنبيه حرج)، وتشرح لماذا يمنع التسلسل الحتمي تعب التنبيهات.
