import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw, Move, Crosshair } from 'lucide-react';
import AssetDetailPanel from './AssetDetailPanel';
import TopologyLegend from './TopologyLegend';
import { networkService, labService } from '../../services/api';

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

// ─── Canvas device icon renderer ──────────────────────────
const drawDeviceIcon = (ctx, group, cx, cy, r, color) => {
    const s = r * 0.52;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = Math.max(1, r * 0.11);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowBlur  = 0;

    switch (group) {
        case 'server': {
            // Three-unit server rack
            const rw = s * 1.55, rh = s * 0.38, gap = s * 0.18;
            const startY = cy - (rh * 3 + gap * 2) / 2;
            for (let i = 0; i < 3; i++) {
                const ry = startY + i * (rh + gap);
                ctx.globalAlpha = 0.12;
                ctx.fillRect(cx - rw / 2, ry, rw, rh);
                ctx.globalAlpha = 1;
                ctx.strokeRect(cx - rw / 2, ry, rw, rh);
                // Status LED
                ctx.beginPath();
                ctx.arc(cx + rw / 2 - rh * 0.38, ry + rh / 2, rh * 0.2, 0, Math.PI * 2);
                ctx.globalAlpha = 0.9;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            break;
        }
        case 'router': {
            // Box with wifi arcs above
            const bw = s * 1.5, bh = s * 0.65;
            const by = cy + s * 0.22;
            ctx.globalAlpha = 0.12;
            ctx.fillRect(cx - bw / 2, by - bh / 2, bw, bh);
            ctx.globalAlpha = 1;
            ctx.strokeRect(cx - bw / 2, by - bh / 2, bw, bh);
            // Antenna lines
            ctx.beginPath();
            ctx.moveTo(cx - bw * 0.28, by - bh / 2);
            ctx.lineTo(cx - bw * 0.28, by - bh / 2 - s * 0.38);
            ctx.moveTo(cx + bw * 0.28, by - bh / 2);
            ctx.lineTo(cx + bw * 0.28, by - bh / 2 - s * 0.38);
            ctx.stroke();
            // Antenna dots
            ctx.beginPath();
            ctx.arc(cx - bw * 0.28, by - bh / 2 - s * 0.42, s * 0.1, 0, Math.PI * 2);
            ctx.arc(cx + bw * 0.28, by - bh / 2 - s * 0.42, s * 0.1, 0, Math.PI * 2);
            ctx.fill();
            // Port dots
            [-.25, 0, .25].forEach(o => {
                ctx.beginPath();
                ctx.arc(cx + bw * o, by + bh * 0.22, bh * 0.15, 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }
        case 'gateway': {
            // Diamond / hub shape: circle with 4 port stubs
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.52, 0, Math.PI * 2);
            ctx.globalAlpha = 0.15;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            // 4 directional stubs
            const stubLen = s * 0.5;
            [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.moveTo(cx + dx * s * 0.52, cy + dy * s * 0.52);
                ctx.lineTo(cx + dx * (s * 0.52 + stubLen), cy + dy * (s * 0.52 + stubLen));
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx + dx * (s * 0.52 + stubLen), cy + dy * (s * 0.52 + stubLen), s * 0.1, 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }
        case 'database': {
            // Cylinder: top ellipse, sides, bottom ellipse, mid divider
            const dw = s * 1.35, ey = s * 0.28, bodyH = s * 1.1;
            const top = cy - bodyH / 2;
            // Sides
            ctx.beginPath();
            ctx.moveTo(cx - dw / 2, top);
            ctx.lineTo(cx - dw / 2, top + bodyH);
            ctx.moveTo(cx + dw / 2, top);
            ctx.lineTo(cx + dw / 2, top + bodyH);
            ctx.stroke();
            // Bottom ellipse
            ctx.beginPath();
            ctx.ellipse(cx, top + bodyH, dw / 2, ey, 0, 0, Math.PI * 2);
            ctx.globalAlpha = 0.15;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            // Mid divider (arc only — lower half visible)
            ctx.beginPath();
            ctx.ellipse(cx, top + bodyH * 0.45, dw / 2, ey, 0, 0, Math.PI, true);
            ctx.stroke();
            // Top ellipse (on top of sides)
            ctx.beginPath();
            ctx.ellipse(cx, top, dw / 2, ey, 0, 0, Math.PI * 2);
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            break;
        }
        case 'firewall': {
            // Shield shape with lock icon
            ctx.beginPath();
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx + s * 0.82, cy - s * 0.48);
            ctx.lineTo(cx + s * 0.82, cy + s * 0.1);
            ctx.quadraticCurveTo(cx + s * 0.82, cy + s * 0.72, cx, cy + s);
            ctx.quadraticCurveTo(cx - s * 0.82, cy + s * 0.72, cx - s * 0.82, cy + s * 0.1);
            ctx.lineTo(cx - s * 0.82, cy - s * 0.48);
            ctx.closePath();
            ctx.globalAlpha = 0.12;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            // Lock shackle
            ctx.beginPath();
            ctx.arc(cx, cy - s * 0.05, s * 0.28, Math.PI, 0, false);
            ctx.stroke();
            // Lock body
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(cx - s * 0.3, cy - s * 0.05, s * 0.6, s * 0.42, 2);
            } else {
                ctx.rect(cx - s * 0.3, cy - s * 0.05, s * 0.6, s * 0.42);
            }
            ctx.globalAlpha = 0.12;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            break;
        }
        case 'mobile': {
            // Phone outline
            const pw = s * 0.82, ph = s * 1.55;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 3);
            } else {
                ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            }
            ctx.globalAlpha = 0.12;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            // Speaker slot
            ctx.beginPath();
            ctx.moveTo(cx - pw * 0.2, cy - ph / 2 + ph * 0.07);
            ctx.lineTo(cx + pw * 0.2, cy - ph / 2 + ph * 0.07);
            ctx.stroke();
            // Home button circle
            ctx.beginPath();
            ctx.arc(cx, cy + ph / 2 - ph * 0.1, ph * 0.07, 0, Math.PI * 2);
            ctx.stroke();
            // Screen area
            ctx.beginPath();
            ctx.rect(cx - pw * 0.4, cy - ph * 0.3, pw * 0.8, ph * 0.45);
            ctx.globalAlpha = 0.08;
            ctx.fill();
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        default: {
            // Desktop monitor
            const mw = s * 1.6, mh = s * 1.05;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(cx - mw / 2, cy - mh / 2 - s * 0.1, mw, mh, 2);
            } else {
                ctx.rect(cx - mw / 2, cy - mh / 2 - s * 0.1, mw, mh);
            }
            ctx.globalAlpha = 0.12;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            // Inner screen
            ctx.beginPath();
            ctx.rect(cx - mw * 0.38, cy - mh * 0.28 - s * 0.1, mw * 0.76, mh * 0.62);
            ctx.globalAlpha = 0.08;
            ctx.fill();
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
            // Stand
            ctx.beginPath();
            ctx.moveTo(cx, cy + mh / 2 - s * 0.1);
            ctx.lineTo(cx, cy + mh / 2 + s * 0.15);
            ctx.moveTo(cx - s * 0.4, cy + mh / 2 + s * 0.15);
            ctx.lineTo(cx + s * 0.4, cy + mh / 2 + s * 0.15);
            ctx.stroke();
            break;
        }
    }

    ctx.restore();
};

