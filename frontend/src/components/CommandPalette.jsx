import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search, X, Zap, Settings as SettingsIcon, FileText, Brain,
    Activity, LayoutDashboard, Scan as ScanIcon, Target, Bug,
    Server, Network, History, LogOut, Keyboard, ChevronRight,
} from 'lucide-react';
import { scanService, targetService, vulnerabilityService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');

// Static Actions + Navigate items. Each item:
//   { id, label, hint?, icon, kbd?, run() }
function buildStaticItems({ logout }) {
    const navigate = (tab, sub) => () =>
        window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { tab, sub } }));

    const dispatch = (name) => () => window.dispatchEvent(new CustomEvent(name));

    return [
        // ── Actions ──────────────────────────────────────────────────────
        { id: 'a:quick-scan',  section: 'Actions', label: 'Run Quick Scan',
          hint: 'Confirm and launch the default scan profile', icon: <Zap className="h-3.5 w-3.5" />,
          keywords: 'scan run quick start launch', run: dispatch('dashboard:open-quick-scan') },
        { id: 'a:configure-scan', section: 'Actions', label: 'Configure Scan…',
          hint: 'Open the full scan configuration modal', icon: <SettingsIcon className="h-3.5 w-3.5" />,
          keywords: 'scan configure profile schedule', run: dispatch('dashboard:open-scan-config') },
        { id: 'a:generate-report', section: 'Actions', label: 'Generate Report',
          hint: 'Jump to Reports', icon: <FileText className="h-3.5 w-3.5" />,
          keywords: 'pdf export report', run: navigate('reports') },
        { id: 'a:cheatsheet', section: 'Actions', label: 'Show Keyboard Shortcuts',
          hint: 'Press ? anywhere', icon: <Keyboard className="h-3.5 w-3.5" />,
          keywords: 'keys shortcuts help', run: dispatch('dashboard:open-cheatsheet') },
        { id: 'a:logout', section: 'Actions', label: 'Sign Out',
          hint: 'End the session', icon: <LogOut className="h-3.5 w-3.5" />,
          keywords: 'logout signout exit', run: () => logout?.() },

        // ── Navigate ─────────────────────────────────────────────────────
        { id: 'n:overview',  section: 'Navigate', label: 'Command Center',
          icon: <LayoutDashboard className="h-3.5 w-3.5" />, keywords: 'home overview dashboard kpi',
          run: navigate('overview') },
        { id: 'n:ops:scanner', section: 'Navigate', label: 'Operations · Scanner',
          icon: <ScanIcon className="h-3.5 w-3.5" />, keywords: 'scan run',
          run: navigate('operations', 'scanner') },
        { id: 'n:ops:history', section: 'Navigate', label: 'Operations · Scan History',
          icon: <History className="h-3.5 w-3.5" />, keywords: 'history past scans log',
          run: navigate('operations', 'history') },
        { id: 'n:ops:targets', section: 'Navigate', label: 'Operations · Targets',
          icon: <Target className="h-3.5 w-3.5" />, keywords: 'targets nodes hosts assets',
          run: navigate('operations', 'targets') },
        { id: 'n:ops:lab', section: 'Navigate', label: 'Operations · Lab',
          icon: <Server className="h-3.5 w-3.5" />, keywords: 'lab environment sandbox',
          run: navigate('operations', 'lab') },
        { id: 'n:threats:vulns', section: 'Navigate', label: 'Threat Center · Vulnerabilities',
          icon: <Bug className="h-3.5 w-3.5" />, keywords: 'cve findings vulns',
          run: navigate('threat-center', 'vulnerabilities') },
        { id: 'n:threats:network', section: 'Navigate', label: 'Threat Center · Topology',
          icon: <Network className="h-3.5 w-3.5" />, keywords: 'network graph topology',
          run: navigate('threat-center', 'network') },
        { id: 'n:threats:siem', section: 'Navigate', label: 'Threat Center · SIEM',
          icon: <Activity className="h-3.5 w-3.5" />, keywords: 'siem alerts wazuh inbox',
          run: navigate('threat-center', 'siem') },
        { id: 'n:ai',       section: 'Navigate', label: 'AI Brain',
          icon: <Brain className="h-3.5 w-3.5" />, keywords: 'ai agent log llm',
          run: navigate('ai-brain') },
        { id: 'n:reports',  section: 'Navigate', label: 'Reports',
          icon: <FileText className="h-3.5 w-3.5" />, keywords: 'reports pdf docs',
          run: navigate('reports') },
        { id: 'n:settings', section: 'Navigate', label: 'Settings',
          icon: <SettingsIcon className="h-3.5 w-3.5" />, keywords: 'settings config preferences',
          run: navigate('settings') },
    ];
}

