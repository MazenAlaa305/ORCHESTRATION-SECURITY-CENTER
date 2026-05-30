import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// INFO findings are informational, not vulnerabilities, so we exclude them
// from this widget. Keeping them in changes the denominator and makes the
// per-row percentages diverge from the "Vulnerabilities Found" KPI card
// (which already sums C+H+M+L only).
const SEV_ORDER = ['critical', 'high', 'medium', 'low'];

// Colors kept in lockstep with TopologyLegend.LEGEND_ITEMS and
// NetworkTopology.SEVERITY so the two widgets on the same screen never
// disagree about what "Medium" or "Low" looks like.
//   critical → magenta-red   #ff0055
//   high     → orange        #ff6a00
//   medium   → amber/yellow  #ffaa00
//   low      → cyan          #00ccff
const SEV_META = {
    critical: {
        label: 'Critical',
        color: '#ff0055',
        glow:  'rgba(255,0,85,0.25)',
        bg:    'rgba(255,0,85,0.08)',
        border:'rgba(255,0,85,0.25)',
        text:  '#ff4477',
    },
    high: {
        label: 'High',
        color: '#ff6a00',
        glow:  'rgba(255,106,0,0.25)',
        bg:    'rgba(255,106,0,0.08)',
        border:'rgba(255,106,0,0.25)',
        text:  '#ff9544',
    },
    medium: {
        label: 'Medium',
        color: '#ffaa00',
        glow:  'rgba(255,170,0,0.25)',
        bg:    'rgba(255,170,0,0.08)',
        border:'rgba(255,170,0,0.25)',
        text:  '#ffcc44',
    },
    low: {
        label: 'Low',
        color: '#00ccff',
        glow:  'rgba(0,204,255,0.20)',
        bg:    'rgba(0,204,255,0.07)',
        border:'rgba(0,204,255,0.25)',
        text:  '#44ddff',
    },
    info: {
        label: 'Info',
        color: '#6677aa',
        glow:  'rgba(102,119,170,0.15)',
        bg:    'rgba(102,119,170,0.05)',
        border:'rgba(102,119,170,0.15)',
        text:  '#9999bb',
    },
};

const RiskHeatmap = ({ data = [] }) => {
    const containerRef = useRef(null);
    const [animated, setAnimated] = useState(false);

    // Normalise incoming data: accept either an array of {severity, value} objects
    // or a plain object { critical: N, high: N, ... }
    const counts = {};
    if (Array.isArray(data)) {
        data.forEach(d => {
            const sev = (d.severity || d.name || '').toLowerCase();
            if (sev in SEV_META) counts[sev] = (counts[sev] || 0) + (d.value || d.count || 0);
        });
    } else if (data && typeof data === 'object') {
        SEV_ORDER.forEach(sev => { counts[sev] = data[sev] || 0; });
    }

    const total = SEV_ORDER.reduce((acc, s) => acc + (counts[s] || 0), 0);
    const hasData = total > 0;

    // Trigger bar animation on mount / data change
    useEffect(() => {
        setAnimated(false);
        const id = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(id);
    }, [data]);

    return (
        <div className="glass-card p-4 w-full flex flex-col" ref={containerRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                    Vulnerability Severity Distribution
                </p>
                {hasData && (
                    <span className="text-[9px] font-mono text-gray-600 tabular-nums">
                        {total} total
                    </span>
                )}
            </div>

            {hasData ? (
                <div className="space-y-2.5">
                    {SEV_ORDER.map((sev, idx) => {
                        const meta  = SEV_META[sev];
                        const count = counts[sev] || 0;
                        const pct   = total > 0 ? (count / total) * 100 : 0;
                        const isEmpty = count === 0;

                        return (
                            <motion.div
                                key={sev}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: isEmpty ? 0.35 : 1, x: 0 }}
                                transition={{ delay: idx * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                whileHover={!isEmpty ? { scale: 1.015 } : undefined}
                                className="group relative flex items-center gap-3"
                            >
                                {/* Severity label + dot */}
                                <div className="flex items-center gap-1.5 w-16 shrink-0">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                            background: meta.color,
                                            boxShadow: isEmpty ? 'none' : `0 0 5px ${meta.color}`,
                                        }}
                                    />
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wide"
                                        style={{ color: isEmpty ? '#444' : meta.text }}
                                    >
                                        {meta.label}
                                    </span>
                                </div>

                                {/* Bar track */}
                                <div
                                    className="flex-1 relative h-5 rounded"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isEmpty ? 'rgba(255,255,255,0.05)' : meta.border}`,
                                        overflow: 'visible',
                                    }}
                                >
                                    {/* Fill */}
                                    <div
                                        className="absolute inset-y-0 left-0 rounded transition-all"
                                        style={{
                                            width: animated ? `${pct}%` : '0%',
                                            transitionProperty: 'width',
                                            transitionDuration: '600ms',
                                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                            background: `linear-gradient(90deg, ${meta.color}cc, ${meta.color}66)`,
                                            boxShadow: isEmpty ? 'none' : `0 0 8px ${meta.glow}`,
                                        }}
                                    />
                                    {/* Inner label — always shown for all rows */}
                                    {!isEmpty && (
                                        <span
                                            className="absolute inset-0 flex items-center px-2 text-[10px] font-bold font-mono whitespace-nowrap"
                                            style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)', zIndex: 1 }}
                                        >
                                            {count} ({pct.toFixed(0)}%)
                                        </span>
                                    )}
                                </div>

                                {/* Right count badge */}
                                <div className="w-10 shrink-0 flex items-center justify-end">
                                    <span
                                        className="text-[11px] font-black tabular-nums"
                                        style={{ color: isEmpty ? '#444' : meta.text }}
                                    >
                                        {count}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Mini summary strip */}
                    <div className="mt-3 flex rounded overflow-hidden" style={{ height: 4 }}>
                        {SEV_ORDER.filter(s => (counts[s] || 0) > 0).map(sev => (
                            <div
                                key={sev}
                                style={{
                                    width: `${((counts[sev] || 0) / total) * 100}%`,
                                    background: SEV_META[sev].color,
                                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                                }}
                                title={`${SEV_META[sev].label}: ${counts[sev]}`}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className="flex flex-col items-center justify-center border border-dashed border-white/5 rounded"
                    style={{ height: 180 }}
                >
                    <div className="w-8 h-8 rounded-full border border-dashed border-white/10 flex items-center justify-center mb-2">
                        <span className="text-gray-700 text-lg">✓</span>
                    </div>
                    <p className="text-[9px] font-black uppercase text-gray-700 tracking-widest">
                        No Open Vulnerabilities
                    </p>
                </div>
            )}
        </div>
    );
};

export default RiskHeatmap;
