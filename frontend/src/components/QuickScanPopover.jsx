import React, { useEffect, useRef, useState } from 'react';
import { Zap, Settings, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { scanService, targetService } from '../services/api';
import ScanConfigModal from './dashboard/ScanConfigModal';

/**
 * Drop-in replacement for the bare Quick Scan button in the top bar.
 *
 * Shows a confirmation popover with:
 *   - target chips + count
 *   - profile name + ETA
 *   - Run / Configure… / Cancel
 *
 * Run launches a `quick` scan against the most recently scanned (or first)
 * target. Configure… opens a self-mounted ScanConfigModal so callers don't
 * need to manage modal state.
 *
 * Props:
 *   isScanning      — disable Run while a scan is already in flight
 *   onScanStarted   — called with the started scan object (Dashboard switches to AI Brain)
 */
export default function QuickScanPopover({ isScanning, onScanStarted }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showConfig, setShowConfig] = useState(false);

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    // Targets — used for the chips + the implicit Run target choice.
    const { data: targets = [], isLoading: targetsLoading } = useQuery({
        queryKey: ['targets'],
        queryFn: () => targetService.list().then(r => r.data || []),
        enabled: open,
        staleTime: 10_000,
    });

    // Pick the most-recently-scanned target if available, else first.
    const primaryTarget = (() => {
        if (!targets.length) return null;
        const sorted = [...targets].sort((a, b) => {
            const ta = a.last_scanned_at ? new Date(a.last_scanned_at).getTime() : 0;
            const tb = b.last_scanned_at ? new Date(b.last_scanned_at).getTime() : 0;
            return tb - ta;
        });
        return sorted[0];
    })();

    // External triggers from the command palette
    useEffect(() => {
        const onOpenQuick = () => setOpen(true);
        const onOpenConfig = () => { setOpen(false); setShowConfig(true); };
        window.addEventListener('dashboard:open-quick-scan', onOpenQuick);
        window.addEventListener('dashboard:open-scan-config', onOpenConfig);
        return () => {
            window.removeEventListener('dashboard:open-quick-scan', onOpenQuick);
            window.removeEventListener('dashboard:open-scan-config', onOpenConfig);
        };
    }, []);

    // Outside-click + Esc handlers
    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (popoverRef.current?.contains(e.target)) return;
            if (triggerRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && open && primaryTarget && !submitting) {
                e.preventDefault();
                handleRun();
            }
            if ((e.key === 'c' || e.key === 'C') && open && !submitting) {
                e.preventDefault();
                handleConfigure();
            }
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, primaryTarget, submitting]);

    const handleRun = async () => {
        if (!primaryTarget || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await scanService.startScan(primaryTarget.base_url, 'quick');
            setOpen(false);
            onScanStarted?.(res?.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to start scan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfigure = () => {
        setOpen(false);
        setShowConfig(true);
    };

    return (
        <>
            <div className="relative">
                <button
                    ref={triggerRef}
                    onClick={() => !isScanning && setOpen((p) => !p)}
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

                {open && (
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-label="Confirm quick scan"
                        className="absolute right-0 top-full mt-2 w-80 rounded-xl p-4 z-50 animate-fade-in"
                        style={{
                            background: 'rgb(10, 20, 30)',
                            border: '1px solid rgba(0,255,255,0.2)',
                            boxShadow: '0 0 0 1px rgba(0,0,0,1), 0 20px 60px rgba(0,0,0,0.95), 0 0 30px rgba(0,255,255,0.05)',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                            isolation: 'isolate',
                            opacity: 1,
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                            <Zap className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                Confirm Scan
                            </span>
                        </div>

                        {/* Loading targets */}
                        {targetsLoading && (
                            <div className="flex items-center gap-2 text-gray-400 text-[11px] py-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading targets…
                            </div>
                        )}

                        {/* Empty — no targets */}
                        {!targetsLoading && targets.length === 0 && (
                            <div className="py-2">
                                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>No targets configured</span>
                                </div>
                                <p className="text-gray-500 text-[11px] mb-3">
                                    Add a target before running a scan.
                                </p>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        window.dispatchEvent(new CustomEvent('dashboard:navigate',
                                            { detail: { tab: 'operations', sub: 'targets' } }));
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg bg-cyan-400 text-gray-900 text-[10px] font-black uppercase tracking-wider hover:bg-sky-300 transition-colors"
                                >
                                    Add a target
                                </button>
                            </div>
                        )}

                        {/* Confirm — has targets */}
                        {targets.length > 0 && primaryTarget && (
                            <>
                                <div className="space-y-2 mb-3">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-600 mb-1">Target</p>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate max-w-[200px]">
                                                {primaryTarget.name || primaryTarget.base_url}
                                            </span>
                                            {targets.length > 1 && (
                                                <span className="text-[9px] text-gray-500">
                                                    +{targets.length - 1} other{targets.length - 1 > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-600 mb-1">Profile</p>
                                            <p className="text-[11px] text-white font-semibold">Quick</p>
                                            <p className="text-[9px] text-gray-500">nmap top-1000 ports</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-600 mb-1">ETA</p>
                                            <p className="text-[11px] text-white font-semibold">~2 min</p>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-[10px] text-red-400 mb-2 break-words">{error}</p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRun}
                                        disabled={submitting}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 text-gray-900 text-[10px] font-black uppercase tracking-wider hover:bg-sky-300 disabled:opacity-50 transition-colors"
                                    >
                                        {submitting
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <><Zap className="h-3.5 w-3.5" /> Run</>}
                                    </button>
                                    <button
                                        onClick={handleConfigure}
                                        disabled={submitting}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-400/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                                        title="Open the full scan configuration modal (C)"
                                    >
                                        <Settings className="h-3 w-3" />
                                        Configure
                                    </button>
                                </div>
                                <p className="text-[8px] text-gray-600 mt-2 text-right">
                                    <kbd className="px-1 rounded bg-white/5 border border-white/10 font-mono">Enter</kbd> to run · <kbd className="px-1 rounded bg-white/5 border border-white/10 font-mono">C</kbd> to configure · <kbd className="px-1 rounded bg-white/5 border border-white/10 font-mono">Esc</kbd> to cancel
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <ScanConfigModal
                open={showConfig}
                onClose={() => setShowConfig(false)}
                onStarted={(scan) => {
                    setShowConfig(false);
                    onScanStarted?.(scan);
                }}
            />
        </>
    );
}
