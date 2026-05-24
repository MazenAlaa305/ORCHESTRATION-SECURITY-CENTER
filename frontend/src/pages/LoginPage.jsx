import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, User, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { stagger, staggerItem } from '../lib/motion';

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
                login(data.access_token, data.email ?? username, data.role, data.user_id ?? null);
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
            <motion.div
                variants={stagger(0.08, 0.1)}
                initial="initial"
                animate="animate"
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Header badge */}
                <motion.div variants={staggerItem} className="flex flex-col items-center mb-8">
                    <motion.div
                        initial={{ scale: 0.6, rotate: -30, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{
                             background: 'linear-gradient(135deg, rgba(77,189,177,0.15) 0%, rgba(26,69,102,0.2) 100%)',
                             border: '1px solid rgba(77,189,177,0.3)',
                             boxShadow: '0 0 32px rgba(77,189,177,0.12)',
                         }}>
                        <Shield className="w-8 h-8" style={{ color: '#4dbdb1' }} />
                    </motion.div>
                    <h1 className="text-2xl font-black uppercase tracking-[0.25em]"
                        style={{ color: '#4dbdb1', textShadow: '0 0 24px rgba(77,189,177,0.4)' }}>
                        OSC
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1 font-bold">
                        Orchestration Security Center
                    </p>
                </motion.div>

                {/* Glass card */}
                <motion.div
                    variants={staggerItem}
                    {...(error ? { animate: { x: [0, -8, 8, -6, 6, 0], opacity: 1, y: 0 }, transition: { duration: 0.45 } } : {})}
                    className="rounded-2xl p-8"
                     style={{
                         background: 'linear-gradient(135deg, rgba(77,189,177,0.06) 0%, rgba(16,34,43,0.7) 40%, rgba(10,26,34,0.8) 100%)',
                         border: '1px solid rgba(77,189,177,0.18)',
                         boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(77,189,177,0.08)',
                         backdropFilter: 'blur(24px)',
                     }}>

                    <h2 className="text-[11px] uppercase tracking-[0.3em] font-black text-gray-400 mb-6 text-center">
                        Secure Authentication
                    </h2>

                    <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-2 rounded-lg px-4 py-3 mb-5 text-xs font-mono overflow-hidden"
                            style={{
                                 background: 'rgba(255,60,60,0.08)',
                                 border: '1px solid rgba(255,60,60,0.25)',
                                 color: '#ff6b6b',
                             }}>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {error}
                        </motion.div>
                    )}
                    </AnimatePresence>

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
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={!loading ? { y: -1, scale: 1.01 } : undefined}
                            whileTap={!loading ? { scale: 0.97 } : undefined}
                            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-colors mt-2"
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
                            <AnimatePresence mode="wait">
                                {loading
                                    ? <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating…</motion.span>
                                    : <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Access System</motion.span>}
                            </AnimatePresence>
                        </motion.button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
                        <p className="text-[10px] text-gray-500">
                            Need an account?{' '}
                            <Link to="/signup" className="font-bold hover:underline" style={{ color: '#4dbdb1' }}>
                                Create one
                            </Link>
                        </p>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.div variants={staggerItem} className="mt-5 text-center space-y-1">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-gray-600 font-bold">
                        Authorized Personnel Only
                    </p>
                    <p className="text-[9px] text-gray-700 font-mono">
                        All actions are logged and monitored
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
