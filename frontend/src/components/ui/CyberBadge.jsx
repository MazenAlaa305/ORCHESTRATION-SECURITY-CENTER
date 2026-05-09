import React from 'react';

const severityConfig = {
    critical: { bg: 'rgba(255,0,85,0.12)',    border: 'rgba(255,0,85,0.45)',    color: '#ff0055', pulse: true  },
    high:     { bg: 'rgba(255,106,0,0.12)',   border: 'rgba(255,106,0,0.4)',    color: '#ff6a00', pulse: false },
    medium:   { bg: 'rgba(255,170,0,0.12)',   border: 'rgba(255,170,0,0.4)',    color: '#ffaa00', pulse: false },
    low:      { bg: 'rgba(0,255,255,0.08)',   border: 'rgba(0,255,255,0.28)',   color: '#00ffff', pulse: false },
    safe:     { bg: 'rgba(0,255,136,0.10)',   border: 'rgba(0,255,136,0.38)',   color: '#00ff88', pulse: false },
    info:     { bg: 'rgba(124,156,255,0.08)', border: 'rgba(124,156,255,0.28)', color: '#7c9cff', pulse: false },
    warning:  { bg: 'rgba(255,170,0,0.12)',   border: 'rgba(255,170,0,0.4)',    color: '#ffaa00', pulse: false },
    running:  { bg: 'rgba(0,255,255,0.1)',    border: 'rgba(0,255,255,0.4)',    color: '#00ffff', pulse: true  },
    queued:   { bg: 'rgba(124,156,255,0.1)',  border: 'rgba(124,156,255,0.35)', color: '#7c9cff', pulse: false },
    completed:{ bg: 'rgba(0,255,136,0.1)',    border: 'rgba(0,255,136,0.35)',   color: '#00ff88', pulse: false },
    failed:   { bg: 'rgba(255,0,85,0.12)',    border: 'rgba(255,0,85,0.4)',     color: '#ff0055', pulse: false },
};

export const CyberBadge = ({ label, type = 'info', dot = true, className = '' }) => {
    const cfg = severityConfig[type?.toLowerCase()] || severityConfig.info;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest font-outfit border ${cfg.pulse ? 'animate-pulse' : ''} ${className}`}
            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
        >
            {dot && (
                <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }}
                />
            )}
            {label}
        </span>
    );
};

export default CyberBadge;
