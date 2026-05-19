import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Settings, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { scanService, targetService } from '../services/api';
import ScanConfigModal from './dashboard/ScanConfigModal';

const BG       = '#0b1623';
const BORDER   = '#1e2d3d';
const TEXT_DIM = '#4a5a6a';
const TEXT_MID = '#6a7a8a';

export default function QuickScanPopover({ isScanning, onScanStarted }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [pos, setPos] = useState({ top: 56, right: 16 });

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    const { data: targets = [], isLoading: targetsLoading } = useQuery({
        queryKey: ['targets'],
        queryFn: () => targetService.list().then(r => r.data || []),
        enabled: open,
        staleTime: 10_000,
    });

    const primaryTarget = (() => {
        if (!targets.length) return null;
        const sorted = [...targets].sort((a, b) => {
            const ta = a.last_scanned_at ? new Date(a.last_scanned_at).getTime() : 0;
            const tb = b.last_scanned_at ? new Date(b.last_scanned_at).getTime() : 0;
            return tb - ta;
        });
        return sorted[0];
    })();

    useEffect(() => {
        if (open && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
        }
    }, [open]);

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

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (popoverRef.current?.contains(e.target)) return;
            if (triggerRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && open && primaryTarget && !submitting) { e.preventDefault(); handleRun(); }
            if ((e.key === 'c' || e.key === 'C') && open && !submitting) { e.preventDefault(); handleConfigure(); }
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

    const handleConfigure = () => { setOpen(false); setShowConfig(true); };

    const PANEL = {
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 320,
        zIndex: 9999,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 16px 48px #000, 0 2px 8px #000',
    };

    const labelStyle = { fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: TEXT_DIM, marginBottom: 4 };
    const kbdStyle   = { padding: '1px 5px', borderRadius: 4, background: '#1a2535', border: `1px solid ${BORDER}`, fontFamily: 'monospace', fontSize: 8, color: TEXT_MID };

    return (
        <>
            <div className="relative">
                <button
                    ref={triggerRef}
                    onClick={() => !isScanning && setOpen((p) => !p)}
                    disabled={isScanning}
                    style={isScanning
                        ? { background: '#0d2030', border: '1px solid #1a4055', color: '#00cccc', cursor: 'not-allowed', padding: '6px 16px', borderRadius: 12, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }
                        : { background: '#00e5e5', color: '#0a1520', padding: '6px 16px', borderRadius: 12, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none' }
                    }
                >
                    <Zap size={14} />
                    {isScanning ? 'Scanning...' : 'Quick Scan'}
                </button>

                {createPortal(
                    <AnimatePresence>
                    {open && (
                    <motion.div
                        ref={popoverRef}
                        role="dialog"
                        aria-label="Confirm quick scan"
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        style={PANEL}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
                            <Zap size={13} color="#00cccc" />
                            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#e8f0f8' }}>Confirm Scan</span>
                        </div>

                        {targetsLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEXT_MID, fontSize: 11, padding: '8px 0' }}>
                                <Loader2 size={13} className="animate-spin" /> Loading targets…
                            </div>
                        )}

                        {!targetsLoading && targets.length === 0 && (
                            <div style={{ paddingTop: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccaa00', fontSize: 11, marginBottom: 8 }}>
                                    <AlertCircle size={14} />
                                    <span>No targets configured</span>
                                </div>
                                <p style={{ color: TEXT_MID, fontSize: 11, marginBottom: 12 }}>Add a target before running a scan.</p>
                                <button
                                    onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { tab: 'operations', sub: 'targets' } })); }}
                                    style={{ width: '100%', padding: '7px 12px', borderRadius: 8, background: '#00e5e5', color: '#0a1520', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer' }}
                                >
                                    Add a target
                                </button>
                            </div>
                        )}

                        {targets.length > 0 && primaryTarget && (
                            <>
                                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div>
                                        <p style={labelStyle}>Target</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 6, background: '#0d2535', color: '#66ddee', border: `1px solid #1a4055`, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {primaryTarget.name || primaryTarget.base_url}
                                            </span>
                                            {targets.length > 1 && (
                                                <span style={{ fontSize: 9, color: TEXT_MID }}>+{targets.length - 1} other{targets.length - 1 > 1 ? 's' : ''}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <p style={labelStyle}>Profile</p>
                                            <p style={{ fontSize: 11, color: '#e8f0f8', fontWeight: 600, margin: 0 }}>Quick</p>
                                            <p style={{ fontSize: 9, color: TEXT_MID, margin: 0 }}>nmap top-1000 ports</p>
                                        </div>
                                        <div>
                                            <p style={labelStyle}>ETA</p>
                                            <p style={{ fontSize: 11, color: '#e8f0f8', fontWeight: 600, margin: 0 }}>~2 min</p>
                                        </div>
                                    </div>
                                </div>

                                {error && <p style={{ fontSize: 10, color: '#ff6677', marginBottom: 8, wordBreak: 'break-word' }}>{error}</p>}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        onClick={handleRun}
                                        disabled={submitting}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#00e5e5', color: '#0a1520', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}
                                    >
                                        {submitting ? <Loader2 size={13} className="animate-spin" /> : <><Zap size={13} /> Run</>}
                                    </button>
                                    <button
                                        onClick={handleConfigure}
                                        disabled={submitting}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#0d2535', color: '#66ddee', border: `1px solid #1a4055`, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
                                        title="Open the full scan configuration modal (C)"
                                    >
                                        <Settings size={12} /> Configure
                                    </button>
                                </div>
                                <p style={{ fontSize: 8, color: TEXT_DIM, marginTop: 8, textAlign: 'right' }}>
                                    <kbd style={kbdStyle}>Enter</kbd> to run · <kbd style={kbdStyle}>C</kbd> to configure · <kbd style={kbdStyle}>Esc</kbd> to cancel
                                </p>
                            </>
                        )}
                    </motion.div>
                    )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            <ScanConfigModal
                open={showConfig}
                onClose={() => setShowConfig(false)}
                onStarted={(scan) => { setShowConfig(false); onScanStarted?.(scan); }}
            />
        </>
    );
}
