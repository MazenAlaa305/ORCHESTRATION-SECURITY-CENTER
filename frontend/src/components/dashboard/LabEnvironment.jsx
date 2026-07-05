import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService, pentesterService } from '../../services/api';
import {
    Server, Activity, Shield, Wifi, Database,
    Mail, Globe, HardDrive, AlertTriangle, Play,
    RefreshCw, CheckCircle, XCircle, Loader,
} from 'lucide-react';

// ── Zone Colors ──────────────────────────────────────────────────────────────
const ZONE_COLORS = {
    dmz:  { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    label: 'DMZ' },
    corp: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'CORP' },
    data: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: 'DATA' },
    mgmt: { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'MGMT' },
};

const PROTOCOL_ICONS = {
    http: Globe, https: Globe, smtp: Mail, smb: HardDrive,
    dns: Wifi, postgresql: Database, redis: Database,
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const config = {
        running:   { icon: CheckCircle, color: 'text-green-400', label: 'Running' },
        offline:   { icon: XCircle,     color: 'text-red-400',   label: 'Offline' },
        not_found: { icon: XCircle,     color: 'text-red-400',   label: 'Offline' },
        unknown:   { icon: AlertTriangle, color: 'text-yellow-400', label: 'Unknown' },
    };
    const { icon: Icon, color, label } = config[status] || config.unknown;
    return (
        <span className={`flex items-center gap-1 text-xs ${color}`}>
            <Icon size={12} /> {label}
        </span>
    );
};

// ── Lab Status Header ────────────────────────────────────────────────────────
const LabStatusHeader = ({ status, onRefresh, isRefreshing }) => {
    if (!status) return null;
    const statusColor = {
        healthy:  'text-green-400',
        degraded: 'text-yellow-400',
        offline:  'text-red-400',
    };
    return (
        <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Server className="text-cyan-400" size={20} />
                    <h3 className="text-white font-semibold">Living Lab Environment</h3>
                    <span className={`text-sm font-mono ${statusColor[status.overall_status] || 'text-gray-400'}`}>
                        {status.overall_status?.toUpperCase()}
                    </span>
                </div>
                <button onClick={onRefresh} disabled={isRefreshing}
                    className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50">
                    <RefreshCw size={16} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{status.running}</div>
                    <div className="text-gray-500">Containers Running</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{status.telemetry?.events || 0}</div>
                    <div className="text-gray-500">Events</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{status.telemetry?.alerts || 0}</div>
                    <div className="text-gray-500">Alerts</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{status.traffic_intensity || 'N/A'}</div>
                    <div className="text-gray-500">Traffic</div>
                </div>
            </div>
        </div>
    );
};

