import React, { useState, useEffect } from 'react';
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
import Tabs from '../components/ui/Tabs';
import { scanService, dashboardService } from '../services/api';

import OpenVasScanButton from '../components/OpenVAS/ScanButton';
import RiskChart from '../components/OpenVAS/RiskChart';
import Scheduler from '../components/OpenVAS/Scheduler';
import VulnerabilitiesList from '../components/OpenVAS/VulnerabilitiesList';
import { LayoutDashboard, History, Settings, Activity, Network, FileText, Target, Bug, Brain, Scan as ScanIcon } from 'lucide-react';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview'); // Main Category
    const [activeSubTab, setActiveSubTab] = useState('overview'); // Sub Category
    const [refreshKey, setRefreshKey] = useState(0);
    const [latestScan, setLatestScan] = useState(null);
    const [selectedScanId, setSelectedScanId] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    // Check for active scan on mount and periodically
    useEffect(() => {
        let pollInterval;

        const checkScanStatus = async () => {
            try {
                const response = await scanService.getScans();
                const runningScan = response.data?.find(s => s.status === 'RUNNING' || s.status === 'QUEUED');

                if (runningScan) {
                    setIsScanning(true);
                    if (!pollInterval) {
                        pollInterval = setInterval(checkScanStatus, 3000);
                    }
                } else {
                    if (isScanning) {
                        setIsScanning(false);
                        clearInterval(pollInterval);
                        pollInterval = null;

                        setRefreshKey(prev => prev + 1);
                        setActiveTab('threat-center');
                        setActiveSubTab('network');
                    }
                }
            } catch (error) {
                console.error("Scan polling failed", error);
                clearInterval(pollInterval);
            }
        };

        checkScanStatus();
        dashboardService.refreshRiskScores().catch(console.error);

        const initialInterval = setInterval(checkScanStatus, 10000);

        return () => {
            clearInterval(initialInterval);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isScanning, refreshKey]);

    const handleScanStarted = () => {
        setIsScanning(true);
        setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
        setActiveTab('operations');
        setActiveSubTab('history');
    };

    // --- NEW SIMPLIFIED TAB STRUCTURE ---
    const mainTabs = [
        { id: 'overview', label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'operations', label: 'Operations', icon: <ScanIcon className="h-4 w-4" /> },
        { id: 'threat-center', label: 'Threat Center', icon: <Activity className="h-4 w-4" /> },
        { id: 'ai-brain', label: 'AI Brain', icon: <Brain className="h-4 w-4" /> },
        { id: 'system', label: 'System', icon: <Settings className="h-4 w-4" /> },
    ];

    // Helper to render SubTabs
    const renderSubTabs = (subTabData) => (
        <div className="flex bg-gray-900/50 p-1 rounded-lg w-fit mb-6 border border-gray-800">
            {subTabData.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-4 py-2 text-xs font-bold transition-all rounded-md flex items-center gap-2 ${activeSubTab === tab.id
                        ? 'bg-cyber-accent text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );

    // Auto-set default SubTab when Main Tab changes
    const handleMainTabChange = (tabId) => {
        setActiveTab(tabId);
        if (tabId === 'overview') setActiveSubTab('overview');
        if (tabId === 'operations') setActiveSubTab('scanner');
        if (tabId === 'threat-center') setActiveSubTab('siem');
        if (tabId === 'ai-brain') setActiveSubTab('ai-console');
        if (tabId === 'system') setActiveSubTab('reports');
    };

    return (
        <Layout>
            {/* GLOBAL SCAN LOADER */}
            {isScanning && (
                <div className="fixed top-20 right-10 z-[100] animate-bounce">
                    <div className="bg-cyber-accent/20 border border-cyber-accent backdrop-blur-xl px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                        <div className="relative">
                            <Brain className="h-5 w-5 text-cyber-accent animate-pulse" />
                            <div className="absolute inset-0 bg-cyber-accent blur-md opacity-50 animate-ping"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Scanning Active</span>
                            <span className="text-[8px] text-cyber-accent font-mono animate-pulse">ORCHESTRATING NODES...</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-8 bg-cyber-accent rounded-full"></div>
                        <span className="text-[10px] font-black text-cyber-accent uppercase tracking-[0.4em]">found 404 // Core Node</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
                        Security <span className="text-cyber-accent underline decoration-cyber-accent/30 underline-offset-8">Hub</span>
                    </h1>
                    <p className="text-gray-500 mt-4 text-xs font-black tracking-widest uppercase opacity-60">AI-Driven Autonomous Security Orchestration</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 glass-card flex items-center gap-2 text-xs font-bold text-cyber-neon border-cyber-neon/20">
                        <div className="h-2 w-2 rounded-full bg-cyber-neon animate-pulse"></div>
                        SYSTEM ONLINE
                    </div>
                </div>
            </div>

            {/* MAIN NAVIGATION TABS */}
            <Tabs tabs={mainTabs} activeTab={activeTab} onChange={handleMainTabChange} />

            {/* 1. OVERVIEW (Command Center) */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
                        { id: 'active', label: 'Live Feeds', icon: <Activity className="h-4 w-4" /> }
                    ])}

                    {activeSubTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <RiskScore score={latestScan?.risk_score || 0} />

                            <div className="flex flex-col gap-6">
                                <ScanButton onScanStarted={handleScanStarted} />
                                <div className="glass-card p-6 flex flex-col justify-center flex-grow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Bug className="h-12 w-12 text-cyber-neon" />
                                    </div>
                                    <h3 className="text-gray-400 text-xs uppercase tracking-[0.2em] mb-1 font-bold">Vulnerability Count</h3>
                                    <p className="text-5xl font-black text-white">{latestScan?.vulnerabilities?.length || 0}</p>
                                    <p className="text-cyber-neon/60 text-[10px] mt-2 font-mono tracking-tighter">TOTAL FINDINGS DETECTED</p>
                                </div>
                            </div>

                            <div className="md:row-span-2 h-full">
                                <ActionCenter />
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'active' && <ActivityFeed refresh={refreshKey} />}
                </div>
            )}

            {/* 2. OPERATIONS */}
            {activeTab === 'operations' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'scanner', label: 'Scanner', icon: <ScanIcon className="h-4 w-4" /> },
                        { id: 'targets', label: 'Targets', icon: <Target className="h-4 w-4" /> },
                        { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> }
                    ])}

                    {activeSubTab === 'scanner' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="md:col-span-1 flex flex-col gap-6">
                                <OpenVasScanButton onScanStarted={(data) => setRefreshKey(prev => prev + 1)} />
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
                            <div className="md:col-span-3 mt-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Bug className="h-5 w-5 text-cyber-neon" />
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

            {/* 3. THREAT CENTER */}
            {activeTab === 'threat-center' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'siem', label: 'SIEM Alerts', icon: <Activity className="h-4 w-4" /> },
                        { id: 'vulnerabilities', label: 'Vulnerabilities', icon: <Bug className="h-4 w-4" /> },
                        { id: 'network', label: 'Network Map', icon: <Network className="h-4 w-4" /> }
                    ])}

                    {activeSubTab === 'siem' && <div className="h-[600px]"><UnifiedInbox /></div>}
                    {activeSubTab === 'vulnerabilities' && <VulnerabilitiesPanel refresh={refreshKey} />}
                    {activeSubTab === 'network' && <NetworkTopology refresh={refreshKey} />}
                </div>
            )}

            {/* 4. AI BRAIN */}
            {activeTab === 'ai-brain' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'ai-console', label: 'Agent Console', icon: <Brain className="h-4 w-4" /> }
                    ])}

                    {activeSubTab === 'ai-console' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Brain className="h-6 w-6 text-purple-400" />
                                    <h3 className="text-xl font-bold text-white">AI Agent Activity</h3>
                                </div>
                                <select
                                    value={selectedScanId || ''}
                                    onChange={(e) => setSelectedScanId(e.target.value)}
                                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                >
                                    <option value="">Select a scan...</option>
                                </select>
                            </div>
                            <AgentLogViewer scanId={selectedScanId} />
                        </div>
                    )}
                </div>
            )}

            {/* 5. SYSTEM & REPORTS */}
            {activeTab === 'system' && (
                <div className="animate-fade-in">
                    {renderSubTabs([
                        { id: 'reports', label: 'PDF Reports', icon: <FileText className="h-4 w-4" /> },
                        { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }
                    ])}

                    {activeSubTab === 'reports' && <Reports refresh={refreshKey} />}

                    {activeSubTab === 'settings' && (
                        <div className="bg-cyber-light p-12 rounded-xl border border-gray-700 text-center">
                            <Settings className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">System Settings</h3>
                            <p className="text-gray-400">Configuration options for AI agents, Nuclei templates, and API keys.</p>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;

