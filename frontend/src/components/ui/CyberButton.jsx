import React from 'react';

/**
 * CyberButton — animated border-trace button with neon glow on hover/active.
 * variants: 'primary' | 'secondary' | 'danger' | 'ghost'
 * sizes:    'sm' | 'md' | 'lg'
 */
export const CyberButton = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    className = '',
    ...props
}) => {
    const variants = {
        primary:   'bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-500 hover:to-blue-600 shadow-neon hover:shadow-neon-lg',
        secondary: 'border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-400',
        danger:    'bg-gradient-to-r from-red-700 to-pink-700 text-white hover:from-red-600 hover:to-pink-600 hover:shadow-danger-glow',
        ghost:     'text-gray-400 hover:text-white hover:bg-white/8',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-[11px] gap-1.5',
        md: 'px-4 py-2   text-xs   gap-2',
        lg: 'px-6 py-2.5 text-sm   gap-2',
    };

    return (
        <button
            onClick={disabled || loading ? undefined : onClick}
            disabled={disabled || loading}
            className={`
                relative overflow-hidden group
                ${variants[variant]} ${sizes[size]}
                inline-flex items-center justify-center
                font-bold uppercase tracking-widest
                rounded-xl transition-all duration-300
                disabled:opacity-40 disabled:cursor-not-allowed
                ${className}
            `}
            {...props}
        >
            {/* Active border trace */}
            <span className="absolute inset-0 rounded-xl border border-white opacity-0 group-active:opacity-30 transition-opacity duration-150" />
            {/* Loading spinner */}
            {loading && (
                <svg className="animate-spin h-3 w-3 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    );
};

export default CyberButton;
