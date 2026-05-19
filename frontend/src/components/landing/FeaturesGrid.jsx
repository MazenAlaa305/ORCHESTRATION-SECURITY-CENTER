import React from 'react';
import { motion } from 'framer-motion';
import { Workflow, Gauge, Sparkles, RadioTower, Lock, Wifi } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';
import FeatureCard from './shared/FeatureCard';

const FEATURES = [
    {
        icon: Workflow,
        title: 'Deterministic 4-stage pipeline',
        description: 'Recon → Attack → Deep scan → Score. Each stage triggers the next only when relevant — no wasted tests, no missed paths.',
    },
    {
        icon: Gauge,
        title: 'Risk scoring in business terms',
        description: 'A unified risk engine translates CVSS, exposure, and asset value into a single score your CFO can read.',
    },
    {
        icon: Sparkles,
        title: 'AI advisory (read-only)',
        description: 'An LLM advisor explains findings in plain language and recommends next steps — without ever acting on your network.',
    },
    {
        icon: RadioTower,
        title: 'SIEM integration',
        description: 'Native Wazuh integration. Stream events into the dashboards and correlation rules you already trust.',
    },
    {
        icon: Lock,
        title: 'Role-based access control',
        description: 'Admin, analyst, viewer. Granular permissions so the right people see the right alerts — and nothing more.',
    },
    {
        icon: Wifi,
        title: 'Real-time WebSocket updates',
        description: 'Scan progress, new findings, and risk changes stream into the dashboard the moment they happen.',
    },
];

export default function FeaturesGrid() {
    return (
        <SectionContainer id="features">
            <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">The platform</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    Everything an IT admin needs.
                    <br />
                    <span className="text-white/55">Nothing they don't.</span>
                </h2>
            </div>

            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={{
                    hidden:  { transition: { staggerChildren: 0.06 } },
                    visible: { transition: { staggerChildren: 0.06 } },
                }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
                {FEATURES.map((f) => (
                    <motion.div
                        key={f.title}
                        variants={{
                            hidden:  { opacity: 0, y: 18 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
                        }}
                    >
                        <FeatureCard {...f} />
                    </motion.div>
                ))}
            </motion.div>
        </SectionContainer>
    );
}