// ── Target Card ──────────────────────────────────────────────────────────────
const TargetCard = ({ target, onScan, isScanning }) => {
    const zone = ZONE_COLORS[target.zone] || ZONE_COLORS.dmz;
    const Icon = PROTOCOL_ICONS[target.protocol] || Server;

    return (
        <div className={`${zone.bg} ${zone.border} border rounded-lg p-3`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={zone.text} />
                    <span className="text-white text-sm font-medium">{target.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={target.status} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${zone.bg} ${zone.text} border ${zone.border}`}>
                        {zone.label}
                    </span>
                </div>
            </div>
            <p className="text-gray-500 text-xs mb-2">{target.description}</p>
            <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                    {(target.vulns || []).slice(0, 3).map((v, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                            {v}
                        </span>
                    ))}
                    {(target.vulns || []).length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-gray-500">
                            +{target.vulns.length - 3}
                        </span>
                    )}
                </div>
                {target.protocol === 'http' && target.status === 'running' && (
                    <button onClick={() => onScan(target)} disabled={isScanning}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50">
                        {isScanning ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                        Scan
                    </button>
                )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600">
                <span>Port: {target.port}</span>
                <span>CVSS: {target.cvss}</span>
                <span>{target.hostname}</span>
            </div>
        </div>
    );
};

// ── Event Feed ───────────────────────────────────────────────────────────────
const EventFeed = ({ events }) => {
    if (!events || events.length === 0) {
        return (
            <div className="glass-card p-4 text-center text-gray-500 text-sm">
                No lab events yet. Start the lab and wait for telemetry.
            </div>
        );
    }

    const severityColor = {
        low: 'text-green-400', medium: 'text-yellow-400', high: 'text-red-400',
    };

    return (
        <div className="glass-card p-4 max-h-[300px] overflow-y-auto">
            <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" /> Live Event Feed
            </h4>
            <div className="space-y-1">
                {events.slice(0, 30).map((evt, i) => {
                    const e = evt.event || evt;
                    const sev = e.severity || evt.severity || 'low';
                    return (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                            <span className={`w-1.5 h-1.5 rounded-full ${severityColor[sev] || 'text-gray-400'} bg-current`} />
                            <span className="text-gray-500 font-mono w-[140px] shrink-0">
                                {(evt['@timestamp'] || '').slice(11, 19)}
                            </span>
                            <span className="text-gray-400 w-[80px] shrink-0">{e.category || evt.event_category || ''}</span>
                            <span className="text-gray-300 truncate">{e.action || evt.event_action || ''}</span>
                            <span className={`ml-auto ${e.outcome === 'success' || evt.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {e.outcome || evt.status || ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Phase 5.3: translate Docker daemon errors into plain-English messages ───
const humanizeLabError = (err) => {
    if (!err) return null;
    const detail = err?.response?.data?.detail || err?.message || String(err);
    const lower = detail.toLowerCase();
    if (lower.includes('cannot connect to the docker daemon') || lower.includes('docker daemon')) {
        return 'Docker Desktop is not running. Start Docker Desktop and press Refresh.';
    }
    if (lower.includes('permission denied') && lower.includes('docker')) {
        return 'The backend does not have permission to reach the Docker socket. Add the backend user to the docker group and restart.';
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
        return 'Docker is slow to respond — the daemon may be starting. Wait a few seconds and press Refresh.';
    }
    if (err?.response?.status >= 500) {
        return 'The backend could not reach the lab manager. Check the backend logs.';
    }
    if (err?.response?.status === 401 || err?.response?.status === 403) {
        return 'You are not authorized to control the lab. Sign in as an analyst or admin.';
    }
    return detail;
};

// ── Main Component ───────────────────────────────────────────────────────────
const LabEnvironment = () => {
    const queryClient = useQueryClient();
    const [scanningTarget, setScanningTarget] = useState(null);

    // Fetch lab status
    // Phase 5.3: a 10s cadence is fast enough to feel live for container state
    // transitions without pestering Docker once per second. WS push is the
    // preferred future path, documented in Phase 5.3 notes.
    const {
        data: statusData, isLoading: statusLoading,
        refetch: refetchStatus, isRefetching,
        error: statusError,
    } = useQuery({
        queryKey: ['lab-status'],
        queryFn: () => labService.getStatus().then(r => r.data),
        refetchInterval: 10000,
        retry: 1,
    });

    // Fetch lab events
    const { data: eventsData } = useQuery({
        queryKey: ['lab-events'],
        queryFn: () => labService.getEvents(30).then(r => r.data),
        refetchInterval: 15000,
        retry: 1,
    });

    // Seed mutation
    const seedMutation = useMutation({
        mutationFn: () => labService.seedTargets(),
        onSuccess: () => {
            queryClient.invalidateQueries(['lab-status']);
        },
    });

    // Scan mutation
    const scanMutation = useMutation({
        mutationFn: (target) => pentesterService.startAIScanByUrl(target.url),
        onSuccess: () => {
            setScanningTarget(null);
            queryClient.invalidateQueries(['scans']);
        },
        onError: () => {
            setScanningTarget(null);
        },
    });

    const friendlyError = humanizeLabError(statusError || seedMutation.error || scanMutation.error);

    const handleScan = (target) => {
        setScanningTarget(target.container);
        scanMutation.mutate(target);
    };

    if (statusLoading) {
        return (
            <div className="glass-card flex items-center justify-center min-h-[200px]">
                <div className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
            </div>
        );
    }

    const containers = statusData?.containers || [];

    // Group by zone
    const zones = {};
    containers.forEach(c => {
        if (!zones[c.zone]) zones[c.zone] = [];
        zones[c.zone].push(c);
    });

    return (
        <div className="space-y-4">
            {/* Friendly error banner (Phase 5.3) */}
            {friendlyError && (
                <div className="glass-card border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-red-300 text-sm font-semibold">Lab control is unavailable</div>
                        <div className="text-red-200/80 text-xs mt-0.5">{friendlyError}</div>
                    </div>
                    <button onClick={() => refetchStatus()}
                        className="text-xs px-2 py-1 rounded border border-red-400/40 text-red-300 hover:bg-red-500/20">
                        Retry
                    </button>
                </div>
            )}

            {/* Status Header */}
            <LabStatusHeader status={statusData} onRefresh={refetchStatus} isRefreshing={isRefetching} />

            {/* Actions Bar */}
            <div className="flex gap-2">
                <button onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                    <Database size={14} />
                    {seedMutation.isPending ? 'Seeding...' : 'Seed Targets'}
                </button>
            </div>

            {/* Network Map — Targets by Zone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(ZONE_COLORS).map(([zoneKey, zoneStyle]) => {
                    const zoneTargets = zones[zoneKey] || [];
                    if (zoneTargets.length === 0) return null;
                    return (
                        <div key={zoneKey}>
                            <h4 className={`text-sm font-semibold mb-2 ${zoneStyle.text}`}>
                                <Shield size={14} className="inline mr-1" />
                                {zoneStyle.label} Zone ({zoneTargets.length} services)
                            </h4>
                            <div className="space-y-2">
                                {zoneTargets.map(target => (
                                    <TargetCard
                                        key={target.container}
                                        target={target}
                                        onScan={handleScan}
                                        isScanning={scanningTarget === target.container}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Event Feed */}
            <EventFeed events={eventsData?.events} />
        </div>
    );
};

export default LabEnvironment;
