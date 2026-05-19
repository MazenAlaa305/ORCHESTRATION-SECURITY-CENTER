import React from 'react';
import { motion } from 'framer-motion';
import useCountUp from '../hooks/useCountUp';

const MetricCard = ({ label, value, unit, gradient = 'purple', icon, trend }) => {
    const gradientClasses = {
        purple: 'gradient-card-purple',
        cyan: 'gradient-card-cyan',
        red: 'bg-gradient-to-br from-red-500 to-pink-600',
        green: 'bg-gradient-to-br from-green-500 to-emerald-600',
        yellow: 'bg-gradient-to-br from-yellow-500 to-orange-500'
    };

    const numeric = typeof value === 'number' ? value : Number(value);
    const animated = useCountUp(Number.isFinite(numeric) ? numeric : null);
    const display = Number.isFinite(numeric) ? animated.toLocaleString() : value;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`${gradientClasses[gradient]} rounded-2xl p-6 shadow-lg cursor-default`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="metric-label text-white/80 text-sm uppercase tracking-wider">
                    {label}
                </div>
                {icon && <motion.span whileHover={{ rotate: 8, scale: 1.1 }} className="text-2xl opacity-80">{icon}</motion.span>}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">
                    {display}
                </span>
                {unit && <span className="text-xl text-white/70">{unit}</span>}
            </div>

            {trend != null && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="mt-3 flex items-center gap-2"
                >
                    <span className={`text-sm ${trend > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                    <span className="text-xs text-white/60">vs last period</span>
                </motion.div>
            )}
        </motion.div>
    );
};

export default MetricCard;
