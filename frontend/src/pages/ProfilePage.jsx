import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

import Layout from '../layout/Layout';
import { authService, resolveAvatarUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user: authUser, login } = useAuth();
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError]     = useState('');
    const [okMsg, setOkMsg]     = useState('');

    // Form fields
    const [email, setEmail]       = useState('');
    const [fullName, setFullName] = useState('');
    const [bio, setBio]           = useState('');
    const [phone, setPhone]       = useState('');

    // Password change
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd]         = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdSaving, setPwdSaving]   = useState(false);
    const [pwdError, setPwdError]     = useState('');
    const [pwdOk, setPwdOk]           = useState('');

    useEffect(() => {
        let alive = true;
        authService.me()
            .then(res => { if (alive) {
                const p = res.data;
                setProfile(p);
                setEmail(p.email || '');
                setFullName(p.full_name || '');
                setBio(p.bio || '');
                setPhone(p.phone || '');
            }})
            .catch(() => { if (alive) setError('Failed to load profile'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    const flash = (setter, msg) => {
        setter(msg);
        setTimeout(() => setter(''), 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(''); setOkMsg('');

        const trimmedEmail = (email || '').trim().toLowerCase();
        if (!trimmedEmail) {
            setError('Email is required'); return;
        }
        if (!/^[^\s@]+@[^\s@]+$/.test(trimmedEmail)) {
            setError('Invalid email address'); return;
        }

        const emailChanged = profile && trimmedEmail !== profile.email;
        const payload = {
            full_name: fullName || null,
            bio: bio || null,
            phone: phone || null,
            // Only send email if it actually changed — keeps audit cleaner.
            ...(emailChanged ? { email: trimmedEmail } : {}),
        };

        setSaving(true);
        try {
            const res = await authService.updateProfile(payload);
            const updated = res.data;
            setProfile(updated);
            setEmail(updated.email);

            // If the email changed, the server issued a fresh JWT. Swap it in
            // so subsequent API calls don't 401 (the old token's `sub` is stale).
            if (updated.access_token) {
                login(updated.access_token, updated.email, updated.role, updated.id);
            }

            window.dispatchEvent(new Event('profile-updated'));
            flash(setOkMsg, emailChanged ? 'Profile updated — email changed' : 'Profile updated');
        } catch (err) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail;
            setError(msg || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError('Avatar must be 2 MB or smaller');
            return;
        }
        setError(''); setOkMsg(''); setUploading(true);
        try {
            const res = await authService.uploadAvatar(file);
            setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
            window.dispatchEvent(new Event('profile-updated'));
            flash(setOkMsg, 'Avatar updated');
        } catch (err) {
            setError(err.response?.data?.detail || 'Avatar upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwdError(''); setPwdOk('');
        if (newPwd !== confirmPwd) {
            setPwdError('New passwords do not match'); return;
        }
        if (newPwd.length < 8 || !/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) {
            setPwdError('Password must be ≥ 8 chars with letters and digits'); return;
        }
        setPwdSaving(true);
        try {
            await authService.changePassword(currentPwd, newPwd);
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            flash(setPwdOk, 'Password changed');
        } catch (err) {
            setPwdError(err.response?.data?.detail || 'Password change failed');
        } finally {
            setPwdSaving(false);
        }
    };

    const goBack = () => navigate('/dashboard/overview');

    const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
    const initial = (profile?.full_name || profile?.email || authUser?.email || 'U')[0].toUpperCase();

    return (
        <Layout
            activeTab=""
            onTabChange={(id) => navigate(`/dashboard/${id}`)}
            onQuickScan={() => navigate('/dashboard/operations/history')}
            isScanning={false}
        >
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/[0.03] pb-3">
                    <button
                        onClick={goBack}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition"
                        title="Back to dashboard"
                    >
                        <ArrowLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <h1 className="text-xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                        My <span style={{ color: '#00ffff' }}>Profile</span>
                    </h1>
                </div>

                {loading ? (
                    <div className="glass-card p-10 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                    </div>
                ) : (
                    <>
                        {/* Flash messages */}
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-mono"
                                 style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', color: '#ff6b6b' }}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {String(error)}
                            </div>
                        )}
                        {okMsg && (
                            <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-mono"
                                 style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', color: '#00ff88' }}>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {okMsg}
                            </div>
                        )}

                        {/* Identity + Avatar */}
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Avatar"
                                            className="w-20 h-20 rounded-full object-cover"
                                            style={{ border: '2px solid rgba(0,255,255,0.3)' }}
                                        />
                                    ) : (
                                        <div
                                            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black"
                                            style={{ background: 'rgba(0,255,255,0.15)', color: '#00ffff', border: '2px solid rgba(0,255,255,0.3)' }}
                                        >
                                            {initial}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="absolute -bottom-1 -right-1 p-1.5 rounded-full transition"
                                        style={{ background: '#0a1a22', border: '1px solid rgba(0,255,255,0.4)' }}
                                        title="Change avatar"
                                    >
                                        {uploading
                                            ? <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                                            : <Camera className="h-3 w-3 text-cyan-400" />}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        className="hidden"
                                        onChange={handleAvatarSelect}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-white truncate">
                                        {profile?.full_name || profile?.email}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono truncate">{profile?.email}</p>
                                    <span
                                        className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                                        style={{ background: 'rgba(0,255,255,0.1)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.25)' }}
                                    >
                                        {profile?.role}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-3">PNG or JPEG, up to 2 MB.</p>
                        </div>

                        {/* Profile form */}
                        <form onSubmit={handleSave} className="glass-card p-6 space-y-4">
                            <h2 className="text-[11px] uppercase tracking-[0.3em] font-black text-gray-400 mb-2">
                                Personal Information
                            </h2>

                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Email</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={255}
                                    autoComplete="email" placeholder="you@example.com"
                                    className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none"
                                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }}
                                />
                                {profile && email.trim().toLowerCase() !== profile.email && (
                                    <p className="text-[10px] text-orange-400 mt-1">
                                        Changing your email will issue a fresh session token.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Full Name</label>
                                <input
                                    type="text" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={120}
                                    placeholder="Jane Doe"
                                    className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none"
                                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Phone</label>
                                <input
                                    type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40}
                                    placeholder="+1 555 555 5555"
                                    className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none"
                                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Bio</label>
                                <textarea
                                    value={bio} onChange={e => setBio(e.target.value)} maxLength={2000} rows={4}
                                    placeholder="Tell your team a bit about yourself…"
                                    className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none resize-y"
                                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }}
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit" disabled={saving}
                                    className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition"
                                    style={{
                                        background: saving ? 'rgba(0,255,255,0.08)' : 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(26,69,102,0.25))',
                                        border: '1px solid rgba(0,255,255,0.4)',
                                        color: '#00ffff',
                                    }}
                                >
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>

                        {/* Password change */}
                        <form onSubmit={handlePasswordChange} className="glass-card p-6 space-y-4">
                            <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] font-black text-gray-400 mb-2">
                                <Lock className="h-3.5 w-3.5" /> Change Password
                            </h2>

                            {pwdError && (
                                <div className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono"
                                     style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', color: '#ff6b6b' }}>
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {String(pwdError)}
                                </div>
                            )}
                            {pwdOk && (
                                <div className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono"
                                     style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', color: '#00ff88' }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {pwdOk}
                                </div>
                            )}

                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Current Password</label>
                                <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} autoComplete="current-password"
                                       className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white outline-none"
                                       style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }} />
                            </div>
                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">New Password</label>
                                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password"
                                       className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white outline-none"
                                       style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }} />
                            </div>
                            <div>
                                <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Confirm New Password</label>
                                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password"
                                       className="w-full px-3 py-2 rounded-lg text-sm font-mono text-white outline-none"
                                       style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,255,255,0.15)' }} />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit" disabled={pwdSaving || !currentPwd || !newPwd}
                                    className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition disabled:opacity-50"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(26,69,102,0.25))',
                                        border: '1px solid rgba(0,255,255,0.4)',
                                        color: '#00ffff',
                                    }}
                                >
                                    {pwdSaving ? 'Updating…' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </Layout>
    );
}
