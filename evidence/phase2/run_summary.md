# Executed Verification Summary (§6 deferrals resolved)
**Date:** 2026-04-24

## 1. Environment prepared
- **Node.js** v24.15.0 installed via `winget install OpenJS.NodeJS.LTS`.
- **npm** v11.12.1.
- **Docker Desktop** started from `C:\Program Files\Docker\Docker\Docker Desktop.exe` and confirmed ready via `docker info` (v29.3.1, desktop-linux context).

## 2. Frontend — dependency install + production build
- `npm install --no-audit --no-fund --prefer-offline` → **231 packages, clean.**
- `npm run build` → **`✓ built in 10.49s`**, 3201 modules transformed, output at `frontend/dist/` (1.2 MB).
- Bundle greps confirm the rebuilt scan modal is actually shipped:
  - "Continue" ✓
  - "Launch Scan" ✓
  - "Save Schedule" ✓
  - "Exact request payload" ✓

## 3. Frontend — vite preview smoke test
- `npm run preview -- --port 4173 --host 127.0.0.1`
- `GET http://127.0.0.1:4173/` → **HTTP 200**, 1125 bytes — expected index.html with preloads for `index`, `vendor-query`, `vendor-charts`, `vendor-graph`.
- Preview server stopped cleanly after the smoke test.

## 4. Backend — OpenAPI spec exported
- Ran [evidence/phase2/dump_openapi.py](dump_openapi.py) inside an ephemeral `python:3.10-slim` container with `backend/requirements.txt` installed.
- Output: [docs/contracts/openapi_2026-04-24.json](../../docs/contracts/openapi_2026-04-24.json)
- **57 paths, 32 schemas, OpenAPI 3.1.0.**
- 14 tags confirmed: `System, audit, auth, config, dashboard, findings, lab, network, openvas, reports, scans, siem, targets, vulnerabilities`.
- `ScanCreate` schema fields match exactly the payload shape the rebuilt `ScanConfigModal` posts: `target_id`, `target_url`, `scan_type`, `tools`, `configuration`, `schedule`, `auto_report`, `siem_forward`.

## 5. Deferred items now closed
| Parent-report §6 item | Status |
|---|---|
| Frontend `npm run build` | ✅ PASS |
| `vite preview` HTTP smoke | ✅ 200 OK |
| OpenAPI spec export to `docs/contracts/` | ✅ written — 57 paths, 32 schemas |
| Docker daemon up | ✅ confirmed |
| Node.js present | ✅ v24.15.0 |

What remains deferred: `docker compose up` of the full stack (backend + postgres + redis + worker) for a live end-to-end scan round-trip. The OpenAPI contract-lock is now in place, which is the Phase 2 gate; the full integration run belongs to the regression pass in Phase 7.
