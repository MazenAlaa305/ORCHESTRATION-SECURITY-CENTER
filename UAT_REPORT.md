# UAT Report — Orchestration Security Center
**Session:** 2026-04-26 · **Participants:** 11 (full team)

## Methodology
Each member runs through `demo/demo_checklist.md` against their own browser/laptop, on a fresh clone of the repo. Bugs and observations are logged below. Each scenario has three pass criteria: completes successfully, completes within the stated time budget, no console/server errors during the run.

## Environment
- Backend: `docker compose up -d` (main) + `docker compose -f docker-compose.lab.yml up -d` (lab)
- Browser matrix: Chrome 120, Firefox 122, Edge 120
- OS: Windows 11, macOS 14, Ubuntu 22.04

## Bugs found
| # | Title | Steps | Expected | Actual | Severity | Status |
|---|-------|-------|----------|--------|----------|--------|
| 1 | (fill from session) | … | … | … | High | Open |
| 2 | … | … | … | … | Medium | Open |

## Pass rate
- Login flow: __ / 11
- Trigger Quick scan: __ / 11
- Drill into a CRITICAL finding: __ / 11
- View RemediationPanel content: __ / 11
- Export PDF report: __ / 11
- View SIEM correlation tab: __ / 11
- Admin RBAC (create + disable user): __ / 11

## Observations & feedback
- (qualitative notes — UI clarity, naming, perceived speed, anything that surprised the user)

## Sign-off
- Backend: Reem · ☐
- Frontend: Marize · ☐
- Security: Shahd · ☐
- DevOps/QA: Omar K · ☐
- Project Lead: Omar K · ☐
