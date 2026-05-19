import React from 'react';
import { motion } from 'framer-motion';

const TOOLS = ['Nmap', 'Nuclei', 'OpenVAS', 'Wazuh', 'FastAPI', 'React', 'Redis', 'Celery'];

export default function TrustStrip() {
    return (
        <section className="relative border-y border-white/5 bg-white/[0.015] py-10">
            <div className="mx-auto max-w-7xl px-6 md:px-10">
                <p className="text-center text-xs uppercase tracking-[0.2em] text-white/45 mb-6">
                    Powered by trusted open-source security tooling
                </p>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
                >
                    {TOOLS.map((t) => (
                        <span
                            key={t}
                            className="font-mono text-white/40 hover:text-cyber-accent transition-colors text-sm md:text-base tracking-wide"
                        >
                            {t}
                        </span>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
