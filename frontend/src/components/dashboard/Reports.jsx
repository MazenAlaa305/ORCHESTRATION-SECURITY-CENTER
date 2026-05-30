import React, { useState, useEffect } from 'react';
import { scanService, vulnerabilityService } from '../../services/api';
import { FileText, Loader, Download, CheckCircle, AlertTriangle, RefreshCw, Shield, Hash, Layers, FileCheck } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const SeverityBadge = ({ count, label, color }) => (
    <div className={`flex flex-col items-center p-3 rounded-lg border ${color}`}>
        <span className="text-2xl font-bold">{count ?? 0}</span>
        <span className="text-xs mt-1 opacity-70">{label}</span>
    </div>
);

const Reports = ({ refresh }) => {
    const [scans, setScans] = useState([]);
    const [selectedScan, setSelectedScan] = useState(null);
    const [reportMeta, setReportMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generatingFull, setGeneratingFull] = useState(false);
    const [error, setError] = useState(null);
    // 'scan' = summary shows the selected scan's vulns;
    // 'full' = summary shows every scan's open vulns (after Full Report click).
    const [summaryScope, setSummaryScope] = useState('scan');
    const { isAnalyst, role } = usePermission();
    const { addToast } = useToast();

    useEffect(() => {
        fetchScans();
    }, [refresh]);

    const fetchScans = async () => {
        try {
            setLoading(true);
            setError(null);
            // Phase 4: list is now `{items, total, page, page_size}`.
            const { data } = await scanService.getScans({ page: 1, page_size: 100, status: 'completed' });
            const completed = (data?.items || []).filter(s => String(s.status).toLowerCase() === 'completed');
            setScans(completed);
            if (completed.length > 0) {
                setSelectedScan(completed[0]);
                setReportMeta(null);
            }
        } catch (err) {
            setError('Failed to load scans. Is the backend running?');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [scanVulns, setScanVulns] = useState([]);

    // Load vulnerabilities. Scope follows summaryScope:
    //   'scan' → filter by selected scan.id
    //   'full' → no scan filter (every scan's open findings combined,
    //             matches what the Full Report PDF includes).
    useEffect(() => {
        if (!selectedScan) return;
        const params = summaryScope === 'full'
            ? { status: 'open', page_size: 500 }
            : { status: 'open', scan_id: selectedScan.id, page_size: 500 };
        vulnerabilityService.list(params)
            .then(res => {
                const items = res.data?.items ?? res.data ?? [];
                setScanVulns(Array.isArray(items) ? items : []);
            })
            .catch(() => setScanVulns([]));
    }, [selectedScan, refresh, summaryScope]);

    // Viewer policy: viewers are strictly read-only EXCEPT they may export
    // the cross-scan Full Report (an audit-trail download is the one
    // mutating action they're trusted with). The per-scan "Generate Report"
    // button requires analyst+.
    const blockedToast = (action, hint = 'requires analyst or admin role') =>
        addToast(
            `Read-only access — you're signed in as ${role}. ${action} ${hint}.`,
            { type: 'error', duration: 4500 }
        );

    const selectScan = (scan) => {
        setSelectedScan(scan);
        setReportMeta(null);
        setError(null);
        setSummaryScope('scan');
    };

    const generateReport = async () => {
        if (!selectedScan) return;
        if (!isAnalyst) { blockedToast('Generating a per-scan report', 'is analyst+; viewers can only export the Full Report'); return; }
        try {
            setGenerating(true);
            setError(null);
            setSummaryScope('scan');
            const { data } = await scanService.generateReport(selectedScan.id, false);
            setReportMeta(data);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Report generation failed. Check backend logs.';
            setError(msg);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const generateFullReport = async () => {
        if (!selectedScan) return;
        // Full Report is the one mutating action viewers are allowed to
        // perform — it's a signed audit-trail export, not a configuration
        // change. No role gate here.
        try {
            setGeneratingFull(true);
            setError(null);
            // Switch summary scope so the on-screen counts match the PDF.
            setSummaryScope('full');
            const { data } = await scanService.generateReport(selectedScan.id, true);
            setReportMeta(data);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Full report generation failed.';
            setError(msg);
            console.error(err);
        } finally {
            setGeneratingFull(false);
        }
    };

    const downloadPDF = async () => {
        if (!reportMeta?.report_id) return;
        try {
            const { data } = await scanService.downloadReportPDF(reportMeta.report_id);
            const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${reportMeta.report_id.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('PDF download failed. Try generating the report again.');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-cyber-accent">
                <Loader className="h-10 w-10 animate-spin" />
            </div>
        );
    }

    if (scans.length === 0) {
        return (
            <div className="text-center py-16 bg-cyber-light rounded-xl border border-gray-700">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No completed scans yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Run a scan and wait for it to complete — then come back here to generate a PDF for execs, technical staff, or compliance.
                </p>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate',
                        { detail: { tab: 'operations', sub: 'scanner' } }))}
                    className="px-4 py-2 rounded-lg bg-cyan-400 text-gray-900 text-xs font-black uppercase tracking-wider hover:bg-sky-300 transition-colors"
                >
                    Run your first scan
                </button>
            </div>
        );
    }

    const vulns = scanVulns;
    const critical = vulns.filter(v => String(v.severity).toLowerCase() === 'critical').length;
    const high     = vulns.filter(v => String(v.severity).toLowerCase() === 'high').length;
    const medium   = vulns.filter(v => String(v.severity).toLowerCase() === 'medium').length;
    const low      = vulns.filter(v => String(v.severity).toLowerCase() === 'low').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Scan list */}
            <div className="bg-cyber-light rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyber-accent" />
                        Completed Scans
                    </h3>
                    <button onClick={fetchScans} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {scans.map((scan) => (
                        <div
                            key={scan.id}
                            onClick={() => selectScan(scan)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                selectedScan?.id === scan.id
                                    ? 'bg-cyber-accent/10 border-cyber-accent text-white'
                                    : 'bg-gray-800/50 border-transparent text-gray-400 hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm truncate max-w-[120px]">
                                    {scan.target_url || scan.target || `Scan #${scan.id.slice(0,8)}`}
                                </span>
                                <span className="text-xs font-mono text-gray-500">
                                    {scan.completed_at ? new Date(scan.completed_at).toLocaleDateString() : '—'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-green-400">Completed</span>
                                {scan.risk_score != null && (
                                    <span className="text-xs text-gray-500">Risk: {Number(scan.risk_score).toFixed(1)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Report viewer */}
            <div className="md:col-span-2 bg-cyber-light rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                {selectedScan ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-gray-700 bg-gray-900/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {selectedScan.target_url || selectedScan.target || `Scan ${selectedScan.id.slice(0,8)}`}
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    Completed: {selectedScan.completed_at
                                        ? new Date(selectedScan.completed_at).toLocaleString()
                                        : 'Unknown'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {reportMeta && (
                                    <button
                                        onClick={downloadPDF}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-cyber-accent text-gray-900 rounded font-bold text-sm hover:bg-white transition-colors"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export PDF
                                    </button>
                                )}
                                <button
                                    onClick={generateReport}
                                    disabled={generating || generatingFull || !isAnalyst}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-600 text-white rounded font-bold text-sm transition-colors"
                                    title={!isAnalyst
                                        ? 'admin / analyst only — viewers may only export the Full Report'
                                        : 'Generate a signed PDF report for the currently selected scan'}
                                >
                                    {generating
                                        ? <><Loader className="h-4 w-4 animate-spin" /> Generating…</>
                                        : <><FileCheck className="h-4 w-4" /> Generate Report</>}
                                </button>
                                <button
                                    onClick={generateFullReport}
                                    disabled={generating || generatingFull}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded font-bold text-sm transition-colors"
                                    title="Generate a report combining findings from all scans (available to all roles)"
                                >
                                    {generatingFull
                                        ? <><Loader className="h-4 w-4 animate-spin" /> Generating…</>
                                        : <><Layers className="h-4 w-4" /> Full Report</>}
                                </button>
                            </div>
                        </div>
                        {!isAnalyst && (
                            <p className="px-6 pt-2 text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
                                Generate Report is admin / analyst only — viewers can use Full Report.
                            </p>
                        )}

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Vulnerability summary */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Vulnerability Summary</h3>
                                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${
                                        summaryScope === 'full'
                                            ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700'
                                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                                    }`}>
                                        {summaryScope === 'full' ? 'Full Report scope · all scans' : 'Selected scan only'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <SeverityBadge count={critical} label="Critical" color="border-red-700 text-red-400 bg-red-900/20" />
                                    <SeverityBadge count={high}     label="High"     color="border-orange-700 text-orange-400 bg-orange-900/20" />
                                    <SeverityBadge count={medium}   label="Medium"   color="border-yellow-700 text-yellow-400 bg-yellow-900/20" />
                                    <SeverityBadge count={low}      label="Low"      color="border-blue-700 text-blue-400 bg-blue-900/20" />
                                </div>
                            </div>

                            {/* Report metadata (shown after generation) */}
                            {reportMeta ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-400">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-bold">Report generated successfully</span>
                                    </div>
                                    <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-4 space-y-3 font-mono text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Report ID</span>
                                            <span className="text-white">{reportMeta.report_id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Generated</span>
                                            <span className="text-white">
                                                {reportMeta.generated_at
                                                    ? new Date(reportMeta.generated_at).toLocaleString()
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Digitally Signed</span>
                                            <span className={reportMeta.signed ? 'text-green-400' : 'text-yellow-400'}>
                                                {reportMeta.signed ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-gray-500 flex-shrink-0 flex items-center gap-1">
                                                <Hash className="h-3 w-3" /> Findings Hash
                                            </span>
                                            <span className="text-cyber-accent break-all text-right text-xs">
                                                {reportMeta.findings_hash || '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        Click <strong className="text-white">Export PDF</strong> above to download the signed report.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-gray-700 rounded-xl">
                                    <Shield className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm">
                                        Click <strong className="text-white">Generate Report</strong> to build a signed PDF report for this scan.
                                    </p>
                                </div>
                            )}

                            {/* Findings list */}
                            {vulns.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Findings ({vulns.length})</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {vulns.map((v, i) => (
                                            <div key={v.id || i} className="flex items-center justify-between p-3 bg-gray-900/40 rounded-lg border border-gray-800">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{v.title || v.type || v.template_id || 'Vulnerability'}</p>
                                                    <p className="text-xs text-gray-500 truncate">{v.url || v.host || '—'}</p>
                                                </div>
                                                <span className={`ml-3 text-xs font-bold px-2 py-0.5 rounded ${
                                                    String(v.severity).toLowerCase() === 'critical' ? 'bg-red-900/50 text-red-400' :
                                                    String(v.severity).toLowerCase() === 'high'     ? 'bg-orange-900/50 text-orange-400' :
                                                    String(v.severity).toLowerCase() === 'medium'   ? 'bg-yellow-900/50 text-yellow-400' :
                                                    'bg-blue-900/50 text-blue-400'
                                                }`}>
                                                    {v.severity}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-gray-500">
                        <FileText className="h-12 w-12 mb-4" />
                        <p>Select a scan from the list</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
