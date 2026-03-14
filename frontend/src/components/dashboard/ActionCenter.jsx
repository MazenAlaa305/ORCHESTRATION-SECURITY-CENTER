import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, ShieldAlert, Shield } from 'lucide-react';

const PRIORITY_STYLES = {
    CRITICAL: { border: 'border-l-red-500', bg: 'bg-red-500/5', badge: 'severity-critical', icon: <AlertTriangle className="h-4 w-4 text-red-400" /> },
    HIGH:     { border: 'border-l-orange-500', bg: 'bg-orange-500/5', badge: 'severity-high', icon: <AlertTriangle className="h-4 w-4 text-orange-400" /> },
    MEDIUM:   { border: 'border-l-yellow-500', bg: 'bg-yellow-500/5', badge: 'severity-medium', icon: <AlertTriangle className="h-4 w-4 text-yellow-400" /> },
    LOW:      { border: 'border-l-blue-400', bg: 'bg-blue-500/5', badge: 'severity-low', icon: <AlertTriangle className="h-4 w-4 text-blue-400" /> },
};

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

const ActionCenter = () => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        try {
            const { data } = await dashboardService.getActionItems();
            setActions(data || []);
        } catch (error) {
            console.error("Failed to fetch actions", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card h-full flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-cyber-accent/30 animate-pulse" />
            </div>
        );
    }

    const criticalCount = actions.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;

    return (
        <div className="glass-card h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-cyber-neon" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-300">Action Center</span>
                </div>
                {criticalCount > 0 && (
                    <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                        {criticalCount} Urgent
                    </span>
                )}
                {criticalCount === 0 && (
                    <span className="text-[10px] text-gray-600 font-mono">{actions.length} tasks</span>
                )}
            </div>

            {/* Action Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                        <Shield className="h-10 w-10 text-cyber-success/20" />
                        <p className="text-gray-600 text-[11px] font-mono uppercase tracking-widest text-center">
                            All systems nominal<br />
                            <span className="text-gray-700">No pending actions</span>
                        </p>
                    </div>
                ) : (
                    actions.map(action => {
                        const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.LOW;
                        return (
                            <div
                                key={action.id}
                                className={`rounded-xl border-l-4 ${style.border} ${style.bg} border border-white/5 p-3 group hover:bg-white/5 transition-all cursor-pointer`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                        {style.icon}
                                        <span className={style.badge}>{action.priority}</span>
                                    </div>
                                    <span className="text-[9px] text-gray-600 font-mono shrink-0">
                                        {formatRelativeTime(action.created_at)}
                                    </span>
                                </div>
                                <h4 className="text-white text-xs font-semibold mt-1 leading-tight">{action.title}</h4>
                                {action.description && (
                                    <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">{action.description}</p>
                                )}
                                <button className="mt-2 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 text-cyber-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                    Remediate <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ActionCenter;
