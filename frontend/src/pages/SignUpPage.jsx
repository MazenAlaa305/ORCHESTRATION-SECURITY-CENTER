import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, User, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function SignUpPage() {
    const [email, setEmail]       = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm]   = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            setError('Password must be at least 8 characters and contain both letters and digits');
            return;
        }
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost/api/v1';
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName || null }),
            });
            const data = await response.json();
            if (response.ok) {
                login(data.access_token, data.email, data.role, data.user_id);
                navigate('/dashboard/overview');
            } else {
                const detail = Array.isArray(data.detail)
                    ? data.detail.map(d => d.msg).join(', ')
                    : (data.detail || data.message || 'Registration failed');
                setError(detail);
            }
        } catch {
            setError('Network error — is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full pl-9 pr-4 py-3 rounded-lg text-sm font-mono text-white placeholder-gray-700 outline-none transition-all";
    const inputStyle = { background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(77,189,177,0.15)' };
    const focusOn = (e) => { e.target.style.borderColor = 'rgba(77,189,177,0.5)'; };
    const focusOff = (e) => { e.target.style.borderColor = 'rgba(77,189,177,0.15)'; };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-12"
             style={{ background: 'radial-gradient(ellipse at 60% 20%, #0d2e3a 0%, #10222b 45%, #0a1a22 100%)' }}>

            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full opacity-[0.07]"
                     style={{ background: '#4dbdb1', filter: 'blur(120px)' }} />
                <div className="absolute bottom-[-10%] left-[-8%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
                     style={{ background: '#1a4566', filter: 'blur(100px)' }} />
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                 style={{
                     backgroundImage: 'linear-gradient(rgba(77,189,177,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(77,189,177,0.6) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                 }} />

            <div className="relative z-10 w-full max-w-md mx-4">
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
                        Create your account
                    </p>
                </div>

                <div className="rounded-2xl p-8"
                     style={{
                         background: 'linear-gradient(135deg, rgba(77,189,177,0.06) 0%, rgba(16,34,43,0.7) 40%, rgba(10,26,34,0.8) 100%)',
                         border: '1px solid rgba(77,189,177,0.18)',
                         boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(77,189,177,0.08)',
                         backdropFilter: 'blur(24px)',
                     }}>

                    <h2 className="text-[11px] uppercase tracking-[0.3em] font-black text-gray-400 mb-6 text-center">
                        New Account Registration
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                       autoComplete="email" placeholder="you@example.com"
                                       className={inputCls} style={inputStyle}
                                       onFocus={focusOn} onBlur={focusOff} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">Full Name (optional)</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                       autoComplete="name" placeholder="Jane Doe" maxLength={120}
                                       className={inputCls} style={inputStyle}
                                       onFocus={focusOn} onBlur={focusOff} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                       autoComplete="new-password" placeholder="At least 8 characters"
                                       className={inputCls} style={inputStyle}
                                       onFocus={focusOn} onBlur={focusOff} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-gray-500 mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                                       autoComplete="new-password" placeholder="Re-enter password"
                                       className={inputCls} style={inputStyle}
                                       onFocus={focusOn} onBlur={focusOff} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all mt-2"
                                style={{
                                    background: loading
                                        ? 'rgba(77,189,177,0.08)'
                                        : 'linear-gradient(135deg, rgba(77,189,177,0.18) 0%, rgba(26,69,102,0.25) 100%)',
                                    border: '1px solid rgba(77,189,177,0.4)',
                                    color: '#4dbdb1',
                                    boxShadow: loading ? 'none' : '0 0 20px rgba(77,189,177,0.1)',
                                }}>
                            {loading
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating account…</>
                                : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
                        <p className="text-[10px] text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold hover:underline" style={{ color: '#4dbdb1' }}>
                                Sign in
                            </Link>
                        </p>
                        <p className="text-[9px] text-gray-700 mt-2">
                            New accounts start with VIEWER role. Contact your admin to upgrade.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
