import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Github, Twitter, Linkedin } from 'lucide-react';

const COLUMNS = [
    {
        title: 'Product',
        links: [
            { label: 'Features',     href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Use cases',    href: '#use-cases' },
            { label: 'Dashboard',    to: '/login' },
        ],
    },
    {
        title: 'Resources',
        links: [
            { label: 'Documentation', href: '#' },
            { label: 'FAQ',           href: '#faq' },
            { label: 'Lab setup',     href: '#' },
            { label: 'Changelog',     href: '#' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About',   to: '/about' },
            { label: 'Team',    to: '/about' },
            { label: 'Contact', href: '#' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy',   href: '#' },
            { label: 'Terms',     href: '#' },
            { label: 'Security',  href: '#' },
        ],
    },
];

export default function LandingFooter() {
    return (
        <footer className="relative border-t border-white/5 bg-cyber-bg/60">
            <div className="mx-auto max-w-7xl px-6 md:px-10 py-16">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
                    <div className="col-span-2 md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-cyber-accent/10 ring-1 ring-cyber-accent/40 flex items-center justify-center">
                                <Shield className="h-4.5 w-4.5 text-cyber-accent" />
                            </div>
                            <span className="font-display text-white font-bold text-lg leading-none">
                                <span className="text-cyber-accent">OSC</span>
                                <span className="block text-[8px] font-bold uppercase tracking-[0.25em] text-white/45 mt-0.5">
                                    Orchestration Security Center
                                </span>
                            </span>
                        </Link>
                        <p className="text-white/55 text-sm max-w-xs leading-relaxed">
                            Deterministic security orchestration built for SMEs that big SOCs forgot.
                        </p>
                        <div className="flex gap-3 mt-5">
                            {[Github, Twitter, Linkedin].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="h-9 w-9 rounded-lg bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center text-white/60 hover:text-cyber-accent hover:ring-cyber-accent/40 transition-colors"
                                    aria-label="social link"
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {COLUMNS.map((col) => (
                        <div key={col.title}>
                            <h4 className="text-white text-sm font-semibold mb-4 font-display">{col.title}</h4>
                            <ul className="space-y-2.5">
                                {col.links.map((l) => (
                                    <li key={l.label}>
                                        {l.to ? (
                                            <Link to={l.to} className="text-white/60 hover:text-cyber-accent text-sm transition-colors">
                                                {l.label}
                                            </Link>
                                        ) : (
                                            <a href={l.href} className="text-white/60 hover:text-cyber-accent text-sm transition-colors">
                                                {l.label}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <p className="text-white/40 text-xs">
                        © {new Date().getFullYear()} Orchestration Security Center (OSC). All rights reserved.
                    </p>
                    <p className="text-white/40 text-xs">Built as a graduation project — Team of 11.</p>
                </div>
            </div>
        </footer>
    );
}
