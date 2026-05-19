import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const BASE =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg';

const SIZES = {
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
};

const VARIANTS = {
    primary:
        'text-cyber-bg bg-gradient-to-r from-cyber-accent via-cyber-teal to-cyber-accent bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-neon',
    secondary:
        'text-white/90 bg-white/[0.04] border border-white/15 hover:border-cyber-accent/60 hover:text-cyber-accent backdrop-blur',
    ghost:
        'text-white/80 hover:text-cyber-accent',
};

export default function GradientButton({
    to,
    href,
    onClick,
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    icon: Icon,
    ...rest
}) {
    const classes = `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
    const inner = (
        <>
            {children}
            {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null}
        </>
    );

    if (to) {
        return (
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link to={to} className={classes} {...rest}>{inner}</Link>
            </motion.div>
        );
    }
    if (href) {
        return (
            <motion.a
                href={href}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={classes}
                {...rest}
            >
                {inner}
            </motion.a>
        );
    }
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={classes}
            {...rest}
        >
            {inner}
        </motion.button>
    );
}
