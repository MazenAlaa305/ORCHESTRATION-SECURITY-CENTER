import React, { useState } from 'react';
import { scanService } from '../../services/api';
import { PlayCircle, Loader2, CheckCircle, Clock, Cpu, Network, BarChart2, Brain } from 'lucide-react';

const PIPELINE_STEPS = [
    { id: 'idle', label: 'Idle', icon: <Clock className="h-3 w-3" /> },
    { id: 'queued', label: 'Queued', icon: <Clock className="h-3 w-3" /> },
    { id: 'nmap', label: 'Nmap', icon: <Network className="h-3 w-3" /> },
    { id: 'nuclei', label: 'Nuclei', icon: <Cpu className="h-3 w-3" /> },
    { id: 'risk', label: 'Risk Engine', icon: <BarChart2 className="h-3 w-3" /> },
    { id: 'ai', label: 'AI Advisory', icon: <Brain className="h-3 w-3" /> },
];

const ScanButton = ({ onScanStarted, isScanning }) => {
    const [loading, setLoading] = useState(false);
    const [target, setTarget] = useState('localhost');
    const [currentStep, setCurrentStep] = useState('idle');

    const handleScan = async () => {
        setLoading(true);
        setCurrentStep('queued');
        try {
            await scanService.startScan(target, 'quick');
            setCurrentStep('nmap');
            if (onScanStarted) onScanStarted();
        } catch (error) {
            console.error("Scan failed", error);
            setCurrentStep('idle');
            alert("Failed to start scan: " + (error?.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Determine visible pipeline (skip 'idle' step in UI display)
    const visibleSteps = PIPELINE_STEPS.slice(1);
    const activeIdx = visibleSteps.findIndex(s => s.id === currentStep);

    return (
        <div className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden">
            {/* Ambient glow when scanning */}
            {loading && (
                <div className="absolute inset-0 bg-cyber-accent/5 rounded-2xl animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-gray-400 text-[10px] uppercase tracking-[0.25em] font-black">Quick Scan</h3>
                {loading && (
                    <span className="flex items-center gap-1 text-[9px] font-mono text-cyber-accent uppercase tracking-widest animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyber-accent animate-ping" />
                        Running
                    </span>
                )}
            </div>

            {/* Target input */}
            <div className="flex gap-2 relative z-10">
                <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="bg-black/40 text-white px-3 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-cyber-accent/50 flex-grow text-sm font-mono placeholder-gray-600 transition-colors"
                    placeholder="IP or Domain..."
                />
                <button
                    onClick={handleScan}
                    disabled={loading}
                    id="scan-launch-btn"
                    className="bg-cyber-accent hover:bg-sky-400 text-gray-900 font-black px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon hover:shadow-neon-lg text-sm"
                >
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {loading ? 'Running' : 'Scan'}
                </button>
            </div>

            {/* Pipeline step indicator */}
            <div className="relative z-10 flex items-center gap-0">
                {visibleSteps.map((step, i) => {
                    const isDone = i < activeIdx;
                    const isActive = i === activeIdx && loading;
                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 text-[10px] ${
                                    isActive ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent animate-pulse shadow-neon-sm'
                                    : isDone ? 'border-cyber-success bg-cyber-success/20 text-cyber-success'
                                    : 'border-white/10 bg-white/5 text-gray-600'
                                }`}>
                                    {isDone ? <CheckCircle className="h-3 w-3" /> : step.icon}
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-tight text-center leading-tight ${
                                    isActive ? 'text-cyber-accent' : isDone ? 'text-cyber-success' : 'text-gray-700'
                                }`}>{step.label}</span>
                            </div>
                            {i < visibleSteps.length - 1 && (
                                <div className={`h-px flex-1 mb-4 transition-colors duration-500 ${isDone ? 'bg-cyber-success/40' : 'bg-white/5'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default ScanButton;
