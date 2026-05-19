import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from '../components/ErrorBoundary';
import { fadeInUp, stagger, staggerItem } from '../lib/motion';

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
import UserManagementPage from './UserManagementPage';

import { scanService, dashboardService } from '../services/api';
import { useRealTime } from '../context/RealTimeContext';
import { useConfig } from '../context/ConfigContext';
import { usePermission } from '../hooks/usePermission';

import {
    LayoutDashboard, History, Settings, Activity,
    Network, FileText, Target, Bug, Brain,
    Scan as ScanIcon, Server, Users,
} from 'lucide-react';

// ── Lazy-loaded heavy panels (code-split to improve initial load time) ────────
const NetworkTopology      = lazy(() => import('../components/dashboard/NetworkTopology'));
const ScanHistory          = lazy(() => import('../components/dashboard/ScanHistory'));
const TargetsManager       = lazy(() => import('../components/dashboard/TargetsManager'));
const VulnerabilitiesPanel = lazy(() => import('../components/dashboard/VulnerabilitiesPanel'));
const AgentLogViewer       = lazy(() => import('../components/dashboard/AgentLogViewer'));
const UnifiedInbox         = lazy(() => import('../components/dashboard/UnifiedInbox'));
const Reports              = lazy(() => import('../components/dashboard/Reports'));
const RiskChart            = lazy(() => import('../components/OpenVAS/RiskChart'));
const Scheduler            = lazy(() => import('../components/OpenVAS/Scheduler'));
const VulnerabilitiesList  = lazy(() => import('../components/OpenVAS/VulnerabilitiesList'));
const LabEnvironment       = lazy(() => import('../components/dashboard/LabEnvironment'));
const SettingsPanel        = lazy(() => import('../components/dashboard/SettingsPanel'));

// ── Loading fallback ──────────────────────────────────────────────────────────
const PanelLoader = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="glass-card flex items-center justify-center min-h-[200px] gap-3"
    >
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-transparent border-t-cyan-400 rounded-full"
        />
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600"
        >
            Loading
        </motion.span>
    </motion.div>
);

// ── Base tab definitions (users tab added at render time for ADMINs) ──────────
const BASE_TABS = [
    { id: 'overview',      label: 'Command Center', icon: <LayoutDashboard /> },
    { id: 'operations',    label: 'Operations',     icon: <ScanIcon /> },
    { id: 'threat-center', label: 'Threat Center',  icon: <Activity /> },
    { id: 'ai-brain',      label: 'AI Brain',       icon: <Brain /> },
    { id: 'reports',       label: 'Reports',        icon: <FileText /> },
    { id: 'settings',      label: 'Settings',       icon: <Settings /> },
];

