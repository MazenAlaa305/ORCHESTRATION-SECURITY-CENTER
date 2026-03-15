import React, { useEffect, useRef } from 'react';
import { Network, Cpu, BarChart2, Brain, CheckCircle, Loader2, Zap } from 'lucide-react';

const STAGES = [
    { id: 'recon_agent',      label: 'ReconAgent',    sublabel: 'Nmap',       icon: Network,   color: 'text-blue-400',   border: 'border-blue-400',   bg: 'bg-blue-400/10' },
    { id: 'attack_agent',     label: 'AttackAgent',   sublabel: 'Nuclei',     icon: Cpu,       color: 'text-red-400',    border: 'border-red-400',    bg: 'bg-red-400/10' },
    { id: 'validation_agent', label: 'RiskEngine',    sublabel: 'Validator',  icon: BarChart2, color: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'reporting_agent',  label: 'AI Advisory',   sublabel: 'Gemini',     icon: Brain,     color: 'text-purple-400', border: 'border-purple-400', bg: 'bg-purple-400/10' },
];

/**
 * ScanPipelinePanel
 * Shows the deterministic AgentOrchestrator pipeline when a scan is active.
 *
 * @param {Array} logs   — array of agent log objects from the API
 * @param {boolean} isScanning — whether a scan is currently running
 */
const ScanPipelinePanel = ({ logs = [], isScanning = false }) => {
    const visitedAgents = new Set((logs || []).map(l => l.agent_name));
    const lastActiveIdx = STAGES.reduce((acc, s, i) => visitedAgents.has(s.id) ? i : acc, -1);

    if (!isScanning && visitedAgents.size === 0) return null;

    return (
        <div className="glass-card p-4 mb-5 animate-fade-in border-cyber-accent/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-accent opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-accent" />
                    </span>
                    <span className="text-[10px] font-black text-cyber-accent uppercase tracking-[0.3em]">
                        Deterministic Scan Pipeline
                    </span>
                </div>
                {isScanning && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyber-accent/10 border border-cyber-accent/20 rounded-lg">
                        <Loader2 className="h-3 w-3 text-cyber-accent animate-spin" />
                        <span className="text-[9px] font-black text-cyber-accent uppercase tracking-wider">Running</span>
                    </div>
                )}
            </div>

            {/* Stage Stepper */}
            <div className="flex items-center gap-0">
                {STAGES.map((stage, i) => {
                    const Icon = stage.icon;
                    const isDone = i < lastActiveIdx;
                    const isActive = i === lastActiveIdx && isScanning;
                    const lastLog = isActive ? (logs || []).filter(l => l.agent_name === stage.id).slice(-1)[0] : null;

                    return (
                        <React.Fragment key={stage.id}>
                            <div className="flex flex-col items-center gap-2 flex-1">
                                {/* Icon Circle */}
                                <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                    isActive
                                        ? `${stage.border} ${stage.bg} ${stage.color} animate-pulse shadow-neon-sm`
                                        : isDone
                                        ? 'border-cyber-success bg-cyber-success/10 text-cyber-success'
                                        : 'border-white/10 bg-white/5 text-gray-700'
                                }`}>
                                    {isDone && !isActive
                                        ? <CheckCircle className="h-4 w-4" />
                                        : <Icon className="h-4 w-4" />
                                    }
                                </div>

                                {/* Stage Label */}
                                <div className="text-center">
                                    <div className={`text-[9px] font-black uppercase tracking-wider ${
                                        isActive ? stage.color : isDone ? 'text-cyber-success' : 'text-gray-700'
                                    }`}>
                                        {stage.label}
                                    </div>
                                    <div className="text-[8px] text-gray-700 font-mono">{stage.sublabel}</div>
                                </div>

                                {/* Live status ticker */}
                                {isActive && lastLog && (
                                    <div className="text-[8px] text-gray-500 font-mono text-center max-w-[100px] truncate" title={lastLog.action}>
                                        {lastLog.action}
                                    </div>
                                )}
                            </div>

                            {/* Connector Line */}
                            {i < STAGES.length - 1 && (
                                <div className={`h-px flex-1 mb-8 transition-all duration-700 ${
                                    i < lastActiveIdx
                                        ? 'bg-cyber-success/60'
                                        : isActive && i === lastActiveIdx - 1
                                        ? 'bg-cyber-accent/40'
                                        : 'bg-white/5'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Current action detail */}
            {isScanning && lastActiveIdx >= 0 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                        <Zap className="h-3.5 w-3.5 text-cyber-accent animate-pulse" />
                        <span className="text-gray-600">Current:</span>
                        <span className={`${STAGES[lastActiveIdx]?.color || 'text-gray-400'} font-bold`}>
                            {STAGES[lastActiveIdx]?.label}: Active —&nbsp;
                            {(logs || []).filter(l => l.agent_name === STAGES[lastActiveIdx]?.id).slice(-1)[0]?.action || 'Processing...'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanPipelinePanel;
