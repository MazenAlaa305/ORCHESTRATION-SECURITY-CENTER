import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, ShieldAlert, Activity, Zap } from 'lucide-react';
import GradientButton from './shared/GradientButton';
import { stagger, staggerItem } from '../../lib/motion';

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full opacity-[0.08]"
                     style={{ background: '#4dbdb1', filter: 'blur(140px)' }} />
                <div className="absolute bottom-[-25%] left-[-12%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
                     style={{ background: '#00ffff', filter: 'blur(140px)' }} />
            </div>
            {/* Grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
                 style={{
                     backgroundImage:
                         'linear-gradient(rgba(77,189,177,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(77,189,177,0.6) 1px, transparent 1px)',
                     backgroundSize: '48px 48px',
                     maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
                     WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
                 }} />

            <div className="relative mx-auto max-w-7xl px-6 md:px-10">
                <motion.div
                    variants={stagger(0.05, 0.08)}
                    initial="initial"
                    animate="animate"
                    className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center"
                >
                    <div className="lg:col-span-7">
                        <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-accent/10 ring-1 ring-cyber-accent/30 mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyber-accent animate-pulse" />
                            <span className="text-xs font-medium text-cyber-accent tracking-wide">
                                AI-assisted · deterministic · open-source core
                            </span>
                        </motion.div>

                        <motion.h1
                            variants={staggerItem}
                            className="font-display text-white text-4xl md:text-5xl lg:text-6xl leading-[1.05] font-bold tracking-tight"
                        >
                            See the threats your SME
                            <br />
                            has been{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-accent via-cyber-teal to-cyber-accent">
                                missing.
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={staggerItem}
                            className="mt-6 text-white/70 text-lg max-w-xl leading-relaxed"
                        >
                            Chain Nmap, Nuclei, and OpenVAS into a single deterministic pipeline.
                            Turn 1,000 raw alerts into 5 prioritized actions — without hiring a SOC.
                        </motion.p>

                        <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-4">
                            <GradientButton to="/signup" variant="primary" size="lg" icon={ArrowRight}>
                                Start free
                            </GradientButton>
                            <GradientButton href="#how-it-works" variant="secondary" size="lg" icon={PlayCircle}>
                                See how it works
                            </GradientButton>
                        </motion.div>

                        <motion.div
                            variants={staggerItem}
                            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/55"
                        >
                            <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-cyber-accent" /> Read-only AI advisor</span>
                            <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyber-accent" /> Real-time WebSocket alerts</span>
                            <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-cyber-accent" /> 4-stage scan pipeline</span>
                        </motion.div>
                    </div>

                    <motion.div
                        variants={staggerItem}
                        className="lg:col-span-5 relative"
                    >
                        <HeroMockup />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

// Decorative dashboard mockup built from divs — no image required.
function HeroMockup() {
    return (
        <div className="relative rounded-2xl border border-white/10 bg-cyber-bg/70 backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <span className="ml-auto text-[10px] text-white/40 font-mono">found-404 // core node</span>
            </div>

            <div className="p-5 space-y-4">
                {/* Stat row */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Risk Score', val: '72', color: 'text-cyber-medium' },
                        { label: 'Open CVEs',  val: '14', color: 'text-cyber-critical' },
                        { label: 'Assets',     val: '38', color: 'text-cyber-accent' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</div>
                            <div className={`text-xl font-display font-bold ${s.color}`}>{s.val}</div>
                        </div>
                    ))}
                </div>

                {/* Fake chart bars */}
                <div className="rounded-lg bg-white/[0.02] ring-1 ring-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Risk over time</div>
                    <div className="flex items-end gap-1.5 h-20">
                        {[40, 60, 45, 70, 55, 80, 65, 90, 75, 60, 85, 72].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 0.6, delay: 0.4 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                                className="flex-1 rounded-sm bg-gradient-to-t from-cyber-accent/40 to-cyber-accent/80"
                            />
                        ))}
                    </div>
                </div>

                {/* Alert rows */}
                <div className="space-y-2">
                    {[
                        { sev: 'crit', text: 'SMB EternalBlue on 10.0.0.14',  color: 'bg-cyber-critical/15 text-cyber-critical ring-cyber-critical/30' },
                        { sev: 'med',  text: 'Outdated nginx 1.18 on web-01', color: 'bg-cyber-medium/15 text-cyber-medium ring-cyber-medium/30' },
                        { sev: 'low',  text: 'Self-signed cert on api-02',    color: 'bg-cyber-accent/10 text-cyber-accent ring-cyber-accent/30' },
                    ].map((a, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + i * 0.12 }}
                            className="flex items-center gap-3 rounded-md bg-white/[0.025] ring-1 ring-white/5 px-3 py-2"
                        >
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ring-1 ${a.color}`}>{a.sev}</span>
                            <span className="text-xs text-white/75 font-mono truncate">{a.text}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Glow */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl"
                 style={{ boxShadow: '0 0 60px -10px rgba(0,255,255,0.25), inset 0 0 40px rgba(0,255,255,0.05)' }} />
        </div>
    );
}
