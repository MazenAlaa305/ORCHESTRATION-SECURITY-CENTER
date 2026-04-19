# Omar Kapil — Complete Role Guide
# دليل دور عمر كابيل الكامل

> **Role:** Team Leader + DevOps & QA Sub-Leader
> **الدور:** قائد الفريق + مسؤول البنية التحتية وضمان الجودة
>
> Everything in this file is something Omar owns, built, or must understand deeply.
> كل شيء في هذا الملف هو شيء يمتلكه عمر، أو بناه، أو يجب أن يفهمه بعمق.

---

## Part 1 — What is Omar's Overall Job?
## الجزء الأول — ما هو دور عمر بشكل عام؟

**English:**
Omar has two jobs at the same time. First, he is the **Team Leader** of all 11 members — he coordinates everyone, runs meetings, manages the GitHub repository, and makes sure the project moves forward. Second, he is the **Sub-Leader of Sub-Team 4 (DevOps/QA)** — he owns the Docker infrastructure, sets up the CI/CD pipeline, and ensures the entire platform can run reliably on any machine.

**عربي:**
عمر لديه وظيفتان في نفس الوقت. الأولى: هو **قائد الفريق** بالنسبة لكل الـ 11 عضو — يُنسّق بين الجميع، يدير الاجتماعات، يدير مستودع GitHub، ويتأكد أن المشروع يتقدم. الثانية: هو **مسؤول الفريق الفرعي 4 (DevOps/QA)** — يمتلك البنية التحتية الخاصة بـ Docker، يُعدّ خط CI/CD، ويضمن أن المنصة كلها تعمل بشكل موثوق على أي جهاز.

---

## Part 2 — The Files Omar Owns (All of Them)
## الجزء الثاني — الملفات التي يمتلكها عمر (جميعها)

| File | What It Does | ماذا تفعل |
|------|-------------|-----------|
| `docker-compose.yml` | Starts the main platform (7 services) | تشغيل المنصة الرئيسية (7 خدمات) |
| `docker-compose.lab.yml` | Starts the fake vulnerable network lab | تشغيل الشبكة الوهمية الضعيفة للاختبار |
| `start-lite.ps1` | One-command startup script | سكريبت تشغيل بأمر واحد |
| `lab_setup.ps1` | Manages the lab (start/stop/seed/reset) | يدير المختبر (تشغيل/إيقاف/بذر/إعادة ضبط) |
| `trigger_lab_scans.ps1` | Automatically triggers scans on all lab targets | يُشغّل المسح تلقائيًا على جميع أهداف المختبر |
| `infra/caddy/Caddyfile` | TLS reverse proxy — makes the site work on HTTPS | وكيل عكسي — يجعل الموقع يعمل على HTTPS |
| `HOW_TO_RUN.md` | Guide for running the entire project | دليل تشغيل المشروع بالكامل |
| `project_plan.md` | The master project plan — Omar keeps it updated | خطة المشروع الرئيسية — عمر يُبقيها محدّثة |

---

## Part 3 — docker-compose.yml (Line by Line)
## الجزء الثالث — شرح docker-compose.yml سطرًا بسطر

**English intro:**
This file tells Docker which services (containers) to start, how they connect, and what limits they have. Think of it as the recipe for the entire platform.

**عربي:**
هذا الملف يخبر Docker بالخدمات (الحاويات) التي يجب تشغيلها، وكيفية اتصالها ببعض، وما هي الحدود المفروضة عليها. فكّر فيه كوصفة للمنصة بالكامل.

---

### Service 1 — Caddy (TLS Reverse Proxy)
### الخدمة 1 — Caddy (وكيل عكسي مع TLS)

```yaml
caddy:
  image: caddy:2-alpine
  container_name: sme_dashboard_caddy
  ports:
    - "80:80"
    - "443:443"
```

**English:**
- `image: caddy:2-alpine` → Download the Caddy web server from Docker Hub (Alpine = small Linux image)
- `container_name: sme_dashboard_caddy` → The name of this container inside Docker
- `ports: "80:80"` → Map port 80 on your PC → port 80 inside the container (HTTP traffic)
- `ports: "443:443"` → Map port 443 on your PC → port 443 inside the container (HTTPS traffic — the secure web)

**عربي:**
- `image: caddy:2-alpine` → حمّل خادم Caddy من Docker Hub (Alpine = صورة Linux صغيرة الحجم)
- `container_name: sme_dashboard_caddy` → اسم هذه الحاوية داخل Docker
- `ports: "80:80"` → ارتبط المنفذ 80 على جهازك بالمنفذ 80 داخل الحاوية (حركة HTTP)
- `ports: "443:443"` → ارتبط المنفذ 443 على جهازك بالمنفذ 443 داخل الحاوية (HTTPS — الويب الآمن)

```yaml
  volumes:
    - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
    - caddy_data:/data
    - caddy_config:/config
```

**English:**
- `./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro` → Take the `Caddyfile` from your computer and place it inside the container at `/etc/caddy/Caddyfile`. `:ro` means read-only — the container can read it but not modify it.
- `caddy_data:/data` → A persistent Docker volume for Caddy's SSL certificate data (survives container restarts)
- `caddy_config:/config` → A persistent Docker volume for Caddy's runtime config

**عربي:**
- `./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro` → خذ ملف `Caddyfile` من جهازك وضعه داخل الحاوية في المسار `/etc/caddy/Caddyfile`. `:ro` تعني للقراءة فقط — الحاوية تقرأه لكن لا تعدّل عليه.
- `caddy_data:/data` → وحدة تخزين Docker دائمة لشهادات SSL الخاصة بـ Caddy (تبقى حتى بعد إعادة تشغيل الحاوية)
- `caddy_config:/config` → وحدة تخزين Docker دائمة لإعدادات Caddy أثناء التشغيل

```yaml
  depends_on:
    - backend
    - frontend
  deploy:
    resources:
      limits:
        cpus: '0.25'
        memory: 64M
```

**English:**
- `depends_on: backend, frontend` → Do NOT start Caddy until the backend and frontend containers have started first. Caddy needs them running to forward traffic to.
- `cpus: '0.25'` → Limit this container to use only 25% of one CPU core
- `memory: 64M` → Limit this container to use only 64 megabytes of RAM

**عربي:**
- `depends_on: backend, frontend` → لا تبدأ Caddy حتى تنطلق الـ backend و frontend أولًا. Caddy يحتاج أن يكونا يعملان لتحويل الطلبات إليهما.
- `cpus: '0.25'` → اقصر هذه الحاوية على استخدام 25% فقط من نواة CPU واحدة
- `memory: 64M` → اقصرها على استخدام 64 ميجابايت فقط من الذاكرة

---

### Service 2 — Backend (FastAPI)
### الخدمة 2 — Backend (FastAPI)

```yaml
backend:
  build: ./backend
  container_name: sme_dashboard_backend
  ports:
    - "8000:8000"
```

**English:**
- `build: ./backend` → Don't download a pre-built image. Instead, build the Docker image from the `backend/` folder using its `Dockerfile`. This installs all Python packages and copies the code.
- `container_name: sme_dashboard_backend` → Name for this container
- `ports: "8000:8000"` → Port 8000 on your PC connects to port 8000 inside the container — this is where the FastAPI server runs

**عربي:**
- `build: ./backend` → لا تحمّل صورة جاهزة. بدلًا من ذلك، ابنِ صورة Docker من مجلد `backend/` باستخدام الـ `Dockerfile` الخاص به. هذا يثبّت كل حزم Python وينسخ الكود.
- `container_name: sme_dashboard_backend` → اسم هذه الحاوية
- `ports: "8000:8000"` → المنفذ 8000 على جهازك يتصل بالمنفذ 8000 داخل الحاوية — هنا يعمل خادم FastAPI

```yaml
  environment:
    - DATABASE_URL=postgresql://user:password@db:5432/sme_cyber_db
    - REDIS_URL=redis://redis:6379/0
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - JWT_SECRET=${JWT_SECRET}
    - CREDENTIAL_ENCRYPTION_KEY=${CREDENTIAL_ENCRYPTION_KEY}
    - OPENVAS_HOST=openvas
    - OPENVAS_PORT=9390
    - OPENVAS_CONNECTION_TYPE=tls
    - OPENVAS_ENABLED=false
    - ELASTICSEARCH_URL=http://elasticsearch:9200
    - SIEM_ENABLED=false
    - WAZUH_API_URL=https://wazuh:55000
    - WAZUH_API_USER=wazuh
    - WAZUH_API_PASSWORD=wazuh
    - N8N_WEBHOOK_URL=http://n8n:5678/webhook/
    - SOAR_ENABLED=false
```

