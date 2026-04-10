import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import LiveConsole from '../components/dashboard/LiveConsole';
import { Search, Zap, X } from 'lucide-react';
import api from '../services/api';

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
const TopBar = ({ onQuickScan, isScanning }) => {
    const [health, setHealth] = useState({ api: true, redis: true, workers: true });
    const [search, setSearch] = useState('');

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

    // Global keyboard shortcut: ⌘K / Ctrl+K focuses search
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('universal-search')?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="h-12 border-b border-white/5 bg-black/30 backdrop-blur-xl px-5 flex items-center gap-4 shrink-0 relative z-10">
            {/* Universal search */}
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-cyan-400/40 transition-all">
                <Search className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <input
                    id="universal-search"
                    type="text"
                    placeholder="Search IPs, assets, CVEs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none placeholder:text-gray-600 w-full font-mono"
                />
                {search ? (
                    <button onClick={() => setSearch('')} className="text-gray-600 hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                    </button>
                ) : (
                    <span className="text-[9px] text-gray-700 font-mono border border-white/10 rounded px-1 shrink-0">
                        ⌘K
                    </span>
                )}
            </div>

            {/* Health pills */}
            <div className="hidden md:flex items-center gap-2">
                <HealthPill label="API"     healthy={health.api} />
                <HealthPill label="Redis"   healthy={health.redis} />
                <HealthPill label="Workers" healthy={health.workers} />
            </div>

            <div className="flex-1" />

            {/* Quick scan button */}
            <button
                id="quick-scan-btn"
                onClick={onQuickScan}
                disabled={isScanning}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                    isScanning
                        ? 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 cursor-not-allowed'
                        : 'bg-cyan-400 text-gray-900 hover:bg-sky-300 shadow-[0_0_12px_rgba(0,255,255,0.3)] hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]'
                }`}
            >
                <Zap className="h-3.5 w-3.5" />
                {isScanning ? 'Scanning...' : 'Quick Scan'}
            </button>
        </div>
    );
};

// ── Main layout ───────────────────────────────────────────────────────────────
const Layout = ({ children, activeTab, onTabChange, onQuickScan, isScanning }) => (
    <div className="min-h-screen bg-cyber-dark text-gray-100 font-sans selection:bg-cyan-400 selection:text-gray-900 flex flex-row overflow-hidden">
        {/* Ambient background glows */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
            <div className="absolute top-[40%] left-[35%] w-[30%] h-[30%] bg-green-500/4 blur-[100px] rounded-full" />
            <div className="absolute inset-0 grid-bg opacity-60" />
        </div>

        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

        <div className="flex-1 flex flex-col h-screen relative z-10 w-full min-w-0">
            <TopBar onQuickScan={onQuickScan} isScanning={isScanning} />
            <main className="flex-1 px-8 py-6 pb-20 overflow-y-auto custom-scrollbar w-full">
                {children}
            </main>
        </div>

        <LiveConsole />
    </div>
);

export default Layout;
