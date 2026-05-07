import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { scanService } from '../../services/api';
import { useEnvStore } from '../../stores/envStore';
import {
    FileText, AlertTriangle, CheckCircle, Clock, Loader, ChevronDown, ChevronRight,
    Search, Calendar, RefreshCw, X as XIcon, Activity,
} from 'lucide-react';
import RiskBreakdownDrawer from './RiskBreakdownDrawer';

// ── Phase 4: History tab — server-side filter/sort/pagination, URL-synced ──

const PROFILE_OPTIONS = ['', 'quick', 'standard', 'full', 'custom'];
const STATUS_OPTIONS = ['', 'queued', 'running', 'completed', 'failed'];
const PAGE_SIZE_DEFAULT = 25;

// Severity pill for the row — one summary chip per scan.
const SEV_PILL = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/40',
    high:     'bg-orange-500/15 text-orange-400 border-orange-500/40',
    medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
    low:      'bg-blue-500/15 text-blue-400 border-blue-500/40',
    info:     'bg-gray-500/15 text-gray-400 border-gray-500/40',
    none:     'bg-gray-700/30 text-gray-500 border-gray-700/40',
};

const STATUS_ACCENT = {
    completed: 'border-l-green-500',
    running:   'border-l-blue-500',
    queued:    'border-l-gray-500',
    failed:    'border-l-red-500',
};

const riskBucket = (score) => {
    if (score == null) return 'none';
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    if (score > 0)   return 'low';
    return 'info';
};

// Ensure naive UTC strings from the backend get a "Z" suffix so the browser
// treats them as UTC rather than local time.
const toUTC = (iso) => {
    if (!iso) return null;
    if (iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10)) return iso;
    return iso + 'Z';
};

// "2h ago" relative formatter; falls back to absolute for > 30d.
const relativeTime = (iso) => {
    const utc = toUTC(iso);
    if (!utc) return 'N/A';
    const t = new Date(utc).getTime();
    if (Number.isNaN(t)) return 'N/A';
    const diff = (Date.now() - t) / 1000;
    if (diff < 60)       return 'just now';
    if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400*30) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(utc).toLocaleDateString();
};

const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '—';
    const secs = Math.max(0, Math.round((new Date(toUTC(completedAt)) - new Date(toUTC(startedAt))) / 1000));
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60); const s = secs % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
};

const StatusIcon = ({ status }) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return <CheckCircle className="text-green-500 h-4 w-4" />;
    if (s === 'failed')    return <AlertTriangle className="text-red-500 h-4 w-4" />;
    if (s === 'running')   return <Clock className="text-blue-500 h-4 w-4 animate-pulse" />;
    return <Clock className="text-gray-500 h-4 w-4" />;
};

// ── URL param helpers ───────────────────────────────────────────────────────
const readParams = () => {
    const p = new URLSearchParams(window.location.search);
    return {
        q:         p.get('hq') || '',
        status:    p.get('hstatus') || '',
        profile:   p.get('hprofile') || '',
        from:      p.get('hfrom') || '',
        to:        p.get('hto') || '',
        sort:      p.get('hsort') || 'started_at',
        order:     p.get('horder') || 'desc',
        page:      Math.max(1, parseInt(p.get('hpage') || '1', 10)),
        pageSize:  Math.max(10, parseInt(p.get('hpsize') || String(PAGE_SIZE_DEFAULT), 10)),
        density:   p.get('hdense') === '1' ? 'compact' : 'comfortable',
    };
};

