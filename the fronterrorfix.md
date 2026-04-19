# Frontend Error & Logic Audit — Full Implementation Fix Plan

> Analyzed from: PDF screen reference + full source code audit  
> Covers: Center, Ops (Scan/History/Nodes/Lab), Threats (Vulns/Topology), AI, Docs, Config tabs  
> Total issues found: **22 bugs / logic errors**

---

## SECTION 1 — CRITICAL BUGS (Break functionality)

---

### BUG-01 · `VulnStatus.in_progress` Not in Backend Enum

**File:** `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:282-294`  
**Also:** `backend/app/models/scan.py:32-36` · `backend/app/schemas/scan.py:30-35`

**Problem:**  
The status `<select>` in `VulnerabilitiesPanel` has an `<option value="in_progress">In Progress</option>` option. However, the backend `VulnStatus` enum (both SQLAlchemy and Pydantic) only allows: `open`, `fixed`, `false_positive`, `accepted`. Selecting "In Progress" sends an invalid value to the API — the backend will reject or silently fail it.

**Fix — Step 1:** Add `IN_PROGRESS` to the backend enum in `backend/app/models/scan.py`:
```python
class VulnStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"   # ADD THIS
    FIXED = "fixed"
    FALSE_POSITIVE = "false_positive"
    ACCEPTED = "accepted"
```

**Fix — Step 2:** Add to `backend/app/schemas/scan.py`:
```python
class VulnStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"   # ADD THIS
    FIXED = "fixed"
    FALSE_POSITIVE = "false_positive"
    ACCEPTED = "accepted"
```

**Fix — Step 3:** Create a new Alembic migration (or run `init_db.py`) to update the DB enum type.

---

### BUG-02 · `AssetDetailPanel` Crashes When `details` is Undefined

**File:** `frontend/src/components/dashboard/AssetDetailPanel.jsx:29-31`  
**Also:** `frontend/src/components/dashboard/NetworkTopology.jsx:113-135`

