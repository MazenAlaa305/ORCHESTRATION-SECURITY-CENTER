# components/dashboard/TargetsManager.jsx — Documentation

## File Purpose

The **scan target management interface** (16,274 bytes) — a full CRUD UI for registering, viewing, editing, and deleting scan targets. Also provides the interface for triggering the auto-discovery feature.

## Key Components

### `TargetsManager({ onStartScan })`
Renders the complete target management panel.

**Target List View:**
Displays all registered targets as cards or table rows showing: name, base URL, detected tech stack badges, auth method, creation date, and last scan date. Each card has "Scan Now", "Edit", and "Delete" action buttons.

**Add Target Form:**
A modal or inline form accepting:
- `name` — Human-readable label
- `base_url` — The root URL of the target
- `auth_method` — Dropdown: None, Basic, JWT, Cookie
- `auth_credentials` — Conditionally shown fields for credentials based on `auth_method`

Calls `targetService.create(data)` on submit. Invalidates the targets query on success.

**Auto-Discovery Input:**
A text input for a domain name with a "Discover Assets" button. Calls `targetService.discover(domain)` and shows discovery results as new target candidates that can be confirmed and saved.

**Scan Now:**
The "Scan Now" button on each target card calls `onStartScan(target.base_url)` to immediately trigger an AI scan for that target.

**Delete Confirmation:**
A confirmation dialog prevents accidental deletion. Calls `targetService.delete(id)` on confirm.

## Dependencies
- `react`, `@tanstack/react-query`, `useMutation`
- `../../services/api.js` — `targetService`, `pentesterService`
- `../ui/CyberButton`
