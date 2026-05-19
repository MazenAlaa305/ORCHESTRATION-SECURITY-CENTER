import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Bell, BarChart3 } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const PROBLEMS = [
    {
        icon: DollarSign,
        title: 'No budget for a full SOC',
        text: 'A dedicated security operations center costs hundreds of thousands per year. Most SMEs simply cannot afford it.',
    },
    {
        icon: Bell,
        title: 'Tools that scream noise',
        text: 'Existing scanners surface hundreds of raw alerts with no business context — and most get ignored.',
    },
    {
        icon: BarChart3,
        title: 'CVSS ≠ business impact',
        text: 'A 9.8 CVSS on an isolated dev box matters less than a 6.5 on your payment server. CVSS alone can\'t tell you which.',
    },
];

export default function ProblemSection() {
    return (
        <SectionContainer>
            <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">The problem</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    The SME protection gap.
                </h2>
                <p className="mt-4 text-white/65 leading-relaxed">
                    Small and medium enterprises sit in the worst spot: too large to ignore, too small to defend.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
                {PROBLEMS.map((p, i) => (
                    <motion.div
                        key={p.title}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"
                    >
                        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyber-critical/10 ring-1 ring-cyber-critical/30">
                            <p.icon className="h-5 w-5 text-cyber-critical" aria-hidden="true" />
                        </div>
                        <h3 className="text-white font-display font-semibold text-lg mb-2">{p.title}</h3>
                        <p className="text-white/65 text-sm leading-relaxed">{p.text}</p>
                    </motion.div>
                ))}
            </div>
        </SectionContainer>
    );
}