**English (each line):**
- `DATABASE_URL=postgresql://user:password@db:5432/sme_cyber_db` → Tell the backend how to connect to the PostgreSQL database. Format: `protocol://username:password@hostname:port/database_name`. The hostname is `db` because that is what the PostgreSQL container is named in this file.
- `REDIS_URL=redis://redis:6379/0` → Tell the backend how to connect to Redis. `/0` means database number 0 (Redis has 16 databases by default).
- `GEMINI_API_KEY=${GEMINI_API_KEY}` → The `${}` syntax reads this from a `.env` file on your computer. This is the Google AI API key for the AI advisor.
- `JWT_SECRET=${JWT_SECRET}` → The secret key used to sign JWT authentication tokens. If someone knows this secret, they can forge login tokens — so it MUST be kept private in `.env`.
- `CREDENTIAL_ENCRYPTION_KEY=${CREDENTIAL_ENCRYPTION_KEY}` → Key used to encrypt stored target credentials (e.g., scan usernames/passwords) in the database.
- `OPENVAS_ENABLED=false` → OpenVAS deep vulnerability scanner is disabled by default (it needs 4+ GB RAM).
- `SIEM_ENABLED=false` → Wazuh/Elasticsearch SIEM is disabled by default (only available in `--profile full`).
- `SOAR_ENABLED=false` → n8n SOAR automation is disabled by default.

**عربي (كل سطر):**
- `DATABASE_URL=postgresql://user:password@db:5432/sme_cyber_db` → أخبر الـ backend كيف يتصل بقاعدة بيانات PostgreSQL. الصيغة: `protocol://اسم_مستخدم:كلمة_مرور@اسم_الخادم:المنفذ/اسم_قاعدة_البيانات`. اسم الخادم هو `db` لأن هذا هو اسم حاوية PostgreSQL في هذا الملف.
- `REDIS_URL=redis://redis:6379/0` → أخبر الـ backend كيف يتصل بـ Redis. `/0` تعني قاعدة البيانات رقم 0 (Redis يحتوي على 16 قاعدة بيانات افتراضيًا).
- `GEMINI_API_KEY=${GEMINI_API_KEY}` → صيغة `${}` تقرأ هذا من ملف `.env` على جهازك. هذا هو مفتاح Google AI API للمستشار الذكي.
- `JWT_SECRET=${JWT_SECRET}` → المفتاح السري المستخدم لتوقيع رموز JWT لتسجيل الدخول. إذا عرف أحدهم هذا السر، يمكنه تزوير رموز الدخول — لذا يجب إبقاؤه سريًا في `.env`.
- `CREDENTIAL_ENCRYPTION_KEY=${CREDENTIAL_ENCRYPTION_KEY}` → مفتاح تشفير بيانات اعتماد الأهداف المخزنة (مثل أسماء مستخدمين وكلمات مرور المسح) في قاعدة البيانات.
- `OPENVAS_ENABLED=false` → ماسح الثغرات OpenVAS معطّل افتراضيًا (يحتاج 4+ جيجابايت RAM).
- `SIEM_ENABLED=false` → نظام SIEM الخاص بـ Wazuh/Elasticsearch معطّل افتراضيًا (متاح فقط مع `--profile full`).
- `SOAR_ENABLED=false` → أتمتة n8n SOAR معطّلة افتراضيًا.

```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_started
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
```

**English:**
- `/var/run/docker.sock:/var/run/docker.sock:ro` → This gives the backend container access to Docker itself. The backend needs this to be able to manage lab containers (start/stop/inspect). `:ro` = read-only.
- `depends_on: db: condition: service_healthy` → Do NOT start the backend until PostgreSQL has passed its health check (confirmed it can accept connections). This prevents "database connection refused" errors on startup.
- `depends_on: redis: condition: service_started` → Start after Redis container has started (Redis doesn't need a health check — it's fast).
- `cpus: '1.0'` → Backend can use up to 1 full CPU core
- `memory: 512M` → Backend can use up to 512 MB RAM

**عربي:**
- `/var/run/docker.sock:/var/run/docker.sock:ro` → يمنح هذا حاوية الـ backend وصولًا إلى Docker نفسه. الـ backend يحتاج هذا ليستطيع إدارة حاويات المختبر (تشغيل/إيقاف/فحص). `:ro` = للقراءة فقط.
- `depends_on: db: condition: service_healthy` → لا تبدأ الـ backend حتى تجتاز PostgreSQL فحص الصحة (تأكيد أنها تستطيع قبول الاتصالات). يمنع هذا خطأ "رُفض الاتصال بقاعدة البيانات" عند البدء.
- `depends_on: redis: condition: service_started` → ابدأ بعد أن تنطلق حاوية Redis (Redis لا يحتاج فحص صحة — إنه سريع).
- `cpus: '1.0'` → يمكن للـ backend استخدام حتى نواة CPU واحدة كاملة
- `memory: 512M` → يمكنه استخدام حتى 512 ميجابايت من الذاكرة

---

### Service 3 — Frontend (React/Vite)
### الخدمة 3 — Frontend (React/Vite)

```yaml
frontend:
  build: ./frontend
  container_name: sme_dashboard_frontend
  volumes:
    - ./frontend:/app
    - /app/node_modules
  environment:
    - VITE_API_URL=https://localhost/api/v1
  depends_on:
    - backend
```

**English:**
- `build: ./frontend` → Build the React app Docker image from the `frontend/` folder and its `Dockerfile`. This installs all npm packages.
- `volumes: ./frontend:/app` → Mount your local `frontend/` folder inside the container at `/app`. This means when you edit a `.jsx` file on your PC, the Vite dev server inside the container sees the change instantly (hot reload).
- `/app/node_modules` → Keep `node_modules` inside the container — do NOT sync it with your PC folder. This prevents 200,000 files from being copied back to Windows.
- `VITE_API_URL=https://localhost/api/v1` → Tell the React app where to send API calls. It goes to `https://localhost/api/v1` — which Caddy intercepts and forwards to the backend container.

**عربي:**
- `build: ./frontend` → ابنِ صورة Docker لتطبيق React من مجلد `frontend/` وملف `Dockerfile` الخاص به. هذا يثبّت كل حزم npm.
- `volumes: ./frontend:/app` → ربط مجلد `frontend/` المحلي داخل الحاوية في المسار `/app`. هذا يعني أنك عندما تعدّل ملف `.jsx` على جهازك، يرى Vite التغيير فورًا داخل الحاوية (إعادة التحميل الفوري).
- `/app/node_modules` → اتركوا `node_modules` داخل الحاوية فقط — لا تزامنها مع مجلد Windows. يمنع هذا نسخ 200,000 ملف إلى Windows.
- `VITE_API_URL=https://localhost/api/v1` → أخبر تطبيق React أين يرسل طلبات API. يذهب إلى `https://localhost/api/v1` — وهو ما يعترضه Caddy ويحوّله إلى حاوية الـ backend.

---

### Service 4 — db (PostgreSQL Database)
### الخدمة 4 — db (قاعدة البيانات PostgreSQL)

```yaml
db:
  image: postgres:15-alpine
  container_name: sme_dashboard_db
  environment:
    - POSTGRES_USER=user
    - POSTGRES_PASSWORD=password
    - POSTGRES_DB=sme_cyber_db
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U user -d sme_cyber_db"]
    interval: 5s
    timeout: 5s
    retries: 10
    start_period: 10s
```

**English:**
- `image: postgres:15-alpine` → Use PostgreSQL version 15, Alpine variant (smaller image, same functionality)
- `POSTGRES_USER=user` → Create a database user called `user`
- `POSTGRES_PASSWORD=password` → Set that user's password to `password` (this is a dev environment — production would use a secure password from `.env`)
- `POSTGRES_DB=sme_cyber_db` → Create a database called `sme_cyber_db` automatically on first run
- `ports: "5432:5432"` → Expose port 5432 so you can connect to the database from your PC using a tool like pgAdmin or DBeaver
- `volumes: postgres_data:/var/lib/postgresql/data` → Store ALL database data in a Docker volume called `postgres_data`. This means if you restart or rebuild the container, YOUR DATA IS SAFE. If you run `docker compose down -v`, the volume and all data are deleted.
- `healthcheck: test: pg_isready` → Every 5 seconds, run `pg_isready` — a built-in PostgreSQL tool that checks if the DB server is ready to accept connections. The backend container waits for this to pass before starting.
- `retries: 10` → Try 10 times before giving up (10 × 5s = 50 seconds of patience)
- `start_period: 10s` → Wait 10 seconds before starting the health checks (gives PostgreSQL time to initialize)

**عربي:**
- `image: postgres:15-alpine` → استخدم PostgreSQL الإصدار 15، النسخة Alpine (صورة أصغر، نفس الوظيفة)
- `POSTGRES_USER=user` → أنشئ مستخدم قاعدة بيانات باسم `user`
- `POSTGRES_PASSWORD=password` → عيّن كلمة مرور هذا المستخدم إلى `password` (بيئة تطوير — في الإنتاج ستستخدم كلمة مرور آمنة من `.env`)
- `POSTGRES_DB=sme_cyber_db` → أنشئ تلقائيًا قاعدة بيانات باسم `sme_cyber_db` عند أول تشغيل
- `ports: "5432:5432"` → اعرض المنفذ 5432 حتى تتمكن من الاتصال بقاعدة البيانات من جهازك باستخدام أداة مثل pgAdmin أو DBeaver
- `volumes: postgres_data` → خزّن بيانات قاعدة البيانات في وحدة تخزين Docker. إذا أعدت تشغيل الحاوية، **بياناتك آمنة**. إذا شغّلت `docker compose down -v`، تُحذف الوحدة وكل البيانات.
- `healthcheck: test: pg_isready` → كل 5 ثوانٍ، شغّل `pg_isready` — أداة PostgreSQL تتحقق من أن الخادم جاهز لقبول الاتصالات. حاوية الـ backend تنتظر نجاح هذا الفحص قبل أن تبدأ.
- `retries: 10` → حاول 10 مرات قبل الاستسلام (10 × 5 ثوانٍ = 50 ثانية من الصبر)
- `start_period: 10s` → انتظر 10 ثوانٍ قبل بدء فحوصات الصحة (يعطي PostgreSQL وقتًا للتهيئة)