// ─── Static demo nodes shown when APIs are unavailable ────
const DEMO_GRAPH = (() => {
    const hub = { id:'hub', name:'Gateway Hub', group:'gateway', val:18, riskScore:0, fx:0, fy:0, x:0, y:0 };
    const devices = [
        { id:'d1', name:'WEB-01',    ip:'192.168.1.10', group:'server',   riskScore:72, criticality:'HIGH',     vulnCount:4 },
        { id:'d2', name:'DB-PRIMARY',ip:'192.168.1.20', group:'database', riskScore:88, criticality:'CRITICAL',  vulnCount:7 },
        { id:'d3', name:'FIREWALL',  ip:'192.168.1.1',  group:'firewall', riskScore:18, criticality:'LOW',      vulnCount:0 },
        { id:'d4', name:'ROUTER-01', ip:'192.168.1.254',group:'router',   riskScore:35, criticality:'MEDIUM',   vulnCount:2 },
        { id:'d5', name:'APP-SRV',   ip:'192.168.1.30', group:'server',   riskScore:55, criticality:'HIGH',     vulnCount:3 },
        { id:'d6', name:'DEV-PC',    ip:'192.168.1.50', group:'desktop',  riskScore:12, criticality:'LOW',      vulnCount:1 },
    ];
    const count = devices.length, radius = 180;
    const nodes = [hub, ...devices.map((d, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        return { ...d, val:10, infoCount:0, fx: Math.cos(angle)*radius, fy: Math.sin(angle)*radius,
                  x: Math.cos(angle)*radius, y: Math.sin(angle)*radius };
    })];
    const links = devices.map(d => ({ source:'hub', target:d.id, value:2 }));
    return { nodes, links };
})();

