# Mohamed Shaban — Task Queue & Docker Orchestration
# محمد شعبان — قائمة المهام وتنسيق Docker

> **Sub-Team:** 1 — Backend & AI Core | **الفريق الفرعي:** 1 — Backend والذكاء الاصطناعي
> **Stack:** Celery, Redis, Docker Compose, asyncio, WebSocket, Python

---

## Role Summary | ملخص الدور

**English:** Shaban owns the "plumbing" of Orchestration Security Center — the invisible infrastructure that makes everything run. When you click "Scan", his code picks up that request (Celery), runs it in the background (worker), sends live updates to the browser (Redis pub/sub → WebSocket), and ensures Docker containers stay healthy. He is also the first line of defense when a container crashes.

**عربي:** شعبان يمتلك "السباكة" الخاصة بـ Orchestration Security Center — البنية التحتية غير المرئية التي تجعل كل شيء يعمل. عندما تنقر "مسح"، كوده يلتقط هذا الطلب (Celery)، يشغّله في الخلفية (عامل)، يرسل تحديثات فورية للمتصفح (Redis pub/sub → WebSocket)، ويضمن بقاء حاويات Docker بصحة جيدة. هو أيضًا الخط الأول للدفاع عند تعطّل حاوية.

---

## Files He Owns | الملفات التي يمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/app/services/scan_tasks.py` | Celery task: `run_full_scan()` — the main scan pipeline | مهمة Celery: خط أنابيب المسح الرئيسي |
| `backend/app/services/event_publisher.py` | Redis pub/sub publisher — broadcasts scan events | ناشر Redis pub/sub — يبثّ أحداث المسح |
| `backend/app/services/ws_manager.py` | WebSocket connection manager + broadcast | مدير اتصالات WebSocket + البث |
| `backend/app/services/scan_reaper.py` | Kills stalled scans stuck in RUNNING state | يقتل المسوح العالقة في حالة RUNNING |
| `backend/app/core/celery_app.py` | Celery app factory + beat schedule configuration | مصنع تطبيق Celery + جدول beat |
| `docker-compose.yml` | (shared with Omar) — celery_worker + celery_beat services | (مشترك مع عمر) — خدمات celery |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `backend/app/services/task_monitor.py` | API endpoint to check Celery task status | نقطة نهاية API لفحص حالة مهام Celery |
| `backend/tests/test_scan_tasks.py` | Celery task tests using eager (sync) mode | اختبارات مهام Celery |
| `infra/healthcheck.sh` | Shell script that checks all containers are healthy | سكريبت shell يفحص صحة جميع الحاويات |

---

## Key Code Explained | شرح الكود الرئيسي

### `backend/app/services/scan_tasks.py` — The Scan Pipeline

**English:** This is the most important file Shaban owns. When the backend receives `POST /scans/ai`, it creates a Celery task. The Celery **worker** (running in a separate container `sme_dashboard_celery`) picks up the task from the Redis queue and calls this function.

**عربي:** هذا أهم ملف يمتلكه شعبان. عندما يستقبل الـ backend طلب `POST /scans/ai`، ينشئ مهمة Celery. **عامل** Celery (يعمل في حاوية منفصلة `sme_dashboard_celery`) يلتقط المهمة من قائمة Redis ويستدعي هذه الدالة.

```python
def _run_async(coro):
    """
    Celery workers are SYNCHRONOUS but our scan code is ASYNC.
    This helper creates a fresh event loop to run async code inside
    a sync Celery task — without this, you get "Future attached to 
    a different loop" errors.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
        asyncio.set_event_loop(None)
```

**عربي للكود:**
```python
def _run_async(coro):
    """
    عمال Celery متزامنون لكن كود المسح غير متزامن.
    يُنشئ هذا المساعد حلقة أحداث جديدة لتشغيل الكود غير المتزامن
    داخل مهمة Celery المتزامنة.
    """
```

