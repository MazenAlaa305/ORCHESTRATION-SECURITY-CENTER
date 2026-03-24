import React, { useEffect, useState } from 'react';
import { GaugeRing } from '../ui/GaugeRing';
import { ShieldCheck } from 'lucide-react';

const RiskScore = ({ score = 0 }) => {
    const safeScore = Math.min(Math.max(Math.round(score || 0), 0), 100);

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
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width:`${safeScore}%`, background:`linear-gradient(90deg, ${color}60, ${color})` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default RiskScore;