// ─── Safe roundRect polyfill ──────────────────────────────
const safeRoundRect = (ctx, x, y, w, h, r) => {
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
};

// ─── Component ────────────────────────────────────────────
const NetworkTopology = ({ refresh, compact = false }) => {
    // Start with DEMO_GRAPH so canvas is never blank on first paint
    const [graphData, setGraphData]       = useState(DEMO_GRAPH);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Start with safe fallback dimensions; ResizeObserver will update them
    const [dims, setDims] = useState({ w: 900, h: compact ? 270 : 410 });
    const fgRef        = useRef();
    const graphAreaRef = useRef();
    const fitTimer     = useRef(null);

    const doFit = useCallback(() => {
        clearTimeout(fitTimer.current);
        fitTimer.current = setTimeout(() => fgRef.current?.zoomToFit(400, 40), 300);
    }, []);

    // Measure graph area and keep dims in sync (handles fullscreen toggle too)
    useEffect(() => {
        const el = graphAreaRef.current;
        if (!el) return;
        // Set dims from actual element size immediately
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) setDims({ w: rect.width, h: rect.height });
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (width > 10 && height > 10) setDims({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [isFullscreen]); // re-measure when fullscreen toggles

    // Auto-fit whenever graph data or dims change
    useEffect(() => { doFit(); }, [graphData, dims]);

    // Cleanup on unmount
    useEffect(() => () => clearTimeout(fitTimer.current), []);

    const fetchData = async () => {
        try {
            const { data: assets } = await networkService.getAssets();
            if (assets?.length > 0) { transformDataToGraph(assets); return; }
            const { data: labData } = await labService.getTargets();
            if (labData?.targets?.length > 0) { transformLabTargetsToGraph(labData.targets); return; }
            // APIs returned empty — keep demo data
        } catch (_) {
            try {
                const { data: labData } = await labService.getTargets();
                if (labData?.targets?.length > 0) { transformLabTargetsToGraph(labData.targets); return; }
            } catch (__) { /* keep demo */ }
        }
    };

    useEffect(() => { fetchData(); }, [refresh]);

    // Map lab target objects into the same graph node format
    const transformLabTargetsToGraph = (targets) => {
        const nodes = [];
        const links = [];

        nodes.push({ id:'hub', name:'Gateway Hub', group:'gateway', val:18, riskScore:0, fx:0, fy:0 });


        const count = targets.length;
        const radius = 180;

        targets.forEach((t, i) => {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2;
            const fx = Math.cos(angle) * radius;
            const fy = Math.sin(angle) * radius;
            const nodeId = `lab_${t.container}`;

            // Determine group from protocol
            let group = 'server';
            if (t.protocol === 'dns') group = 'router';
            else if (t.protocol === 'postgresql' || t.protocol === 'redis') group = 'database';
            else if (t.protocol === 'smtp') group = 'server';
            else if (t.protocol === 'smb') group = 'server';

            // Map CVSS to risk score (0-100 scale)
            const riskScore = (t.cvss || 0) * 10;

            nodes.push({
                id:          nodeId,
                name:        t.name || t.hostname,
                ip:          t.hostname,
                group,
                vulnCount:   (t.vulns || []).length,
                infoCount:   0,
                val:         10,
                riskScore,
                criticality: t.cvss >= 9 ? 'CRITICAL' : t.cvss >= 7 ? 'HIGH' : t.cvss >= 4 ? 'MEDIUM' : 'LOW',
                details: {
                    ip_address:  t.hostname,
                    hostname:    t.name,
                    device_type: group,
                    os_name:     t.protocol,
                    status:      'active',
                    open_ports:  String(t.port),
                    risk_score:  riskScore,
                    criticality: t.cvss >= 9 ? 'CRITICAL' : t.cvss >= 7 ? 'HIGH' : 'MEDIUM',
                    zone:        t.zone,
                    vulns:       t.vulns,
                    description: t.description,
                },
                fx, fy,
                x: fx, y: fy,
            });
            links.push({ source: 'hub', target: nodeId, value: 2 });
        });

        setGraphData({ nodes, links });
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
        setSelectedNode(node);
        if (node.id && typeof node.id === 'number') {
            try {
                const { data: detail } = await networkService.getAssetDetail(node.id);
                setSelectedNode(prev =>
                    prev?.id === node.id
                        ? { ...prev, details: detail, vulnCount: detail.vuln_count || 0, infoCount: detail.info_count || 0 }
                        : prev
                );
            } catch (_) {}
        }
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 800);
            fgRef.current.zoom(3.5, 1000);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(f => !f);
        setTimeout(() => doFit(), 400);
    }, [doFit]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const drawNode = useCallback((node, ctx, globalScale) => {
        if (node.x == null || node.y == null) return;

        const color  = getNodeColor(node);
        const radius = (node.val || 10) * 0.9;
        const isHub  = node.id === 'hub';
        const isRisk = node.riskScore > 50;
        const isCrit = node.riskScore > 75;
        const t      = Date.now() / 800;

        ctx.shadowColor = color;
        ctx.shadowBlur  = isCrit ? 32 : isRisk ? 22 : isHub ? 20 : 12;

        if (isHub) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.6, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}22`;
            ctx.lineWidth   = 1.5 / globalScale;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.2, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}40`;
            ctx.lineWidth   = 1 / globalScale;
            ctx.stroke();

            const bg = ctx.createRadialGradient(node.x, node.y - radius * 0.3, 0, node.x, node.y, radius);
            bg.addColorStop(0, 'rgba(0,45,55,0.98)');
            bg.addColorStop(1, 'rgba(0,20,28,0.99)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 2.5 / globalScale; ctx.stroke();

            const pulse = (Math.sin(t * 1.8) + 1) / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * (0.48 + pulse * 0.08), 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}${Math.floor((0.35 + pulse * 0.45) * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1.5 / globalScale; ctx.stroke();

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 0.22, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill();
        } else {
            if (isRisk) {
                const pulse = (Math.sin(t) + 1) / 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius * (1.3 + pulse * 0.3), 0, 2 * Math.PI);
                const alpha = isCrit ? (0.25 + pulse * 0.3) : (0.1 + pulse * 0.2);
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = (isCrit ? 2 : 1.5) / globalScale; ctx.stroke();
            }

            const bg = ctx.createRadialGradient(node.x, node.y - radius * 0.25, 0, node.x, node.y, radius);
            bg.addColorStop(0, 'rgba(20,32,44,0.95)');
            bg.addColorStop(1, 'rgba(8,14,22,0.98)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = (isCrit ? 2.5 : isRisk ? 2 : 1.8) / globalScale; ctx.stroke();

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 0.75, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.strokeStyle = `${color}30`; ctx.lineWidth = 1.5 / globalScale; ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.globalAlpha = isRisk ? 1 : 0.82;
            drawDeviceIcon(ctx, node.group || 'desktop', node.x, node.y, radius, color);
            ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 0;

        // Label with safe roundRect
        const label    = node.name || '';
        const fontSize = Math.max(8, 9 / globalScale);
        ctx.font = `600 ${fontSize}px Outfit, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const textW  = ctx.measureText(label).width + 10;
        const labelY = node.y + radius + 6 / globalScale;

        ctx.fillStyle   = 'rgba(2,9,15,0.82)';
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth   = 0.7 / globalScale;
        ctx.beginPath();
        safeRoundRect(ctx, node.x - textW / 2, labelY - 2 / globalScale, textW, fontSize + 4 / globalScale, 4 / globalScale);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = selectedNode?.id === node.id ? '#ffffff' : 'rgba(255,255,255,0.72)';
        ctx.fillText(label, node.x, labelY);
    }, [selectedNode]);

    const graphContainerStyle = isFullscreen
        ? { position: 'fixed', top: '48px', right: 0, bottom: 0, left: 'var(--sidebar-width, 208px)', zIndex: 9999, background: '#0c1c25' }
        : { height: compact ? 320 : 460 };

    return (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 animate-fade-in w-full`}>

            {/* Details Panel */}
            {!compact && (
                <div className={`lg:order-1 transition-all duration-500 ${selectedNode && selectedNode.id !== 'hub' ? 'col-span-1 opacity-100' : 'hidden lg:block opacity-20 pointer-events-none'}`}>
                    {selectedNode && selectedNode.id !== 'hub' ? (
                        <AssetDetailPanel
                            node={selectedNode}
                            onClose={() => { setSelectedNode(null); doFit(); }}
                        />
                    ) : (
                        <div className="h-full glass-card flex flex-col justify-center items-center text-center p-8 border-dashed group">
                            <div className="p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500"
                                 style={{ background:'rgba(0,255,255,0.05)', border:'1px solid rgba(0,255,255,0.08)' }}>
                                <Move className="h-8 w-8" style={{ color:'rgba(0,255,255,0.3)' }} />
                            </div>
                            <h3 className="text-white font-black text-base uppercase tracking-tight mb-3">Infrastructure Insight</h3>
                            <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
                                Click any <span style={{ color:'#00ffff' }}>node</span> on the topology map to view deep packet inspection and AI-generated risk analysis.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Graph Container */}
            <div
                className={`${compact ? 'lg:col-span-1' : 'lg:col-span-2'} lg:order-2 glass-card p-0 flex flex-col`}
                style={graphContainerStyle}
            >
                {/* Title Bar */}
                <div
                    className="flex items-center justify-between px-4 py-2.5 shrink-0 rounded-t-[18px]"
                    style={{ borderBottom: '1px solid rgba(0,255,255,0.06)', background:'rgba(2,9,15,0.6)', backdropFilter:'blur(10px)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" style={{ boxShadow:'0 0 6px #00ffff' }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.25em] whitespace-nowrap">Live Network Topology</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => { const k = (fgRef.current?.zoom() ?? 1) * 1.4; fgRef.current?.zoom(k, 300); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all" title="Zoom In">
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { const k = (fgRef.current?.zoom() ?? 1) / 1.4; fgRef.current?.zoom(Math.max(k, 0.1), 300); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all" title="Zoom Out">
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={doFit}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all" title="Fit to screen">
                            <Crosshair className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={fetchData}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all" title="Refresh">
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={toggleFullscreen}
                            className={`p-1.5 rounded-lg transition-all ${isFullscreen ? 'text-cyan-400 bg-cyan-400/15 hover:bg-cyan-400/25' : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'}`}
                            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
                            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Graph area */}
                <div
                    ref={graphAreaRef}
                    className="relative overflow-hidden"
                    style={{ flex: '1 1 0', minHeight: compact ? 260 : 400 }}
                >
                    <div className="absolute z-30" style={{ top: 10, left: 12 }}>
                        <TopologyLegend />
                    </div>
                    <div className="scanline-overlay" />

                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        width={dims.w}
                        height={dims.h}
                        backgroundColor="#0c1c25"
                        nodeCanvasObject={drawNode}
                        nodeCanvasObjectMode={() => 'replace'}
                        nodeLabel={(node) => {
                            if (node.id === 'hub') return `<div style="padding:10px;background:rgba(2,9,15,0.95);border:1px solid rgba(0,255,255,0.2);border-radius:10px;font-family:Outfit,sans-serif"><div style="font-size:11px;font-weight:800;color:#00ffff;text-transform:uppercase">Gateway Hub</div><div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px">Central network node</div></div>`;
                            const crit = (node.criticality || '').toUpperCase();
                            const critRisk = crit === 'CRITICAL' ? 90 : crit === 'HIGH' ? 70 : crit === 'MEDIUM' ? 40 : crit === 'LOW' ? 15 : 0;
                            const eff = node.riskScore > 0 ? node.riskScore : critRisk;
                            const lbl = eff >= 75 ? 'CRITICAL' : eff >= 50 ? 'HIGH' : eff >= 20 ? 'MEDIUM' : eff > 0 ? 'LOW' : 'NONE';
                            const rc  = eff >= 75 ? '#ff0055' : eff >= 50 ? '#ff6a00' : eff >= 20 ? '#ffaa00' : eff > 0 ? '#00ccff' : '#00ff88';
                            const v = node.vulnCount || 0;
                            return `<div style="padding:12px;background:rgba(2,9,15,0.97);border:1px solid ${rc}44;border-radius:10px;font-family:Outfit,sans-serif;min-width:180px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase">${node.name}</div><div style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${rc}22;border:1px solid ${rc}66;color:${rc}">${lbl}</div></div><div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:8px">${node.ip || 'INTERNAL'}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:10px;color:rgba(255,255,255,0.5)">Risk</span><span style="font-size:11px;font-weight:800;color:${rc}">${eff}%</span></div><div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden"><div style="height:100%;width:${eff}%;background:${rc};border-radius:2px"></div></div>${v > 0 ? `<div style="margin-top:8px;font-size:10px;color:${rc}">⚠ ${v} vuln${v === 1 ? '' : 's'}</div>` : ''}</div>`;
                        }}
                        linkColor={() => 'rgba(0,255,255,0.18)'}
                        linkWidth={1.2}
                        linkDirectionalParticles={3}
                        linkDirectionalParticleWidth={2}
                        linkDirectionalParticleColor={(link) => {
                            const r = (typeof link.target === 'object' ? link.target?.riskScore : 0) || 0;
                            return r > 75 ? '#ff0055' : r > 50 ? '#ffaa00' : '#00ffff';
                        }}
                        linkDirectionalParticleSpeed={0.005}
                        d3AlphaDecay={0.02}
                        d3VelocityDecay={0.4}
                        warmupTicks={60}
                        cooldownTicks={Infinity}
                        onNodeClick={handleNodeClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default NetworkTopology;
