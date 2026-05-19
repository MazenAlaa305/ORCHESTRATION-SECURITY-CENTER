import React from 'react';
import { motion } from 'framer-motion';

const STATS = [
    { value: '1000→5', label: 'Raw logs to action items' },
    { value: '4',       label: 'Stage scan pipeline' },
    { value: '100%',    label: 'Open-source core' },
    { value: '24/7',    label: 'Real-time monitoring' },
];

export default function StatsBar() {
    return (
        <section className="relative py-14 border-y border-white/5"
                 style={{
                     background: 'linear-gradient(90deg, rgba(0,255,255,0.04), rgba(77,189,177,0.06), rgba(0,255,255,0.04))',
                 }}>
            <div className="mx-auto max-w-7xl px-6 md:px-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATS.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.08 }}
                            className="text-center"
                        >
                            <div className="font-display text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-accent to-cyber-teal">
                                {s.value}
                            </div>
                            <div className="text-white/55 text-sm mt-2 uppercase tracking-wider">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
