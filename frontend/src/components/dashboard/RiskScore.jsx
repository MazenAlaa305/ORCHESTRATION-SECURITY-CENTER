import React, { useEffect, useState } from 'react';

function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target == null) return;
        let current = 0;
        const step = Math.max(target / (duration / 16), 0.5);
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            setValue(Math.round(current));
            if (current >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return value;
}

const RiskScore = ({ score }) => {
    const animScore = useCountUp(Math.round(score || 0));

    let grade = 'F', label = 'Critical';
    let strokeColor = '#ef4444', glowColor = 'rgba(239,68,68,0.5)', textColor = 'text-red-400';

    if (score >= 80) {
        grade = 'A'; label = 'Excellent';
        strokeColor = '#10b981'; glowColor = 'rgba(16,185,129,0.5)'; textColor = 'text-cyber-success';
    } else if (score >= 60) {
        grade = 'B'; label = 'Good';
        strokeColor = '#38bdf8'; glowColor = 'rgba(56,189,248,0.5)'; textColor = 'text-cyber-accent';
    } else if (score >= 40) {
        grade = 'C'; label = 'Fair';
        strokeColor = '#f59e0b'; glowColor = 'rgba(245,158,11,0.5)'; textColor = 'text-cyber-warning';
    } else if (score >= 20) {
        grade = 'D'; label = 'Poor';
        strokeColor = '#f97316'; glowColor = 'rgba(249,115,22,0.5)'; textColor = 'text-orange-400';
    }

    const circumference = 2 * Math.PI * 60;
    const dashOffset = circumference - (circumference * (score || 0)) / 100;

    return (
        <div className="glass-card p-5 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in">
            {/* Ambient glow */}
            <div
                className="absolute inset-0 blur-3xl rounded-full scale-150 opacity-10 transition-opacity duration-1000"
                style={{ background: glowColor }}
            />

            <h3 className="text-gray-500 text-[10px] uppercase tracking-[0.25em] mb-4 font-black relative z-10">
                Security Health
            </h3>

            <div className="relative h-36 w-36 flex items-center justify-center mb-4">
                <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 140 140"
                    style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
                >
                    {/* Track */}
                    <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    {/* Progress arc */}
                    <circle
                        cx="70" cy="70" r="60"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                    {/* Inner ring accent */}
                    <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </svg>

                {/* Center content */}
                <div className="flex flex-col items-center z-10">
                    <span className={`text-5xl font-black leading-none ${textColor}`}>{grade}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${textColor} opacity-80`}>
                        {label}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 mt-0.5">{animScore}%</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-2 relative z-10">
                <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-gray-600 tracking-tighter uppercase font-mono">Health Index</span>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(score || 0)}/100</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${score || 0}%`, background: `linear-gradient(90deg, ${strokeColor}60, ${strokeColor})` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default RiskScore;
