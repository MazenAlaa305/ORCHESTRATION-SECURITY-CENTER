# Omar Kapil — Team Leader + DevOps Sub-Leader
# عمر كابيل — قائد الفريق + مسؤول البنية التحتية

> **Sub-Team:** 4 — DevOps & QA | **الفريق الفرعي:** 4 — العمليات وضمان الجودة
> For the full deep-dive on every file and every line, see `omar_kapil_role.md` at the project root.
> للشرح الكامل لكل ملف وكل سطر، راجع `omar_kapil_role.md` في جذر المشروع.

---

## Role Summary | ملخص الدور

**English:** Omar has two simultaneous jobs: **Team Leader** (coordinates all 11 members, runs weekly meetings, owns GitHub merge rights on `main`) and **DevOps Sub-Leader** (owns every Docker file, the lab environment, CI/CD pipeline, and the reverse proxy).

**عربي:** عمر لديه وظيفتان متزامنتان: **قائد الفريق** (ينسّق الـ 11 عضوًا، يدير الاجتماعات الأسبوعية، يملك حق الدمج على `main`) و**مسؤول DevOps** (يمتلك كل ملفات Docker، بيئة المختبر، خط CI/CD، والوكيل العكسي).

---

## Files Owned | الملفات المملوكة

| File | Purpose | الغرض |
|------|---------|-------|
| `docker-compose.yml` | Main platform — 7 services | المنصة الرئيسية — 7 خدمات |
| `docker-compose.lab.yml` | Vulnerable lab — 4 subnets, 6-10 containers | المختبر الضعيف — 4 شبكات، 6-10 حاويات |
| `start-lite.ps1` | One-command startup | تشغيل بأمر واحد |
| `lab_setup.ps1` | Lab lifecycle (start/stop/seed/reset) | دورة حياة المختبر |
| `trigger_lab_scans.ps1` | Auto-trigger scans on all targets | تشغيل المسح تلقائيًا |
| `infra/caddy/Caddyfile` | TLS reverse proxy routing rules | قواعد توجيه HTTPS |
| `HOW_TO_RUN.md` | Setup guide | دليل الإعداد |
| `project_plan.md` | Master project plan | خطة المشروع الرئيسية |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `.github/workflows/ci.yml` | Auto-run tests on every PR | تشغيل الاختبارات تلقائيًا |
| `.github/workflows/cd.yml` | Auto-deploy on main merge | نشر تلقائي عند الدمج |
| `SECURITY_AUDIT.md` | Platform self-audit report | تقرير التدقيق الأمني |
| `FINAL_DEMO_SCRIPT.md` | Word-for-word presentation script | سكريبت العرض التوضيحي |

---

## Key Concepts to Learn | المفاهيم الأساسية للتعلم

**English:** GitHub Actions YAML syntax · Docker multi-stage builds · Nginx/Caddy reverse proxy · `trivy` container scanning · PowerShell scripting · OWASP Top 10 self-assessment

**عربي:** صيغة GitHub Actions YAML · بناء Docker متعدد المراحل · Nginx/Caddy وكيل عكسي · فحص الحاويات بـ `trivy` · سكريبتات PowerShell · تقييم OWASP Top 10 الذاتي

---

## Weekly Duties | الواجبات الأسبوعية

| Day | Event | الحدث |
|-----|-------|-------|
| Monday | 30-min kickoff — all 11 | كيك أوف 30 دقيقة — الجميع |
| Wednesday | 20-min integration sync — sub-leaders only | مزامنة تكامل 20 دقيقة — المسؤولون فقط |
| Friday | GitHub PR review + plan update | مراجعة PRs + تحديث الخطة |

---

## Phase 3–4 Timeline | الجدول الزمني

| Week | Task | المهمة |
|------|------|-------|
| 10 | Set up GitHub Actions CI pipeline | إعداد خط CI في GitHub Actions |
| 11 | Run UAT session with all 11 members | جلسة اختبار قبول المستخدم |
| 12 | `trivy` image scan + `SECURITY_AUDIT.md` | فحص صور Docker + تقرير أمني |
| 13 | Final regression + clean `main` branch | اختبار انحدار + تنظيف فرع main |
| 14 | Write `FINAL_DEMO_SCRIPT.md` + demo video | كتابة سكريبت العرض + تسجيل الفيديو |
| 15 | Dry-run presentation | تجربة التقديم الجاف |
| 16 | **University Presentation — July 2, 2026** | **تقديم الجامعة — 2 يوليو 2026** |
