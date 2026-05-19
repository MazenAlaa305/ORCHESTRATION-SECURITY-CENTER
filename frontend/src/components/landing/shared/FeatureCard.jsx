import React from 'react';
import { motion } from 'framer-motion';

export default function FeatureCard({ icon: Icon, title, description, accent = 'teal' }) {
    const accentColor = {
        teal:   'rgba(77,189,177,0.55)',
        cyan:   'rgba(0,255,255,0.55)',
        amber:  'rgba(255,170,0,0.5)',
        red:    'rgba(255,0,85,0.5)',
        green:  'rgba(0,255,136,0.5)',
    }[accent] || 'rgba(77,189,177,0.55)';

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm overflow-hidden"
        >
            <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: `0 0 0 1px ${accentColor}, 0 0 40px -8px ${accentColor}` }}
            />
            <div className="relative z-10">
                {Icon ? (
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyber-accent/10 ring-1 ring-cyber-accent/30">
                        <Icon className="h-5 w-5 text-cyber-accent" aria-hidden="true" />
                    </div>
                ) : null}
                <h3 className="text-white font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}
