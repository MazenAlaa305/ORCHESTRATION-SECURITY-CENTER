import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/api';
import { AlertTriangle, Shield, ShieldAlert } from 'lucide-react';

const PRIORITY_STYLES = {
    CRITICAL: { border: 'border-l-red-500',    bg: 'bg-red-500/5',    color: '#ff0055' },
    HIGH:     { border: 'border-l-orange-500', bg: 'bg-orange-500/5', color: '#ff6a00' },
    MEDIUM:   { border: 'border-l-yellow-500', bg: 'bg-yellow-500/5', color: '#ffaa00' },
    LOW:      { border: 'border-l-blue-400',   bg: 'bg-blue-500/5',   color: '#00ffff' },
};

function formatRelativeTime(ts) {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60)    return `${Math.round(diff)}s ago`;
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

const SkeletonRow = () => (
    <div className="rounded-md border border-white/5 p-2 space-y-1.5 animate-pulse">
        <div className="h-2 w-16 bg-white/5 rounded" />
        <div className="h-2.5 w-48 bg-white/5 rounded" />
    </div>
);

/**
 * ActionCenter — live action-item queue.
 * Auto-refreshes every 30s and whenever the parent refreshKey changes.
 */
const ActionCenter = ({ refreshKey = 0 }) => {
    const { data: actions = [], isLoading } = useQuery({
        queryKey: ['action-items', refreshKey],
        queryFn: () => dashboardService.getActionItems().then(r => r.data || []),
        refetchInterval: 30_000,
        staleTime: 20_000,
    });

    const urgentCount = actions.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;

    return (
        <div className="glass-card h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-white/[0.02] flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                        Action Queue
                    </span>
                </div>
                {urgentCount > 0 && (
                    <span className="text-[8px] font-black uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                        {urgentCount} URGENT
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {isLoading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 gap-2 opacity-20">
                        <Shield className="h-7 w-7 text-gray-500" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-center leading-none">
                            Status: Clear
                        </p>
                    </div>
                ) : (
                    actions.map(action => {
                        const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.LOW;
                        return (
                            <div
                                key={action.id}
                                className={`rounded-md border-l-2 ${style.border} ${style.bg} border border-white/5 p-2 transition-all hover:bg-white/5 cursor-pointer`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 uppercase font-black text-[8px]" style={{ color: style.color }}>
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        {action.priority}
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-mono">
                                        {formatRelativeTime(action.created_at)}
                                    </span>
                                </div>
                                <h4 className="text-white text-[10px] font-bold leading-tight line-clamp-2">
                                    {action.title}
                                </h4>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ActionCenter;
