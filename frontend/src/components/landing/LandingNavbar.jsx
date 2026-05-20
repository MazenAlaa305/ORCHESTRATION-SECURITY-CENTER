import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Menu, X, LayoutDashboard } from 'lucide-react';
import GradientButton from './shared/GradientButton';
import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
    { label: 'Features',    href: '#features' },
    { label: 'How it works',href: '#how-it-works' },
    { label: 'Use cases',   href: '#use-cases' },
    { label: 'FAQ',         href: '#faq' },
    { label: 'About us',    to: '/about' },
];

export default function LandingNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
                scrolled
                    ? 'backdrop-blur-md bg-cyber-bg/70 border-b border-white/5'
                    : 'bg-transparent'
            }`}
        >
            <div className="mx-auto max-w-7xl px-6 md:px-10 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="h-9 w-9 rounded-lg bg-cyber-accent/10 ring-1 ring-cyber-accent/40 flex items-center justify-center">
                        <Shield className="h-4.5 w-4.5 text-cyber-accent" />
                    </div>
                    <span className="font-display text-white font-bold text-lg tracking-tight leading-none">
                        <span className="text-cyber-accent">OSC</span>
                        <span className="hidden sm:block text-[8px] font-bold uppercase tracking-[0.25em] text-white/45 mt-0.5">
                            Orchestration Security Center
                        </span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map((l) => (
                        l.to ? (
                            <Link
                                key={l.label}
                                to={l.to}
                                className="text-sm text-white/70 hover:text-cyber-accent transition-colors"
                            >
                                {l.label}
                            </Link>
                        ) : (
                            <a
                                key={l.label}
                                href={l.href}
                                className="text-sm text-white/70 hover:text-cyber-accent transition-colors"
                            >
                                {l.label}
                            </a>
                        )
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    {user ? (
                        <GradientButton to="/dashboard/overview" variant="primary" size="md" icon={LayoutDashboard}>
                            Open dashboard
                        </GradientButton>
                    ) : (
                        <>
                            <GradientButton to="/login" variant="ghost" size="md">Login</GradientButton>
                            <GradientButton to="/signup" variant="primary" size="md">Get started</GradientButton>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="md:hidden text-white/80 hover:text-white"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-t border-white/5 bg-cyber-bg/95 backdrop-blur-md"
                    >
                        <div className="px-6 py-4 flex flex-col gap-3">
                            {NAV_LINKS.map((l) => (
                                l.to ? (
                                    <Link
                                        key={l.label}
                                        to={l.to}
                                        onClick={() => setOpen(false)}
                                        className="text-white/80 py-2 text-sm"
                                    >
                                        {l.label}
                                    </Link>
                                ) : (
                                    <a
                                        key={l.label}
                                        href={l.href}
                                        onClick={() => setOpen(false)}
                                        className="text-white/80 py-2 text-sm"
                                    >
                                        {l.label}
                                    </a>
                                )
                            ))}
                            <div className="flex gap-3 pt-2">
                                {user ? (
                                    <GradientButton to="/dashboard/overview" variant="primary" size="md" className="flex-1" icon={LayoutDashboard}>
                                        Open dashboard
                                    </GradientButton>
                                ) : (
                                    <>
                                        <GradientButton to="/login" variant="secondary" size="md" className="flex-1">Login</GradientButton>
                                        <GradientButton to="/signup" variant="primary" size="md" className="flex-1">Get started</GradientButton>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
