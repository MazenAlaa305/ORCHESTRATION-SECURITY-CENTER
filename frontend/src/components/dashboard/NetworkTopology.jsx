import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Move } from 'lucide-react';
import AssetDetailPanel from './AssetDetailPanel';
import TopologyLegend from './TopologyLegend';
import { networkService } from '../../services/api';

// ─── Color resolver ───────────────────────────────────────
const getNodeColor = (node) => {
    if (node.id === 'hub')         return '#00ffff';
    if (node.riskScore >= 75)      return '#ff0055';
    if (node.riskScore >= 50)      return '#ff6a00';
    if (node.riskScore >= 20)      return '#ffaa00';
    if ((node.vulnCount || 0) > 0) return '#ffaa00';
    // Fallback: colour by criticality when no scan data yet
    const c = (node.criticality || '').toUpperCase();
    if (c === 'CRITICAL') return '#ff0055';
    if (c === 'HIGH')     return '#ff6a00';
    if (c === 'MEDIUM')   return '#ffaa00';
    return '#00ff88';
};

// ─── Device icon glyphs ───────────────────────────────────
const ICON_MAP = {
    gateway:  '⊕',
    server:   '▦',
    firewall: '⬡',
    desktop:  '▣',
    mobile:   '◈',
    router:   '⊞',
    database: '◉',
};

