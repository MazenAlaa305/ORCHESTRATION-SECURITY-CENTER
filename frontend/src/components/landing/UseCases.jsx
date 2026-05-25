import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, BrainCircuit, ArrowRight } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const CASES = [
    {
        icon: ShieldCheck,
        title: 'Continuous risk reduction',
        text: 'Replace one-off pentests with always-on scanning. OSC fuses Nmap, Nuclei, and OpenVAS into a single deterministic pipeline so nothing slips through the cracks.',
        points: ['Automated weekly sweeps', 'Drift detection on new assets', 'Prioritised remediation queue'],
    },
    {
        icon: Zap,
        title: 'Faster incident response',
        text: 'When something pops, OSC shows you exactly which host, which CVE, and which fix — in plain English. Cut mean-time-to-respond from days to minutes.',
        points: ['Live WebSocket alerts', 'CVE-to-asset mapping', 'One-click remediation playbooks'],
    },
    {
        icon: BrainCircuit,
        title: 'Audit-ready evidence',
        text: 'Every finding ships with timestamps, evidence, and CVE references. Export branded PDF reports the moment your ISO 27001 or SOC 2 cycle asks for them.',
        points: ['Immutable audit trail', 'Signed PDF reports', 'Role-based access logs'],
    },
];

export default function UseCases() {
    return (
        <SectionContainer id="solutions">
            <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">Solutions</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    Security outcomes, not another dashboard.
                </h2>
                <p className="text-white/60 text-sm md:text-base mt-4">
                    From continuous scanning to audit-ready reports, OSC delivers the security wins your team actually needs.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
                {CASES.map((c, i) => (
                    <motion.div
                        key={c.title}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col"
                    >
                        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyber-accent/10 ring-1 ring-cyber-accent/30">
                            <c.icon className="h-5 w-5 text-cyber-accent" />
                        </div>
                        <h3 className="text-white font-display font-semibold text-lg mb-2">{c.title}</h3>
                        <p className="text-white/65 text-sm leading-relaxed mb-4">{c.text}</p>
                        <ul className="space-y-2 mb-4">
                            {c.points.map((p) => (
                                <li key={p} className="flex items-center gap-2 text-sm text-white/70">
                                    <ArrowRight className="h-3.5 w-3.5 text-cyber-accent" /> {p}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </SectionContainer>
    );
}
