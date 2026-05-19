import React from 'react';
import { motion } from 'framer-motion';
import { Radar, Crosshair, ScanLine, BrainCircuit } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const STEPS = [
    {
        icon: Radar,
        label: 'Stage 01',
        title: 'Recon',
        text: 'ReconAgent runs Nmap against your assets, fingerprinting services and open ports.',
    },
    {
        icon: Crosshair,
        label: 'Stage 02',
        title: 'Attack',
        text: 'AttackAgent uses Nmap output to fire only the relevant Nuclei templates — SMB tests for SMB, web tests for web.',
    },
    {
        icon: ScanLine,
        label: 'Stage 03',
        title: 'Deep scan',
        text: 'OpenVAS runs targeted CVE deep scans on confirmed services to verify exploitability.',
    },
    {
        icon: BrainCircuit,
        label: 'Stage 04',
        title: 'Score & Advise',
        text: 'The unified risk engine scores each finding; the AI advisor writes plain-language remediation guidance.',
    },
];

export default function HowItWorks() {
    return (
        <SectionContainer id="how-it-works" className="bg-white/[0.015] border-y border-white/5">
            <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">How it works</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    One deterministic pipeline.
                    <br />
                    <span className="text-white/55">Four stages, zero guesswork.</span>
                </h2>
            </div>

            <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Connector line on lg */}
                <div className="hidden lg:block absolute top-12 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-cyber-accent/40 to-transparent" />

                {STEPS.map((s, i) => (
                    <motion.div
                        key={s.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="relative"
                    >
                        <div className="rounded-2xl border border-white/10 bg-cyber-bg/60 backdrop-blur-sm p-6 h-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-cyber-accent/10 ring-1 ring-cyber-accent/40 flex items-center justify-center">
                                    <s.icon className="h-5 w-5 text-cyber-accent" />
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.label}</span>
                            </div>
                            <h3 className="text-white font-display font-semibold text-lg mb-2">{s.title}</h3>
                            <p className="text-white/65 text-sm leading-relaxed">{s.text}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </SectionContainer>
    );
}
