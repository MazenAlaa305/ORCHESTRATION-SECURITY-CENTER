import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { backdrop as backdropV, modalBody as modalBodyV } from '../../lib/motion';
import {
    X, Target as TargetIcon, Zap, Clock, Network, Shield, Radar, Brain,
    Activity, FileText, AlertCircle, Check, ChevronDown, ChevronRight,
    Sparkles, Eye,
} from 'lucide-react';

import api, { targetService } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../ToastProvider';

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
    { id: 'target',   label: 'Target',   icon: TargetIcon, help: 'Who are we scanning?' },
    { id: 'profile',  label: 'Profile',  icon: Zap,        help: 'How deep?' },
    { id: 'schedule', label: 'Schedule', icon: Clock,      help: 'Now or recurring?' },
    { id: 'review',   label: 'Review',   icon: Eye,        help: 'Confirm & launch.' },
];

const SCAN_PROFILES = [
    { id: 'quick',    label: 'Quick',    duration: '~2 min',  tools: ['nmap'],
      blurb: 'Top-1000 port sweep. Use for liveness / triage.' },
    { id: 'standard', label: 'Standard', duration: '~10 min', tools: ['nmap', 'nuclei'],
      blurb: 'Port sweep + Nuclei template checks. The daily driver.' },
    { id: 'full',     label: 'Full',     duration: '~20 min', tools: ['nmap', 'nuclei', 'ai_validation'],
      blurb: 'Standard plus AI-powered validation of each finding.' },
];

const TOOL_DEFS = [
    { id: 'nmap',          label: 'Nmap',          icon: Network, flag: 'nmap_enabled',
      desc: 'Port discovery & service detection.' },
    { id: 'nuclei',        label: 'Nuclei',        icon: Shield,  flag: 'nuclei_enabled',
      desc: 'Template-based vulnerability checks.' },
    { id: 'openvas',       label: 'OpenVAS',       icon: Radar,   flag: 'openvas_enabled',
      desc: 'Authenticated vulnerability scanner.' },
    { id: 'ai_validation', label: 'AI Validation', icon: Brain,   flag: 'llm_validation_enabled',
      desc: 'LLM agent re-checks each finding to suppress false positives.' },
];

const SCHEDULE_PRESETS = [
    { id: 'oneoff',  label: 'Run once (now)',      cron: '' },
    { id: 'daily',   label: 'Every day at 02:00',  cron: '0 2 * * *' },
    { id: 'weekly',  label: 'Every Monday 02:00',  cron: '0 2 * * 1' },
    { id: 'hourly',  label: 'Every hour',          cron: '0 * * * *' },
    { id: 'custom',  label: 'Custom cron…',        cron: null },
];

// Lab demo environment — selecting this mode fans the scan out to one
// scan per subnet (4 separate POSTs to /scans/) so the History tab
// records "DMZ scan", "CORP scan", etc. as distinct rows instead of
// hiding everything inside a single multi-CIDR job.
const LAB_SUBNETS = [
    { id: 'dmz',  label: 'DMZ',  cidr: '10.10.10.0/24', zone: 'Internet-facing services'  },
    { id: 'corp', label: 'CORP', cidr: '10.10.20.0/24', zone: 'Corporate office tier'     },
    { id: 'data', label: 'DATA', cidr: '10.10.30.0/24', zone: 'Database & cache tier'     },
    { id: 'mgmt', label: 'MGMT', cidr: '10.10.40.0/24', zone: 'Management & monitoring'   },
];

// RFC-1123 hostname / IPv4 / URL — lenient but catches pure typos
const TARGET_PATTERN = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?(:\d{1,5})?(\/.*)?$|^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?(:\d{1,5})?$/i;

// ── Presentational helpers ────────────────────────────────────────────────────
const Stepper = ({ active, visited, onJump }) => (
    <div className="flex items-center gap-1 px-5 py-3 border-b border-white/5 bg-black/20">
        {STEPS.map((s, i) => {
            const isActive = s.id === active;
            const isVisited = visited.has(s.id);
            const canJump = isVisited || isActive;
            const Icon = s.icon;
            return (
                <React.Fragment key={s.id}>
                    <button
                        type="button"
                        onClick={() => canJump && onJump(s.id)}
                        disabled={!canJump}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            isActive
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                : isVisited
                                    ? 'text-gray-300 hover:bg-white/5 border border-transparent'
                                    : 'text-gray-600 cursor-not-allowed border border-transparent'
                        }`}
                    >
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                            isActive ? 'bg-cyan-400 text-gray-900' : isVisited ? 'bg-white/10 text-white' : 'bg-white/5'
                        }`}>
                            {isVisited && !isActive ? <Check size={12} /> : i + 1}
                        </span>
                        <span className="hidden md:inline">{s.label}</span>
                        <Icon size={12} className="md:hidden" />
                    </button>
                    {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-700" />}
                </React.Fragment>
            );
        })}
    </div>
);

