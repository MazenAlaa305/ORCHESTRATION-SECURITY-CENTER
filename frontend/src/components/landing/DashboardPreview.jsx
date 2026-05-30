import React from 'react';
import { motion } from 'framer-motion';
import {
    ShieldCheck, Home, LayoutDashboard, Activity, Scan, Brain, FileText, Users, Settings,
    Search, Bell, Zap, Bug, Clock, AlertTriangle, Monitor, Sparkles,
    TrendingUp, AlertOctagon, Cpu, Terminal,
} from 'lucide-react';
import SectionContainer from './shared/SectionContainer';

const CALLOUTS = [
    { icon: AlertOctagon, label: 'Prioritized alerts', text: '1,000 raw logs → 5 actions' },
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

            {/* Full-width mock */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl border border-white/10 bg-cyber-bg/80 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] overflow-hidden"
            >
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                    <span className="ml-auto text-[10px] text-white/40 font-mono">https://localhost / dashboard / overview</span>
                </div>

                <div className="grid grid-cols-12 min-h-[560px]">
                    <MockSidebar />
                    <div className="col-span-10 flex flex-col">
                        <MockTopBar />
                        <MockKPIs />
                        <MockTabs />
                        <div className="flex-1 grid grid-cols-12 gap-3 p-3">
                            <div className="col-span-4"><MockHealth /></div>
                            <div className="col-span-5 space-y-3">
                                <MockSeverity />
                                <MockQuickScan />
                            </div>
                            <div className="col-span-3 space-y-3">
                                <MockOrchestrationLog />
                                <MockActionQueue />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Outer glow */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl"
                     style={{ boxShadow: '0 0 80px -10px rgba(0,255,255,0.18)' }} />
            </motion.div>

            {/* Callouts row */}
            <div className="mt-8 grid md:grid-cols-3 gap-4">
                {CALLOUTS.map((c, i) => (
                    <motion.div
                        key={c.label}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                        className="rounded-xl border border-white/10 bg-white/[0.025] p-5 flex items-start gap-3"
                    >
                        <div className="h-9 w-9 rounded-lg bg-cyber-accent/10 ring-1 ring-cyber-accent/30 flex items-center justify-center shrink-0">
                            <c.icon className="h-4 w-4 text-cyber-accent" />
                        </div>
                        <div>
                            <div className="text-white font-display font-semibold">{c.label}</div>
                            <div className="text-white/60 text-sm mt-1">{c.text}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </SectionContainer>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
    {
        label: 'Security',
        items: [
            { icon: LayoutDashboard, label: 'Command Center', active: true },
            { icon: Activity,        label: 'Threat Center',  badge: 19 },
        ],
    },
    {
        label: 'Operations',
        items: [
            { icon: Scan,  label: 'Scanner' },
            { icon: Brain, label: 'AI Brain' },
        ],
    },
    {
        label: 'System',
        items: [
            { icon: FileText, label: 'Reports' },
            { icon: Users,    label: 'Users' },
            { icon: Settings, label: 'Settings' },
        ],
    },
];

function MockSidebar() {
    return (
        <aside className="col-span-2 border-r border-white/5 bg-[rgba(10,24,32,0.6)] flex flex-col">
            {/* Logo */}
            <div className="h-10 px-3 flex items-center gap-2 border-b border-white/5">
                <div className="h-5 w-5 rounded bg-cyber-accent/10 ring-1 ring-cyber-accent/40 flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-cyber-accent" />
                </div>
                <span className="font-display text-[10px] text-cyber-accent font-black tracking-wider">OSC</span>
            </div>

            {/* Home */}
            <div className="px-2 pt-3 pb-2 border-b border-white/5">
                <SidebarItem icon={Home} label="Home" />
            </div>

            {/* Sections */}
            <div className="flex-1 px-2 py-3 space-y-3 overflow-hidden">
                {SIDEBAR_SECTIONS.map((sec) => (
                    <div key={sec.label}>
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/25 px-1 mb-1.5">
                            {sec.label}
                        </p>
                        {sec.items.map((it) => (
                            <SidebarItem key={it.label} {...it} />
                        ))}
                    </div>
                ))}
            </div>

            {/* User + status */}
            <div className="px-3 py-2.5 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-cyber-accent/15 ring-1 ring-cyber-accent/30 flex items-center justify-center text-[8px] font-black text-cyber-accent">A</div>
                    <div className="min-w-0">
                        <div className="text-[8px] font-bold text-white truncate">Admin Cat</div>
                        <div className="text-[6px] text-white/40 uppercase tracking-widest">admin</div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-success animate-pulse" />
                    <span className="text-[7px] font-bold uppercase tracking-widest text-cyber-success">Live</span>
                </div>
            </div>
        </aside>
    );
}

function SidebarItem({ icon: Icon, label, active, badge }) {
    return (
        <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] mb-0.5 ${
                active
                    ? 'bg-cyber-accent/10 ring-1 ring-cyber-accent/30 text-cyber-accent'
                    : 'text-white/55'
            }`}
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">{label}</span>
            {badge ? (
                <span className="text-[7px] font-black px-1 py-px rounded bg-cyber-critical/15 ring-1 ring-cyber-critical/30 text-cyber-critical">
                    {badge}
                </span>
            ) : null}
        </div>
    );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function MockTopBar() {
    return (
        <div className="h-11 border-b border-white/5 bg-white/[0.015] flex items-center gap-3 px-3">
            <div className="flex items-center gap-2 flex-1 max-w-xs rounded-md bg-white/[0.04] ring-1 ring-white/5 px-2 py-1">
                <Search className="h-3 w-3 text-white/35" />
                <span className="text-[10px] text-white/35">Search or jump to…</span>
                <span className="ml-auto text-[7px] font-mono text-white/30 px-1 rounded bg-white/5">⌘K</span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
                {['API', 'REDIS', 'WORKERS'].map((p) => (
                    <span key={p} className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-white/55 px-2 py-0.5 rounded-full bg-white/[0.03] ring-1 ring-white/5">
                        <span className="h-1 w-1 rounded-full bg-cyber-success animate-pulse" />
                        {p}
                    </span>
                ))}
            </div>
            <div className="hidden lg:flex items-center gap-1 rounded-md bg-white/[0.03] ring-1 ring-white/5 p-0.5">
                {['ALL', 'LAB', 'PROD'].map((t, i) => (
                    <span key={t} className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${i === 0 ? 'bg-cyber-accent/15 text-cyber-accent' : 'text-white/45'}`}>
                        {t}
                    </span>
                ))}
            </div>
            <Bell className="h-3.5 w-3.5 text-white/40 ml-auto lg:ml-0" />
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-gradient-to-r from-cyber-accent to-cyber-teal text-cyber-bg">
                <Zap className="h-3 w-3" /> Quick scan
            </span>
        </div>
    );
}

