import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { networkService, vulnerabilityService } from '../../services/api';
import {
    Server, Database, Globe, Shield, Wifi, HardDrive,
    Mail, Activity, ChevronDown, ChevronRight, AlertTriangle,
    CheckCircle, XCircle, RefreshCw, Info,
} from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const SUBNETS = [
    { key: 'dmz',  label: 'DMZ',  cidr: '10.10.10.0/24', prefix: '10.10.10.', accent: '#ef4444', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.25)'  },
    { key: 'corp', label: 'CORP', cidr: '10.10.20.0/24', prefix: '10.10.20.', accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)' },
    { key: 'data', label: 'DATA', cidr: '10.10.30.0/24', prefix: '10.10.30.', accent: '#a855f7', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.25)' },
    { key: 'mgmt', label: 'MGMT', cidr: '10.10.40.0/24', prefix: '10.10.40.', accent: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.25)' },
];

const SEV_ORDER = { high: 0, medium: 1, low: 2, info: 3 };
const SEV_COLOR = {
    high:   { text: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)'   },
    medium: { text: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)'  },
    low:    { text: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)'  },
    info:   { text: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)' },
};

function deviceIcon(hostname = '') {
    const h = hostname.toLowerCase();
    if (h.includes('database') || h.includes('redis')) return Database;
    if (h.includes('webserver') || h.includes('api_gateway')) return Globe;
    if (h.includes('mailserver')) return Mail;
    if (h.includes('fileserver')) return HardDrive;
    if (h.includes('dns')) return Wifi;
    if (h.includes('workstation')) return Shield;
    return Server;
}

function shortName(hostname = '') {
    return hostname.split('.')[0].replace('lab_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function SeverityBadge({ sev }) {
    const s = (sev || 'info').toLowerCase();
    const c = SEV_COLOR[s] || SEV_COLOR.info;
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
              style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}>
            {s}
        </span>
    );
}

