import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import LiveConsole from '../components/dashboard/LiveConsole';
import { Search, Zap, Wifi, Database, Cpu, X } from 'lucide-react';
import api from '../services/api';

/**
 * SystemHealthPill - shows API/Redis/Celery health status
 */
const HealthPill = ({ label, healthy }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
        healthy
            ? 'bg-cyber-success/10 border-cyber-success/25 text-cyber-success'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
    }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${healthy ? 'bg-cyber-success animate-pulse' : 'bg-red-400'}`} />
        {label}
    </div>
);

const TopBar = ({ onQuickScan, isScanning }) => {
    const [health, setHealth] = useState({ api: true, redis: true, celery: true });
    const [search, setSearch] = useState('');

    useEffect(() => {
        const check = async () => {
            try {
                await api.get('/health');
                setHealth({ api: true, redis: true, celery: true });
            } catch {
                setHealth(h => ({ ...h, api: false }));
            }
        };
        check();
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-12 border-b border-white/5 bg-black/30 backdrop-blur-xl px-5 flex items-center gap-4 shrink-0 relative z-10">
            {/* Universal Search */}
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-cyber-accent/40 transition-all">
                <Search className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <input
                    id="universal-search"
                    type="text"
                    placeholder="Search IPs, assets, CVEs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none placeholder:text-gray-600 w-full font-mono"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="text-gray-600 hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                    </button>
                )}
                <span className="text-[9px] text-gray-700 font-mono border border-white/10 rounded px-1 shrink-0">⌘K</span>
            </div>

            {/* Health Pills */}
            <div className="hidden md:flex items-center gap-2">
                <HealthPill label="API" healthy={health.api} />
                <HealthPill label="Redis" healthy={health.redis} />
                <HealthPill label="Workers" healthy={health.celery} />
            </div>

            <div className="flex-1" />

            {/* Quick Scan Button */}
            <button
                id="quick-scan-btn"
                onClick={onQuickScan}
                disabled={isScanning}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                    isScanning
                        ? 'bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent cursor-not-allowed'
                        : 'bg-cyber-accent text-gray-900 hover:bg-cyber-neon hover:shadow-neon active:scale-95'
                }`}
            >
                <Zap className="h-3.5 w-3.5" />
                {isScanning ? 'Scanning...' : 'Quick Scan'}
            </button>
        </div>
    );
};

const Layout = ({ children, activeTab, onTabChange, onQuickScan, isScanning }) => {
    return (
        <div className="min-h-screen bg-cyber-dark text-gray-100 font-sans selection:bg-cyber-accent selection:text-gray-900 transition-colors duration-500 flex flex-row overflow-hidden">
            {/* Background Glow Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-vibrant/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 blur-[120px] rounded-full" />
                <div className="absolute top-[40%] left-[35%] w-[30%] h-[30%] bg-cyber-neon/4 blur-[100px] rounded-full" />
                {/* SOC Grid Pattern */}
                <div className="absolute inset-0 grid-bg opacity-60" />
            </div>

            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen relative z-10 w-full min-w-0">
                {/* Top Command Bar */}
                <TopBar onQuickScan={onQuickScan} isScanning={isScanning} />

                <main className="flex-1 px-8 py-6 pb-20 overflow-y-auto custom-scrollbar w-full">
                    {children}
                </main>
            </div>

            {/* Global Live Console — fixed bottom drawer */}
            <LiveConsole />
        </div>
    );
};

export default Layout;