// Substring match across label + keywords (case-insensitive).
function matches(item, q) {
    if (!q) return true;
    const hay = `${item.label} ${item.keywords || ''} ${item.hint || ''}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every(tok => hay.includes(tok));
}

export default function CommandPalette() {
    const { logout } = useAuth() || {};
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // ── Open / close + global hotkey ────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const t = e.target;
            const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setOpen(prev => !prev);
                return;
            }
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        const openListener = () => setOpen(true);
        window.addEventListener('dashboard:open-palette', openListener);
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('dashboard:open-palette', openListener);
        };
    }, [open]);

    // Reset query + selection when (re-)opened, focus input.
    useEffect(() => {
        if (open) {
            setQ('');
            setActiveIdx(0);
            // Defer to next frame so the input exists in the DOM
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // ── Live data — only fetched when palette is open ───────────────────
    const { data: scans = [] } = useQuery({
        queryKey: ['palette:scans'],
        queryFn: () => scanService.getScans({ page: 1, page_size: 5 }).then(r => r.data?.items ?? []),
        enabled: open,
        staleTime: 15_000,
    });
    const { data: targets = [] } = useQuery({
        queryKey: ['palette:targets'],
        queryFn: () => targetService.list().then(r => r.data || []),
        enabled: open,
        staleTime: 30_000,
    });
    const { data: vulns = [] } = useQuery({
        queryKey: ['palette:vulns'],
        queryFn: () => vulnerabilityService.list({}).then(r => (r.data || []).slice(0, 10)),
        enabled: open,
        staleTime: 15_000,
    });

    const items = useMemo(() => {
        const dynamic = [
            ...scans.map(s => ({
                id: `s:${s.id}`, section: 'Recent Scans',
                label: `${s.target_url || s.id}`,
                hint: `${s.status?.toUpperCase() || ''} · ${s.scan_type || ''}`,
                icon: <ScanIcon className="h-3.5 w-3.5" />,
                keywords: `${s.id} ${s.target_url || ''} ${s.status || ''} ${s.scan_type || ''}`,
                run: () => window.dispatchEvent(new CustomEvent('dashboard:navigate',
                    { detail: { tab: 'operations', sub: 'history' } })),
            })),
            ...targets.map(t => ({
                id: `t:${t.id}`, section: 'Targets',
                label: t.name || t.base_url,
                hint: t.base_url,
                icon: <Target className="h-3.5 w-3.5" />,
                keywords: `${t.name || ''} ${t.base_url || ''}`,
                run: () => window.dispatchEvent(new CustomEvent('dashboard:navigate',
                    { detail: { tab: 'operations', sub: 'targets' } })),
            })),
            ...vulns.map(v => {
                const id = v.id ?? v.finding_id;
                return {
                    id: `v:${id}`, section: 'Findings',
                    label: v.title || v.type || `Finding ${id}`,
                    hint: `${(v.severity || 'info').toUpperCase()} · ${v.cve_id || v.url || ''}`,
                    icon: <Bug className="h-3.5 w-3.5" />,
                    keywords: `${v.title || ''} ${v.type || ''} ${v.cve_id || ''} ${v.url || ''} ${v.severity || ''}`,
                    run: () => {
                        // Navigate to the vulns tab and open the finding via the URL hash —
                        // VulnerabilitiesPanel reads #finding=<id> on hashchange.
                        window.dispatchEvent(new CustomEvent('dashboard:navigate',
                            { detail: { tab: 'threat-center', sub: 'vulnerabilities' } }));
                        if (id != null) {
                            window.location.hash = `finding=${encodeURIComponent(String(id))}`;
                        }
                    },
                };
            }),
        ];
        return [...buildStaticItems({ logout }), ...dynamic];
    }, [scans, targets, vulns, logout]);

    const filtered = useMemo(() => items.filter(it => matches(it, q)), [items, q]);
    const flatLen = filtered.length;

    // Group by section while preserving original order
    const sections = useMemo(() => {
        const map = new Map();
        filtered.forEach((it, idx) => {
            if (!map.has(it.section)) map.set(it.section, []);
            map.get(it.section).push({ ...it, _flatIdx: idx });
        });
        return Array.from(map.entries());
    }, [filtered]);

    // Clamp active index when list shrinks
    useEffect(() => {
        if (activeIdx >= flatLen) setActiveIdx(Math.max(0, flatLen - 1));
    }, [flatLen, activeIdx]);

    // Scroll active row into view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    const runItem = (item) => {
        setOpen(false);
        // Defer so the modal can unmount cleanly before the action fires
        setTimeout(() => item.run?.(), 0);
    };

    const onInputKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(flatLen - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = filtered[activeIdx];
            if (item) runItem(item);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={() => setOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(135deg, rgba(15,30,40,0.98), rgba(10,20,28,0.99))',
                    border: '1px solid rgba(0,255,255,0.2)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,255,0.05)',
                    maxHeight: '70vh',
                }}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <Search className="h-4 w-4 text-gray-500 shrink-0" />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
                        onKeyDown={onInputKey}
                        placeholder="Search actions, scans, targets, findings…"
                        className="bg-transparent flex-1 text-sm text-white outline-none placeholder:text-gray-600 font-mono"
                        aria-autocomplete="list"
                    />
                    <span className="text-[9px] text-gray-600 font-mono border border-white/10 rounded px-1.5 py-0.5 shrink-0">
                        {isMac ? '⌘' : 'Ctrl'} K
                    </span>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Results */}
                <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {flatLen === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 text-xs">
                            No matches for <span className="text-cyan-400 font-mono">"{q}"</span>
                        </div>
                    ) : (
                        sections.map(([sectionName, sectionItems]) => (
                            <div key={sectionName} className="mb-2 last:mb-0">
                                <div className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">
                                    {sectionName}
                                </div>
                                {sectionItems.map(item => {
                                    const isActive = item._flatIdx === activeIdx;
                                    return (
                                        <button
                                            key={item.id}
                                            data-idx={item._flatIdx}
                                            onMouseEnter={() => setActiveIdx(item._flatIdx)}
                                            onClick={() => runItem(item)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                                isActive ? 'bg-cyan-400/10' : 'hover:bg-white/[0.02]'
                                            }`}
                                            style={isActive ? { borderLeft: '2px solid #00ffff' } : { borderLeft: '2px solid transparent' }}
                                        >
                                            <span className={`shrink-0 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                {item.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                    {item.label}
                                                </div>
                                                {item.hint && (
                                                    <div className="text-[10px] text-gray-600 font-mono truncate">{item.hint}</div>
                                                )}
                                            </div>
                                            {isActive && <ChevronRight className="h-3.5 w-3.5 text-cyan-400/70 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 font-mono">
                    <span>{flatLen} result{flatLen === 1 ? '' : 's'}</span>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 rounded bg-white/5 border border-white/10">↑</kbd>
                            <kbd className="px-1 rounded bg-white/5 border border-white/10">↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 rounded bg-white/5 border border-white/10">↵</kbd>
                            run
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 rounded bg-white/5 border border-white/10">Esc</kbd>
                            close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
