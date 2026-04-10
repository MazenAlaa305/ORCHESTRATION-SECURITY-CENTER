import { useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Terminal, Brain, Shield, AlertTriangle, Bug, Info, CheckCircle } from 'lucide-react';

// ── Log level / agent colour map ─────────────────────────────────────────────
const AGENT_META = {
    recon:    { icon: <Shield    className="h-3 w-3" />, color: '#00ffff' },
    attack:   { icon: <AlertTriangle className="h-3 w-3" />, color: '#ff6a00' },
    validate: { icon: <Brain     className="h-3 w-3" />, color: '#a78bfa' },
    report:   { icon: <CheckCircle  className="h-3 w-3" />, color: '#00ff88' },
    vuln:     { icon: <Bug       className="h-3 w-3" />, color: '#ff0055' },
    system:   { icon: <Info      className="h-3 w-3" />, color: '#4b5563' },
};

const LEVEL_COLORS = {
    error: '#ff0055',
    warn:  '#ffaa00',
    info:  '#00ffff',
    debug: '#4b5563',
};

function resolveAgent(msg = '') {
    const m = msg.toUpperCase();
    if (m.includes('RECON'))                        return 'recon';
    if (m.includes('ATTACK') || m.includes('PAYLOAD')) return 'attack';
    if (m.includes('VALIDATE') || m.includes('VALIDAT')) return 'validate';
    if (m.includes('REPORT') || m.includes('ADVISORY'))  return 'report';
    if (m.includes('VULN') || m.includes('CVE'))    return 'vuln';
    return 'system';
}

function resolveLevel(msg = '') {
    const m = msg.toUpperCase();
    if (m.includes('ERROR') || m.includes('FAIL'))  return 'error';
    if (m.includes('WARN'))                          return 'warn';
    if (m.includes('DEBUG'))                         return 'debug';
    return 'info';
}

// ── Virtual list row ──────────────────────────────────────────────────────────
const LogRow = ({ index, style, data }) => {
    const log   = data[index];
    const msg   = log.message || String(log);
    const agent = log.agent || resolveAgent(msg);
    const level = log.level || resolveLevel(msg);
    const meta  = AGENT_META[agent] || AGENT_META.system;
    const color = LEVEL_COLORS[level] || LEVEL_COLORS.info;

    const time = log.timestamp
        ? new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    return (
        <div
            style={style}
            className="px-3 py-1.5 flex items-start gap-2.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
        >
            <div className="mt-0.5 flex-shrink-0" style={{ color: meta.color }}>
                {meta.icon}
            </div>
            <div className="flex-grow min-w-0 flex items-baseline gap-2">
                {time && (
                    <span className="text-[9px] font-mono flex-shrink-0" style={{ color: '#374151' }}>
                        {time}
                    </span>
                )}
                <span
                    className="text-[10px] font-mono break-all leading-relaxed"
                    style={{ color: level === 'info' ? '#9ca3af' : color }}
                >
                    {msg}
                </span>
            </div>
        </div>
    );
};

// ── Component ─────────────────────────────────────────────────────────────────
const OrchestrationFeed = ({ logs = [] }) => {
    const containerRef = useRef(null);
    const [listHeight, setListHeight] = useState(300);

    // Dynamic height — fills whatever space the parent gives
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                // Reserve ~52px for the header bar
                setListHeight(Math.max(entry.contentRect.height - 52, 80));
            }
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="glass-card flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    Orchestration Log
                </h3>
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">
                    Live // {logs.length} Events
                </span>
            </div>

            {/* Virtual list */}
            <div className="flex-grow overflow-hidden">
                {logs.length > 0 ? (
                    <List
                        height={listHeight}
                        itemCount={logs.length}
                        itemSize={42}
                        width="100%"
                        itemData={logs}
                        overscanCount={5}
                    >
                        {LogRow}
                    </List>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-25">
                        <Terminal className="h-7 w-7 mb-3 text-gray-600" />
                        <p className="text-[9px] uppercase font-black tracking-widest">
                            Waiting for events...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrchestrationFeed;
