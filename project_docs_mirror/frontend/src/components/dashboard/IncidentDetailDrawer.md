# components/dashboard/IncidentDetailDrawer.jsx — Documentation

## File Purpose

A **slide-in drawer panel** (17,154 bytes) that displays comprehensive details for a selected vulnerability, including full evidence, AI validation results, remediation steps, and workflow management controls.

## Key Components

### `IncidentDetailDrawer({ vuln, onClose, onUpdate })`
A fixed-position overlay drawer that slides in from the right side of the screen.

**Sections:**

**Header Bar**: Vulnerability type as title, severity badge, status badge, and a close button.

**Overview Section**: URL, affected parameter, affected host/port/service, discovery timestamp, confidence score (displayed as a percentage bar), and AI validation verdict.

**Evidence Panel**: Displays the `evidence` JSON object in a formatted, syntax-highlighted code block showing the HTTP request/payload and response snippet.

**AI Assessment**: Shows the full `ai_validation_result` from the ValidationAgent — LLM verdict, reasoning text, and adjusted confidence.

**Remediation Steps**: Displays `remediation_steps` as a numbered checklist. Each step can be checked off by the analyst (client-side state only).

**Proof of Concept**: A collapsible section showing `proof_of_concept` text with a copy-to-clipboard button.

**Workflow Controls:**
- **Status Selector** — Dropdown to change status to `open`, `fixed`, `accepted`, or `false_positive`. Calls `vulnerabilityService.update(id, { status })` on change.
- **Assign To** — Text input for analyst email. Calls `vulnerabilityService.updateWorkflow(id, { assigned_to })`.
- **Ticket ID** — Input for Jira/Linear ticket number. Calls `vulnerabilityService.updateWorkflow(id, { ticket_id })`.
- **AI Re-validate** — Button that calls `vulnerabilityService.revalidate(id)` and refreshes the AI assessment section.

## Dependencies
- `react`, `@tanstack/react-query`, `useMutation`
- `../../services/api.js` — `vulnerabilityService`
- `../ui/CyberBadge`, `../ui/CyberButton`
