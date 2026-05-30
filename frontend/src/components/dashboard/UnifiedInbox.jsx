import { useState, useEffect, useRef } from 'react';
import { ShieldOff, X, ShieldAlert, Globe, Lock, Activity, Terminal, AlertTriangle, Info, Search } from 'lucide-react';
import api, { vulnerabilityService } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

// Severity → Wazuh-style rule level so synthesised vulnerability "alerts"
// land in the correct band of the SIEM inbox (CRITICAL: ≥12, HIGH: ≥8, …).
const SEVERITY_LEVEL = { CRITICAL: 13, HIGH: 10, MEDIUM: 6, LOW: 3, INFO: 1 };

// Convert a Vulnerability row into the Wazuh-shaped alert envelope that
// the inbox already knows how to render — keeps the rest of the component
// blissfully unaware that two data sources are merged together.
const vulnToAlert = (v) => {
    const sev = (v.severity || 'LOW').toString().toUpperCase();
    const level = SEVERITY_LEVEL[sev] ?? 5;
    return {
        _id: `vuln-${v.id}`,
        '@timestamp': v.created_at || v.discovered_at || new Date().toISOString(),
        rule: {
            id: v.cve_id || `OSC-${v.id}`,
            level,
            description: v.title || v.name || v.cve_id || 'Vulnerability finding',
            groups: ['vulnerability', sev.toLowerCase(), ...(v.tags || [])],
            mitre: v.mitre || {},
        },
        agent: {
            name: v.asset_hostname || v.host || v.target || 'scanner',
            ip: v.asset_ip || v.host_ip || null,
        },
        data: {
            srcip: v.asset_ip || v.host_ip || null,
            cve: v.cve_id || null,
            cvss: v.cvss_score || v.cvss || null,
        },
        full_log: v.description || v.evidence || '',
        __source: 'vulnerability',
    };
};

const POLL_INTERVAL_MS = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const alertKey = (a) =>
    a?._id || a?.id ||
    `${a?.['@timestamp'] || ''}|${a?.rule?.id || ''}|${a?.rule?.description || ''}`;

const formatTs = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d) ? ts : d.toLocaleString();
};

// Wazuh rule level → severity band (official Wazuh scale, 0–15).
//   0–3   informational / low
//   4–7   medium
//   8–11  high
//   12–15 critical
// The previous mapping classified levels 8–9 as MEDIUM and never produced
// a CRITICAL band, so genuine high/critical alerts were rendered as medium.
const getSeverity = (level) => {
    const n = Number(level) || 0;
    if (n >= 12) return { label: 'CRITICAL', color: 'rose',   hex: '#e11d48' };
    if (n >= 8)  return { label: 'HIGH',     color: 'red',    hex: '#ef4444' };
    if (n >= 4)  return { label: 'MEDIUM',   color: 'orange', hex: '#f97316' };
    return            { label: 'LOW',      color: 'blue',   hex: '#3b82f6' };
};

