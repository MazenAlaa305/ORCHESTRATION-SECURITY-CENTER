import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../layout/Layout';
import RiskScore from '../components/dashboard/RiskScore';
import ScanButton from '../components/dashboard/ScanButton';
import ScanHistory from '../components/dashboard/ScanHistory';
import NetworkTopology from '../components/dashboard/NetworkTopology';
import Reports from '../components/dashboard/Reports';
import ActionCenter from '../components/dashboard/ActionCenter';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import TargetsManager from '../components/dashboard/TargetsManager';
import VulnerabilitiesPanel from '../components/dashboard/VulnerabilitiesPanel';
import AgentLogViewer from '../components/dashboard/AgentLogViewer';
import UnifiedInbox from '../components/dashboard/UnifiedInbox';
import StatCards from '../components/dashboard/StatCards';
import ScanPipelinePanel from '../components/dashboard/ScanPipelinePanel';
import Tabs from '../components/ui/Tabs';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberBadge } from '../components/ui/CyberBadge';
import { scanService, dashboardService, pentesterService } from '../services/api';

import OpenVasScanButton from '../components/OpenVAS/ScanButton';
import RiskChart from '../components/OpenVAS/RiskChart';
import Scheduler from '../components/OpenVAS/Scheduler';
import VulnerabilitiesList from '../components/OpenVAS/VulnerabilitiesList';

import {
    LayoutDashboard, History, Settings, Activity,
    Network, FileText, Target, Bug, Brain, Scan as ScanIcon,
    Zap, Shield, Clock
} from 'lucide-react';

