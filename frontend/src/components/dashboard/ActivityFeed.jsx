import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Wifi, AlertTriangle, Clock, Server, Terminal } from 'lucide-react';
import { networkService } from '../../services/api';

const SEVERITY_CLASSES = {
    CRITICAL: 'log-line-critical',
    HIGH: 'log-line-high',
    MEDIUM: 'log-line-medium',
    INFO: 'log-line-info',
    LOW: 'log-line-info',
    default: 'log-line-default',
};

function getSeverityClass(priority) {
    return SEVERITY_CLASSES[priority] || SEVERITY_CLASSES.default;
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
}

const ActivityFeed = ({ refresh, compact = false, isScanning = false }) => {
    const [activity, setActivity] = useState([]);
    const [newDevices, setNewDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const [activityRes, newDevicesRes] = await Promise.all([
                    networkService.getActivity(20),
                    networkService.getNewDevices()
                ]);
                setActivity(activityRes.data || []);
                setNewDevices(newDevicesRes.data || []);
            } catch (error) {
                console.error("Failed to fetch activity", error);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [refresh]);

    // Auto-scroll to bottom when new activity comes in
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activity]);

    if (loading) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                <Terminal className="h-8 w-8 text-cyber-accent/30 mb-3 animate-pulse" />
                <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">Fetching logs...</p>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-3'} gap-4 h-full animate-fade-in`}>
            {/* Terminal-style Activity Feed */}
            <div className={`${compact ? '' : 'lg:col-span-2'} glass-card flex flex-col h-full`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-cyber-accent" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-300">Live Activity Feed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isScanning && (
                            <span className="flex items-center gap-1 text-[9px] font-mono text-cyber-accent animate-pulse uppercase tracking-widest">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyber-accent animate-ping inline-block" />
                                Live
                            </span>
                        )}
                        {!compact && (
                            <span className="text-[10px] text-gray-600 font-mono">{activity.length} events</span>
                        )}
                    </div>
                </div>

                {/* Log content */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-black/30 rounded-b-2xl p-3 font-mono text-xs">
                    {activity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                            <Wifi className="h-8 w-8 text-cyber-success/30" />
                            <p className="text-gray-600 text-[11px] font-mono uppercase tracking-widest text-center">
                                No security events detected.<br />
                                <span className="text-gray-700">Run a scan to start monitoring.</span>
                            </p>
                        </div>
                    ) : (
                        <>
                            <AnimatePresence initial={false}>
                            {activity.map((event, index) => (
                                <motion.div
                                    key={event.id || index}
                                    layout
                                    initial={{ opacity: 0, y: 8, backgroundColor: 'rgba(0,255,255,0.1)' }}
                                    animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(255,255,255,0)' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], backgroundColor: { duration: 1.2 } }}
                                    className="flex items-start gap-2 mb-1.5 group hover:bg-white/3 rounded px-1 py-0.5"
                                >
                                    <span className="text-gray-700 shrink-0 tabular-nums w-16">
                                        [{formatRelativeTime(event.timestamp)}]
                                    </span>
                                    <span className={`shrink-0 font-black uppercase ${getSeverityClass(event.priority)}`}>
                                        [{event.priority || 'INFO'}]
                                    </span>
                                    <span className="text-gray-300 group-hover:text-white transition-colors truncate">
                                        {event.title}
                                        {event.description && (
                                            <span className="text-gray-600 ml-1">— {event.description}</span>
                                        )}
                                    </span>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                            {/* Blinking cursor when scanning */}
                            {isScanning && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-cyber-accent font-mono text-xs">$</span>
                                    <span className="h-3 w-1.5 bg-cyber-accent animate-blink inline-block" />
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </>
                    )}
                </div>
            </div>

            {/* New Devices Panel */}
            {!compact && (
                <div className="glass-card p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">
                        <Server className="h-4 w-4 text-cyber-neon" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-300">New Devices</span>
                        <span className="ml-auto text-[10px] text-gray-600 font-mono">24h window</span>
                    </div>

                    {newDevices.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-gray-600 text-[11px] font-mono uppercase tracking-widest text-center">
                                No new devices<br />in the last 24h
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
                            <AnimatePresence initial={false}>
                            {newDevices.map((device, index) => (
                                <motion.div
                                    key={device.id || index}
                                    layout
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-3 bg-cyber-neon/5 border border-cyber-neon/15 rounded-xl hover:border-cyber-neon/30 transition-colors"
                                >
                                    <div className="font-mono text-cyber-neon text-xs font-bold">{device.ip_address}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">{device.hostname || 'Unknown hostname'}</div>
                                    {device.open_ports && (
                                        <div className="text-[10px] text-gray-600 mt-1 font-mono">
                                            Ports: {device.open_ports}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;
