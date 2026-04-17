import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Activity, AlertTriangle, Brain, CheckCircle, Database, FlaskConical,
    Network, Play, Radar, RefreshCw, Server, Settings as SettingsIcon,
    Shield, StopCircle, Zap, XCircle,
} from 'lucide-react';

import { fetchAllConfig, fetchIntegrationHealth, updateConfig } from '../../api/config';
import { labService } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

const TOOL_TOGGLES = [
    { key: 'OPENVAS_ENABLED',        label: 'OpenVAS Scanner',   icon: Radar,     desc: 'Network vulnerability scanner (GVM/GMP)' },
    { key: 'SIEM_ENABLED',           label: 'SIEM Integration',  icon: Activity,  desc: 'Elasticsearch + Wazuh event pipeline' },
    { key: 'SOAR_ENABLED',           label: 'SOAR Automation',   icon: Zap,       desc: 'n8n webhook for automated response' },
    { key: 'LLM_VALIDATION_ENABLED', label: 'LLM AI Validation', icon: Brain,     desc: 'Gemini triage of findings (never overrides reprobe)' },
    { key: 'NMAP_ENABLED',           label: 'Nmap Scanning',     icon: Network,   desc: 'Port and service discovery' },
    { key: 'NUCLEI_ENABLED',         label: 'Nuclei Scanning',   icon: Shield,    desc: 'Template-driven vulnerability scanner' },
];

