# components/OpenVAS/VulnerabilitiesList.jsx — Documentation

## File Purpose

Displays **vulnerability results from an OpenVAS scan** (5,357 bytes) in a formatted table, presenting CVE identifiers, affected hosts, severity ratings, and port information specific to the OpenVAS result format.

## Key Components

### `OpenVASVulnerabilitiesList({ taskId })`
Fetches and renders OpenVAS scan results for a given `taskId`.

**Data Fetching:** Calls `openvasService.getScanResults(taskId)` when `taskId` is provided.

**Table Columns:** CVE ID (with NVD link if available), Vulnerability Name (NVT name), Host, Port/Protocol, Severity (CVSS score and badge), Description (truncated with expand).

**Differences from Main Vulnerabilities Panel:** OpenVAS results are displayed in their raw GVM format (CVSS numerics, NVT IDs) rather than the normalized AI-validated format of the main vulnerability table.

## Dependencies
- `react`, `@tanstack/react-query`
- `../../services/api.js` — `openvasService`
- `../ui/CyberBadge`
