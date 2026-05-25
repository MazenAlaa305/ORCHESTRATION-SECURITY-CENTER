import { useState } from 'react';
import { ChevronUp, Layers } from 'lucide-react';

// Kept in sync with SEVERITY in NetworkTopology.jsx. Duplicated by value
// (not import) to keep this presentational component free of topology
// internals — if you add a tier there, mirror it here.
const LEGEND_ITEMS = [
    { tier: 'hub',      color: '#00ffff', label: 'Gateway / Subnet',   shape: 'circle' },
    { tier: 'critical', color: '#ff0055', label: 'Critical',           shape: 'square', pulse: true },
    { tier: 'high',     color: '#ff6a00', label: 'High',               shape: 'square', pulse: true },
    { tier: 'medium',   color: '#ffaa00', label: 'Medium',             shape: 'square' },
    { tier: 'low',      color: '#00ccff', label: 'Low',                shape: 'square' },
    { tier: 'secure',   color: '#00ff88', label: 'Secure',             shape: 'badge' },
    { tier: 'offline',  color: '#6b7280', label: 'Offline',            shape: 'square', dashed: true },
    { tier: 'unknown',  color: '#7a8a9a', label: 'Unscanned',          shape: 'square' },
];

const TopologyLegend = ({ className = '', counts = null }) => {
    // Pinned and expanded by default — analysts asked for the legend to be
    // visible at all times rather than hidden behind a hover affordance.
    const [open, setOpen] = useState(true);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Show legend"
                className={className}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(4,14,22,0.92)',
                    border: '1px solid rgba(0,255,255,0.25)',
                    borderRadius: 8, padding: '4px 8px',
                    color: '#00ffff', cursor: 'pointer',
                    fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.55)',
                }}
            >
                <Layers size={11} />
                Legend
            </button>
        );
    }

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                background: 'rgba(4,14,22,0.97)',
                border: '1px solid rgba(0,255,255,0.22)',
                borderRadius: 10,
                backdropFilter: 'blur(14px)',
                padding: '10px 14px',
                width: 216,
                boxShadow: '0 8px 32px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,255,255,0.06)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#00ffff', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                    Legend
                </span>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    title="Collapse legend"
                    style={{
                        background: 'transparent', border: 'none', color: '#5a6a7a',
                        cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center',
                    }}
                >
                    <ChevronUp size={12} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {LEGEND_ITEMS.map(({ tier, color, label, shape, pulse, dashed }) => {
                    const count = counts && counts[tier] != null ? counts[tier] : null;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            {shape === 'badge' ? (
                                <span style={{
                                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                                    background: color,
                                    boxShadow: `0 0 8px ${color}aa`,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#022e1a', fontSize: 8, fontWeight: 900, lineHeight: 1,
                                }}>✓</span>
                            ) : shape === 'circle' ? (
                                <span style={{
                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                    background: color,
                                    boxShadow: `0 0 8px ${color}aa`,
                                    display: 'inline-block',
                                }} />
                            ) : (
                                <span style={{
                                    width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                                    background: dashed ? 'transparent' : color,
                                    border: dashed ? `1px dashed ${color}` : 'none',
                                    boxShadow: dashed ? 'none' : `0 0 8px ${color}aa`,
                                    display: 'inline-block',
                                    animation: pulse ? 'pulse 1.2s infinite' : undefined,
                                }} />
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#d0dae8', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                                {label}
                            </span>
                            {count != null && count > 0 && (
                                <span style={{
                                    fontSize: 9, fontWeight: 900, color,
                                    background: `${color}1a`, border: `1px solid ${color}44`,
                                    padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
                                }}>
                                    {count}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,255,255,0.12)' }}>
                <p style={{ fontSize: 8.5, color: '#5a6a7a', lineHeight: 1.6, margin: 0 }}>
                    Hover nodes for details<br />
                    Scroll to zoom · Drag to pan
                </p>
            </div>
        </div>
    );
};

export default TopologyLegend;
