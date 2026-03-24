import React, { useEffect, useState } from 'react';
import { ShieldCheck, Bug, Monitor, Zap } from 'lucide-react';

const SEV_COLORS = {
    CRITICAL: '#ff0055',
    HIGH:     '#ff6a00',
    MEDIUM:   '#ffaa00',
    LOW:      '#00ffff',
};

function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!target && target !== 0) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setValue(Math.round(start));
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return value;
}

const KPICard = ({ title, value, sub, icon, color, bar, barSegments, pulse }) => {
    const animValue = useCountUp(typeof value === 'number' ? value : 0);

    return (
        <div
            className="relative overflow-hidden rounded-xl p-5 flex flex-col gap-3 transition-all duration-300 group"
            style={{
                background:  `linear-gradient(135deg, rgba(15,25,34,0.7), rgba(10,17,24,0.85))`,
                border:      `1px solid ${color}28`,
                boxShadow:   `0 0 24px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0, ${color}10, transparent 70%)` }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{title}</span>
                <span style={{ color, opacity: 0.55 }}>{icon}</span>
            </div>

            {/* Value */}
            <div className="relative z-10 flex items-end gap-2">
                <span
                    className={`text-4xl font-black leading-none ${pulse ? 'animate-pulse' : ''}`}
                    style={{ color: typeof value === 'string' ? color : 'white' }}
                >
                    {typeof value === 'string' ? value : animValue}
                </span>
                {sub && <span className="text-[9px] text-gray-600 font-mono uppercase mb-0.5">{sub}</span>}
            </div>

            {/* Bar */}
            {bar !== undefined && (
                <div className="relative z-10 h-1 w-full rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    {barSegments ? (
                        <div className="flex h-full">
                            {barSegments.map(({ pct, c }, i) =>
                                pct > 0 ? (
                                    <div key={i} className="h-full transition-all duration-700" style={{ width:`${pct}%`, background: c }} />
                                ) : null
                            )}
                        </div>
                    ) : (
                        <div className="h-full rounded-full transition-all duration-1000"
                             style={{ width:`${bar}%`, background:`linear-gradient(90deg, ${color}60, ${color})` }} />
                    )}
                </div>
            )}

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px"
                 style={{ background:`linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
        </div>
    );
};

const StatCards = ({ latestScan, isScanning }) => {
    const riskScore   = latestScan?.risk_score ?? 0;
    const healthScore = Math.round(100 - riskScore);
    const vulnCount   = latestScan?.vulnerabilities?.length ?? latestScan?.vulnerabilities_count ?? 0;
    const assetCount  = latestScan?.assets?.length ?? latestScan?.assets_count ?? 0;

    const vulns = latestScan?.vulnerabilities || [];
    const sevMap = {};
    vulns.forEach(v => {
        const s = (v.severity || 'LOW').toUpperCase();
        sevMap[s] = (sevMap[s] || 0) + 1;
    });
    const sevSegments = ['CRITICAL','HIGH','MEDIUM','LOW'].map(s => ({
        pct: vulnCount ? ((sevMap[s] || 0) / vulnCount) * 100 : 0,
        c:   SEV_COLORS[s],
    }));

    let engineStatus = 'IDLE', engineColor = '#1a2332';
    if (isScanning)                           { engineStatus = 'ACTIVE';    engineColor = '#00ffff'; }
    else if (latestScan?.status === 'COMPLETED') { engineStatus = 'COMPLETE';  engineColor = '#00ff88'; }
    else if (latestScan?.status === 'FAILED')    { engineStatus = 'FAILED';    engineColor = '#ff0055'; }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
            <KPICard
                title="Security Health"
                value={healthScore}
                sub="/ 100"
                icon={<ShieldCheck className="h-4 w-4" />}
                color="#00ff88"
                bar={healthScore}
            />
            <KPICard
                title="Vulnerabilities"
                value={vulnCount}
                sub="Found"
                icon={<Bug className="h-4 w-4" />}
                color={vulnCount === 0 ? '#00ff88' : vulnCount > 5 ? '#ff0055' : '#ffaa00'}
                bar={vulnCount > 0 ? 100 : 0}
                barSegments={vulnCount > 0 ? sevSegments : undefined}
            />
            <KPICard
                title="Assets Discovered"
                value={assetCount}
                sub="Hosts"
                icon={<Monitor className="h-4 w-4" />}
                color="#00ffff"
                bar={Math.min(assetCount * 5, 100)}
            />
            <KPICard
                title="Scan Engine"
                value={engineStatus}
                sub={latestScan ? new Date(latestScan.started_at || Date.now()).toLocaleDateString() : 'No scans yet'}
                icon={<Zap className="h-4 w-4" />}
                color={engineColor}
                bar={isScanning ? 70 : undefined}
                pulse={isScanning}
            />
        </div>
    );
};

export default StatCards;
