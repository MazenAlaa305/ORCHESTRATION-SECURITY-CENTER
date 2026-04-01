# components/dashboard/ScanPipelinePanel.jsx — Documentation

## File Purpose

Visualizes the **AI agent pipeline as a stepwise progress flow** (6,782 bytes) for the currently selected scan. Displays which pipeline stage is active, completed, or failed, giving users a clear visual metaphor for the multi-agent process.

## Key Components

### `ScanPipelinePanel({ scan, agentLogs })`
Renders a horizontal (or vertical on mobile) pipeline with 5 stages.

**Stages:**
1. **Recon** — Web crawling and Nmap
2. **Attack** — Payload injection and Nuclei
3. **Validation** — LLM false-positive filtering
4. **SIEM Analysis** — Elasticsearch/Wazuh correlation
5. **Report** — Risk scoring and report generation

**Stage Status Derivation:**
Each stage's status is inferred from the `agentLogs` list — a completed stage has a corresponding `*_complete` action log. A running stage has a `start_*` log but no completion log. A failed stage has a `*_failed` log.

**Visual States:**
- **Pending** — Gray, locked icon
- **Running** — Blue with pulsing animation and spinning loader
- **Completed** — Green with checkmark
- **Failed** — Red with X icon

**Details Expansion:** Clicking a completed stage expands a sub-panel showing the key output data from the relevant agent log entry (e.g., "Discovered 12 endpoints" for Recon, "Found 3 potential issues" for Attack).

## Dependencies
- `react`
- `../ui/CyberBadge`