---

### Service 5 — Redis
### الخدمة 5 — Redis

```yaml
redis:
  image: redis:7-alpine
  container_name: sme_dashboard_redis
  ports:
    - "6379:6379"
  deploy:
    resources:
      limits:
        cpus: '0.25'
        memory: 128M
```

**English:**
Redis is an in-memory key-value store. In this project it serves two jobs:
1. **Task Queue** — Celery stores scan task jobs in Redis. The Celery worker reads from Redis and executes them.
2. **Pub/Sub channel** — The backend publishes real-time events to a Redis channel (`ws_events`). The WebSocket listener reads those events and forwards them to the browser dashboard.

- `image: redis:7-alpine` → Redis version 7, small Alpine image
- `ports: "6379:6379"` → Expose Redis port so you can connect with a Redis client (e.g., RedisInsight) from your PC for debugging
- `memory: 128M` → Redis is capped at 128MB — it stores small messages, not big data

**عربي:**
Redis هو مخزن بيانات في الذاكرة (key-value). في هذا المشروع يخدم وظيفتين:
1. **قائمة المهام** — Celery يخزن مهام المسح في Redis. عامل Celery يقرأ منه وينفّذها.
2. **قناة Pub/Sub** — الـ backend يرسل أحداث فورية إلى قناة Redis (`ws_events`). مستمع WebSocket يقرأ تلك الأحداث ويعيد توجيهها إلى لوحة التحكم في المتصفح.

- `image: redis:7-alpine` → Redis الإصدار 7، صورة Alpine الصغيرة
- `ports: "6379:6379"` → اعرض منفذ Redis حتى تتمكن من الاتصال به من جهازك باستخدام عميل Redis (مثل RedisInsight) لأغراض التصحيح
- `memory: 128M` → Redis مُقيّد بـ 128 ميجابايت — يخزن رسائل صغيرة، وليس بيانات ضخمة

---

### Service 6 — celery_worker
### الخدمة 6 — celery_worker

```yaml
celery_worker:
  build: ./backend
  container_name: sme_dashboard_celery
  command: celery -A app.core.celery_app worker --loglevel=info --concurrency=2
  networks:
    - default
    - lab_network
  depends_on:
    - backend
    - redis
```

**English:**
- `build: ./backend` → Same Docker image as the backend (same code, same Python packages — just runs a different command)
- `command: celery -A app.core.celery_app worker --loglevel=info --concurrency=2` → Instead of starting FastAPI, this container runs the Celery worker process. It watches Redis for new scan tasks and executes them.
  - `-A app.core.celery_app` → The Celery app object is at `backend/app/core/celery_app.py`
  - `--loglevel=info` → Show INFO level logs (you can see scan progress in `docker logs celery_worker`)
  - `--concurrency=2` → Run 2 scan tasks at the same time (2 parallel worker processes)
- `networks: default + lab_network` → The Celery worker needs TWO networks: `default` (to talk to backend/redis) AND `lab_network` (to actually reach lab containers for scanning). This is CRITICAL — without `lab_network`, scans cannot reach the targets.

**عربي:**
- `build: ./backend` → نفس صورة Docker الخاصة بالـ backend (نفس الكود، نفس حزم Python — فقط يشغّل أمرًا مختلفًا)
- `command: celery -A app.core.celery_app worker --loglevel=info --concurrency=2` → بدلًا من تشغيل FastAPI، تشغّل هذه الحاوية عملية عامل Celery. تراقب Redis بحثًا عن مهام مسح جديدة وتنفّذها.
  - `-A app.core.celery_app` → كائن تطبيق Celery موجود في `backend/app/core/celery_app.py`
  - `--loglevel=info` → اعرض سجلات مستوى INFO (تستطيع رؤية تقدم المسح في `docker logs celery_worker`)
  - `--concurrency=2` → شغّل مهمتَي مسح في نفس الوقت (عمليتان متوازيتان)
- `networks: default + lab_network` → عامل Celery يحتاج شبكتين: `default` (للتحدث مع backend/redis) و`lab_network` (للوصول فعليًا إلى حاويات المختبر للمسح). هذا **بالغ الأهمية** — بدون `lab_network`، لا تستطيع عمليات المسح الوصول إلى الأهداف.

---

### Services 7+ — Profile "full" (Optional Heavy Services)
### الخدمات 7+ — Profile "full" (الخدمات الثقيلة الاختيارية)

```yaml
celery_beat:
  profiles: ["full"]
  command: celery -A app.core.celery_app beat --loglevel=info
```

**English:**
- `profiles: ["full"]` → This service ONLY starts if you run `docker compose --profile full up -d`. By default it does NOT start.
- `celery_beat` → The Celery scheduler. Runs periodic (scheduled) tasks — like "run a scan every night at 2am". Without this, only manual scans work.

**عربي:**
- `profiles: ["full"]` → هذه الخدمة تبدأ **فقط** إذا شغّلت `docker compose --profile full up -d`. افتراضيًا لا تبدأ.
- `celery_beat` → جدولة مهام Celery. ينفّذ المهام الدورية (المجدولة) — مثل "شغّل مسحًا كل ليلة الساعة 2 صباحًا". بدون هذا، تعمل المسوح اليدوية فقط.

```yaml
openvas:
  profiles: ["full"]
  image: immauss/openvas
  ports:
    - "9392:9392"
    - "9390:9390"
```

**English:**
- `openvas` → A professional vulnerability scanner (GVM/OpenVAS). Much more thorough than Nuclei — scans using tens of thousands of vulnerability plugins. Very slow (hours per scan) and heavy (~4GB RAM). Disabled by default.
- Port 9392 → OpenVAS web UI (browser dashboard)
- Port 9390 → GMP protocol port (the backend connects here using `python-gvm` to trigger scans programmatically)
- `SKIPGSAD=true` → Skip the GVM security assistant daemon to speed up startup

**عربي:**
- `openvas` → ماسح ثغرات احترافي (GVM/OpenVAS). أكثر شمولًا من Nuclei — يمسح باستخدام عشرات الآلاف من ملحقات الثغرات. بطيء جدًا (ساعات لكل مسح) وثقيل (~4 جيجابايت RAM). معطّل افتراضيًا.
- المنفذ 9392 → واجهة OpenVAS على المتصفح
- المنفذ 9390 → منفذ بروتوكول GMP (الـ backend يتصل هنا باستخدام `python-gvm` لتشغيل المسوح برمجيًا)
- `SKIPGSAD=true` → تخطّى عملية GVM security assistant لتسريع بدء التشغيل

```yaml
elasticsearch:
  profiles: ["full"]
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.1
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ports:
    - "9200:9200"
```

**English:**
- `elasticsearch` → A search and log storage engine. Receives security logs from the Wazuh SIEM and the lab log shipper.
- `discovery.type=single-node` → Run as a single-node cluster (no need for multiple nodes in a test environment)
- `xpack.security.enabled=false` → Disable Elasticsearch authentication (simpler for dev — would be dangerous in production)
- `ES_JAVA_OPTS=-Xms512m -Xmx512m` → Allocate exactly 512MB heap memory to the Java process. `-Xms` is minimum, `-Xmx` is maximum — setting them equal prevents memory fluctuation.

**عربي:**
- `elasticsearch` → محرك بحث وتخزين سجلات. يستقبل سجلات أمنية من Wazuh SIEM وناقل سجلات المختبر.
- `discovery.type=single-node` → شغّل كعقدة واحدة (لا حاجة لعقد متعددة في بيئة اختبار)
- `xpack.security.enabled=false` → عطّل مصادقة Elasticsearch (أبسط للتطوير — سيكون خطيرًا في الإنتاج)
- `ES_JAVA_OPTS=-Xms512m -Xmx512m` → خصّص 512 ميجابايت تمامًا لعملية Java. `-Xms` الحد الأدنى، `-Xmx` الحد الأقصى — تحديدهما بنفس القيمة يمنع التذبذب.

---

### Networks Section
### قسم الشبكات

```yaml
networks:
  default:
  lab_network:
    external: true
    name: the-dashboard-project-_lab_network
```

**English:**
- `default` → Docker automatically creates this network. All services listed without a network specification join this one. They can talk to each other by container name (e.g., the backend reaches the database by the hostname `db`).
- `lab_network: external: true` → This network is NOT created by this file. It must already exist. Omar creates it with: `docker network create the-dashboard-project-_lab_network`. Both the main stack AND the lab stack use this same network so containers from both files can communicate.

**عربي:**
- `default` → Docker ينشئ هذه الشبكة تلقائيًا. جميع الخدمات المُدرجة بدون تحديد شبكة تنضم إليها. تستطيع التحدث ببعض باسم الحاوية (مثلًا، الـ backend يصل لقاعدة البيانات باسم الخادم `db`).
- `lab_network: external: true` → هذه الشبكة **لا يُنشئها** هذا الملف. يجب أن تكون موجودة مسبقًا. عمر يُنشئها بالأمر: `docker network create the-dashboard-project-_lab_network`. كلٌّ من المكدس الرئيسي ومكدس المختبر يستخدمان نفس هذه الشبكة حتى تتمكن حاويات الملفين من التواصل.

