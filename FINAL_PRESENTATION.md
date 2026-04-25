# Final Presentation — Speaker Plan
**Total:** 30 min (25 + 5 Q&A buffer)

## Speaker order & timing
| Time          | Speaker     | Topic                                          | Slide range |
|---------------|-------------|------------------------------------------------|-------------|
| 0:00–3:00     | Omar Kapil  | Intro + project context, problem statement    | 1–4         |
| 3:00–8:00     | Reem Amin   | Backend & AI agent pipeline                    | 5–10        |
| 8:00–13:00    | Marize Ehap | Frontend + visualisation walkthrough           | 11–15       |
| 13:00–18:00   | Shahd Paher | Lab environment + scanning depth               | 16–20       |
| 18:00–28:00   | Omar Kapil  | Live demo (`demo/demo_script.md`)              | live        |
| 28:00–30:00   | All sub-leaders | Q&A                                        | —           |

## Per-speaker talking points

### Omar Kapil — Intro
- 1 in 3 SMEs hit by an attack last year; none can afford a SOC.
- We translate raw alerts into 5 prioritised actions, with explanations.
- Stack overview slide (FastAPI + React + Postgres + Redis + Wazuh + Elastic + Nuclei + Nmap + Gemini advisory).
- "The whole platform runs on a single laptop. Demo will be live."

### Reem Amin — Backend
- 4-stage agent pipeline diagram: Recon → Attack → Validation → Scoring.
- UnifiedRiskEngine determinism — no LLM in scoring path; LLM is advisory only.
- JWT + RBAC + audit chain; Fernet encryption-at-rest for credentials.
- Show the `/docs` Swagger page briefly to ground the API in reality.

### Marize Ehap — Frontend
- React 18 + Vite, lazy-loaded panels, code-split routes.
- WebSocket real-time updates with `{type, payload, seq, ts}` envelope.
- Cyber design system tour (color tokens, dark theme, accessibility).
- Show one panel each from KPIs, network topology, vuln drill-down.

### Shahd Paher — Security/Lab
- 4-zone segmented lab (DMZ / Corp / Data / MGMT) — `internal: true` on isolated subnets.
- Nuclei + Nmap pipeline, plus OpenVAS deep scans.
- Live attack scenarios: `lab/scenarios/sqli_scenario.md`, `xss_scenario.md`, `misconfig_scenario.md`.
- Custom Wazuh rules in `lab/wazuh/custom_rules.xml`.

## Q&A — prepared answers
1. **"How do you prevent the LLM from hallucinating?"**
   It is advisory-only; scoring is deterministic. `llm_guard` blocks destructive output, and we have a daily token budget. The platform will run end-to-end with the LLM disabled.
2. **"Why not commercial tools (Tenable, Rapid7, Qualys)?"**
   Cost (open-source stack, free for an SME), explainability (we show the why behind each score), and customisation for the SME context (small footprint, single-laptop deploy).
3. **"How do you handle false positives?"**
   Validation stage drops findings with confidence < 0.6; `finding_dedup` deduplicates across runs; admins can mark a finding as a false positive and the scoring engine learns the suppression.
4. **"What about scope creep / scanning out-of-scope assets?"**
   `scope_guard` enforces an admin-managed allow-list; any out-of-scope target is rejected before any tool is invoked, with an audit-log entry.
5. **"How do you secure the platform itself?"**
   See [SECURITY_AUDIT.md](SECURITY_AUDIT.md). JWT + bcrypt + RBAC + force password change + Caddy TLS + Trivy gate in CI.
6. **"What's the stretch roadmap?"**
   Postman collection (P3), cosign image signing, agent autoscaling, support for cloud asset discovery (AWS/GCP), expanded SOAR playbooks via n8n.

## Rehearsal targets
- Full run-through, mics on, in the demo room, **at least twice** before stage day.
- Each speaker times themselves; total ≤ 25 min before Q&A.
- Run [`demo/demo_checklist.md`](demo/demo_checklist.md) T-30 minutes from stage time.