// SUB_TAB_DEFAULTS are computed at render time (see Dashboard component)
// so SIEM can be excluded when siem_enabled=false.

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { state: realTime, dispatch } = useRealTime();
    const { siem_enabled } = useConfig();
    const { canManageUsers } = usePermission();
    const { tab: urlTab, subTab: urlSubTab } = useParams();
    const navigate = useNavigate();
    const [refreshKey,   setRefreshKey]   = useState(0);
    const [activeScanId, setActiveScanId] = useState(null);

    const MAIN_TABS = useMemo(() => [
        ...BASE_TABS,
        ...(canManageUsers ? [{ id: 'users', label: 'Users', icon: <Users /> }] : []),
    ], [canManageUsers]);

    // Sub-tab defaults depend on SIEM flag — SIEM tab is hidden when disabled
    const SUB_TAB_DEFAULTS = useMemo(() => ({
        overview:        'overview',
        operations:      'scanner',
        'threat-center': siem_enabled ? 'siem' : 'vulnerabilities',
        'ai-brain':      'ai-console',
        reports:         'reports',
        settings:        'settings',
        users:           'users',
    }), [siem_enabled]);

    const VALID_TABS = MAIN_TABS.map(t => t.id);
    const activeTab    = VALID_TABS.includes(urlTab) ? urlTab : 'overview';
    const activeSubTab = urlSubTab || SUB_TAB_DEFAULTS[activeTab] || 'overview';

    // Core navigation helper — updates the URL, everything derives from it.
    const navTo = useCallback((newTab, newSub) => {
        const resolvedSub = newSub || SUB_TAB_DEFAULTS[newTab] || 'overview';
        navigate(`/dashboard/${newTab}/${resolvedSub}`);
    }, [navigate, SUB_TAB_DEFAULTS]);

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
        // Scans list now returns `{items, total, page, page_size}` (Phase 4).
        queryFn: () => scanService.getScans({ page: 1, page_size: 25 }).then(r => r.data?.items ?? []),
        staleTime: 5_000,
        refetchInterval: 5_000,
    });

    const isScanning  = realTime.scanStatus === 'RUNNING'
        || scans.some(s => s.status === 'running' || s.status === 'queued');
    const latestScan  = scans[0] ?? null;
    const latestOpenVASScan = scans.find(s =>
        s.configuration?.openvas_task_id || s.scan_type === 'openvas'
    ) ?? null;


    // Refetch KPI when a scan just finished
    const prevScanning = React.useRef(false);
    useEffect(() => {
        if (prevScanning.current && !isScanning) {
            setRefreshKey(k => k + 1);
            refetchKpi();
        }
        prevScanning.current = isScanning;
    }, [isScanning, refetchKpi]);

    // Cross-component navigation bus — any panel can call
    // window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: { tab, sub } }))
    useEffect(() => {
        const handler = (e) => {
            const { tab: t, sub } = e.detail || {};
            if (t) navTo(t, sub);
        };
        window.addEventListener('dashboard:navigate', handler);
        return () => window.removeEventListener('dashboard:navigate', handler);
    }, [navTo]);

    // KPI refresh bus — any panel can trigger: window.dispatchEvent(new CustomEvent('dashboard:refresh-kpi'))
    useEffect(() => {
        const handler = () => { setRefreshKey(k => k + 1); refetchKpi(); };
        window.addEventListener('dashboard:refresh-kpi', handler);
        return () => window.removeEventListener('dashboard:refresh-kpi', handler);
    }, [refetchKpi]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleScanStarted = (scan) => {
        setRefreshKey(k => k + 1);
        if (scan?.id) setActiveScanId(scan.id);
        navTo('operations', 'history');
    };

    const handleMainTabChange = useCallback((tabId) => {
        navTo(tabId, SUB_TAB_DEFAULTS[tabId]);
    }, [navTo, SUB_TAB_DEFAULTS]);

    const handleSubTabChange = useCallback((sub) => {
        navTo(activeTab, sub);
    }, [navTo, activeTab]);

    // Exposure trend: daily vulnerability discovery counts from the backend
    const { data: trendData = [] } = useQuery({
        queryKey: ['exposure-trend'],
        queryFn: () => dashboardService.getExposureTrend(14).then(r => r.data),
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    // Heatmap data sourced directly from live KPI counts
    const heatmapData = [
        { name: 'Critical', value: realTime.kpi.counts.critical, severity: 'critical' },
        { name: 'High',     value: realTime.kpi.counts.high,     severity: 'high'     },
        { name: 'Medium',   value: realTime.kpi.counts.medium,   severity: 'medium'   },
        { name: 'Low',      value: realTime.kpi.counts.low,      severity: 'low'      },
        { name: 'Info',     value: realTime.kpi.counts.info,     severity: 'info'     },
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
                Animated tab content — keyed by activeTab so AnimatePresence
                cross-fades panels on tab switch.
            ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
            >
            {/* ── COMMAND CENTER ── */}
            {activeTab === 'overview' && (
                <motion.div variants={stagger(0.05, 0.06)} initial="initial" animate="animate" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Left rail */}
                        <motion.div variants={staggerItem} className="md:col-span-3 flex flex-col gap-4">
                            <UptimeGauge value={realTime.kpi.health_score} />
                            <div className="glass-card p-4 relative overflow-hidden">
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">
                                    Orchestration
                                </p>
                                <ScanButton onScanStarted={handleScanStarted} isScanning={isScanning} />
                            </div>
                            <VulnTrend data={trendData} />
                        </motion.div>

                        {/* Centre panel */}
                        <motion.div variants={staggerItem} className="md:col-span-6 flex flex-col gap-4">
                            <RiskHeatmap data={heatmapData} />
                            <div className="flex-grow min-h-[400px]">
                                <Suspense fallback={<PanelLoader />}>
                                    <NetworkTopology refresh={refreshKey} compact />
                                </Suspense>
                            </div>
                        </motion.div>

                        {/* Right rail */}
                        <motion.div variants={staggerItem} className="md:col-span-3 flex flex-col gap-4">
                            <div className="h-[350px]">
                                <OrchestrationFeed logs={realTime.orchestrationLog} />
                            </div>
                            <div className="flex-grow">
                                <ActionCenter refreshKey={refreshKey} />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}

            {/* ── OPERATIONS ── */}
            {activeTab === 'operations' && (
                <div>
                    <SubTabBar
                        tabs={[
                            { id: 'scanner', label: 'Scan',    icon: <ScanIcon /> },
                            { id: 'history', label: 'History', icon: <History /> },
                            { id: 'targets', label: 'Nodes',   icon: <Target /> },
                            { id: 'lab',     label: 'Lab',     icon: <Server /> },
                        ]}
                        active={activeSubTab}
                        onChange={handleSubTabChange}
                    />
                    <Suspense fallback={<PanelLoader />}>
                        {activeSubTab === 'scanner' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 flex flex-col gap-4">
                                    <div className="glass-card p-4 h-48 flex items-center justify-center">
                                        <ScanButton onScanStarted={handleScanStarted} isScanning={isScanning} />
                                    </div>
                                    <Scheduler />
                                </div>
                                <div className="md:col-span-2 flex flex-col gap-4">
                                    <RiskChart data={{
                                        CRITICAL: realTime.kpi.counts.critical || 0,
                                        HIGH:     realTime.kpi.counts.high     || 0,
                                        MEDIUM:   realTime.kpi.counts.medium   || 0,
                                        LOW:      realTime.kpi.counts.low      || 0,
                                    }} />
                                    <VulnerabilitiesList
                                        taskId={latestOpenVASScan?.configuration?.openvas_task_id}
                                        scanId={latestOpenVASScan?.id}
                                    />
                                </div>
                            </div>
                        )}
                        {activeSubTab === 'history' && <ScanHistory refresh={refreshKey} />}
                        {activeSubTab === 'targets' && (
                            <ErrorBoundary>
                                <TargetsManager onScanStarted={handleScanStarted} />
                            </ErrorBoundary>
                        )}
                        {activeSubTab === 'lab'     && <LabEnvironment />}
                    </Suspense>
                </div>
            )}

            {/* ── THREAT CENTER ── */}
            {activeTab === 'threat-center' && (
                <div>
                    <SubTabBar
                        tabs={[
                            // SIEM tab is only shown when the backend integration is enabled
                            ...(siem_enabled ? [{ id: 'siem', label: 'SIEM', icon: <Activity /> }] : []),
                            { id: 'vulnerabilities', label: 'Vulns',    icon: <Bug /> },
                            { id: 'network',         label: 'Topology', icon: <Network /> },
                        ]}
                        active={activeSubTab}
                        onChange={handleSubTabChange}
                    />
                    <Suspense fallback={<PanelLoader />}>
                        {activeSubTab === 'siem'            && <UnifiedInbox />}
                        {activeSubTab === 'vulnerabilities' && <VulnerabilitiesPanel refresh={refreshKey} />}
                        {activeSubTab === 'network'         && <NetworkTopology refresh={refreshKey} />}
                    </Suspense>
                </div>
            )}

            {/* ── AI BRAIN ── */}
            {activeTab === 'ai-brain' && (
                <div className="space-y-4">
                    <Suspense fallback={<PanelLoader />}>
                        <AgentLogViewer scanId={activeScanId || latestScan?.id} />
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

            {/* ════════════════════════════════════════════════════════════════
                TAB: SETTINGS / CONFIG
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'settings' && (
                <Suspense fallback={<PanelLoader />}>
                    <SettingsPanel />
                </Suspense>
            )}

            {/* ── USER MANAGEMENT (ADMIN only) ── */}
            {activeTab === 'users' && canManageUsers && (
                <UserManagementPage />
            )}
            </motion.div>
            </AnimatePresence>
        </Layout>
    );
};

export default Dashboard;
