import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, ExternalLink, Shield, Globe, Search, CheckCircle, Loader2 } from 'lucide-react';
import { targetService, pentesterService } from '../../services/api';
import EnvironmentWizard from './EnvironmentWizard';

const TargetsManager = ({ onScanStarted }) => {
    const [activeTab, setActiveTab] = useState('list'); // list, discover
    const [showWizard, setShowWizard] = useState(false);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(null);

    // Discovery
    const [discoveryDomain, setDiscoveryDomain] = useState('');
    const [discoveryResult, setDiscoveryResult] = useState(null);
    const [discovering, setDiscovering] = useState(false);

    useEffect(() => {
        fetchTargets();
    }, []);

    const fetchTargets = async () => {
        try {
            const response = await targetService.list();
            setTargets(response.data || []);
        } catch (error) {
            console.error('Failed to fetch targets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscover = async (e) => {
        e.preventDefault();
        setDiscovering(true);
        try {
            const response = await targetService.discover(discoveryDomain);
            setDiscoveryResult(response.data);
            fetchTargets();
        } catch (error) {
            console.error('Discovery failed:', error);
        } finally {
            setDiscovering(false);
        }
    };

    const handleDeleteTarget = async (id) => {
        if (!window.confirm('Delete this target and all associated data?')) return;
        try {
            await targetService.delete(id);
            fetchTargets();
        } catch (error) {
            console.error('Failed to delete target:', error);
        }
    };

    const handleStartAIScan = async (targetId) => {
        setScanning(targetId);
        try {
            await pentesterService.startAIScan(targetId);
            onScanStarted?.();
        } catch (error) {
            console.error('Failed to start AI scan:', error);
        } finally {
            setScanning(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-cyber-light p-8 rounded-xl border border-gray-700 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
                <p className="text-gray-400 mt-4 animate-pulse">Loading Targets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-cyan-400" />
                    <h3 className="text-xl font-bold text-white">Scan Targets</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab(activeTab === 'discover' ? 'list' : 'discover')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'discover' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
                    >
                        <Globe className="h-4 w-4" />
                        Asset Discovery
                    </button>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-cyan-500 hover:bg-cyan-600 text-white"
                    >
                        <Plus className="h-4 w-4" />
                        Add Target
                    </button>
                </div>
            </div>

            {/* Discovery View */}
            {activeTab === 'discover' && (
                <div className="bg-cyber-light p-6 rounded-xl border border-gray-700 animate-fade-in">
                    <h4 className="text-lg font-semibold text-white mb-2">Automated Asset Discovery</h4>
                    <p className="text-gray-400 text-sm mb-4">Enter a root domain to automatically find subdomains and add them as targets using Subfinder.</p>

                    <form onSubmit={handleDiscover} className="flex gap-2">
                        <input
                            type="text"
                            value={discoveryDomain}
                            onChange={(e) => setDiscoveryDomain(e.target.value)}
                            placeholder="example.com"
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                            required
                        />
                        <button
                            type="submit"
                            disabled={discovering}
                            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                        >
                            {discovering ? (
                                <Loader2 className="h-5 w-5 animate-spin text-white" />
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    <span>Start Discovery</span>
                                </>
                            )}
                        </button>
                    </form>

                    {discoveryResult && (
                        <div className="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-semibold">Discovery Complete!</span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-300">
                                <p>Found <span className="text-white font-bold">{discoveryResult.total_found}</span> subdomains.</p>
                                <p>Created <span className="text-white font-bold">{discoveryResult.new_targets_created}</span> new targets.</p>
                            </div>
                            {discoveryResult.new_targets?.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs uppercase text-gray-500 font-bold mb-2">New Targets Added:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveryResult.new_targets.map(t => (
                                            <span key={t} className="px-2 py-1 bg-gray-800 rounded text-xs text-cyan-400 border border-gray-700">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <EnvironmentWizard
                open={showWizard}
                onClose={() => setShowWizard(false)}
                onCreated={() => { fetchTargets(); setShowWizard(false); }}
            />

            {/* Targets List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.map((target) => (
                    <div
                        key={target.id}
                        className="bg-cyber-light p-5 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-colors relative overflow-hidden"
                    >
                        {/* Source Badge */}
                        {target.source === 'discovery' && (
                            <div className="absolute top-0 right-0 p-1 bg-purple-900/50 rounded-bl-lg border-b border-l border-purple-800">
                                <Globe className="h-3 w-3 text-purple-400" />
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-3">
                            <h4 className="text-lg font-semibold text-white">{target.name}</h4>
                            <button
                                onClick={() => handleDeleteTarget(target.id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <a
                            href={target.base_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 mb-3"
                        >
                            {target.base_url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        {/* Metadata row */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            {target.environment_type && (
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    target.environment_type === 'production' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                    target.environment_type === 'staging' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                    target.environment_type === 'lab' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                }`}>
                                    {target.environment_type}
                                </span>
                            )}
                            {target.asset_value && target.asset_value !== 'MEDIUM' && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/30">
                                    {target.asset_value}
                                </span>
                            )}
                            {target.compliance_tags?.map(tag => (
                                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-500 text-xs">
                                    {target.tech_stack ? Object.values(target.tech_stack).join(', ') : 'Unknown stack'}
                                </span>
                                {target.last_scanned_at && (
                                    <span className="text-[10px] text-gray-600 font-mono">
                                        Last scan: {new Date(target.last_scanned_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleStartAIScan(target.id)}
                                disabled={scanning === target.id}
                                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white rounded-lg text-sm disabled:opacity-50 min-w-[100px] justify-center"
                            >
                                {scanning === target.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <Shield className="h-4 w-4" />
                                        <span>AI Scan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {targets.length === 0 && activeTab === 'list' && (
                <div className="bg-cyber-light p-12 rounded-xl border border-gray-700 text-center">
                    <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No targets configured. Add a target or use Discovery to find assets.</p>
                </div>
            )}
        </div>
    );
};

export default TargetsManager;
