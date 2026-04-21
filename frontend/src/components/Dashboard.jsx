import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, Tooltip, Legend,
    PieChart, Pie, Cell,
} from 'recharts';
import NetworkTopology from './NetworkTopology';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import TabNavigation from './TabNavigation';
import MetricCard from './MetricCard';
import ReportGenerator from './ReportGenerator';
import '../gradient-styles.css';

const Dashboard = () => {
    return (
        <ErrorBoundary>
            <DashboardContent />
        </ErrorBoundary>
    );
};

const DashboardContent = () => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanTarget, setScanTarget] = useState('127.0.0.1');
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [externalRisk, setExternalRisk] = useState(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'network', label: 'Network', icon: '🌐' },
        { id: 'devices', label: 'Devices', icon: '💻' },
        { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '⚠️' },
        { id: 'reports', label: 'Reports', icon: '📄' }
    ];

    useEffect(() => {
        fetchData();
        fetchExternalRisk();
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
            setError(error);
            setLoading(false);
        }
    };

    const fetchExternalRisk = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/external-risk', {
                params: { ip: scanTarget },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setExternalRisk(response.data);
        } catch (error) {
            console.error("Error fetching external risk", error);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        try {
            await axios.post('http://localhost:5000/api/scan',
                { target: scanTarget },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            alert(`Scan started for ${scanTarget}`);
            setTimeout(fetchData, 2000);
        } catch (error) {
            console.error("Scan failed", error);
            alert("Failed to start scan");
        } finally {
            setScanning(false);
        }
    };

    const handleSchedule = async () => {
        try {
            await axios.post('http://localhost:5000/api/schedule',
                { target: scanTarget, interval_hours: 24 },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            alert(`Schedule saved: Scan ${scanTarget} every 24 hours`);
        } catch (error) {
            console.error("Schedule failed", error);
            alert("Failed to save schedule");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#00f2ff] font-mono">
            Loading system...
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 font-mono p-4">
            <h2 className="text-xl mb-4">System Error</h2>
            <button
                onClick={() => window.location.reload()}
                className="mt-6 px-4 py-2 bg-red-900/30 border border-red-500 hover:bg-red-900/50 rounded text-white"
            >
                Retry Connection
            </button>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ffcc00] font-mono">
            Initializing Dashboard...
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-[#bf00ff] to-[#00f2ff] bg-clip-text text-transparent">
                        SME Cyber Exposure Dashboard
                    </span>
                </h1>
                <p className="text-gray-400 text-sm">Real-time security monitoring and threat assessment</p>
            </div>

            {/* Tab Navigation */}
            <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={tabs}
            />

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <OverviewTab
                        data={data}
                        externalRisk={externalRisk}
                    />
                )}

                {activeTab === 'network' && (
                    <NetworkTab
                        scanTarget={scanTarget}
                        setScanTarget={setScanTarget}
                        handleScan={handleScan}
                        scanning={scanning}
                    />
                )}

                {activeTab === 'devices' && (
                    <DevicesTab data={data} />
                )}

                {activeTab === 'vulnerabilities' && (
                    <VulnerabilitiesTab data={data} />
                )}

                {activeTab === 'reports' && (
                    <ReportsTab handleSchedule={handleSchedule} />
                )}
            </div>
        </div>
    );
};

