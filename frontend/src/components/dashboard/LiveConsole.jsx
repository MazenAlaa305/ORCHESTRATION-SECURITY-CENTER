import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TerminalSquare, X, Minimize2, Maximize2, Trash2, ChevronsDown, Copy, Check } from 'lucide-react';

const LOG_COLORS = {
    critical: 'text-red-400',
    high:     'text-orange-400',
    medium:   'text-yellow-400',
    info:     'text-cyan-400',
    success:  'text-green-400',
    warning:  'text-amber-400',
    error:    'text-red-500',
    default:  'text-gray-400',
};

const getLogClass = (line) => {
    const l = line.toLowerCase();
    if (l.includes('critical') || l.includes('exploit')) return LOG_COLORS.critical;
    if (l.includes('high') || l.includes('vuln')) return LOG_COLORS.high;
    if (l.includes('warn') || l.includes('medium')) return LOG_COLORS.medium;
    if (l.includes('success') || l.includes('complete') || l.includes('done')) return LOG_COLORS.success;
    if (l.includes('info') || l.includes('[recon]') || l.includes('[attack]')) return LOG_COLORS.info;
    if (l.includes('error') || l.includes('fail')) return LOG_COLORS.error;
    return LOG_COLORS.default;
};

const DEMO_LOGS = [
    '[00:00:01] [SYSTEM] OSC Core Node initialized.',
    '[00:00:02] [RECON] Starting Nmap scan on target...',
    '[00:00:05] [RECON] Discovered 3 open ports: 22, 80, 443',
    '[00:00:08] [ATTACK] Nuclei template chain loaded: CVE-2024-xxxx group',
    '[00:00:12] [ATTACK] HIGH - SQL Injection detected at /api/login',
    '[00:00:15] [VALIDATE] Running AI validation on finding #1...',
    '[00:00:18] [SUCCESS] Confidence score: 94% — marking as confirmed',
    '[00:00:20] [REPORT] Gemini AI advisory generated for CVE-2024-xxxx',
    '[00:00:22] [SYSTEM] Scan cycle complete. 2 vulnerabilities confirmed.',
];

/**
 * LiveConsole
 * A retractable bottom-drawer terminal for real-time agent/Celery log streaming.
 */
const LiveConsole = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [logs, setLogs] = useState(DEMO_LOGS);
    const [autoScroll, setAutoScroll] = useState(true);
    const [copied, setCopied] = useState(false);
    const logsEndRef = useRef(null);
    const wsRef = useRef(null);

    // Attempt WebSocket connection; fall back to demo logs if unavailable
    useEffect(() => {
        if (!isOpen) return;

        const apiBase = (import.meta.env.VITE_API_URL || 'https://localhost/api/v1').replace('http', 'ws').replace('/api/v1', '');
        try {
            const ws = new WebSocket(`${apiBase}/ws/logs`);
            wsRef.current = ws;

            ws.onmessage = (e) => {
                const message = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
                setLogs(prev => [...prev.slice(-499), `[${new Date().toLocaleTimeString([], { hour12: false })}] ${message}`]);
            };

            ws.onerror = () => {
                // Silently use demo logs if WebSocket fails
                ws.close();
            };

            return () => ws.close();
        } catch {
            // WebSocket not supported or connection refused — demo mode
        }
    }, [isOpen]);

    useEffect(() => {
        if (autoScroll && logsEndRef.current && isOpen) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll, isOpen]);

    const clearLogs = useCallback(() => setLogs([]), []);

    const copyLogs = useCallback(() => {
        navigator.clipboard.writeText(logs.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [logs]);

    const drawerHeight = isMaximized ? 'h-[70vh]' : 'h-[280px]';

    return (
        <>
            {/* Toggle Button — always visible at bottom right */}
            <AnimatePresence>
            {!isOpen && (
                <motion.button
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-0 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-black/90 border border-cyber-accent/30 text-cyber-accent text-[10px] font-black uppercase tracking-widest rounded-t-xl hover:bg-cyber-accent/10 hover:border-cyber-accent/60 transition-colors group backdrop-blur-xl shadow-neon"
                    id="live-console-toggle"
                >
                    <TerminalSquare className="h-3.5 w-3.5" />
                    <span>Live Console</span>
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyber-success" />
                    </span>
                </motion.button>
            )}
            </AnimatePresence>

            {/* Drawer Panel */}
            <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                    className={`fixed bottom-0 left-0 right-0 z-50 ${drawerHeight} flex flex-col bg-black/95 backdrop-blur-xl border-t border-cyber-accent/20 shadow-[0_-10px_60px_rgba(0,0,0,0.8)]`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                    {/* Console Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            {/* macOS-style traffic lights */}
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer" onClick={() => setIsOpen(false)} title="Close" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer" onClick={() => setIsOpen(false)} title="Minimize" />
                                <div className="h-3 w-3 rounded-full bg-green-500/80 hover:bg-green-400 cursor-pointer" onClick={() => setIsMaximized(!isMaximized)} title="Maximize" />
                            </div>
                            <TerminalSquare className="h-3.5 w-3.5 text-cyber-accent" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Console</span>
                            <span className="text-[9px] font-mono text-gray-600">— Celery Worker Stream</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Auto-scroll toggle */}
                            <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none">
                                <input
                                    type="checkbox"
                                    checked={autoScroll}
                                    onChange={e => setAutoScroll(e.target.checked)}
                                    className="w-3 h-3 accent-cyan-400"
                                />
                                Auto-scroll
                            </label>
                            {/* Copy */}
                            <button onClick={copyLogs} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Copy all logs">
                                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            {/* Clear */}
                            <button onClick={clearLogs} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Clear console">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {/* Maximize */}
                            <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title={isMaximized ? 'Restore' : 'Maximize'}>
                                {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            {/* Close */}
                            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors" title="Close">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Log Output */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-0.5 relative" id="console-output">
                        {/* Scanning line effect */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-cyber-neon/20 shadow-[0_0_8px_rgba(34,211,238,0.4)] animate-scan-line pointer-events-none" />

                        {logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-2">
                                <TerminalSquare className="h-8 w-8" />
                                <span className="text-[10px] uppercase tracking-widest">Console cleared</span>
                            </div>
                        )}

                        {logs.map((line, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className={`text-[11px] leading-6 ${getLogClass(line)}`}
                            >
                                <span className="text-gray-700 select-none mr-2">{String(i + 1).padStart(3, ' ')} │</span>
                                <span>{line}</span>
                            </motion.div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Status Bar */}
                    <div className="px-4 py-1 bg-black/60 border-t border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 text-[9px] font-mono text-gray-600">
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyber-success inline-block animate-pulse" />
                                STREAM ACTIVE
                            </span>
                            <span>{logs.length} lines</span>
                        </div>
                        <button
                            onClick={() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-[9px] font-mono text-gray-600 hover:text-cyber-accent flex items-center gap-1 transition-colors"
                        >
                            <ChevronsDown className="h-3 w-3" />Scroll to bottom
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

export default LiveConsole;