### Volumes Section
### قسم وحدات التخزين

```yaml
volumes:
  postgres_data:
  gvm_data:
  elastic_data:
  n8n_data:
  caddy_data:
  caddy_config:
```

**English:**
These are named Docker volumes. Docker manages where on your hard drive the data is stored. Each one persists data from a specific service:
- `postgres_data` → All your scan results, targets, vulnerabilities, users (the whole DB)
- `gvm_data` → OpenVAS vulnerability plugin database (~2GB)
- `elastic_data` → All Elasticsearch log indexes
- `n8n_data` → n8n SOAR workflow definitions
- `caddy_data` / `caddy_config` → Caddy's SSL certificate and config state

**عربي:**
هذه وحدات تخزين Docker مسمّاة. Docker يدير مكان تخزين البيانات على القرص الصلب. كل واحدة تحفظ بيانات خدمة معينة:
- `postgres_data` → جميع نتائج المسح، الأهداف، الثغرات، المستخدمين (قاعدة البيانات بالكامل)
- `gvm_data` → قاعدة بيانات ملحقات ثغرات OpenVAS (~2 جيجابايت)
- `elastic_data` → جميع فهارس سجلات Elasticsearch
- `n8n_data` → تعريفات سير عمل SOAR في n8n
- `caddy_data` / `caddy_config` → شهادة SSL الخاصة بـ Caddy وحالة الإعدادات

---

## Part 4 — docker-compose.lab.yml (The Fake Target Network)
## الجزء الرابع — docker-compose.lab.yml (شبكة الأهداف الوهمية)

**English intro:**
The lab is a simulated SME network — 6 to 10 vulnerable Docker containers pretending to be a real company's infrastructure. The Found 404 scanner attacks THESE containers during demos instead of real systems.

**عربي:**
المختبر هو شبكة مؤسسات صغيرة ومتوسطة محاكاة — 6 إلى 10 حاويات Docker ضعيفة تتظاهر بأنها بنية تحتية لشركة حقيقية. يهاجم ماسح Found 404 هذه الحاويات خلال العروض التوضيحية بدلًا من الأنظمة الحقيقية.

### The 4 Subnets (Networks)
### الشبكات الأربع (Subnets)

| Subnet | IP Range | What it simulates | ماذا يحاكي |
|--------|----------|-------------------|-----------|
| DMZ | 10.10.10.0/24 | Internet-facing servers | الخوادم المواجهة للإنترنت |
| Corp | 10.10.20.0/24 | Internal office network | الشبكة الداخلية للمكتب |
| Data | 10.10.30.0/24 | Databases and caches | قواعد البيانات والذاكرة المؤقتة |
| MGMT | 10.10.40.0/24 | Monitoring and utilities | المراقبة والأدوات |

---

### Lab Container 1 — lab_webserver (Juice Shop)
### حاوية المختبر 1 — lab_webserver (Juice Shop)

```yaml
lab_webserver:
  image: bkimminich/juice-shop:latest
  container_name: lab_webserver
  hostname: webserver.sme-lab.local
  ports:
    - "3000:3000"
  networks:
    dmz:
      ipv4_address: 10.10.10.10
  labels:
    lab.vulns: "sqli,xss,bola,idor,broken-auth,ssrf"
    lab.cvss: "9.5"
```

**English:**
- `bkimminich/juice-shop` → OWASP Juice Shop: the official intentionally-vulnerable web app used for security training worldwide. Built on Node.js.
- `hostname: webserver.sme-lab.local` → Inside the Docker networks, other containers can find this one by the name `webserver.sme-lab.local`
- `ipv4_address: 10.10.10.10` → Fixed IP address in the DMZ subnet. Our Nmap scanner will find it at this exact IP.
- `lab.vulns` → Labels that document what vulnerabilities are intentionally present: SQL Injection, XSS, Broken Object Level Authorization, Insecure Direct Object Reference, Broken Auth, Server-Side Request Forgery
- `lab.cvss: "9.5"` → CVSS score 9.5 = Critical severity

**عربي:**
- `bkimminich/juice-shop` → OWASP Juice Shop: تطبيق ويب ضعيف رسميًا مُخصّص للتدريب الأمني. مبني على Node.js.
- `hostname: webserver.sme-lab.local` → داخل شبكات Docker، الحاويات الأخرى تجده بالاسم `webserver.sme-lab.local`
- `ipv4_address: 10.10.10.10` → عنوان IP ثابت في شبكة DMZ. ماسح Nmap سيجده في هذا العنوان تمامًا.
- `lab.vulns` → تسميات توثّق الثغرات الموجودة عمدًا: حقن SQL، XSS، تفويض كائن مكسور، مرجع كائن مباشر غير آمن، مصادقة مكسورة، طلب جانب الخادم المزيّف
- `lab.cvss: "9.5"` → درجة CVSS 9.5 = خطورة حرجة

---

### Lab Container 2 — lab_api_gateway (Nginx with security misconfigs)
### حاوية المختبر 2 — lab_api_gateway (Nginx مع إعدادات أمان خاطئة)

```yaml
lab_api_gateway:
  image: nginx:alpine
  container_name: lab_api_gateway
  volumes:
    - ./lab/config/nginx/api_gateway.conf:/etc/nginx/conf.d/default.conf:ro
  ports:
    - "8081:8081"
  networks:
    dmz:
      ipv4_address: 10.10.10.20
  labels:
    lab.vulns: "info-disclosure,header-leak,directory-listing,swagger-exposure"
    lab.cvss: "6.0"
```

**English:**
- Regular Nginx, but configured via `api_gateway.conf` to intentionally expose: server version headers (info-disclosure), directory listings, and a public Swagger docs endpoint — all common real-world misconfigurations.
- IP: `10.10.10.20` in the DMZ subnet

**عربي:**
- Nginx عادي، لكن مُعدّ عبر `api_gateway.conf` ليكشف عمدًا: رؤوس إصدار الخادم (كشف المعلومات)، قوائم المجلدات، ونقطة نهاية توثيق Swagger عامة — كل هذه من الإعدادات الخاطئة الشائعة في العالم الحقيقي.
- IP: `10.10.10.20` في شبكة DMZ

---

### Lab Container 3 — lab_fileserver (Samba SMB)
### حاوية المختبر 3 — lab_fileserver (Samba SMB)

```yaml
lab_fileserver:
  image: dperson/samba:latest
  command: >
    -u "admin;admin123"
    -u "guest;guest"
    -u "hr_backup;Password1"
    -s "public;/public;yes;no;no;all;none;"
    -s "hr_data;/hr_data;no;no;no;admin,hr_backup;none;"
  ports:
    - "4445:445"
    - "1139:139"
  networks:
    corp:
      ipv4_address: 10.10.20.10
  labels:
    lab.vulns: "weak-credentials,smb-enum,default-login,sensitive-data-exposure"
    lab.cvss: "8.0"
```

**English:**
- `dperson/samba` → A Samba server (SMB file sharing, the protocol Windows uses for network drives)
- The `-u` flags create users with weak passwords: `admin/admin123`, `guest/guest`, `hr_backup/Password1`
- The `-s` flags create shared folders. `hr_data` is restricted to admin and hr_backup. When our scanner tries `admin:admin123` and succeeds, it flags this as a critical finding.
- Ports 445/139 are the standard SMB ports. We use 4445/1139 to avoid conflicts on the host machine.
- IP: `10.10.20.10` in the Corp subnet (simulating an internal office file server)

**عربي:**
- `dperson/samba` → خادم Samba (مشاركة ملفات SMB، البروتوكول الذي يستخدمه Windows للمشاركات الشبكية)
- أوامر `-u` تنشئ مستخدمين بكلمات مرور ضعيفة: `admin/admin123`، `guest/guest`، `hr_backup/Password1`
- أوامر `-s` تنشئ مجلدات مشتركة. `hr_data` مقيّد للمشرف وhr_backup. عندما يجرّب الماسح `admin:admin123` وينجح، يعلّمه كاكتشاف حرج.
- المنافذ 445/139 هي منافذ SMB القياسية. نستخدم 4445/1139 لتجنب التعارضات على الجهاز المضيف.
- IP: `10.10.20.10` في شبكة Corp (يحاكي خادم ملفات مكتبي داخلي)

---

### Lab Container 4 — lab_database (Vulnerable PostgreSQL)
### حاوية المختبر 4 — lab_database (PostgreSQL ضعيفة)

```yaml
lab_database:
  image: postgres:13-alpine
  container_name: lab_database
  environment:
    - POSTGRES_USER=app_user
    - POSTGRES_PASSWORD=password123
    - POSTGRES_DB=sme_production
  ports:
    - "5433:5432"
  volumes:
    - ./lab/config/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql
  networks:
    data:
      ipv4_address: 10.10.30.10
  labels:
    lab.vulns: "weak-credentials,default-config,sensitive-data,no-encryption"
    lab.cvss: "9.0"
```

