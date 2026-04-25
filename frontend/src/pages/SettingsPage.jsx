import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import RoleGuard from '../components/ui/RoleGuard';
import EmptyState from '../components/ui/EmptyState';
import api from '../services/api';

/**
 * Account & user-management settings page.
 *
 * Sections:
 *   1. Account info + logout
 *   2. Change password
 *   3. (admin only) User table
 */
export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState(null);
    const [pw, setPw] = useState({ current: '', next: '' });
    const [pwMsg, setPwMsg] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        if (user?.role !== 'ADMIN') return;
        let cancelled = false;
        api.get('/rbac/users')
            .then((r) => { if (!cancelled) setUsers(r.data || []); })
            .catch(() => { if (!cancelled) setUsers([]); });
        return () => { cancelled = true; };
    }, [user]);

    const submitPassword = async (e) => {
        e.preventDefault();
        setPwMsg('');
        setPwLoading(true);
        try {
            await api.post('/auth/change-password', {
                current_password: pw.current,
                new_password: pw.next,
            });
            setPwMsg('Password updated.');
            setPw({ current: '', next: '' });
        } catch (err) {
            setPwMsg(err.response?.data?.detail || 'Update failed');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div style={{ padding: '1.5rem', color: '#e6f2ff', maxWidth: 720 }}>
            <h2 style={{ color: '#00ffff', marginTop: 0 }}>Settings</h2>

            <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#cfe1f2', fontSize: 16, marginBottom: '0.5rem' }}>Account</h3>
                <p style={{ margin: 0, color: '#aac4d6' }}>
                    {user?.email} — <span style={{ color: '#00ffff' }}>{user?.role}</span>
                </p>
                <button
                    onClick={logout}
                    style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(255,80,80,0.15)',
                        border: '1px solid #ff5050',
                        color: '#ff8585',
                        cursor: 'pointer',
                    }}
                >
                    Log out
                </button>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#cfe1f2', fontSize: 16, marginBottom: '0.5rem' }}>Change password</h3>
                <form onSubmit={submitPassword} style={{ maxWidth: 320 }}>
                    <input
                        type="password"
                        placeholder="Current password"
                        value={pw.current}
                        onChange={(e) => setPw({ ...pw, current: e.target.value })}
                        required
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="New password"
                        value={pw.next}
                        onChange={(e) => setPw({ ...pw, next: e.target.value })}
                        required
                        style={inputStyle}
                    />
                    <button
                        type="submit"
                        disabled={pwLoading}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(0,255,255,0.1)',
                            border: '1px solid #00ffff',
                            color: '#00ffff',
                            cursor: pwLoading ? 'wait' : 'pointer',
                        }}
                    >
                        {pwLoading ? 'Updating…' : 'Update password'}
                    </button>
                    {pwMsg && (
                        <p style={{ marginTop: '0.5rem', color: '#aac4d6', fontSize: 13 }}>{pwMsg}</p>
                    )}
                </form>
            </section>

            <RoleGuard allow={['ADMIN']}>
                <section>
                    <h3 style={{ color: '#cfe1f2', fontSize: 16, marginBottom: '0.5rem' }}>Users</h3>
                    {users === null && <p style={{ color: '#7e8fa3' }}>Loading…</p>}
                    {users?.length === 0 && (
                        <EmptyState
                            title="No users found"
                            message="Create the first one through the API or seed flow."
                            icon="👥"
                        />
                    )}
                    {users && users.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#7e8fa3' }}>
                                    <th style={cellStyle}>Email</th>
                                    <th style={cellStyle}>Role</th>
                                    <th style={cellStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} style={{ borderTop: '1px solid #1c2733' }}>
                                        <td style={cellStyle}>{u.email}</td>
                                        <td style={cellStyle}>{u.role}</td>
                                        <td style={cellStyle}>
                                            {u.disabled ? (
                                                <span style={{ color: '#ff8585' }}>disabled</span>
                                            ) : (
                                                <span style={{ color: '#80e0a0' }}>active</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </RoleGuard>
        </div>
    );
}

const inputStyle = {
    display: 'block',
    width: '100%',
    marginBottom: '0.5rem',
    padding: '0.5rem',
    background: '#0a0a0a',
    border: '1px solid #00ffff',
    color: '#e6f2ff',
    fontFamily: 'inherit',
};

const cellStyle = {
    padding: '0.5rem 0.75rem',
};
