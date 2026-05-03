import React, { useState, useEffect, useRef } from 'react';
import { Bug, AlertTriangle, Shield, CheckCircle, XCircle, ExternalLink, Code, Loader2, Filter, Search, ChevronUp, ChevronDown, Bookmark, Trash2, Download, X as XIcon } from 'lucide-react';
import { vulnerabilityService } from '../../services/api';
import IncidentDetailDrawer from './IncidentDetailDrawer';
import { useSavedViews } from '../../hooks/useSavedViews';
import { useToast } from '../ToastProvider';
import { useEnvStore } from '../../stores/envStore';

const SEV_BORDER = {
    critical: 'border-l-red-500 shadow-[inset_3px_0_0_rgba(239,68,68,0.5)]',
    high:     'border-l-orange-500 shadow-[inset_3px_0_0_rgba(249,115,22,0.5)]',
    medium:   'border-l-yellow-500 shadow-[inset_3px_0_0_rgba(234,179,8,0.5)]',
    low:      'border-l-blue-400 shadow-[inset_3px_0_0_rgba(96,165,250,0.5)]',
    info:     'border-l-gray-500',
};

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_COLORS_BAR = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-400',
    low: 'bg-blue-400',
    info: 'bg-gray-500',
};

// Compact labels for framework / compliance tags shown as row chips.
const FRAMEWORK_LABEL = {
    owasp_top10:         'OWASP',
    cwe:                 'CWE',
    iso27001_annex_a:    'ISO',
    nist_csf_function:   'NIST',
    pci_dss_requirement: 'PCI',
    mitre_attack:        'MITRE',
};

/**
 * VulnerabilitiesPanel Component
 * Display and manage discovered vulnerabilities
 */
// Phase 6.3: alert-fatigue defaults — high-signal view out of the box.
// `minSeverity` keeps Info/Low out of the default cut; `hideClosed` hides fixed
// and false-positive observations. Both can be overridden by the user.
const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const DEFAULT_MIN_SEVERITY = 'medium';

// localStorage key for "New since last visit" (Phase 6.3).
const LAST_SEEN_KEY = 'vulns.lastSeenAt';

