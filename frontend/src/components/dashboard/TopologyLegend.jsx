const LEGEND_ITEMS = [
    { color: '#00ffff', label: 'Gateway Hub',        pulse: false },
    { color: '#00ff88', label: 'Operational',        pulse: false },
    { color: '#ffaa00', label: 'Warning',            pulse: false },
    { color: '#ff0055', label: 'Critical / Infected',pulse: true  },
];

const TopologyLegend = ({ className = '' }) => (
    <div
        className={`${className}`}
        style={{
            background:   'rgba(4, 14, 22, 0.92)',
            border:       '1px solid rgba(0, 255, 255, 0.22)',
            borderRadius: 10,
            backdropFilter: 'blur(12px)',
            padding:      '10px 14px',
            width:        176,
            boxShadow:    '0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,255,0.06)',
        }}
    >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: '#00ffff', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                Legend
            </span>
            <span
                style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#00ffff', boxShadow: '0 0 7px #00ffff',
                    display: 'inline-block', animation: 'pulse 2s infinite',
                }}
            />
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEGEND_ITEMS.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                        style={{
                            width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                            background: color,
                            boxShadow: `0 0 8px ${color}aa`,
                            display: 'inline-block',
                        }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#d0dae8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                    </span>
                </div>
            ))}
        </div>

        {/* Divider + hint */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,255,255,0.12)' }}>
            <p style={{ fontSize: 8.5, color: '#5a6a7a', lineHeight: 1.6, margin: 0 }}>
                Hover nodes for details<br />
                Scroll to zoom · Drag to pan
            </p>
        </div>
    </div>
);

export default TopologyLegend;
