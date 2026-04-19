import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Shield, AlertTriangle, CheckCircle, XCircle, ExternalLink,
    Code, Brain, RefreshCw, Loader2, ChevronDown, ChevronUp,
    Copy, Check, ShieldX, Zap
} from 'lucide-react';
import { vulnerabilityService, findingsService } from '../../services/api';

const SEV_CONFIG = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40', label: 'CRITICAL', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' },
    high:     { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', label: 'HIGH', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]' },
    medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', label: 'MEDIUM', glow: '' },
    low:      { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40', label: 'LOW', glow: '' },
    info:     { color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/40', label: 'INFO', glow: '' },
};

/**
 * IncidentDetailDrawer
 * Full side-drawer for CVE / vulnerability deep dive.
 * Includes: AI Remediation, Raw PoC (Nuclei), Actions, CVE Intel.
 *
 * @param {object} vuln — vulnerability object from the API
 * @param {function} onClose — close handler
 */
const IncidentDetailDrawer = ({ vuln, onClose }) => {
    const [poc, setPoc] = useState(null);
    const [pocLoading, setPocLoading] = useState(false);
    const [pocExpanded, setPocExpanded] = useState(true);
    const [aiExpanded, setAiExpanded] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [actionMsg, setActionMsg] = useState(null);

    const sev = SEV_CONFIG[(vuln?.severity || 'info').toLowerCase()] || SEV_CONFIG.info;
    const cveId = vuln?.cve_id || vuln?.type?.match(/CVE-\d{4}-\d+/)?.[0];

    // Fetch PoC on open
    useEffect(() => {
        if (!vuln?.id) return;
        setPocLoading(true);
        vulnerabilityService.getPoc(vuln.id)
            .then(res => setPoc(res.data))
            .catch(() => setPoc(null))
            .finally(() => setPocLoading(false));
    }, [vuln?.id]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleRevalidate = async () => {
        setIsRevalidating(true);
        setActionMsg(null);
        try {
            await vulnerabilityService.revalidate(vuln.id);
            setActionMsg({ type: 'success', text: 'Re-validation queued successfully' });
        } catch {
            setActionMsg({ type: 'error', text: 'Failed to queue re-validation' });
        } finally {
            setIsRevalidating(false);
        }
    };

    const handleMarkFixed = async () => {
        try {
            await vulnerabilityService.markFixed(vuln.id);
            setActionMsg({ type: 'success', text: 'Marked as fixed' });
        } catch {
            setActionMsg({ type: 'error', text: 'Failed to update status' });
        }
    };

    const handleMarkFP = async () => {
        try {
            await vulnerabilityService.markFalsePositive(vuln.id);
            setActionMsg({ type: 'success', text: 'Marked as false positive' });
        } catch {
            setActionMsg({ type: 'error', text: 'Failed to update status' });
        }
    };

    const copyPoc = useCallback(() => {
        navigator.clipboard.writeText(poc?.proof_of_concept || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [poc]);

    if (!vuln) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl flex flex-col bg-cyber-dark border-l ${sev.border} ${sev.glow} animate-slide-in-right overflow-hidden`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b border-white/10 ${sev.bg} shrink-0`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${sev.bg} ${sev.color} ${sev.border}`}>
                                    {sev.label}
                                </span>
                                {cveId && (
                                    <a
                                        href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] text-cyber-accent/70 hover:text-cyber-accent border border-cyber-accent/20 hover:border-cyber-accent/40 rounded px-2 py-0.5 transition-colors font-mono"
                                    >
                                        {cveId} <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                )}
                            </div>
                            <h2 className="text-white font-black text-lg tracking-tight mt-1">
                                {vuln.title || vuln.type || 'Unknown Vulnerability'}
                            </h2>
                            <p className="text-gray-500 text-xs font-mono mt-0.5">{vuln.url}</p>
                            {(vuln.host || vuln.port) && (
                                <p className="text-gray-600 text-xs font-mono mt-0.5">
                                    {vuln.host}{vuln.port ? `:${vuln.port}` : ''}{vuln.service ? ` (${vuln.service})` : ''}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Action Message */}
                    {actionMsg && (
                        <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-bold ${actionMsg.type === 'success' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            {actionMsg.text}
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* ─── 1. Quick Meta Row ─── */}
                    <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-white/5">
                        {vuln.cvss_score != null && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">CVSS Score</span>
                                <span className={`text-sm font-black font-mono ${vuln.cvss_score >= 9 ? 'text-red-400' : vuln.cvss_score >= 7 ? 'text-orange-400' : vuln.cvss_score >= 4 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                    {vuln.cvss_score.toFixed(1)} / 10
                                </span>
                                {vuln.cvss_vector && (
                                    <span className="text-[8px] text-gray-600 font-mono truncate" title={vuln.cvss_vector}>
                                        {vuln.cvss_vector}
                                    </span>
                                )}
                            </div>
                        )}
                        {vuln.confidence_score != null && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Confidence</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyber-neon to-cyber-vibrant"
                                            style={{ width: `${(vuln.confidence_score * 100).toFixed(0)}%` }}
                                        />
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

                    {/* ─── 2. Description ─── */}
                    {vuln.description && (
                        <div className="px-6 py-4 border-b border-white/5">
                            <p className="text-gray-400 text-sm leading-relaxed">{vuln.description}</p>
                        </div>
                    )}

                    {/* ─── 2b. Compliance Tags ─── */}
                    {vuln.control_tags && Object.keys(vuln.control_tags).length > 0 && (
                        <div className="px-6 py-3 border-b border-white/5">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Compliance Mapping</span>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(vuln.control_tags).map(([framework, control]) => {
                                    const labels = {
                                        owasp_top10: 'OWASP',
                                        cwe: 'CWE',
                                        iso27001_annex_a: 'ISO 27001',
                                        nist_csf_function: 'NIST CSF',
                                        pci_dss_requirement: 'PCI DSS',
                                    };
                                    return (
                                        <span key={framework}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            <span className="font-black text-[8px] uppercase opacity-70">{labels[framework] || framework}</span>
                                            {control}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── 3. AI Remediation Panel ─── */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <button
                            onClick={() => setAiExpanded(!aiExpanded)}
                            className="flex items-center justify-between w-full group mb-3"
                        >
                            <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-400" />
                                <span className="text-sm font-black text-white uppercase tracking-wider">AI Remediation Advice</span>
                                <span className="text-[9px] px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-bold uppercase">Gemini AI</span>
                            </div>
                            {aiExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </button>

                        {aiExpanded && (
                            <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4 space-y-2">
                                {vuln.ai_remediation || vuln.remediation ? (
                                    <p className="text-gray-300 text-sm leading-relaxed italic">
                                        "{vuln.ai_remediation || vuln.remediation}"
                                    </p>
                                ) : (
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                        <span className="text-xs font-mono">Generating AI advisory...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── 4. Proof of Concept (Nuclei Raw) ─── */}
                    <div className="px-6 py-4 border-b border-white/5">
                        <button
                            onClick={() => setPocExpanded(!pocExpanded)}
                            className="flex items-center justify-between w-full group mb-3"
                        >
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-cyber-accent" />
                                <span className="text-sm font-black text-white uppercase tracking-wider">Proof of Concept</span>
                                <span className="text-[9px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded font-bold uppercase">Nuclei</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {poc?.proof_of_concept && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyPoc(); }}
                                        className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                        title="Copy PoC"
                                    >
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
                                <pre
                                    className="bg-black/60 border border-white/10 rounded-xl p-4 text-[11px] text-green-300 overflow-x-auto leading-5 max-h-72 overflow-y-auto"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    {poc.proof_of_concept}
                                </pre>
                            ) : (
                                <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center text-gray-600 text-xs font-mono">
                                    No raw payload available for this finding.
                                </div>
                            )
                        )}
                    </div>

                    {/* ─── 5. Action Toolbar ─── */}
                    <div className="px-6 py-5">
                        <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Actions</h4>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleRevalidate}
                                disabled={isRevalidating}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all disabled:opacity-50"
                            >
                                {isRevalidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Re-validate with AI
                            </button>
                            <button
                                onClick={handleMarkFixed}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-all"
                            >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Mark as Fixed
                            </button>
                            <button
                                onClick={handleMarkFP}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-bold hover:bg-gray-500/20 transition-all"
                            >
                                <XCircle className="h-3.5 w-3.5" />
                                False Positive
                            </button>
                            {cveId && (
                                <a
                                    href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 text-cyber-accent text-xs font-bold hover:bg-cyber-accent/20 transition-all"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    NVD Intel
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default IncidentDetailDrawer;
