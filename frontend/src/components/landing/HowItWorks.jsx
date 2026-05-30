import React from 'react';
import { motion } from 'framer-motion';
import {
    Radar, Crosshair, ScanLine, BrainCircuit,
    ShieldCheck, Bug, Clock, AlertTriangle, Monitor, Sparkles,
} from 'lucide-react';
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

            {/* ── Live dashboard snapshot ─────────────────────────────────
                Mirrors the real Security Ops view so visitors can see what
                the pipeline output actually looks like, including the
                FAIL-state engine indicator from the analyst dashboard.
            ──────────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-14 relative rounded-2xl border border-white/10 bg-cyber-bg/80 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] overflow-hidden"
            >
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                    <span className="ml-auto text-[10px] text-white/40 font-mono">https://localhost / dashboard / overview</span>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <h3 className="text-white text-xl md:text-2xl font-display font-black uppercase tracking-tight">
                                Security <span className="text-cyber-accent">Ops</span>
                            </h3>
                            <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.3em] text-white/35">
                                Node // Real-time
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-cyber-success bg-cyber-success/10 ring-1 ring-cyber-success/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyber-success animate-pulse" />
                            System OK
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {PREVIEW_KPIS.map((k, i) => (
                            <motion.div
                                key={k.label}
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: 0.05 + i * 0.05 }}
                                className="rounded-xl bg-white/[0.025] ring-1 ring-white/5 p-3.5 min-w-0"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40 truncate">{k.label}</span>
                                    <k.icon className={`h-3.5 w-3.5 ${k.color} shrink-0`} />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-display font-black leading-none ${k.color}`}>{k.value}</span>
                                    <span className="text-[8px] text-white/40 uppercase tracking-widest truncate">{k.sub}</span>
                                </div>
                                <div className="mt-2 h-0.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${k.bar}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.04 }}
                                        className={`h-full rounded-full ${k.barClass}`}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <p className="mt-5 text-center text-[10px] uppercase tracking-[0.25em] text-white/35">
                        A snapshot of the live Security Ops dashboard
                    </p>
                </div>

                <div className="pointer-events-none absolute -inset-px rounded-2xl"
                     style={{ boxShadow: '0 0 80px -10px rgba(0,255,255,0.18)' }} />
            </motion.div>
        </SectionContainer>
    );
}

// KPI tiles mirrored from the real <StatCards /> component so the marketing
// preview never drifts away from what users see after login.
const PREVIEW_KPIS = [
    { label: 'Security Health', value: '18',   sub: '/100',         icon: ShieldCheck,    color: 'text-cyber-medium',  bar: 18,  barClass: 'bg-cyber-medium' },
    { label: 'Vulnerabilities', value: '19',   sub: 'Found',        icon: Bug,            color: 'text-cyber-critical',bar: 100, barClass: 'bg-cyber-critical' },
    { label: 'In Progress',     value: '1',    sub: 'Being Fixed',  icon: Clock,          color: 'text-cyber-accent',  bar: 25,  barClass: 'bg-cyber-accent' },
    { label: 'SLA Overdue',     value: '19',   sub: 'Needs Action', icon: AlertTriangle,  color: 'text-cyber-medium',  bar: 100, barClass: 'bg-cyber-medium' },
    { label: 'Assets',          value: '18',   sub: 'Hosts',        icon: Monitor,        color: 'text-cyber-accent',  bar: 60,  barClass: 'bg-cyber-accent' },
    { label: 'Status',          value: 'OK',   sub: 'System',       icon: Sparkles,       color: 'text-cyber-success', bar: 100, barClass: 'bg-cyber-success' },
];
