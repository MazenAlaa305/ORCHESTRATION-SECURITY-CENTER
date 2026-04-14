import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';

import Layout from '../layout/Layout';
import StatCards from '../components/dashboard/StatCards';
import ScanButton from '../components/dashboard/ScanButton';
import OrchestrationFeed from '../components/dashboard/OrchestrationFeed';
import RiskHeatmap from '../components/dashboard/RiskHeatmap';
import UptimeGauge from '../components/dashboard/UptimeGauge';
import VulnTrend from '../components/dashboard/VulnTrend';
import ActionCenter from '../components/dashboard/ActionCenter';
import SubTabBar from '../components/ui/SubTabBar';
import Tabs from '../components/ui/Tabs';

import { scanService, dashboardService } from '../services/api';
import { useRealTime } from '../context/RealTimeContext';
import { useConfig } from '../context/ConfigContext';

import {
    LayoutDashboard, History, Settings, Activity,
    Network, FileText, Target, Bug, Brain,
    Scan as ScanIcon, Zap, Server,
} from 'lucide-react';

// ── Lazy-loaded heavy panels (code-split to improve initial load time) ────────
const NetworkTopology      = lazy(() => import('../components/dashboard/NetworkTopology'));
const ScanHistory          = lazy(() => import('../components/dashboard/ScanHistory'));
const TargetsManager       = lazy(() => import('../components/dashboard/TargetsManager'));
const VulnerabilitiesPanel = lazy(() => import('../components/dashboard/VulnerabilitiesPanel'));
const AgentLogViewer       = lazy(() => import('../components/dashboard/AgentLogViewer'));
const ScanPipelinePanel    = lazy(() => import('../components/dashboard/ScanPipelinePanel'));
const UnifiedInbox         = lazy(() => import('../components/dashboard/UnifiedInbox'));
const Reports              = lazy(() => import('../components/dashboard/Reports'));
const OpenVasScanButton    = lazy(() => import('../components/OpenVAS/ScanButton'));
const RiskChart            = lazy(() => import('../components/OpenVAS/RiskChart'));
const Scheduler            = lazy(() => import('../components/OpenVAS/Scheduler'));
const VulnerabilitiesList  = lazy(() => import('../components/OpenVAS/VulnerabilitiesList'));
const LabEnvironment       = lazy(() => import('../components/dashboard/LabEnvironment'));

// ── Loading fallback ──────────────────────────────────────────────────────────
const PanelLoader = () => (
    <div className="glass-card flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin" />
    </div>
);

// ── Main tab definitions ──────────────────────────────────────────────────────
const MAIN_TABS = [
    { id: 'overview',      label: 'Center',  icon: <LayoutDashboard /> },
    { id: 'operations',    label: 'Ops',     icon: <ScanIcon /> },
    { id: 'threat-center', label: 'Threats', icon: <Activity /> },
    { id: 'ai-brain',      label: 'AI',      icon: <Brain /> },
    { id: 'reports',       label: 'Docs',    icon: <FileText /> },
    { id: 'settings',      label: 'Config',  icon: <Settings /> },
];

