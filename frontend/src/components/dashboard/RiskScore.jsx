import React, { useEffect, useState } from 'react';
import { GaugeRing } from '../ui/GaugeRing';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';

const RiskScore = ({ score = 0, scanId = null }) => {
    const safeScore = Math.min(Math.max(Math.round(score || 0), 0), 100);
    const [expanded, setExpanded] = useState(false);
    const [breakdown, setBreakdown] = useState(null);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    useEffect(() => {
        if (!scanId) return;
        setLoadingBreakdown(true);
        api.get(`/dashboard/risk/${scanId}`)
            .then(res => {
                const data = res.data;
                if (data && Array.isArray(data.breakdown) && data.breakdown.length > 0) {
                    setBreakdown(data.breakdown);
                }
            })
            .catch(() => setBreakdown(null))
            .finally(() => setLoadingBreakdown(false));
    }, [scanId]);

    let label = 'Critical';
    if (safeScore >= 80) label = 'Excellent';
    else if (safeScore >= 60) label = 'Good';
    else if (safeScore >= 40) label = 'Fair';
    else if (safeScore >= 20) label = 'Poor';

    const color =
        safeScore >= 70 ? '#00ff88' :
        safeScore >= 40 ? '#ffaa00' :
        '#ff0055';

    return (
        <div className="glass-card p-5 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in">
            {/* Ambient radial glow */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-1000"
                style={{ background: `radial-gradient(circle at center, ${color}12 0%, transparent 70%)` }}
            />

            {/* Title */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">
                    Security Health
                </span>
            </div>

            {/* Canvas gauge */}
            <div className="relative z-10 w-full max-w-[180px]">
                <GaugeRing score={safeScore} max={100} size={180} label={label.toUpperCase()} color={color} />
            </div>

            {/* Score bar */}
            <div className="w-full space-y-2 relative z-10 mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase font-mono">
                        Health Index
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                        {safeScore}/100
                    </span>
                </div>
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${safeScore}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }}
                    />
                </div>
            </div>

            {/* "Why this number?" expandable — shown only when breakdown data is available */}
            {breakdown && breakdown.length > 0 && (
                <div className="w-full relative z-10 mt-3">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-[9px] font-mono text-gray-500 hover:text-gray-300 transition-colors duration-200 mx-auto"
                        aria-expanded={expanded}
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Why this number?
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                            {breakdown.slice(0, 10).map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-start text-[8px] font-mono border-b border-white/5 pb-1"
                                >
                                    <span className="text-gray-400 truncate max-w-[65%]" title={item.reason || item.vuln_id}>
                                        {item.reason
                                            ? item.reason.slice(0, 40)
                                            : (item.vuln_id || '').slice(0, 8) + '…'}
                                    </span>
                                    <span className="text-white font-bold ml-2 shrink-0">
                                        {typeof item.cvss_env_score === 'number'
                                            ? item.cvss_env_score.toFixed(1)
                                            : typeof item.cvss === 'number'
                                            ? item.cvss.toFixed(1)
                                            : '—'}
                                    </span>
                                </div>
                            ))}
                            {breakdown.length > 10 && (
                                <p className="text-[8px] text-gray-600 text-center pt-1">
                                    +{breakdown.length - 10} more findings
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Loading state */}
            {loadingBreakdown && !breakdown && (
                <p className="text-[8px] text-gray-600 font-mono mt-2 relative z-10">loading breakdown…</p>
            )}
        </div>
    );
};

export default RiskScore;
