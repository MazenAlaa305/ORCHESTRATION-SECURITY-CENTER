# Reem Amin — Backend Sub-Leader
# ريم أمين — مسؤولة الفريق الفرعي للـ Backend

> **Sub-Team:** 1 — Backend & AI Core | **الفريق الفرعي:** 1 — Backend والذكاء الاصطناعي
> **Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic, JWT, Bcrypt

---

## Role Summary | ملخص الدور

**English:** Reem owns the entire FastAPI backend — every API endpoint, the database schema, authentication system, and dependency injection layer. She is the technical gatekeeper for all backend code: nothing reaches `main` without her review. She also runs the daily Sub-Team 1 standup (10 minutes every morning).

**عربي:** ريم تمتلك الـ backend بالكامل — كل نقطة نهاية API، مخطط قاعدة البيانات، نظام المصادقة، وطبقة حقن التبعيات. هي الحارسة التقنية لكل كود الـ backend: لا شيء يصل إلى `main` بدون مراجعتها. كما تدير الستاند أب اليومي للفريق الفرعي 1 (10 دقائق كل صباح).

---

## Files She Owns | الملفات التي تمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `backend/app/main.py` | FastAPI app entry: CORS, lifespan, WebSocket, health endpoint | نقطة دخول FastAPI: CORS، دورة الحياة، WebSocket، فحص الصحة |
| `backend/app/core/config.py` | All environment variable settings (reads `.env`) | جميع إعدادات متغيرات البيئة |
| `backend/app/core/database.py` | SQLAlchemy sync + async session factories | مصانع جلسات SQLAlchemy المتزامنة وغير المتزامنة |
| `backend/app/core/security.py` | JWT creation/decoding, bcrypt password hashing | إنشاء/فك JWT، تشفير كلمات المرور bcrypt |
| `backend/app/api/api.py` | Router registry — registers all v1 route groups | سجل الموجّهات — يسجل جميع مجموعات مسارات v1 |
| `backend/app/api/deps.py` | FastAPI `Depends()` — `get_db`, `get_current_user` | حقن التبعيات — `get_db`، `get_current_user` |
| `backend/app/api/v1/endpoints/auth.py` | Login, logout, /me, change-password | تسجيل الدخول، الخروج، /me، تغيير كلمة المرور |
| `backend/app/api/v1/endpoints/dashboard.py` | KPI snapshot, risk overview, action items | لقطة KPI، نظرة عامة على المخاطر، عناصر الإجراءات |
| `backend/app/api/v1/endpoints/scans.py` | Scan CRUD, `POST /scans/ai` AI trigger | CRUD المسح، تشغيل المسح الذكي |
| `backend/app/api/v1/endpoints/targets.py` | Target CRUD + discovery | CRUD الأهداف + الاكتشاف |
| `backend/app/api/v1/endpoints/reports.py` | Report generation, PDF export | توليد التقارير، تصدير PDF |
| `backend/app/models/scan.py` | ALL ORM models (Target, Scan, Vulnerability, etc.) | جميع نماذج ORM |
| `backend/app/models/user.py` | User model with RBAC roles | نموذج المستخدم مع أدوار RBAC |
| `backend/app/schemas/scan.py` | Pydantic request/response schemas | مخططات Pydantic للطلبات والاستجابات |
| `backend/alembic/env.py` | Migration runner configuration | إعداد تشغيل الترحيل |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `backend/app/api/v1/endpoints/rbac.py` | Role management endpoints (assign/revoke) | نقاط نهاية إدارة الأدوار |
| `backend/tests/test_auth.py` | Auth endpoint unit tests | اختبارات وحدة نقاط نهاية المصادقة |
| `backend/tests/test_rbac.py` | Role-based access control tests | اختبارات التحكم في الوصول القائم على الأدوار |
| `backend/alembic/versions/002_add_rbac.py` | DB migration: add role column to users | ترحيل قاعدة البيانات: إضافة عمود الدور |

---

## Key Code Explained | شرح الكود الرئيسي

### `backend/app/main.py` — The Entry Point

**English:** This is the first file Python runs when the backend starts. It does 4 important things:

