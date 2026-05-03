import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, User, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost/api/v1';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password })
            });
            const data = await response.json();
            if (response.ok) {
                login(data.access_token, username, data.role);
                if (data.force_password_change) {
                    alert('You must change your password on first login. Please update it in your profile settings.');
                }
                navigate('/dashboard/overview');
            } else {
                setError(data.detail || data.message || 'Authentication failed');
            }
        } catch {
            setError('Network error — is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
             style={{ background: 'radial-gradient(ellipse at 60% 20%, #0d2e3a 0%, #10222b 45%, #0a1a22 100%)' }}>

            {/* Ambient glows */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full opacity-[0.07]"
                     style={{ background: '#4dbdb1', filter: 'blur(120px)' }} />
                <div className="absolute bottom-[-10%] left-[-8%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
                     style={{ background: '#1a4566', filter: 'blur(100px)' }} />
            </div>

            {/* Grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                 style={{
                     backgroundImage: 'linear-gradient(rgba(77,189,177,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(77,189,177,0.6) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                 }} />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Header badge */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                         style={{
                             background: 'linear-gradient(135deg, rgba(77,189,177,0.15) 0%, rgba(26,69,102,0.2) 100%)',
                             border: '1px solid rgba(77,189,177,0.3)',
                             boxShadow: '0 0 32px rgba(77,189,177,0.12)',
                         }}>
                        <Shield className="w-8 h-8" style={{ color: '#4dbdb1' }} />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-[0.25em]"
                        style={{ color: '#4dbdb1', textShadow: '0 0 24px rgba(77,189,177,0.4)' }}>
                        OSC
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1 font-bold">
                        Orchestration Security Center
                    </p>
                </div>

                {/* Glass card */}
                <div className="rounded-2xl p-8"
                     style={{
                         background: 'linear-gradient(135deg, rgba(77,189,177,0.06) 0%, rgba(16,34,43,0.7) 40%, rgba(10,26,34,0.8) 100%)',
                         border: '1px solid rgba(77,189,177,0.18)',
                         boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(77,189,177,0.08)',
                         backdropFilter: 'blur(24px)',
                     }}>

                    <h2 className="text-[11px] uppercase tracking-[0.3em] font-black text-gray-400 mb-6 text-center">
                        Secure Authentication
                    </h2>

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg px-4 py-3 mb-5 text-xs font-mono"
                             style={{
                                 background: 'rgba(255,60,60,0.08)',
                                 border: '1px solid rgba(255,60,60,0.25)',
                                 color: '#ff6b6b',
                             }}>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">
                                Username / Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="Enter username or email"
                                    className="w-full pl-9 pr-4 py-3 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none transition-all"
                                    style={{
                                        background: 'rgba(0,0,0,0.35)',
                                        border: '1px solid rgba(77,189,177,0.15)',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(77,189,177,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(77,189,177,0.15)'}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••••••"
                                    className="w-full pl-9 pr-4 py-3 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none transition-all"
                                    style={{
                                        background: 'rgba(0,0,0,0.35)',
                                        border: '1px solid rgba(77,189,177,0.15)',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(77,189,177,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(77,189,177,0.15)'}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all mt-2"
                            style={{
                                background: loading
                                    ? 'rgba(77,189,177,0.08)'
                                    : 'linear-gradient(135deg, rgba(77,189,177,0.18) 0%, rgba(26,69,102,0.25) 100%)',
                                border: '1px solid rgba(77,189,177,0.4)',
                                color: '#4dbdb1',
                                boxShadow: loading ? 'none' : '0 0 20px rgba(77,189,177,0.1)',
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(77,189,177,0.28) 0%, rgba(26,69,102,0.35) 100%)'; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(77,189,177,0.18) 0%, rgba(26,69,102,0.25) 100%)'; }}
                        >
                            {loading
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating…</>
                                : 'Access System'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-5 text-center space-y-1">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-gray-600 font-bold">
                        Authorized Personnel Only
                    </p>
                    <p className="text-[9px] text-gray-700 font-mono">
                        All actions are logged and monitored
                    </p>
                </div>
            </div>
        </div>
    );
}