const VulnerabilitiesPanel = ({ scanId = null, refresh = 0 }) => {
    const [vulnerabilities, setVulnerabilities] = useState([]);
    const [loading, setLoading] = useState(true);
    // Selection is tracked by id so that filter / sort changes don't break the
    // open drawer or the shareable URL hash. The visible vuln + index are
    // derived from `displayed` further down.
    const [selectedFindingId, setSelectedFindingId] = useState(null);
    const [filter, setFilter] = useState({ severity: '', status: '' });
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('severity');
    const [sortDir, setSortDir] = useState('desc');

    // Phase 6.3: alert-fatigue toggles.
    const [minSeverity, setMinSeverity] = useState(DEFAULT_MIN_SEVERITY); // '' | 'low' | 'medium' | 'high' | 'critical'
    const [hideClosed, setHideClosed]   = useState(true);
    const [groupDups, setGroupDups]     = useState(true);

    // ── Saved Views ───────────────────────────────────────────────────────
    const { views: savedViews, save: saveView, remove: removeView } = useSavedViews();
    const [showViewsMenu, setShowViewsMenu]   = useState(false);
    const [savingViewName, setSavingViewName] = useState(''); // '' = input hidden
    const [showSaveInput, setShowSaveInput]   = useState(false);
    const saveInputRef = useRef(null);
    const viewsMenuRef = useRef(null);

    const currentViewPayload = () => ({
        search, filter, sortField, sortDir, minSeverity, hideClosed, groupDups,
    });

    const applyViewPayload = (payload) => {
        if (!payload) return;
        if (payload.search     !== undefined) setSearch(payload.search);
        if (payload.filter     !== undefined) setFilter(payload.filter);
        if (payload.sortField  !== undefined) setSortField(payload.sortField);
        if (payload.sortDir    !== undefined) setSortDir(payload.sortDir);
        if (payload.minSeverity !== undefined) setMinSeverity(payload.minSeverity);
        if (payload.hideClosed !== undefined) setHideClosed(payload.hideClosed);
        if (payload.groupDups  !== undefined) setGroupDups(payload.groupDups);
    };

    // External trigger: sidebar pinned view click
    useEffect(() => {
        const handler = (e) => applyViewPayload(e.detail?.payload);
        window.addEventListener('dashboard:apply-view', handler);
        return () => window.removeEventListener('dashboard:apply-view', handler);
    }, []);

    // Close menus on outside click
    useEffect(() => {
        if (!showViewsMenu) return;
        const handler = (e) => {
            if (viewsMenuRef.current && !viewsMenuRef.current.contains(e.target)) {
                setShowViewsMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showViewsMenu]);

    // Focus save input when shown
    useEffect(() => {
        if (showSaveInput) saveInputRef.current?.focus();
    }, [showSaveInput]);

    // ── Bulk selection ────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(displayed.map(v => String(vulnKey(v)))));
    const clearSelection = () => setSelectedIds(new Set());

    const { addToast } = useToast();
    const { activeEnv } = useEnvStore();

    const bulkUpdate = async (status) => {
        if (!status || selectedIds.size === 0) return;
        const ids = [...selectedIds];
        setBulkLoading(true);
        try {
            const { data } = await vulnerabilityService.bulkUpdate(ids, { status });
            const previous = (data?.updated || []).map(r => ({ id: r.id, status: r.previous_status }));
            clearSelection();
            fetchVulnerabilities();

            // Undo: revert each row to its previous status. 10s window per spec §5.11.
            const undo = async () => {
                try {
                    const groups = previous.reduce((acc, r) => {
                        if (!r.status) return acc;
                        (acc[r.status] = acc[r.status] || []).push(r.id);
                        return acc;
                    }, {});
                    await Promise.all(
                        Object.entries(groups).map(([prevStatus, prevIds]) =>
                            vulnerabilityService.bulkUpdate(prevIds, { status: prevStatus })
                        )
                    );
                    fetchVulnerabilities();
                    addToast('Reverted bulk update', { type: 'success' });
                } catch (e) {
                    console.error('Undo failed:', e);
                    addToast('Undo failed', { type: 'error' });
                }
            };

            addToast(`${ids.length} finding${ids.length === 1 ? '' : 's'} updated to "${status}"`, {
                type: 'success',
                duration: 10000,
                action: { label: 'Undo', onClick: undo },
            });
        } catch (err) {
            console.error('Bulk update failed:', err);
            addToast('Bulk update failed', { type: 'error' });
        } finally {
            setBulkLoading(false);
        }
    };

    const triggerDownload = (filename, content, mime) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportSelected = (format) => {
        const rows = displayed.filter(v => selectedIds.has(String(vulnKey(v))));
        if (format === 'csv') {
            const cols = ['id', 'type', 'severity', 'status', 'url', 'cvss_score', 'confidence_score', 'cve_id'];
            const lines = [
                cols.join(','),
                ...rows.map(v => cols.map(c => JSON.stringify(v[c] ?? '')).join(',')),
            ];
            triggerDownload('findings.csv', lines.join('\n'), 'text/csv');
        } else {
            triggerDownload('findings.json', JSON.stringify(rows, null, 2), 'application/json');
        }
    };

    const [lastSeenAt] = useState(() => {
        try { return parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) || 0; }
        catch { return 0; }
    });

    // Mark this visit after render so the current session keeps the "new" chip.
    useEffect(() => {
        try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())); } catch { /* no-op */ }
    }, []);

    useEffect(() => {
        fetchVulnerabilities();
    }, [scanId, refresh, filter, activeEnv]);

    const fetchVulnerabilities = async () => {
        setLoading(true);
        try {
            const params = {};
            if (scanId)           params.scan_id  = scanId;
            if (filter.severity)  params.severity = filter.severity;
            if (filter.status)    params.status   = filter.status;
            if (activeEnv && activeEnv !== 'all') params.environment = activeEnv;
            const response = await vulnerabilityService.list(params);
            setVulnerabilities(response.data || []);
        } catch (error) {
            console.error('Failed to fetch vulnerabilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const vulnKey = (v) => v?.id ?? v?.finding_id ?? null;

    const handleOpenDrawer = (vuln) => {
        const k = vulnKey(vuln);
        if (k != null) setSelectedFindingId(k);
    };

    const handleCloseDrawer = () => setSelectedFindingId(null);

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open': return <AlertTriangle className="h-4 w-4 text-red-400" />;
            case 'fixed': return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'false_positive': return <XCircle className="h-4 w-4 text-gray-400" />;
            default: return <Bug className="h-4 w-4 text-yellow-400" />;
        }
    };

    // Phase 6.3: dedup collapse — group observations by finding_id so a single
    // row represents "N observations of the same issue".
    const dedupCounts = vulnerabilities.reduce((acc, v) => {
        const key = v.finding_id || v.id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const deduped = groupDups
        ? Object.values(vulnerabilities.reduce((acc, v) => {
            const key = v.finding_id || v.id;
            // Keep the most recently created observation as the canonical row.
            if (!acc[key] || new Date(v.created_at) > new Date(acc[key].created_at)) acc[key] = v;
            return acc;
        }, {}))
        : vulnerabilities;

    const minRank = minSeverity ? SEV_RANK[minSeverity] : -1;

    const displayed = deduped
        .filter(v => {
            const sev = (v.severity || 'info').toLowerCase();
            if (minRank >= 0 && (SEV_RANK[sev] ?? 0) < minRank) return false;
            if (hideClosed && ['fixed', 'false_positive'].includes(v.status)) return false;
            if (filter.severity && sev !== filter.severity) return false;
            if (filter.status && (v.status || '') !== filter.status) return false;
            if (search) {
                const q = search.toLowerCase();
                return (v.type || '').toLowerCase().includes(q) || (v.url || '').toLowerCase().includes(q) || (v.cve_id || '').toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            let av, bv;
            if (sortField === 'severity') { av = SEV_RANK[(a.severity||'info').toLowerCase()] || 0; bv = SEV_RANK[(b.severity||'info').toLowerCase()] || 0; }
            else if (sortField === 'confidence') { av = a.confidence_score || 0; bv = b.confidence_score || 0; }
            else { av = a.type || ''; bv = b.type || ''; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
            return sortDir === 'asc' ? av - bv : bv - av;
        });

    // ── Selection derived from id + displayed list ─────────────────────────
    const selectedIndex = selectedFindingId == null
        ? -1
        : displayed.findIndex(v => String(vulnKey(v)) === String(selectedFindingId));
    const selectedVuln = selectedIndex >= 0 ? displayed[selectedIndex] : null;

    const navigateRel = (delta) => {
        if (!displayed.length) return;
        const next = selectedIndex < 0
            ? (delta > 0 ? 0 : displayed.length - 1)
            : Math.max(0, Math.min(displayed.length - 1, selectedIndex + delta));
        const k = vulnKey(displayed[next]);
        if (k != null) setSelectedFindingId(k);
    };

    // ── URL hash sync — open finding survives a refresh / is shareable ─────
    // Format: #finding=<id>
    useEffect(() => {
        if (selectedFindingId == null) {
            if (window.location.hash.startsWith('#finding=')) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            return;
        }
        const desired = `#finding=${encodeURIComponent(String(selectedFindingId))}`;
        if (window.location.hash !== desired) {
            history.replaceState(null, '', window.location.pathname + window.location.search + desired);
        }
    }, [selectedFindingId]);

    // Read hash on mount + react to back/forward navigation.
    useEffect(() => {
        const apply = () => {
            const m = window.location.hash.match(/^#finding=(.+)$/);
            if (m) setSelectedFindingId(decodeURIComponent(m[1]));
        };
        apply();
        window.addEventListener('hashchange', apply);
        return () => window.removeEventListener('hashchange', apply);
    }, []);

    if (loading) {
        return (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-cyber-neon animate-spin" />
                <span className="text-[10px] font-black text-cyber-neon/60 animate-pulse tracking-[0.3em] uppercase">Decrypting Vulnerability Data...</span>
            </div>
        );
    }

    // Build severity counts
    const sevCounts = {};
    vulnerabilities.forEach(v => {
        const s = (v.severity || 'info').toLowerCase();
        sevCounts[s] = (sevCounts[s] || 0) + 1;
    });
    const total = vulnerabilities.length || 1;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Severity Summary Bar */}
            {vulnerabilities.length > 0 && (
                <div className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Severity Distribution</span>
                        <span className="text-[10px] font-mono text-gray-600">{vulnerabilities.length} total</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {SEV_ORDER.map(sev => {
                            const pct = ((sevCounts[sev] || 0) / total) * 100;
                            if (pct === 0) return null;
                            return (
                                <div key={sev} className={`h-full ${SEV_COLORS_BAR[sev]} transition-all duration-700`}
                                    style={{ width: `${pct}%` }} title={`${sev}: ${sevCounts[sev] || 0}`} />
                            );
                        })}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {SEV_ORDER.filter(s => sevCounts[s]).map(sev => (
                            <div key={sev} className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${SEV_COLORS_BAR[sev]}`} />
                                <span className="text-[10px] font-mono text-gray-500 capitalize">{sev} ({sevCounts[sev]})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Filters + Search */}
            <div className="flex gap-3 items-center flex-wrap">
                <Filter className="h-4 w-4 text-gray-500 shrink-0" />
                {/* Search */}
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-cyber-accent/40 transition-all">
                    <Search className="h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search CVE, type, URL..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none placeholder:text-gray-600 w-40 font-mono"
                    />
                </div>
                {/* Phase 6.3: minimum-severity threshold (default medium). */}
                <label className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    Min sev
                    <select
                        value={minSeverity}
                        onChange={(e) => setMinSeverity(e.target.value)}
                        className="px-2 py-1 bg-black/40 border border-white/10 rounded text-white text-xs"
                    >
                        <option value="">All</option>
                        <option value="low">Low+</option>
                        <option value="medium">Medium+</option>
                        <option value="high">High+</option>
                        <option value="critical">Critical only</option>
                    </select>
                </label>
                {/* Phase 6.3: hide closed/FP observations by default. */}
                <label className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-black tracking-widest cursor-pointer">
                    <input type="checkbox" checked={hideClosed}
                        onChange={(e) => setHideClosed(e.target.checked)}
                        className="accent-cyber-accent" />
                    Hide closed
                </label>
                {/* Phase 6.3: dedup collapse toggle. */}
                <label className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-black tracking-widest cursor-pointer">
                    <input type="checkbox" checked={groupDups}
                        onChange={(e) => setGroupDups(e.target.checked)}
                        className="accent-cyber-accent" />
                    Group duplicates
                </label>
                <select
                    value={filter.severity}
                    onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyber-accent/40 transition-colors"
                >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyber-accent/40 transition-colors"
                >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="fixed">Fixed</option>
                    <option value="false_positive">False Positive</option>
                </select>
                {/* ── Saved Views ─────────────────────────────────────── */}
                <div className="flex items-center gap-1 relative" ref={viewsMenuRef}>
                    {/* Views dropdown trigger */}
                    {savedViews.length > 0 && (
                        <button
                            onClick={() => { setShowViewsMenu(m => !m); setShowSaveInput(false); }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10 bg-black/30 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                            title="Saved views"
                        >
                            <Bookmark className="h-3 w-3" />
                            Views ({savedViews.length})
                            <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                    )}

                    {/* Save current view button */}
                    {!showSaveInput && (
                        <button
                            onClick={() => { setShowSaveInput(true); setShowViewsMenu(false); }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-dashed border-white/10 text-gray-600 hover:text-cyan-400 hover:border-cyan-400/30 transition-colors"
                            title="Save current filter as a view"
                        >
                            <Bookmark className="h-3 w-3" />
                            Save view
                        </button>
                    )}

                    {/* Inline name input */}
                    {showSaveInput && (
                        <div className="flex items-center gap-1">
                            <input
                                ref={saveInputRef}
                                type="text"
                                placeholder="View name…"
                                value={savingViewName}
                                onChange={e => setSavingViewName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && savingViewName.trim()) {
                                        saveView(savingViewName.trim(), currentViewPayload());
                                        setSavingViewName('');
                                        setShowSaveInput(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setSavingViewName('');
                                        setShowSaveInput(false);
                                    }
                                }}
                                className="bg-black/40 border border-cyan-400/30 rounded px-2 py-1 text-[11px] text-white outline-none placeholder:text-gray-600 w-28 font-mono"
                            />
                            <button
                                onClick={() => {
                                    if (savingViewName.trim()) {
                                        saveView(savingViewName.trim(), currentViewPayload());
                                    }
                                    setSavingViewName('');
                                    setShowSaveInput(false);
                                }}
                                className="text-[9px] px-2 py-1 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-black uppercase hover:bg-cyan-400/20 transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setSavingViewName(''); setShowSaveInput(false); }}
                                className="text-[9px] px-1.5 py-1 rounded text-gray-600 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Views dropdown menu */}
                    {showViewsMenu && savedViews.length > 0 && (
                        <div
                            className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-white/10 shadow-2xl overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, rgba(15,30,40,0.98), rgba(10,20,28,0.99))' }}
                        >
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 px-3 pt-2.5 pb-1">
                                Pinned Views
                            </p>
                            {savedViews.map(v => (
                                <div
                                    key={v.name}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group"
                                >
                                    <button
                                        onClick={() => {
                                            applyViewPayload(v.payload);
                                            setShowViewsMenu(false);
                                        }}
                                        className="flex-1 text-left text-xs text-gray-300 hover:text-white font-mono truncate"
                                        title={`Load: ${v.name}`}
                                    >
                                        {v.name}
                                    </button>
                                    <button
                                        onClick={() => removeView(v.name)}
                                        className="shrink-0 p-0.5 rounded text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete view"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort buttons */}
                <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Sort:</span>
                    {['severity','confidence','type'].map(f => (
                        <button key={f} onClick={() => toggleSort(f)}
                            className={`flex items-center gap-0.5 px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${
                                sortField === f ? 'text-cyber-accent bg-cyber-accent/10' : 'text-gray-600 hover:text-white'
                            }`}
                        >
                            {f} <SortIcon field={f} />
                        </button>
                    ))}
                </div>
                <span className="text-gray-600 text-xs font-mono">
                    {displayed.length}/{vulnerabilities.length} findings
                </span>
            </div>

            {/* ── Bulk action toolbar ──────────────────────────────────── */}
            {selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-xl border border-cyan-400/20 backdrop-blur-md"
                    style={{ background: 'rgba(0,255,255,0.05)' }}>
                    <span className="text-xs font-black text-cyan-400 tabular-nums shrink-0">
                        {selectedIds.size} selected
                    </span>
                    <button
                        onClick={selectAll}
                        className="text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                    >
                        All ({displayed.length})
                    </button>
                    <button
                        onClick={clearSelection}
                        className="p-1 rounded text-gray-600 hover:text-white hover:bg-white/10 transition-colors"
                        title="Clear selection"
                    >
                        <XIcon className="h-3 w-3" />
                    </button>

                    <div className="w-px h-4 bg-white/10 shrink-0" />

                    {/* Status change */}
                    <select
                        disabled={bulkLoading}
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) { bulkUpdate(e.target.value); e.target.value = ''; } }}
                        className="px-2 py-1 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-cyan-400/40 disabled:opacity-50"
                    >
                        <option value="" disabled>Change status…</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="false_positive">False Positive</option>
                    </select>

                    {bulkLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />}

                    {/* Export */}
                    <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest mr-1">Export:</span>
                        <button
                            onClick={() => exportSelected('csv')}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10 text-gray-400 hover:text-cyan-300 hover:border-cyan-400/30 transition-colors"
                        >
                            <Download className="h-2.5 w-2.5" /> CSV
                        </button>
                        <button
                            onClick={() => exportSelected('json')}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10 text-gray-400 hover:text-cyan-300 hover:border-cyan-400/30 transition-colors"
                        >
                            <Download className="h-2.5 w-2.5" /> JSON
                        </button>
                    </div>
                </div>
            )}

            {/* Vulnerabilities List */}
            <div className="space-y-3">
                {displayed.map((vuln) => {
                    const sevKey = (vuln.severity || 'info').toLowerCase();
                    const cveId = vuln.cve_id || vuln.type?.match(/CVE-\d{4}-\d+/)?.[0];
                    // Phase 6.3 row annotations.
                    const dupKey      = vuln.finding_id || vuln.id;
                    const dupCount    = dedupCounts[dupKey] || 1;
                    const createdMs   = vuln.created_at ? new Date(vuln.created_at).getTime() : 0;
                    const isNew       = lastSeenAt > 0 && createdMs > lastSeenAt;
                    // A failed or low-confidence validation should not be rendered
                    // as a first-tier Critical — surface it as a second-tier warning
                    // chip so the SOC analyst can triage it separately.
                    const probeOutcome = vuln.ai_validation_result?.is_valid;
                    const lowConfidence = (vuln.confidence_score ?? 1) < 0.5;
                    const unconfirmed   = probeOutcome === false || lowConfidence;
                    return (
                    <div
                        key={vuln.id}
                        onClick={() => handleOpenDrawer(vuln)}
                        className={`glass-card-interactive p-5 relative group border-l-4 ${SEV_BORDER[sevKey] || 'border-l-gray-700'} cursor-pointer`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Row checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedIds.has(String(vulnKey(vuln)))}
                                onChange={() => toggleSelect(String(vulnKey(vuln)))}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 shrink-0 accent-cyan-400 cursor-pointer h-3.5 w-3.5"
                                title="Select finding"
                            />

                            {/* Severity Badge — click to filter to this severity */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const sev = sevKey;
                                    setFilter(f => ({ ...f, severity: f.severity === sev ? '' : sev }));
                                }}
                                title={filter.severity === sevKey ? 'Clear severity filter' : `Filter to ${sevKey} only`}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider shrink-0 transition-all hover:brightness-125 ${getSeverityColor(vuln.severity)} ${filter.severity === sevKey ? 'ring-2 ring-cyan-400/40' : ''}`}
                            >
                                {vuln.severity?.toUpperCase() || 'INFO'}
                            </button>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {getStatusIcon(vuln.status)}
                                    <h4 className="text-white font-semibold truncate">
                                        {vuln.title || vuln.type || (vuln.host ? `${vuln.type || 'Issue'} — ${vuln.host}${vuln.port ? ':' + vuln.port : ''}` : 'Unknown Vulnerability')}
                                    </h4>
                                    {isNew && (
                                        <span
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/40 font-black uppercase tracking-widest"
                                            title="First seen since your last visit"
                                        >
                                            NEW
                                        </span>
                                    )}
                                    {dupCount > 1 && groupDups && (
                                        <span
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 font-mono"
                                            title={`${dupCount} observations of the same finding`}
                                        >
                                            ×{dupCount}
                                        </span>
                                    )}
                                    {unconfirmed && (
                                        <span
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/40 font-black uppercase tracking-widest"
                                            title="Validation probe did not confirm this finding — triage as lower-tier warning"
                                        >
                                            UNCONFIRMED
                                        </span>
                                    )}
                                    {cveId && (
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] text-cyber-accent/70 hover:text-cyber-accent border border-cyber-accent/20 hover:border-cyber-accent/40 rounded px-1.5 py-0.5 transition-colors font-mono"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {cveId} <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-gray-500 text-xs truncate mb-2 font-mono">
                                    {vuln.url}
                                </p>
                                {vuln.description && (
                                    <p className="text-gray-500 text-sm line-clamp-2">
                                        {vuln.description}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center gap-4 flex-wrap">
                                    {vuln.cvss_score != null && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">CVSS</span>
                                            <span className={`text-[11px] font-mono font-black ${vuln.cvss_score >= 9 ? 'text-red-400' : vuln.cvss_score >= 7 ? 'text-orange-400' : vuln.cvss_score >= 4 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                {vuln.cvss_score.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                    {vuln.confidence_score != null && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Confidence</span>
                                            <div className="w-[80px] h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyber-neon to-cyber-vibrant shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                                    style={{ width: `${vuln.confidence_score * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-cyber-neon text-[10px] font-mono font-bold">
                                                {(vuln.confidence_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    )}
                                    {vuln.detected_by && (
                                        <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold uppercase">
                                            {vuln.detected_by}
                                        </span>
                                    )}

                                    {/* Framework / compliance chips — sourced from control_tags */}
                                    {vuln.control_tags && Object.entries(vuln.control_tags)
                                        .filter(([, v]) => v != null && v !== '')
                                        .map(([framework, control]) => (
                                            <span
                                                key={framework}
                                                title={`${framework}: ${control}`}
                                                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono"
                                            >
                                                <span className="font-black opacity-70">{FRAMEWORK_LABEL[framework] || framework.split('_')[0].toUpperCase()}</span>
                                                <span className="truncate max-w-[80px]">{String(control)}</span>
                                            </span>
                                        ))}
                                </div>
                            </div>

                            {/* Quick actions - stop event propagation so card onclick doesn't fire */}
                            <div className="flex flex-col gap-2 border-l border-gray-700 pl-4 ml-4 min-w-[140px]" onClick={e => e.stopPropagation()}>
                                <select
                                    value={vuln.status}
                                    onChange={async (e) => {
                                        const newStatus = e.target.value;
                                        try {
                                            await vulnerabilityService.updateWorkflow(vuln.id, { status: newStatus });
                                            fetchVulnerabilities();
                                        } catch (err) {
                                            console.error('Status update failed:', err);
                                        }
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white w-full"
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="false_positive">False Positive</option>
                                </select>
                                <button
                                    onClick={() => handleOpenDrawer(vuln)}
                                    className="flex items-center gap-2 justify-center p-2 text-xs bg-cyber-accent/10 border border-cyber-accent/25 hover:bg-cyber-accent/20 rounded-lg text-cyber-accent font-bold transition-all"
                                >
                                    <Code className="h-3 w-3" />
                                    Deep Dive
                                </button>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {vulnerabilities.length === 0 && (() => {
                // Only count user-explicit filters; default toggles don't trip the "clear" CTA.
                const hasActiveFilter = !!(search || filter.severity || filter.status);
                return (
                    <div className="bg-cyber-light p-12 rounded-xl border border-gray-700 text-center">
                        <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        {hasActiveFilter ? (
                            <>
                                <p className="text-gray-300 font-semibold mb-1">No matches for the current filters</p>
                                <p className="text-gray-500 text-sm mb-4">Try clearing filters or widening the severity range.</p>
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setFilter({ severity: '', status: '' });
                                    }}
                                    className="px-4 py-2 rounded-lg bg-cyan-400 text-gray-900 text-xs font-black uppercase tracking-wider hover:bg-sky-300 transition-colors"
                                >
                                    Clear filters
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-300 font-semibold mb-1">No vulnerabilities yet</p>
                                <p className="text-gray-500 text-sm mb-4">Run your first scan to populate this view.</p>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate',
                                        { detail: { tab: 'operations', sub: 'scanner' } }))}
                                    className="px-4 py-2 rounded-lg bg-cyan-400 text-gray-900 text-xs font-black uppercase tracking-wider hover:bg-sky-300 transition-colors"
                                >
                                    Configure first scan
                                </button>
                            </>
                        )}
                    </div>
                );
            })()}

            {/* Full Incident Detail Drawer */}
            {selectedVuln && (
                <IncidentDetailDrawer
                    vuln={selectedVuln}
                    onClose={handleCloseDrawer}
                    onStatusChange={fetchVulnerabilities}
                    nav={{
                        position: selectedIndex + 1,
                        total: displayed.length,
                        onPrev: selectedIndex > 0 ? () => navigateRel(-1) : undefined,
                        onNext: selectedIndex < displayed.length - 1 ? () => navigateRel(1) : undefined,
                    }}
                />
            )}
        </div>
    );
};

export default VulnerabilitiesPanel;