**English:**
- A deliberately weak production-style PostgreSQL database.
- Password `password123` is flagged by any password strength checker.
- The `init.sql` file creates fake tables with sensitive data (employee records, financial data) that would be catastrophic if exposed.
- Port 5433 on your PC (to avoid conflicting with the main platform's PostgreSQL on 5432)
- IP: `10.10.30.10` in the Data subnet
- CVSS 9.0 = Critical (exposed database + weak credentials + sensitive data)

**عربي:**
- قاعدة بيانات PostgreSQL ضعيفة عمدًا بنمط الإنتاج.
- كلمة المرور `password123` يعلّم عليها أي مدقق قوة كلمات مرور.
- ملف `init.sql` ينشئ جداول وهمية ببيانات حساسة (سجلات موظفين، بيانات مالية) ستكون كارثية إذا تعرّضت للاختراق.
- المنفذ 5433 على جهازك (لتجنب التعارض مع PostgreSQL الخاص بالمنصة الرئيسية على 5432)
- IP: `10.10.30.10` في شبكة Data
- CVSS 9.0 = حرج (قاعدة بيانات مكشوفة + بيانات اعتماد ضعيفة + بيانات حساسة)

---

### Lab Container 5 — lab_redis_cache (Unauthenticated Redis)
### حاوية المختبر 5 — lab_redis_cache (Redis بدون مصادقة)

```yaml
lab_redis_cache:
  image: redis:6.0-alpine
  command: redis-server --port 6380 --protected-mode no --bind 0.0.0.0
  ports:
    - "6380:6380"
  networks:
    data:
      ipv4_address: 10.10.30.20
  labels:
    lab.vulns: "no-auth,unauthenticated-access,data-exfiltration"
    lab.cvss: "8.5"
```

**English:**
- `--protected-mode no` → Disables Redis's built-in protection that rejects connections from non-localhost addresses. This makes it accessible from anywhere on the network.
- `--bind 0.0.0.0` → Listen on all network interfaces (not just localhost)
- No password set → Anyone who can reach port 6380 can read/write/delete ALL cache data, or even execute system commands (classic Redis attack vector)
- Port 6380 (not 6379) to avoid conflict with the main stack's Redis
- IP: `10.10.30.20` in the Data subnet

**عربي:**
- `--protected-mode no` → يُعطّل حماية Redis المدمجة التي ترفض الاتصالات من عناوين غير localhost. هذا يجعله قابلًا للوصول من أي مكان على الشبكة.
- `--bind 0.0.0.0` → يستمع على جميع واجهات الشبكة (وليس localhost فقط)
- لا توجد كلمة مرور → أي شخص يصل للمنفذ 6380 يستطيع قراءة/كتابة/حذف كل بيانات الذاكرة المؤقتة، أو حتى تنفيذ أوامر النظام (متجه هجوم Redis الكلاسيكي)
- المنفذ 6380 (وليس 6379) لتجنب التعارض مع Redis الخاص بالمكدس الرئيسي
- IP: `10.10.30.20` في شبكة Data

---

### Lab Container 6 — lab_traffic_gen
### حاوية المختبر 6 — lab_traffic_gen

```yaml
lab_traffic_gen:
  build:
    context: ./lab/traffic-generator
    dockerfile: Dockerfile
  container_name: lab_traffic_gen
  environment:
    - TARGET_WEBSERVER=http://10.10.10.10:3000
    - TRAFFIC_INTENSITY=medium
  networks:
    mgmt:
      ipv4_address: 10.10.40.10
    dmz:
    corp:
    data:
```

**English:**
- Built from `lab/traffic-generator/Dockerfile` — custom Python code in `lab/traffic-generator/generator.py`
- Simulates realistic background network traffic: web browsing, API calls, file server access, database queries — all going to the other lab containers
- IP `10.10.40.10` in MGMT subnet, but also connected to DMZ, Corp, and Data networks so it can generate traffic across all subnets
- `TRAFFIC_INTENSITY=medium` → Generates a moderate amount of traffic (not too heavy to overload, not too quiet to look fake)

**عربي:**
- مبني من `lab/traffic-generator/Dockerfile` — كود Python مخصص في `lab/traffic-generator/generator.py`
- يحاكي حركة شبكة واقعية في الخلفية: تصفح ويب، طلبات API، وصول إلى خادم الملفات، استعلامات قواعد البيانات — كل ذلك يذهب للحاويات الأخرى في المختبر
- IP `10.10.40.10` في شبكة MGMT، لكن متصل أيضًا بشبكات DMZ وCorp وData لتوليد حركة عبر جميع الشبكات الفرعية
- `TRAFFIC_INTENSITY=medium` → يولّد كمية معتدلة من الحركة (ليست ثقيلة جدًا للتحميل الزائد، وليست هادئة جدًا لتبدو وهمية)

---

## Part 5 — lab_setup.ps1 (Line by Line)
## الجزء الخامس — شرح lab_setup.ps1 سطرًا بسطر

**English intro:**
This PowerShell script is the command center for the lab. You use it to start, stop, check, seed, and reset the lab environment with simple one-word commands.

**عربي:**
هذا سكريبت PowerShell هو مركز التحكم في المختبر. تستخدمه لبدء وإيقاف وفحص وبذر وإعادة ضبط بيئة المختبر بأوامر بسيطة من كلمة واحدة.

```powershell
param(
    [Parameter(Position=0)]
    [ValidateSet("start","stop","status","seed","reset","logs")]
    [string]$Action = "status"
)
```

**English:**
- `param(...)` → Declares that this script accepts one argument: `$Action`
- `[ValidateSet(...)]` → Only allows these exact values: start, stop, status, seed, reset, logs. Any other value causes an error.
- `[string]$Action = "status"` → If you run `.\lab_setup.ps1` with no argument, it defaults to showing `status`

**عربي:**
- `param(...)` → يُعلن أن هذا السكريبت يقبل حجة واحدة: `$Action`
- `[ValidateSet(...)]` → يسمح فقط بهذه القيم: start, stop, status, seed, reset, logs. أي قيمة أخرى تسبب خطأ.
- `[string]$Action = "status"` → إذا شغّلت `.\lab_setup.ps1` بدون حجة، يعرض `status` افتراضيًا

```powershell
$PROJECT_DIR = $PSScriptRoot
$API_BASE    = "http://localhost:8000/api/v1"
$LAB_COMPOSE = Join-Path $PROJECT_DIR "docker-compose.lab.yml"
$LAB_NETWORK = "the-dashboard-project-_lab_network"
```

**English:**
- `$PSScriptRoot` → The folder where this `.ps1` file lives. So if the script is at `d:\FINAL PROJECT\the-dashboard-project-\lab_setup.ps1`, then `$PROJECT_DIR` = `d:\FINAL PROJECT\the-dashboard-project-`
- `$API_BASE` → The URL prefix for all API calls to the main dashboard backend
- `$LAB_COMPOSE` → Full path to the lab compose file, built by combining `$PROJECT_DIR` + `\docker-compose.lab.yml`
- `$LAB_NETWORK` → The exact name of the Docker network bridge that both stacks share

**عربي:**
- `$PSScriptRoot` → المجلد الذي يوجد فيه ملف `.ps1` هذا. إذا كان السكريبت في `d:\FINAL PROJECT\the-dashboard-project-\lab_setup.ps1`، إذًا `$PROJECT_DIR` = `d:\FINAL PROJECT\the-dashboard-project-`
- `$API_BASE` → بادئة URL لجميع استدعاءات API إلى الـ backend الرئيسي للوحة التحكم
- `$LAB_COMPOSE` → المسار الكامل لملف compose الخاص بالمختبر، مبني بدمج `$PROJECT_DIR` + `\docker-compose.lab.yml`
- `$LAB_NETWORK` → الاسم الدقيق لجسر شبكة Docker الذي يشترك فيه كلا المكدسين

```powershell
function Start-Lab {
    $netExists = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$LAB_NETWORK`$"
    if (-not $netExists) {
        docker network create $LAB_NETWORK
    }
    docker compose -f $LAB_COMPOSE pull
    docker compose -f $LAB_COMPOSE up --build -d
}
```

**English:**
- `docker network ls --format "{{.Name}}"` → List all Docker networks, showing only their names
- `Select-String -Pattern "^$LAB_NETWORK$"` → Search for an exact match of the lab network name using a regex anchored at start (`^`) and end (`$`)
- `if (-not $netExists)` → If the network doesn't exist yet, create it
- `docker compose -f $LAB_COMPOSE pull` → Download all lab container images from Docker Hub first
- `docker compose -f $LAB_COMPOSE up --build -d` → Build custom containers (traffic generator, log shipper) and start ALL lab containers in detached mode (`-d` = background)

**عربي:**
- `docker network ls --format "{{.Name}}"` → أدرج جميع شبكات Docker، معروضًا أسماؤها فقط
- `Select-String -Pattern "^$LAB_NETWORK$"` → ابحث عن تطابق دقيق لاسم شبكة المختبر باستخدام regex مُربط في البداية (`^`) والنهاية (`$`)
- `if (-not $netExists)` → إذا لم تكن الشبكة موجودة بعد، أنشئها
- `docker compose -f $LAB_COMPOSE pull` → حمّل أولًا جميع صور حاويات المختبر من Docker Hub
- `docker compose -f $LAB_COMPOSE up --build -d` → ابنِ الحاويات المخصصة (مولّد الحركة، ناقل السجلات) وشغّل جميع حاويات المختبر في الوضع المنفصل (`-d` = في الخلفية)

```powershell
function Invoke-SeedTargets {
    try {
        Invoke-RestMethod -Uri "$API_BASE/dashboard/risk-overview" -Method GET -TimeoutSec 5 -ErrorAction Stop
    } catch {
        Write-Err "Dashboard API at $API_BASE is not reachable."
        exit 1
    }
    $result = Invoke-RestMethod -Uri "$API_BASE/lab/seed" -Method POST -ContentType "application/json"
    foreach ($item in $result.seeded) {
        Write-Ok "Created: $($item.name) (ID: $($item.id))"
    }
}
```

**English:**
- First, ping the API to check it's alive. If not, exit with an error message.
- `Invoke-RestMethod` is PowerShell's built-in HTTP client (like `curl` but with automatic JSON parsing)
- `POST /api/v1/lab/seed` → Calls a backend endpoint that reads the lab container definitions and registers each one as a "Target" in the PostgreSQL database
- After seeding, the dashboard shows the lab containers as scannable targets
- The response contains `result.seeded` — an array of `{name, id, status}` objects showing what was created vs. skipped

**عربي:**
- أولًا، اتصل بـ API للتحقق من أنه حي. إذا لم يكن كذلك، اخرج برسالة خطأ.
- `Invoke-RestMethod` هو عميل HTTP المدمج في PowerShell (مثل `curl` لكن مع تحليل JSON تلقائي)
- `POST /api/v1/lab/seed` → يستدعي نقطة نهاية الـ backend التي تقرأ تعريفات حاويات المختبر وتسجّل كل منها كـ "هدف" في قاعدة بيانات PostgreSQL
- بعد البذر، تعرض لوحة التحكم حاويات المختبر كأهداف قابلة للمسح
- تحتوي الاستجابة على `result.seeded` — مصفوفة من كائنات `{name, id, status}` توضح ما تم إنشاؤه مقابل ما تم تخطّيه

---

## Part 6 — trigger_lab_scans.ps1 (Line by Line)
## الجزء السادس — شرح trigger_lab_scans.ps1 سطرًا بسطر

**English intro:**
This script automates the process of triggering a scan for every registered target and then polling until all scans complete. Use it to run the whole demo with one command.

**عربي:**
يُؤتمت هذا السكريبت عملية تشغيل مسح لكل هدف مسجّل ثم الاستطلاع حتى اكتمال جميع عمليات المسح. استخدمه لتشغيل العرض التوضيحي بالكامل بأمر واحد.

```powershell
$base_url = "http://localhost:8000/api/v1"
$res = Invoke-RestMethod -Uri "$base_url/targets/" -Method GET
$targets = $res
```

**English:**
- GET `/api/v1/targets/` → Fetches ALL registered targets from the database as a JSON array
- `$targets` is now an array of target objects (each has `.id`, `.name`, `.base_url`, etc.)

**عربي:**
- GET `/api/v1/targets/` → يجلب جميع الأهداف المسجّلة من قاعدة البيانات كمصفوفة JSON
- `$targets` الآن هي مصفوفة من كائنات الأهداف (كل منها لديه `.id`، `.name`، `.base_url`، إلخ)

```powershell
foreach ($target in $targets) {
    $scan_data = @{
        "target_id" = [string]$target.id
        "scan_type" = "full"
    }
    $body = $scan_data | ConvertTo-Json
    $scan = Invoke-RestMethod -Uri "$base_url/scans/" -Method POST -Headers $headers -Body $body
    $scan_ids[$target.name] = @{ "id" = $scan.id; "status" = "pending" }
}
```

**English:**
- For each target, create a hashtable `$scan_data` with the target ID and scan type
- `ConvertTo-Json` → Converts the PowerShell hashtable to a JSON string: `{"target_id": "1", "scan_type": "full"}`
- POST `/api/v1/scans/` → Creates a new scan job in the database and queues it to Celery. Returns immediately with the scan's ID.
- Store the scan ID in `$scan_ids` dictionary for polling later

**عربي:**
- لكل هدف، أنشئ جدول تجزئة `$scan_data` بمعرّف الهدف ونوع المسح
- `ConvertTo-Json` → يحوّل جدول التجزئة إلى نص JSON: `{"target_id": "1", "scan_type": "full"}`
- POST `/api/v1/scans/` → ينشئ مهمة مسح جديدة في قاعدة البيانات ويُضيفها إلى قائمة Celery. يعود فورًا بمعرّف المسح.
- خزّن معرّف المسح في قاموس `$scan_ids` للاستطلاع لاحقًا

```powershell
while ($true) {
    foreach ($name in $scan_ids.Keys) {
        $current_scan = Invoke-RestMethod -Uri "$base_url/scans/$scan_id" -Method GET
        $status = $current_scan.status
        if ($status -in @("completed", "failed")) {
            $s.status = $status
        }
    }
    if ($all_done) { break }
    Start-Sleep -Seconds 15
}
```

**English:**
- Infinite loop that checks every scan's status every 15 seconds
- GET `/api/v1/scans/{id}` → Fetches one scan's current status from the DB
- When status becomes `completed` or `failed`, mark it done
- `if ($all_done) { break }` → Exit the loop only when every scan has a final status
- After the loop, print the full results: risk score, health score, list of found vulnerabilities, and agent execution logs

**عربي:**
- حلقة لا نهاية لها تتحقق من حالة كل مسح كل 15 ثانية
- GET `/api/v1/scans/{id}` → يجلب الحالة الحالية لمسح واحد من قاعدة البيانات
- عندما تصبح الحالة `completed` أو `failed`، ضعها كمنتهية
- `if ($all_done) { break }` → اخرج من الحلقة فقط عندما يكون لكل مسح حالة نهائية
- بعد الحلقة، اطبع النتائج الكاملة: درجة الخطر، درجة الصحة، قائمة الثغرات المكتشفة، وسجلات تنفيذ الوكلاء

---

## Part 7 — infra/caddy/Caddyfile (Line by Line)
## الجزء السابع — شرح Caddyfile سطرًا بسطر

**English intro:**
Caddy is the reverse proxy sitting in front of everything. When you visit `https://localhost`, Caddy decides where to send your request — backend or frontend.

