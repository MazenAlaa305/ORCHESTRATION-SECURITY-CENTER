import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, Check } from 'lucide-react';
import { useRealTime } from '../context/RealTimeContext';

const LAST_SEEN_KEY = 'notif.lastSeenAt';

const BG        = '#0b1623';
const BG_HOVER  = '#111e2d';
const BORDER    = '#1e2d3d';
const TEXT_DIM  = '#4a5a6a';
const TEXT_MID  = '#6a7a8a';

const SEV_COLOR = {
    critical: '#ff0055',
    high:     '#ff6a00',
    medium:   '#ffaa00',
    low:      '#00aaff',
    info:     '#94a3b8',
};

const sevColor = (sev) => SEV_COLOR[(sev || 'info').toLowerCase()] || SEV_COLOR.info;

const fmtTime = (ts) => {
    if (!ts) return '';
    const diffMs = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
};

export default function NotificationsBell() {
    const { state: realTime } = useRealTime();
    const alerts = realTime.alerts || [];

    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 56, right: 16 });
    const [lastSeenAt, setLastSeenAt] = useState(() => {
        try { return parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) || 0; }
        catch { return 0; }
    });
    const buttonRef  = useRef(null);
    const dropdownRef = useRef(null);

    const unreadCount = alerts.filter(a => {
        const ts = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        return ts > lastSeenAt;
    }).length;

    const markAllRead = () => {
        const now = Date.now();
        setLastSeenAt(now);
        try { localStorage.setItem(LAST_SEEN_KEY, String(now)); } catch {}
    };

    useEffect(() => {
        if (open) {
            markAllRead();
            if (buttonRef.current) {
                const r = buttonRef.current.getBoundingClientRect();
                setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
            }
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current  && !buttonRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('dashboard:open-notifications', handler);
        return () => window.removeEventListener('dashboard:open-notifications', handler);
    }, []);

    return (
        <>
            <motion.button
                ref={buttonRef}
                onClick={() => setOpen(o => !o)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                animate={unreadCount > 0 ? { rotate: [0, -10, 10, -6, 6, 0] } : {}}
                transition={unreadCount > 0 ? { duration: 0.7, repeat: 0 } : {}}
                className="relative p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ background: open ? BG_HOVER : 'transparent' }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                title="Notifications"
            >
                <Bell className="h-4 w-4" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                            className="absolute -top-0.5 -right-0.5 text-[8px] font-black rounded-full leading-tight flex items-center justify-center"
                            style={{ background: '#ff0055', color: '#fff', minWidth: 14, height: 14, padding: '0 3px' }}
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {createPortal(
                <AnimatePresence>
                {open && (
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        right: pos.right,
                        width: 320,
                        zIndex: 9999,
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                        boxShadow: '0 16px 48px #000, 0 2px 8px #000',
                        overflow: 'hidden',
                        transformOrigin: 'top right',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, background: BG }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bell size={13} color={TEXT_MID} />
                            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c8d8e8' }}>Notifications</span>
                            {alerts.length > 0 && unreadCount === 0 && (
                                <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: 'monospace' }}>all read</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {alerts.length > 0 && (
                                <button
                                    onClick={markAllRead}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: TEXT_MID, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <Check size={10} /> Mark read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, padding: 2, borderRadius: 4 }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ maxHeight: 320, overflowY: 'auto', background: BG }}>
                        {alerts.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <Bell size={28} color={TEXT_DIM} style={{ margin: '0 auto 8px' }} />
                                <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>No notifications yet</p>
                                <p style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>Security events appear here as they happen</p>
                            </div>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {alerts.map((alert, idx) => {
                                    const sev = (alert.severity || alert.level || 'info').toLowerCase();
                                    const dot = sevColor(sev);
                                    const ts = alert.timestamp ? new Date(alert.timestamp).getTime() : 0;
                                    const isUnread = ts > lastSeenAt;
                                    return (
                                        <li
                                            key={idx}
                                            style={{
                                                padding: '10px 16px',
                                                borderBottom: `1px solid ${BORDER}`,
                                                background: isUnread ? BG_HOVER : BG,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dot }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 11, fontWeight: 600, color: isUnread ? '#e8f0f8' : '#8899aa', margin: 0, lineHeight: 1.4 }}>
                                                        {alert.title || alert.message || 'Security alert'}
                                                    </p>
                                                    {alert.message && alert.title && (
                                                        <p style={{ fontSize: 10, color: TEXT_MID, marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                            {alert.message}
                                                        </p>
                                                    )}
                                                    {alert.target && (
                                                        <p style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.target}</p>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: 'monospace', flexShrink: 0, marginTop: 2 }}>
                                                    {fmtTime(alert.timestamp)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    {alerts.length > 0 && (
                        <div style={{ padding: '8px 16px', borderTop: `1px solid ${BORDER}`, background: BG, textAlign: 'center' }}>
                            <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: 'monospace' }}>
                                {alerts.length} event{alerts.length === 1 ? '' : 's'} · live from WebSocket
                            </span>
                        </div>
                    )}
                </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
