import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    X, Shield, AlertTriangle, CheckCircle, XCircle, ExternalLink,
    Code, Brain, RefreshCw, Loader2, ChevronDown, ChevronUp,
    ChevronLeft, ChevronRight, Copy, Check, Target, Eye,
    Zap, Activity, Lock, Search, ListChecks, ShieldAlert
} from 'lucide-react';
import { vulnerabilityService } from '../../services/api';
import { drawerRight } from '../../lib/motion';

const SEV_CONFIG = {
    critical: { color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    label: 'CRITICAL', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]'    },
    high:     { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', label: 'HIGH',     glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]'    },
    medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', label: 'MEDIUM',   glow: ''                                            },
    low:      { color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   label: 'LOW',      glow: ''                                            },
    info:     { color: 'text-gray-400',   bg: 'bg-gray-500/15',   border: 'border-gray-500/40',   label: 'INFO',     glow: ''                                            },
};

// Parse CVSS:3.x vector string into labeled metric objects
const parseCvssVector = (vector) => {
    if (!vector) return null;
    const parts = {};
    vector.split('/').forEach(p => { const [k, v] = p.split(':'); if (k && v) parts[k] = v; });

    const LABELS = {
        AV: { N: 'Network', A: 'Adjacent Network', L: 'Local', P: 'Physical' },
        AC: { L: 'Low', H: 'High' },
        PR: { N: 'None', L: 'Low', H: 'High' },
        UI: { N: 'None', R: 'Required' },
        S:  { U: 'Unchanged', C: 'Changed' },
        C:  { N: 'None', L: 'Low', H: 'High' },
        I:  { N: 'None', L: 'Low', H: 'High' },
        A:  { N: 'None', L: 'Low', H: 'High' },
    };
    // Color: red = worst for attacker ease / impact, green = best
    const RISK = {
        AV: { N: 'text-red-400', A: 'text-orange-400', L: 'text-yellow-400', P: 'text-green-400' },
        AC: { L: 'text-red-400', H: 'text-green-400' },
        PR: { N: 'text-red-400', L: 'text-yellow-400', H: 'text-green-400' },
        UI: { N: 'text-red-400', R: 'text-green-400' },
        S:  { C: 'text-red-400', U: 'text-green-400' },
        C:  { H: 'text-red-400', L: 'text-yellow-400', N: 'text-green-400' },
        I:  { H: 'text-red-400', L: 'text-yellow-400', N: 'text-green-400' },
        A:  { H: 'text-red-400', L: 'text-yellow-400', N: 'text-green-400' },
    };
    return [
        { key: 'AV', name: 'Attack Vector',    val: parts.AV, label: LABELS.AV?.[parts.AV], color: RISK.AV?.[parts.AV] },
        { key: 'AC', name: 'Attack Complexity',val: parts.AC, label: LABELS.AC?.[parts.AC], color: RISK.AC?.[parts.AC] },
        { key: 'PR', name: 'Privileges',       val: parts.PR, label: LABELS.PR?.[parts.PR], color: RISK.PR?.[parts.PR] },
        { key: 'UI', name: 'User Interaction', val: parts.UI, label: LABELS.UI?.[parts.UI], color: RISK.UI?.[parts.UI] },
        { key: 'S',  name: 'Scope',            val: parts.S,  label: LABELS.S?.[parts.S],   color: RISK.S?.[parts.S]  },
        { key: 'C',  name: 'Confidentiality',  val: parts.C,  label: LABELS.C?.[parts.C],   color: RISK.C?.[parts.C]  },
        { key: 'I',  name: 'Integrity',        val: parts.I,  label: LABELS.I?.[parts.I],   color: RISK.I?.[parts.I]  },
        { key: 'A',  name: 'Availability',     val: parts.A,  label: LABELS.A?.[parts.A],   color: RISK.A?.[parts.A]  },
    ].filter(m => m.val);
};