**عربي:**
Caddy هو الوكيل العكسي الذي يقف أمام كل شيء. عندما تزور `https://localhost`، يقرر Caddy أين يرسل طلبك — الـ backend أم الـ frontend.

```
localhost {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle /ws/* {
        reverse_proxy backend:8000
    }
    handle /health {
        reverse_proxy backend:8000
    }
    handle /docs* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:5173
    }
```

**English:**
- `localhost { ... }` → All rules inside apply only when the request comes to `localhost`
- `handle /api/*` → Any URL starting with `/api/` → forward to `backend:8000` (the FastAPI container, using its Docker service name as hostname)
- `handle /ws/*` → WebSocket connections (`/ws/logs`) → forward to backend (FastAPI handles WebSocket on port 8000)
- `handle /health` → Health check endpoint → forward to backend
- `handle /docs*` → FastAPI's auto-generated Swagger docs page → forward to backend
- `handle { ... }` → The "catch-all" — everything ELSE (JS files, HTML, CSS, font files) → forward to `frontend:5173` (the Vite dev server)

**عربي:**
- `localhost { ... }` → جميع القواعد بداخله تنطبق فقط عندما يأتي الطلب إلى `localhost`
- `handle /api/*` → أي URL يبدأ بـ `/api/` → وجّهه إلى `backend:8000` (حاوية FastAPI، باستخدام اسم خدمتها في Docker كاسم خادم)
- `handle /ws/*` → اتصالات WebSocket (`/ws/logs`) → وجّهها للـ backend (FastAPI يتعامل مع WebSocket على المنفذ 8000)
- `handle /health` → نقطة نهاية فحص الصحة → وجّهها للـ backend
- `handle /docs*` → صفحة توثيق Swagger المُنشأة تلقائيًا بواسطة FastAPI → وجّهها للـ backend
- `handle { ... }` → "التقط الكل" — كل شيء آخر (ملفات JS، HTML، CSS، خطوط) → وجّهه إلى `frontend:5173` (خادم Vite للتطوير)

```
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
```

**English:**
- `encode gzip` → Compress all responses with gzip before sending to the browser (reduces page load time by 60-80%)
- `Strict-Transport-Security "max-age=31536000"` → Tell browsers to ONLY use HTTPS for this site for the next 1 year (prevents protocol downgrade attacks)
- `X-Content-Type-Options "nosniff"` → Prevent browsers from guessing (sniffing) the content type — prevents MIME confusion attacks
- `X-Frame-Options "DENY"` → Prevent this site from being embedded inside an `<iframe>` on another site (blocks clickjacking)
- `Referrer-Policy "strict-origin-when-cross-origin"` → Only send the origin (not the full URL) in the `Referer` header when navigating to external sites
- `-Server` → Remove the `Server:` response header (hides what software is running — basic security hardening)