// ============================================
// OVERVIEW TAB
// ============================================
const OverviewTab = ({ data, externalRisk }) => {
    return (
        <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="Risk Score"
                    value={data.risk_score || 0}
                    gradient="purple"
                    icon="⚠️"
                />

                <MetricCard
                    label="Total Assets"
                    value={data.total_assets || 0}
                    gradient="cyan"
                    icon="💻"
                />

                <MetricCard
                    label="Vulnerabilities"
                    value={data.total_risks || 0}
                    gradient="purple"
                    icon="🔓"
                />

                <MetricCard
                    label="Compliance"
                    value={data.compliance_percentage || 100}
                    unit="%"
                    gradient="cyan"
                    icon="✓"
                />
            </div>

            {/* External Exposure Card */}
            {externalRisk && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4 text-[#00f2ff]">External Exposure</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-400 text-sm">Status</p>
                            <p className={`font-bold text-lg ${externalRisk.exposed ? 'text-red-400' : 'text-green-400'}`}>
                                {externalRisk.exposed ? 'EXPOSED' : 'SECURE'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Open Ports</p>
                            <p className="font-bold text-lg text-white">
                                {externalRisk.ports?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Risk Trend Chart */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-[#bf00ff]">Risk Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trend || []}>
                            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                            <YAxis tick={{ fill: '#9ca3af' }} />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#fff' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                name="Risk Score"
                                stroke="#bf00ff"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// ============================================
// NETWORK TAB
// ============================================
const NetworkTab = ({ scanTarget, setScanTarget, handleScan, scanning }) => {
    return (
        <div className="space-y-6">
            {/* Scan Control */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-[#00f2ff]">Network Scan</h3>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={scanTarget}
                        onChange={(e) => setScanTarget(e.target.value)}
                        placeholder="Enter IP or range (e.g., 192.168.1.0/24)"
                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-[#bf00ff] text-white"
                    />
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="px-8 py-3 bg-gradient-to-r from-[#bf00ff] to-[#00f2ff] hover:opacity-90 disabled:opacity-50 rounded-lg font-semibold transition-all"
                    >
                        {scanning ? 'SCANNING...' : 'SCAN'}
                    </button>
                </div>
            </div>

            {/* Network Topology */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                <NetworkTopology />
            </div>
        </div>
    );
};

// ============================================
// DEVICES TAB
// ============================================
const DevicesTab = ({ data }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#bf00ff]">Asset Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    label="Total Devices"
                    value={data.total_assets || 0}
                    gradient="purple"
                />
                <MetricCard
                    label="Active Now"
                    value={data.total_assets || 0}
                    gradient="cyan"
                />
                <MetricCard
                    label="Offline"
                    value={0}
                    gradient="red"
                />
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Device List</h3>
                <p className="text-gray-400">Device inventory will be displayed here after scanning</p>
            </div>
        </div>
    );
};

// ============================================
// VULNERABILITIES TAB
// ============================================
const VulnerabilitiesTab = ({ data }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#ff0055]">Vulnerability Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    label="Critical"
                    value={12}
                    gradient="red"
                />
                <MetricCard
                    label="High"
                    value={19}
                    gradient="yellow"
                />
                <MetricCard
                    label="Medium"
                    value={3}
                    gradient="yellow"
                />
                <MetricCard
                    label="Low"
                    value={5}
                    gradient="cyan"
                />
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Severity Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width={280} height={240}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Critical', value: 12 },
                                    { name: 'High',     value: 19 },
                                    { name: 'Medium',   value: 3  },
                                    { name: 'Low',      value: 5  },
                                ]}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={85}
                                dataKey="value"
                            >
                                {['#ff0055','#ff6600','#ffcc00','#00f2ff'].map((color, i) => (
                                    <Cell key={i} fill={color} />
                                ))}
                            </Pie>
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => (
                                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
                                )}
                            />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// ============================================
// REPORTS TAB
// ============================================
const ReportsTab = ({ handleSchedule }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#00f2ff]">Reports & Automation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4">Generate Report</h3>
                    <p className="text-gray-400 mb-4">Create a comprehensive security assessment report</p>
                    <ReportGenerator />
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4">Schedule Scans</h3>
                    <p className="text-gray-400 mb-4">Automate security assessments</p>
                    <button
                        onClick={handleSchedule}
                        className="px-6 py-3 bg-gradient-to-r from-[#bf00ff] to-[#00f2ff] hover:opacity-90 rounded-lg font-semibold w-full"
                    >
                        Schedule Daily Scan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