// Flatten an alert into a single lowercase string we can search against.
const buildSearchHaystack = (a) => {
    const parts = [
        a?.rule?.description,
        a?.rule?.id,
        a?.rule?.level,
        ...(a?.rule?.groups || []),
        ...(a?.rule?.mitre?.id || []),
        ...(a?.rule?.mitre?.tactic || []),
        ...(a?.rule?.mitre?.technique || []),
        a?.agent?.name,
        a?.agent?.id,
        a?.agent?.ip,
        a?.manager?.name,
        a?.location,
        a?.data?.srcip,
        a?.data?.srcuser,
        a?.data?.dstip,
        a?.data?.dstuser,
        a?.full_log,
        a?.['@timestamp'],
        getSeverity(a?.rule?.level).label,
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
};

// Pick an icon based on rule groups / description keywords
const getEventIcon = (alert) => {
    const desc  = (alert.rule?.description || '').toLowerCase();
    const groups = ((alert.rule?.groups || []).join(' ')).toLowerCase();
    const combined = desc + ' ' + groups;

    if (combined.includes('authentication') || combined.includes('auth') || combined.includes('login') || combined.includes('password'))
        return Lock;
    if (combined.includes('web') || combined.includes('http') || combined.includes('nginx') || combined.includes('apache'))
        return Globe;
    if (combined.includes('suspicious') || combined.includes('intrusion') || combined.includes('attack') || combined.includes('exploit'))
        return ShieldAlert;
    if (combined.includes('network') || combined.includes('connection') || combined.includes('port') || combined.includes('scan'))
        return Activity;
    if (combined.includes('command') || combined.includes('exec') || combined.includes('shell') || combined.includes('process'))
        return Terminal;
    if (combined.includes('error') || combined.includes('failure') || combined.includes('fail'))
        return AlertTriangle;
    return Info;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const UnifiedInbox = () => {
    const { siem_enabled, loaded: configLoaded } = useConfig();
    const [alerts, setAlerts]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [paused, setPaused]         = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [newCount, setNewCount]     = useState(0);
    const [sevFilter, setSevFilter]   = useState('ALL');
    const [query, setQuery]           = useState('');
    const knownKeysRef = useRef(new Set());
    const searchInputRef = useRef(null);

    // Global keyboard shortcut: "/" or Ctrl/Cmd+K focuses the SIEM search box.
    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target?.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
            if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!configLoaded) return;
        if (!siem_enabled) { setLoading(false); return; }
        fetchAlerts({ initial: true });
        if (paused) return;
        const id = setInterval(() => fetchAlerts({ initial: false }), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [configLoaded, siem_enabled, paused]);

    const fetchAlerts = async ({ initial }) => {
        try {
            if (initial) setLoading(true);
            // Pull SIEM alerts and active vulnerabilities in parallel — the
            // SIEM-only stream missed scanner findings, so analysts were not
            // seeing CRITICAL vulnerabilities surface in the Unified Inbox.
            const [siemRes, vulnRes] = await Promise.allSettled([
                api.get('/siem/alerts'),
                vulnerabilityService.list({ status: 'open', page: 1, page_size: 200 }),
            ]);

            const siemAlerts = siemRes.status === 'fulfilled' ? (siemRes.value.data || []) : [];
            const vulnItems = vulnRes.status === 'fulfilled'
                ? (vulnRes.value.data?.items ?? vulnRes.value.data ?? [])
                : [];
            const vulnAlerts = (Array.isArray(vulnItems) ? vulnItems : [])
                .filter((v) => v && v.severity)
                .map(vulnToAlert);

            // Most-recent first so newly-discovered criticals float to the top.
            const fresh = [...siemAlerts, ...vulnAlerts].sort((a, b) => {
                const ta = new Date(a['@timestamp'] || 0).getTime();
                const tb = new Date(b['@timestamp'] || 0).getTime();
                return tb - ta;
            });

            if (initial) {
                knownKeysRef.current = new Set(fresh.map(alertKey));
                setNewCount(0);
            } else {
                let added = 0;
                fresh.forEach((a) => {
                    const k = alertKey(a);
                    if (!knownKeysRef.current.has(k)) { knownKeysRef.current.add(k); added++; }
                });
                if (added > 0) setNewCount((n) => n + added);
            }
            setAlerts(fresh);
            // Only surface an error if BOTH feeds failed — a missing SIEM
            // backend shouldn't blank out the vulnerability stream.
            if (siemRes.status === 'rejected' && vulnRes.status === 'rejected') {
                setError('Failed to load alerts from SIEM and scanner.');
            } else {
                setError(null);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch SIEM alerts:', err);
            setError('Failed to load alerts.');
        } finally {
            if (initial) setLoading(false);
        }
    };

    const handleManualRefresh = () => { setNewCount(0); fetchAlerts({ initial: false }); };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (!configLoaded || loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                <div className="w-8 h-8 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-sm">Loading SIEM Alerts…</span>
            </div>
        );
    }

    // ── Disabled ──────────────────────────────────────────────────────────────
    if (!siem_enabled) {
        return (
            <div className="bg-[#1e1e2d] rounded-xl border border-dashed border-gray-700 p-10 flex flex-col items-center justify-center text-center h-full gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                    <ShieldOff className="w-7 h-7 text-gray-500" />
                </div>
                <div>
                    <p className="text-gray-300 font-semibold text-base mb-1">SIEM Not Configured</p>
                    <p className="text-gray-500 text-sm max-w-xs">
                        Set{' '}
                        <code className="bg-gray-800 text-indigo-400 px-1 py-0.5 rounded text-xs">SIEM_ENABLED=true</code>{' '}
                        in the backend <code className="bg-gray-800 text-indigo-400 px-1 py-0.5 rounded text-xs">.env</code>{' '}
                        file to activate the Unified Inbox.
                    </p>
                </div>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-6 text-center bg-red-900/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={handleManualRefresh}
                    className="mt-3 text-xs px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30">
                    Retry
                </button>
            </div>
        );
    }

    // ── Severity counts for tab badges ────────────────────────────────────────
    const countsBySev = alerts.reduce((acc, a) => {
        const { label } = getSeverity(a.rule?.level || 0);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    // Apply severity tab filter first, then free-text search.
    const q = query.trim().toLowerCase();
    const bySev = sevFilter === 'ALL'
        ? alerts
        : alerts.filter((a) => getSeverity(a.rule?.level || 0).label === sevFilter);
    const filtered = q
        ? bySev.filter((a) => buildSearchHaystack(a).includes(q))
        : bySev;

    const SEV_TABS = [
        { key: 'ALL',      label: 'All',      countKey: null },
        { key: 'CRITICAL', label: 'Critical', countKey: 'CRITICAL', dot: 'bg-rose-600'   },
        { key: 'HIGH',     label: 'High',     countKey: 'HIGH',     dot: 'bg-red-500'    },
        { key: 'MEDIUM',   label: 'Medium',   countKey: 'MEDIUM',   dot: 'bg-orange-500' },
        { key: 'LOW',      label: 'Low',      countKey: 'LOW',      dot: 'bg-blue-500'   },
    ];

    return (
        <div className="bg-[#1e1e2d] rounded-xl border border-gray-800 flex flex-col h-full shadow-lg overflow-hidden">

            {/* ── Header ── */}
            <div className="flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-b border-gray-800/70">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Unified SIEM Inbox
                    </h2>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${paused ? 'bg-gray-500' : 'bg-emerald-400 animate-pulse'}`} />
                        {paused ? 'Paused' : 'Live'}
                    </span>
                    {newCount > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            +{newCount} new
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="text-[11px] text-gray-500">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button onClick={() => setPaused((p) => !p)}
                        className="text-[11px] px-2 py-1 rounded text-gray-300 bg-gray-800/60 hover:bg-gray-700 border border-gray-700">
                        {paused ? 'Resume' : 'Pause'}
                    </button>
                    <button onClick={handleManualRefresh} title="Refresh now"
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Severity filter tabs ── */}
            <div className="flex gap-1 px-5 pt-3 pb-1">
                {SEV_TABS.map(({ key, label, countKey, dot }) => {
                    const count = countKey ? (countsBySev[countKey] || 0) : alerts.length;
                    const active = sevFilter === key;
                    return (
                        <button key={key} onClick={() => setSevFilter(key)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
                                active
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                    : 'bg-gray-800/40 text-gray-500 border-gray-700/50 hover:text-gray-300'
                            }`}>
                            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                            {label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1 rounded ${active ? 'bg-indigo-500/30 text-indigo-200' : 'bg-gray-700 text-gray-400'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Search bar ── */}
            <div className="px-5 pt-2 pb-2">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search alerts — rule, description, agent, IP, MITRE, full log…"
                        className="w-full bg-[#0e0e18] border border-gray-800 focus:border-indigo-500/60 focus:outline-none rounded-lg pl-9 pr-20 py-2 text-xs text-gray-200 placeholder-gray-600 transition-colors"
                        aria-label="Search SIEM alerts"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {query && (
                            <button
                                onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                                className="text-[10px] px-1.5 py-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                                aria-label="Clear search"
                            >
                                Clear
                            </button>
                        )}
                        <kbd className="hidden sm:inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 font-mono">
                            /
                        </kbd>
                    </div>
                </div>
                {q && (
                    <div className="text-[10px] text-gray-500 mt-1.5 px-1">
                        {filtered.length} match{filtered.length === 1 ? '' : 'es'} for “{query}”
                    </div>
                )}
            </div>

            {/* ── Alert list ── */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                        <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">
                            {q
                                ? `No alerts match “${query}”.`
                                : sevFilter === 'ALL'
                                    ? 'No active alerts. All quiet.'
                                    : `No ${sevFilter} alerts.`}
                        </p>
                    </div>
                ) : (
                    filtered.map((alert, idx) => {
                        const level = alert.rule?.level || 0;
                        const sev   = getSeverity(level);
                        const Icon  = getEventIcon(alert);

                        const barColor = sev.color === 'rose'
                            ? 'bg-rose-600'
                            : sev.color === 'red'
                                ? 'bg-red-500'
                                : sev.color === 'orange'
                                    ? 'bg-orange-500'
                                    : 'bg-blue-500';
                        const badgeCls = sev.color === 'rose'
                            ? 'bg-rose-600/10 text-rose-400 border-rose-600/30'
                            : sev.color === 'red'
                                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                                : sev.color === 'orange'
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/25';
                        const iconColor = sev.color === 'rose'
                            ? 'text-rose-400'
                            : sev.color === 'red'
                                ? 'text-red-400'
                                : sev.color === 'orange'
                                    ? 'text-orange-400'
                                    : 'text-blue-400';

                        return (
                            <div key={alertKey(alert) || idx}
                                onClick={() => setSelectedAlert(alert)}
                                className="bg-[#151521] border border-gray-800 rounded-lg p-3 hover:border-indigo-500/40 hover:bg-[#1a1a28] transition-colors cursor-pointer relative overflow-hidden group">

                                {/* Left severity bar */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${barColor} opacity-80`} />

                                <div className="pl-3 flex gap-3 items-start">
                                    {/* Icon */}
                                    <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Top row: severity badge + timestamp */}
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeCls}`}>
                                                {sev.label} · Lv{level}
                                            </span>
                                            <span className="text-gray-500 text-[11px]">
                                                {formatTs(alert['@timestamp'])}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-200 text-sm font-medium mb-1.5 leading-snug line-clamp-2">
                                            {alert.rule?.description || 'Unknown Alert'}
                                        </p>

                                        {/* Meta tags */}
                                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                                            {alert.agent?.name && (
                                                <span className="flex items-center gap-1 text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {alert.agent.name}
                                                </span>
                                            )}
                                            {(alert.data?.srcip || alert.agent?.ip) && (
                                                <span className="flex items-center gap-1 text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                                                    <Globe className="w-3 h-3" />
                                                    {alert.data?.srcip || alert.agent?.ip}
                                                </span>
                                            )}
                                            {alert.rule?.groups?.slice(0, 2).map((g) => (
                                                <span key={g} className="text-gray-500 bg-gray-800/40 px-2 py-0.5 rounded border border-gray-700/40">
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Chevron hint */}
                                    <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 flex-shrink-0 mt-1 transition-colors"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Detail modal ── */}
            {selectedAlert && (
                <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
            )}
        </div>
    );
};

// ─── Alert detail modal ──────────────────────────────────────────────────────

const AlertDetailModal = ({ alert, onClose }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const onEsc = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [onClose]);

    const level    = alert.rule?.level || 0;
    const sev      = getSeverity(level);
    const Icon     = getEventIcon(alert);

    const sevCls = sev.color === 'rose'
        ? 'bg-rose-600/15 text-rose-400 border-rose-600/35'
        : sev.color === 'red'
            ? 'bg-red-500/15 text-red-400 border-red-500/30'
            : sev.color === 'orange'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30';

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(JSON.stringify(alert, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard not available */ }
    };

    const Section = ({ title, children }) => (
        <div className="mb-5">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">{title}</h4>
            {children}
        </div>
    );

    const Row = ({ label, value }) => {
        if (value === undefined || value === null || value === '') return null;
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return (
            <div className="flex gap-3 py-1.5 text-sm border-b border-gray-800/50 last:border-0">
                <span className="text-gray-500 min-w-[140px] text-xs">{label}</span>
                <span className="text-gray-200 break-all text-xs">{display}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}>
            <div className="bg-[#1a1a28] border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-800">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sevCls}`}>
                                <Icon className="w-3.5 h-3.5" />
                                {sev.label} · Level {level}
                            </div>
                            {alert.rule?.id && (
                                <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                                    Rule {alert.rule.id}
                                </span>
                            )}
                            <span className="text-xs text-gray-500">{formatTs(alert['@timestamp'])}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-100 break-words leading-snug">
                            {alert.rule?.description || 'Unknown Alert'}
                        </h3>
                        {alert.rule?.groups?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {alert.rule.groups.map((g) => (
                                    <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/50">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} aria-label="Close"
                        className="ml-4 p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-5 custom-scrollbar space-y-1">
                    <Section title="Rule Details">
                        <Row label="Rule ID"     value={alert.rule?.id} />
                        <Row label="Level"       value={`${level} (${sev.label})`} />
                        <Row label="Description" value={alert.rule?.description} />
                        <Row label="Groups"      value={alert.rule?.groups?.join(', ')} />
                        <Row label="MITRE ATT&CK" value={alert.rule?.mitre?.id?.join(', ')} />
                        <Row label="MITRE Tactic" value={alert.rule?.mitre?.tactic?.join(', ')} />
                        <Row label="MITRE Technique" value={alert.rule?.mitre?.technique?.join(', ')} />
                        <Row label="PCI DSS"     value={alert.rule?.pci_dss?.join(', ')} />
                        <Row label="GDPR"        value={alert.rule?.gdpr?.join(', ')} />
                    </Section>

                    <Section title="Agent / Source">
                        <Row label="Agent"       value={alert.agent?.name} />
                        <Row label="Agent ID"    value={alert.agent?.id} />
                        <Row label="Agent IP"    value={alert.agent?.ip} />
                        <Row label="Manager"     value={alert.manager?.name} />
                        <Row label="Location"    value={alert.location} />
                        <Row label="Source IP"   value={alert.data?.srcip} />
                        <Row label="Source User" value={alert.data?.srcuser} />
                        <Row label="Dest IP"     value={alert.data?.dstip} />
                        <Row label="Dest User"   value={alert.data?.dstuser} />
                    </Section>

                    {alert.full_log && (
                        <Section title="Full Log">
                            <pre className="bg-[#0e0e18] border border-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {alert.full_log}
                            </pre>
                        </Section>
                    )}

                    {alert.data && Object.keys(alert.data).length > 0 && (
                        <Section title="Event Data">
                            <pre className="bg-[#0e0e18] border border-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {JSON.stringify(alert.data, null, 2)}
                            </pre>
                        </Section>
                    )}

                    <Section title="Raw Event">
                        <pre className="bg-[#0e0e18] border border-gray-800 rounded-lg p-3 text-xs text-gray-400 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                            {JSON.stringify(alert, null, 2)}
                        </pre>
                    </Section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
                    <button onClick={handleCopy}
                        className={`text-xs px-3 py-1.5 rounded border transition-all ${
                            copied
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                        }`}>
                        {copied ? '✓ Copied' : 'Copy JSON'}
                    </button>
                    <button onClick={onClose}
                        className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedInbox;