**عربي:**
- `encode gzip` → اضغط جميع الاستجابات بـ gzip قبل إرسالها للمتصفح (يُقلل وقت تحميل الصفحة بنسبة 60-80%)
- `Strict-Transport-Security "max-age=31536000"` → أخبر المتصفحات باستخدام HTTPS فقط لهذا الموقع للعام القادم (يمنع هجمات تخفيض البروتوكول)
- `X-Content-Type-Options "nosniff"` → امنع المتصفحات من تخمين (استنشاق) نوع المحتوى — يمنع هجمات ارتباك MIME
- `X-Frame-Options "DENY"` → امنع تضمين هذا الموقع داخل `<iframe>` في موقع آخر (يمنع Clickjacking)
- `Referrer-Policy "strict-origin-when-cross-origin"` → أرسل الأصل فقط (وليس الرابط الكامل) في رأس `Referer` عند الانتقال لمواقع خارجية
- `-Server` → احذف رأس الاستجابة `Server:` (يُخفي البرنامج الذي يعمل — تصلّب أمني أساسي)

---

## Part 8 — start-lite.ps1 (Line by Line)
## الجزء الثامن — شرح start-lite.ps1 سطرًا بسطر

**English intro:**
This is the "one command to rule them all" startup script. Run it once and everything starts automatically: Docker check → network creation → main stack → health wait → lab stack → seeding.

**عربي:**
هذا هو سكريبت البدء "أمر واحد يُدير الكل". شغّله مرة واحدة وكل شيء يبدأ تلقائيًا: فحص Docker → إنشاء الشبكة → المكدس الرئيسي → انتظار الصحة → مكدس المختبر → البذر.

```powershell
param(
    [switch]$SkipSeed,
    [switch]$NoBuild
)
```