const HEALTH_STYLES = {
    connected:      { icon: CheckCircle,    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30', label: 'CONNECTED' },
    configured:     { icon: CheckCircle,    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30', label: 'CONFIGURED' },
    unreachable:    { icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',   label: 'UNREACHABLE' },
    not_configured: { icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30',label: 'NOT CONFIGURED' },
    disabled:       { icon: XCircle,        color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',  label: 'DISABLED' },
};

// ── Toggle switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? 'bg-cyan-500' : 'bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

// ── Section header ───────────────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/5">
        <Icon className="text-cyan-400" size={18} />
        <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
        </div>
    </div>
);

// ── Section 1: Tool Toggles ──────────────────────────────────────────────────
const ToolToggles = ({ flags, onToggle, busy }) => {
    const getValue = (key) => flags.find(f => f.key === key)?.value === true;
    return (
        <div className="glass-card p-4">
            <SectionTitle icon={SettingsIcon} title="Tool Toggles" subtitle="Enable or disable scan tools and integrations at runtime" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TOOL_TOGGLES.map(({ key, label, icon: Icon, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded bg-black/20 border border-white/5">
                        <div className="flex items-center gap-3">
                            <Icon size={16} className="text-cyan-400" />
                            <div>
                                <div className="text-white text-sm font-medium">{label}</div>
                                <div className="text-gray-500 text-xs">{desc}</div>
                            </div>
                        </div>
                        <Toggle
                            checked={getValue(key)}
                            disabled={busy === key}
                            onChange={(v) => onToggle(key, v)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Section 2: Scan Defaults ─────────────────────────────────────────────────
const ScanDefaults = ({ flags, onUpdate }) => {
    const get = (key, fallback) => flags.find(f => f.key === key)?.value ?? fallback;
    const [daily, setDaily] = useState(get('LLM_DAILY_TOKEN_BUDGET', 500000));
    const [perScan, setPerScan] = useState(get('LLM_PER_SCAN_TOKEN_BUDGET', 50000));

    useEffect(() => {
        setDaily(get('LLM_DAILY_TOKEN_BUDGET', 500000));
        setPerScan(get('LLM_PER_SCAN_TOKEN_BUDGET', 50000));
    }, [flags]);

    return (
        <div className="glass-card p-4">
            <SectionTitle icon={Brain} title="Scan & LLM Defaults" subtitle="Per-scan and per-day limits enforced by the orchestrator" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Daily LLM Token Budget</span>
                    <input
                        type="number"
                        value={daily}
                        onChange={(e) => setDaily(Number(e.target.value))}
                        onBlur={() => onUpdate('LLM_DAILY_TOKEN_BUDGET', daily)}
                        className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Per-Scan LLM Token Cap</span>
                    <input
                        type="number"
                        value={perScan}
                        onChange={(e) => setPerScan(Number(e.target.value))}
                        onBlur={() => onUpdate('LLM_PER_SCAN_TOKEN_BUDGET', perScan)}
                        className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                    />
                </label>
            </div>
        </div>
    );
};

// ── Section 3: Lab Controls ──────────────────────────────────────────────────
const LabControls = ({ flags, onUpdate }) => {
    const qc = useQueryClient();
    const intensity = flags.find(f => f.key === 'LAB_TRAFFIC_INTENSITY')?.value || 'medium';

    const { data: status, refetch, isFetching } = useQuery({
        queryKey: ['lab-status'],
        queryFn: () => labService.getStatus().then(r => r.data),
        refetchInterval: 15_000,
    });

    const seedMutation = useMutation({
        mutationFn: () => labService.seedTargets(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['targets'] }),
    });

    const running = status?.running ?? 0;
    const total   = status?.total ?? 0;

    return (
        <div className="glass-card p-4">
            <SectionTitle icon={FlaskConical} title="Lab Environment Controls" subtitle="Living lab container lifecycle" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="p-3 rounded bg-black/20 border border-white/5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Containers</div>
                    <div className="text-2xl font-bold text-cyan-400">{running}/{total}</div>
                </div>
                <div className="p-3 rounded bg-black/20 border border-white/5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Overall</div>
                    <div className={`text-lg font-mono ${status?.overall_status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {(status?.overall_status || 'unknown').toUpperCase()}
                    </div>
                </div>
                <label className="p-3 rounded bg-black/20 border border-white/5 flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Traffic Intensity</span>
                    <select
                        value={intensity}
                        onChange={(e) => onUpdate('LAB_TRAFFIC_INTENSITY', e.target.value)}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 mt-1 text-white text-sm focus:border-cyan-400 outline-none"
                    >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                    </select>
                </label>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    className="px-3 py-1.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-1.5 hover:bg-cyan-500/30 disabled:opacity-50"
                >
                    <Play size={12} /> Seed Targets
                </button>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-gray-300 text-xs flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-50"
                >
                    <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh Status
                </button>
            </div>
            {seedMutation.isSuccess && (
                <div className="mt-2 text-xs text-green-400">
                    Seed complete: {seedMutation.data?.data?.count || 0} targets processed.
                </div>
            )}
        </div>
    );
};

// ── Section 4: Integration Status ────────────────────────────────────────────
const IntegrationStatus = () => {
    const { data, refetch, isFetching } = useQuery({
        queryKey: ['integration-health'],
        queryFn: fetchIntegrationHealth,
        refetchInterval: 30_000,
    });

    const items = data?.integrations || {};

    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Database className="text-cyan-400" size={18} />
                    <div>
                        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Integration Health</h3>
                        <p className="text-gray-500 text-xs">Live reachability probe of every configured service</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={`text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(items).map(([name, info]) => {
                    const style = HEALTH_STYLES[info.status] || HEALTH_STYLES.unreachable;
                    const Icon = style.icon;
                    return (
                        <div key={name} className={`flex items-center justify-between p-2.5 rounded ${style.bg} border ${style.border}`}>
                            <div>
                                <div className="text-white text-sm font-mono uppercase">{name}</div>
                                <div className="text-gray-400 text-xs truncate max-w-xs">{info.detail}</div>
                            </div>
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${style.color}`}>
                                <Icon size={14} /> {style.label}
                            </div>
                        </div>
                    );
                })}
                {Object.keys(items).length === 0 && (
                    <div className="col-span-2 text-gray-500 text-sm text-center py-4">
                        {isFetching ? 'Probing integrations…' : 'No health data.'}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Settings Panel ──────────────────────────────────────────────────────
const SettingsPanel = () => {
    const { refreshConfig } = useConfig();
    const [busyKey, setBusyKey] = useState(null);
    const [error, setError] = useState(null);
    const qc = useQueryClient();

    const { data, refetch, isLoading, isError } = useQuery({
        queryKey: ['all-config'],
        queryFn: fetchAllConfig,
    });

    const flags = data?.flags || [];

    const mutate = async (key, value) => {
        setBusyKey(key);
        setError(null);
        try {
            await updateConfig(key, value);
            await refetch();
            refreshConfig();
            qc.invalidateQueries({ queryKey: ['integration-health'] });
        } catch (err) {
            setError(err?.response?.data?.detail || err.message);
        } finally {
            setBusyKey(null);
        }
    };

    if (isLoading) {
        return (
            <div className="glass-card p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="glass-card p-8 text-center">
                <AlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
                <p className="text-red-300 text-sm">Failed to load config. Admin role required.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {error && (
                <div className="glass-card p-3 bg-red-500/10 border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}
            <ToolToggles flags={flags} onToggle={mutate} busy={busyKey} />
            <ScanDefaults flags={flags} onUpdate={mutate} />
            <LabControls flags={flags} onUpdate={mutate} />
            <IntegrationStatus />
        </div>
    );
};

export default SettingsPanel;
