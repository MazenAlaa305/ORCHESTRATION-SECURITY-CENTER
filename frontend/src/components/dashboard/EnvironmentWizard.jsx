import React, { useState } from 'react';
import {
    X, Target as TargetIcon, Server, ShieldCheck, Gauge, CheckCircle2,
    AlertCircle, ArrowRight, ArrowLeft, Plus, Trash2,
} from 'lucide-react';
import { targetService } from '../../services/api';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../ToastProvider';

const STEPS = [
    { id: 'identity',    label: 'Identity',    icon: TargetIcon },
    { id: 'environment', label: 'Environment', icon: Server },
    { id: 'compliance',  label: 'Compliance',  icon: ShieldCheck },
    { id: 'safety',      label: 'Safety',      icon: Gauge },
    { id: 'review',      label: 'Review',      icon: CheckCircle2 },
];

const ENVIRONMENTS = [
    { id: 'lab',         label: 'Lab',         desc: 'Internal test bed; full aggressive scans allowed' },
    { id: 'development', label: 'Development', desc: 'Dev stage; full scans but rate-limited' },
    { id: 'staging',     label: 'Staging',     desc: 'Pre-prod mirror; safe-mode scans' },
    { id: 'production',  label: 'Production',  desc: 'Live traffic; safe, low-RPS scans only' },
];

const SENSITIVITY = [
    { id: 'NONE',      label: 'None' },
    { id: 'PII',       label: 'PII' },
    { id: 'FINANCIAL', label: 'Financial' },
];

const ASSET_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const COMPLIANCE_FRAMEWORKS = [
    { id: 'pci-dss',    label: 'PCI-DSS' },
    { id: 'hipaa',      label: 'HIPAA' },
    { id: 'iso-27001',  label: 'ISO-27001' },
    { id: 'gdpr',       label: 'GDPR' },
    { id: 'nist-csf',   label: 'NIST CSF' },
    { id: 'owasp-asvs', label: 'OWASP ASVS' },
];

