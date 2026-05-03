import React, { useState, useEffect, useRef } from 'react';
import { ShieldOff, X } from 'lucide-react';
import api from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

const POLL_INTERVAL_MS = 10000;

const alertKey = (a, idx) => a?._id || a?.id || `${a?.['@timestamp'] || ''}|${a?.rule?.id || ''}|${idx}`;

const UnifiedInbox = () => {
    const { siem_enabled, loaded: configLoaded } = useConfig();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [paused, setPaused] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [newCount, setNewCount] = useState(0);
    const knownKeysRef = useRef(new Set());

    useEffect(() => {
        if (!configLoaded) return;
        if (!siem_enabled) {
            setLoading(false);
            return;
        }
        fetchAlerts({ initial: true });
        if (paused) return;
        const id = setInterval(() => fetchAlerts({ initial: false }), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [configLoaded, siem_enabled, paused]);

    const fetchAlerts = async ({ initial }) => {
        try {
            if (initial) setLoading(true);
            const res = await api.get('/siem/alerts');
            const fresh = res.data || [];
            if (initial) {
                knownKeysRef.current = new Set(fresh.map((a, i) => alertKey(a, i)));
                setNewCount(0);
            } else {
                let added = 0;
                fresh.forEach((a, i) => {
                    const k = alertKey(a, i);
                    if (!knownKeysRef.current.has(k)) {
                        knownKeysRef.current.add(k);
                        added += 1;
                    }
                });
                if (added > 0) setNewCount((n) => n + added);
            }
            setAlerts(fresh);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to fetch SIEM alerts:", err);
            setError("Failed to load alerts from Elasticsearch.");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const handleManualRefresh = () => {
        setNewCount(0);
        fetchAlerts({ initial: false });
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (!configLoaded || loading) {
        return <div className="p-4 text-center text-gray-400">Loading SIEM Alerts...</div>;
    }

    // ── Disabled state — honest empty state, not fake data ───────────────────
    if (!siem_enabled) {
        return (
            <div className="bg-[#1e1e2d] rounded-xl border border-dashed border-gray-700 p-10 flex flex-col items-center justify-center text-center h-full gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                    <ShieldOff className="w-7 h-7 text-gray-500" />
                </div>
                <div>
                    <p className="text-gray-300 font-semibold text-base mb-1">SIEM Not Configured</p>
                    <p className="text-gray-500 text-sm max-w-xs">
                        The SIEM integration is disabled. Set{' '}
                        <code className="bg-gray-800 text-indigo-400 px-1 py-0.5 rounded text-xs">SIEM_ENABLED=true</code>{' '}
                        in the backend <code className="bg-gray-800 text-indigo-400 px-1 py-0.5 rounded text-xs">.env</code>{' '}
                        file to activate the Unified Inbox.
                    </p>
                </div>
            </div>
        );
    }

    if (error) return <div className="p-4 text-center text-red-400 bg-red-900/20 rounded">{error}</div>;

    return (
        <div className="bg-[#1e1e2d] rounded-xl border border-gray-800 p-6 flex flex-col h-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Unified SIEM Inbox
                    </h2>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${paused ? 'bg-gray-500' : 'bg-emerald-400 animate-pulse'}`}></span>
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
                    <button
                        onClick={() => setPaused((p) => !p)}
                        className="text-[11px] px-2 py-1 rounded text-gray-300 bg-gray-800/60 hover:bg-gray-700 border border-gray-700"
                    >
                        {paused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        onClick={handleManualRefresh}
                        title="Refresh now"
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
                    <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No active alerts. All quiet.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {alerts.map((alert, idx) => {
                        const level = alert.rule?.level || 0;
                        const isHigh = level >= 10;
                        const isMed = level >= 5 && level < 10;

                        const badgeColor = isHigh
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : isMed
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                        return (
                            <div key={idx} onClick={() => setSelectedAlert(alert)} className="bg-[#151521] border border-gray-800 rounded-lg p-3 hover:border-indigo-500/50 hover:bg-[#1a1a28] transition-colors group cursor-pointer relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${isHigh ? 'bg-red-500' : isMed ? 'bg-orange-500' : 'bg-blue-500'} bg-opacity-80`}></div>

                                <div className="flex justify-between items-start mb-2 pl-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${badgeColor}`}>
                                            Level {level}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {new Date(alert['@timestamp']).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="pl-3">
                                    <p className="text-gray-200 text-sm font-medium mb-1 line-clamp-2">
                                        {alert.rule?.description || "Unknown Alert"}
                                    </p>

                                    <div className="flex flex-wrap gap-2 text-xs mt-2">
                                        {alert.agent?.name && (
                                            <span className="flex items-center gap-1 text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                {alert.agent.name}
                                            </span>
                                        )}
                                        {alert.data?.srcip && (
                                            <span className="flex items-center gap-1 text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                {alert.data.srcip}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {selectedAlert && <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
        </div>
    );
};

// ── Alert detail modal ───────────────────────────────────────────────────────
const AlertDetailModal = ({ alert, onClose }) => {
    useEffect(() => {
        const onEsc = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [onClose]);

    const level = alert.rule?.level || 0;
    const isHigh = level >= 10;
    const isMed = level >= 5 && level < 10;
    const sevLabel = isHigh ? 'HIGH' : isMed ? 'MEDIUM' : 'LOW';
    const sevColor = isHigh
        ? 'bg-red-500/15 text-red-400 border-red-500/30'
        : isMed
            ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
            : 'bg-blue-500/15 text-blue-400 border-blue-500/30';

    const Section = ({ title, children }) => (
        <div className="mb-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{title}</h4>
            {children}
        </div>
    );

    const Row = ({ label, value }) => {
        if (value === undefined || value === null || value === '') return null;
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return (
            <div className="flex gap-3 py-1 text-sm border-b border-gray-800/50 last:border-0">
                <span className="text-gray-500 min-w-[140px]">{label}</span>
                <span className="text-gray-200 break-all">{display}</span>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a28] border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-800">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${sevColor}`}>
                                {sevLabel} • Level {level}
                            </span>
                            {alert.rule?.id && (
                                <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                                    Rule {alert.rule.id}
                                </span>
                            )}
                            <span className="text-xs text-gray-500">
                                {alert['@timestamp'] ? new Date(alert['@timestamp']).toLocaleString() : '—'}
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-100 break-words">
                            {alert.rule?.description || 'Unknown Alert'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="ml-4 p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-5 custom-scrollbar">
                    <Section title="Rule">
                        <Row label="ID" value={alert.rule?.id} />
                        <Row label="Level" value={alert.rule?.level} />
                        <Row label="Description" value={alert.rule?.description} />
                        <Row label="Groups" value={alert.rule?.groups?.join(', ')} />
                        <Row label="MITRE" value={alert.rule?.mitre?.id?.join(', ')} />
                        <Row label="MITRE tactic" value={alert.rule?.mitre?.tactic?.join(', ')} />
                        <Row label="MITRE technique" value={alert.rule?.mitre?.technique?.join(', ')} />
                        <Row label="PCI DSS" value={alert.rule?.pci_dss?.join(', ')} />
                        <Row label="GDPR" value={alert.rule?.gdpr?.join(', ')} />
                    </Section>

                    <Section title="Agent / source">
                        <Row label="Agent" value={alert.agent?.name} />
                        <Row label="Agent ID" value={alert.agent?.id} />
                        <Row label="Agent IP" value={alert.agent?.ip} />
                        <Row label="Manager" value={alert.manager?.name} />
                        <Row label="Location" value={alert.location} />
                        <Row label="Source IP" value={alert.data?.srcip} />
                        <Row label="Source user" value={alert.data?.srcuser} />
                        <Row label="Destination IP" value={alert.data?.dstip} />
                        <Row label="Destination user" value={alert.data?.dstuser} />
                    </Section>

                    {alert.full_log && (
                        <Section title="Full log">
                            <pre className="bg-[#0e0e18] border border-gray-800 rounded p-3 text-xs text-gray-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {alert.full_log}
                            </pre>
                        </Section>
                    )}

                    {alert.data && Object.keys(alert.data).length > 0 && (
                        <Section title="Data">
                            <pre className="bg-[#0e0e18] border border-gray-800 rounded p-3 text-xs text-gray-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {JSON.stringify(alert.data, null, 2)}
                            </pre>
                        </Section>
                    )}

                    <Section title="Raw event">
                        <pre className="bg-[#0e0e18] border border-gray-800 rounded p-3 text-xs text-gray-400 whitespace-pre-wrap break-all max-h-72 overflow-y-auto">
                            {JSON.stringify(alert, null, 2)}
                        </pre>
                    </Section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
                    <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(alert, null, 2))}
                        className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                    >
                        Copy JSON
                    </button>
                    <button
                        onClick={onClose}
                        className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedInbox;