1. **Lifespan context manager** — runs setup code BEFORE the app accepts requests and cleanup code AFTER it shuts down
2. **CORS middleware** — allows the React frontend (running on a different port) to call the API
3. **API router inclusion** — attaches all endpoint groups (scans, targets, auth, etc.)
4. **WebSocket endpoint** at `/ws/logs` — browsers connect here to receive real-time scan events

**عربي:** هذا أول ملف يشغّله Python عند بدء الـ backend. يقوم بـ 4 أشياء مهمة:

1. **مدير سياق دورة الحياة** — يشغّل كود الإعداد قبل قبول الطلبات وكود التنظيف بعد الإيقاف
2. **وسيط CORS** — يسمح لـ React frontend (على منفذ مختلف) باستدعاء API
3. **تضمين موجّه API** — يُرفق جميع مجموعات نقاط النهاية (المسوح، الأهداف، المصادقة، إلخ)
4. **نقطة نهاية WebSocket** على `/ws/logs` — المتصفحات تتصل هنا لاستقبال أحداث المسح الفورية

```python
# The lifespan function runs at startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ON STARTUP:
    # 1. Check alembic DB migration version
    # 2. Reap orphaned scans (scans stuck in RUNNING state)
    # 3. Load runtime config overrides from DB
    # 4. Seed default admin user (admin@local / Admin@1234) if no users exist
    # 5. Start the Redis → WebSocket event bridge task
    _redis_listener_task = asyncio.create_task(redis_event_listener())
    yield  # ← app is LIVE here, serving requests
    # ON SHUTDOWN: cancel the Redis listener task
    _redis_listener_task.cancel()
```

**عربي للكود:**
```python
# دالة lifespan تعمل عند البدء والإيقاف
@asynccontextmanager
async def lifespan(app: FastAPI):
    # عند البدء:
    # 1. تحقق من إصدار ترحيل قاعدة بيانات alembic
    # 2. تخلّص من المسوح اليتيمة (المسوح العالقة في حالة RUNNING)
    # 3. حمّل تجاوزات الإعداد من قاعدة البيانات
    # 4. اشرع في إنشاء مستخدم admin افتراضي إذا لم يكن هناك مستخدمون
    # 5. ابدأ جسر أحداث Redis → WebSocket
    yield  # ← التطبيق حي هنا يخدم الطلبات
    # عند الإيقاف: ألغِ مهمة مستمع Redis
```

---

### `backend/app/core/security.py` — JWT & Passwords

**English:** This file handles two security concerns:

**Passwords** — uses `bcrypt` to hash passwords. Bcrypt is a one-way hash: you can never recover the original password from the hash. When a user logs in, we hash what they typed and compare it to the stored hash.

**JWT tokens** — a JSON Web Token is a signed string that proves "I am user X with role Y, and this proof expires at time Z". It has three parts: header.payload.signature. The backend signs it with `JWT_SECRET` and any tampering breaks the signature.

**عربي:** هذا الملف يتعامل مع مخاوف أمنية اثنتين:

**كلمات المرور** — يستخدم `bcrypt` لتشفير كلمات المرور. Bcrypt تشفير أحادي الاتجاه: لا يمكن استعادة كلمة المرور الأصلية من التشفير. عند تسجيل دخول المستخدم، نقوم بتشفير ما كتبه ونقارنه بالتشفير المخزّن.

**رموز JWT** — رمز JSON Web Token هو نص موقّع يُثبت "أنا المستخدم X بالدور Y، وهذا الدليل ينتهي في الوقت Z". له ثلاثة أجزاء: رأس.حمولة.توقيع. الـ backend يوقّعه بـ `JWT_SECRET` وأي تلاعب يُفسد التوقيع.

```python
def hash_password(plain: str) -> str:
    # bcrypt.hashpw generates a new random salt each time
    # Same password → different hash every time (prevents rainbow table attacks)
    return _bcrypt_lib.hashpw(plain.encode(), _bcrypt_lib.gensalt()).decode()

def create_access_token(subject: str, role: str, expires_delta=None) -> str:
    payload = {
        "sub": subject,    # "sub" = subject = the user's email
        "role": role,      # "admin" | "analyst" | "viewer"
        "exp": expire,     # expiry timestamp — JWT auto-rejects after this
        "iat": now,        # "issued at" timestamp
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
```