```python
def _make_async_session():
    """
    Creates a FRESH async DB session in the Celery worker.
    Why fresh? Because the module-level engine in the main process
    is attached to the main process's event loop — workers can't use it.
    Each Celery task needs its own engine bound to its own event loop.
    """
    engine = create_async_engine(settings.ASYNC_DATABASE_URL, pool_pre_ping=True)
    return engine, async_sessionmaker(engine, ...)
```

**عربي للكود:**
```python
def _make_async_session():
    """
    ينشئ جلسة DB غير متزامنة جديدة في عامل Celery.
    لماذا جديدة؟ لأن المحرك على مستوى الوحدة في العملية الرئيسية
    مرتبط بحلقة أحداث العملية الرئيسية — لا يمكن للعمال استخدامه.
    كل مهمة Celery تحتاج محركها الخاص المرتبط بحلقة أحداثها الخاصة.
    """
```

**The scan flow inside `scan_tasks.py`:**

```
@celery_app.task
def run_full_scan(scan_id, target_url):
    
    Phase 1: NMAP
    ─────────────
    nmap_wrapper.scan_target(target_url)
    → Discovers open ports, services, OS
    → Saves ScanAsset + AssetService records to DB
    → Publishes "RECON_COMPLETE" event to Redis

    Phase 2: NUCLEI (deep scan)
    ─────────────────────────────
    nuclei_wrapper.scan(target_url, templates)
    → Runs vulnerability templates against discovered services
    → Creates Vulnerability records in DB
    → Publishes "ATTACK_COMPLETE" event to Redis

    Phase 3: AI RISK ENGINE
    ─────────────────────────
    UnifiedRiskEngine.calculate_scan_risk_v2(scan)
    → Calculates risk score (0-100) + health score
    → Generates action items
    → Publishes "RISK_UPDATE" event to Redis (frontend re-renders)

    Phase 4: AI ADVISORY (optional)
    ─────────────────────────────────
    IntelligenceAgent.execute(context)
    → Calls Gemini API for plain-English explanations
    → Saves to scan.agent_thoughts

    FINALLY: Set scan.status = COMPLETED (or FAILED)
```

**عربي لسير عمل المسح:**
```
المرحلة 1: NMAP — يكتشف المنافذ المفتوحة والخدمات
المرحلة 2: NUCLEI — يشغّل قوالب الثغرات على الخدمات المكتشفة
المرحلة 3: محرك المخاطر AI — يحسب درجة الخطر
المرحلة 4: استشارة AI (اختيارية) — Gemini يولّد تفسيرات
أخيرًا: تعيين scan.status = COMPLETED أو FAILED
```

---

### `backend/app/services/event_publisher.py` — Redis Pub/Sub

**English:** This file is the bridge between the Celery scan worker and the browser. The scan worker cannot directly send messages to the browser — it's in a different process. Instead:

1. Worker publishes event to Redis channel `ws_events`
2. The `redis_event_listener` in `main.py` subscribes to `ws_events`
3. When a new message arrives, it broadcasts it to all connected WebSocket clients
4. The browser's `RealTimeContext.jsx` receives it and updates the UI

**عربي:** هذا الملف هو الجسر بين عامل مسح Celery والمتصفح. عامل المسح لا يستطيع إرسال رسائل مباشرة للمتصفح — إنه في عملية مختلفة. بدلًا من ذلك:

1. العامل ينشر حدثًا إلى قناة Redis `ws_events`
2. `redis_event_listener` في `main.py` يشترك في `ws_events`
3. عند وصول رسالة جديدة، يبثّها لجميع عملاء WebSocket المتصلين
4. `RealTimeContext.jsx` في المتصفح يستقبلها ويحدّث الواجهة

