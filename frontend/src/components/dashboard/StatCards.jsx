import React, { useEffect, useState } from 'react';
import { ShieldCheck, Bug, Monitor, Zap, AlertTriangle } from 'lucide-react';
import { useRealTime } from '../../context/RealTimeContext';

const SEV_COLORS = {
    CRITICAL: '#ff0055',
    HIGH:     '#ff6a00',
    MEDIUM:   '#ffaa00',
    LOW:      '#00ffff',
    INFO:     '#888888',
};

function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === undefined || target === null) return;
        const numTarget = Number(target);
        if (isNaN(numTarget)) return;
        let current = 0;
        const step = numTarget / (duration / 16);
        const timer = setInterval(() => {
            current = Math.min(current + step, numTarget);
            setValue(Math.round(current));
            if (current >= numTarget) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return value;
}

const KPICard = ({ title, value, sub, icon, color, bar, barSegments, pulse, badge }) => {
    const animValue = useCountUp(typeof value === 'number' ? value : 0);

    return (
        <div
            className="relative overflow-hidden rounded-lg p-4 flex flex-col gap-2 transition-all duration-300 group"
            style={{
                background: 'linear-gradient(135deg, rgba(15,25,34,0.7), rgba(10,17,24,0.85))',
                border:     `1px solid ${color}20`,
                boxShadow:  `0 0 16px ${color}08, inset 0 1px 0 rgba(255,255,255,0.02)`,
            }}
        >
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600">{title}</span>
                    {badge}
                </div>
                <span style={{ color, opacity: 0.4 }}>
                    {React.cloneElement(icon, { className: 'h-3 w-3' })}
                </span>
            </div>

            <div className="relative z-10 flex items-end gap-1.5">
                <span
                    className={`text-2xl font-black leading-none ${pulse ? 'animate-pulse' : ''}`}
                    style={{ color: typeof value === 'string' ? color : 'white' }}
                >
                    {typeof value === 'string' ? value : animValue}
                </span>
                {sub && (
                    <span className="text-[8px] text-gray-700 font-mono uppercase mb-0.5">{sub}</span>
                )}
            </div>

            {bar !== undefined && (
                <div
                    className="relative z-10 h-0.5 w-full rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                    {barSegments ? (
                        <div className="flex h-full">
                            {barSegments.map(({ pct, c }, i) =>
                                pct > 0 ? (
                                    <div
                                        key={i}
                                        className="h-full transition-all duration-700"
                                        style={{ width: `${pct}%`, background: c }}
                                    />
                                ) : null
                            )}
                        </div>
                    ) : (
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${bar}%`, background: `linear-gradient(90deg, ${color}40, ${color})` }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * StatCards — 4-card KPI grid.
 * Severity counts are read directly from realTime.kpi.counts so they update
 * live via WebSocket without needing to parse latestScan.vulnerabilities[].
 */
const StatCards = ({ latestScan, isScanning }) => {
    const { state: realTime } = useRealTime();

    // Health / risk — prefer live KPI, fall back to latestScan
    const riskScore   = realTime.kpi.overall_score ?? latestScan?.risk_score ?? 0;
    const healthScore = Math.round(realTime.kpi.health_score ?? (100 - riskScore));

    // Vulnerability count — exclude INFO (informational) to match the risk chart
    const counts = realTime.kpi.counts || {};
    const { critical = 0, high = 0, medium = 0, low = 0, info = 0 } = counts;
    const vulnCount = critical + high + medium + low;

    // Assets — prefer live KPI
    const assetCount = realTime.kpi.total_assets ?? latestScan?.assets?.length ?? 0;

    // Overdue findings (SLA breaches)
    const overdueCount = realTime.kpi.overdue_findings ?? 0;

    // Severity bar segments (proportional)
    const sevSegments = vulnCount > 0
        ? [
            { pct: (critical / vulnCount) * 100, c: SEV_COLORS.CRITICAL },
            { pct: (high     / vulnCount) * 100, c: SEV_COLORS.HIGH     },
            { pct: (medium   / vulnCount) * 100, c: SEV_COLORS.MEDIUM   },
            { pct: (low      / vulnCount) * 100, c: SEV_COLORS.LOW      },
            { pct: (info     / vulnCount) * 100, c: SEV_COLORS.INFO     },
          ]
        : undefined;

    // Engine status
    let engineStatus = 'IDLE', engineColor = '#1a2332';
    if (isScanning)                                { engineStatus = 'RUN';  engineColor = '#00ffff'; }
    else if (latestScan?.status === 'completed')   { engineStatus = 'OK';   engineColor = '#00ff88'; }
    else if (latestScan?.status === 'failed')      { engineStatus = 'FAIL'; engineColor = '#ff0055'; }

    const slaColor = overdueCount > 0 ? '#ff0055' : '#00ff88';

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4 animate-fade-in">
            <KPICard
                title="Security Health"
                value={healthScore}
                sub="/ 100"
                icon={<ShieldCheck />}
                color="#00ff88"
                bar={healthScore}
            />
            <KPICard
                title="Vulnerabilities"
                value={vulnCount}
                sub="Found"
                icon={<Bug />}
                color={vulnCount === 0 ? '#00ff88' : vulnCount > 5 ? '#ff0055' : '#ffaa00'}
                bar={vulnCount > 0 ? 100 : 0}
                barSegments={sevSegments}
            />
            <KPICard
                title="SLA Overdue"
                value={overdueCount}
                sub={overdueCount > 0 ? 'Needs attention' : 'All on track'}
                icon={<AlertTriangle />}
                color={slaColor}
                bar={overdueCount > 0 ? 100 : 0}
                pulse={overdueCount > 0}
            />
            <KPICard
                title="Assets"
                value={assetCount}
                sub="Hosts"
                icon={<Monitor />}
                color="#00ffff"
                bar={Math.min(assetCount * 5, 100)}
            />
            <KPICard
                title="Status"
                value={engineStatus}
                sub="System"
                icon={<Zap />}
                color={engineColor}
                bar={isScanning ? 70 : undefined}
                pulse={isScanning}
            />
        </div>
    );
};

export default StatCards;
