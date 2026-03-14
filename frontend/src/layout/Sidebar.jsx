import React, { useState } from 'react';
import { ShieldCheck, LayoutDashboard, Scan, Activity, Settings, ChevronLeft, ChevronRight, Target, Brain, FileText } from 'lucide-react';

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
            { icon: <FileText />, label: 'Reports', id: 'system' },
            { icon: <Settings />, label: 'Settings', id: 'settings' },
        ]
    }
];

const Sidebar = ({ activeTab, onTabChange }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`relative h-screen bg-black/80 backdrop-blur-xl border-r border-white/5 z-50 transition-all duration-300 flex flex-col shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
            {/* Logo Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
                {!collapsed && (
                    <div className="flex items-center gap-2 group cursor-pointer animate-fade-in w-full">
                        <ShieldCheck className="text-cyber-accent h-6 w-6 shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col leading-none truncate">
                            <h1 className="text-base font-black tracking-tight text-white">
                                found <span className="text-cyber-accent">404</span>
                            </h1>
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">SOC Platform</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <ShieldCheck
                        className="text-cyber-accent h-6 w-6 mx-auto cursor-pointer shrink-0"
                        onClick={() => setCollapsed(false)}
                    />
                )}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0 ml-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* System Status */}
            {!collapsed && (
                <div className="px-4 py-3 border-b border-white/5 animate-fade-in">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyber-success/5 border border-cyber-success/15">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
                        </span>
                        <span className="text-[10px] font-bold text-cyber-success uppercase tracking-widest">System Online</span>
                    </div>
                </div>
            )}
            {collapsed && (
                <div className="py-3 flex justify-center border-b border-white/5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
                    </span>
                </div>
            )}

            {/* Nav Sections */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label} className="mb-3">
                        {!collapsed && (
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] px-2 mb-2">
                                {section.label}
                            </p>
                        )}
                        {section.items.map((item) => (
                            <NavItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                collapsed={collapsed}
                                active={activeTab === item.id}
                                onClick={() => onTabChange && onTabChange(item.id)}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Expand button when collapsed */}
            {collapsed && (
                <div className="p-3 border-t border-white/5">
                    <button
                        onClick={() => setCollapsed(false)}
                        className="w-full flex justify-center p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </aside>
    );
};

const NavItem = ({ icon, label, collapsed, active, onClick }) => (
    <div
        onClick={onClick}
        className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all flex-shrink-0 group mb-0.5
            ${active
                ? 'bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent shadow-neon-sm'
                : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}
            ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? label : undefined}
    >
        {/* Active left border accent */}
        {active && !collapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyber-accent rounded-full shadow-neon-sm" />
        )}
        {React.cloneElement(icon, {
            className: `h-4 w-4 shrink-0 transition-colors ${active ? 'text-cyber-accent' : 'group-hover:text-white'}`
        })}
        {!collapsed && (
            <span className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
        )}
    </div>
);

export default Sidebar;
