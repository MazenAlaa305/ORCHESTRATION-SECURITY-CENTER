import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Cpu, Network, Shield, BarChart2, X } from 'lucide-react';

const STAGES = [
    { id: 'nmap', label: 'Nmap', icon: <Network className="h-3 w-3" />, desc: 'Port Discovery' },
    { id: 'nuclei', label: 'Nuclei', icon: <Cpu className="h-3 w-3" />, desc: 'Vuln Scan' },
    { id: 'risk', label: 'Risk Engine', icon: <BarChart2 className="h-3 w-3" />, desc: 'Scoring' },
    { id: 'ai', label: 'AI Advisory', icon: <Brain className="h-3 w-3" />, desc: 'Intelligence' },
];

const ScanningBanner = ({ isScanning, scanStage, onDismiss }) => {
    const currentIdx = scanStage ? STAGES.findIndex(s => s.id === scanStage) : 0;
    const progressPct = scanStage ? ((currentIdx + 1) / STAGES.length) * 100 : 35;

    return (
        <AnimatePresence>
        {isScanning && (
        <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-[200]"
        >
            {/* Scan line effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-accent to-transparent animate-pulse" />

            <div className="bg-black/90 backdrop-blur-xl border-b border-cyber-accent/20 px-6 py-3 relative overflow-hidden">
                {/* Sweeping shimmer */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-y-0 -left-1/4 w-1/4 bg-gradient-to-r from-transparent via-cyber-accent/8 to-transparent animate-sweep" />
                </div>

                <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 relative">
                    {/* Left: Status */}
                    <div className="flex items-center gap-3 shrink-0">
                        <motion.div
                            animate={{ rotate: [0, 4, -4, 0] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            className="relative"
                        >
                            <Brain className="h-5 w-5 text-cyber-accent" />
                            <div className="absolute inset-0 bg-cyber-accent blur-md opacity-60 animate-pulse" />
                        </motion.div>
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
                                        <motion.div
                                            initial={false}
                                            animate={isActive ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                                            transition={isActive ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                                            className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                                                isActive ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent shadow-neon'
                                                : isDone ? 'border-cyber-success bg-cyber-success/20 text-cyber-success'
                                                : 'border-white/10 bg-white/5 text-gray-600'
                                            }`}
                                        >
                                            <AnimatePresence mode="wait" initial={false}>
                                                <motion.span
                                                    key={isDone ? 'done' : stage.id}
                                                    initial={{ scale: 0, rotate: -90 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    exit={{ scale: 0, rotate: 90 }}
                                                    transition={{ type: 'spring', stiffness: 460, damping: 18 }}
                                                >
                                                    {isDone ? <Shield className="h-3 w-3" /> : stage.icon}
                                                </motion.span>
                                            </AnimatePresence>
                                        </motion.div>
                                        <span className={`text-[9px] font-bold uppercase tracking-wide ${
                                            isActive ? 'text-cyber-accent' : isDone ? 'text-cyber-success' : 'text-gray-600'
                                        }`}>{stage.label}</span>
                                    </div>
                                    {i < STAGES.length - 1 && (
                                        <div className="h-px flex-1 mb-4 bg-white/10 relative overflow-hidden">
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: isDone ? 1 : 0 }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                style={{ transformOrigin: 'left' }}
                                                className="absolute inset-0 bg-cyber-success/50"
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Right: Progress bar + dismiss */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex flex-col gap-1">
                            <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-cyber-accent/60 to-cyber-accent rounded-full"
                                />
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono text-right">Processing...</span>
                        </div>
                        {onDismiss && (
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onDismiss}
                                className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                                title="Minimize banner"
                            >
                                <X className="h-3.5 w-3.5" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
        )}
        </AnimatePresence>
    );
};

export default ScanningBanner;
