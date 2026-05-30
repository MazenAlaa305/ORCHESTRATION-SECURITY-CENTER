import React, { useEffect, useState } from 'react';
import { openvasService, vulnerabilityService } from '../../services/api';
import { AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

const VulnerabilitiesList = ({ taskId, scanId }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedFull, setExpandedFull] = useState(null); // ID of expanded item

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                let data = [];
                if (taskId) {
                    const response = await openvasService.getScanResults(taskId);
                    data = response.data;
                } else if (scanId) {
                    const response = await vulnerabilityService.list({ scan_id: scanId });
                    data = response.data;
                } else {
                    // No scan selected — surface the 50 most recent open
                    // findings so the panel never looks empty on first load.
                    const response = await vulnerabilityService.list({ status: 'open', limit: 50 });
                    data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                }
                setResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch results", err);
                setError("Could not load results. Scan might be in progress.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [taskId, scanId]);

    const toggleExpand = (index) => {
        if (expandedFull === index) setExpandedFull(null);
        else setExpandedFull(index);
    };

    if (loading) return <div className="text-cyber-accent text-center p-10 animate-pulse">Loading Scan Results...</div>;
    if (error) return <div className="text-red-400 text-center p-10">{error}</div>;
    if (results.length === 0) {
        // Show a demo set of findings so the panel is never blank — clearly
        // labelled so analysts know it's not from a real scan.
        const demoFindings = [
            { name: 'SQL Injection in /api/login', host: '10.10.10.10', severity: 'CRITICAL', description: 'Unsanitised user input flows into a parameterised SQL query, allowing authentication bypass.', remediation: 'Use parameterised queries / prepared statements. Validate all input server-side.' },
            { name: 'Outdated nginx 1.18 (CVE-2021-23017)', host: '10.10.10.20', severity: 'HIGH', description: 'nginx resolver vulnerability allows memory disclosure via crafted DNS responses.', remediation: 'Upgrade nginx to 1.20.1 or newer.' },
            { name: 'Weak TLS Cipher Suites', host: '10.10.20.10', severity: 'MEDIUM', description: 'Server supports TLS 1.0 / 1.1 and weak cipher suites (RC4, 3DES).', remediation: 'Disable TLS 1.0/1.1 and remove weak ciphers from the server config.' },
            { name: 'Self-signed Certificate on api-02', host: '10.10.10.30', severity: 'MEDIUM', description: 'Internal API endpoint serves a self-signed certificate that fails browser trust validation.', remediation: 'Replace with a certificate issued by your internal CA or a public CA.' },
            { name: 'Verbose Server Header', host: '10.10.20.20', severity: 'LOW', description: 'HTTP response leaks server version, aiding fingerprinting by attackers.', remediation: 'Set `server_tokens off;` in nginx or equivalent in your stack.' },
        ];
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="glass-card p-3 flex items-center gap-2 border border-cyan-500/20 bg-cyan-500/5">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    <p className="text-cyan-300 text-xs">
                        <span className="font-bold">Sample findings</span> — kick off a scan to populate this panel with live results.
                    </p>
                </div>
                {demoFindings.map((vuln, index) => (
                    <div key={index} className="glass-card border-l-4 border-l-transparent hover:border-l-cyber-accent transition-all overflow-hidden">
                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(index)}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${vuln.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : vuln.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-500' : vuln.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{vuln.name}</h4>
                                    <p className="text-gray-400 text-xs">{vuln.host} • {vuln.severity}</p>
                                </div>
                            </div>
                            {expandedFull === index ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </div>
                        {expandedFull === index && (
                            <div className="px-4 pb-4 border-t border-white/5 bg-black/20">
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-cyber-neon text-xs uppercase font-bold mb-1">Description</h5>
                                        <p className="text-gray-300 text-sm leading-relaxed">{vuln.description}</p>
                                    </div>
                                    <div className="bg-red-500/5 p-3 rounded border border-red-500/10">
                                        <h5 className="text-red-400 text-xs uppercase font-bold mb-1">Remediation</h5>
                                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{vuln.remediation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {results.map((vuln, index) => (
                <div key={index} className="glass-card border-l-4 border-l-transparent hover:border-l-cyber-accent transition-all overflow-hidden">
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(index)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${vuln.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                                    vuln.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-500' :
                                        vuln.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' :
                                            'bg-blue-500/20 text-blue-500'
                                }`}>
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{vuln.name}</h4>
                                <p className="text-gray-400 text-xs">{vuln.host} • {vuln.severity}</p>
                            </div>
                        </div>
                        {expandedFull === index ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </div>

                    {expandedFull === index && (
                        <div className="px-4 pb-4 border-t border-white/5 bg-black/20">
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h5 className="text-cyber-neon text-xs uppercase font-bold mb-1">Description</h5>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {vuln.simplified_description || vuln.description
                                            || (vuln.type ? `A ${vuln.type} vulnerability was detected on ${vuln.url || vuln.host || 'the target system'}.` : null)
                                            || `Security finding on ${vuln.url || vuln.host || 'target'}. Severity: ${(vuln.severity || 'unknown').toUpperCase()}.`}
                                    </p>
                                    {vuln.simplified_description && vuln.description && (
                                        <div className="mt-2 bg-blue-500/10 p-2 rounded border border-blue-500/30">
                                            <p className="text-blue-200 text-xs italic">
                                                <span className="font-bold">AI Summary:</span> {vuln.simplified_description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-red-500/5 p-3 rounded border border-red-500/10">
                                    <h5 className="text-red-400 text-xs uppercase font-bold mb-1">Remediation</h5>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{vuln.remediation || "No specific remediation provided."}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default VulnerabilitiesList;
