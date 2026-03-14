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
import ScanningBanner from '../components/dashboard/ScanningBanner';
import Tabs from '../components/ui/Tabs';
import { scanService, dashboardService } from '../services/api';

import OpenVasScanButton from '../components/OpenVAS/ScanButton';
import RiskChart from '../components/OpenVAS/RiskChart';
import Scheduler from '../components/OpenVAS/Scheduler';
import VulnerabilitiesList from '../components/OpenVAS/VulnerabilitiesList';

import {
    LayoutDashboard, History, Settings, Activity,
    Network, FileText, Target, Bug, Brain, Scan as ScanIcon
} from 'lucide-react';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [activeSubTab, setActiveSubTab] = useState('overview');
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedScanId, setSelectedScanId] = useState(null);
    const [wasScanning, setWasScanning] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // Fetch scans via TanStack Query with dynamic polling
    const { data: scans, refetch: refetchScans } = useQuery({
        queryKey: ['scans'],
        queryFn: async () => {
            const res = await scanService.getScans();
            dashboardService.refreshRiskScores().catch(console.error);
            return res.data;
        },
        refetchInterval: (query) => {
            const data = query?.state?.data || [];
            const hasRunning = data.some(s => s.status === 'RUNNING' || s.status === 'QUEUED');
            return hasRunning ? 3000 : 15000;
        }
    });

    const isScanning = scans?.some(s => s.status === 'RUNNING' || s.status === 'QUEUED');
    const latestScan = scans && scans.length > 0 ? scans[0] : null;

    // Detect scan completion → auto-switch to Threat Center
    useEffect(() => {
        if (isScanning && !wasScanning) {
            setWasScanning(true);
            setBannerDismissed(false); // show banner again on new scan
        } else if (!isScanning && wasScanning) {
            setWasScanning(false);
            setRefreshKey(prev => prev + 1);
            setActiveTab('threat-center');
            setActiveSubTab('network');
        }
    }, [isScanning, wasScanning]);

    const handleScanStarted = () => {
        refetchScans();
        setWasScanning(true);
        setBannerDismissed(false);
        setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
        setActiveTab('operations');
        setActiveSubTab('history');
    };

    // Main tab definitions
    const mainTabs = [
        { id: 'overview',      label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'operations',    label: 'Operations',     icon: <ScanIcon className="h-4 w-4" /> },
        { id: 'threat-center', label: 'Threat Center',  icon: <Activity className="h-4 w-4" /> },
        { id: 'ai-brain',      label: 'AI Brain',       icon: <Brain className="h-4 w-4" /> },
        { id: 'system',        label: 'System',         icon: <Settings className="h-4 w-4" /> },
    ];

    const renderSubTabs = (subTabData) => (
        <div className="flex bg-black/30 backdrop-blur-sm p-1 rounded-xl w-fit mb-6 border border-white/5 gap-0.5">
            {subTabData.map(tab => (
                <button
                    key={tab.id}
                    id={`subtab-${tab.id}`}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-4 py-2 text-[11px] font-black transition-all rounded-lg flex items-center gap-2 uppercase tracking-wider ${
                        activeSubTab === tab.id
                            ? 'bg-cyber-accent text-gray-900 shadow-neon-sm'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const handleMainTabChange = (tabId) => {
        setActiveTab(tabId);
        const defaultSubs = {
            overview: 'overview',
            operations: 'scanner',
            'threat-center': 'siem',
            'ai-brain': 'ai-console',
            system: 'reports',
        };
        setActiveSubTab(defaultSubs[tabId] || 'overview');
    };

    return (
        <Layout activeTab={activeTab} onTabChange={handleMainTabChange}>
            {/* Scanning Banner */}
            {isScanning && !bannerDismissed && (
                <ScanningBanner
                    isScanning={isScanning}
                    onDismiss={() => setBannerDismissed(true)}
                />
            )}

            {/* Page Header */}
            <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 ${isScanning && !bannerDismissed ? 'mt-14' : 'mt-0'}`}>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-0.5 w-6 bg-cyber-accent rounded-full" />
                        <span className="text-[10px] font-black text-cyber-accent uppercase tracking-[0.4em]">
                            found 404 // Core Node
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
                        Security <span className="text-cyber-accent underline decoration-cyber-accent/30 underline-offset-4">Hub</span>
                    </h1>
                    <p className="text-gray-600 mt-1 text-[10px] font-black tracking-widest uppercase">
                        AI-Driven Autonomous Security Orchestration
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className={`px-3 py-1.5 glass-card flex items-center gap-2 text-[10px] font-bold ${isScanning ? 'text-cyber-accent border-cyber-accent/20' : 'text-cyber-success border-cyber-success/20'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${isScanning ? 'bg-cyber-accent animate-pulse' : 'bg-cyber-success'}`} />
                        {isScanning ? 'SCANNING' : 'SYSTEM ONLINE'}
                    </div>
                </div>
            </div>

            {/* Hero KPI Stats Row */}
            <StatCards latestScan={latestScan} isScanning={isScanning} />

            {/* Main Navigation Tabs */}
            <Tabs tabs={mainTabs} activeTab={activeTab} onChange={handleMainTabChange} />

            {/* ─── 1. COMMAND CENTER ─── */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
                        { id: 'active',   label: 'Live Feeds', icon: <Activity className="h-3.5 w-3.5" /> }
                    ])}

                    {activeSubTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in" style={{ minHeight: '600px' }}>
                            {/* Left: Stats & Scan Controls (3 cols) */}
                            <div className="lg:col-span-3 flex flex-col gap-4">
                                <RiskScore score={latestScan?.risk_score || 0} />
                                <ScanButton onScanStarted={handleScanStarted} isScanning={isScanning} />
                                <div className="glass-card p-4 flex flex-col justify-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Bug className="h-10 w-10 text-cyber-neon" />
                                    </div>
                                    <h3 className="text-gray-500 text-[10px] uppercase tracking-[0.2em] mb-1 font-black">Vulnerability Count</h3>
                                    <p className="text-4xl font-black text-white">{latestScan?.vulnerabilities?.length || 0}</p>
                                    <p className="text-[9px] text-gray-600 font-mono uppercase mt-1">From last scan</p>
                                </div>
                                <div className="flex-grow min-h-[200px]">
                                    <ActivityFeed refresh={refreshKey} compact={true} isScanning={isScanning} />
                                </div>
                            </div>

                            {/* Middle: Live Topology (6 cols) */}
                            <div className="lg:col-span-6 flex flex-col glass-card p-1">
                                <h3 className="text-[10px] font-black text-cyber-accent uppercase tracking-widest px-4 pt-3 pb-1">
                                    Live Network Topology
                                </h3>
                                <div className="flex-grow relative border border-white/5 rounded-xl overflow-hidden bg-black/40 w-full" style={{ minHeight: '520px' }}>
                                    <NetworkTopology refresh={refreshKey} />
                                </div>
                            </div>

                            {/* Right: Action Center (3 cols) */}
                            <div className="lg:col-span-3 flex flex-col" style={{ minHeight: '520px' }}>
                                <ActionCenter />
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'active' && (
                        <ActivityFeed refresh={refreshKey} isScanning={isScanning} />
                    )}
                </div>
            )}

            {/* ─── 2. OPERATIONS ─── */}
            {activeTab === 'operations' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'scanner', label: 'Scanner',  icon: <ScanIcon className="h-3.5 w-3.5" /> },
                        { id: 'targets', label: 'Targets',  icon: <Target className="h-3.5 w-3.5" /> },
                        { id: 'history', label: 'History',  icon: <History className="h-3.5 w-3.5" /> }
                    ])}

                    {activeSubTab === 'scanner' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="md:col-span-1 flex flex-col gap-4">
                                <OpenVasScanButton onScanStarted={() => setRefreshKey(prev => prev + 1)} />
                                <div className="h-[300px]"><Scheduler /></div>
                            </div>
                            <div className="md:col-span-2 h-[450px]">
                                <RiskChart data={
                                    latestScan?.vulnerabilities?.reduce((acc, v) => {
                                        const sev = v.severity || 'LOW';
                                        acc[sev] = (acc[sev] || 0) + 1;
                                        return acc;
                                    }, {})
                                } />
                            </div>
                            <div className="md:col-span-3 mt-2">
                                <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <Bug className="h-4 w-4 text-cyber-neon" />
                                    Current Scan Results
                                </h3>
                                <VulnerabilitiesList taskId={latestScan?.configuration?.openvas_task_id} />
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'targets' && <TargetsManager onScanStarted={handleScanStarted} />}
                    {activeSubTab === 'history' && <ScanHistory refresh={refreshKey} />}
                </div>
            )}

            {/* ─── 3. THREAT CENTER ─── */}
            {activeTab === 'threat-center' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'siem',            label: 'SIEM Alerts',    icon: <Activity className="h-3.5 w-3.5" /> },
                        { id: 'vulnerabilities', label: 'Vulnerabilities', icon: <Bug className="h-3.5 w-3.5" /> },
                        { id: 'network',         label: 'Network Map',    icon: <Network className="h-3.5 w-3.5" /> }
                    ])}

                    {activeSubTab === 'siem' && <div className="h-[600px]"><UnifiedInbox /></div>}
                    {activeSubTab === 'vulnerabilities' && <VulnerabilitiesPanel refresh={refreshKey} />}
                    {activeSubTab === 'network' && <NetworkTopology refresh={refreshKey} />}
                </div>
            )}

            {/* ─── 4. AI BRAIN ─── */}
            {activeTab === 'ai-brain' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'ai-console', label: 'Agent Console', icon: <Brain className="h-3.5 w-3.5" /> }
                    ])}

                    {activeSubTab === 'ai-console' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-purple-400" />
                                    <h3 className="text-lg font-black text-white uppercase tracking-wide">AI Agent Pipeline</h3>
                                </div>
                                <select
                                    value={selectedScanId || ''}
                                    onChange={(e) => setSelectedScanId(e.target.value || null)}
                                    className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyber-accent/40 font-mono"
                                >
                                    <option value="">Select a scan...</option>
                                    {(scans || []).map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.target} — {new Date(s.created_at).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <AgentLogViewer scanId={selectedScanId} />
                        </div>
                    )}
                </div>
            )}

            {/* ─── 5. SYSTEM & REPORTS ─── */}
            {activeTab === 'system' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'reports',  label: 'PDF Reports', icon: <FileText className="h-3.5 w-3.5" /> },
                        { id: 'settings', label: 'Settings',    icon: <Settings className="h-3.5 w-3.5" /> }
                    ])}

                    {activeSubTab === 'reports' && <Reports refresh={refreshKey} />}

                    {activeSubTab === 'settings' && (
                        <div className="glass-card p-12 text-center">
                            <Settings className="h-14 w-14 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">System Settings</h3>
                            <p className="text-gray-500 text-sm max-w-md mx-auto">
                                Configuration options for AI agents, Nuclei templates, API keys, and scan scheduling.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