**عربي للكود:**
```python
def hash_password(plain: str) -> str:
    # bcrypt.hashpw يولّد ملحًا عشوائيًا جديدًا في كل مرة
    # نفس كلمة المرور → تشفير مختلف في كل مرة (يمنع هجمات جدول قوس قزح)

def create_access_token(subject: str, role: str) -> str:
    payload = {
        "sub": subject,    # "sub" = الموضوع = بريد المستخدم
        "role": role,      # "admin" | "analyst" | "viewer"  
        "exp": expire,     # وقت انتهاء الصلاحية — JWT يرفض تلقائيًا بعد هذا
        "iat": now,        # وقت الإصدار
    }
```

---

### `backend/app/api/v1/endpoints/auth.py` — Login/Logout

**English:** The login endpoint (`POST /auth/login`) does these steps:
1. Check if any users exist → if not, create the default admin automatically
2. Find the user by email in the database
3. Use `verify_password()` to compare the submitted password with the stored bcrypt hash
4. If correct: update `last_login_at`, issue a JWT token, return it
5. If wrong: return HTTP 401 Unauthorized

**عربي:** نقطة نهاية تسجيل الدخول (`POST /auth/login`) تقوم بهذه الخطوات:
1. تحقق من وجود أي مستخدمين → إذا لم يكن هناك، أنشئ المشرف الافتراضي تلقائيًا
2. ابحث عن المستخدم بالبريد الإلكتروني في قاعدة البيانات
3. استخدم `verify_password()` لمقارنة كلمة المرور المُقدَّمة بالتشفير bcrypt المخزّن
4. إذا كانت صحيحة: حدّث `last_login_at`، أصدر رمز JWT، أرجعه
5. إذا كانت خاطئة: أرجع HTTP 401 غير مصرح

```python
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value, ...)
```

---

## What Reem Must Learn | ما يجب على ريم تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| FastAPI `Depends()` injection | Build RBAC middleware | بناء وسيط RBAC |
| JWT structure (header.payload.signature) | Debug auth issues confidently | تصحيح مشاكل المصادقة بثقة |
| SQLAlchemy async sessions | All new endpoints use async | جميع نقاط النهاية الجديدة غير متزامنة |
| Alembic `autogenerate` + `upgrade head` | Run DB migrations safely | تشغيل ترحيل قاعدة البيانات |
| Pydantic v2 validators | Schema validation for new endpoints | التحقق من صحة المخطط |
| RBAC patterns (role guard decorator) | Implement `require_role()` dependency | تطبيق تبعية `require_role()` |

**Resources | الموارد:**
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- JWT.io (visualize tokens): https://jwt.io
- SQLAlchemy Async: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Implement RBAC: `role` field on User, `require_role()` dependency | تطبيق RBAC: حقل الدور، تبعية `require_role()` |
| 11 | Wire PDF export: `GET /reports/{id}/pdf` → `pdf_generator.py` | ربط تصدير PDF |
| 12 | API cleanup: consistent error shapes, structured logging, rate limiting | تنظيف API: أشكال أخطاء موحّدة، تسجيل منظّم |
| 13 | Fix all UAT bugs; finalize Swagger docs; freeze backend | إصلاح أخطاء UAT؛ إنهاء Swagger؛ تجميد الـ backend |

---

## Presentation Duty | دور التقديم

**English:** Reem presents the 5-minute **Backend & AI walkthrough** segment. She explains: how FastAPI routes work, how the JWT auth system protects the platform, and how the AgentOrchestrator pipeline is triggered via `POST /scans/ai`.

**عربي:** ريم تقدّم مقطع **جولة الـ Backend والذكاء الاصطناعي** لمدة 5 دقائق. تشرح: كيف تعمل مسارات FastAPI، كيف يحمي نظام JWT المصادقة المنصة، وكيف يُشغَّل خط AgentOrchestrator عبر `POST /scans/ai`.
