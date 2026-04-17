import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    X, Target, Settings, Zap, Clock, Network, Brain, Shield, Radar,
    Activity, FileText, Calendar, AlertCircle,
} from 'lucide-react';

import api, { targetService } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

const TABS = [
    { id: 'target',   label: 'Target',    icon: Target },
    { id: 'type',     label: 'Scan Type', icon: Settings },
    { id: 'tools',    label: 'Tools',     icon: Zap },
    { id: 'schedule', label: 'Schedule',  icon: Clock },
];

const SCAN_TYPES = [
    { id: 'quick',    label: 'Quick',    desc: 'Nmap only — top 1000 ports', duration: '~2 min' },
    { id: 'standard', label: 'Standard', desc: 'Nmap + Nuclei', duration: '~10 min' },
    { id: 'full',     label: 'Full',     desc: 'Nmap + Nuclei + AI Validation', duration: '~20 min' },
    { id: 'custom',   label: 'Custom',   desc: 'Pick tools below', duration: 'Varies' },
];

const TOOL_DEFS = [
    { id: 'nmap',          label: 'Nmap',          icon: Network, flag: 'nmap_enabled' },
    { id: 'nuclei',        label: 'Nuclei',        icon: Shield,  flag: 'nuclei_enabled' },
    { id: 'openvas',       label: 'OpenVAS',       icon: Radar,   flag: 'openvas_enabled' },
    { id: 'ai_validation', label: 'AI Validation', icon: Brain,   flag: 'llm_validation_enabled' },
];

