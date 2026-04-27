import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useRealTime } from '../context/RealTimeContext';

const LAST_SEEN_KEY = 'notif.lastSeenAt';

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
    const [lastSeenAt, setLastSeenAt] = useState(() => {
        try { return parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) || 0; }
        catch { return 0; }
    });
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

    // Mark read when dropdown opens
    useEffect(() => {
        if (open) markAllRead();
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // External open trigger (e.g. command palette)
    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('dashboard:open-notifications', handler);
        return () => window.removeEventListener('dashboard:open-notifications', handler);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                title="Notifications"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 text-[8px] font-black rounded-full leading-tight flex items-center justify-center"
                        style={{
                            background: '#ff0055',
                            color: 'white',
                            minWidth: '14px',
                            height: '14px',
                            padding: '0 3px',
                            boxShadow: '0 0 6px rgba(255,0,85,0.6)',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, rgba(15,30,40,0.98), rgba(10,20,28,0.99))' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs font-black uppercase tracking-wider text-gray-300">Notifications</span>
                            {alerts.length > 0 && unreadCount === 0 && (
                                <span className="text-[9px] text-gray-600 font-mono">all read</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {alerts.length > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-cyan-400 font-bold uppercase tracking-wider transition-colors"
                                >
                                    <Check className="h-2.5 w-2.5" /> Mark read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-0.5 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                                <p className="text-xs text-gray-500">No notifications yet</p>
                                <p className="text-[10px] text-gray-700 mt-1">
                                    Security events appear here as they happen
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {alerts.map((alert, idx) => {
                                    const sev = (alert.severity || alert.level || 'info').toLowerCase();
                                    const dot = sevColor(sev);
                                    const ts = alert.timestamp ? new Date(alert.timestamp).getTime() : 0;
                                    const isUnread = ts > lastSeenAt;
                                    return (
                                        <li key={idx} className={`px-4 py-3 transition-colors ${isUnread ? 'bg-white/[0.025]' : ''}`}>
                                            <div className="flex items-start gap-2.5">
                                                <div
                                                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                                                    style={{
                                                        background: dot,
                                                        boxShadow: isUnread ? `0 0 6px ${dot}80` : 'none',
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs leading-snug font-semibold ${isUnread ? 'text-white' : 'text-gray-400'}`}>
                                                        {alert.title || alert.message || 'Security alert'}
                                                    </p>
                                                    {alert.message && alert.title && (
                                                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 font-mono">
                                                            {alert.message}
                                                        </p>
                                                    )}
                                                    {alert.target && (
                                                        <p className="text-[9px] text-gray-600 font-mono mt-0.5 truncate">{alert.target}</p>
                                                    )}
                                                </div>
                                                <span className="text-[9px] text-gray-600 font-mono shrink-0 mt-0.5">
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
                        <div className="px-4 py-2 border-t border-white/5">
                            <p className="text-[9px] text-gray-600 font-mono text-center">
                                {alerts.length} event{alerts.length === 1 ? '' : 's'} · live from WebSocket
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