const writeParams = (state) => {
    const p = new URLSearchParams(window.location.search);
    const setOrDel = (k, v, def = '') => {
        if (v === def || v === '' || v == null) p.delete(k); else p.set(k, String(v));
    };
    setOrDel('hq', state.q);
    setOrDel('hstatus', state.status);
    setOrDel('hprofile', state.profile);
    setOrDel('hfrom', state.from);
    setOrDel('hto', state.to);
    setOrDel('hsort', state.sort, 'started_at');
    setOrDel('horder', state.order, 'desc');
    setOrDel('hpage', state.page, 1);
    setOrDel('hpsize', state.pageSize, PAGE_SIZE_DEFAULT);
    setOrDel('hdense', state.density === 'compact' ? '1' : '', '');
    const next = `${window.location.pathname}?${p.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', next.replace(/\?$/, ''));
};

const ScanHistory = ({ refresh }) => {
    const initial = useMemo(readParams, []);
    const [q, setQ]                 = useState(initial.q);
    const [status, setStatus]       = useState(initial.status);
    const [profile, setProfile]     = useState(initial.profile);
    const [from, setFrom]           = useState(initial.from);
    const [to, setTo]               = useState(initial.to);
    const [sort, setSort]           = useState(initial.sort);
    const [order, setOrder]         = useState(initial.order);
    const [page, setPage]           = useState(initial.page);
    const [pageSize, setPageSize]   = useState(initial.pageSize);
    const [density, setDensity]     = useState(initial.density);

    const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: pageSize });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [explainScanId, setExplainScanId] = useState(null);

    // Sync URL whenever a tracked piece of state changes.
    useEffect(() => {
        writeParams({ q, status, profile, from, to, sort, order, page, pageSize, density });
    }, [q, status, profile, from, to, sort, order, page, pageSize, density]);

    const { activeEnv } = useEnvStore();

    const fetchPage = useCallback(async () => {
        setLoading(true); setErr(null);
        try {
            const params = {
                page, page_size: pageSize, sort, order,
            };
            if (status)  params.status    = status;
            if (profile) params.scan_type = profile;
            if (q)       params.target    = q;
            if (from)    params.date_from = new Date(from).toISOString();
            if (to)      params.date_to   = new Date(to + 'T23:59:59').toISOString();
            if (activeEnv && activeEnv !== 'all') params.environment = activeEnv;
            const res = await scanService.getScans(params);
            setData(res.data || { items: [], total: 0, page: 1, page_size: pageSize });
        } catch (e) {
            console.error('Failed to load scans', e);
            setErr('Failed to load scans. Is the backend reachable?');
            setData({ items: [], total: 0, page: 1, page_size: pageSize });
        } finally {
            setLoading(false);
        }
    }, [q, status, profile, from, to, sort, order, page, pageSize, activeEnv]);

    useEffect(() => { fetchPage(); }, [fetchPage, refresh]);

    // Auto-refresh every 30 seconds so new scans appear without a manual reload
    useEffect(() => {
        const interval = setInterval(() => fetchPage(), 30_000);
        return () => clearInterval(interval);
    }, [fetchPage]);

    // Immediate refresh when a scan completes or starts (new scan appears instantly)
    useEffect(() => {
        const handler = () => fetchPage();
        window.addEventListener('dashboard:scan-complete', handler);
        window.addEventListener('dashboard:scan-started', handler);
        return () => {
            window.removeEventListener('dashboard:scan-complete', handler);
            window.removeEventListener('dashboard:scan-started', handler);
        };
    }, [fetchPage]);

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.page_size || pageSize)));
    const hasFilters = q || status || profile || from || to;

    const resetFilters = () => {
        setQ(''); setStatus(''); setProfile(''); setFrom(''); setTo('');
        setSort('started_at'); setOrder('desc'); setPage(1);
    };

    const handleGenerateAndDownload = async (scanId) => {
        try {
            setGeneratingId(scanId);
            const { data: meta } = await scanService.generateReport(scanId);
            const { data: blob } = await scanService.downloadReportPDF(meta.report_id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${meta.report_id.slice(0, 8)}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Report generation failed', e);
            alert('Report generation failed. Check that the backend is running.');
        } finally {
            setGeneratingId(null);
        }
    };

    // Severity pill for the row uses risk_score buckets; refer to UI for empty.
    const rowSevKey  = (scan) => riskBucket(scan.risk_score);
    const rowPadding = density === 'compact' ? 'px-4 py-2' : 'px-6 py-4';

    return (
        <div className="bg-cyber-light rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            {/* ─── Filters bar ─── */}
            <div className="p-4 border-b border-gray-700 flex flex-wrap items-end gap-3">
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mr-auto flex items-center gap-2">
                    Scan History
                    <span className="text-xs text-gray-600 font-mono normal-case tracking-normal">
                        {data.total} total
                    </span>
                </h3>

                {/* target type-ahead */}
                <label className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1">
                    <Search className="h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Target…"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        className="bg-transparent text-white text-xs outline-none w-40 font-mono placeholder:text-gray-600"
                    />
                </label>

                <select value={status}   onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs">
                    {STATUS_OPTIONS.map(o =>
                        <option key={o || 'any-status'} value={o}>{o ? o[0].toUpperCase() + o.slice(1) : 'Any status'}</option>
                    )}
                </select>

                <select value={profile}  onChange={(e) => { setProfile(e.target.value); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs">
                    {PROFILE_OPTIONS.map(o =>
                        <option key={o || 'any-profile'} value={o}>{o ? o[0].toUpperCase() + o.slice(1) : 'Any profile'}</option>
                    )}
                </select>

                <label className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                           className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-mono" />
                    <span className="text-gray-600">→</span>
                    <input type="date" value={to}   onChange={(e) => { setTo(e.target.value); setPage(1); }}
                           className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-mono" />
                </label>

                <button
                    onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
                    className="text-xs px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                    title="Toggle row density"
                >
                    {density === 'compact' ? 'Comfortable' : 'Compact'}
                </button>

                {hasFilters && (
                    <button onClick={resetFilters}
                        className="text-xs px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white inline-flex items-center gap-1">
                        <XIcon className="h-3 w-3" /> Clear
                    </button>
                )}

                <button onClick={fetchPage}
                    className="text-xs px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white inline-flex items-center gap-1"
                    title="Refresh"
                >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* ─── Table ─── */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800 text-gray-300 uppercase text-xs">
                        <tr>
                            <SortableTh label="Time" col="started_at" sort={sort} order={order}
                                        onClick={() => { setSort('started_at'); setOrder(sort === 'started_at' && order === 'desc' ? 'asc' : 'desc'); setPage(1); }} />
                            <th className={rowPadding}>Target</th>
                            <th className={rowPadding}>Profile</th>
                            <th className={rowPadding}>Status</th>
                            <th className={rowPadding}>Findings</th>
                            <SortableTh label="Duration" col="duration" sort={sort} order={order}
                                        onClick={() => { setSort('duration'); setOrder(sort === 'duration' && order === 'desc' ? 'asc' : 'desc'); setPage(1); }}
                                        padding={rowPadding} />
                            <th className={rowPadding}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading && data.items.length === 0 && (
                            <tr><td colSpan={7} className={`${rowPadding} text-center text-gray-500`}>
                                <Loader className="inline h-4 w-4 animate-spin mr-2" /> Loading scans…
                            </td></tr>
                        )}
                        {err && (
                            <tr><td colSpan={7} className={`${rowPadding} text-center text-red-400`}>{err}</td></tr>
                        )}
                        {!loading && !err && data.items.length === 0 && (
                            <tr><td colSpan={7} className={`${rowPadding} text-center py-10`}>
                                {hasFilters ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-gray-400">No scans match the current filters.</p>
                                        <button
                                            onClick={() => { resetFilters?.(); }}
                                            className="px-3 py-1.5 rounded-lg border border-cyan-400/30 text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-400/10 transition-colors"
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-gray-300 font-semibold">No scans yet</p>
                                        <p className="text-gray-500 text-xs max-w-sm">
                                            Run your first scan and the history table will fill with timing, severity, and risk-score breakdowns.
                                        </p>
                                        <button
                                            onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate',
                                                { detail: { tab: 'operations', sub: 'scanner' } }))}
                                            className="px-3 py-1.5 rounded-lg bg-cyan-400 text-gray-900 text-[10px] font-black uppercase tracking-wider hover:bg-sky-300 transition-colors"
                                        >
                                            Start your first scan
                                        </button>
                                    </div>
                                )}
                            </td></tr>
                        )}
                        {data.items.map((scan) => {
                            const sev = rowSevKey(scan);
                            const accent = STATUS_ACCENT[String(scan.status).toLowerCase()] || 'border-l-gray-700';
                            const isOpen = expandedId === scan.id;
                            return (
                                <React.Fragment key={scan.id}>
                                    <tr
                                        className={`border-l-4 ${accent} hover:bg-gray-700/40 transition-colors ${isOpen ? 'bg-gray-700/30' : ''}`}
                                        onClick={() => setExpandedId(p => p === scan.id ? null : scan.id)}
                                    >
                                        <td className={`${rowPadding} font-mono text-gray-300`}
                                            title={scan.started_at ? new Date(scan.started_at).toISOString() : ''}>
                                            <div className="flex items-center gap-2">
                                                {isOpen
                                                    ? <ChevronDown className="h-3 w-3 text-gray-500" />
                                                    : <ChevronRight className="h-3 w-3 text-gray-500" />}
                                                {relativeTime(scan.started_at)}
                                            </div>
                                        </td>
                                        <td className={`${rowPadding} text-white truncate max-w-[240px]`}>
                                            {scan.target_display || scan.target_url || 'Unknown'}
                                        </td>
                                        <td className={`${rowPadding} uppercase text-xs font-bold text-gray-400`}>
                                            {scan.scan_type || '—'}
                                        </td>
                                        <td className={rowPadding}>
                                            <div className="flex items-center gap-2">
                                                <StatusIcon status={scan.status} />
                                                <span className="text-xs capitalize">{String(scan.status || 'unknown').toLowerCase()}</span>
                                            </div>
                                        </td>
                                        <td className={rowPadding}>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${SEV_PILL[sev]}`}>
                                                    {sev === 'none' ? '—' : sev}
                                                </span>
                                                <span className="text-[11px] text-gray-500 font-mono">
                                                    {scan.vulnerabilities_count ?? 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`${rowPadding} font-mono text-xs`}>
                                            {formatDuration(scan.started_at, scan.completed_at)}
                                        </td>
                                        <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-xs uppercase font-bold disabled:opacity-40"
                                                    disabled={String(scan.status).toLowerCase() !== 'completed'}
                                                    onClick={() => setExplainScanId(scan.id)}
                                                    title={String(scan.status).toLowerCase() === 'completed' ? 'Explain how this score was calculated' : 'Available after scan completes'}
                                                >
                                                    <Activity className="h-3 w-3" /> Explain
                                                </button>
                                                <button
                                                    className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-xs uppercase font-bold disabled:opacity-40"
                                                    disabled={generatingId === scan.id || String(scan.status).toLowerCase() !== 'completed'}
                                                    onClick={() => handleGenerateAndDownload(scan.id)}
                                                    title={String(scan.status).toLowerCase() === 'completed' ? 'Generate & download PDF report' : 'Report available after scan completes'}
                                                >
                                                    {generatingId === scan.id
                                                        ? <><Loader className="h-3 w-3 animate-spin" /> Generating…</>
                                                        : <><FileText className="h-3 w-3" /> Report</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isOpen && (
                                        <tr>
                                            <td colSpan={7} className="bg-gray-900/60 p-4 border-b border-gray-800">
                                                <RowDetail scan={scan} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ─── Pagination ─── */}
            <div className="p-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <div>
                    Page {data.page || page} of {totalPages} — showing {data.items.length} of {data.total}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1">
                        <span className="opacity-60">Rows</span>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                            className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-white"
                        >
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded border border-white/10 disabled:opacity-40 hover:text-white"
                    >Prev</button>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="px-2 py-1 rounded border border-white/10 disabled:opacity-40 hover:text-white"
                    >Next</button>
                </div>
            </div>

            {/* Risk-breakdown drawer — opens via row "Explain" button */}
            <RiskBreakdownDrawer
                scanId={explainScanId}
                onClose={() => setExplainScanId(null)}
            />
        </div>
    );
};