```python
# Event format published to Redis:
{
    "type": "RISK_UPDATE",          # Event type (frontend reducer matches on this)
    "payload": {
        "scan_id": "abc-123",
        "overall_score": 87,
        "health_score": 13,
        "counts": {"critical": 2, "high": 5, "medium": 3, "low": 1}
    }
}

# Other event types:
# "SCAN_STARTED"   → frontend shows scanning banner
# "LOG_STREAM"     → appended to OrchestrationFeed
# "SCAN_PROGRESS"  → updates progress bar
# "ALERT_NEW"      → new security alert
# "SCAN_COMPLETE"  → frontend triggers data refresh
```

---

### `backend/app/services/scan_reaper.py` — Stalled Scan Cleanup

**English:** If the Celery worker crashes mid-scan, the scan stays in `RUNNING` status forever — the dashboard shows it as always scanning. The reaper runs at startup and finds any scans that have been `RUNNING` for more than 10 minutes and marks them as `FAILED`.

**عربي:** إذا تعطّل عامل Celery في منتصف المسح، يبقى المسح في حالة `RUNNING` إلى الأبد — تعرض لوحة التحكم أنه يمسح دائمًا. يعمل الحاصد عند البدء ويجد أي مسوح كانت `RUNNING` لأكثر من 10 دقائق ويُعلّمها كـ `FAILED`.

```python
async def reap_orphan_scans(db: AsyncSession):
    # Find scans stuck in RUNNING for > 10 minutes
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    orphaned = db.query(Scan).filter(
        Scan.status == ScanStatus.RUNNING,
        Scan.start_time < cutoff
    ).all()
    
    for scan in orphaned:
        scan.status = ScanStatus.FAILED
        scan.end_time = datetime.utcnow()
    db.commit()
```

---

## What Shaban Must Learn | ما يجب على شعبان تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| Celery task lifecycle: `@app.task`, `apply_async()`, `retry()` | Understand how scan jobs are queued and retried | فهم كيفية وضع مهام المسح في قائمة الانتظار وإعادة المحاولة |
| Redis pub/sub: `publish()` / `subscribe()` / `listen()` | Understand the event bridge | فهم جسر الأحداث |
| `asyncio.new_event_loop()` — why workers need fresh loops | Debug "Future attached to different loop" errors | تصحيح أخطاء "Future مرتبط بحلقة مختلفة" |
| Docker `healthcheck` YAML syntax | Add healthchecks to all services | إضافة فحوصات صحة لجميع الخدمات |
| `docker logs`, `docker stats` | Diagnose container crashes | تشخيص تعطّل الحاويات |
| `pytest` with Celery `CELERY_TASK_ALWAYS_EAGER=True` | Test tasks without a real worker | اختبار المهام بدون عامل حقيقي |

**Resources | الموارد:**
- Celery docs: https://docs.celeryq.dev/en/stable/
- Redis pub/sub: https://redis.io/docs/manual/pubsub/
- aioredis: https://aioredis.readthedocs.io/

---

## Critical Blocker to Fix | العائق الحرج للإصلاح

**English:** The backend container is currently in a crash loop because `google-generativeai` was not installed (pip cache hit). Shaban must fix this:

**عربي:** حاوية الـ backend حاليًا في حلقة تعطّل لأن `google-generativeai` لم يُثبَّت (ضربة ذاكرة pip). يجب على شعبان إصلاح هذا:

```powershell
# Force clean rebuild — no cache
docker compose build --no-cache backend

# Recreate the container
docker compose up -d --force-recreate backend

# Verify healthy
docker logs sme_dashboard_backend --tail 30
curl http://localhost:8000/health
```

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Fix backend crash; add task status endpoint | إصلاح تعطّل الـ backend؛ إضافة نقطة حالة المهمة |
| 11 | Add `scan_reaper.py` to auto-kill stalled scans | إضافة حاصد المسوح المتوقفة |
| 12 | Docker Compose healthchecks for all services | فحوصات صحة Docker Compose |
| 13 | End-to-end test: trigger scan → task completes → DB updated | اختبار شامل |
