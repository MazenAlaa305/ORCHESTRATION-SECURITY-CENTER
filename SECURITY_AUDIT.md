# Security Audit — Orchestration Security Center
**Audit date:** 2026-04-26 · **Auditor:** Omar Kapil

## 1. Scope
Production Docker images, FastAPI codebase, Caddy/Nginx reverse proxy config, secrets handling, and the AI-agent pipeline. Out of scope: lab vulnerable services (`docker-compose.lab.yml`) which are intentionally insecure.

## 2. Tooling
- `trivy image` — CRITICAL+HIGH gate against the published backend, frontend, and worker images
- `bandit -r backend/app` — Python static analysis
- `pip-audit -r backend/requirements.txt` — dependency CVE scan
- `npm audit --omit=dev` (frontend)
- Manual OWASP Top 10 (2021) self-assessment

## 3. Findings summary
| ID | Severity | Component | Title | Status |
|----|----------|-----------|-------|--------|
| (fill from trivy output) |  |  |  |  |
| (fill from bandit output) |  |  |  |  |
| (fill from pip-audit) |  |  |  |  |

> Run `make audit` (or the commands in §2) and paste the trimmed results above before sign-off.

## 4. OWASP Top 10 self-check
| OWASP | Mitigation in our codebase | Evidence |
|---|---|---|
| A01 Broken Access Control | `require_role()` dependency on every mutating route; admin-only RBAC routes; ProtectedRoute + RoleGuard on the frontend | [backend/app/api/deps.py:46](backend/app/api/deps.py#L46), [backend/app/api/v1/endpoints/rbac.py](backend/app/api/v1/endpoints/rbac.py), [frontend/src/components/auth/RoleGuard.jsx](frontend/src/components/auth/RoleGuard.jsx) |
| A02 Cryptographic Failures | bcrypt for password hashing; Fernet for at-rest credential encryption; TLS terminated at Caddy | [backend/app/core/security.py](backend/app/core/security.py), [backend/app/core/crypto.py](backend/app/core/crypto.py), [infra/caddy/Caddyfile](infra/caddy/Caddyfile) |
| A03 Injection | SQLAlchemy ORM (no raw SQL); Pydantic validation on every request body; shell-safe wrappers for nmap/nuclei | [backend/app/services/nmap_wrapper.py](backend/app/services/nmap_wrapper.py) |
| A04 Insecure Design | Scope guard rejects targets outside allow-list; scan dedup prevents flooding | [backend/app/services/scope_guard.py](backend/app/services/scope_guard.py), [backend/app/services/scan_dedup.py](backend/app/services/scan_dedup.py) |
| A05 Security Misconfiguration | Caddy enforces HTTPS + HSTS; CORS pinned; secrets only via env; no debug endpoints in prod build | [infra/caddy/Caddyfile](infra/caddy/Caddyfile), [docker-compose.yml](docker-compose.yml) |
| A06 Vulnerable Components | Trivy gate in CI (CRITICAL+HIGH fail); Dependabot enabled; pinned image digests | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| A07 Identification & Auth Failures | JWT 30-min expiry; bcrypt; force password change on first login; rate-limit on `/auth/login` | [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py) |
| A08 Software/Data Integrity | SHA-256 hash-chained audit log; signed Docker images via cosign (planned) | [backend/app/api/v1/endpoints/audit.py](backend/app/api/v1/endpoints/audit.py) |
| A09 Logging & Monitoring | Structured JSON logs; X-Request-ID middleware; Wazuh + Elastic capture all platform events | [backend/app/core/request_id.py](backend/app/core/request_id.py) |
| A10 SSRF | Scope guard rejects out-of-network targets before any tool invocation | [backend/app/services/scope_guard.py](backend/app/services/scope_guard.py) |

## 5. Threat model (top 5)
| # | Threat | Mitigation | Residual risk |
|---|--------|------------|---------------|
| 1 | Stolen JWT replay | 30-min expiry; rotate signing key on incident | Low |
| 2 | Operator scans an out-of-scope target | Scope guard allow-list; admin-only target creation | Low |
| 3 | LLM-injected malicious advice | LLM is advisory-only; scoring is deterministic; `llm_guard` filter | Low |
| 4 | Worker compromise pivots to lab subnet | Lab on isolated `internal: true` networks; no outbound from worker | Low |
| 5 | Brute-force admin password | bcrypt cost ≥ 12; rate-limit; force change on first login | Medium |

## 6. Action items
- [ ] Paste trivy output; resolve any CRITICAL/HIGH before freeze
- [ ] Paste bandit output; resolve any HIGH severity warnings
- [ ] Paste pip-audit output; bump any vulnerable dependency
- [ ] Add cosign image signing to CD workflow (post-freeze, optional)
- [ ] Add automated dependency review action on PRs