// ─── Sub-tab pills ──────────────────────────────────
const SubTabBar = ({ tabs, active, onChange }) => (
    <div className="flex p-1 rounded-xl w-fit mb-6 gap-0.5"
         style={{ background:'rgba(10,17,24,0.7)', border:'1px solid rgba(0,255,255,0.06)', backdropFilter:'blur(10px)' }}>
        {tabs.map(tab => (
            <button
                key={tab.id}
                id={`subtab-${tab.id}`}
                onClick={() => onChange(tab.id)}
                className={`px-4 py-2 text-[11px] font-black transition-all rounded-lg flex items-center gap-2 uppercase tracking-wider ${
                    active === tab.id
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
                style={active === tab.id ? {
                    background: 'linear-gradient(135deg, #00ffff, #0099cc)',
                    boxShadow:  '0 0 16px rgba(0,255,255,0.4)',
                } : {}}
            >
                {tab.icon}
                {tab.label}
            </button>
        ))}
    </div>
);

// ─── Section header ──────────────────────────────────
const SectionHeader = ({ icon, title, sub }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ background:'rgba(0,255,255,0.08)', border:'1px solid rgba(0,255,255,0.12)' }}>
            {icon}
        </div>
        <div>
            <h2 className="text-base font-black text-white uppercase tracking-wide leading-none">{title}</h2>
            {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Component ───────────────────────────────────────
const Dashboard = () => {
    const [activeTab, setActiveTab]       = useState('overview');
    const [activeSubTab, setActiveSubTab] = useState('overview');
    const [refreshKey, setRefreshKey]     = useState(0);
    const [selectedScanId, setSelectedScanId] = useState(null);
    const [wasScanning, setWasScanning]   = useState(false);
    const [agentLogs, setAgentLogs]       = useState([]);

    const { data: scans, refetch: refetchScans } = useQuery({
        queryKey: ['scans'],
        queryFn: async () => {
            const res = await scanService.getScans();
            dashboardService.refreshRiskScores().catch(console.error);
            return res.data;
        },
        refetchInterval: (query) => {
            const data = query?.state?.data || [];
            return data.some(s => s.status === 'RUNNING' || s.status === 'QUEUED') ? 3000 : 15000;
        }
    });

    const isScanning  = scans?.some(s => s.status === 'RUNNING' || s.status === 'QUEUED');
    const latestScan  = scans?.[0] ?? null;

    useEffect(() => {
        if (isScanning && !wasScanning) {
            setWasScanning(true);
        } else if (!isScanning && wasScanning) {
            setWasScanning(false);
            setRefreshKey(k => k + 1);
            setActiveTab('threat-center');
            setActiveSubTab('network');
        }
    }, [isScanning, wasScanning]);

    useEffect(() => {
        if (!isScanning || !latestScan?.id) return;
        const poll = setInterval(async () => {
            try {
                const res = await pentesterService.getAgentLogs(latestScan.id);
                setAgentLogs(res.data || []);
            } catch { /* ignore */ }
        }, 3000);
        return () => clearInterval(poll);
    }, [isScanning, latestScan?.id]);

    const handleScanStarted = () => {
        refetchScans();
        setWasScanning(true);
        setTimeout(() => setRefreshKey(k => k + 1), 1000);
        setActiveTab('operations');
        setActiveSubTab('history');
    };

    const handleMainTabChange = (tabId) => {
        setActiveTab(tabId);
        const defaults = {
            overview:      'overview',
            operations:    'scanner',
            'threat-center':'siem',
            'ai-brain':    'ai-console',
            reports:       'reports',
            settings:      'settings',
        };
        setActiveSubTab(defaults[tabId] || 'overview');
    };

    const mainTabs = [
        { id: 'overview',      label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'operations',    label: 'Operations',     icon: <ScanIcon className="h-4 w-4" /> },
        { id: 'threat-center', label: 'Threat Center',  icon: <Activity className="h-4 w-4" /> },
        { id: 'ai-brain',      label: 'AI Brain',       icon: <Brain className="h-4 w-4" /> },
        { id: 'reports',       label: 'Reports',        icon: <FileText className="h-4 w-4" /> },
        { id: 'settings',      label: 'Settings',       icon: <Settings className="h-4 w-4" /> },
    ];

    return (
        <Layout activeTab={activeTab} onTabChange={handleMainTabChange} onQuickScan={() => { setActiveTab('operations'); setActiveSubTab('scanner'); }} isScanning={isScanning}>

            {/* ─── Page Header ─────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px w-6" style={{ background:'#00ffff' }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color:'#00ffff' }}>
                            found 404 // Core Node
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase" style={{ fontFamily:'Syne, sans-serif', letterSpacing:'-0.02em' }}>
                        Security <span style={{ color:'#00ffff', textDecoration:'underline', textDecorationColor:'rgba(0,255,255,0.25)' }}>Hub</span>
                    </h1>
                    <p className="text-gray-600 mt-1 text-[10px] font-bold tracking-widest uppercase">
                        AI-Driven Autonomous Security Orchestration
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        className="px-4 py-2 rounded-lg flex items-center gap-2 text-[11px] font-bold"
                        style={{
                            background: isScanning ? 'rgba(0,255,255,0.08)' : 'rgba(0,255,136,0.08)',
                            border:     isScanning ? '1px solid rgba(0,255,255,0.2)' : '1px solid rgba(0,255,136,0.2)',
                            color:      isScanning ? '#00ffff' : '#00ff88',
                        }}
                    >
                        <div className={`h-1.5 w-1.5 rounded-full ${isScanning ? 'animate-pulse' : ''}`}
                             style={{ background: isScanning ? '#00ffff' : '#00ff88', boxShadow:`0 0 5px ${isScanning ? '#00ffff' : '#00ff88'}` }} />
                        {isScanning ? 'ACTIVE SCAN' : 'SYSTEM ONLINE'}
                    </div>
                </div>
            </div>

            {/* ─── KPI Stat Cards ─────────────────── */}
            <StatCards latestScan={latestScan} isScanning={isScanning} />

            {/* ─── Main Nav Tabs ───────────────────── */}
            <Tabs tabs={mainTabs} activeTab={activeTab} onChange={handleMainTabChange} />


            {/* ═══════════════════════════════════════
                TAB 1: COMMAND CENTER
            ═══════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[
                            { id: 'overview', label: 'Dashboard',  icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
                            { id: 'active',   label: 'Live Feeds', icon: <Activity className="h-3.5 w-3.5" /> },
                        ]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />

                    {activeSubTab === 'overview' && (
                        <div className="animate-fade-in space-y-5">
                            {/* Pipeline banner */}
                            <ScanPipelinePanel logs={agentLogs} isScanning={isScanning} />

                            {/* 3-column grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight:580 }}>

                                {/* Left Panel */}
                                <div className="lg:col-span-3 flex flex-col gap-4">
                                    <RiskScore score={latestScan ? (100 - (latestScan.risk_score || 0)) : 100} />
                                    <ScanButton onScanStarted={handleScanStarted} isScanning={isScanning} />

                                    {/* Mini vuln count */}
                                    <div className="glass-card p-4 flex flex-col relative overflow-hidden group">
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                             style={{ background:'radial-gradient(circle at 50% 0, rgba(255,0,85,0.08), transparent 70%)' }} />
                                        <div className="flex items-center justify-between mb-2 relative z-10">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vuln Count</span>
                                            <Bug className="h-3.5 w-3.5 text-gray-700" />
                                        </div>
                                        <p className="text-4xl font-black text-white relative z-10">
                                            {latestScan?.vulnerabilities?.length || 0}
                                        </p>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase mt-1 relative z-10">From last scan</p>
                                        <div className="absolute bottom-0 left-0 right-0 h-px"
                                             style={{ background:'linear-gradient(90deg, transparent, rgba(255,0,85,0.4), transparent)' }} />
                                    </div>

                                    {/* Activity feed compact */}
                                    <div className="flex-grow min-h-[180px]">
                                        <ActivityFeed refresh={refreshKey} compact={true} isScanning={isScanning} />
                                    </div>
                                </div>

                                {/* Center: Network Topology */}
                                <div className="lg:col-span-6 flex flex-col" style={{ minHeight:500 }}>
                                    <NetworkTopology refresh={refreshKey} />
                                </div>

                                {/* Right: Action Center */}
                                <div className="lg:col-span-3 flex flex-col" style={{ minHeight:500 }}>
                                    <ActionCenter />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'active' && (
                        <ActivityFeed refresh={refreshKey} isScanning={isScanning} />
                    )}
                </div>
            )}


            {/* ═══════════════════════════════════════
                TAB 2: OPERATIONS
            ═══════════════════════════════════════ */}
            {activeTab === 'operations' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[
                            { id: 'scanner', label: 'Scanner', icon: <ScanIcon className="h-3.5 w-3.5" /> },
                            { id: 'history', label: 'History', icon: <History className="h-3.5 w-3.5" /> },
                            { id: 'targets', label: 'Targets', icon: <Target className="h-3.5 w-3.5" /> },
                        ]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />

                    {/* Scanner */}
                    {activeSubTab === 'scanner' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="md:col-span-1 flex flex-col gap-4">
                                {/* One-click CTA */}
                                <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden" style={{ minHeight:260 }}>
                                    <div className="absolute inset-0 pointer-events-none"
                                         style={{ background:'radial-gradient(circle, rgba(0,255,255,0.07) 0%, transparent 70%)' }} />
                                    <OpenVasScanButton onScanStarted={() => setRefreshKey(k => k + 1)} />
                                </div>
                                <div className="h-[280px]"><Scheduler /></div>
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-4">
                                {/* Scan selector */}
                                <div className="glass-card p-4 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <History className="h-4 w-4" style={{ color:'#00ffff' }} />
                                        Scan Results
                                    </h3>
                                    <select
                                        value={selectedScanId || ''}
                                        onChange={e => setSelectedScanId(e.target.value || null)}
                                        className="cyber-input"
                                        style={{ width:'auto', maxWidth:320 }}
                                    >
                                        <option value="">Latest Scan</option>
                                        {(scans || []).map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.target_display || s.target_url || 'Unknown'} — {s.started_at ? new Date(s.started_at).toLocaleString() : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <RiskChart data={
                                    (selectedScanId ? scans?.find(s => s.id === selectedScanId) : latestScan)
                                        ?.vulnerabilities?.reduce((acc, v) => {
                                            const sev = v.severity || 'LOW';
                                            acc[sev] = (acc[sev] || 0) + 1;
                                            return acc;
                                        }, {})
                                } />
                                <VulnerabilitiesList
                                    taskId={(selectedScanId ? scans?.find(s => s.id === selectedScanId) : latestScan)?.configuration?.openvas_task_id}
                                    scanId={selectedScanId || latestScan?.id}
                                />
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'history' && <ScanHistory refresh={refreshKey} />}
                    {activeSubTab === 'targets' && <TargetsManager onScanStarted={handleScanStarted} />}
                </div>
            )}


            {/* ═══════════════════════════════════════
                TAB 3: THREAT CENTER
            ═══════════════════════════════════════ */}
            {activeTab === 'threat-center' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[
                            { id: 'siem',            label: 'SIEM Alerts',    icon: <Activity className="h-3.5 w-3.5" /> },
                            { id: 'vulnerabilities', label: 'Vulnerabilities', icon: <Bug className="h-3.5 w-3.5" /> },
                            { id: 'network',         label: 'Network Map',    icon: <Network className="h-3.5 w-3.5" /> },
                        ]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />
                    {activeSubTab === 'siem' && (
                        <div style={{ minHeight:580 }}>
                            <SectionHeader icon={<Activity className="h-4 w-4 text-cyan-400" />} title="Unified SIEM Inbox" sub="Real-time security event correlation" />
                            <UnifiedInbox />
                        </div>
                    )}
                    {activeSubTab === 'vulnerabilities' && (
                        <div>
                            <SectionHeader icon={<Bug className="h-4 w-4 text-red-400" />} title="Vulnerability Center" sub="Filterable by severity, asset, and scan" />
                            <VulnerabilitiesPanel refresh={refreshKey} />
                        </div>
                    )}
                    {activeSubTab === 'network' && (
                        <div style={{ minHeight:580 }}>
                            <SectionHeader icon={<Network className="h-4 w-4 text-cyan-400" />} title="Network Topology" sub="Interactive asset map with risk overlays" />
                            <NetworkTopology refresh={refreshKey} />
                        </div>
                    )}
                </div>
            )}


            {/* ═══════════════════════════════════════
                TAB 4: AI BRAIN
            ═══════════════════════════════════════ */}
            {activeTab === 'ai-brain' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[{ id: 'ai-console', label: 'Agent Console', icon: <Brain className="h-3.5 w-3.5" /> }]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />
                    {activeSubTab === 'ai-console' && (
                        <div className="space-y-5">
                            {/* AI header bar */}
                            <div className="glass-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.2)' }}>
                                        <Brain className="h-4 w-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-wide leading-none">AI Agent Pipeline</h3>
                                        <p className="text-[10px] text-gray-600 mt-0.5">Gemini 2.0 Flash — Multi-Stage Autonomous Analysis</p>
                                    </div>
                                </div>
                                <select
                                    value={selectedScanId || ''}
                                    onChange={e => setSelectedScanId(e.target.value || null)}
                                    className="cyber-input"
                                    style={{ width:'auto', maxWidth:300 }}
                                >
                                    <option value="">Select a scan...</option>
                                    {(scans || []).map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.target_display || s.target_url || 'Unknown'} — {s.started_at ? new Date(s.started_at).toLocaleString() : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Agent pipeline stages */}
                            <div className="glass-card p-5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-5">Agent Execution Flow</p>
                                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                                    {['RECON', 'ATTACK', 'VALIDATE', 'REPORT'].map((stage, i, arr) => (
                                        <React.Fragment key={stage}>
                                            <div className="flex-shrink-0 text-center">
                                                <div className="glass-card px-5 py-3 relative group hover:border-cyan-400/30 transition-all">
                                                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{stage}</p>
                                                    <div className="mt-2 flex justify-center gap-0.5">
                                                        {[0,1,2].map(d => (
                                                            <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                                                                 style={{ background:'#00ffff', animationDelay:`${d*150}ms`, boxShadow:'0 0 4px #00ffff' }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {i < arr.length - 1 && (
                                                <div className="flex-shrink-0 h-px w-10 flex-none"
                                                     style={{ background:'linear-gradient(90deg, rgba(0,255,255,0.5), transparent)' }} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <AgentLogViewer scanId={selectedScanId} />
                        </div>
                    )}
                </div>
            )}


            {/* ═══════════════════════════════════════
                TAB 5: REPORTS
            ═══════════════════════════════════════ */}
            {activeTab === 'reports' && (
                <div className="animate-fade-in">
                    {/* Summary banner */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label:'Total Scans',    value: scans?.length || 0,         color:'#00ffff' },
                            { label:'Highest Risk',   value: Math.max(...(scans?.map(s => s.risk_score || 0) || [0])).toFixed(1), color:'#ff0055' },
                            { label:'Last Generated', value: latestScan ? new Date(latestScan.started_at || Date.now()).toLocaleDateString() : '—', color:'#00ff88' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="glass-card p-4 text-center relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 right-0 h-px"
                                     style={{ background:`linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                            </div>
                        ))}
                    </div>
                    <SectionHeader icon={<FileText className="h-4 w-4 text-cyan-400" />} title="Security Reports" sub="Download and share your scan reports" />
                    <Reports refresh={refreshKey} />
                </div>
            )}


            {/* ═══════════════════════════════════════
                TAB 6: SETTINGS
            ═══════════════════════════════════════ */}
            {activeTab === 'settings' && (
                <div className="animate-fade-in">
                    <SectionHeader icon={<Settings className="h-4 w-4 text-gray-400" />} title="System Configuration" sub="API endpoints, scan defaults, lab environment" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* API Config */}
                        <div className="glass-card p-6 space-y-4">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-cyan-400" /> API Configuration
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 font-bold block mb-1.5 uppercase tracking-wide">Backend URL</label>
                                    <input type="text" defaultValue={import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'} className="cyber-input" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 font-bold block mb-1.5 uppercase tracking-wide">API Key</label>
                                    <input type="password" placeholder="••••••••••••••••" className="cyber-input" />
                                </div>
                            </div>
                        </div>

                        {/* Scan Defaults */}
                        <div className="glass-card p-6 space-y-4">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <ScanIcon className="h-3.5 w-3.5 text-cyan-400" /> Scan Defaults
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 font-bold block mb-1.5 uppercase tracking-wide">Default Scan Type</label>
                                    <select className="cyber-input"><option>Full</option><option>Quick</option><option>Stealth</option></select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold block mb-1.5 uppercase tracking-wide">Threads</label>
                                        <input type="number" defaultValue={10} min={1} max={50} className="cyber-input" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold block mb-1.5 uppercase tracking-wide">Timeout (s)</label>
                                        <input type="number" defaultValue={30} min={5} max={300} className="cyber-input" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lab Environment */}
                        <div className="glass-card p-6">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-cyan-400" /> Lab Environment
                            </h4>
                            <pre className="text-[10px] font-mono leading-6 p-3 rounded-lg" style={{ background:'rgba(0,0,0,0.3)', color:'rgba(0,255,255,0.6)', border:'1px solid rgba(0,255,255,0.06)' }}>
{`VITE_API_URL=${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}
VITE_ENV=development
NODE_ENV=production`}
                            </pre>
                        </div>
                    </div>

                    <div className="mt-6">
                        <CyberButton variant="primary" size="lg" onClick={() => {}}>
                            Save Configuration
                        </CyberButton>
                    </div>
                </div>
            )}

        </Layout>
    );
};

export default Dashboard;
