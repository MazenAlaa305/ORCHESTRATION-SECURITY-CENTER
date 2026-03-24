import React, { useState } from 'react';
import { ShieldCheck, LayoutDashboard, Scan, Activity, Settings, ChevronLeft, ChevronRight, Brain, FileText } from 'lucide-react';

const NAV_SECTIONS = [
    {
        label: 'Security',
        items: [
            { icon: <LayoutDashboard />, label: 'Command Center', id: 'overview' },
            { icon: <Activity />, label: 'Threat Center', id: 'threat-center' },
        ]
    },
    {
        label: 'Operations',
        items: [
            { icon: <Scan />, label: 'Scanner', id: 'operations' },
            { icon: <Brain />, label: 'AI Brain', id: 'ai-brain' },
        ]
    },
    {
        label: 'System',
        items: [
            { icon: <FileText />, label: 'Reports', id: 'reports' },
            { icon: <Settings />, label: 'Settings', id: 'settings' },
        ]
    }
];

const NavItem = ({ icon, label, collapsed, active, onClick }) => (
    <div
        onClick={onClick}
        className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 flex-shrink-0 group mb-0.5 ${collapsed ? 'justify-center' : ''}`}
        style={{
            background: active
                ? 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(0,255,255,0.05))'
                : 'transparent',
            border: active
                ? '1px solid rgba(0,255,255,0.2)'
                : '1px solid transparent',
            boxShadow: active ? '0 0 12px rgba(0,255,255,0.1)' : 'none',
        }}
        title={collapsed ? label : undefined}
    >
        {/* Active left accent bar */}
        {active && !collapsed && (
            <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                style={{ background:'#00ffff', boxShadow:'0 0 6px #00ffff' }}
            />
        )}
        {React.cloneElement(icon, {
            className: `h-4 w-4 shrink-0 transition-colors`,
            style: { color: active ? '#00ffff' : 'rgba(148,163,184,0.7)' }
        })}
        {!collapsed && (
            <span
                className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
                style={{ color: active ? '#00ffff' : 'rgba(148,163,184,0.7)' }}
            >
                {label}
            </span>
        )}
        {/* Hover glow */}
        {!active && (
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                 style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }} />
        )}
    </div>
);

const Sidebar = ({ activeTab, onTabChange }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`relative h-screen z-50 transition-all duration-300 flex flex-col shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}
            style={{
                background: 'linear-gradient(180deg, rgba(5,10,18,0.97), rgba(3,7,14,0.99))',
                borderRight: '1px solid rgba(0,255,255,0.06)',
                backdropFilter: 'blur(24px)',
            }}
        >
            {/* Logo / Header */}
            <div className="h-16 flex items-center justify-between px-4 flex-shrink-0"
                 style={{ borderBottom:'1px solid rgba(0,255,255,0.05)' }}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5 group cursor-pointer animate-fade-in">
                        <div className="p-1.5 rounded-lg" style={{ background:'rgba(0,255,255,0.1)', border:'1px solid rgba(0,255,255,0.2)' }}>
                            <ShieldCheck className="h-4 w-4" style={{ color:'#00ffff' }} />
                        </div>
                        <div className="flex flex-col leading-none">
                            <h1 className="text-sm font-black tracking-tight text-white" style={{ fontFamily:'Syne, sans-serif' }}>
                                found <span style={{ color:'#00ffff' }}>404</span>
                            </h1>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">SOC Platform</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="mx-auto p-1.5 rounded-lg cursor-pointer"
                         style={{ background:'rgba(0,255,255,0.1)', border:'1px solid rgba(0,255,255,0.2)' }}
                         onClick={() => setCollapsed(false)}>
                        <ShieldCheck className="h-4 w-4" style={{ color:'#00ffff' }} />
                    </div>
                )}
                {!collapsed && (
                    <button onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color:'rgba(100,116,139,0.8)' }}
                        onMouseOver={e => e.currentTarget.style.color = '#00ffff'}
                        onMouseOut={e => e.currentTarget.style.color = 'rgba(100,116,139,0.8)'}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* System Status */}
            <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom:'1px solid rgba(0,255,255,0.04)' }}>
                {!collapsed ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                         style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.12)' }}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                  style={{ background:'#00ff88' }} />
                            <span className="relative inline-flex rounded-full h-2 w-2"
                                  style={{ background:'#00ff88', boxShadow:'0 0 4px #00ff88' }} />
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color:'#00ff88' }}>System Online</span>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                  style={{ background:'#00ff88' }} />
                            <span className="relative inline-flex rounded-full h-2 w-2"
                                  style={{ background:'#00ff88', boxShadow:'0 0 4px #00ff88' }} />
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
                {NAV_SECTIONS.map(section => (
                    <div key={section.label} className="mb-3">
                        {!collapsed && (
                            <p className="text-[8px] font-black uppercase tracking-[0.35em] px-2 mb-2"
                               style={{ color:'rgba(71,85,105,0.8)' }}>
                                {section.label}
                            </p>
                        )}
                        {section.items.map(item => (
                            <NavItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                collapsed={collapsed}
                                active={activeTab === item.id}
                                onClick={() => onTabChange?.(item.id)}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer expand toggle */}
            {collapsed && (
                <div className="p-3 flex-shrink-0" style={{ borderTop:'1px solid rgba(0,255,255,0.05)' }}>
                    <button onClick={() => setCollapsed(false)}
                        className="w-full flex justify-center p-2 rounded-xl transition-all"
                        style={{ color:'rgba(100,116,139,0.6)' }}
                        onMouseOver={e => e.currentTarget.style.color = '#00ffff'}
                        onMouseOut={e => e.currentTarget.style.color = 'rgba(100,116,139,0.6)'}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Vertical cyber accent line */}
            <div className="absolute right-0 top-0 bottom-0 w-px"
                 style={{ background:'linear-gradient(180deg, transparent, rgba(0,255,255,0.15) 40%, rgba(0,255,255,0.15) 60%, transparent)' }} />
        </aside>
    );
};

export default Sidebar;