const SortableTh = ({ label, col, sort, order, onClick, padding = 'px-6 py-4' }) => {
    const active = sort === col;
    return (
        <th
            onClick={onClick}
            className={`${padding} cursor-pointer select-none hover:text-white ${active ? 'text-white' : ''}`}
            title={`Sort by ${label}`}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active && <span className="text-[10px] opacity-70">{order === 'asc' ? '▲' : '▼'}</span>}
            </span>
        </th>
    );
};

// ── Row expansion detail ────────────────────────────────────────────────────
const RowDetail = ({ scan }) => {
    // Build a human-readable command preview from the scan configuration so
    // the auditor can see exactly what the backend ran without leaving the row.
    const cfg = scan.configuration || {};
    const tools = cfg.tools || (() => {
        const presets = { quick: ['nmap'], standard: ['nmap', 'nuclei'], full: ['nmap', 'nuclei', 'ai_validation'] };
        return presets[scan.scan_type] || [];
    })();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
                <h4 className="text-gray-400 uppercase tracking-widest text-[10px] font-bold mb-2">Scan Summary</h4>
                <dl className="space-y-1">
                    <Pair k="ID" v={<code className="text-cyber-accent">{scan.id}</code>} />
                    <Pair k="Target" v={scan.target_display || scan.target_url || 'Unknown'} />
                    <Pair k="Profile" v={scan.scan_type || '—'} />
                    <Pair k="Started" v={scan.started_at ? new Date(scan.started_at).toLocaleString() : '—'} />
                    <Pair k="Completed" v={scan.completed_at ? new Date(scan.completed_at).toLocaleString() : '—'} />
                    <Pair k="Duration" v={formatDuration(scan.started_at, scan.completed_at)} />
                </dl>
            </div>
            <div>
                <h4 className="text-gray-400 uppercase tracking-widest text-[10px] font-bold mb-2">Findings</h4>
                <dl className="space-y-1">
                    <Pair k="Risk score" v={scan.risk_score?.toFixed?.(1) ?? '0.0'} />
                    <Pair k="Vulnerabilities" v={scan.vulnerabilities_count ?? 0} />
                    <Pair k="Assets" v={scan.assets_count ?? 0} />
                    <Pair k="Auto-report" v={cfg.auto_report ? 'on' : 'off'} />
                    <Pair k="SIEM forward" v={cfg.siem_forward ? 'on' : 'off'} />
                </dl>
            </div>
            <div>
                <h4 className="text-gray-400 uppercase tracking-widest text-[10px] font-bold mb-2">Command Preview</h4>
                <pre className="bg-black/60 border border-white/10 rounded p-2 text-[11px] text-green-300 overflow-x-auto leading-5">
{`POST /api/v1/scans/
${JSON.stringify({
    target_url: scan.target_url,
    scan_type: scan.scan_type,
    tools,
    auto_report: !!cfg.auto_report,
    siem_forward: !!cfg.siem_forward,
}, null, 2)}`}
                </pre>
            </div>
        </div>
    );
};

const Pair = ({ k, v }) => (
    <div className="flex justify-between gap-2 border-b border-gray-800 pb-1">
        <span className="text-gray-500 uppercase text-[10px] tracking-widest">{k}</span>
        <span className="text-gray-200 truncate">{v}</span>
    </div>
);

export default ScanHistory;
