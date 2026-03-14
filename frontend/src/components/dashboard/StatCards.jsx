import React, { useEffect, useState } from 'react';
import { ShieldCheck, Bug, Monitor, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SEVERITY_COLORS = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-blue-400',
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

const StatCards = ({ latestScan, isScanning }) => {
    const riskScore = latestScan?.risk_score ?? 0;
    const healthScore = latestScan?.health_score ?? (latestScan ? 100 - riskScore : null);
    const vulnCount = latestScan?.vulnerabilities?.length ?? 0;
    const assetCount = latestScan?.assets?.length ?? latestScan?.asset_count ?? 0;

    const animRisk = useCountUp(Math.round(riskScore));
    const animVuln = useCountUp(vulnCount);
    const animAssets = useCountUp(assetCount);

    // Build severity distribution bars from vulnerabilities
    const sevMap = {};
    (latestScan?.vulnerabilities || []).forEach(v => {
        const sev = (v.severity || 'LOW').toUpperCase();
        sevMap[sev] = (sevMap[sev] || 0) + 1;
    });
    const sevOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    let scanStatus = 'Idle';
    let scanStatusColor = 'text-gray-500';
    if (isScanning) {
        scanStatus = 'Active';
        scanStatusColor = 'text-cyber-accent';
    } else if (latestScan?.status === 'COMPLETED') {
        scanStatus = 'Complete';
        scanStatusColor = 'text-cyber-success';
    } else if (latestScan?.status === 'FAILED') {
        scanStatus = 'Failed';
        scanStatusColor = 'text-cyber-danger';
    }

    // Determine health grade
    const health = healthScore ?? (100 - riskScore);
    let grade = 'F', gradeColor = 'text-red-400';
    if (health >= 80) { grade = 'A'; gradeColor = 'text-cyber-success'; }
    else if (health >= 60) { grade = 'B'; gradeColor = 'text-cyber-accent'; }
    else if (health >= 40) { grade = 'C'; gradeColor = 'text-cyber-warning'; }
    else if (health >= 20) { grade = 'D'; gradeColor = 'text-orange-400'; }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
            {/* Security Health */}
            <div className="stat-card group">
                <div className="absolute inset-0 bg-cyber-success/3 rounded-2xl" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-success/50 to-transparent rounded-t-2xl" />
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Security Health</span>
                    <ShieldCheck className="h-4 w-4 text-cyber-success/50" />
                </div>
                <div className="flex items-end gap-2 relative z-10">
                    <span className={`text-5xl font-black ${gradeColor}`}>{grade}</span>
                    <div className="flex flex-col mb-1">
                        <span className={`text-xs font-bold ${gradeColor}/70`}>{Math.round(health)}/100</span>
                        <span className="text-[9px] text-gray-600 font-mono uppercase">Operational</span>
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
                    <div
                        className="h-full bg-gradient-to-r from-cyber-success/50 to-cyber-success transition-all duration-1000"
                        style={{ width: `${health}%` }}
                    />
                </div>
            </div>

            {/* Vulnerabilities */}
            <div className="stat-card group">
                <div className="absolute inset-0 bg-red-500/3 rounded-2xl" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent rounded-t-2xl" />
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Vulnerabilities</span>
                    <Bug className="h-4 w-4 text-red-500/50" />
                </div>
                <div className="flex items-end gap-2 relative z-10">
                    <span className="text-5xl font-black text-white">{animVuln}</span>
                    <span className="text-[9px] text-gray-600 font-mono uppercase mb-1">Found</span>
                </div>
                {/* Mini severity bar */}
                <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden relative z-10">
                    {vulnCount === 0 ? (
                        <div className="h-full w-full bg-white/5 rounded-full" />
                    ) : (
                        sevOrder.map(sev => {
                            const pct = ((sevMap[sev] || 0) / vulnCount) * 100;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={sev}
                                    className={`h-full ${SEVERITY_COLORS[sev]} transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                    title={`${sev}: ${sevMap[sev]}`}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* Assets Discovered */}
            <div className="stat-card group">
                <div className="absolute inset-0 bg-cyber-accent/3 rounded-2xl" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-accent/50 to-transparent rounded-t-2xl" />
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Assets Discovered</span>
                    <Monitor className="h-4 w-4 text-cyber-accent/50" />
                </div>
                <div className="flex items-end gap-2 relative z-10">
                    <span className="text-5xl font-black text-white">{animAssets}</span>
                    <span className="text-[9px] text-gray-600 font-mono uppercase mb-1">Hosts</span>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                    <span className="text-[9px] text-gray-600 font-mono">Last scan inventory</span>
                </div>
            </div>

            {/* Scan Engine */}
            <div className="stat-card group">
                <div className={`absolute inset-0 ${isScanning ? 'bg-cyber-accent/5' : 'bg-white/2'} rounded-2xl transition-colors`} />
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${isScanning ? 'via-cyber-accent/50' : 'via-gray-700/50'} to-transparent rounded-t-2xl transition-colors`} />
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Scan Engine</span>
                    <Zap className={`h-4 w-4 ${isScanning ? 'text-cyber-accent animate-pulse' : 'text-gray-600'}`} />
                </div>
                <div className="relative z-10">
                    <span className={`text-2xl font-black ${scanStatusColor} uppercase tracking-tight`}>{scanStatus}</span>
                </div>
                {isScanning && (
                    <div className="flex items-center gap-2 relative z-10 animate-fade-in">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyber-accent/60 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                        <span className="text-[9px] text-cyber-accent font-mono uppercase">Running</span>
                    </div>
                )}
                {!isScanning && (
                    <div className="relative z-10">
                        <span className="text-[9px] text-gray-600 font-mono uppercase">
                            {latestScan ? `Last: ${new Date(latestScan.created_at || Date.now()).toLocaleDateString()}` : 'No scans yet'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCards;
