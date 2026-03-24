import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, RefreshCw, Move } from 'lucide-react';
import AssetDetailPanel from './AssetDetailPanel';
import TopologyLegend from './TopologyLegend';
import { networkService } from '../../services/api';

// ─── Color resolver ───────────────────────────────────────
const getNodeColor = (node) => {
    if (node.id === 'hub')         return '#00ffff';
    if (node.riskScore >= 75)      return '#ff0055';
    if (node.riskScore >= 50)      return '#ffaa00';
    if (node.riskScore >= 20)      return '#ffaa00';
    if ((node.vulnCount || 0) > 0) return '#ffaa00';
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

// ─── Rounded rectangle path helper ───────────────────────
function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x - w + r, y - h);
    ctx.arcTo(x + w, y - h, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x - w, y + h, r);
    ctx.arcTo(x - w, y + h, x - w, y - h, r);
    ctx.arcTo(x - w, y - h, x + w, y - h, r);
    ctx.closePath();
}

// ─── Component ────────────────────────────────────────────
const NetworkTopology = ({ refresh }) => {
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
        setGraphData(prev => {
            const oldNodes = new Map((prev.nodes || []).map(n => [n.id, n]));
            const nodes  = [];
            const links  = [];

            const createNode = (data) => {
                const old = oldNodes.get(data.id);
                return old
                    ? { ...old, ...data, x: old.x, y: old.y, vx: old.vx, vy: old.vy, fx: old.fx, fy: old.fy }
                    : data;
            };

            // Central hub
            nodes.push(createNode({ id:'hub', name:'Gateway Hub', group:'gateway', val:18, riskScore:0 }));

            if (Array.isArray(assets)) {
                assets.forEach(asset => {
                    const vulns = Math.floor((asset.risk_score || 0) / 10);
                    nodes.push(createNode({
                        id:         asset.id || asset.ip_address,
                        name:       asset.hostname || asset.ip_address,
                        ip:         asset.ip_address,
                        group:      determineGroup(asset),
                        vulnCount:  vulns,
                        val:        10 + ((asset.risk_score || 0) / 5),
                        riskScore:  asset.risk_score || 0,
                        criticality:asset.criticality || 'MEDIUM',
                        details:    asset,
                    }));
                    links.push({ source: 'hub', target: asset.id || asset.ip_address, value: 2 });
                });
            }
            return { nodes, links };
        });
    };

    const determineGroup = (asset) => {
        const type = (asset.device_type || '').toLowerCase();
        const os   = (asset.os_family   || '').toLowerCase();
        if (type.includes('server'))  return 'server';
        if (type.includes('router') || type.includes('gateway') || type.includes('wap')) return 'router';
        if (type.includes('phone')  || type.includes('mobile')) return 'mobile';
        if (os.includes('server')   || os.includes('linux'))  return 'server';
        if (os.includes('ios')      || os.includes('android'))return 'mobile';
        if (os.includes('cisco')    || os.includes('bsd'))    return 'router';
        return 'desktop';
    };

    const handleNodeClick = useCallback((node) => {
        setSelectedNode(node);
        if (fgRef.current) {
            const dist = 50;
            const ratio = 1 + dist / Math.hypot(node.x || 1, node.y || 1);
            fgRef.current.centerAt(node.x * ratio, node.y * ratio, 1000);
            fgRef.current.zoom(3.5, 1200);
        }
    }, []);

    // ─── Canvas node renderer ─────────────────────────────
    const drawNode = useCallback((node, ctx, globalScale) => {
        if (node.x === undefined || node.y === undefined) return;

        const color  = getNodeColor(node);
        const size   = (node.val || 10) * 0.85;
        const half   = size;
        const r      = size * 0.3;
        const isHub  = node.id === 'hub';
        const isRisk = node.riskScore > 50;
        const isCrit = node.riskScore > 75;
        const t      = Date.now() / 800;

        // 1. Outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur  = isCrit ? 28 : isRisk ? 18 : (isHub ? 16 : 10);

        // 2. Hub: concentric rings design; others: rounded rect
        if (isHub) {
            // Outer ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, half * 1.35, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}30`;
            ctx.lineWidth   = 2 / globalScale;
            ctx.stroke();

            // Main rounded rect
            roundedRect(ctx, node.x, node.y, half, half, r);
            const bg = ctx.createLinearGradient(node.x - half, node.y - half, node.x + half, node.y + half);
            bg.addColorStop(0, 'rgba(0,30,38,0.95)');
            bg.addColorStop(1, 'rgba(0,18,24,0.98)');
            ctx.fillStyle   = bg;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = 2.5 / globalScale;
            ctx.stroke();

            // Inner pulsing circle
            const pulse = (Math.sin(t * 1.8) + 1) / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, half * 0.45, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}${Math.floor((0.4 + pulse * 0.4) * 255).toString(16).padStart(2,'0')}`;
            ctx.lineWidth   = 2 / globalScale;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(node.x, node.y, half * 0.22, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            // -- Pulsing danger ring (high/critical)
            if (isRisk) {
                const pulse = (Math.sin(t) + 1) / 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, half * (1.25 + pulse * 0.35), 0, 2 * Math.PI);
                const alpha = isCrit ? (0.2 + pulse * 0.3) : (0.1 + pulse * 0.18);
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`;
                ctx.lineWidth   = (isCrit ? 2 : 1.5) / globalScale;
                ctx.stroke();
            }

            // Rounded square shape
            roundedRect(ctx, node.x, node.y, half, half, r);
            const bg = ctx.createLinearGradient(node.x - half, node.y - half, node.x + half, node.y + half);
            bg.addColorStop(0, 'rgba(15,25,34,0.92)');
            bg.addColorStop(1, 'rgba(8,14,20,0.97)');
            ctx.fillStyle   = bg;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = (isCrit ? 2.5 : isRisk ? 2 : 1.8) / globalScale;
            ctx.stroke();

            // Inner shine line (top)
            const innerR = r * 0.8;
            ctx.beginPath();
            ctx.moveTo(node.x - half + innerR, node.y - half + 1/globalScale);
            ctx.lineTo(node.x + half - innerR, node.y - half + 1/globalScale);
            ctx.strokeStyle = `${color}22`;
            ctx.lineWidth   = 1 / globalScale;
            ctx.stroke();

            // Icon
            const icon = ICON_MAP[node.group] || ICON_MAP.desktop;
            ctx.font          = `bold ${size * 0.78}px JetBrains Mono`;
            ctx.fillStyle     = color;
            ctx.globalAlpha   = isRisk ? 1 : 0.85;
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillText(icon, node.x, node.y);
            ctx.globalAlpha   = 1;
        }

        ctx.shadowBlur = 0;

        // 3. Label
        if (globalScale > 1.4 || selectedNode?.id === node.id) {
            const label    = node.name || '';
            const fontSize = 9 / globalScale;
            ctx.font          = `600 ${fontSize}px Outfit, sans-serif`;
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'top';

            const textW    = ctx.measureText(label).width + 10;
            const labelY   = node.y + half + 10 / globalScale;

            // Label background pill
            ctx.fillStyle   = 'rgba(2,9,15,0.8)';
            ctx.strokeStyle = `${color}55`;
            ctx.lineWidth   = 0.8 / globalScale;
            ctx.beginPath();
            ctx.roundRect(node.x - textW / 2, labelY - 2 / globalScale, textW, fontSize + 4 / globalScale, 4 / globalScale);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.78)';
            ctx.fillText(label, node.x, labelY);
        }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in w-full h-full">

            {/* Graph Container */}
            <div className="lg:col-span-2 relative overflow-hidden glass-card p-0" style={{ minHeight: 420 }}>
                {/* Title Bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5"
                     style={{ borderBottom: '1px solid rgba(0,255,255,0.06)', background:'rgba(2,9,15,0.6)', backdropFilter:'blur(10px)' }}>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow:'0 0 6px #00ffff' }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Live Network Topology</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => fgRef.current?.zoomToFit(400)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                            title="Zoom to Fit">
                            <ZoomOut className="h-3.5 w-3.5" />
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
                        backgroundColor="#01050a"
                        nodeCanvasObject={drawNode}
                        nodeCanvasObjectMode={() => 'replace'}
                        nodeLabel={(node) => `
                            <div style="padding:10px;background:rgba(2,9,15,0.95);border:1px solid rgba(0,255,255,0.2);border-radius:10px;font-family:Outfit,sans-serif;min-width:180px">
                                <div style="font-size:11px;font-weight:800;color:#00ffff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">${node.name}</div>
                                <div style="font-size:10px;color:rgba(255,255,255,0.5);font-family:'JetBrains Mono',monospace">${node.ip || 'INTERNAL'}</div>
                                <div style="margin-top:8px;font-size:10px;color:${getNodeColor(node)}">Risk: ${node.riskScore || 0}%</div>
                            </div>
                        `}
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
                        cooldownTicks={150}
                        onNodeClick={handleNodeClick}
                    />
                </div>
            </div>

            {/* Details Panel */}
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
        </div>
    );
};

export default NetworkTopology;
