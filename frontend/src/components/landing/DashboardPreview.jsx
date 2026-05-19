import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertOctagon, Cpu } from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const CALLOUTS = [
    { icon: AlertOctagon, label: 'Prioritized alerts', text: '1000 raw logs → 5 actions' },
    { icon: TrendingUp,   label: 'Real-time risk',     text: 'Score updates as scans finish' },
    { icon: Cpu,          label: 'AI advisor',         text: 'Plain-language remediation' },
];

export default function DashboardPreview() {
    return (
        <SectionContainer>
            <div className="text-center max-w-2xl mx-auto mb-12">
                <p className="text-xs uppercase tracking-[0.2em] text-cyber-accent/80 mb-3">The dashboard</p>
                <h2 className="font-display text-white text-3xl md:text-4xl font-bold leading-tight">
                    One screen. The whole picture.
                </h2>
                <p className="mt-4 text-white/65 leading-relaxed">
                    A purpose-built command center — designed for the analyst on call at 2am.
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-10 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="lg:col-span-8 relative"
                >
                    <div className="relative rounded-2xl border border-white/10 bg-cyber-bg/70 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
                        {/* Window chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                        </div>

                        <div className="grid grid-cols-12 min-h-[360px]">
                            {/* Sidebar */}
                            <aside className="col-span-3 border-r border-white/5 p-4 space-y-2">
                                {['Overview', 'Assets', 'Findings', 'SIEM', 'Settings'].map((n, i) => (
                                    <div
                                        key={n}
                                        className={`text-xs px-3 py-2 rounded-lg ${
                                            i === 0
                                                ? 'bg-cyber-accent/10 text-cyber-accent ring-1 ring-cyber-accent/30'
                                                : 'text-white/55'
                                        }`}
                                    >
                                        {n}
                                    </div>
                                ))}
                            </aside>

                            {/* Main */}
                            <div className="col-span-9 p-5 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Risk', val: '72', color: 'text-cyber-medium' },
                                        { label: 'CVEs', val: '14', color: 'text-cyber-critical' },
                                        { label: 'Assets scanned', val: '38/38', color: 'text-cyber-accent' },
                                    ].map((s) => (
                                        <div key={s.label} className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</div>
                                            <div className={`text-xl font-display font-bold ${s.color}`}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg bg-white/[0.02] ring-1 ring-white/5 p-3 h-28 flex items-end gap-1.5">
                                    {[30, 50, 35, 65, 45, 75, 55, 85, 65, 50, 80, 62, 90, 70].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ height: 0 }}
                                            whileInView={{ height: `${h}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.6, delay: 0.1 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                                            className="flex-1 rounded-sm bg-gradient-to-t from-cyber-accent/40 to-cyber-accent/80"
                                        />
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { sev: 'CRITICAL', text: 'EternalBlue SMB — 10.0.0.14', color: 'bg-cyber-critical/15 text-cyber-critical ring-cyber-critical/30' },
                                        { sev: 'HIGH',     text: 'Apache 2.4.49 RCE — web-01',  color: 'bg-cyber-critical/10 text-cyber-critical ring-cyber-critical/20' },
                                        { sev: 'MEDIUM',   text: 'Outdated nginx 1.18 — web-03', color: 'bg-cyber-medium/15 text-cyber-medium ring-cyber-medium/30' },
                                    ].map((a, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-md bg-white/[0.025] ring-1 ring-white/5 px-3 py-2">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ring-1 ${a.color}`}>{a.sev}</span>
                                            <span className="text-xs text-white/75 font-mono truncate">{a.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pointer-events-none absolute -inset-px rounded-2xl"
                             style={{ boxShadow: '0 0 80px -10px rgba(0,255,255,0.2)' }} />
                    </div>
                </motion.div>

                <div className="lg:col-span-4 space-y-4">
                    {CALLOUTS.map((c, i) => (
                        <motion.div
                            key={c.label}
                            initial={{ opacity: 0, x: 16 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.45, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-cyber-accent/10 ring-1 ring-cyber-accent/30 flex items-center justify-center shrink-0">
                                    <c.icon className="h-4 w-4 text-cyber-accent" />
                                </div>
                                <div>
                                    <div className="text-white font-display font-semibold">{c.label}</div>
                                    <div className="text-white/60 text-sm mt-1">{c.text}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionContainer>
    );
}
