import React from 'react';
import { Brain, Cpu, Network, Shield, BarChart2, X } from 'lucide-react';

const STAGES = [
    { id: 'nmap', label: 'Nmap', icon: <Network className="h-3 w-3" />, desc: 'Port Discovery' },
    { id: 'nuclei', label: 'Nuclei', icon: <Cpu className="h-3 w-3" />, desc: 'Vuln Scan' },
    { id: 'risk', label: 'Risk Engine', icon: <BarChart2 className="h-3 w-3" />, desc: 'Scoring' },
    { id: 'ai', label: 'AI Advisory', icon: <Brain className="h-3 w-3" />, desc: 'Intelligence' },
];

const ScanningBanner = ({ isScanning, scanStage, onDismiss }) => {
    if (!isScanning) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] animate-slide-in-up">
            {/* Scan line effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-accent to-transparent animate-pulse" />

            <div className="bg-black/90 backdrop-blur-xl border-b border-cyber-accent/20 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                    {/* Left: Status */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="relative">
                            <Brain className="h-5 w-5 text-cyber-accent" />
                            <div className="absolute inset-0 bg-cyber-accent blur-md opacity-60 animate-pulse" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyber-accent">Scan In Progress</div>
                            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest animate-pulse">
                                Orchestrating security pipeline...
                            </div>
                        </div>
                    </div>

                    {/* Center: Pipeline Stages */}
                    <div className="hidden md:flex items-center gap-0 flex-1 max-w-xl">
                        {STAGES.map((stage, i) => {
                            const isActive = scanStage === stage.id;
                            const isDone = scanStage
                                ? STAGES.findIndex(s => s.id === scanStage) > i
                                : false;
                            return (
                                <React.Fragment key={stage.id}>
                                    <div className="flex flex-col items-center gap-1 flex-1">
                                        <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                            isActive ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent shadow-neon animate-pulse'
                                            : isDone ? 'border-cyber-success bg-cyber-success/20 text-cyber-success'
                                            : 'border-white/10 bg-white/5 text-gray-600'
                                        }`}>
                                            {isDone ? <Shield className="h-3 w-3" /> : stage.icon}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-wide ${
                                            isActive ? 'text-cyber-accent' : isDone ? 'text-cyber-success' : 'text-gray-600'
                                        }`}>{stage.label}</span>
                                    </div>
                                    {i < STAGES.length - 1 && (
                                        <div className={`h-px flex-1 mb-4 ${isDone ? 'bg-cyber-success/50' : 'bg-white/10'} transition-colors duration-700`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Right: Progress bar + dismiss */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex flex-col gap-1">
                            <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyber-accent/60 to-cyber-accent rounded-full animate-pulse" style={{ width: '65%' }} />
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono text-right">Processing...</span>
                        </div>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                                title="Minimize banner"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanningBanner;