// ── KPI row ──────────────────────────────────────────────────────────────────
const KPIS = [
    { label: 'Security Health',  value: '18',   sub: '/100',          icon: ShieldCheck,    color: 'text-cyber-medium' },
    { label: 'Vulnerabilities',  value: '19',   sub: 'Found',         icon: Bug,            color: 'text-cyber-critical' },
    { label: 'In Progress',      value: '1',    sub: 'Being Fixed',   icon: Clock,          color: 'text-cyber-accent' },
    { label: 'SLA Overdue',      value: '19',   sub: 'Needs Action',  icon: AlertTriangle,  color: 'text-cyber-medium' },
    { label: 'Assets',           value: '18',   sub: 'Hosts',         icon: Monitor,        color: 'text-cyber-accent' },
    { label: 'Status',           value: 'OK',   sub: 'System',        icon: Sparkles,       color: 'text-cyber-success' },
];

function MockKPIs() {
    return (
        <div className="grid grid-cols-6 gap-2 p-3">
            {KPIS.map((k, i) => (
                <motion.div
                    key={k.label}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}
                    className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 p-2.5 min-w-0"
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[7px] font-black uppercase tracking-widest text-white/40 truncate">{k.label}</span>
                        <k.icon className={`h-3 w-3 ${k.color} shrink-0`} />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-display font-black leading-none ${k.color}`}>{k.value}</span>
                        <span className="text-[8px] text-white/40 uppercase tracking-widest truncate">{k.sub}</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ── Tab row ──────────────────────────────────────────────────────────────────
function MockTabs() {
    const tabs = ['Command Center', 'Operations', 'Threat Center', 'AI Brain', 'Reports', 'Settings', 'Users'];
    return (
        <div className="px-3 flex items-center gap-4 border-b border-white/5">
            {tabs.map((t, i) => (
                <div key={t} className={`relative py-2 text-[9px] font-bold uppercase tracking-widest ${i === 0 ? 'text-cyber-accent' : 'text-white/40'}`}>
                    {t}
                    {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 h-px bg-cyber-accent shadow-[0_0_6px_#00ffff]" />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Health score gauge ──────────────────────────────────────────────────────
function MockHealth() {
    const pct = 18;
    const r = 38;
    const c = 2 * Math.PI * r;
    return (
        <div className="rounded-lg bg-white/[0.025] ring-1 ring-white/5 p-3 h-full flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Health Score</span>
            <div className="flex-1 flex items-center justify-center">
                <div className="relative h-[110px] w-[110px]">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
                        <motion.circle
                            cx="50" cy="50" r={r}
                            stroke="url(#hgrad)" strokeWidth="8" fill="none" strokeLinecap="round"
                            initial={{ strokeDasharray: c, strokeDashoffset: c }}
                            whileInView={{ strokeDashoffset: c - (c * pct) / 100 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                        <defs>
                            <linearGradient id="hgrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#ff0055" />
                                <stop offset="100%" stopColor="#ffaa00" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-2xl font-black text-white">{pct}%</span>
                    </div>
                </div>
            </div>
            <div className="text-center text-[8px] font-black uppercase tracking-widest text-cyber-critical">Critical</div>
        </div>
    );
}

// ── Severity distribution ───────────────────────────────────────────────────
const SEVERITY = [
    { label: 'Critical', n: 6,  pct: 13, color: '#ff0055' },
    { label: 'High',     n: 8,  pct: 18, color: '#ff7700' },
    { label: 'Medium',   n: 4,  pct: 9,  color: '#ffaa00' },
    { label: 'Low',      n: 1,  pct: 2,  color: '#00ffff' },
    { label: 'Info',     n: 26, pct: 58, color: '#7a8d99' },
];

function MockSeverity() {
    return (
        <div className="rounded-lg bg-white/[0.025] ring-1 ring-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Vulnerability Severity</span>
                <span className="text-[8px] text-white/30">45 total</span>
            </div>
            <div className="space-y-1.5">
                {SEVERITY.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-[9px] text-white/55 w-12 shrink-0 uppercase tracking-wider">{s.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${s.pct}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full"
                                style={{ background: s.color }}
                            />
                        </div>
                        <span className="text-[9px] font-mono text-white/55 w-12 text-right shrink-0">{s.n} ({s.pct}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Quick scan / orchestration ──────────────────────────────────────────────
function MockQuickScan() {
    const stages = ['Queued', 'Nmap', 'Nuclei', 'Risk', 'AI'];
    return (
        <div className="rounded-lg bg-white/[0.025] ring-1 ring-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Orchestration · Quick Scan</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 rounded-md bg-white/[0.04] ring-1 ring-white/5 px-2 py-1.5 text-[10px] text-white/70 font-mono">
                    localhost
                </div>
                <span className="text-[9px] font-bold px-3 py-1.5 rounded-md bg-cyber-accent/15 ring-1 ring-cyber-accent/40 text-cyber-accent">
                    Scan
                </span>
            </div>
            <div className="flex items-center justify-between">
                {stages.map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-black ${
                            i <= 1 ? 'bg-cyber-accent/15 ring-1 ring-cyber-accent/40 text-cyber-accent' : 'bg-white/[0.03] ring-1 ring-white/5 text-white/30'
                        }`}>
                            {i + 1}
                        </div>
                        <span className="text-[7px] uppercase tracking-widest text-white/40">{s}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Orchestration log ───────────────────────────────────────────────────────
function MockOrchestrationLog() {
    return (
        <div className="rounded-lg bg-white/[0.025] ring-1 ring-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
                    <Terminal className="h-3 w-3" /> Orchestration Log
                </span>
                <span className="text-[7px] font-bold uppercase tracking-widest text-cyber-accent">Live</span>
            </div>
            <div className="font-mono text-[9px] space-y-1 h-24 overflow-hidden">
                {[
                    { c: 'text-cyber-accent',    t: '[recon]  nmap 10.0.0.0/24 ▸ 38 hosts' },
                    { c: 'text-cyber-medium',   t: '[attack] nuclei smb/* ▸ 14 templates' },
                    { c: 'text-cyber-critical', t: '[deep]   openvas web-01 ▸ CVE-2021-41773' },
                    { c: 'text-cyber-success',  t: '[score]  unified risk ▸ 72/100' },
                    { c: 'text-white/55',       t: '[ai]     advisor draft ▸ ready' },
                ].map((l, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.4 + i * 0.12 }}
                        className={l.c}
                    >
                        {l.t}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ── Action queue ────────────────────────────────────────────────────────────
function MockActionQueue() {
    const items = [
        { sev: 'HIGH', text: 'Secure Dev App on 172.18.0.3' },
        { sev: 'HIGH', text: 'Outdated nginx on web-01' },
        { sev: 'MED',  text: 'Self-signed cert on api-02' },
    ];
    return (
        <div className="rounded-lg bg-white/[0.025] ring-1 ring-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Action Queue</span>
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-cyber-critical/15 ring-1 ring-cyber-critical/30 text-cyber-critical">16 URGENT</span>
            </div>
            <div className="space-y-1.5">
                {items.map((a, i) => (
                    <div key={i} className="rounded-md bg-white/[0.02] ring-1 ring-white/5 p-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[7px] font-black px-1 py-px rounded ${a.sev === 'HIGH' ? 'bg-cyber-critical/15 text-cyber-critical ring-1 ring-cyber-critical/30' : 'bg-cyber-medium/15 text-cyber-medium ring-1 ring-cyber-medium/30'}`}>
                                {a.sev}
                            </span>
                            <span className="text-[7px] text-white/30 ml-auto">21h ago</span>
                        </div>
                        <div className="text-[9px] text-white/75 truncate">{a.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
