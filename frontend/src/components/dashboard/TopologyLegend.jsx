import React from 'react';

const LEGEND_ITEMS = [
    { color: '#00ffff', label: 'Gateway Hub',     dot: true, dimColor: false },
    { color: '#00ff88', label: 'Operational',     dot: true, dimColor: false },
    { color: '#ffaa00', label: 'Warning',         dot: true, dimColor: false },
    { color: '#ff0055', label: 'Critical / Infected', dot: true, pulse: true },
];

/**
 * TopologyLegend — floating legend panel for the network topology map.
 * Position: absolute, top-left corner of the graph container.
 */
const TopologyLegend = ({ className = '' }) => (
    <div className={`node-box px-4 py-3 space-y-2.5 w-44 ${className}`}>
        <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Legend</p>
            <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#00ffff', boxShadow: '0 0 6px #00ffff' }}
            />
        </div>

        {LEGEND_ITEMS.map(({ color, label, pulse }) => (
            <div key={label} className="flex items-center gap-2 group cursor-default">
                <div
                    className={`w-2.5 h-2.5 rounded flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
                    style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}88`,
                        borderRadius: 4,
                    }}
                />
                <span
                    className="text-[9px] font-bold uppercase tracking-wide group-hover:text-white transition-colors"
                    style={{ color: 'rgba(160,170,185,0.85)' }}
                >
                    {label}
                </span>
            </div>
        ))}

        <div className="pt-1.5" style={{ borderTop: '1px solid rgba(0,255,255,0.08)' }}>
            <p className="text-[8px] text-gray-600 italic leading-relaxed">
                Hover nodes for details<br />
                Scroll to zoom • Drag to pan
            </p>
        </div>
    </div>
);

export default TopologyLegend;
