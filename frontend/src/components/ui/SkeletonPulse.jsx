import React from 'react';

/**
 * SkeletonPulse — shimmer loading placeholder.
 * Usage: <SkeletonPulse className="h-8 w-full" />
 */
export const SkeletonPulse = ({ className = '', rounded = 'lg' }) => (
    <div
        className={`skeleton-pulse ${className}`}
        style={{ borderRadius: rounded === 'full' ? '9999px' : rounded === 'lg' ? '10px' : '6px' }}
    />
);

/**
 * SkeletonCard — pre-composed skeleton for a stat card.
 */
export const SkeletonCard = () => (
    <div className="glass-card p-5 space-y-3 animate-fade-in">
        <SkeletonPulse className="h-3 w-20" />
        <SkeletonPulse className="h-8 w-16" />
        <SkeletonPulse className="h-2 w-full" />
    </div>
);

/**
 * SkeletonRow — pre-composed skeleton for a table/list row.
 */
export const SkeletonRow = () => (
    <div className="flex items-center gap-3 p-3 glass-card animate-fade-in">
        <SkeletonPulse className="h-5 w-5" rounded="full" />
        <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-3 w-2/3" />
            <SkeletonPulse className="h-2 w-1/3" />
        </div>
        <SkeletonPulse className="h-5 w-16" />
    </div>
);

export default SkeletonPulse;