const EnvironmentWizard = ({ open, onClose, onCreated }) => {
    const { isAdmin, role } = usePermission();
    const { addToast } = useToast();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [environmentType, setEnvironmentType] = useState('lab');
    const [assetValue, setAssetValue] = useState('MEDIUM');
    const [dataSensitivity, setDataSensitivity] = useState('NONE');
    const [complianceTags, setComplianceTags] = useState([]);
    const [scopeAllowlist, setScopeAllowlist] = useState([]);
    const [newScopeEntry, setNewScopeEntry] = useState('');
    const [maxRps, setMaxRps] = useState(10);
    const [notes, setNotes] = useState('');

    const reset = () => {
        setStep(0); setError(null); setSubmitting(false);
        setName(''); setBaseUrl(''); setEnvironmentType('lab');
        setAssetValue('MEDIUM'); setDataSensitivity('NONE');
        setComplianceTags([]); setScopeAllowlist([]); setNewScopeEntry('');
        setMaxRps(10); setNotes('');
    };

    if (!open) return null;

    const toggleTag = (id) =>
        setComplianceTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

    // Scope allowlist is a safety boundary — it widens what the scanner is
    // allowed to touch. Editing it (add or remove) is admin-only so an
    // analyst can't quietly authorise a host into scope.
    const guardAllowlist = () => {
        if (isAdmin) return true;
        addToast(
            `Scope allowlist edits are admin-only — you're signed in as ${role}. The allowlist controls what the scanner is permitted to touch.`,
            { type: 'error', duration: 4500 }
        );
        return false;
    };

    const addScopeEntry = () => {
        const v = newScopeEntry.trim();
        if (!v) return;
        if (scopeAllowlist.includes(v)) return;
        if (!guardAllowlist()) return;
        setScopeAllowlist([...scopeAllowlist, v]);
        setNewScopeEntry('');
    };

    const removeScopeEntry = (v) => {
        if (!guardAllowlist()) return;
        setScopeAllowlist(scopeAllowlist.filter(x => x !== v));
    };

    const canAdvance = () => {
        if (step === 0) return name.trim() && baseUrl.trim();
        if (step === 3) return Number(maxRps) > 0;
        return true;
    };

    const submit = async () => {
        setSubmitting(true); setError(null);
        try {
            await targetService.create({
                name: name.trim(),
                base_url: baseUrl.trim(),
                asset_value: assetValue,
                data_sensitivity: dataSensitivity,
                environment_type: environmentType,
                compliance_tags: complianceTags.length ? complianceTags : null,
                scope_allowlist: scopeAllowlist.length ? scopeAllowlist : null,
                max_rps: Number(maxRps),
                notes: notes.trim() || null,
            });
            if (onCreated) onCreated();
            reset();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const StepIcon = STEPS[step].icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <StepIcon className="text-cyan-400" size={18} />
                        <h2 className="text-white text-sm font-semibold uppercase tracking-wider">
                            Add Environment — {STEPS[step].label}
                        </h2>
                    </div>
                    <button onClick={() => { reset(); onClose(); }} className="p-1 rounded hover:bg-white/10 text-gray-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-1 px-5 py-2 border-b border-white/5">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${
                                i === step ? 'text-cyan-400' : i < step ? 'text-green-400' : 'text-gray-500'
                            }`}>
                                <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-bold ${
                                    i === step ? 'border-cyan-400 bg-cyan-400/10'
                                        : i < step ? 'border-green-400 bg-green-400/10'
                                        : 'border-white/10'
                                }`}>{i + 1}</span>
                                {s.label}
                            </div>
                            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/5" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && (
                        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle size={12} /> {error}
                        </div>
                    )}

                    {/* Step 0: Identity */}
                    {step === 0 && (
                        <div className="space-y-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Name *</span>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Production Checkout Service"
                                    className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Base URL / IP *</span>
                                <input
                                    value={baseUrl}
                                    onChange={e => setBaseUrl(e.target.value)}
                                    placeholder="https://checkout.example.com"
                                    className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono focus:border-cyan-400 outline-none"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Notes</span>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Owner team, change window, contact email, known caveats…"
                                    rows={3}
                                    className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                                />
                            </label>
                        </div>
                    )}

                    {/* Step 1: Environment */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Environment Type</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {ENVIRONMENTS.map(e => (
                                        <button
                                            key={e.id}
                                            onClick={() => setEnvironmentType(e.id)}
                                            className={`text-left p-3 rounded border transition-colors ${
                                                environmentType === e.id
                                                    ? 'bg-cyan-500/10 border-cyan-500/40'
                                                    : 'bg-black/20 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="text-white text-sm font-semibold uppercase">{e.label}</div>
                                            <p className="text-gray-400 text-xs mt-1">{e.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Asset Value</p>
                                <div className="flex gap-2">
                                    {ASSET_VALUES.map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setAssetValue(v)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase ${
                                                assetValue === v
                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                                    : 'bg-white/5 text-gray-400 border border-white/10'
                                            }`}
                                        >{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Data Sensitivity</p>
                                <div className="flex gap-2">
                                    {SENSITIVITY.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setDataSensitivity(s.id)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase ${
                                                dataSensitivity === s.id
                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                                    : 'bg-white/5 text-gray-400 border border-white/10'
                                            }`}
                                        >{s.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Compliance */}
                    {step === 2 && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                                Compliance Frameworks (findings will be mapped to these)
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {COMPLIANCE_FRAMEWORKS.map(f => {
                                    const checked = complianceTags.includes(f.id);
                                    return (
                                        <label
                                            key={f.id}
                                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                                                checked ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-black/20 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleTag(f.id)}
                                                className="accent-cyan-400 w-4 h-4"
                                            />
                                            <span className="text-white text-xs font-medium">{f.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Safety */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">
                                    Max Requests Per Second
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={maxRps}
                                    onChange={e => setMaxRps(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm w-32 font-mono focus:border-cyan-400 outline-none"
                                />
                                <span className="text-[10px] text-gray-500">
                                    Production targets should stay under 10. Lab targets can go up to ~100.
                                </span>
                            </label>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                                        Scope Allowlist (hosts/CIDRs the scanner may touch)
                                    </p>
                                    {!isAdmin && (
                                        <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
                                            admin only
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        value={newScopeEntry}
                                        onChange={e => setNewScopeEntry(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !(!isAdmin) && (e.preventDefault(), addScopeEntry())}
                                        placeholder={isAdmin ? 'example.com or 10.0.0.0/24' : 'admin only — analysts cannot edit the allowlist'}
                                        disabled={!isAdmin}
                                        className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-xs font-mono focus:border-cyan-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={addScopeEntry}
                                        disabled={!isAdmin}
                                        title={!isAdmin ? 'admin only' : undefined}
                                        className="px-3 py-2 rounded bg-cyan-400 text-gray-900 text-xs font-bold hover:bg-sky-400 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-400"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                                {scopeAllowlist.length === 0 ? (
                                    <p className="text-gray-500 text-[10px] italic">
                                        Empty → only the base URL's hostname will be allowed.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {scopeAllowlist.map(s => (
                                            <span key={s} className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                                                {s}
                                                <button
                                                    onClick={() => removeScopeEntry(s)}
                                                    disabled={!isAdmin}
                                                    title={!isAdmin ? 'admin only' : 'Remove'}
                                                    className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-red-400"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <div className="space-y-2 text-xs">
                            {[
                                ['Name', name],
                                ['Base URL', baseUrl],
                                ['Environment', environmentType],
                                ['Asset Value', assetValue],
                                ['Data Sensitivity', dataSensitivity],
                                ['Compliance Tags', complianceTags.length ? complianceTags.join(', ') : '—'],
                                ['Max RPS', maxRps],
                                ['Scope Allowlist', scopeAllowlist.length ? scopeAllowlist.join(', ') : '(base hostname only)'],
                                ['Notes', notes || '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-start justify-between gap-4 p-2 rounded bg-black/20 border border-white/5">
                                    <span className="text-gray-400 uppercase tracking-wider text-[10px] shrink-0 w-32">{k}</span>
                                    <span className="text-white font-mono text-right break-all">{String(v)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
                    <button
                        onClick={() => setStep(s => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="px-3 py-1.5 rounded bg-white/5 text-gray-300 text-xs hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ArrowLeft size={12} /> Back
                    </button>
                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => canAdvance() && setStep(s => s + 1)}
                            disabled={!canAdvance()}
                            className="px-4 py-1.5 rounded bg-cyan-400 text-gray-900 text-xs font-bold hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            Next <ArrowRight size={12} />
                        </button>
                    ) : (
                        <button
                            onClick={submit}
                            disabled={submitting}
                            className="px-4 py-1.5 rounded bg-green-400 text-gray-900 text-xs font-bold hover:bg-green-300 disabled:opacity-40 flex items-center gap-1"
                        >
                            <CheckCircle2 size={12} /> {submitting ? 'Creating…' : 'Create Target'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnvironmentWizard;
