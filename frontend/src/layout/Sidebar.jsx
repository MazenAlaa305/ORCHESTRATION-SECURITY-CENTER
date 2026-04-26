import { useState } from 'react';
import { ShieldCheck, LayoutDashboard, Scan, Activity, Settings, ChevronLeft, Brain, FileText, LogOut } from 'lucide-react';
import { useRealTime } from '../context/RealTimeContext';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
    {
        label: 'Security',
        items: [
            { icon: <LayoutDashboard />, label: 'Command Center', id: 'overview'      },
            { icon: <Activity />,        label: 'Threat Center',  id: 'threat-center' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { icon: <Scan />,  label: 'Scanner',  id: 'operations' },
            { icon: <Brain />, label: 'AI Brain',  id: 'ai-brain'   },
        ],
    },
    {
        label: 'System',
        items: [
            { icon: <FileText />,  label: 'Reports',  id: 'reports'  },
            { icon: <Settings />,  label: 'Settings', id: 'settings' },
        ],
    },
];

const NavItem = ({ icon, label, collapsed, active, onClick, badge }) => (
    <div
        onClick={onClick}
        className={`relative flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 flex-shrink-0 group mb-0.5 ${collapsed ? 'justify-center' : ''}`}
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
        {/* Active left accent bar */}
        {active && !collapsed && (
            <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                style={{ background: '#00ffff', boxShadow: '0 0 6px #00ffff' }}
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
            {badge && (
                <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
                    style={{ background: '#00ffff', boxShadow: '0 0 6px #00ffff' }}
                />
            )}
        </div>

        {/* Label */}
        {!collapsed && (
            <span
                className="text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
                style={{ color: active ? '#00ffff' : 'rgba(148,163,184,0.6)' }}
            >
                {label}
            </span>
        )}
    </div>
);

const Sidebar = ({ activeTab, onTabChange }) => {
    const { state: realTime } = useRealTime();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
    });

    const isScanning   = realTime.scanStatus === 'RUNNING';
    const isConnected  = realTime.isConnected;

    // Persist collapse state
    const toggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
            return next;
        });
    };

    return (
        <aside
            className={`relative h-screen z-50 transition-all duration-300 flex flex-col shrink-0 ${collapsed ? 'w-14' : 'w-52'}`}
            style={{
                background:     'linear-gradient(180deg, rgba(18,38,48,0.92), rgba(10,24,32,0.96))',
                borderRight:    '1px solid rgba(255,255,255,0.05)',
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
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                    </>
                ) : (
                    <div className="mx-auto p-1 cursor-pointer" onClick={toggleCollapse} title="Expand sidebar">
                        <ShieldCheck className="h-4 w-4" style={{ color: '#00ffff' }} />
                    </div>
                )}
            </div>

            {/* ── Navigation ────────────────────────────────────────────── */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-2.5 overflow-y-auto">
                {NAV_SECTIONS.map(section => (
                    <div key={section.label} className="mb-4">
                        {!collapsed && (
                            <p className="text-[7px] font-black uppercase tracking-[0.4em] px-2 mb-2 text-gray-700">
                                {section.label}
                            </p>
                        )}
                        {section.items.map(item => (
                            <NavItem
                                key={item.id}
                                icon={item.id === 'ai-brain'
                                    ? <Brain className="h-3.5 w-3.5 shrink-0" style={{ color: activeTab === item.id ? '#00ffff' : 'rgba(148,163,184,0.6)' }} />
                                    : { ...item.icon, props: { ...item.icon.props, className: 'h-3.5 w-3.5 shrink-0', style: { color: activeTab === item.id ? '#00ffff' : 'rgba(148,163,184,0.6)' } } }
                                }
                                label={item.label}
                                collapsed={collapsed}
                                active={activeTab === item.id}
                                onClick={() => onTabChange?.(item.id)}
                                badge={item.id === 'ai-brain' && isScanning}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* ── User + Logout footer ──────────────────────────────────── */}
            <div
                className="px-3 py-3 flex-shrink-0 flex flex-col gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
            >
                {/* User info row */}
                {!collapsed && user && (
                    <div className="flex items-center gap-2 px-1">
                        <div
                            className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black"
                            style={{ background: 'rgba(0,255,255,0.15)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.3)' }}
                        >
                            {(user.email || 'A')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-bold text-white truncate">{user.email}</p>
                            <p className="text-[7px] text-gray-600 uppercase tracking-widest">{user.role}</p>
                        </div>
                    </div>
                )}

                {/* Logout button */}
                <button
                    onClick={logout}
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