const ScanConfigModal = ({ open, onClose, onStarted, prefilledTarget }) => {
    const cfg = useConfig();
    const [activeTab, setActiveTab] = useState('target');
    const [targetMode, setTargetMode] = useState(prefilledTarget ? 'existing' : 'url');
    const [selectedTargetId, setSelectedTargetId] = useState(prefilledTarget?.id || '');
    const [targetUrl, setTargetUrl] = useState(prefilledTarget?.base_url || '');
    const [scanType, setScanType] = useState('standard');
    const [tools, setTools] = useState(['nmap', 'nuclei']);
    const [schedule, setSchedule] = useState('');
    const [autoReport, setAutoReport] = useState(false);
    const [soarTrigger, setSoarTrigger] = useState(false);
    const [siemForward, setSiemForward] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const { data: targets = [] } = useQuery({
        queryKey: ['targets'],
        queryFn: () => targetService.list().then(r => r.data),
        enabled: open,
    });

    useEffect(() => {
        if (scanType === 'quick')    setTools(['nmap']);
        if (scanType === 'standard') setTools(['nmap', 'nuclei']);
        if (scanType === 'full')     setTools(['nmap', 'nuclei', 'ai_validation']);
    }, [scanType]);

    useEffect(() => {
        if (!open) {
            setActiveTab('target');
            setError(null);
        }
    }, [open]);

    if (!open) return null;

    const toggleTool = (id) => {
        setScanType('custom');
        setTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                scan_type: scanType,
                tools: scanType === 'custom' ? tools : null,
                auto_report: autoReport,
                soar_trigger: soarTrigger,
                siem_forward: siemForward,
            };
            if (targetMode === 'existing') payload.target_id = selectedTargetId;
            else payload.target_url = targetUrl.trim();

            if (schedule) {
                payload.schedule = schedule;
                await api.post('/scans/schedule', payload);
            } else {
                await api.post('/scans/', payload);
            }
            if (onStarted) onStarted();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = (targetMode === 'existing' ? selectedTargetId : targetUrl.trim())
        && (scanType !== 'custom' || tools.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
            <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Activity className="text-cyan-400" size={18} />
                        <h2 className="text-white text-sm font-semibold uppercase tracking-wider">New Scan</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                                activeTab === id
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Icon size={12} /> {label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && (
                        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle size={12} /> {error}
                        </div>
                    )}

                    {/* Tab: Target */}
                    {activeTab === 'target' && (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTargetMode('existing')}
                                    className={`px-3 py-1.5 rounded text-xs ${targetMode === 'existing' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                                >
                                    Existing target
                                </button>
                                <button
                                    onClick={() => setTargetMode('url')}
                                    className={`px-3 py-1.5 rounded text-xs ${targetMode === 'url' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                                >
                                    Manual URL / IP
                                </button>
                            </div>
                            {targetMode === 'existing' ? (
                                <select
                                    value={selectedTargetId}
                                    onChange={(e) => setSelectedTargetId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                                >
                                    <option value="">Select a target…</option>
                                    {targets.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} — {t.base_url}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://example.com or 10.0.0.1"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono focus:border-cyan-400 outline-none"
                                />
                            )}
                        </div>
                    )}

                    {/* Tab: Scan Type */}
                    {activeTab === 'type' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SCAN_TYPES.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setScanType(opt.id)}
                                    className={`text-left p-3 rounded border transition-colors ${
                                        scanType === opt.id
                                            ? 'bg-cyan-500/10 border-cyan-500/40'
                                            : 'bg-black/20 border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm font-semibold uppercase">{opt.label}</span>
                                        <span className="text-gray-500 text-[10px]">{opt.duration}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tab: Tools */}
                    {activeTab === 'tools' && (
                        <div className="space-y-2">
                            <p className="text-gray-400 text-xs mb-3">
                                Selecting a tool switches to Custom mode. Tools disabled in settings are grayed out.
                            </p>
                            {TOOL_DEFS.map(({ id, label, icon: Icon, flag }) => {
                                const available = cfg[flag];
                                const checked = tools.includes(id);
                                return (
                                    <label
                                        key={id}
                                        className={`flex items-center justify-between p-3 rounded border ${
                                            available ? 'bg-black/20 border-white/10 cursor-pointer hover:border-white/20' : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={16} className="text-cyan-400" />
                                            <div>
                                                <div className="text-white text-sm font-medium">{label}</div>
                                                {!available && <div className="text-yellow-400 text-[10px]">Disabled in Settings</div>}
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!available}
                                            onChange={() => toggleTool(id)}
                                            className="accent-cyan-400 w-4 h-4"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab: Schedule */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar size={12} /> Cron expression (leave empty for one-off)
                                </span>
                                <input
                                    type="text"
                                    value={schedule}
                                    onChange={(e) => setSchedule(e.target.value)}
                                    placeholder="0 2 * * *  (every day at 02:00)"
                                    className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono focus:border-cyan-400 outline-none"
                                />
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/10">
                                    <span className="text-white text-sm flex items-center gap-2"><FileText size={14} /> Auto-generate PDF report</span>
                                    <input type="checkbox" checked={autoReport} onChange={e => setAutoReport(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                                </label>
                                <label className={`flex items-center justify-between p-2 rounded bg-black/20 border border-white/10 ${!cfg.soar_enabled ? 'opacity-50' : ''}`}>
                                    <span className="text-white text-sm flex items-center gap-2"><Zap size={14} /> SOAR trigger on critical (n8n)</span>
                                    <input type="checkbox" checked={soarTrigger} disabled={!cfg.soar_enabled} onChange={e => setSoarTrigger(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                                </label>
                                <label className={`flex items-center justify-between p-2 rounded bg-black/20 border border-white/10 ${!cfg.siem_enabled ? 'opacity-50' : ''}`}>
                                    <span className="text-white text-sm flex items-center gap-2"><Activity size={14} /> Forward findings to SIEM</span>
                                    <input type="checkbox" checked={siemForward} disabled={!cfg.siem_enabled} onChange={e => setSiemForward(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
                    <div className="text-gray-500 text-xs font-mono">
                        {scanType.toUpperCase()} · {tools.length} tool{tools.length !== 1 ? 's' : ''}
                        {schedule && ` · scheduled`}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 rounded bg-white/5 text-gray-300 text-xs hover:bg-white/10">
                            Cancel
                        </button>
                        <button
                            onClick={submit}
                            disabled={!canSubmit || submitting}
                            className="px-4 py-1.5 rounded bg-cyan-400 text-gray-900 text-xs font-bold hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Starting…' : (schedule ? 'Save Schedule' : 'Start Scan')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanConfigModal;