**English:**
- `[switch]$SkipSeed` → If you pass `.\start-lite.ps1 -SkipSeed`, it skips seeding the lab targets (useful if they're already seeded from a previous run)
- `[switch]$NoBuild` → If you pass `-NoBuild`, it skips rebuilding Docker images (faster restart — uses cached images)

**عربي:**
- `[switch]$SkipSeed` → إذا مررت `-SkipSeed`، يتخطّى بذر أهداف المختبر (مفيد إذا كانت مبذورة من تشغيل سابق)
- `[switch]$NoBuild` → إذا مررت `-NoBuild`، يتخطّى إعادة بناء صور Docker (إعادة تشغيل أسرع — يستخدم الصور المخزّنة مؤقتًا)

```powershell
for ($i = 1; $i -le $retries; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
        if ($resp.status -eq "ok" -or $resp.status -eq "healthy") {
            $ready = $true; break
        }
    } catch {}
    Write-Info "Waiting... ($i/$retries)"
    Start-Sleep -Seconds 3
}
```

**English:**
- Polls `http://localhost:8000/health` every 3 seconds, up to 30 times (90 seconds maximum)
- When the backend responds with `{"status": "ok"}` or `{"status": "healthy"}`, it's ready
- If after 30 tries it's still not ready, the script exits with an error message (check `docker compose logs backend`)
- This prevents the script from seeding targets before the backend is actually alive

**عربي:**
- يستطلع `http://localhost:8000/health` كل 3 ثوانٍ، حتى 30 مرة (90 ثانية كحد أقصى)
- عندما يستجيب الـ backend بـ `{"status": "ok"}` أو `{"status": "healthy"}`، يكون جاهزًا
- إذا بعد 30 محاولة لا يزال غير جاهز، يخرج السكريبت برسالة خطأ (افحص `docker compose logs backend`)
- يمنع هذا السكريبت من بذر الأهداف قبل أن يكون الـ backend حيًا فعلًا

---

## Part 9 — Omar's Leadership Duties (Non-Code)
## الجزء التاسع — مهام عمر القيادية (خارج الكود)

**English:**
Besides managing files, Omar runs the team itself. These are his weekly duties:

**عربي:**
بالإضافة إلى إدارة الملفات، يُدير عمر الفريق نفسه. هذه واجباته الأسبوعية:

### Weekly Kickoff (Monday, 30 min, All 11 members)
### الكيك أوف الأسبوعي (الاثنين، 30 دقيقة، جميع الـ 11 عضوًا)

**English:**
- Omar opens the meeting and reviews last week's progress
- Each sub-leader gives a 3-sentence status: what was done, what is blocked, what's next
- Omar updates `project_plan.md` checkboxes live during the call
- Omar identifies cross-team blockers (e.g., "Frontend needs a new backend endpoint") and assigns them

**عربي:**
- عمر يفتح الاجتماع ويراجع تقدم الأسبوع الماضي
- كل مسؤول فريق فرعي يعطي حالة من 3 جمل: ما تم، ما هو معلّق، ما التالي
- عمر يُحدّث مربعات اختيار `project_plan.md` مباشرةً أثناء المكالمة
- عمر يحدد العوائق عبر الفرق (مثلًا "الـ frontend يحتاج نقطة نهاية backend جديدة") ويُخصّصها

### Integration Sync (Wednesday, 20 min, Sub-leaders only)
### مزامنة التكامل (الأربعاء، 20 دقيقة، مسؤولو الفرق فقط)

**English:**
- Reem + Marize + Shahd + Omar only — technical integration check
- "Does the frontend call the right API endpoint?" "Does the backend return what the frontend expects?"
- Catches mismatches before they become bugs

**عربي:**
- ريم + ماريز + شهد + عمر فقط — فحص تكامل تقني
- "هل الـ frontend يستدعي نقطة نهاية API الصحيحة؟" "هل الـ backend يرجع ما يتوقعه الـ frontend؟"
- يكتشف عدم التطابق قبل أن يصبح أخطاءً

### GitHub Branch Management
### إدارة فروع GitHub

**English:**
- Omar owns the `main` branch — nothing merges without his approval
- Branch naming rule: `feat/backend-rbac`, `fix/frontend-toast`, `docs/use-case-guide`
- Every Pull Request must have: a description, a test result, and a screenshot (for UI changes)
- Omar reviews all PRs from DevOps/QA team, and gives final approval for all other teams

**عربي:**
- عمر يمتلك فرع `main` — لا شيء يُدمج بدون موافقته
- قاعدة تسمية الفروع: `feat/backend-rbac`، `fix/frontend-toast`، `docs/use-case-guide`
- كل Pull Request يجب أن يحتوي على: وصف، نتيجة اختبار، ولقطة شاشة (للتغييرات في الواجهة)
- عمر يراجع جميع PRs من فريق DevOps/QA، ويمنح الموافقة النهائية لجميع الفرق الأخرى

---

## Part 10 — Files Omar Must CREATE (Don't Exist Yet)
## الجزء العاشر — الملفات التي يجب أن يُنشئها عمر (لا تزال غير موجودة)

### 1. `.github/workflows/ci.yml` — GitHub Actions CI Pipeline

**English:**
This file (once created) will automatically run tests on every Pull Request. Every time a team member opens a PR, GitHub Actions will:
1. Check out the code
2. Run `pytest` on the backend
3. Run `npm run build` on the frontend
4. If any step fails, the PR shows a red ❌ and cannot be merged

**عربي:**
هذا الملف (بمجرد إنشائه) سيشغّل الاختبارات تلقائيًا على كل Pull Request. في كل مرة يفتح عضو في الفريق PR، سيقوم GitHub Actions بـ:
1. سحب الكود
2. تشغيل `pytest` على الـ backend
3. تشغيل `npm run build` على الـ frontend
4. إذا فشلت أي خطوة، يُظهر الـ PR علامة ❌ حمراء ولا يمكن دمجه

**Sample content to create:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v --tb=short

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci && npm run build
```

---

### 2. `SECURITY_AUDIT.md` — Platform Self-Audit Report

**English:**
A document Omar writes in Week 12 that proves the Found 404 platform itself is secure (not just the things it scans). Covers: no hardcoded secrets, JWT properly configured, no SQL injection in the backend API, Docker containers run as non-root users, etc.

**عربي:**
وثيقة يكتبها عمر في الأسبوع 12 تُثبت أن منصة Found 404 نفسها آمنة (وليس فقط الأشياء التي تمسحها). تشمل: لا أسرار مُضمّنة في الكود، JWT مُعدّ بشكل صحيح، لا حقن SQL في API الـ backend، حاويات Docker تعمل كمستخدمين غير root، إلخ.

### 3. `FINAL_DEMO_SCRIPT.md` — Presentation Day Script

**English:**
A word-for-word script for the university presentation. Tells each person exactly what to say, what to click, and what to show. Written in Week 14. Includes a pre-demo checklist that Omar runs through before going live.

**عربي:**
سكريبت حرفي ليوم تقديم الجامعة. يخبر كل شخص بالضبط ماذا يقول، وماذا ينقر، وماذا يعرض. يُكتب في الأسبوع 14. يتضمن قائمة تحقق ما قبل العرض يُنفّذها عمر قبل البث المباشر.

---

## Part 11 — Commands Omar Uses Daily
## الجزء الحادي عشر — الأوامر التي يستخدمها عمر يوميًا

### Starting Everything
### تشغيل كل شيء

```powershell
# One command (recommended)
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1

# Or manually step by step:
docker network create the-dashboard-project-_lab_network   # Create shared network (once)
docker compose up -d                                        # Start main stack
docker compose -f docker-compose.lab.yml up -d --build     # Start lab
Invoke-RestMethod -Method Post http://localhost:8000/api/v1/lab/seed  # Seed targets
```

**عربي:**
```powershell
# أمر واحد (موصى به)
powershell -ExecutionPolicy Bypass -File .\start-lite.ps1

# أو يدويًا خطوة بخطوة:
docker network create the-dashboard-project-_lab_network   # أنشئ الشبكة المشتركة (مرة واحدة)
docker compose up -d                                        # شغّل المكدس الرئيسي
docker compose -f docker-compose.lab.yml up -d --build     # شغّل المختبر
Invoke-RestMethod -Method Post http://localhost:8000/api/v1/lab/seed  # ابذر الأهداف
```

### Watching What's Happening
### مراقبة ما يجري

```powershell
docker compose ps                              # See all container states
docker compose logs -f backend                 # Follow backend logs
docker compose logs -f celery_worker           # Follow scan execution logs
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status  # Lab health check
```

**عربي:**
```powershell
docker compose ps                              # اعرض حالة جميع الحاويات
docker compose logs -f backend                 # تابع سجلات الـ backend
docker compose logs -f celery_worker           # تابع سجلات تنفيذ المسح
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 status  # فحص صحة المختبر
```

### Fixing the Backend Crash (Critical Blocker)
### إصلاح تعطّل الـ Backend (العائق الحرج)

```powershell
# Backend crashes with "ModuleNotFoundError: No module named 'google'"
# الـ Backend يتعطّل بـ "ModuleNotFoundError: No module named 'google'"

# Fix: force full rebuild without cache
# الإصلاح: أعد البناء الكامل بدون ذاكرة مؤقتة
docker compose build --no-cache backend
docker compose up -d --force-recreate backend

# Verify it's healthy
# تحقق من أنه بصحة جيدة
docker logs sme_dashboard_backend --tail 30
curl http://localhost:8000/health
```

### Stopping Everything
### إيقاف كل شيء

```powershell
docker compose down                           # Stop main stack (data preserved)
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 stop   # Stop lab

# Full reset (DELETES ALL DATA):
docker compose down -v                        # Stop + delete volumes
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 reset
```

**عربي:**
```powershell
docker compose down                           # أوقف المكدس الرئيسي (البيانات محفوظة)
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 stop   # أوقف المختبر

# إعادة ضبط كاملة (يحذف جميع البيانات):
docker compose down -v                        # أوقف + احذف وحدات التخزين
powershell -ExecutionPolicy Bypass -File .\lab_setup.ps1 reset
```

---

## Part 12 — What Omar Must Learn (Study List)
## الجزء الثاني عشر — ما يجب على عمر تعلّمه (قائمة الدراسة)

| Topic | Why Omar Needs It | لماذا يحتاجه عمر | Resource |
|-------|------------------|-----------------|----------|
| GitHub Actions YAML syntax | To write the CI/CD pipeline | لكتابة خط CI/CD | https://docs.github.com/en/actions/writing-workflows |
| Docker multi-stage builds | To optimize image sizes for production | لتحسين أحجام الصور للإنتاج | https://docs.docker.com/build/building/multi-stage/ |
| Docker networks (`bridge`, `overlay`) | To understand why `lab_network` is needed | لفهم لماذا `lab_network` ضرورية | https://docs.docker.com/network/ |
| Nginx reverse proxy config | To write `infra/nginx.conf` as a production alternative to Caddy | لكتابة بديل Nginx في الإنتاج | https://nginx.org/en/docs/http/ngx_http_proxy_module.html |
| `trivy` container scanning | To run the security audit on Docker images | لتشغيل التدقيق الأمني على صور Docker | https://trivy.dev/latest/docs/target/container_image/ |
| PowerShell scripting basics | To maintain and extend `lab_setup.ps1` | لصيانة وتمديد `lab_setup.ps1` | https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/00-introduction |
| OWASP Top 10 (2021) | To write `SECURITY_AUDIT.md` intelligently | لكتابة `SECURITY_AUDIT.md` بذكاء | https://owasp.org/Top10/ |
| Postman + Newman CLI | To run API smoke tests as part of CI | لتشغيل اختبارات API كجزء من CI | https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/ |

---

## Part 13 — Presentation Day — Omar's Exact Script
## الجزء الثالث عشر — يوم التقديم — السكريبت الدقيق لعمر

**English:**
On July 2, 2026, Omar does these things IN ORDER:

**عربي:**
في 2 يوليو 2026، عمر يفعل هذه الأشياء بالترتيب:

**Before the panel arrives (30 min before):**
```
1. Run: powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
2. Verify: https://localhost opens in the browser
3. Verify: Lab status shows all 6 containers running
4. Verify: http://localhost:3000 shows Juice Shop
5. Open the Orchestration Feed tab and keep it visible
```

**قبل وصول اللجنة (30 دقيقة مسبقًا):**
```
1. شغّل: powershell -ExecutionPolicy Bypass -File .\start-lite.ps1
2. تحقق: https://localhost يفتح في المتصفح
3. تحقق: حالة المختبر تُظهر 6 حاويات تعمل
4. تحقق: http://localhost:3000 يعرض Juice Shop
5. افتح تبويب Orchestration Feed وابقه مرئيًا
```

**During presentation (Omar's speaking segments):**
```
Segment 1 — Introduction (3 min):
"Found 404 is an AI-driven security platform for SMEs.
 It replaces a team of security analysts with an automated pipeline:
 Nmap discovery → AI agent chaining → risk scoring → actionable report.
 Today we'll demonstrate it live against our simulated SME network."

Segment 2 — Live Demo (10 min):
1. Show the dashboard at https://localhost
2. Click 'Initiate Scan' on the Juice Shop target
3. Point to the Orchestration Feed — "Watch the AI agents working"
4. When scan completes — show the Risk Score (95/100)
5. Click a red node in Network Topology
6. Show the Asset Detail Panel — AI advisory text
7. Show the PDF export button — export the report
8. Show the Action Center — "5 prioritized fixes instead of 200 raw lines"

Segment 3 — Q&A Coordination (10 min):
- Direct technical questions to the right sub-leader
- Keep answers concise — offer to elaborate if examiner wants more
```

**خلال التقديم (فقرات عمر الكلامية):**
```
الفقرة 1 — المقدمة (3 دقائق):
"Found 404 منصة أمنية مدعومة بالذكاء الاصطناعي للمؤسسات الصغيرة والمتوسطة.
 تُستبدل فريق محللي أمن بخط أنابيب آلي:
 اكتشاف Nmap → تسلسل وكلاء AI → تسجيل المخاطر → تقرير قابل للتنفيذ.
 اليوم سنُوضّح ذلك مباشرةً على شبكة مؤسستنا الوهمية."

الفقرة 2 — العرض المباشر (10 دقائق):
1. اعرض لوحة التحكم على https://localhost
2. انقر 'Initiate Scan' على هدف Juice Shop
3. أشر إلى Orchestration Feed — "شاهدوا وكلاء الذكاء الاصطناعي يعملون"
4. عند اكتمال المسح — اعرض درجة الخطر (95/100)
5. انقر عقدة حمراء في Network Topology
6. اعرض Asset Detail Panel — نص المستشار AI
7. اعرض زر تصدير PDF — صدّر التقرير
8. اعرض Action Center — "5 إصلاحات مُرتّبة بالأولوية بدلًا من 200 سطر خام"

الفقرة 3 — تنسيق الأسئلة والأجوبة (10 دقائق):
- وجّه الأسئلة التقنية لمسؤول الفريق الفرعي المناسب
- أبقِ الإجابات موجزة — اعرض التوسع إذا أراد الممتحن المزيد
```

---

## Summary — Omar's Complete Ownership Map
## الملخص — خريطة ملكية عمر الكاملة

```
عمر كابيل | Omar Kapil
│
├── FILES HE OWNS NOW (الملفات التي يمتلكها الآن)
│   ├── docker-compose.yml          (Main stack — 7 services)
│   ├── docker-compose.lab.yml      (Lab — 6–10 containers, 4 subnets)
│   ├── start-lite.ps1              (One-command startup)
│   ├── lab_setup.ps1               (Lab lifecycle manager)
│   ├── trigger_lab_scans.ps1       (Auto-scan all targets)
│   ├── infra/caddy/Caddyfile       (TLS reverse proxy rules)
│   ├── HOW_TO_RUN.md               (Setup guide)
│   └── project_plan.md             (Master plan — always updated)
│
├── FILES HE MUST CREATE (الملفات التي يجب إنشاؤها)
│   ├── .github/workflows/ci.yml    (Auto-run tests on every PR)
│   ├── .github/workflows/cd.yml    (Auto-deploy on main merge)
│   ├── infra/nginx.conf            (Nginx prod alternative)
│   ├── SECURITY_AUDIT.md           (Platform self-audit report)
│   └── FINAL_DEMO_SCRIPT.md        (Word-for-word demo script)
│
├── TEAM DUTIES (واجبات الفريق)
│   ├── Monday 30min kickoff — all 11 members
│   ├── Wednesday 20min integration sync — sub-leaders only
│   ├── GitHub PR approvals — final merge authority on main
│   ├── Weekly project_plan.md updates
│   └── Presentation Day — intro + demo + Q&A coordination
│
└── DEADLINE — July 2, 2026 (University Presentation)
```

---

*Created: April 19, 2026 | For: Omar Kapil | Project: Found 404*
*تاريخ الإنشاء: 19 أبريل 2026 | لـ: عمر كابيل | المشروع: Found 404*
