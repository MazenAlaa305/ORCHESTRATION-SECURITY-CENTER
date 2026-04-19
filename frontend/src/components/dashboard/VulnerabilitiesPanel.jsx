import React, { useState, useEffect } from 'react';
import { Bug, AlertTriangle, Shield, CheckCircle, XCircle, ExternalLink, Code, Loader2, Filter, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { vulnerabilityService } from '../../services/api';
import IncidentDetailDrawer from './IncidentDetailDrawer';

const SEV_BORDER = {
    critical: 'border-l-red-500 shadow-[inset_3px_0_0_rgba(239,68,68,0.5)]',
    high:     'border-l-orange-500 shadow-[inset_3px_0_0_rgba(249,115,22,0.5)]',
    medium:   'border-l-yellow-500 shadow-[inset_3px_0_0_rgba(234,179,8,0.5)]',
    low:      'border-l-blue-400 shadow-[inset_3px_0_0_rgba(96,165,250,0.5)]',
    info:     'border-l-gray-500',
};

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_COLORS_BAR = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-400',
    low: 'bg-blue-400',
    info: 'bg-gray-500',
};

/**
 * VulnerabilitiesPanel Component
 * Display and manage discovered vulnerabilities
 */
const VulnerabilitiesPanel = ({ scanId = null, refresh = 0 }) => {
    const [vulnerabilities, setVulnerabilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVuln, setSelectedVuln] = useState(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [filter, setFilter] = useState({ severity: '', status: '' });
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('severity');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        fetchVulnerabilities();
    }, [scanId, refresh, filter]);

    const fetchVulnerabilities = async () => {
        try {
            const params = { ...filter };
            if (scanId) params.scan_id = scanId;
            const response = await vulnerabilityService.list(params);
            setVulnerabilities(response.data || []);
        } catch (error) {
            console.error('Failed to fetch vulnerabilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDrawer = (vuln) => {
        setSelectedVuln(vuln);
        setShowDrawer(true);
    };

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open': return <AlertTriangle className="h-4 w-4 text-red-400" />;
            case 'fixed': return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'false_positive': return <XCircle className="h-4 w-4 text-gray-400" />;
            default: return <Bug className="h-4 w-4 text-yellow-400" />;
        }
    };

    const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

    const displayed = vulnerabilities
        .filter(v => {
            if (search) {
                const q = search.toLowerCase();
                return (v.type || '').toLowerCase().includes(q) || (v.url || '').toLowerCase().includes(q) || (v.cve_id || '').toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            let av, bv;
            if (sortField === 'severity') { av = SEV_RANK[(a.severity||'info').toLowerCase()] || 0; bv = SEV_RANK[(b.severity||'info').toLowerCase()] || 0; }
            else if (sortField === 'confidence') { av = a.confidence_score || 0; bv = b.confidence_score || 0; }
            else { av = a.type || ''; bv = b.type || ''; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
            return sortDir === 'asc' ? av - bv : bv - av;
        });

    if (loading) {
        return (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-cyber-neon animate-spin" />
                <span className="text-[10px] font-black text-cyber-neon/60 animate-pulse tracking-[0.3em] uppercase">Decrypting Vulnerability Data...</span>
            </div>
        );
    }

    // Build severity counts
    const sevCounts = {};
    vulnerabilities.forEach(v => {
        const s = (v.severity || 'info').toLowerCase();
        sevCounts[s] = (sevCounts[s] || 0) + 1;
    });
    const total = vulnerabilities.length || 1;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Severity Summary Bar */}
            {vulnerabilities.length > 0 && (
                <div className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Severity Distribution</span>
                        <span className="text-[10px] font-mono text-gray-600">{vulnerabilities.length} total</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {SEV_ORDER.map(sev => {
                            const pct = ((sevCounts[sev] || 0) / total) * 100;
                            if (pct === 0) return null;
                            return (
                                <div key={sev} className={`h-full ${SEV_COLORS_BAR[sev]} transition-all duration-700`}
                                    style={{ width: `${pct}%` }} title={`${sev}: ${sevCounts[sev] || 0}`} />
                            );
                        })}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {SEV_ORDER.filter(s => sevCounts[s]).map(sev => (
                            <div key={sev} className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${SEV_COLORS_BAR[sev]}`} />
                                <span className="text-[10px] font-mono text-gray-500 capitalize">{sev} ({sevCounts[sev]})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Filters + Search */}
            <div className="flex gap-3 items-center flex-wrap">
                <Filter className="h-4 w-4 text-gray-500 shrink-0" />
                {/* Search */}
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-cyber-accent/40 transition-all">
                    <Search className="h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search CVE, type, URL..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none placeholder:text-gray-600 w-40 font-mono"
                    />
                </div>
                <select
                    value={filter.severity}
                    onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyber-accent/40 transition-colors"
                >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyber-accent/40 transition-colors"
                >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="fixed">Fixed</option>
                    <option value="false_positive">False Positive</option>
                </select>
                {/* Sort buttons */}
                <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Sort:</span>
                    {['severity','confidence','type'].map(f => (
                        <button key={f} onClick={() => toggleSort(f)}
                            className={`flex items-center gap-0.5 px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${
                                sortField === f ? 'text-cyber-accent bg-cyber-accent/10' : 'text-gray-600 hover:text-white'
                            }`}
                        >
                            {f} <SortIcon field={f} />
                        </button>
                    ))}
                </div>
                <span className="text-gray-600 text-xs font-mono">
                    {displayed.length}/{vulnerabilities.length} findings
                </span>
            </div>

            {/* Vulnerabilities List */}
            <div className="space-y-3">
                {displayed.map((vuln) => {
                    const sevKey = (vuln.severity || 'info').toLowerCase();
                    const cveId = vuln.cve_id || vuln.type?.match(/CVE-\d{4}-\d+/)?.[0];
                    return (
                    <div
                        key={vuln.id}
                        onClick={() => handleOpenDrawer(vuln)}
                        className={`glass-card-interactive p-5 relative group border-l-4 ${SEV_BORDER[sevKey] || 'border-l-gray-700'} cursor-pointer`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Severity Badge */}
                            <div className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider shrink-0 ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity?.toUpperCase() || 'INFO'}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {getStatusIcon(vuln.status)}
                                    <h4 className="text-white font-semibold truncate">
                                        {vuln.title || vuln.type || (vuln.host ? `${vuln.type || 'Issue'} — ${vuln.host}${vuln.port ? ':' + vuln.port : ''}` : 'Unknown Vulnerability')}
                                    </h4>
                                    {cveId && (
                                        <a
                                            href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] text-cyber-accent/70 hover:text-cyber-accent border border-cyber-accent/20 hover:border-cyber-accent/40 rounded px-1.5 py-0.5 transition-colors font-mono"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {cveId} <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-gray-500 text-xs truncate mb-2 font-mono">
                                    {vuln.url}
                                </p>
                                {vuln.description && (
                                    <p className="text-gray-500 text-sm line-clamp-2">
                                        {vuln.description}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center gap-4 flex-wrap">
                                    {vuln.cvss_score != null && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">CVSS</span>
                                            <span className={`text-[11px] font-mono font-black ${vuln.cvss_score >= 9 ? 'text-red-400' : vuln.cvss_score >= 7 ? 'text-orange-400' : vuln.cvss_score >= 4 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                {vuln.cvss_score.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                    {vuln.confidence_score != null && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Confidence</span>
                                            <div className="w-[80px] h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyber-neon to-cyber-vibrant shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                                    style={{ width: `${vuln.confidence_score * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-cyber-neon text-[10px] font-mono font-bold">
                                                {(vuln.confidence_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    )}
                                    {vuln.detected_by && (
                                        <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold uppercase">
                                            {vuln.detected_by}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick actions - stop event propagation so card onclick doesn't fire */}
                            <div className="flex flex-col gap-2 border-l border-gray-700 pl-4 ml-4 min-w-[140px]" onClick={e => e.stopPropagation()}>
                                <select
                                    value={vuln.status}
                                    onChange={(e) => {
                                        vulnerabilityService.updateWorkflow(vuln.id, { status: e.target.value });
                                        fetchVulnerabilities();
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white w-full"
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="false_positive">False Positive</option>
                                </select>
                                <button
                                    onClick={() => handleOpenDrawer(vuln)}
                                    className="flex items-center gap-2 justify-center p-2 text-xs bg-cyber-accent/10 border border-cyber-accent/25 hover:bg-cyber-accent/20 rounded-lg text-cyber-accent font-bold transition-all"
                                >
                                    <Code className="h-3 w-3" />
                                    Deep Dive
                                </button>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {vulnerabilities.length === 0 && (
                <div className="bg-cyber-light p-12 rounded-xl border border-gray-700 text-center">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-400">No vulnerabilities found matching your criteria.</p>
                </div>
            )}

            {/* Full Incident Detail Drawer */}
            {showDrawer && selectedVuln && (
                <IncidentDetailDrawer
                    vuln={selectedVuln}
                    onClose={() => { setShowDrawer(false); setSelectedVuln(null); }}
                />
            )}
        </div>
    );
};

export default VulnerabilitiesPanel;