**Problem:**  
In `NetworkTopology.handleNodeClick`, `setSelectedNode(node)` is called immediately with the raw graph node object. For nodes created from assets, `node.details` contains the asset data. However, `AssetDetailPanel` immediately accesses `details.device_type`, `details.hostname`, `details.ip_address` without null-guarding. If `details` is undefined (hub node bypasses this, but malformed asset nodes don't), the component crashes with `TypeError: Cannot read properties of undefined`.

**Fix — `AssetDetailPanel.jsx:4-8`:** Add a guard:
```jsx
const AssetDetailPanel = ({ node, onClose }) => {
    if (!node || !node.details) return null;  // guard added
    const { details, vulnCount } = node;
```

**Fix — `NetworkTopology.jsx:114`:** The hub node guard exists (`if (node.id === 'hub') { setSelectedNode(node); return; }`) but the panel still renders when `selectedNode.id === 'hub'` due to the `!compact` check. Add a guard:
```jsx
{selectedNode && selectedNode.id !== 'hub' && selectedNode.details && (
    <AssetDetailPanel ... />
)}
```

---

### BUG-03 · Status Update in VulnerabilitiesPanel Has No Error Handling or Await

**File:** `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:283-287`

**Problem:**  
```jsx
onChange={(e) => {
    vulnerabilityService.updateWorkflow(vuln.id, { status: e.target.value });
    fetchVulnerabilities();  // called without await — runs before update completes
}}
```
`fetchVulnerabilities()` fires immediately without waiting for `updateWorkflow` to complete. The re-fetch will return the OLD status because the update hasn't been committed yet. Also, if `updateWorkflow` fails, `fetchVulnerabilities` still runs and resets the UI silently.

**Fix:**
```jsx
onChange={async (e) => {
    const newStatus = e.target.value;
    try {
        await vulnerabilityService.updateWorkflow(vuln.id, { status: newStatus });
        fetchVulnerabilities();
    } catch (err) {
        console.error('Status update failed:', err);
        // Optionally show a toast/error message
    }
}}
```

---

### BUG-04 · `ScanResponse` Schema Has Duplicate `completed_at` Field

**File:** `backend/app/schemas/scan.py:113-120`

**Problem:**  
```python
class ScanResponse(ScanSummary):
    target_id: Optional[str] = None
    target_url: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None   # DUPLICATE — shadows first declaration
```
The second `completed_at` declaration shadows the first. In Pydantic v2 this causes a validator warning and can cause unexpected behavior in subclasses.

**Fix:** Remove the duplicate line (line 120 in scan.py).

---

### BUG-05 · `IncidentDetailDrawer` — Parent List Not Refreshed After Status Change

**File:** `frontend/src/components/dashboard/IncidentDetailDrawer.jsx:67-83`  
**Also:** `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:317-322`

**Problem:**  
When the user clicks "Mark as Fixed" or "False Positive" inside the drawer, the vulnerability status is updated on the backend, but `VulnerabilitiesPanel` (the parent) is never told to re-fetch. The list still shows the old status until the user manually refreshes.

**Fix — Step 1:** Add a callback prop to `IncidentDetailDrawer`:
```jsx
const IncidentDetailDrawer = ({ vuln, onClose, onStatusChange }) => {
```

**Fix — Step 2:** Call it after successful status updates:
```jsx
const handleMarkFixed = async () => {
    try {
        await vulnerabilityService.markFixed(vuln.id);
        setActionMsg({ type: 'success', text: 'Marked as fixed' });
        onStatusChange?.();   // notify parent
    } catch { ... }
};
```

**Fix — Step 3:** Pass the callback from `VulnerabilitiesPanel`:
```jsx
<IncidentDetailDrawer
    vuln={selectedVuln}
    onClose={() => { setShowDrawer(false); setSelectedVuln(null); }}
    onStatusChange={fetchVulnerabilities}  // ADD THIS
/>
```

---

## SECTION 2 — LOGIC ERRORS (Wrong behavior, silent failures)

---

### BUG-06 · OpenVAS Scanner Tab Shows Wrong Scan Data

**File:** `frontend/src/pages/Dashboard.jsx:252-265`

**Problem:**  
The Ops → Scan tab (OpenVAS) passes `latestScanVulns` to `RiskChart` and `latestScan?.configuration?.openvas_task_id` to `VulnerabilitiesList`. `latestScan` is the **most recent scan of any type** — it could be an AI scan, not an OpenVAS scan. This means:
- `RiskChart` shows AI scan vulnerabilities on the OpenVAS tab
- `VulnerabilitiesList taskId` is `undefined` if latest scan isn't OpenVAS

**Fix:** Track the latest OpenVAS scan separately by filtering scans:
```jsx
// In Dashboard.jsx after scans query
const latestOpenVASScan = scans.find(s => 
    s.configuration?.openvas_task_id || s.scan_type === 'openvas'
) ?? null;
const openvasTaskId = latestOpenVASScan?.configuration?.openvas_task_id;
```
Then pass `latestOpenVASScan` data to the OpenVAS panel instead of `latestScan`.

---

### BUG-07 · `getNodeColor` Has Redundant/Wrong Color Logic

**File:** `frontend/src/components/dashboard/NetworkTopology.jsx:9-16`

**Problem:**  
```js
if (node.riskScore >= 75)  return '#ff0055';  // red (critical)
if (node.riskScore >= 50)  return '#ffaa00';  // orange (high)
if (node.riskScore >= 20)  return '#ffaa00';  // orange (medium) ← SAME COLOR AS HIGH
if ((node.vulnCount || 0) > 0) return '#ffaa00';  // orange
return '#00ff88';  // green
```
Risk scores 20-49 and 50-74 both return `'#ffaa00'`. The `>= 50` case is checked first and matched before `>= 20`, making the `>= 20` branch redundant. Visually, there is no distinction between "medium risk" and "high risk" nodes.

**Fix:**
```js
const getNodeColor = (node) => {
    if (node.id === 'hub')         return '#00ffff';
    if (node.riskScore >= 75)      return '#ff0055';  // critical — red
    if (node.riskScore >= 50)      return '#ff6a00';  // high — orange
    if (node.riskScore >= 20)      return '#ffaa00';  // medium — amber
    if ((node.vulnCount || 0) > 0) return '#ffaa00';  // has vulns — amber
    return '#00ff88';                                   // clean — green
};
```

---

### BUG-08 · `handleNodeClick` Camera Centering Formula Is Wrong

**File:** `frontend/src/components/dashboard/NetworkTopology.jsx:129-134`

**Problem:**  
```js
const dist = 50;
const ratio = 1 + dist / Math.hypot(node.x || 1, node.y || 1);
fgRef.current.centerAt(node.x * ratio, node.y * ratio, 1000);
```
`Math.hypot(node.x, node.y)` is the distance of the node from the graph origin `(0,0)`, not from the camera. The `ratio` formula will scale the x/y coordinates by an arbitrary factor that pushes the camera away from the node, not toward it. For nodes near the origin, the ratio is huge and causes extreme camera movement.

**Fix:** Center directly on the node position:
```js
if (fgRef.current) {
    fgRef.current.centerAt(node.x, node.y, 800);
    fgRef.current.zoom(3.5, 1000);
}
```

---

### BUG-09 · VulnerabilitiesPanel Filter Not Applied Locally — Only Server-Side

**File:** `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:90-103`

**Problem:**  
The `filter` state (severity + status dropdowns) is sent as API query params to `fetchVulnerabilities()`, but the local `displayed` array computation **only filters by `search`**. This is inconsistent:
- `search` is purely client-side (no API call)
- `filter.severity` / `filter.status` are purely server-side (require a new API call)
- If the API doesn't support these params, nothing is filtered at all

Also, `fetchVulnerabilities` doesn't reset the `loading` state on subsequent calls (only initial render shows spinner).

**Fix — Step 1:** Add missing `setLoading(true)` at the start of `fetchVulnerabilities`:
```jsx
const fetchVulnerabilities = async () => {
    setLoading(true);   // ADD THIS
    try { ... }
    finally { setLoading(false); }
};
```

**Fix — Step 2:** Also apply severity/status filters locally for immediate response:
```jsx
const displayed = vulnerabilities
    .filter(v => {
        if (filter.severity && (v.severity || '').toLowerCase() !== filter.severity) return false;
        if (filter.status && (v.status || '') !== filter.status) return false;
        if (search) {
            const q = search.toLowerCase();
            return (v.type || '').toLowerCase().includes(q) ||
                   (v.url || '').toLowerCase().includes(q) ||
                   (v.cve_id || '').toLowerCase().includes(q);
        }
        return true;
    })
    .sort(...);
```

---

### BUG-10 · `handleScanStarted` Redirects Away from Current Work Without Warning

**File:** `frontend/src/pages/Dashboard.jsx:121-124`

**Problem:**  
```jsx
const handleScanStarted = () => {
    setActiveTab('ai-brain');
    setActiveSubTab('ai-console');
};
```
This is called from:
1. `ScanButton` in the overview tab — acceptable UX
2. `TargetsManager` via `onScanStarted?.()` — user is in Nodes tab, click "AI Scan", and is **silently redirected** to the AI tab without warning

The user loses their place in the Nodes tab. Also, `ai-brain` has no `SubTabBar`, so setting `activeSubTab = 'ai-console'` has no visible effect (it's a dead assignment for this tab).

**Fix — Step 1:** Remove the dead `activeSubTab` assignment for ai-brain (since it has no subtabs):
```jsx
const handleScanStarted = () => {
    setActiveTab('ai-brain');
    // Remove: setActiveSubTab('ai-console');  — ai-brain has no subtabs
};
```

**Fix — Step 2:** In `TargetsManager`, don't redirect on scan start — just show an inline success message:
```jsx
const handleStartAIScan = async (targetId) => {
    setScanning(targetId);
    try {
        await pentesterService.startAIScan(targetId);
        setScanMessage('Scan started — check the AI tab for live progress');
        // Don't call onScanStarted?.() which redirects
    } catch (error) {
        setScanMessage('Scan failed to start');
    } finally {
        setScanning(null);
    }
};
```

---

### BUG-11 · `trendData` Uses Incorrect Fallback Chain for Vuln Count

**File:** `frontend/src/pages/Dashboard.jsx:132-135`

**Problem:**  
```jsx
count: s.vulnerabilities_count ?? s.vulnerability_count ?? s.vulnerabilities?.length ?? 0,
```
- `s.vulnerabilities_count` — a Python property on the model, but `ScanSummary` schema explicitly sets this to `Optional[int] = 0`; it will always return `0` if the scan has no loaded relationships (lazy loading not triggered in list queries)
- `s.vulnerabilities?.length` — the `ScanSummary` schema does NOT include a `vulnerabilities` array; this will always be `undefined`

The trend chart will always show `0` for all scans because the summary endpoint doesn't load vulnerability relationships.

**Fix:** Fetch trend data differently. Either:
1. Add a `vulnerabilities_count` computed column to the scan query (backend fix)
2. Or accept that trend requires a separate query per scan (expensive)

**Recommended fix (backend):** In the scan list endpoint, add `.options(selectinload(Scan.vulnerabilities))` to eagerly load or use a subquery count. Then `vulnerabilities_count` in `ScanSummary` will be accurate.

**Quick frontend fix:** Remove the broken fallback chain and rely only on `vulnerabilities_count`:
```jsx
count: s.vulnerabilities_count ?? 0,
```

---

### BUG-12 · `Reports.jsx` Has Unused `API_BASE` Variable

**File:** `frontend/src/components/dashboard/Reports.jsx:5`

**Problem:**  
```jsx
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
```
This variable is defined but **never used**. All API calls correctly go through the `api.js` axios instance. The dead variable could cause confusion when debugging.

**Fix:** Remove line 5 from `Reports.jsx`.

---

### BUG-13 · `TargetsManager` Uses `window.confirm()` — Blocked in Secure Contexts

**File:** `frontend/src/components/dashboard/TargetsManager.jsx:47-51`

**Problem:**  
```jsx
if (!window.confirm('Delete this target and all associated data?')) return;
```
`window.confirm` is synchronous, blocks the UI, looks broken in Electron/embedded contexts, and is often blocked by browser popup policies. It also breaks the dark-themed UI aesthetic.

**Fix:** Replace with a controlled state-based confirmation modal:
```jsx
const [confirmDelete, setConfirmDelete] = useState(null); // target id to delete

// Show inline confirmation
{confirmDelete === target.id && (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 rounded-xl">
        <div className="glass-card p-4 text-center space-y-3">
            <p className="text-white text-sm">Delete this target?</p>
            <div className="flex gap-2 justify-center">
                <button onClick={() => { doDelete(target.id); setConfirmDelete(null); }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                <button onClick={() => setConfirmDelete(null)}
                    className="px-3 py-1 bg-gray-700 text-white rounded text-xs">Cancel</button>
            </div>
        </div>
    </div>
)}
```

---

### BUG-14 · `TargetsManager` & `VulnerabilitiesPanel` Missing User-Facing Error Display

**Files:**
- `frontend/src/components/dashboard/TargetsManager.jsx:42-45`, `48-54`, `62-66`
- `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:47-48`

**Problem:**  
All error handlers only call `console.error()`. Users never see feedback when:
- Target list fails to load
- Discovery fails
- Delete fails
- Scan fails to start
- Vulnerability list fails to load

**Fix:** Add a shared `error` state to each component and render an error banner:
```jsx
const [error, setError] = useState(null);

// In catch blocks:
} catch (err) {
    setError(err?.response?.data?.detail || 'Operation failed. Please try again.');
}

// In render:
{error && (
    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> {error}
        <button onClick={() => setError(null)} className="ml-auto">✕</button>
    </div>
)}
```

---

## SECTION 3 — UI / UX LOGIC ISSUES

---

### BUG-15 · AI Brain Tab Has Dead SubTab State

**File:** `frontend/src/pages/Dashboard.jsx:300-307`

**Problem:**  
```jsx
{activeTab === 'ai-brain' && (
    <div className="animate-fade-in space-y-4">
        <Suspense fallback={<PanelLoader />}>
            <ScanPipelinePanel ... />
            <AgentLogViewer ... />
        </Suspense>
    </div>
)}
```
The `ai-brain` tab has no `SubTabBar`. When `handleScanStarted` sets `activeSubTab = 'ai-console'`, it's a no-op. If more sub-views are planned (like a separate Agent Logs view), the SubTabBar is missing.

**Fix:** Either add a SubTabBar with at least `pipeline` and `logs` sub-tabs, or clean up the `handleScanStarted` to not set a useless `activeSubTab`:
```jsx
// Option A: Add subtabs
<SubTabBar
    tabs={[
        { id: 'pipeline', label: 'Pipeline', icon: <Zap /> },
        { id: 'logs',     label: 'Agent Logs', icon: <Activity /> },
    ]}
    active={activeSubTab}
    onChange={setActiveSubTab}
/>
{activeSubTab === 'pipeline' && <ScanPipelinePanel ... />}
{activeSubTab === 'logs'     && <AgentLogViewer ... />}
```

---

### BUG-16 · Reports Tab Fixed Height Clips on Small Screens

**File:** `frontend/src/components/dashboard/Reports.jsx:120`

**Problem:**  
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
```
`100vh - 200px` assumes a fixed 200px for the header/nav area. If the header is taller (e.g., on mobile, or with a larger sub-tab bar), content is clipped. On very short screens, this can be negative or cause overflow.

**Fix:** Use `min-h` instead of `h`, and rely on flex grow:
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px] h-full">
```

---

### BUG-17 · `ScanDefaults` Shows Default Values Before Config Loads

**File:** `frontend/src/components/dashboard/SettingsPanel.jsx:91-96`

**Problem:**  
```jsx
const [daily, setDaily] = useState(get('LLM_DAILY_TOKEN_BUDGET', 500000));
const [perScan, setPerScan] = useState(get('LLM_PER_SCAN_TOKEN_BUDGET', 50000));
```
`get()` looks up `flags.find(...)`. On first render, `flags` may be empty (still loading), so `daily` initializes to the fallback `500000` even if the real value is different. The `useEffect` corrects this after the data loads, causing a visible value flash.

**Fix:** Show inputs only after `flags` is non-empty, or initialize with `null` and show a placeholder:
```jsx
const [daily, setDaily] = useState(null);
const [perScan, setPerScan] = useState(null);

useEffect(() => {
    if (flags.length === 0) return;   // wait for data
    setDaily(get('LLM_DAILY_TOKEN_BUDGET', 500000));
    setPerScan(get('LLM_PER_SCAN_TOKEN_BUDGET', 50000));
}, [flags]);

// In the input: value={daily ?? ''}
```

---

### BUG-18 · `NetworkTopology` in Compact Mode Renders Unnecessary Grid Column

**File:** `frontend/src/components/dashboard/NetworkTopology.jsx:267`

**Problem:**  
```jsx
<div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 ...`}>
```
When `compact=true`, `lg:grid-cols-1` is explicitly set but the wrapper div still has `gap-6` which adds unnecessary spacing. Also, `!compact` hides the detail panel correctly, but the grid still allocates the layout structure for it.

**Fix:** Simplify the compact mode rendering:
```jsx
if (compact) {
    return (
        <div className="w-full" style={{ minHeight: 300 }}>
            {/* Graph only — no details panel */}
            <div className="relative overflow-hidden glass-card p-0 h-full">
                {/* ... graph content ... */}
            </div>
        </div>
    );
}
// Non-compact: full grid with detail panel
return (
    <div className="grid lg:grid-cols-3 gap-6 ...">
        ...
    </div>
);
```

---

### BUG-19 · `EnvironmentWizard` Always Rendered (Wasted Resources)

**File:** `frontend/src/components/dashboard/TargetsManager.jsx:160-164`

**Problem:**  
```jsx
<EnvironmentWizard
    open={showWizard}
    onClose={() => setShowWizard(false)}
    onCreated={() => { fetchTargets(); setShowWizard(false); }}
/>
```
`EnvironmentWizard` is always mounted in the DOM, even when `open={false}`. If it fetches data on mount (environment options, etc.), those requests run on every `TargetsManager` render even if the wizard is never opened.

**Fix:**
```jsx
{showWizard && (
    <EnvironmentWizard
        open={true}
        onClose={() => setShowWizard(false)}
        onCreated={() => { fetchTargets(); setShowWizard(false); }}
    />
)}
```

---

### BUG-20 · No WebSocket Disconnection Indicator

**File:** `frontend/src/context/RealTimeContext.jsx` (not read but implied by usage)

**Problem:**  
The dashboard uses real-time data from a WebSocket context. If the WebSocket disconnects (backend restart, network drop), the KPI cards, OrchestrationFeed, and status indicators silently show stale data. There is no "DISCONNECTED" or "RECONNECTING" badge visible to the user.

**Fix:** Add a connection state to `RealTimeContext` and render an indicator in `Dashboard.jsx`:
```jsx
// In Dashboard header, near the MONITORING badge:
{!realTime.connected && (
    <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded animate-pulse">
        WS RECONNECTING...
    </span>
)}
```

---

### BUG-21 · `VulnerabilitiesPanel` Severity Filter Sent as API Param But Not Validated

**File:** `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx:41-51`

**Problem:**  
```jsx
const params = { ...filter };
if (scanId) params.scan_id = scanId;
const response = await vulnerabilityService.list(params);
```
The `filter` object includes `{ severity: '', status: '' }` by default. Sending `severity=` (empty string) as a query param may confuse the backend filtering logic — it's not the same as not sending the param at all.

**Fix:** Strip empty string params before sending:
```jsx
const fetchVulnerabilities = async () => {
    setLoading(true);
    try {
        const params = {};
        if (scanId)           params.scan_id  = scanId;
        if (filter.severity)  params.severity = filter.severity;
        if (filter.status)    params.status   = filter.status;
        const response = await vulnerabilityService.list(params);
        setVulnerabilities(response.data || []);
    } catch (error) {
        console.error('Failed to fetch vulnerabilities:', error);
        setError('Failed to load vulnerabilities');
    } finally {
        setLoading(false);
    }
};
```

---

### BUG-22 · `AssetDetailPanel` Has No `os_family` Field in `ScanAsset` Model

**File:** `backend/app/models/scan.py:361-383`  
**Also:** `frontend/src/components/dashboard/AssetDetailPanel.jsx:64-67`

**Problem:**  
`AssetDetailPanel` renders `details?.os_family` in the Identity section. The `ScanAsset` SQLAlchemy model has `os_name` and `os_accuracy` but **no `os_family` column**. The `ScanAssetResponse` schema does include `os_family: Optional[str] = None` as if it exists. This means the field will always be `null`/`None`.

**Fix — Step 1:** Add `os_family` to the `ScanAsset` model in `backend/app/models/scan.py`:
```python
class ScanAsset(Base):
    ...
    os_name = Column(String, nullable=True)
    os_family = Column(String, nullable=True)   # ADD THIS
    os_accuracy = Column(Integer, nullable=True)
```

**Fix — Step 2:** Update nmap wrapper to populate `os_family` from the nmap OS match data (e.g., extract the family from `osmatch.osclass`).

---

## SECTION 4 — IMPLEMENTATION ORDER (Priority Sequence)

Execute fixes in this exact order to avoid breaking dependencies:

```
PHASE 1 — Backend data model fixes (must come first)
├── Step 1  BUG-01  Add IN_PROGRESS to VulnStatus enum (backend models + schemas)
├── Step 2  BUG-22  Add os_family to ScanAsset model
├── Step 3  BUG-04  Remove duplicate completed_at in ScanResponse schema
└── Step 4          Run database migration / init_db.py to apply model changes

PHASE 2 — Critical frontend crash fixes
├── Step 5  BUG-02  Guard AssetDetailPanel against undefined details
├── Step 6  BUG-03  Fix async status update in VulnerabilitiesPanel
└── Step 7  BUG-05  Add onStatusChange callback to IncidentDetailDrawer

PHASE 3 — Logic error fixes
├── Step 8  BUG-06  Fix OpenVAS tab to use openvas-specific scan data
├── Step 9  BUG-07  Fix getNodeColor to distinguish medium vs high risk
├── Step 10 BUG-08  Fix handleNodeClick camera centering formula
├── Step 11 BUG-09  Fix VulnerabilitiesPanel filter: add setLoading(true) + local filter
├── Step 12 BUG-11  Fix trendData vulnerability count (remove broken fallback chain)
└── Step 13 BUG-21  Strip empty filter params before API call

PHASE 4 — UX / logic cleanup
├── Step 14 BUG-10  Fix handleScanStarted redirect behavior in TargetsManager
├── Step 15 BUG-12  Remove unused API_BASE variable in Reports.jsx
├── Step 16 BUG-13  Replace window.confirm with inline confirmation in TargetsManager
├── Step 17 BUG-14  Add user-facing error display to TargetsManager + VulnerabilitiesPanel
├── Step 18 BUG-15  Fix AI Brain tab: add SubTabBar or remove dead activeSubTab assignment
├── Step 19 BUG-16  Fix Reports tab height from h-[calc] to min-h / flex
├── Step 20 BUG-17  Fix ScanDefaults input flash on config load
├── Step 21 BUG-18  Simplify NetworkTopology compact mode rendering
├── Step 22 BUG-19  Conditionally mount EnvironmentWizard
└── Step 23 BUG-20  Add WebSocket disconnection indicator to Dashboard header
```

---

## SECTION 5 — FILES TO MODIFY (Summary)

| File | Bugs Fixed |
|------|-----------|
| `backend/app/models/scan.py` | BUG-01, BUG-22 |
| `backend/app/schemas/scan.py` | BUG-01, BUG-04 |
| `backend/app/services/nmap_wrapper.py` | BUG-22 |
| `frontend/src/pages/Dashboard.jsx` | BUG-06, BUG-10, BUG-11, BUG-15, BUG-20 |
| `frontend/src/components/dashboard/VulnerabilitiesPanel.jsx` | BUG-03, BUG-05, BUG-09, BUG-14, BUG-21 |
| `frontend/src/components/dashboard/NetworkTopology.jsx` | BUG-02, BUG-07, BUG-08, BUG-18 |
| `frontend/src/components/dashboard/AssetDetailPanel.jsx` | BUG-02 |
| `frontend/src/components/dashboard/IncidentDetailDrawer.jsx` | BUG-05 |
| `frontend/src/components/dashboard/TargetsManager.jsx` | BUG-10, BUG-13, BUG-14, BUG-19 |
| `frontend/src/components/dashboard/Reports.jsx` | BUG-12, BUG-16 |
| `frontend/src/components/dashboard/SettingsPanel.jsx` | BUG-17 |

---

*Generated by code audit — 2026-04-20*
