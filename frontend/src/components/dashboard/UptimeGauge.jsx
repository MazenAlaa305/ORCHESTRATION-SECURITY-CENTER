import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useCountUp from '../../hooks/useCountUp';

const getColor = (v) => {
    if (v > 80) return '#00ff88';
    if (v > 50) return '#00ffff';
    if (v > 20) return '#ff9900';
    return '#ff0055';
};

const getStatus = (v) => {
    if (v > 80) return 'OPERATIONAL';
    if (v > 50) return 'DEGRADED';
    if (v > 20) return 'AT RISK';
    return 'CRITICAL';
};

const UptimeGauge = ({ value = 100 }) => {
    const radius          = 52;
    const strokeWidth     = 7;
    const normalizedR     = radius - strokeWidth * 2;
    const circumference   = normalizedR * 2 * Math.PI;
    const dashOffset      = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
    const color           = getColor(value);
    const status          = getStatus(value);

    // Track previous value for trend arrow
    const prevRef = useRef(value);
    const [trend, setTrend] = useState(0); // +1 up, -1 down, 0 stable
    useEffect(() => {
        const delta = value - prevRef.current;
        if (Math.abs(delta) >= 1) setTrend(delta > 0 ? 1 : -1);
        else setTrend(0);
        prevRef.current = value;
    }, [value]);

    const animatedValue = useCountUp(Math.round(value), { duration: 900 });

    return (
        <div className="glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden">
            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3 w-full text-left">
                Health Score
            </p>

            {/* SVG gauge — rotated so arc starts at 12 o'clock */}
            <div className="relative">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {/* Track */}
                    <circle
                        stroke="rgba(255,255,255,0.04)"
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        r={normalizedR}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Progress arc — animated sweep on mount and value change */}
                    <motion.circle
                        stroke={color}
                        fill="transparent"
                        strokeDasharray={`${circumference} ${circumference}`}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        strokeLinecap="round"
                        strokeWidth={strokeWidth}
                        r={normalizedR}
                        cx={radius}
                        cy={radius}
                        style={{ transition: 'stroke 0.5s ease' }}
                    />
                </svg>

                {/* Centre text — counter-rotate to stay upright */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ transform: 'rotate(0deg)' }}
                >
                    <span className="text-xl font-black text-white leading-none tabular-nums">
                        {animatedValue}%
                    </span>
                    {trend !== 0 && (
                        <span
                            className="text-[8px] font-bold mt-0.5"
                            style={{ color: trend > 0 ? '#00ff88' : '#ff6a00' }}
                        >
                            {trend > 0 ? '▲' : '▼'}
                        </span>
                    )}
                </div>
            </div>

            {/* Status label */}
            <span
                className="mt-3 text-[8px] font-black uppercase tracking-widest"
                style={{ color }}
            >
                {status}
            </span>

            {/* Bottom accent bar */}
            <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: color, opacity: 0.15 }}
            />
        </div>
    );
};

export default UptimeGauge;
