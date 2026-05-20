import React from 'react';
import { motion } from 'framer-motion';
import { Users, Server, ClipboardCheck, ArrowRight } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const CASES = [
    {
        icon: Users,
        title: 'IT admins at SMEs',
        text: 'You wear ten hats. OSC gives you a security posture you can actually action — without becoming a SOC analyst.',
        points: ['One dashboard for everything', 'Plain-language remediations', 'Alerts that matter'],
    },
    {
        icon: Server,
        title: 'Managed service providers',
        text: 'Run scans across multiple client networks with role-based isolation. Hand off a clean report at the end of every engagement.',
        points: ['Multi-tenant ready', 'Branded PDF reports', 'API for automation'],
    },
    {
        icon: ClipboardCheck,
        title: 'Compliance & audit teams',
        text: 'Evidence trail, ticketing-friendly findings, and CVE references for every alert — ready for ISO 27001 and SOC 2 cycles.',
        points: ['Full evidence trail', 'CVE-mapped findings', 'Exportable reports'],
    },
];

export default function UseCases() {
    return (
        <SectionContainer id="use-cases">
            <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">Use cases</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    Built for the teams that get paged.
                </h2>
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
