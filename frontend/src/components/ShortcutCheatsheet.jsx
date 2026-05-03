import React, { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');
const MOD = isMac ? '⌘' : 'Ctrl';

const SECTIONS = [
    {
        title: 'Global',
        items: [
            { keys: [MOD, 'K'],  desc: 'Open command palette / search' },
            { keys: ['?'],       desc: 'Toggle this shortcuts panel' },
            { keys: ['Esc'],     desc: 'Close modal / drawer / popover' },
            { keys: ['Q'],       desc: 'Quick scan (with confirmation)' },
        ],
    },
    {
        title: 'Quick Scan Popover',
        items: [
            { keys: ['Enter'], desc: 'Run scan' },
            { keys: ['C'],     desc: 'Open full scan configuration' },
            { keys: ['Esc'],   desc: 'Cancel' },
        ],
    },
    {
        title: 'Finding Drawer',
        items: [
            { keys: ['J'],     desc: 'Next finding' },
            { keys: ['K'],     desc: 'Previous finding' },
            { keys: ['↓'],     desc: 'Next finding (alt)' },
            { keys: ['↑'],     desc: 'Previous finding (alt)' },
            { keys: ['Esc'],   desc: 'Close drawer' },
        ],
    },
    {
        title: 'Navigation',
        items: [
            { keys: ['G', 'C'], desc: 'Go to Command Center' },
            { keys: ['G', 'O'], desc: 'Go to Operations' },
            { keys: ['G', 'T'], desc: 'Go to Threat Center' },
            { keys: ['G', 'A'], desc: 'Go to AI Brain' },
            { keys: ['G', 'R'], desc: 'Go to Reports' },
        ],
    },
];

const Kbd = ({ children }) => (
    <span
        className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-[10px] font-mono font-bold border"
        style={{
            background: 'rgba(0,255,255,0.06)',
            borderColor: 'rgba(0,255,255,0.2)',
            color: '#00ffff',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}
    >
        {children}
    </span>
);

export default function ShortcutCheatsheet() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Ignore keystrokes while user is typing in an input/textarea/contenteditable
            const t = e.target;
            const isTyping =
                t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

            if (e.key === 'Escape' && open) {
                setOpen(false);
                return;
            }
            if (!isTyping && e.key === '?' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        const onOpen = () => setOpen(true);
        window.addEventListener('dashboard:open-cheatsheet', onOpen);
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('dashboard:open-cheatsheet', onOpen);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={() => setOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl p-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(15,30,40,0.96), rgba(10,20,28,0.98))',
                    border: '1px solid rgba(0,255,255,0.15)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,255,0.05)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="p-1.5 rounded-md"
                            style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.2)' }}
                        >
                            <Keyboard className="h-4 w-4" style={{ color: '#00ffff' }} />
                        </div>
                        <h2
                            className="text-sm font-black text-white uppercase tracking-wider"
                            style={{ fontFamily: 'Syne, sans-serif' }}
                        >
                            Keyboard <span style={{ color: '#00ffff' }}>Shortcuts</span>
                        </h2>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Sections — two-column grid on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {SECTIONS.map((section) => (
                        <div key={section.title}>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-2">
                                {section.title}
                            </p>
                            <div className="space-y-1.5">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                                        <span className="text-xs text-gray-300">{item.desc}</span>
                                        <span className="flex items-center gap-1 shrink-0">
                                            {item.keys.map((k, ki) => (
                                                <React.Fragment key={ki}>
                                                    {ki > 0 && (
                                                        <span className="text-[9px] text-gray-600">then</span>
                                                    )}
                                                    <Kbd>{k}</Kbd>
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[10px] text-gray-600">
                        Press <Kbd>G</Kbd> then any letter within ~1 s to navigate. Shortcuts ignore your input fields.
                    </p>
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        Close
                        <Kbd>Esc</Kbd>
                    </span>
                </div>
            </div>
        </div>
    );
}
