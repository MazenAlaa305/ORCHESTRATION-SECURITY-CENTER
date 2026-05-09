import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import LiveConsole from '../components/dashboard/LiveConsole';
import ShortcutCheatsheet from '../components/ShortcutCheatsheet';
import QuickScanPopover from '../components/QuickScanPopover';
import CommandPalette from '../components/CommandPalette';
import NotificationsBell from '../components/NotificationsBell';
import { useEnvStore } from '../stores/envStore';
import { Search } from 'lucide-react';
import api from '../services/api';
import useGlobalShortcuts from '../hooks/useGlobalShortcuts';

// ── Environment switcher ──────────────────────────────────────────────────────
const ENVS = [
    { id: 'all',        label: 'All'  },
    { id: 'lab',        label: 'Lab'  },
    { id: 'production', label: 'Prod' },
];

const EnvSwitcher = () => {
    const { activeEnv, setActiveEnv } = useEnvStore();
    return (
        <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
            title="Scope filter — restricts Targets view by environment"
        >
            {ENVS.map(e => (
                <button
                    key={e.id}
                    onClick={() => setActiveEnv(e.id)}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                        activeEnv === e.id
                            ? 'text-cyan-300'
                            : 'text-gray-600 hover:text-gray-300'
                    }`}
                    style={activeEnv === e.id ? {
                        background: 'rgba(0,255,255,0.1)',
                        border: '1px solid rgba(0,255,255,0.2)',
                    } : undefined}
                >
                    {e.label}
                </button>
            ))}
        </div>
    );
};

// ── Health pill ───────────────────────────────────────────────────────────────
const HealthPill = ({ label, healthy }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
        healthy
            ? 'bg-green-500/10 border-green-500/25 text-green-400'
            : 'bg-red-500/10  border-red-500/25  text-red-400'
    }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${healthy ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
        {label}
    </div>
);

// ── Top command bar ───────────────────────────────────────────────────────────
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');

const TopBar = ({ onQuickScan, isScanning }) => {
    const [health, setHealth] = useState({ api: true, redis: true, workers: true });

    const checkHealth = useCallback(async () => {
        try {
            const { data } = await api.get('/health', { baseURL: '' });  // hits /health directly
            setHealth({
                api:     data.api     ?? true,
                redis:   data.redis   ?? false,
                workers: data.workers ?? false,
            });
        } catch {
            setHealth({ api: false, redis: false, workers: false });
        }
    }, []);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30_000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    const openPalette = () => window.dispatchEvent(new CustomEvent('dashboard:open-palette'));

    return (
        <div className="h-12 border-b border-white/5 px-5 flex items-center gap-4 shrink-0 relative z-10" style={{ background: 'rgb(8, 16, 24)' }}>
            {/* Command palette trigger — opens the real ⌘K palette */}
            <button
                type="button"
                onClick={openPalette}
                className="flex items-center gap-2 flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 hover:border-cyan-400/40 transition-all text-left"
                title="Open command palette"
            >
                <Search className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-xs text-gray-500 font-mono flex-1 truncate">
                    Search or jump to…
                </span>
                <span className="text-[9px] text-gray-500 font-mono border border-white/10 rounded px-1 shrink-0">
                    {isMac ? '⌘' : 'Ctrl'} K
                </span>
            </button>

            {/* Health pills */}
            <div className="hidden md:flex items-center gap-2">
                <HealthPill label="API"     healthy={health.api} />
                <HealthPill label="Redis"   healthy={health.redis} />
                <HealthPill label="Workers" healthy={health.workers} />
            </div>

            {/* Environment scope switcher */}
            <div className="hidden md:block">
                <EnvSwitcher />
            </div>

            <div className="flex-1" />

            {/* Notifications bell */}
            <NotificationsBell />

            {/* Quick scan — confirmation popover, runs scan on Run, opens full config on Configure */}
            <QuickScanPopover isScanning={isScanning} onScanStarted={onQuickScan} />
        </div>
    );
};

// ── Main layout ───────────────────────────────────────────────────────────────
const Layout = ({ children, activeTab, onTabChange, onQuickScan, isScanning }) => {
    useGlobalShortcuts();
    return (
    <div className="min-h-screen bg-cyber-dark text-gray-100 font-sans selection:bg-cyan-400 selection:text-gray-900 flex flex-row overflow-hidden">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {/* Ambient background glows — BlurAdmin teal/turquoise palette */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] bg-[#4dbdb1]/15 blur-[140px] rounded-full" />
            <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#1a4566]/30 blur-[140px] rounded-full" />
            <div className="absolute top-[35%] left-[40%] w-[35%] h-[35%] bg-[#3a7a8c]/8 blur-[120px] rounded-full" />
            <div className="absolute inset-0 grid-bg opacity-25" />
        </div>

        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

        <div className="flex-1 flex flex-col h-screen relative z-10 w-full min-w-0">
            <TopBar onQuickScan={onQuickScan} isScanning={isScanning} />
            <main id="main-content" className="flex-1 px-8 py-6 pb-20 overflow-y-auto custom-scrollbar w-full">
                {children}
            </main>
        </div>

        <LiveConsole />
        <ShortcutCheatsheet />
        <CommandPalette />
    </div>
    );
};

export default Layout;