// SUB_TAB_DEFAULTS are computed at render time (see Dashboard component)
// so SIEM can be excluded when siem_enabled=false.

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { state: realTime, dispatch } = useRealTime();
    const { siem_enabled } = useConfig();
    const [activeTab,    setActiveTab]    = useState('overview');
    const [activeSubTab, setActiveSubTab] = useState('overview');
    const [refreshKey,   setRefreshKey]   = useState(0);

    // Sub-tab defaults depend on SIEM flag — SIEM tab is hidden when disabled
    const SUB_TAB_DEFAULTS = {
        overview:       'overview',
        operations:     'scanner',
        'threat-center': siem_enabled ? 'siem' : 'vulnerabilities',
        'ai-brain':     'ai-console',
        reports:        'reports',
        settings:       'settings',
    };

    // ── Server data ──────────────────────────────────────────────────────────
    const { refetch: refetchKpi } = useQuery({
        queryKey: ['kpi-snapshot'],
        queryFn: async () => {
            const res = await dashboardService.getKpiSnapshot();
            dispatch({ type: 'INIT_SNAPSHOT', payload: res.data });
            return res.data;
        },
        staleTime: 60_000,
    });

    const { data: scans = [] } = useQuery({
        queryKey: ['scans', refreshKey],
        queryFn: () => scanService.getScans().then(r => r.data),
        staleTime: 30_000,
    });

    const isScanning  = realTime.scanStatus === 'RUNNING'
        || scans.some(s => s.status === 'running' || s.status === 'queued');
    const latestScan  = scans[0] ?? null;

    // Refetch KPI when a scan just finished
    const prevScanning = React.useRef(false);
    useEffect(() => {
        if (prevScanning.current && !isScanning) {
            setRefreshKey(k => k + 1);
            refetchKpi();
        }
        prevScanning.current = isScanning;
    }, [isScanning, refetchKpi]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleScanStarted = () => {
        setActiveTab('ai-brain');
        setActiveSubTab('ai-console');
    };

    const handleMainTabChange = (tabId) => {
        setActiveTab(tabId);
        setActiveSubTab(SUB_TAB_DEFAULTS[tabId] ?? 'overview');
    };

    // Vuln trend: last 7 scans in chronological order
    const trendData = [...scans].slice(0, 7).reverse().map(s => ({
        date:  s.started_at ? new Date(s.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '?',
        count: s.vulnerability_count ?? s.vulnerabilities?.length ?? 0,
    }));

    // Heatmap data sourced directly from live KPI counts
    const heatmapData = [
        { name: 'Critical', value: realTime.kpi.counts.critical, severity: 'critical' },
        { name: 'High',     value: realTime.kpi.counts.high,     severity: 'high'     },
        { name: 'Medium',   value: realTime.kpi.counts.medium,   severity: 'medium'   },
        { name: 'Low',      value: realTime.kpi.counts.low,      severity: 'low'      },
    ];

    return (
        <Layout
            activeTab={activeTab}
            onTabChange={handleMainTabChange}
            onQuickScan={handleScanStarted}
            isScanning={isScanning}
        >
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.03] pb-3">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                        Security <span style={{ color: '#00ffff' }}>Ops</span>
                    </h1>
                    <div className="h-4 w-px bg-white/10 hidden md:block" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
                        Node // Real-time
                    </span>
                </div>
                <div
                    className="px-3 py-1 rounded-md flex items-center gap-1.5 text-[9px] font-bold"
                    style={{
                        background: isScanning ? 'rgba(0,255,255,0.05)' : 'rgba(0,255,136,0.05)',
                        border:     isScanning ? '1px solid rgba(0,255,255,0.1)' : '1px solid rgba(0,255,136,0.1)',
                        color:      isScanning ? '#00ffff' : '#00ff88',
                    }}
                >
                    <div
                        className={`h-1 w-1 rounded-full ${isScanning ? 'animate-pulse' : ''}`}
                        style={{ background: isScanning ? '#00ffff' : '#00ff88' }}
                    />
                    {isScanning ? 'ACTIVE ORCHESTRATION' : 'MONITORING'}
                </div>
            </div>

            {/* ── KPI cards (always visible) ───────────────────────────────── */}
            <StatCards latestScan={latestScan} isScanning={isScanning} />

            {/* ── Main tab bar ─────────────────────────────────────────────── */}
            <div className="mb-4">
                <Tabs tabs={MAIN_TABS} activeTab={activeTab} onChange={handleMainTabChange} />
            </div>

            {/* ════════════════════════════════════════════════════════════════
                TAB: COMMAND CENTER
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Left rail */}
                        <div className="md:col-span-3 flex flex-col gap-4">
                            <UptimeGauge value={realTime.kpi.health_score} />
                            <div className="glass-card p-4 relative overflow-hidden">
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">
                                    Orchestration
                                </p>
                                <ScanButton onScanStarted={handleScanStarted} isScanning={isScanning} />
                            </div>
                            <VulnTrend data={trendData} />
                        </div>

                        {/* Centre panel */}
                        <div className="md:col-span-6 flex flex-col gap-4">
                            <RiskHeatmap data={heatmapData} />
                            <div className="flex-grow min-h-[400px]">
                                <Suspense fallback={<PanelLoader />}>
                                    <NetworkTopology refresh={refreshKey} compact />
                                </Suspense>
                            </div>
                        </div>

                        {/* Right rail */}
                        <div className="md:col-span-3 flex flex-col gap-4">
                            <div className="h-[350px]">
                                <OrchestrationFeed logs={realTime.orchestrationLog} />
                            </div>
                            <div className="flex-grow">
                                <ActionCenter refreshKey={refreshKey} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB: OPERATIONS
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'operations' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[
                            { id: 'scanner', label: 'Scan',    icon: <ScanIcon /> },
                            { id: 'history', label: 'History', icon: <History /> },
                            { id: 'targets', label: 'Nodes',   icon: <Target /> },
                            { id: 'lab',     label: 'Lab',     icon: <Server /> },
                        ]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />
                    <Suspense fallback={<PanelLoader />}>
                        {activeSubTab === 'scanner' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 flex flex-col gap-4">
                                    <div className="glass-card p-4 h-48 flex items-center justify-center">
                                        <OpenVasScanButton onScanStarted={() => setRefreshKey(k => k + 1)} />
                                    </div>
                                    <Scheduler />
                                </div>
                                <div className="md:col-span-2 flex flex-col gap-4">
                                    <RiskChart data={
                                        latestScan?.vulnerabilities?.reduce((acc, v) => {
                                            const sev = (v.severity || 'LOW').toUpperCase();
                                            acc[sev] = (acc[sev] || 0) + 1;
                                            return acc;
                                        }, {})
                                    } />
                                    <VulnerabilitiesList
                                        taskId={latestScan?.configuration?.openvas_task_id}
                                        scanId={latestScan?.id}
                                    />
                                </div>
                            </div>
                        )}
                        {activeSubTab === 'history' && <ScanHistory refresh={refreshKey} />}
                        {activeSubTab === 'targets' && <TargetsManager onScanStarted={handleScanStarted} />}
                        {activeSubTab === 'lab'     && <LabEnvironment />}
                    </Suspense>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB: THREAT CENTER
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'threat-center' && (
                <div className="animate-fade-in">
                    <SubTabBar
                        tabs={[
                            // SIEM tab is only shown when the backend integration is enabled
                            ...(siem_enabled ? [{ id: 'siem', label: 'SIEM', icon: <Activity /> }] : []),
                            { id: 'vulnerabilities', label: 'Vulns',    icon: <Bug /> },
                            { id: 'network',         label: 'Topology', icon: <Network /> },
                        ]}
                        active={activeSubTab}
                        onChange={setActiveSubTab}
                    />
                    <Suspense fallback={<PanelLoader />}>
                        {activeSubTab === 'siem'            && <UnifiedInbox />}
                        {activeSubTab === 'vulnerabilities' && <VulnerabilitiesPanel refresh={refreshKey} />}
                        {activeSubTab === 'network'         && <NetworkTopology refresh={refreshKey} />}
                    </Suspense>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB: AI BRAIN
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'ai-brain' && (
                <div className="animate-fade-in space-y-4">
                    <Suspense fallback={<PanelLoader />}>
                        <ScanPipelinePanel logs={realTime.orchestrationLog} isScanning={isScanning} />
                        <AgentLogViewer scanId={latestScan?.id} />
                    </Suspense>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB: REPORTS
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
                <Suspense fallback={<PanelLoader />}>
                    <Reports refresh={refreshKey} />
                </Suspense>
            )}
        </Layout>
    );
};

export default Dashboard;
