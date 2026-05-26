import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Shield, ShieldOff, Trash2, KeyRound, RefreshCw, AlertCircle, X, Mail, Phone, Clock, Calendar, UserCog, Check } from 'lucide-react';
import RoleBadge from '../components/ui/RoleBadge';
import { useAuth } from '../context/AuthContext';
import api, { resolveAvatarUrl } from '../services/api';

// ── API helpers ───────────────────────────────────────────────────────────────

const rbac = {
    listUsers:     (skip = 0, limit = 100) => api.get('/rbac/users', { params: { skip, limit } }),
    createUser:    (body)   => api.post('/rbac/users', body),
    changeRole:    (id, role) => api.patch(`/rbac/users/${id}/role`, { role }),
    disableUser:   (id)     => api.post(`/rbac/users/${id}/disable`),
    enableUser:    (id)     => api.post(`/rbac/users/${id}/enable`),
    resetPassword: (id, new_password) => api.post(`/rbac/users/${id}/reset-password`, { new_password }),
    deleteUser:    (id)     => api.delete(`/rbac/users/${id}`),
    auditLogs:     (limit = 50) => api.get('/rbac/audit-logs', { params: { limit } }),
};

const ROLES = ['VIEWER', 'ANALYST', 'ADMIN'];

// ── Sub-components ────────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ email: '', password: '', role: 'VIEWER' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async () => {
        if (!form.email || !form.password) { setError('Email and password are required'); return; }
        setLoading(true);
        try {
            await rbac.createUser(form);
            onCreated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div
                className="w-96 rounded-xl p-6 space-y-4"
                style={{ background: 'rgba(10,24,32,0.98)', border: '1px solid rgba(0,255,255,0.15)' }}
            >
                <h2 className="text-sm font-black uppercase tracking-widest text-white">New User</h2>

                {error && (
                    <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                        {error}
                    </p>
                )}

                <input
                    type="email" placeholder="Email address" value={form.email}
                    onChange={set('email')}
                    className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-cyan-500"
                />
                <input
                    type="password" placeholder="Initial password" value={form.password}
                    onChange={set('password')}
                    className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-cyan-500"
                />
                <select
                    value={form.role} onChange={set('role')}
                    className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-cyan-500"
                >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="text-xs px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit} disabled={loading}
                        className="text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                        style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: '#00ffff' }}
                    >
                        {loading ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ResetPasswordModal({ user, onClose, onDone }) {
    const [pw, setPw] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!pw) { setError('Password is required'); return; }
        setLoading(true);
        try {
            await rbac.resetPassword(user.id, pw);
            onDone();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div
                className="w-80 rounded-xl p-6 space-y-4"
                style={{ background: 'rgba(10,24,32,0.98)', border: '1px solid rgba(255,165,0,0.2)' }}
            >
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Reset Password</h2>
                <p className="text-xs text-gray-500">
                    Set a new temporary password for <span className="text-gray-300">{user.email}</span>.
                    The user will be required to change it on next login.
                </p>

                {error && (
                    <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                        {error}
                    </p>
                )}

                <input
                    type="password" placeholder="New password" value={pw}
                    onChange={e => setPw(e.target.value)}
                    className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                />

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={submit} disabled={loading}
                        className="text-xs px-4 py-2 rounded-lg font-bold text-orange-300 transition-colors"
                        style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)' }}
                    >
                        {loading ? 'Saving…' : 'Reset'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Admin profile view modal ─────────────────────────────────────────────────

function UserProfileModal({ user, onClose }) {
    const avatarUrl = resolveAvatarUrl(user.avatar_url);
    const initial = (user.full_name || user.email || '?')[0].toUpperCase();
    const fmtDate = (v) => v ? new Date(v).toLocaleString() : '—';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-xl overflow-hidden"
                style={{ background: 'rgba(10,24,32,0.98)', border: '1px solid rgba(0,255,255,0.18)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">User Profile</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Identity */}
                <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt=""
                            className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                            style={{ border: '2px solid rgba(0,255,255,0.3)' }}
                        />
                    ) : (
                        <div
                            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-black flex-shrink-0"
                            style={{ background: 'rgba(0,255,255,0.15)', color: '#00ffff', border: '2px solid rgba(0,255,255,0.3)' }}
                        >
                            {initial}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-white truncate">{user.full_name || user.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <RoleBadge role={user.role} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${user.disabled ? 'text-red-400' : 'text-green-400'}`}>
                                {user.disabled ? 'Disabled' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Details grid */}
                <div className="px-6 py-5 space-y-3">
                    <ProfileField icon={<Mail className="h-3 w-3" />} label="Email">{user.email}</ProfileField>
                    <ProfileField icon={<Phone className="h-3 w-3" />} label="Phone">{user.phone || '—'}</ProfileField>
                    <ProfileField icon={<Calendar className="h-3 w-3" />} label="Member since">{fmtDate(user.created_at)}</ProfileField>
                    <ProfileField icon={<Clock className="h-3 w-3" />} label="Last login">{fmtDate(user.last_login_at)}</ProfileField>

                    {user.bio && (
                        <div className="pt-2">
                            <p className="text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-1.5">Bio</p>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                        </div>
                    )}

                    {user.force_password_change && (
                        <p className="text-[10px] text-orange-400 uppercase tracking-wider pt-2">
                            Pending password change on next login
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={onClose}
                        className="text-xs px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ icon, label, children }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-gray-600 flex-shrink-0">{icon}</div>
            <p className="text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 w-24 flex-shrink-0">{label}</p>
            <p className="text-xs text-gray-300 truncate flex-1">{children}</p>
        </div>
    );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ u, currentUserId, onRefresh, onError, onOpenProfile }) {
    const [changingRole, setChangingRole] = useState(false);
    const [showReset, setShowReset] = useState(false);
    // Role menu is rendered through a portal so it isn't clipped by the
    // table wrapper's `overflow-hidden`. We track the anchor button's
    // screen-space rect to position the menu under it.
    const [roleMenuPos, setRoleMenuPos] = useState(null);
    const roleBtnRef = useRef(null);
    const roleMenuRef = useRef(null);
    const isSelf = u.id === currentUserId;
    const avatarUrl = resolveAvatarUrl(u.avatar_url);
    const initial = (u.full_name || u.email || '?')[0].toUpperCase();

    const showRoleMenu = roleMenuPos !== null;

    const openRoleMenu = () => {
        const r = roleBtnRef.current?.getBoundingClientRect();
        if (!r) return;
        // Estimate the menu's height — header + 3 role rows. Used to flip
        // the menu above the button when the user is scrolled near the
        // bottom of the viewport and there isn't enough room to open down.
        const ESTIMATED_HEIGHT = 36 + 3 * 36 + 8;
        const spaceBelow = window.innerHeight - r.bottom;
        const openUp = spaceBelow < ESTIMATED_HEIGHT;
        const top = openUp
            ? Math.max(8, r.top - ESTIMATED_HEIGHT - 6)
            : r.bottom + 6;
        setRoleMenuPos({
            top,
            right: window.innerWidth - r.right,
        });
    };

    // Close on outside click + on scroll/resize (otherwise the portal-rendered
    // menu would float in stale screen coordinates after the page moves).
    useEffect(() => {
        if (!showRoleMenu) return;
        const onDocClick = (e) => {
            if (roleMenuRef.current?.contains(e.target)) return;
            if (roleBtnRef.current?.contains(e.target)) return;
            setRoleMenuPos(null);
        };
        const onReflow = () => setRoleMenuPos(null);
        document.addEventListener('mousedown', onDocClick);
        window.addEventListener('scroll', onReflow, true);
        window.addEventListener('resize', onReflow);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            window.removeEventListener('scroll', onReflow, true);
            window.removeEventListener('resize', onReflow);
        };
    }, [showRoleMenu]);

    const act = async (fn) => {
        try { await fn(); onRefresh(); }
        catch (err) {
            onError?.(err.response?.data?.detail ?? err.message ?? 'Request failed');
        }
    };

    return (
        <>
            <tr className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                {/* User cell — clickable, opens admin profile view */}
                <td className="px-4 py-3">
                    <button
                        type="button"
                        onClick={() => onOpenProfile?.(u)}
                        className="flex items-center gap-2.5 text-left w-full rounded hover:bg-white/[0.03] -mx-1 px-1 py-1 transition-colors"
                        title="View profile"
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                                style={{ border: '1px solid rgba(0,255,255,0.25)' }}
                            />
                        ) : (
                            <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                                style={{ background: 'rgba(0,255,255,0.1)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.2)' }}
                            >
                                {initial}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-xs text-white font-semibold truncate">
                                {u.full_name || u.email.split('@')[0]}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                            {u.force_password_change && (
                                <p className="text-[9px] text-orange-400 uppercase tracking-wider">Must change password</p>
                            )}
                        </div>
                    </button>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                    {isSelf ? (
                        <RoleBadge role={u.role} />
                    ) : changingRole ? (
                        <select
                            defaultValue={u.role}
                            autoFocus
                            onBlur={() => setChangingRole(false)}
                            onChange={async (e) => {
                                setChangingRole(false);
                                await act(() => rbac.changeRole(u.id, e.target.value));
                            }}
                            className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 border border-cyan-700 focus:outline-none"
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    ) : (
                        <button onClick={() => setChangingRole(true)} title="Click to change role">
                            <RoleBadge role={u.role} />
                        </button>
                    )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${u.disabled ? 'text-red-400' : 'text-green-400'}`}>
                        {u.disabled ? 'Disabled' : 'Active'}
                    </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                    {!isSelf && (
                        <div className="flex items-center gap-3">
                            {/* Change role — opens a portal-rendered dropdown
                                so the menu can't be clipped by the table's
                                overflow:hidden. Picking a different role
                                fires rbac.changeRole and refreshes. */}
                            <button
                                ref={roleBtnRef}
                                onClick={() => (showRoleMenu ? setRoleMenuPos(null) : openRoleMenu())}
                                title="Change privilege / role"
                                className="text-cyan-400 hover:text-cyan-200 transition-colors"
                            >
                                <UserCog className="h-3.5 w-3.5" />
                            </button>
                            {showRoleMenu && createPortal(
                                <div
                                    ref={roleMenuRef}
                                    className="rounded-lg overflow-hidden shadow-2xl"
                                    style={{
                                        position: 'fixed',
                                        top: roleMenuPos.top,
                                        right: roleMenuPos.right,
                                        zIndex: 9999,
                                        background: 'rgba(10,24,32,0.98)',
                                        border: '1px solid rgba(0,255,255,0.25)',
                                        minWidth: 160,
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <p className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-500 font-black border-b border-white/5">
                                        Change Role — {u.email}
                                    </p>
                                    {ROLES.map(r => {
                                        const isCurrent = r === u.role;
                                        return (
                                            <button
                                                key={r}
                                                onClick={async () => {
                                                    setRoleMenuPos(null);
                                                    if (!isCurrent) await act(() => rbac.changeRole(u.id, r));
                                                }}
                                                disabled={isCurrent}
                                                className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs font-bold transition-colors ${
                                                    isCurrent
                                                        ? 'text-cyan-300 bg-cyan-500/10 cursor-default'
                                                        : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                                                }`}
                                            >
                                                <span>{r}</span>
                                                {isCurrent && <Check className="h-3 w-3" />}
                                            </button>
                                        );
                                    })}
                                </div>,
                                document.body
                            )}
                            {u.disabled ? (
                                <button
                                    onClick={() => act(() => rbac.enableUser(u.id))}
                                    title="Enable account"
                                    className="text-green-500 hover:text-green-300 transition-colors"
                                >
                                    <Shield className="h-3.5 w-3.5" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => act(() => rbac.disableUser(u.id))}
                                    title="Disable account"
                                    className="text-yellow-500 hover:text-yellow-300 transition-colors"
                                >
                                    <ShieldOff className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowReset(true)}
                                title="Reset password"
                                className="text-orange-500 hover:text-orange-300 transition-colors"
                            >
                                <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Permanently delete ${u.email}?`))
                                        act(() => rbac.deleteUser(u.id));
                                }}
                                title="Delete user"
                                className="text-red-600 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                    {isSelf && <span className="text-[9px] text-gray-700 uppercase tracking-wider">You</span>}
                </td>
            </tr>

            {showReset && (
                <ResetPasswordModal user={u} onClose={() => setShowReset(false)} onDone={onRefresh} />
            )}
        </>
    );
}

// ── Audit log panel ───────────────────────────────────────────────────────────

function AuditLogPanel() {
    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => rbac.auditLogs(50).then(r => r.data),
        staleTime: 10_000,
        refetchInterval: 30_000,
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {(!data || data.length === 0) && (
                <p className="text-xs text-gray-600 text-center py-6">No audit events yet.</p>
            )}
            {(data ?? []).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02]">
                    <span
                        className="mt-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'rgba(0,255,255,0.08)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.15)' }}
                    >
                        {entry.action}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-300 truncate">
                            <span className="text-gray-500">{entry.actor_email}</span>
                            {entry.detail && <span className="text-gray-600"> → {entry.detail}</span>}
                        </p>
                        <p className="text-[9px] text-gray-700 mt-0.5">
                            {new Date(entry.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const [showCreate, setShowCreate] = useState(false);
    const [profileUser, setProfileUser] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('users');
    const [errorMsg, setErrorMsg] = useState('');

    const currentUserId = currentUser?.id ?? '';

    const { data: users = [], isLoading, refetch } = useQuery({
        queryKey: ['rbac-users'],
        queryFn: () => rbac.listUsers().then(r => r.data),
        staleTime: 10_000,
    });

    const refresh = useCallback(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }, [refetch, queryClient]);

    const SUB_TABS = [
        { id: 'users', label: 'Users' },
        { id: 'audit', label: 'Audit Log' },
    ];

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">
                        User Management
                    </h2>
                    <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,255,255,0.08)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.15)' }}
                    >
                        {users.length} users
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-cyan-400 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.25)', color: '#00ffff' }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New User
                    </button>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-0">
                {SUB_TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveSubTab(t.id)}
                        className={`relative pb-3 text-xs font-bold transition-colors ${
                            activeSubTab === t.id ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'
                        }`}
                    >
                        {t.label}
                        {activeSubTab === t.id && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Error banner */}
            {errorMsg && (
                <div
                    className="flex items-start gap-3 px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)' }}
                >
                    <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
                    <p className="flex-1 text-xs text-red-300 font-mono">{errorMsg}</p>
                    <button
                        onClick={() => setErrorMsg('')}
                        className="text-red-400 hover:text-red-200 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Users table */}
            {activeSubTab === 'users' && (
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'rgba(0,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-600">User</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-600">Role</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-600">Status</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-700">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                                {users.map(u => (
                                    <UserRow
                                        key={u.id}
                                        u={u}
                                        currentUserId={currentUserId}
                                        onRefresh={refresh}
                                        onError={setErrorMsg}
                                        onOpenProfile={setProfileUser}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Audit log */}
            {activeSubTab === 'audit' && (
                <div
                    className="rounded-xl p-4"
                    style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
                >
                    <AuditLogPanel />
                </div>
            )}

            {showCreate && (
                <CreateUserModal
                    onClose={() => setShowCreate(false)}
                    onCreated={refresh}
                />
            )}

            {profileUser && (
                <UserProfileModal
                    user={profileUser}
                    onClose={() => setProfileUser(null)}
                />
            )}
        </div>
    );
}
