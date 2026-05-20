import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Plus, Save, X, RotateCcw, Users, Upload, ImageOff } from 'lucide-react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import TeamMemberCard from '../components/landing/TeamMemberCard';
import GradientButton from '../components/landing/shared/GradientButton';
import { stagger } from '../lib/motion';
import { usePermission } from '../hooks/usePermission';
import {
    DEFAULT_ABOUT_COPY,
    DEFAULT_TEAM,
    driveImage,
} from '../data/teamMembers';

const STORAGE_KEY = 'osc.about.content.v1';

const loadStored = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

// Resize and re-encode an uploaded image to keep localStorage usage bounded.
// Returns a JPEG data URL (or PNG if the source is transparent). The target is
// a square, centre-cropped, at most `maxSize` px on each side.
const fileToResizedDataUrl = (file, maxSize = 480, quality = 0.82) =>
    new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please choose an image file.'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Could not decode the image.'));
            img.onload = () => {
                const side = Math.min(img.width, img.height);
                const sx = (img.width - side) / 2;
                const sy = (img.height - side) / 2;
                const out = Math.min(maxSize, side);
                const canvas = document.createElement('canvas');
                canvas.width = out;
                canvas.height = out;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
                const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(mime, quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `member-${Date.now()}`;

export default function AboutUsPage() {
    const { isAdmin } = usePermission();

    const [copy, setCopy] = useState(DEFAULT_ABOUT_COPY);
    const [team, setTeam] = useState(DEFAULT_TEAM);
    const [editingCopy, setEditingCopy] = useState(false);
    const [editingMember, setEditingMember] = useState(null); // member object or { __new: true }

    useEffect(() => {
        const stored = loadStored();
        if (stored?.copy) setCopy({ ...DEFAULT_ABOUT_COPY, ...stored.copy });
        if (Array.isArray(stored?.team) && stored.team.length) setTeam(stored.team);
    }, []);

    useEffect(() => {
        const prev = document.title;
        document.title = 'About — OSC';
        return () => { document.title = prev; };
    }, []);

    const persist = (nextCopy, nextTeam) => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ copy: nextCopy, team: nextTeam }),
            );
        } catch {
            // localStorage may be unavailable (private mode); fail silently
        }
    };

    // Editing the About page is restricted to admins. Analysts and viewers
    // only ever see the read-only view; these guards are defence-in-depth in
    // case a mutation handler is reached without the gating UI.
    const saveCopy = (next) => {
        if (!isAdmin) return;
        setCopy(next);
        persist(next, team);
        setEditingCopy(false);
    };

    const upsertMember = (member) => {
        if (!isAdmin) return;
        const id = member.id || slugify(member.name);
        const incoming = { ...member, id };
        const exists = team.some((m) => m.id === id);
        const next = exists
            ? team.map((m) => (m.id === id ? incoming : m))
            : [...team, incoming];
        setTeam(next);
        persist(copy, next);
        setEditingMember(null);
    };

    const deleteMember = (id) => {
        if (!isAdmin) return;
        if (!window.confirm('Remove this team member from the About page?')) return;
        const next = team.filter((m) => m.id !== id);
        setTeam(next);
        persist(copy, next);
    };

    const resetAll = () => {
        if (!isAdmin) return;
        if (!window.confirm('Reset the About page to the original content? Your edits will be lost.')) return;
        setCopy(DEFAULT_ABOUT_COPY);
        setTeam(DEFAULT_TEAM);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    };

    const sortedTeam = useMemo(() => team, [team]);

    return (
        <div className="min-h-screen bg-cyber-bg text-white overflow-x-hidden">
            <a href="#team" className="skip-link">Skip to team</a>
            <LandingNavbar />

            <main className="pt-28 pb-20">
                {/* Hero / intro */}
                <section className="relative">
                    <div className="pointer-events-none absolute inset-0">
                        <div
                            className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
                            style={{ background: '#4dbdb1', filter: 'blur(140px)' }}
                        />
                        <div
                            className="absolute bottom-[-25%] left-[-12%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
                            style={{ background: '#00ffff', filter: 'blur(140px)' }}
                        />
                    </div>

                    <div className="relative mx-auto max-w-5xl px-6 md:px-10 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-accent/10 ring-1 ring-cyber-accent/30 mb-5">
                            <Users className="h-3.5 w-3.5 text-cyber-accent" />
                            <span className="text-xs font-medium text-cyber-accent tracking-wide">
                                {copy.eyebrow}
                            </span>
                        </div>

                        <h1 className="font-display text-white text-4xl md:text-5xl lg:text-6xl leading-[1.05] font-bold tracking-tight">
                            {copy.heading}
                        </h1>
                        <p className="mt-6 text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
                            {copy.intro}
                        </p>

                        {isAdmin && (
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <GradientButton
                                    variant="secondary"
                                    size="md"
                                    onClick={() => setEditingCopy(true)}
                                    icon={Pencil}
                                >
                                    Edit page copy
                                </GradientButton>
                                <GradientButton
                                    variant="primary"
                                    size="md"
                                    onClick={() => setEditingMember({ __new: true })}
                                    icon={Plus}
                                >
                                    Add member
                                </GradientButton>
                                <GradientButton
                                    variant="ghost"
                                    size="md"
                                    onClick={resetAll}
                                    icon={RotateCcw}
                                >
                                    Reset
                                </GradientButton>
                            </div>
                        )}
                    </div>
                </section>

                {/* Team grid */}
                <section id="team" className="relative mt-20 md:mt-24">
                    <div className="mx-auto max-w-7xl px-6 md:px-10">
                        <motion.div
                            variants={stagger(0.04, 0.06)}
                            initial="initial"
                            animate="animate"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {sortedTeam.map((m) => (
                                <TeamMemberCard
                                    key={m.id}
                                    member={m}
                                    editable={isAdmin}
                                    onEdit={() => setEditingMember(m)}
                                    onDelete={() => deleteMember(m.id)}
                                />
                            ))}
                        </motion.div>

                        {sortedTeam.length === 0 && (
                            <div className="text-center text-white/50 py-20">
                                No team members yet.
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <LandingFooter />

            <AnimatePresence>
                {isAdmin && editingCopy && (
                    <CopyEditorModal
                        initial={copy}
                        onCancel={() => setEditingCopy(false)}
                        onSave={saveCopy}
                    />
                )}
                {isAdmin && editingMember && (
                    <MemberEditorModal
                        initial={editingMember.__new ? null : editingMember}
                        onCancel={() => setEditingMember(null)}
                        onSave={upsertMember}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Editors ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl rounded-2xl bg-cyber-bg ring-1 ring-white/10 shadow-glass max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="font-display text-white text-lg font-semibold">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="h-8 w-8 rounded-md text-white/60 hover:text-white hover:bg-white/5 flex items-center justify-center"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>
                {children}
            </motion.div>
        </motion.div>
    );
}

const inputCls =
    'w-full rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyber-accent/60 focus:outline-none focus:ring-2 focus:ring-cyber-accent/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30';
const labelCls = 'block text-xs uppercase tracking-wider text-white/55 mb-1.5 font-medium';

function CopyEditorModal({ initial, onCancel, onSave }) {
    const [form, setForm] = useState(initial);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <ModalShell title="Edit page copy" onClose={onCancel}>
            <form
                onSubmit={(e) => { e.preventDefault(); onSave(form); }}
                className="px-6 py-5 space-y-4"
            >
                <div>
                    <label className={labelCls}>Eyebrow</label>
                    <input className={inputCls} value={form.eyebrow} onChange={set('eyebrow')} maxLength={60} />
                </div>
                <div>
                    <label className={labelCls}>Heading</label>
                    <input className={inputCls} value={form.heading} onChange={set('heading')} maxLength={120} required />
                </div>
                <div>
                    <label className={labelCls}>Intro paragraph</label>
                    <textarea
                        className={`${inputCls} min-h-[120px] resize-y`}
                        value={form.intro}
                        onChange={set('intro')}
                        maxLength={600}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <GradientButton variant="secondary" size="md" onClick={onCancel}>Cancel</GradientButton>
                    <button type="submit" className="hidden" />
                    <GradientButton variant="primary" size="md" icon={Save} onClick={() => onSave(form)}>
                        Save
                    </GradientButton>
                </div>
            </form>
        </ModalShell>
    );
}

function MemberEditorModal({ initial, onCancel, onSave }) {
    const [form, setForm] = useState(
        initial || { id: '', name: '', role: '', bio: '', email: '', linkedin: '', photo: '' },
    );
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const onPickFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-picking the same file
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            setUploadError('File is larger than 8 MB. Pick a smaller image.');
            return;
        }
        setUploadError('');
        setUploading(true);
        try {
            const dataUrl = await fileToResizedDataUrl(file, 480, 0.82);
            setForm((f) => ({ ...f, photo: dataUrl }));
        } catch (err) {
            setUploadError(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const clearPhoto = () => setForm((f) => ({ ...f, photo: '' }));

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Name is required';
        if (!form.role.trim()) next.role = 'Role is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email';
        if (form.linkedin && !/^https?:\/\//i.test(form.linkedin)) next.linkedin = 'Must be a full URL (https://…)';
        if (form.bio && form.bio.length > 240) next.bio = 'Keep under 240 characters';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = () => {
        if (!validate()) return;
        // If the admin pasted a Google Drive share URL, normalise it.
        const photo = form.photo && form.photo.includes('drive.google.com')
            ? driveImage(form.photo)
            : form.photo;
        onSave({ ...form, photo });
    };

    return (
        <ModalShell title={initial ? `Edit ${initial.name}` : 'Add team member'} onClose={onCancel}>
            <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="px-6 py-5 space-y-4"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Name *</label>
                        <input className={inputCls} value={form.name} onChange={set('name')} required />
                        {errors.name && <p className="text-xs text-cyber-critical mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>Role *</label>
                        <input className={inputCls} value={form.role} onChange={set('role')} required />
                        {errors.role && <p className="text-xs text-cyber-critical mt-1">{errors.role}</p>}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Short bio (1–2 lines)</label>
                    <textarea
                        className={`${inputCls} min-h-[80px] resize-y`}
                        value={form.bio}
                        onChange={set('bio')}
                        maxLength={240}
                        placeholder="One or two sentences about their contribution."
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
                        <span>{errors.bio || ''}</span>
                        <span>{(form.bio || '').length}/240</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Email</label>
                        <input className={inputCls} type="email" value={form.email} onChange={set('email')} />
                        {errors.email && <p className="text-xs text-cyber-critical mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>LinkedIn URL</label>
                        <input className={inputCls} type="url" value={form.linkedin} onChange={set('linkedin')} placeholder="https://www.linkedin.com/in/…" />
                        {errors.linkedin && <p className="text-xs text-cyber-critical mt-1">{errors.linkedin}</p>}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Photo</label>

                    <div className="flex items-start gap-4">
                        {/* Preview */}
                        <div className="relative shrink-0">
                            {form.photo ? (
                                <img
                                    src={form.photo.includes('drive.google.com') ? driveImage(form.photo) : form.photo}
                                    alt="preview"
                                    referrerPolicy="no-referrer"
                                    className="h-20 w-20 rounded-full object-cover ring-1 ring-white/15"
                                    onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center text-white/30">
                                    <ImageOff className="h-6 w-6" />
                                </div>
                            )}
                            {form.photo && (
                                <button
                                    type="button"
                                    onClick={clearPhoto}
                                    aria-label="Remove photo"
                                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-cyber-bg ring-1 ring-white/15 text-white/70 hover:text-cyber-critical hover:ring-cyber-critical/50 flex items-center justify-center"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Upload + URL */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={onPickFile}
                                className="hidden"
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-cyber-accent/10 ring-1 ring-cyber-accent/40 hover:ring-cyber-accent text-cyber-accent text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-60 disabled:cursor-wait"
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    {uploading ? 'Processing…' : (form.photo ? 'Replace photo' : 'Upload photo')}
                                </button>
                                <span className="text-[10px] text-white/40 self-center">
                                    PNG / JPG / WEBP — resized to 480 px.
                                </span>
                            </div>

                            <input
                                className={inputCls}
                                value={form.photo?.startsWith('data:') ? '' : (form.photo || '')}
                                onChange={set('photo')}
                                placeholder="…or paste an image URL / Drive share link"
                            />
                            {form.photo?.startsWith('data:') && (
                                <p className="text-[10px] text-white/40">Using uploaded image.</p>
                            )}
                            {uploadError && (
                                <p className="text-xs text-cyber-critical">{uploadError}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <GradientButton variant="secondary" size="md" onClick={onCancel}>Cancel</GradientButton>
                    <GradientButton variant="primary" size="md" icon={Save} onClick={submit}>
                        {initial ? 'Save changes' : 'Add member'}
                    </GradientButton>
                </div>
            </form>
        </ModalShell>
    );
}
