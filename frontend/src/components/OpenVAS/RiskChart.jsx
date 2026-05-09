import React from 'react';

const SEVERITIES = [
    { key: ['CRITICAL', 'critical'], label: 'Critical', color: '#ff0055', bg: 'rgba(255,0,85,0.12)',  border: 'rgba(255,0,85,0.3)'  },
    { key: ['HIGH',     'high'    ], label: 'High',     color: '#ff6a00', bg: 'rgba(255,106,0,0.12)', border: 'rgba(255,106,0,0.3)' },
    { key: ['MEDIUM',   'medium'  ], label: 'Medium',   color: '#ffaa00', bg: 'rgba(255,170,0,0.12)', border: 'rgba(255,170,0,0.3)' },
    { key: ['LOW',      'low'     ], label: 'Low',      color: '#00ccff', bg: 'rgba(0,204,255,0.10)', border: 'rgba(0,204,255,0.28)' },
];

const RiskChart = ({ data }) => {
    const counts = SEVERITIES.map((s) => ({
        ...s,
        value: s.key.reduce((acc, k) => acc + (data?.[k] || 0), 0),
    }));

    const total = counts.reduce((acc, s) => acc + s.value, 0);

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">
                    Vulnerability Risk Distribution
                </h3>
                <span className="text-xs font-black text-white">
                    {total} <span className="text-gray-500 font-normal">total</span>
                </span>
            </div>

            <div className="flex flex-col gap-3 flex-grow justify-center">
                {counts.map(({ label, color, border, value }) => {
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (
                        <div key={label}>
                            {/* Label row */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                                    />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider"
                                        style={{ color }}>
                                        {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">{pct}%</span>
                                    <span
                                        className="text-xs font-black min-w-[24px] text-right"
                                        style={{ color: value > 0 ? color : '#374151' }}
                                    >
                                        {value}
                                    </span>
                                </div>
                            </div>

                            {/* Bar track */}
                            <div
                                className="w-full h-2 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}` }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${pct}%`,
                                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                                        boxShadow: value > 0 ? `0 0 8px ${color}66` : 'none',
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom summary pills */}
            {total === 0 ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #00ff88' }} />
                    No vulnerabilities detected
                </div>
            ) : (
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {counts.filter(s => s.value > 0).map(({ label, color, bg, border, value }) => (
                        <span
                            key={label}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
                            style={{ background: bg, border: `1px solid ${border}`, color }}
                        >
                            {value} {label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RiskChart;
