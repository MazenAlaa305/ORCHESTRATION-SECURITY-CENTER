import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { dashboardService } from '../../services/api';
import { backdrop as backdropV, drawerRight } from '../../lib/motion';

const SEV_COLOR = {
    critical: '#ff0055',
    high:     '#ff6a00',
    medium:   '#ffaa00',
    low:      '#00aaff',
    info:     '#94a3b8',
};

const sevColor = (sev) => SEV_COLOR[(sev || 'info').toLowerCase()] || SEV_COLOR.info;

/**
 * RiskBreakdownDrawer
 *
 * Right-side drawer that explains *why* a scan got the score it did.
 * Renders the response from GET /dashboard/risk/{scan_id} as a sorted list
 * of contributing vulnerabilities with their CVSS env score, confidence,
 * contribution % and plain-language reason from the scoring_explainer.
 *
 * Props:
 *   scanId   — string, the scan to explain. Falsy → drawer is closed.
 *   onClose  — close handler
 */
export default function RiskBreakdownDrawer({ scanId, vulnCount = null, onClose }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['risk-breakdown', scanId],
        queryFn: () => dashboardService.getRiskBreakdown(scanId).then(r => r.data),
        enabled: !!scanId,
        staleTime: 30_000,
    });

    // Esc to close
    useEffect(() => {
        if (!scanId) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [scanId, onClose]);

    const breakdown = data?.breakdown ?? [];
    const score = data?.score ?? 0;
    // Total raw contribution (sum) — we show each row's share of this total so
    // the bars fill 0–100% relative to the largest contributor.
    const maxContribution = Math.max(0.0001, ...breakdown.map(b => b.contribution || 0));

    const scoreColor = score >= 80 ? '#ff0055' : score >= 60 ? '#ff6a00' : score >= 30 ? '#ffaa00' : '#00ff88';

    return (
        <AnimatePresence>
            {/* Backdrop */}
            {scanId && (
            <motion.div
                key="rbd-backdrop"
                variants={backdropV}
                initial="initial"
                animate="animate"
                exit="exit"
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            )}

            {/* Drawer */}
            {scanId && (
            <motion.aside
                key="rbd-aside"
                role="dialog"
                aria-modal="true"
                aria-label="Risk breakdown"
                variants={drawerRight}
                initial="initial"
                animate="animate"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0, right: 0.4 }}
                onDragEnd={(_, info) => { if (info.offset.x > 120 || info.velocity.x > 600) onClose?.(); }}
                className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[480px]"
                style={{
                    background: 'linear-gradient(180deg, rgba(15,30,40,0.98), rgba(10,20,28,0.99))',
                    borderLeft: '1px solid rgba(0,255,255,0.15)',
                    boxShadow: '-12px 0 40px rgba(0,0,0,0.6)',
                }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">
                                Risk Breakdown
                            </p>
                            <h2 className="text-sm font-mono text-white truncate" title={scanId}>
                                {scanId}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Score badge */}
                    <div className="mt-4 flex items-center gap-3">
                        <div
                            className="flex items-center justify-center h-14 w-14 rounded-xl border-2"
                            style={{
                                borderColor: scoreColor + '60',
                                background: scoreColor + '15',
                            }}
                        >
                            <span className="text-xl font-black tabular-nums" style={{ color: scoreColor }}>
                                {Math.round(score)}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Final Score</p>
                            <p className="text-xs text-gray-400">
                                {breakdown.length} contributing finding{breakdown.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading && (
                        <div className="flex items-center gap-3 px-5 py-8 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Computing breakdown…</span>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="px-5 py-8 flex flex-col items-center text-center text-gray-500 gap-2">
                            <AlertCircle className="h-8 w-8 text-red-400/60" />
                            <p className="text-xs">Failed to load breakdown.</p>
                            <p className="text-[10px] text-gray-600 font-mono break-all max-w-xs">
                                {error?.response?.data?.detail || error?.message || 'Unknown error'}
                            </p>
                        </div>
                    )}

                    {!isLoading && !error && breakdown.length === 0 && (
                        <div className="px-5 py-8 flex flex-col items-center text-center text-gray-500 gap-2">
                            <Info className="h-8 w-8 text-gray-600" />
                            {vulnCount === 0 ? (
                                <>
                                    <p className="text-xs text-gray-300 font-semibold">No vulnerabilities found</p>
                                    <p className="text-[10px] text-gray-600 max-w-xs">
                                        This scan completed cleanly with zero findings, so there is
                                        nothing to break down. A score of 0 is the expected result.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs">No breakdown available for this scan.</p>
                                    <p className="text-[10px] text-gray-600 max-w-xs">
                                        Breakdown is populated by UnifiedRiskEngine at scan completion.
                                        Older scans may not have one stored.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {!isLoading && !error && breakdown.length > 0 && (
                        <ul className="divide-y divide-white/5">
                            {[...breakdown]
                                .sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
                                .map((item, idx) => {
                                    const pct = ((item.contribution || 0) / maxContribution) * 100;
                                    const c = sevColor(item.severity);
                                    return (
                                        <li key={(item.vuln_id || idx) + ':' + idx} className="px-5 py-3">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                                        style={{
                                                            background: c + '20',
                                                            color: c,
                                                            border: `1px solid ${c}40`,
                                                        }}
                                                    >
                                                        {(item.severity || 'info').toUpperCase()}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-gray-400 truncate" title={item.url}>
                                                        {item.url || item.vuln_id || '—'}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono font-black tabular-nums shrink-0" style={{ color: c }}>
                                                    +{(item.contribution || 0).toFixed(1)}
                                                </span>
                                            </div>

                                            {/* Bar — width proportional to share of the largest contributor */}
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%`, background: c }}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-500 mb-1">
                                                <span title="Environmental CVSS score">
                                                    <span className="text-gray-600 mr-1">CVSS</span>
                                                    {(item.cvss_env_score || 0).toFixed(1)}
                                                </span>
                                                <span title="AI validation confidence">
                                                    <span className="text-gray-600 mr-1">CONF</span>
                                                    {((item.confidence ?? 1) * 100).toFixed(0)}%
                                                </span>
                                                {item.cvss_vector && (
                                                    <span className="truncate" title={item.cvss_vector}>
                                                        <span className="text-gray-600 mr-1">VEC</span>
                                                        {item.cvss_vector.replace(/^CVSS:\d\.\d\//, '')}
                                                    </span>
                                                )}
                                            </div>

                                            {item.reason && (
                                                <p className="text-[11px] text-gray-400 leading-snug italic">
                                                    "{item.reason}"
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/5 shrink-0 flex items-center justify-between">
                    <span className="text-[9px] text-gray-600 font-mono">
                        UnifiedRiskEngine · CVSSv3 environmental
                    </span>
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('dashboard:navigate',
                                { detail: { tab: 'threat-center', sub: 'vulnerabilities' } }));
                            onClose?.();
                        }}
                        className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider"
                    >
                        Open Vulns <ExternalLink className="h-3 w-3" />
                    </button>
                </div>
            </motion.aside>
            )}
        </AnimatePresence>
    );
}
