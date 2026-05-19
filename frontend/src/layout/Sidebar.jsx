import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, Scan, Activity, Settings, ChevronLeft, Brain, FileText, LogOut, Bookmark, Users, Home } from 'lucide-react';
import { useRealTime } from '../context/RealTimeContext';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { loadSavedViews, VIEWS_CHANGED_EVENT } from '../hooks/useSavedViews';
import { authService, resolveAvatarUrl } from '../services/api';

const buildNavSections = (isAdmin) => [
    {
        label: 'Security',
        items: [
            { icon: <LayoutDashboard />, label: 'Command Center', id: 'overview' },
            { icon: <Activity />, label: 'Threat Center', id: 'threat-center' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { icon: <Scan />, label: 'Scanner', id: 'operations' },
            { icon: <Brain />, label: 'AI Brain', id: 'ai-brain' },
        ],
    },
    {
        label: 'System',
        items: [
            { icon: <FileText />, label: 'Reports', id: 'reports' },
            ...(isAdmin ? [{ icon: <Users />, label: 'Users', id: 'users' }] : []),
            { icon: <Settings />, label: 'Settings', id: 'settings' },
        ],
    },
];

const NavItem = ({ icon, label, collapsed, active, onClick, badge }) => (
    <motion.div
        onClick={onClick}
        whileHover={{ x: collapsed ? 0 : 3 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className={`relative flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors duration-200 flex-shrink-0 group mb-0.5 ${collapsed ? 'justify-center' : ''}`}
        style={{
            background: active
                ? 'linear-gradient(135deg, rgba(0,255,255,0.08), rgba(0,255,255,0.04))'
                : 'transparent',
            border: active
                ? '1px solid rgba(0,255,255,0.15)'
                : '1px solid transparent',
        }}
        title={collapsed ? label : undefined}
    >
        {/* Active left accent bar — uses layoutId to slide between nav items */}
        {active && !collapsed && (
            <motion.div
                layoutId="sidebar-active-indicator"
                className="absolute left-0 top-1/2 w-0.5 h-4 rounded-full"
                style={{ background: '#00ffff', boxShadow: '0 0 6px #00ffff', y: '-50%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
        )}

        {/* Icon */}
        <div className="relative">
            {icon && (
                <span style={{ color: active ? '#00ffff' : 'rgba(148,163,184,0.6)' }}>
                    {typeof icon === 'object'
                        ? { ...icon, props: { ...icon.props, className: 'h-3.5 w-3.5 shrink-0' } }
                        : icon
                    }
                </span>
            )}
            {/* Boolean badge → pulsing dot. Numeric badge handled inline below. */}
            {badge === true && (
                <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
                    style={{ background: '#00ffff', boxShadow: '0 0 6px #00ffff' }}
                />
            )}
            {/* Collapsed numeric badge — small dot with no count to avoid overlap */}
            {collapsed && typeof badge === 'number' && badge > 0 && (
                <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
                    style={{ background: '#ff0055', boxShadow: '0 0 6px #ff0055' }}
                />
            )}
        </div>

        {/* Label */}
        {!collapsed && (
            <span
                className="text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-colors flex-1"
                style={{ color: active ? '#00ffff' : 'rgba(148,163,184,0.6)' }}
            >
                {label}
            </span>
        )}

        {/* Expanded numeric badge — count pill on the right */}
        {!collapsed && typeof badge === 'number' && badge > 0 && (
            <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                className="text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none"
                style={{
                    background: 'rgba(255,0,85,0.15)',
                    border: '1px solid rgba(255,0,85,0.3)',
                    color: '#ff4d7d',
                    minWidth: '16px',
                    textAlign: 'center',
                }}
                title={`${badge} SLA overdue`}
            >
                {badge > 99 ? '99+' : badge}
            </motion.span>
        )}
    </motion.div>
);

const Sidebar = ({ activeTab, onTabChange }) => {
    const { state: realTime } = useRealTime();
    const { user, logout } = useAuth();
    const { canManageUsers } = usePermission();
    const navigate = useNavigate();
    const NAV_SECTIONS = buildNavSections(canManageUsers);
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
    });

    // ── Profile (avatar + display name) — fetched once per session, refreshed
    // when ProfilePage dispatches the 'profile-updated' event.
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        let alive = true;
        const load = () => authService.me()
            .then(res => { if (alive) setProfile(res.data); })
            .catch(() => {});
        if (user) load();
        const onUpdate = () => load();
        window.addEventListener('profile-updated', onUpdate);
        return () => { alive = false; window.removeEventListener('profile-updated', onUpdate); };
    }, [user?.email]);

    const avatarUrl   = resolveAvatarUrl(profile?.avatar_url);
    const displayName = profile?.full_name || user?.email;

    const isScanning = realTime.scanStatus === 'RUNNING';
    const isConnected = realTime.isConnected;
    const overdueCount = realTime.kpi?.overdue_findings ?? 0;

    // Pinned views — read from localStorage, re-read when the panel mutates them.
    const [pinnedViews, setPinnedViews] = useState(loadSavedViews);
    useEffect(() => {
        const refresh = () => setPinnedViews(loadSavedViews());
        window.addEventListener(VIEWS_CHANGED_EVENT, refresh);
        return () => window.removeEventListener(VIEWS_CHANGED_EVENT, refresh);
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '56px' : '208px');
    }, [collapsed]);

    // Persist collapse state
    const toggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { }
            return next;
        });
    };

    return (
        <aside
            className={`relative h-screen z-50 transition-all duration-300 flex flex-col shrink-0 ${collapsed ? 'w-14' : 'w-52'}`}
            style={{
                background: 'linear-gradient(180deg, rgba(18,38,48,0.92), rgba(10,24,32,0.96))',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(24px)',
            }}
        >
            {/* ── Logo / Header ─────────────────────────────────────────── */}
            <div
                className="h-14 flex items-center justify-between px-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(0,255,255,0.05)' }}
            >
                {!collapsed ? (
                    <>
                        <div className="flex items-center gap-2">
                            <div
                                className="p-1 rounded-md"
                                style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.2)' }}
                            >
                                <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#00ffff' }} />
                            </div>
                            <h1
                                className="text-xs font-black tracking-tight text-white uppercase"
                                style={{ fontFamily: 'Syne, sans-serif' }}
                            >
                                <span style={{ color: '#00ffff' }}>OSC</span>
                            </h1>
                        </div>
                        <button
                            onClick={toggleCollapse}
                            className="p-1 text-gray-600 hover:text-cyan-400 transition-colors"
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                    </>
                ) : (
                    <div
                        className="mx-auto p-1 cursor-pointer"
                        onClick={toggleCollapse}
                        role="button"
                        tabIndex={0}
                        aria-label="Expand sidebar"
                        title="Expand sidebar"
                        onKeyDown={(e) => e.key === 'Enter' && toggleCollapse()}
                    >
                        <ShieldCheck className="h-4 w-4" style={{ color: '#00ffff' }} />
                    </div>
                )}
            </div>

            {/* ── Navigation ────────────────────────────────────────────── */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-2.5 overflow-y-auto">
                {/* Home — navigates out to the public landing page */}
                <div className="mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <NavItem
                        icon={<Home className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(148,163,184,0.6)' }} />}
                        label="Home"
                        collapsed={collapsed}
                        active={false}
                        onClick={() => navigate('/')}
                    />
                </div>

                {NAV_SECTIONS.map(section => (
                    <div key={section.label} className="mb-4">
                        {!collapsed && (
                            <p className="text-[7px] font-black uppercase tracking-[0.4em] px-2 mb-2 text-gray-700">
                                {section.label}
                            </p>
                        )}
                        {section.items.map(item => (
                            <React.Fragment key={item.id}>
                                <NavItem
                                    icon={item.id === 'ai-brain'
                                        ? <Brain className="h-3.5 w-3.5 shrink-0" style={{ color: activeTab === item.id ? '#00ffff' : 'rgba(148,163,184,0.6)' }} />
                                        : { ...item.icon, props: { ...item.icon.props, className: 'h-3.5 w-3.5 shrink-0', style: { color: activeTab === item.id ? '#00ffff' : 'rgba(148,163,184,0.6)' } } }
                                    }
                                    label={item.label}
                                    collapsed={collapsed}
                                    active={activeTab === item.id}
                                    onClick={() => onTabChange?.(item.id)}
                                    badge={
                                        item.id === 'ai-brain' && isScanning
                                            ? true
                                            : item.id === 'threat-center' && overdueCount > 0
                                                ? overdueCount
                                                : undefined
                                    }
                                />
                                {/* Pinned views sub-list — only under Threat Center, only when expanded */}
                                {item.id === 'threat-center' && !collapsed && pinnedViews.length > 0 && (
                                    <div className="ml-3 pl-2 border-l border-white/5 mb-1">
                                        {pinnedViews.map(v => (
                                            <button
                                                key={v.name}
                                                onClick={() => {
                                                    onTabChange?.('threat-center');
                                                    window.dispatchEvent(new CustomEvent('dashboard:navigate',
                                                        { detail: { tab: 'threat-center', sub: 'vulnerabilities' } }));
                                                    window.dispatchEvent(new CustomEvent('dashboard:apply-view',
                                                        { detail: { payload: v.payload } }));
                                                }}
                                                className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-left text-[10px] text-gray-500 hover:text-cyan-300 hover:bg-white/5 transition-colors font-mono truncate"
                                                title={`Load view: ${v.name}`}
                                            >
                                                <Bookmark className="h-2.5 w-2.5 shrink-0 opacity-50" />
                                                <span className="truncate">{v.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                ))}
            </div>

            {/* ── User + Logout footer ──────────────────────────────────── */}
            <div
                className="px-3 py-3 flex-shrink-0 flex flex-col gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
            >
                {/* User info row — clickable, opens profile page */}
                {user && (
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className={`flex items-center gap-2 w-full rounded-md transition-colors hover:bg-white/[0.04] ${collapsed ? 'justify-center px-0 py-1' : 'px-1 py-1'}`}
                        title={collapsed ? `${displayName} — open profile` : 'Open profile'}
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                                style={{ border: '1px solid rgba(0,255,255,0.3)' }}
                            />
                        ) : (
                            <div
                                className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black"
                                style={{ background: 'rgba(0,255,255,0.15)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.3)' }}
                            >
                                {(displayName || 'A')[0].toUpperCase()}
                            </div>
                        )}
                        {!collapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-[8px] font-bold text-white truncate">{displayName}</p>
                                <p className="text-[7px] text-gray-600 uppercase tracking-widest">{user.role}</p>
                            </div>
                        )}
                    </button>
                )}

                {/* Logout button */}
                <button
                    onClick={() => { logout(); navigate('/login', { replace: true }); }}
                    className={`flex items-center gap-2 w-full p-2 rounded-lg transition-all duration-200 group ${collapsed ? 'justify-center' : ''}`}
                    style={{ background: 'transparent', border: '1px solid transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.08)'; e.currentTarget.style.border = '1px solid rgba(255,0,85,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}
                    title="Logout"
                >
                    <LogOut className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'rgba(255,0,85,0.7)' }} />
                    {!collapsed && (
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,0,85,0.7)' }}>
                            Logout
                        </span>
                    )}
                </button>

                {/* Connection status */}
                <div className="flex items-center gap-2 px-1">
                    <div
                        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isConnected ? 'animate-pulse' : ''}`}
                        style={{ background: isConnected ? '#00ff88' : '#ff0055' }}
                    />
                    {!collapsed && (
                        <span
                            className="text-[8px] font-bold uppercase tracking-widest"
                            style={{ color: isConnected ? '#00ff88' : '#ff4444' }}
                        >
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    )}
                </div>
            </div>

            {/* Right edge separator */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/5" />
        </aside>
    );
};

export default Sidebar;