const StepHeader = ({ stepId }) => {
    const step = STEPS.find(s => s.id === stepId);
    if (!step) return null;
    const Icon = step.icon;
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon size={14} className="text-cyan-400" />
            <h3 className="text-white text-sm font-semibold">{step.label}</h3>
            <span className="text-gray-500 text-xs">— {step.help}</span>
        </div>
    );
};

const ErrorBanner = ({ error }) => error ? (
    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
        <AlertCircle size={12} /> {error}
    </div>
) : null;

const FieldHint = ({ children, tone = 'muted' }) => (
    <p className={`text-[11px] mt-1 ${tone === 'error' ? 'text-red-300' : tone === 'ok' ? 'text-emerald-300' : 'text-gray-500'}`}>
        {children}
    </p>
);

// ── Main component ───────────────────────────────────────────────────────────
const ScanConfigModal = ({ open, onClose, onStarted, prefilledTarget }) => {
    const cfg = useConfig();
    const { isAdmin, role } = usePermission();
    const { addToast } = useToast();

    // Flow state
    const [activeStep, setActiveStep]   = useState('target');
    const [visitedSteps, setVisitedSteps] = useState(() => new Set(['target']));

    // Target — three modes: 'existing' | 'url' | 'lab'
    // 'lab' fans the scan out across every selected lab subnet.
    const [targetMode, setTargetMode]           = useState(prefilledTarget ? 'existing' : 'url');
    const [selectedTargetId, setSelectedTargetId] = useState(prefilledTarget?.id || '');
    const [targetUrl, setTargetUrl]             = useState(prefilledTarget?.base_url || '');
    const [labSubnets, setLabSubnets]           = useState(() => LAB_SUBNETS.map(s => s.id));

    // Profile + advanced
    const [scanType, setScanType]       = useState('standard');
    const [customTools, setCustomTools] = useState(['nmap', 'nuclei']);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [autoReport, setAutoReport]   = useState(false);
    const [siemForward, setSiemForward] = useState(false);

    // Schedule
    const [schedulePreset, setSchedulePreset] = useState('oneoff');
    const [customCron, setCustomCron]         = useState('');

    // Submit
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]           = useState(null);

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data: targets = [] } = useQuery({
        queryKey: ['targets'],
        queryFn: () => targetService.list().then(r => r.data),
        enabled: open,
    });

    // ── Derived ──────────────────────────────────────────────────────────────
    const effectiveCron = schedulePreset === 'custom'
        ? customCron.trim()
        : SCHEDULE_PRESETS.find(p => p.id === schedulePreset)?.cron || '';

    const effectiveTools = scanType === 'custom'
        ? customTools
        : SCAN_PROFILES.find(p => p.id === scanType)?.tools || [];

    const selectedTarget = useMemo(
        () => targets.find(t => t.id === selectedTargetId),
        [targets, selectedTargetId],
    );

    const resolvedTargetDisplay = targetMode === 'existing'
        ? (selectedTarget ? `${selectedTarget.name} — ${selectedTarget.base_url}` : '')
        : targetMode === 'lab'
            ? `[Lab] ${labSubnets.length} subnet${labSubnets.length === 1 ? '' : 's'} (${labSubnets.map(s => LAB_SUBNETS.find(x => x.id === s)?.cidr).join(', ')})`
            : targetUrl.trim();

    // ── Validation ───────────────────────────────────────────────────────────
    const targetValid = targetMode === 'existing'
        ? !!selectedTargetId
        : targetMode === 'lab'
            ? labSubnets.length > 0
            : targetUrl.trim().length > 0 && TARGET_PATTERN.test(targetUrl.trim());

    const profileValid = scanType !== 'custom' || customTools.length > 0;

    const cronValid = schedulePreset !== 'custom' || customCron.trim().length > 0;

    const stepValidity = {
        target:   targetValid,
        profile:  profileValid,
        schedule: cronValid,
        review:   targetValid && profileValid && cronValid,
    };

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        // When profile changes, keep customTools in sync if user flips back to custom
        if (scanType !== 'custom') {
            const p = SCAN_PROFILES.find(p => p.id === scanType);
            if (p) setCustomTools(p.tools);
        }
    }, [scanType]);

    useEffect(() => {
        if (!open) {
            setActiveStep('target');
            setVisitedSteps(new Set(['target']));
            setError(null);
        }
    }, [open]);

    // Sync prefilledTarget when the caller switches between targets (e.g. row "Scan…" buttons)
    useEffect(() => {
        if (!open) return;
        if (prefilledTarget?.id) {
            setTargetMode('existing');
            setSelectedTargetId(prefilledTarget.id);
            setTargetUrl(prefilledTarget.base_url || '');
        }
    }, [open, prefilledTarget?.id]);

    // ── Payload (single source of truth — must stay above the early return so
    //    useMemo is always called in the same hook slot every render)
    const payload = useMemo(() => {
        const p = {
            scan_type: scanType,
            tools: scanType === 'custom' ? customTools : null,
            auto_report: autoReport,
            siem_forward: siemForward,
        };
        if (targetMode === 'existing') p.target_id = selectedTargetId;
        else if (targetMode === 'lab') {
            // Placeholder — the actual lab fan-out fills target_url per
            // subnet inside submit(). The Review step still shows a single
            // payload so the user can sanity-check tools / schedule.
            p.target_url = labSubnets.map(s => LAB_SUBNETS.find(x => x.id === s)?.cidr).join(', ');
        }
        else p.target_url = targetUrl.trim();
        if (effectiveCron) p.schedule = effectiveCron;
        return p;
    }, [scanType, customTools, autoReport, siemForward, targetMode, selectedTargetId, targetUrl, labSubnets, effectiveCron]);

    // Early return AFTER all hooks — required by React rules of hooks
    if (!open) return null;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const markVisited = (id) => setVisitedSteps(prev => new Set(prev).add(id));

    const goTo = (id) => {
        setActiveStep(id);
        markVisited(id);
    };

    const goNext = () => {
        const idx = STEPS.findIndex(s => s.id === activeStep);
        if (idx < STEPS.length - 1) goTo(STEPS[idx + 1].id);
    };

    const goBack = () => {
        const idx = STEPS.findIndex(s => s.id === activeStep);
        if (idx > 0) setActiveStep(STEPS[idx - 1].id);
    };

    const toggleCustomTool = (id) => {
        setScanType('custom');
        setCustomTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const endpoint = effectiveCron ? '/scans/schedule' : '/scans/';

            // Recurring schedule — admin only. A one-off scan can be
            // launched by an analyst, but committing infrastructure to a
            // recurring cron job is a longer-term governance decision.
            if (effectiveCron && !isAdmin) {
                addToast(
                    `Recurring schedules are admin-only — you're signed in as ${role}. Pick "Run once (now)" or ask an admin to schedule it.`,
                    { type: 'error', duration: 4500 }
                );
                setSubmitting(false);
                return;
            }

            if (targetMode === 'lab') {
                // Defence in depth — the UI already disables the Lab pill
                // for non-admins, but if the mode got set anyway (stale
                // state, role downgrade mid-session) reject before firing
                // four scans the user shouldn't be authorised to start.
                if (!isAdmin) {
                    addToast(
                        `Lab Environment fan-out is admin-only — you're signed in as ${role}.`,
                        { type: 'error', duration: 4500 }
                    );
                    setSubmitting(false);
                    return;
                }
                // Fan out: one scan per selected subnet so each shows up as
                // its own History row with its own findings. Fire in
                // parallel; if any single one fails we surface the first
                // error but let the others land.
                const sharedPayload = {
                    scan_type: scanType,
                    tools: scanType === 'custom' ? customTools : null,
                    auto_report: autoReport,
                    siem_forward: siemForward,
                    ...(effectiveCron ? { schedule: effectiveCron } : {}),
                };
                const results = await Promise.allSettled(
                    labSubnets.map(sid => {
                        const subnet = LAB_SUBNETS.find(s => s.id === sid);
                        return api.post(endpoint, { ...sharedPayload, target_url: subnet.cidr });
                    })
                );
                const firstFail = results.find(r => r.status === 'rejected');
                if (firstFail) {
                    const err = firstFail.reason;
                    throw new Error(err?.response?.data?.detail || err?.message || 'One or more subnet scans failed.');
                }
                results.forEach(r => {
                    if (r.status === 'fulfilled') {
                        window.dispatchEvent(new CustomEvent('dashboard:scan-started', { detail: r.value?.data }));
                    }
                });
                const last = results[results.length - 1];
                if (onStarted && last?.status === 'fulfilled') onStarted(last.value?.data);
                onClose();
                return;
            }

            const res = await api.post(endpoint, payload);
            // Notify ScanHistory (and any other listeners) so the new scan row
            // appears immediately without waiting for the 30-second auto-refresh.
            window.dispatchEvent(new CustomEvent('dashboard:scan-started', { detail: res?.data }));
            if (onStarted) onStarted(res?.data);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.detail || err.message || 'Failed to launch scan.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Rendered body per step ───────────────────────────────────────────────
    const renderTargetStep = () => (
        <div className="space-y-3">
            <StepHeader stepId="target" />

            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setTargetMode('existing')}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${targetMode === 'existing'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'}`}
                >
                    Existing target
                </button>
                <button
                    type="button"
                    onClick={() => setTargetMode('url')}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${targetMode === 'url'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'}`}
                >
                    Manual URL / IP
                </button>
                <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                        if (!isAdmin) {
                            addToast(
                                `Lab Environment fan-out is admin-only — you're signed in as ${role}. Use Existing target or Manual URL / IP instead.`,
                                { type: 'error', duration: 4500 }
                            );
                            return;
                        }
                        setTargetMode('lab');
                    }}
                    title={isAdmin
                        ? 'Fan out across every selected lab subnet'
                        : 'Admin only — analysts and viewers may not launch the whole-lab scan'}
                    className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                        !isAdmin
                            ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-60'
                            : targetMode === 'lab'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                >
                    <Network className="h-3 w-3" />
                    Lab Environment
                    {!isAdmin && <span className="text-[8px] uppercase tracking-widest text-gray-600 ml-1">admin</span>}
                </button>
            </div>

            {targetMode === 'lab' ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <FieldHint>One scan per subnet — every selected zone becomes its own History row.</FieldHint>
                        <button
                            type="button"
                            onClick={() => setLabSubnets(
                                labSubnets.length === LAB_SUBNETS.length ? [] : LAB_SUBNETS.map(s => s.id)
                            )}
                            className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
                        >
                            {labSubnets.length === LAB_SUBNETS.length ? 'Deselect all' : 'Select all'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {LAB_SUBNETS.map(s => {
                            const checked = labSubnets.includes(s.id);
                            return (
                                <label
                                    key={s.id}
                                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-colors ${checked
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => setLabSubnets(prev =>
                                            prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                        )}
                                        className="mt-0.5 accent-emerald-400"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">{s.label}</span>
                                            <span className="text-[10px] font-mono text-emerald-300">{s.cidr}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{s.zone}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                    {labSubnets.length === 0 && (
                        <FieldHint tone="error">Select at least one subnet.</FieldHint>
                    )}
                    {labSubnets.length > 0 && (
                        <FieldHint tone="ok">
                            Launches {labSubnets.length} parallel scan{labSubnets.length === 1 ? '' : 's'} — one per subnet.
                        </FieldHint>
                    )}
                </div>
            ) : targetMode === 'existing' ? (
                <div>
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
                    {targets.length === 0 && (
                        <FieldHint>No targets yet. Switch to "Manual URL / IP" to run a one-off scan, or add a target in the Nodes tab.</FieldHint>
                    )}
                </div>
            ) : (
                <div>
                    <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://example.com or 10.0.0.1 or 192.168.1.0/24"
                        className={`w-full bg-black/40 border rounded px-3 py-2 text-white text-sm font-mono focus:outline-none transition-colors ${
                            targetUrl.trim() === ''
                                ? 'border-white/10 focus:border-cyan-400'
                                : targetValid
                                    ? 'border-emerald-500/40 focus:border-emerald-400'
                                    : 'border-red-500/40 focus:border-red-400'
                        }`}
                    />
                    {targetUrl.trim() === '' && <FieldHint>URL, IP, hostname, or CIDR range.</FieldHint>}
                    {targetUrl.trim() !== '' && !targetValid && (
                        <FieldHint tone="error">Doesn't look like a valid URL, IP, or hostname.</FieldHint>
                    )}
                    {targetUrl.trim() !== '' && targetValid && (
                        <FieldHint tone="ok">Looks valid. Scope enforcement will run server-side at launch.</FieldHint>
                    )}
                </div>
            )}
        </div>
    );

    const renderProfileStep = () => (
        <div className="space-y-4">
            <StepHeader stepId="profile" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCAN_PROFILES.map(p => {
                    const active = scanType === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setScanType(p.id)}
                            className={`text-left p-3 rounded border transition-colors ${
                                active
                                    ? 'bg-cyan-500/10 border-cyan-500/40'
                                    : 'bg-black/20 border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-white text-sm font-semibold uppercase">{p.label}</span>
                                <span className="text-gray-500 text-[10px]">{p.duration}</span>
                            </div>
                            <p className="text-gray-400 text-xs">{p.blurb}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {p.tools.map(t => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono uppercase">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Advanced — collapsed by default */}
            <div className="border border-white/10 rounded bg-black/20">
                <button
                    type="button"
                    onClick={() => setAdvancedOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white"
                >
                    <span className="flex items-center gap-2">
                        <Sparkles size={12} className="text-cyan-400" />
                        <span className="font-semibold uppercase tracking-wider">Advanced</span>
                        <span className="text-gray-500 normal-case font-normal">
                            Custom tools · Reporting · SIEM
                        </span>
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </button>

                {advancedOpen && (
                    <div className="px-3 pb-3 space-y-3 border-t border-white/5">
                        <div className="space-y-1 mt-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tools</span>
                            <p className="text-[11px] text-gray-500">
                                Selecting tools individually switches the profile to <span className="text-cyan-300">Custom</span>.
                            </p>
                            {TOOL_DEFS.map(({ id, label, icon: Icon, flag, desc }) => {
                                const available = cfg[flag];
                                const checked = effectiveTools.includes(id);
                                return (
                                    <label
                                        key={id}
                                        className={`flex items-start justify-between p-2 rounded border gap-3 ${
                                            available
                                                ? 'bg-black/30 border-white/10 cursor-pointer hover:border-white/20'
                                                : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon size={14} className="text-cyan-400 mt-0.5" />
                                            <div>
                                                <div className="text-white text-xs font-medium">{label}</div>
                                                <div className="text-gray-500 text-[11px]">{desc}</div>
                                                {!available && <div className="text-yellow-400 text-[10px] mt-0.5">Disabled in Settings</div>}
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!available}
                                            onChange={() => toggleCustomTool(id)}
                                            className="accent-cyan-400 w-4 h-4 mt-1"
                                        />
                                    </label>
                                );
                            })}
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Post-scan actions</span>
                            <label className="flex items-center justify-between p-2 rounded bg-black/30 border border-white/10">
                                <span className="text-white text-xs flex items-center gap-2"><FileText size={12} /> Auto-generate PDF report</span>
                                <input type="checkbox" checked={autoReport} onChange={e => setAutoReport(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                            </label>
                            <label className={`flex items-center justify-between p-2 rounded bg-black/30 border border-white/10 ${!cfg.siem_enabled ? 'opacity-50' : ''}`}>
                                <span className="text-white text-xs flex items-center gap-2"><Activity size={12} /> Forward findings to SIEM</span>
                                <input type="checkbox" checked={siemForward} disabled={!cfg.siem_enabled} onChange={e => setSiemForward(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderScheduleStep = () => (
        <div className="space-y-3">
            <StepHeader stepId="schedule" />

            <div className="space-y-1">
                {SCHEDULE_PRESETS.map(p => {
                    // Recurring presets (anything except "Run once") are
                    // admin-only — analysts can launch a one-off scan but
                    // committing a recurring cron job is a longer-term
                    // governance decision.
                    const isRecurring = p.id !== 'oneoff';
                    const isLocked = isRecurring && !isAdmin;
                    return (
                        <label
                            key={p.id}
                            className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                                isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            } ${
                                schedulePreset === p.id
                                    ? 'bg-cyan-500/10 border-cyan-500/40'
                                    : 'bg-black/20 border-white/10 hover:border-white/20'
                            }`}
                            title={isLocked ? 'Recurring schedules require admin role' : undefined}
                            onClick={(e) => {
                                if (isLocked) {
                                    e.preventDefault();
                                    addToast(
                                        `Recurring schedules are admin-only — you're signed in as ${role}.`,
                                        { type: 'error', duration: 4500 }
                                    );
                                }
                            }}
                        >
                            <input
                                type="radio"
                                name="schedule-preset"
                                checked={schedulePreset === p.id}
                                disabled={isLocked}
                                onChange={() => !isLocked && setSchedulePreset(p.id)}
                                className="accent-cyan-400"
                            />
                            <span className={`text-xs ${isLocked ? 'text-gray-500' : 'text-white'}`}>{p.label}</span>
                            {isLocked && <span className="text-[9px] uppercase tracking-widest text-gray-600 ml-2">admin</span>}
                            {p.cron && <span className="text-gray-500 text-[10px] font-mono ml-auto">{p.cron}</span>}
                        </label>
                    );
                })}
            </div>

            {schedulePreset === 'custom' && (
                <div>
                    <input
                        type="text"
                        value={customCron}
                        onChange={(e) => setCustomCron(e.target.value)}
                        placeholder="*/30 * * * *  (every 30 minutes)"
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono focus:border-cyan-400 outline-none"
                    />
                    <FieldHint>Standard five-field cron. Validated by the backend scheduler.</FieldHint>
                </div>
            )}
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-3">
            <StepHeader stepId="review" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded border border-white/10 bg-black/30 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Target</div>
                    <div className="text-white text-sm font-mono break-all">{resolvedTargetDisplay || '—'}</div>
                </div>
                <div className="p-3 rounded border border-white/10 bg-black/30 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Profile</div>
                    <div className="text-white text-sm uppercase">{scanType}</div>
                    <div className="flex flex-wrap gap-1">
                        {effectiveTools.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-mono uppercase">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-3 rounded border border-white/10 bg-black/30 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Schedule</div>
                    <div className="text-white text-sm">
                        {effectiveCron
                            ? <>Recurring: <span className="font-mono text-cyan-300">{effectiveCron}</span></>
                            : 'Run once, now.'}
                    </div>
                </div>
                <div className="p-3 rounded border border-white/10 bg-black/30 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Post-scan</div>
                    <div className="text-white text-xs space-y-0.5">
                        <div>PDF report: <span className={autoReport ? 'text-emerald-300' : 'text-gray-500'}>{autoReport ? 'yes' : 'no'}</span></div>
                        <div>SIEM forward: <span className={siemForward ? 'text-emerald-300' : 'text-gray-500'}>{siemForward ? 'yes' : 'no'}</span></div>
                    </div>
                </div>
            </div>

            <details className="rounded border border-white/10 bg-black/30">
                <summary className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white">
                    Exact request payload
                </summary>
                <pre className="px-3 pb-3 text-[11px] font-mono text-gray-300 whitespace-pre-wrap">
{JSON.stringify({ endpoint: effectiveCron ? 'POST /api/v1/scans/schedule' : 'POST /api/v1/scans/', body: payload }, null, 2)}
                </pre>
            </details>
        </div>
    );

    const stepBody = {
        target:   renderTargetStep,
        profile:  renderProfileStep,
        schedule: renderScheduleStep,
        review:   renderReviewStep,
    }[activeStep]?.() ?? null;

    const isLastStep = activeStep === 'review';
    const canAdvance = stepValidity[activeStep];

    return createPortal(
        <motion.div
            variants={backdropV}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <motion.div
                variants={modalBodyV}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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

                {/* Stepper */}
                <Stepper active={activeStep} visited={visitedSteps} onJump={goTo} />

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <ErrorBanner error={error} />
                    {stepBody}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
                    <div className="text-gray-500 text-[11px] font-mono">
                        {scanType.toUpperCase()} · {effectiveTools.length} tool{effectiveTools.length !== 1 ? 's' : ''}
                        {effectiveCron && ` · scheduled`}
                    </div>
                    <div className="flex gap-2">
                        {activeStep !== 'target' && (
                            <button
                                onClick={goBack}
                                className="px-3 py-1.5 rounded bg-white/5 text-gray-300 text-xs hover:bg-white/10"
                            >
                                Back
                            </button>
                        )}
                        <button onClick={onClose} className="px-3 py-1.5 rounded bg-white/5 text-gray-300 text-xs hover:bg-white/10">
                            Cancel
                        </button>
                        {!isLastStep ? (
                            <button
                                onClick={goNext}
                                disabled={!canAdvance}
                                className="px-4 py-1.5 rounded bg-cyan-400 text-gray-900 text-xs font-bold hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={submit}
                                disabled={!stepValidity.review || submitting}
                                className="px-4 py-1.5 rounded bg-cyan-400 text-gray-900 text-xs font-bold hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {submitting
                                    ? 'Launching…'
                                    : (effectiveCron ? 'Save Schedule' : 'Launch Scan')}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    , document.body);
};

export default ScanConfigModal;