function DeviceRow({ asset, vulns, accent }) {
    const [open, setOpen] = useState(false);
    const Icon = deviceIcon(asset.hostname);
    const ports = asset.open_ports ? asset.open_ports.split(',').filter(Boolean) : [];
    const sorted = [...vulns].sort((a, b) => (SEV_ORDER[a.severity?.toLowerCase()] ?? 9) - (SEV_ORDER[b.severity?.toLowerCase()] ?? 9));
    const highCount   = vulns.filter(v => v.severity?.toLowerCase() === 'high').length;
    const medCount    = vulns.filter(v => v.severity?.toLowerCase() === 'medium').length;
    const lowCount    = vulns.filter(v => v.severity?.toLowerCase() === 'low').length;
    const infoCount   = vulns.filter(v => v.severity?.toLowerCase() === 'info').length;

    return (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
            {/* Device header row */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
            >
                <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                     style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{shortName(asset.hostname)}</span>
                        <span className="text-[10px] font-mono text-gray-500">{asset.ip_address}</span>
                        {asset.os_name && (
                            <span className="text-[9px] text-gray-600 font-mono">{asset.os_name}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ports.length > 0 ? ports.map(p => (
                            <span key={p} className="text-[9px] font-mono px-1.5 py-px rounded"
                                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                                :{p}
                            </span>
                        )) : (
                            <span className="text-[9px] text-gray-700 font-mono">no open ports detected</span>
                        )}
                    </div>
                </div>

                {/* Vuln summary badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {highCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            {highCount}H
                        </span>
                    )}
                    {medCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            {medCount}M
                        </span>
                    )}
                    {lowCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                            {lowCount}L
                        </span>
                    )}
                    {infoCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.25)' }}>
                            {infoCount}I
                        </span>
                    )}
                    {vulns.length === 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-green-400">
                            <CheckCircle className="w-3 h-3" /> Clean
                        </span>
                    )}
                    <div className="ml-2 text-gray-600">
                        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                </div>
            </button>

            {/* Expanded vuln table */}
            {open && (
                <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {sorted.length === 0 ? (
                        <div className="px-4 py-3 flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            No vulnerabilities found on this device
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-black text-gray-600">Severity</th>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-black text-gray-600">Port</th>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-black text-gray-600">Service</th>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-black text-gray-600">Finding</th>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-black text-gray-600">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((v, i) => (
                                    <tr key={v.id || i}
                                        className="border-t hover:bg-white/[0.02] transition-colors"
                                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <td className="px-4 py-2.5"><SeverityBadge sev={v.severity} /></td>
                                        <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: accent }}>
                                            {v.port ? `:${v.port}` : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400 capitalize">
                                            {v.service || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-300 font-medium max-w-[220px] truncate" title={v.title}>
                                            {v.title}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate" title={v.description}>
                                            {v.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Device info footer */}
                    <div className="px-4 py-2 flex items-center gap-4 text-[9px] font-mono text-gray-700 border-t"
                         style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}>
                        <span>STATUS: <span className="text-green-400 font-bold">{asset.status?.toUpperCase()}</span></span>
                        <span>TYPE: <span className="text-gray-500">{asset.device_type || 'unknown'}</span></span>
                        {asset.mac_address && <span>MAC: <span className="text-gray-500">{asset.mac_address}</span></span>}
                        <span>FIRST SEEN: <span className="text-gray-500">{asset.first_seen ? new Date(asset.first_seen).toLocaleString() : '—'}</span></span>
                        <span>LAST SEEN: <span className="text-gray-500">{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : '—'}</span></span>
                    </div>
                </div>
            )}
        </div>
    );
}

function SubnetCard({ subnet, assets, vulnsByHost }) {
    const subnetAssets = assets.filter(a => a.ip_address.startsWith(subnet.prefix)).sort((a, b) => {
        const na = parseInt(a.ip_address.split('.')[3]);
        const nb = parseInt(b.ip_address.split('.')[3]);
        return na - nb;
    });

    const allVulns = subnetAssets.flatMap(a => vulnsByHost[a.ip_address] || []);
    const highTotal = allVulns.filter(v => v.severity?.toLowerCase() === 'high').length;
    const totalVulns = allVulns.length;

    return (
        <div className="rounded-xl overflow-hidden"
             style={{ background: subnet.bg, border: `1px solid ${subnet.border}` }}>
            {/* Subnet header */}
            <div className="flex items-center justify-between px-5 py-3.5"
                 style={{ borderBottom: `1px solid ${subnet.border}`, background: `${subnet.accent}0a` }}>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: subnet.accent }} />
                    <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: subnet.accent }}>
                        {subnet.label}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{subnet.cidr}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="text-gray-500">{subnetAssets.length} device{subnetAssets.length !== 1 ? 's' : ''}</span>
                    {highTotal > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <AlertTriangle className="w-3 h-3" /> {highTotal} high
                        </span>
                    )}
                    {totalVulns === 0 && (
                        <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" /> Clean
                        </span>
                    )}
                    <span className="text-gray-600">{totalVulns} finding{totalVulns !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Device list */}
            <div className="p-3 space-y-2">
                {subnetAssets.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-600">No devices discovered in this subnet</div>
                ) : (
                    subnetAssets.map(asset => (
                        <DeviceRow
                            key={asset.id}
                            asset={asset}
                            vulns={vulnsByHost[asset.ip_address] || []}
                            accent={subnet.accent}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function SubnetInventory() {
    const { data: assetsData, isLoading: loadingAssets, refetch, isFetching } = useQuery({
        queryKey: ['subnetAssets'],
        queryFn: () => networkService.getAssets(),
        refetchInterval: 30000,
    });

    const { data: vulnsData, isLoading: loadingVulns } = useQuery({
        queryKey: ['subnetVulns'],
        queryFn: () => vulnerabilityService.list({ limit: 500 }),
        refetchInterval: 30000,
    });

    const assets = useMemo(() => assetsData?.data || [], [assetsData]);
    const vulnsByHost = useMemo(() => {
        const raw = vulnsData?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        const map = {};
        list.forEach(v => {
            if (!v.host) return;
            if (!map[v.host]) map[v.host] = [];
            // deduplicate by title+port
            const key = `${v.title}|${v.port}`;
            if (!map[v.host].some(x => `${x.title}|${x.port}` === key)) {
                map[v.host].push(v);
            }
        });
        return map;
    }, [vulnsData]);

    const loading = loadingAssets || loadingVulns;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading subnet inventory…</span>
            </div>
        );
    }

    const totalVulns   = Object.values(vulnsByHost).flat().length;
    const totalDevices = assets.length;
    const highTotal    = Object.values(vulnsByHost).flat().filter(v => v.severity?.toLowerCase() === 'high').length;

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-5 text-xs">
                    <span className="text-gray-500">
                        <span className="text-white font-bold">{totalDevices}</span> devices across 4 subnets
                    </span>
                    <span className="text-gray-500">
                        <span className="font-bold" style={{ color: totalVulns > 0 ? '#ef4444' : '#4ade80' }}>{totalVulns}</span> findings
                        {highTotal > 0 && <span className="text-red-400 ml-1">({highTotal} high)</span>}
                    </span>
                </div>
                <button onClick={() => refetch()}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors">
                    <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Subnet cards */}
            {SUBNETS.map(subnet => (
                <SubnetCard
                    key={subnet.key}
                    subnet={subnet}
                    assets={assets}
                    vulnsByHost={vulnsByHost}
                />
            ))}

            <p className="text-center text-[9px] text-gray-700 font-mono pt-1">
                Click any device row to expand vulnerabilities · Auto-refreshes every 30s
            </p>
        </div>
    );
}