const SectionHeader = ({ icon: Icon, title, badge, badgeColor = 'purple', expanded, onToggle }) => (
    <button onClick={onToggle} className="flex items-center justify-between w-full group mb-3">
        <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 text-${badgeColor}-400`} />
            <span className="text-sm font-black text-white uppercase tracking-wider">{title}</span>
            {badge && (
                <span className={`text-[9px] px-2 py-0.5 bg-${badgeColor}-500/20 text-${badgeColor}-400 border border-${badgeColor}-500/30 rounded font-bold uppercase`}>
                    {badge}
                </span>
            )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
    </button>
);

const IncidentDetailDrawer = ({ vuln, onClose, onStatusChange, nav }) => {
    const closeBtnRef = useRef(null);
    const [poc, setPoc]                   = useState(null);
    const [pocLoading, setPocLoading]     = useState(false);
    const [pocExpanded, setPocExpanded]   = useState(true);
    const [aiExpanded, setAiExpanded]     = useState(true);
    const [cvssExpanded, setCvssExpanded] = useState(true);
    const [techExpanded, setTechExpanded] = useState(false);
    const [copied, setCopied]             = useState(false);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [actionMsg, setActionMsg]       = useState(null);
    const [insight, setInsight]           = useState(null);
    const [insightLoading, setInsightLoading] = useState(false);

    const sev   = SEV_CONFIG[(vuln?.severity || 'info').toLowerCase()] || SEV_CONFIG.info;
    const cveId = vuln?.cve_id || vuln?.type?.match(/CVE-\d{4}-\d+/)?.[0];
    const cvssMetrics = parseCvssVector(vuln?.cvss_vector);

    useEffect(() => { requestAnimationFrame(() => closeBtnRef.current?.focus()); }, [vuln?.id]);

    // Fetch PoC and AI insight together when drawer opens
    useEffect(() => {
        if (!vuln?.id) return;
        setPocLoading(true);
        setInsightLoading(true);
        setInsight(null);

        vulnerabilityService.getPoc(vuln.id)
            .then(res => setPoc(res.data))
            .catch(() => setPoc(null))
            .finally(() => setPocLoading(false));

        vulnerabilityService.getAiInsight(vuln.id)
            .then(res => setInsight(res.data))
            .catch(() => setInsight(null))
            .finally(() => setInsightLoading(false));
    }, [vuln?.id]);

    useEffect(() => {
        const handler = (e) => {
            const t = e.target;
            const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            if (e.key === 'Escape') { onClose?.(); return; }
            if (isTyping) return;
            if (e.key === 'j' || e.key === 'ArrowDown') { if (nav?.onNext) { e.preventDefault(); nav.onNext(); } }
            else if (e.key === 'k' || e.key === 'ArrowUp') { if (nav?.onPrev) { e.preventDefault(); nav.onPrev(); } }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, nav]);

    const handleRevalidate = async () => {
        setIsRevalidating(true);
        setActionMsg(null);
        try {
            await vulnerabilityService.revalidate(vuln.id);
            setActionMsg({ type: 'success', text: 'Re-validation queued successfully' });
        } catch {
            setActionMsg({ type: 'error', text: 'Failed to queue re-validation' });
        } finally { setIsRevalidating(false); }
    };

    const handleMarkFixed = async () => {
        try {
            await vulnerabilityService.markFixed(vuln.id);
            setActionMsg({ type: 'success', text: 'Marked as fixed' });
            onStatusChange?.();
        } catch { setActionMsg({ type: 'error', text: 'Failed to update status' }); }
    };

    const handleMarkFP = async () => {
        try {
            await vulnerabilityService.markFalsePositive(vuln.id);
            setActionMsg({ type: 'success', text: 'Marked as false positive' });
            onStatusChange?.();
        } catch { setActionMsg({ type: 'error', text: 'Failed to update status' }); }
    };

    const copyPoc = useCallback(() => {
        navigator.clipboard.writeText(poc?.proof_of_concept || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [poc]);

    if (!vuln) return null;

    const desc = vuln.simplified_description || vuln.description
        || (vuln.type ? `A ${vuln.type} vulnerability was detected on ${vuln.url || vuln.host || 'the target system'}.` : null)
        || `Security finding detected on ${vuln.url || vuln.host || 'the target system'}. Severity: ${(vuln.severity || 'unknown').toUpperCase()}.`;
    const isAiDesc = !!vuln.simplified_description;

    return (
        <>
        <motion.div key="incident-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
                key="incident-aside"
                role="dialog" aria-modal="true" aria-labelledby="incident-drawer-title"
                variants={drawerRight}
                initial="initial"
                animate="animate"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0, right: 0.4 }}
                onDragEnd={(_, info) => { if (info.offset.x > 120 || info.velocity.x > 600) onClose?.(); }}
                className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl flex flex-col bg-cyber-dark border-l ${sev.border} ${sev.glow} overflow-hidden`}
            >
                {/* ── Header ─────────────────────────────────────── */}
                <div className={`px-6 py-4 border-b border-white/10 ${sev.bg} shrink-0`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${sev.bg} ${sev.color} ${sev.border}`}>
                                    {sev.label}
                                </span>
                                {cveId && (
                                    <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] text-cyber-accent/70 hover:text-cyber-accent border border-cyber-accent/20 hover:border-cyber-accent/40 rounded px-2 py-0.5 transition-colors font-mono">
                                        {cveId} <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                )}
                            </div>
                            <h2 id="incident-drawer-title" className="text-white font-black text-lg tracking-tight mt-1 leading-snug">
                                {vuln.title || vuln.type || 'Unknown Vulnerability'}
                            </h2>
                            {vuln.url && <p className="text-gray-500 text-xs font-mono mt-0.5 truncate">{vuln.url}</p>}
                            {(vuln.host || vuln.port) && (
                                <p className="text-gray-600 text-xs font-mono mt-0.5">
                                    {vuln.host}{vuln.port ? `:${vuln.port}` : ''}{vuln.service ? ` (${vuln.service})` : ''}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {nav && typeof nav.position === 'number' && nav.total > 0 && (
                                <div className="flex items-center gap-0.5 mr-1">
                                    <button onClick={() => nav.onPrev?.()} disabled={!nav.onPrev || nav.position <= 1}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Previous (K / ↑)">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <span className="text-[10px] font-mono text-gray-400 px-1 tabular-nums">{nav.position} / {nav.total}</span>
                                    <button onClick={() => nav.onNext?.()} disabled={!nav.onNext || nav.position >= nav.total}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Next (J / ↓)">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <button ref={closeBtnRef} onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" aria-label="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    {actionMsg && (
                        <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-bold ${actionMsg.type === 'success' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            {actionMsg.text}
                        </div>
                    )}
                </div>

                {/* ── Scrollable Content ──────────────────────────── */}
                <div className="flex-1 overflow-y-auto">

                    {/* 1. Quick Meta Row */}
                    <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-white/5">
                        {vuln.cvss_score != null && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">CVSS Score</span>
                                <span className={`text-sm font-black font-mono ${vuln.cvss_score >= 9 ? 'text-red-400' : vuln.cvss_score >= 7 ? 'text-orange-400' : vuln.cvss_score >= 4 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                    {vuln.cvss_score.toFixed(1)} / 10
                                </span>
                                {vuln.cvss_vector && (
                                    <span className="text-[8px] text-gray-600 font-mono truncate" title={vuln.cvss_vector}>{vuln.cvss_vector}</span>
                                )}
                            </div>
                        )}
                        {vuln.confidence_score != null && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Confidence</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-cyber-neon to-cyber-vibrant"
                                            style={{ width: `${(vuln.confidence_score * 100).toFixed(0)}%` }} />
                                    </div>
                                    <span className="text-cyber-neon text-xs font-mono font-bold">
                                        {(vuln.confidence_score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Status</span>
                            <span className={`text-xs font-bold ${vuln.status === 'open' ? 'text-red-400' : vuln.status === 'fixed' ? 'text-green-400' : 'text-gray-400'}`}>
                                {vuln.status?.toUpperCase() || 'OPEN'}
                            </span>
                        </div>
                        {vuln.detected_by && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Detected By</span>
                                <span className="text-xs font-mono text-white">{vuln.detected_by}</span>
                            </div>
                        )}
                    </div>

                    {/* 2. Description */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Description</span>
                            {isAiDesc && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black uppercase">AI</span>
                            )}
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
                    </div>

                    {/* 3. CVSS Vector Breakdown */}
                    {cvssMetrics && (
                        <div className="px-6 py-4 border-b border-white/5">
                            <SectionHeader icon={Activity} title="CVSS Breakdown" badge="v3.x" badgeColor="cyan"
                                expanded={cvssExpanded} onToggle={() => setCvssExpanded(v => !v)} />
                            {cvssExpanded && (
                                <div className="grid grid-cols-2 gap-2">
                                    {cvssMetrics.map(m => (
                                        <div key={m.key} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                            <span className="text-[10px] text-gray-500 font-medium">{m.name}</span>
                                            <span className={`text-[10px] font-black ${m.color || 'text-gray-400'}`}>{m.label || m.val}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Compliance Tags */}
                    {vuln.control_tags && Object.keys(vuln.control_tags).length > 0 && (
                        <div className="px-6 py-3 border-b border-white/5">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Compliance Mapping</span>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(vuln.control_tags).map(([fw, ctrl]) => {
                                    const fw_labels = { owasp_top10: 'OWASP', cwe: 'CWE', iso27001_annex_a: 'ISO 27001', nist_csf_function: 'NIST CSF', pci_dss_requirement: 'PCI DSS', mitre_attack: 'MITRE ATT&CK' };
                                    return (
                                        <span key={fw} className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            <span className="font-black text-[8px] uppercase opacity-70">{fw_labels[fw] || fw}</span>
                                            {ctrl}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 5. AI Security Brief ─ the main enhanced section */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <SectionHeader icon={Brain} title="AI Security Brief" badge="Gemini AI" badgeColor="purple"
                            expanded={aiExpanded} onToggle={() => setAiExpanded(v => !v)} />

                        {aiExpanded && (
                            insightLoading ? (
                                <div className="flex items-center gap-3 py-6 text-gray-600 bg-purple-950/20 rounded-xl border border-purple-500/10 px-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-purple-400 shrink-0" />
                                    <span className="text-xs font-mono">Generating deep AI analysis...</span>
                                </div>
                            ) : insight ? (
                                <div className="space-y-3">

                                    {/* Attack Scenario */}
                                    <div className="rounded-xl border border-red-500/15 bg-red-950/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="h-3.5 w-3.5 text-red-400" />
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Attack Scenario</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{insight.attack_scenario}</p>
                                    </div>

                                    {/* Business Impact */}
                                    <div className="rounded-xl border border-orange-500/15 bg-orange-950/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
                                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Business Impact</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{insight.business_impact}</p>
                                    </div>

                                    {/* Step-by-step Remediation */}
                                    {insight.remediation_steps?.length > 0 && (
                                        <div className="rounded-xl border border-green-500/15 bg-green-950/10 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ListChecks className="h-3.5 w-3.5 text-green-400" />
                                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Remediation Steps</span>
                                            </div>
                                            <ol className="space-y-2">
                                                {insight.remediation_steps.map((step, i) => (
                                                    <li key={i} className="flex gap-3 text-sm">
                                                        <span className="shrink-0 w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black flex items-center justify-center mt-0.5">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-gray-300 leading-relaxed">{step}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {/* Detection Advice */}
                                    <div className="rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Detection &amp; Monitoring</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{insight.detection_advice}</p>
                                    </div>

                                    {/* Verify Fix */}
                                    <div className="rounded-xl border border-blue-500/15 bg-blue-950/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Search className="h-3.5 w-3.5 text-blue-400" />
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Verify the Fix</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{insight.verify_fix}</p>
                                    </div>

                                    {/* Legacy simple remediation fallback pill */}
                                    {(vuln.ai_remediation || vuln.remediation) && !insight.remediation_steps?.length && (
                                        <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4">
                                            <p className="text-gray-300 text-sm leading-relaxed italic">"{vuln.ai_remediation || vuln.remediation}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // No insight and not loading — show legacy simple remediation
                                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4">
                                    {vuln.ai_remediation || vuln.remediation ? (
                                        <p className="text-gray-300 text-sm leading-relaxed italic">"{vuln.ai_remediation || vuln.remediation}"</p>
                                    ) : (
                                        <p className="text-gray-600 text-xs font-mono">No AI advisory available for this finding.</p>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {/* 6. Proof of Concept */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <button onClick={() => setPocExpanded(v => !v)} className="flex items-center justify-between w-full group mb-3">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-cyber-accent" />
                                <span className="text-sm font-black text-white uppercase tracking-wider">Proof of Concept</span>
                                <span className="text-[9px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded font-bold uppercase">Nuclei</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {poc?.proof_of_concept && (
                                    <button onClick={(e) => { e.stopPropagation(); copyPoc(); }}
                                        className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Copy PoC">
                                        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                )}
                                {pocExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                        </button>
                        {pocExpanded && (
                            pocLoading ? (
                                <div className="flex items-center gap-3 py-6 text-gray-600">
                                    <Loader2 className="h-5 w-5 animate-spin text-cyber-accent" />
                                    <span className="text-xs font-mono">Fetching raw payload...</span>
                                </div>
                            ) : poc?.proof_of_concept ? (
                                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-[11px] text-green-300 overflow-x-auto leading-5 max-h-72 overflow-y-auto"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    {poc.proof_of_concept}
                                </pre>
                            ) : (
                                <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center text-gray-600 text-xs font-mono">
                                    No raw payload available for this finding.
                                </div>
                            )
                        )}
                    </div>

                    {/* 7. Technical Details (collapsible) */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <SectionHeader icon={Lock} title="Technical Details" badgeColor="gray"
                            expanded={techExpanded} onToggle={() => setTechExpanded(v => !v)} />
                        {techExpanded && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                    { label: 'Finding ID',   value: vuln.finding_id  || vuln.id },
                                    { label: 'Template',     value: vuln.template_id },
                                    { label: 'Parameter',    value: vuln.parameter },
                                    { label: 'Service',      value: vuln.service },
                                    { label: 'Port',         value: vuln.port },
                                    { label: 'Scan ID',      value: vuln.scan_id },
                                    { label: 'First Seen',   value: vuln.first_seen  ? new Date(vuln.first_seen).toLocaleString()  : vuln.created_at ? new Date(vuln.created_at).toLocaleString() : null },
                                    { label: 'Last Seen',    value: vuln.last_seen   ? new Date(vuln.last_seen).toLocaleString()   : null },
                                ].filter(r => r.value != null && r.value !== '').map(({ label, value }) => (
                                    <div key={label} className="bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                        <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">{label}</div>
                                        <div className="text-gray-300 font-mono truncate" title={String(value)}>{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 8. Actions */}
                    <div className="px-6 py-5">
                        <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Actions</h4>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleRevalidate} disabled={isRevalidating}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all disabled:opacity-50">
                                {isRevalidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Re-validate with AI
                            </button>
                            <button onClick={handleMarkFixed}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-all">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Mark as Fixed
                            </button>
                            <button onClick={handleMarkFP}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-bold hover:bg-gray-500/20 transition-all">
                                <XCircle className="h-3.5 w-3.5" />
                                False Positive
                            </button>
                            {cveId && (
                                <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 text-cyber-accent text-xs font-bold hover:bg-cyber-accent/20 transition-all">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    NVD Intel
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default IncidentDetailDrawer;
