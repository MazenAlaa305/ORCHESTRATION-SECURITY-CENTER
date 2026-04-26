import React, { useState, useEffect } from 'react';
import { scanService } from '../../services/api';
import { useRealTime } from '../../context/RealTimeContext';
import { PlayCircle, Loader2, CheckCircle, Clock, Cpu, Network, BarChart2, Brain, StopCircle, Settings2 } from 'lucide-react';
import ScanConfigModal from './ScanConfigModal';

// ── Pipeline step definitions ─────────────────────────────────────────────────
const STEPS = [
    { id: 'queued', label: 'Queued',     icon: <Clock    className="h-3 w-3" />, keywords: [] },
    { id: 'nmap',   label: 'Nmap',       icon: <Network  className="h-3 w-3" />, keywords: ['RECON', 'nmap', 'port'] },
    { id: 'nuclei', label: 'Nuclei',     icon: <Cpu      className="h-3 w-3" />, keywords: ['ATTACK', 'nuclei', 'payload', 'vuln'] },
    { id: 'risk',   label: 'Risk Eng.',  icon: <BarChart2 className="h-3 w-3" />, keywords: ['RISK', 'score', 'engine'] },
    { id: 'ai',     label: 'AI',         icon: <Brain    className="h-3 w-3" />, keywords: ['REPORT', 'advisory', 'gemini', 'analysis'] },
];

// Resolve highest matching step index from log messages
function resolveStepFromLogs(logs = []) {
    let highest = -1;
    for (const log of logs) {
        const msg = (log.message || '').toUpperCase();
        STEPS.forEach((step, i) => {
            if (step.keywords.some(kw => msg.includes(kw.toUpperCase()))) {
                if (i > highest) highest = i;
            }
        });
    }
    return highest; // -1 = none matched
}

// ── Target input validator ────────────────────────────────────────────────────
const VALID_TARGET = /^[a-zA-Z0-9.\-_:/]+$/;

const ScanButton = ({ onScanStarted, isScanning: parentIsScanning }) => {
    const { state: realTime } = useRealTime();
    const [loading,   setLoading]   = useState(false);
    const [target,    setTarget]    = useState('localhost');
    const [error,     setError]     = useState('');
    const [stepIndex, setStepIndex] = useState(-1);  // -1 = idle
    const [modalOpen, setModalOpen] = useState(false);

    const isRunning = loading || realTime.scanStatus === 'RUNNING' || parentIsScanning;

    // Advance pipeline steps based on live orchestration log messages
    useEffect(() => {
        if (!isRunning) {
            if (realTime.scanStatus === 'COMPLETED') {
                setStepIndex(STEPS.length - 1);  // all done
            }
            return;
        }
        const resolved = resolveStepFromLogs(realTime.orchestrationLog);
        if (resolved >= 0) setStepIndex(resolved);
    }, [realTime.orchestrationLog, isRunning, realTime.scanStatus]);

    // Reset pipeline when scan goes idle
    useEffect(() => {
        if (realTime.scanStatus === 'IDLE') {
            setStepIndex(-1);
            setLoading(false);
        }
    }, [realTime.scanStatus]);

    const handleScan = async () => {
        setError('');
        const trimmed = target.trim();

        if (!trimmed) { setError('Enter an IP or domain.'); return; }
        if (!VALID_TARGET.test(trimmed)) { setError('Invalid characters in target.'); return; }

        setLoading(true);
        setStepIndex(0);  // queued

        try {
            const res = await scanService.startScan(trimmed, 'quick');
            if (onScanStarted) onScanStarted(res?.data);
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message || 'Unknown error';
            setError(`Scan failed: ${detail}`);
            setStepIndex(-1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 relative overflow-hidden w-full">
            {/* Ambient glow overlay while scanning */}
            {isRunning && (
                <div className="absolute inset-0 bg-cyan-500/5 rounded-xl animate-pulse pointer-events-none" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-gray-400 text-[10px] uppercase tracking-[0.25em] font-black">Quick Scan</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalOpen(true)}
                        disabled={isRunning}
                        className="text-[9px] font-mono text-cyan-300 hover:text-cyan-200 uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
                        title="Configure tools, schedule, SIEM, and auto-report"
                    >
                        <Settings2 className="h-3 w-3" />
                        Advanced
                    </button>
                    {isRunning && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                            Running
                        </span>
                    )}
                    {realTime.scanStatus === 'COMPLETED' && !isRunning && (
                        <span className="text-[9px] font-mono text-green-400 uppercase tracking-widest">
                            ✓ Complete
                        </span>
                    )}
                </div>
            </div>

            {/* Target input + launch button */}
            <div className="flex gap-2 relative z-10 w-full">
                <input
                    type="text"
                    value={target}
                    onChange={e => { setTarget(e.target.value); setError(''); }}
                    disabled={isRunning}
                    className="min-w-0 flex-grow bg-black/40 text-white px-3 py-2 rounded-md border border-white/10
                               focus:outline-none focus:border-cyan-400/50 text-[11px] font-mono
                               placeholder-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="IP or Domain..."
                    onKeyDown={e => e.key === 'Enter' && !isRunning && handleScan()}
                />
                <button
                    onClick={handleScan}
                    disabled={isRunning}
                    id="scan-launch-btn"
                    className="shrink-0 bg-cyan-400 hover:bg-sky-400 text-gray-900 font-black px-4 py-2 rounded-md
                               flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-[0_0_12px_rgba(0,255,255,0.3)] hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]
                               text-[10px] active:scale-95"
                >
                    {isRunning
                        ? <Loader2 className="animate-spin h-3.5 w-3.5" />
                        : <PlayCircle className="h-3.5 w-3.5" />
                    }
                    {isRunning ? 'Running' : 'Scan'}
                </button>
            </div>

            {/* Validation error */}
            {error && (
                <p className="text-[9px] text-red-400 font-mono -mt-2 relative z-10">{error}</p>
            )}

            <ScanConfigModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onStarted={() => { if (onScanStarted) onScanStarted(); }}
            />

            {/* Pipeline step indicator */}
            <div className="relative z-10 flex items-center">
                {STEPS.map((step, i) => {
                    const isDone   = i < stepIndex;
                    const isActive = i === stepIndex && isRunning;
                    const isLast   = i === STEPS.length - 1;
                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                    isActive
                                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.4)]'
                                        : isDone
                                            ? 'border-green-400 bg-green-400/20 text-green-400'
                                            : 'border-white/10 bg-white/5 text-gray-600'
                                }`}>
                                    {isDone ? <CheckCircle className="h-3 w-3" /> : step.icon}
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-tight text-center leading-tight ${
                                    isActive ? 'text-cyan-400' : isDone ? 'text-green-400' : 'text-gray-700'
                                }`}>{step.label}</span>
                            </div>
                            {!isLast && (
                                <div className={`h-px flex-1 mb-4 transition-colors duration-500 ${
                                    isDone ? 'bg-green-400/40' : 'bg-white/5'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default ScanButton;