// ─── Component ────────────────────────────────────────────
const NetworkTopology = ({ refresh, compact = false }) => {
    const [graphData, setGraphData]     = useState({ nodes: [], links: [] });
    const [loading, setLoading]         = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const fgRef = useRef();

    useEffect(() => { fetchData(); }, [refresh]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: assets } = await networkService.getAssets();
            transformDataToGraph(assets);
        } catch (err) {
            console.error('Topology fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    const transformDataToGraph = (assets) => {
        const nodes = [];
        const links = [];

        // Hub fixed at centre
        nodes.push({ id:'hub', name:'Gateway Hub', group:'gateway', val:18, riskScore:0, fx:0, fy:0 });

        if (Array.isArray(assets)) {
            const count  = assets.length;
            const radius = 180;
            assets.forEach((asset, i) => {
                // Evenly spaced around a circle — same angle every load
                const angle = (2 * Math.PI * i) / count - Math.PI / 2;
                const fx    = Math.cos(angle) * radius;
                const fy    = Math.sin(angle) * radius;
                nodes.push({
                    id:          asset.id || asset.ip_address,
                    name:        asset.hostname || asset.ip_address,
                    ip:          asset.ip_address,
                    group:       determineGroup(asset),
                    vulnCount:   asset.vuln_count  || 0,
                    infoCount:   asset.info_count  || 0,
                    val:         10,
                    riskScore:   asset.risk_score  || 0,
                    criticality: asset.criticality || 'MEDIUM',
                    details:     asset,
                    fx, fy,   // pinned — never moves
                    x: fx, y: fy,
                });
                links.push({ source: 'hub', target: asset.id || asset.ip_address, value: 2 });
            });
        }
        setGraphData({ nodes, links });
    };

    const determineGroup = (asset) => {
        const type = (asset.device_type || '').toLowerCase();
        const os   = (asset.os_family || asset.os_name || '').toLowerCase();
        if (type.includes('server'))  return 'server';
        if (type.includes('router') || type.includes('gateway') || type.includes('wap')) return 'router';
        if (type.includes('phone')  || type.includes('mobile')) return 'mobile';
        if (type.includes('firewall'))  return 'firewall';
        if (type.includes('database') || type.includes('db'))  return 'database';
        if (os.includes('server')   || os.includes('linux') || os.includes('ubuntu') || os.includes('centos') || os.includes('debian'))  return 'server';
        if (os.includes('ios')      || os.includes('android'))return 'mobile';
        if (os.includes('cisco')    || os.includes('bsd') || os.includes('junos') || os.includes('mikrotik'))    return 'router';
        if (os.includes('postgres') || os.includes('mysql') || os.includes('mongo') || os.includes('redis')) return 'database';
        return 'desktop';
    };

    const handleNodeClick = useCallback(async (node) => {
        if (node.id === 'hub') { setSelectedNode(node); return; }
        // Immediately show the node with basic info, then enrich asynchronously
        setSelectedNode(node);
        if (node.id && typeof node.id === 'number') {
            try {
                const { data: detail } = await networkService.getAssetDetail(node.id);
                setSelectedNode(prev =>
                    prev && prev.id === node.id
                        ? { ...prev, details: detail, vulnCount: detail.vuln_count || 0, infoCount: detail.info_count || 0 }
                        : prev
                );
            } catch (err) {
                console.warn('Asset detail fetch failed', err);
            }
        }
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 800);
            fgRef.current.zoom(3.5, 1000);
        }
    }, []);

    // ─── Canvas node renderer — circle style ──────────────
    const drawNode = useCallback((node, ctx, globalScale) => {
        if (node.x === undefined || node.y === undefined) return;

        const color  = getNodeColor(node);
        const radius = (node.val || 10) * 0.9;
        const isHub  = node.id === 'hub';
        const isRisk = node.riskScore > 50;
        const isCrit = node.riskScore > 75;
        const t      = Date.now() / 800;

        // 1. Glow shadow
        ctx.shadowColor = color;
        ctx.shadowBlur  = isCrit ? 32 : isRisk ? 22 : isHub ? 20 : 12;

        if (isHub) {
            // ── Hub: large circle with two concentric rings + pulsing core ──
            // Outer decorative ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.6, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}22`;
            ctx.lineWidth   = 1.5 / globalScale;
            ctx.stroke();

            // Mid ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.2, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}40`;
            ctx.lineWidth   = 1 / globalScale;
            ctx.stroke();

            // Main filled circle
            const bg = ctx.createRadialGradient(node.x, node.y - radius * 0.3, 0, node.x, node.y, radius);
            bg.addColorStop(0, 'rgba(0,45,55,0.98)');
            bg.addColorStop(1, 'rgba(0,20,28,0.99)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle   = bg;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = 2.5 / globalScale;
            ctx.stroke();

            // Pulsing inner ring
            const pulse = (Math.sin(t * 1.8) + 1) / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * (0.48 + pulse * 0.08), 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}${Math.floor((0.35 + pulse * 0.45) * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth   = 1.5 / globalScale;
            ctx.stroke();

            // Solid center dot
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 0.22, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

        } else {
            // ── Regular node: circle with optional pulse ring ──

            // Pulsing danger ring for risky nodes
            if (isRisk) {
                const pulse = (Math.sin(t) + 1) / 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius * (1.3 + pulse * 0.3), 0, 2 * Math.PI);
                const alpha = isCrit ? (0.25 + pulse * 0.3) : (0.1 + pulse * 0.2);
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth   = (isCrit ? 2 : 1.5) / globalScale;
                ctx.stroke();
            }

            // Main filled circle
            const bg = ctx.createRadialGradient(node.x, node.y - radius * 0.25, 0, node.x, node.y, radius);
            bg.addColorStop(0, 'rgba(20,32,44,0.95)');
            bg.addColorStop(1, 'rgba(8,14,22,0.98)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle   = bg;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = (isCrit ? 2.5 : isRisk ? 2 : 1.8) / globalScale;
            ctx.stroke();

            // Thin inner highlight arc (top-left quarter)
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 0.75, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.strokeStyle = `${color}30`;
            ctx.lineWidth   = 1.5 / globalScale;
            ctx.stroke();

            // Icon glyph
            const icon = ICON_MAP[node.group] || ICON_MAP.desktop;
            ctx.shadowBlur    = 0;
            ctx.font          = `bold ${radius * 0.9}px JetBrains Mono`;
            ctx.fillStyle     = color;
            ctx.globalAlpha   = isRisk ? 1 : 0.88;
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillText(icon, node.x, node.y);
            ctx.globalAlpha   = 1;
        }

        ctx.shadowBlur = 0;

        // 2. Label — always visible (small), brighter when selected/zoomed
        const label    = node.name || '';
        const fontSize = Math.max(8, 9 / globalScale);
        ctx.font          = `600 ${fontSize}px Outfit, sans-serif`;
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'top';

        const textW  = ctx.measureText(label).width + 10;
        const labelY = node.y + radius + 6 / globalScale;

        // Pill background
        ctx.fillStyle   = 'rgba(2,9,15,0.82)';
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth   = 0.7 / globalScale;
        ctx.beginPath();
        ctx.roundRect(node.x - textW / 2, labelY - 2 / globalScale, textW, fontSize + 4 / globalScale, 4 / globalScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = selectedNode?.id === node.id ? '#ffffff' : 'rgba(255,255,255,0.72)';
        ctx.fillText(label, node.x, labelY);
    }, [selectedNode]);

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-full min-h-[450px] glass-card border-dashed">
            <div className="w-10 h-10 border-2 border-transparent border-t-cyan-400 rounded-full animate-spin mb-4" />
            <span className="text-[10px] font-black text-cyan-400/60 animate-pulse tracking-[0.3em] uppercase">
                Mapping Neural Network...
            </span>
        </div>
    );

    return (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 animate-fade-in w-full h-full`}>

            {/* Graph Container */}
            <div className={`${compact ? 'lg:col-span-1' : 'lg:col-span-2'} relative overflow-hidden glass-card p-0`} style={{ minHeight: compact ? 300 : 420 }}>
                {/* Title Bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5"
                     style={{ borderBottom: '1px solid rgba(0,255,255,0.06)', background:'rgba(2,9,15,0.6)', backdropFilter:'blur(10px)' }}>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow:'0 0 6px #00ffff' }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Live Network Topology</span>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 300)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                            title="Zoom In">
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.4, 300)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                            title="Zoom Out">
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => fgRef.current?.zoomToFit(400, 48)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                            title="Fit All / Center">
                            <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={fetchData}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                            title="Refresh">
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Floating Legend */}
                <div className="absolute top-12 left-4 z-20">
                    <TopologyLegend />
                </div>

                {/* Scan-line overlay */}
                <div className="scanline-overlay" style={{ top: 44 }} />

                {/* Graph */}
                <div className="w-full h-full" style={{ marginTop: 44 }}>
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        backgroundColor="#0c1c25"
                        nodeCanvasObject={drawNode}
                        nodeCanvasObjectMode={() => 'replace'}
                        nodeLabel={(node) => {
                            if (node.id === 'hub') return `
                                <div style="padding:10px;background:rgba(2,9,15,0.95);border:1px solid rgba(0,255,255,0.2);border-radius:10px;font-family:Outfit,sans-serif">
                                    <div style="font-size:11px;font-weight:800;color:#00ffff;text-transform:uppercase;letter-spacing:.08em">Gateway Hub</div>
                                    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px">Central network node</div>
                                </div>`;

                            // Derive effective risk from riskScore OR criticality
                            const crit = (node.criticality || '').toUpperCase();
                            const critRisk = crit === 'CRITICAL' ? 90 : crit === 'HIGH' ? 70 : crit === 'MEDIUM' ? 40 : crit === 'LOW' ? 15 : 0;
                            const effectiveRisk = node.riskScore > 0 ? node.riskScore : critRisk;
                            const label       = effectiveRisk >= 75 ? 'CRITICAL' : effectiveRisk >= 50 ? 'HIGH' : effectiveRisk >= 20 ? 'MEDIUM' : effectiveRisk > 0 ? 'LOW' : 'NONE';
                            const riskColor   = effectiveRisk >= 75 ? '#ff0055' : effectiveRisk >= 50 ? '#ff6a00' : effectiveRisk >= 20 ? '#ffaa00' : effectiveRisk > 0 ? '#00ccff' : '#00ff88';
                            const vulns     = node.vulnCount || 0;
                            const infoVulns = node.infoCount || 0;

                            const riskBar = `
                                <div style="margin-top:2px;height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden">
                                    <div style="height:100%;width:${effectiveRisk}%;background:${riskColor};border-radius:2px;transition:width .4s"></div>
                                </div>`;

                            const vulnLine = vulns > 0
                                ? `<div style="margin-top:8px;font-size:10px;color:${riskColor}">⚠ ${vulns} vulnerabilit${vulns === 1 ? 'y' : 'ies'} detected</div>`
                                : '';
                            const infoLine = infoVulns > 0
                                ? `<div style="margin-top:${vulns > 0 ? 4 : 8}px;font-size:10px;color:#666">ℹ ${infoVulns} info finding${infoVulns === 1 ? '' : 's'}</div>`
                                : '';

                            return `
                            <div style="padding:12px;background:rgba(2,9,15,0.97);border:1px solid ${riskColor}44;border-radius:10px;font-family:Outfit,sans-serif;min-width:200px">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                                    <div style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.06em">${node.name}</div>
                                    <div style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${riskColor}22;border:1px solid ${riskColor}66;color:${riskColor}">${label}</div>
                                </div>
                                <div style="font-size:10px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;margin-bottom:8px">${node.ip || 'INTERNAL'}</div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                                    <span style="font-size:10px;color:rgba(255,255,255,0.5)">Risk Score</span>
                                    <span style="font-size:11px;font-weight:800;color:${riskColor}">${effectiveRisk}%</span>
                                </div>
                                ${riskBar}
                                ${vulnLine}${infoLine}
                            </div>`;
                        }}
                        linkColor={() => 'rgba(0,255,255,0.18)'}
                        linkWidth={1.2}
                        linkDirectionalParticles={3}
                        linkDirectionalParticleWidth={2}
                        linkDirectionalParticleColor={(link) => {
                            const r = link.target?.riskScore || 0;
                            return r > 75 ? '#ff0055' : r > 50 ? '#ffaa00' : '#00ffff';
                        }}
                        linkDirectionalParticleSpeed={0.005}
                        d3AlphaDecay={0.018}
                        d3VelocityDecay={0.32}
                        cooldownTicks={1}
                        onEngineStop={() => setTimeout(() => fgRef.current?.zoomToFit(300, 60), 100)}
                        onNodeClick={handleNodeClick}
                    />
                </div>
            </div>

            {/* Details Panel */}
            {!compact && (
                <div className={`transition-all duration-500 ${selectedNode && selectedNode.id !== 'hub' ? 'col-span-1 opacity-100' : 'hidden lg:block opacity-20 pointer-events-none'}`}>
                    {selectedNode && selectedNode.id !== 'hub' ? (
                        <AssetDetailPanel
                            node={selectedNode}
                            onClose={() => { setSelectedNode(null); fgRef.current?.zoomToFit(600); }}
                        />
                    ) : (
                        <div className="h-full glass-card flex flex-col justify-center items-center text-center p-8 border-dashed group">
                            <div className="p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500"
                                 style={{ background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.08)' }}>
                                <Move className="h-8 w-8" style={{ color:'rgba(0,255,255,0.3)' }} />
                            </div>
                            <h3 className="text-white font-black text-base uppercase tracking-tight mb-3">
                                Infrastructure Insight
                            </h3>
                            <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
                                Click any <span style={{ color:'#00ffff' }}>node</span> on the topology map to view deep packet inspection and AI-generated risk analysis.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NetworkTopology;
