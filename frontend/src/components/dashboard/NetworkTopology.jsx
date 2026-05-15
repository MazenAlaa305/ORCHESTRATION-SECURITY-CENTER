import { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Zone inference (mirrors topology_generator.py) ──────
const ZONE_PREFIXES = [
    { prefix: '10.10.10.', id: 'DMZ',   name: 'DMZ',   cidr: '10.10.10.0/24',  color: '#00ffff', icon: '🌐' },
    { prefix: '10.10.20.', id: 'CORP',  name: 'CORP',  cidr: '10.10.20.0/24',  color: '#00ffff', icon: '🏢' },
    { prefix: '10.10.30.', id: 'DATA',  name: 'DATA',  cidr: '10.10.30.0/24',  color: '#00ffff', icon: '🗄' },
    { prefix: '10.10.40.', id: 'MGMT',  name: 'MGMT',  cidr: '10.10.40.0/24',  color: '#00ffff', icon: '📡' },
    { prefix: '172.',      id: 'DASH',  name: 'DASH',  cidr: '172.0.0.0/8',    color: '#00ffff', icon: '🖥' },
    { prefix: '192.168.',  id: 'LAN',   name: 'LAN',   cidr: '192.168.0.0/16', color: '#00ffff', icon: '🔌' },
    { prefix: '127.',      id: 'LOCAL', name: 'LOCAL', cidr: '127.0.0.0/8',    color: '#00ffff', icon: '💻' },
];
const ZONE_ORDER = ['DMZ', 'CORP', 'DATA', 'MGMT', 'DASH', 'LAN', 'LOCAL', 'OTHER'];

const inferZone = (ip) => {
    if (!ip) return { id: 'OTHER', name: 'OTHER', cidr: 'other', color: '#00ffff', icon: '🔷' };
    return ZONE_PREFIXES.find(z => ip.startsWith(z.prefix)) || { id: 'OTHER', name: 'OTHER', cidr: 'other', color: '#00ffff', icon: '🔷' };
};

// ─── Tree layout builder ──────────────────────────────────
// zoneMap: { zoneId → { meta: {name,cidr,icon}, devices: [node,...] } }
const buildTreeGraph = (zoneMap) => {
    const nodes = [];
    const links = [];
    const orderedZones = ZONE_ORDER.filter(z => zoneMap[z]).map(z => ({ id: z, ...zoneMap[z] }));

    const HUB_Y       = -320;
    const SUBNET_Y    = -70;
    const DEV_GAP     = 280;   // horizontal gap between devices in same row
    const ROW_GAP     = 220;   // vertical gap between device rows
    const MAX_PER_ROW = 5;     // wrap to a new row after this many devices
    const ZONE_PAD    = 160;   // extra horizontal padding per zone
    const DEVICE_Y_BASE = SUBNET_Y + 320;

    // Compute per-zone grid dimensions and zone width
    const zoneLayouts = orderedZones.map(zone => {
        const n       = zone.devices.length;
        const cols    = Math.min(Math.max(n, 1), MAX_PER_ROW);
        const rows    = Math.ceil(n / MAX_PER_ROW);
        const clusterW = Math.max(0, cols - 1) * DEV_GAP;
        const zoneW   = Math.max(220, clusterW + ZONE_PAD);
        return { cols, rows, clusterW, zoneW };
    });

    // Position zone centers sequentially from left
    const totalWidth = zoneLayouts.reduce((s, l) => s + l.zoneW, 0);
    let xCursor = -totalWidth / 2;
    const zoneCenters = zoneLayouts.map(l => {
        const cx = xCursor + l.zoneW / 2;
        xCursor += l.zoneW;
        return cx;
    });

    nodes.push({ id: 'hub', name: 'Gateway Hub', group: 'gateway', val: 24, riskScore: 0,
                 fx: 0, fy: HUB_Y, x: 0, y: HUB_Y });

    orderedZones.forEach((zone, zi) => {
        const zx       = zoneCenters[zi];
        const layout   = zoneLayouts[zi];
        const subnetId = `zone_${zone.id}`;

        nodes.push({
            id: subnetId, name: zone.meta.name, cidr: zone.meta.cidr, icon: zone.meta.icon || '',
            group: 'subnet', isSubnet: true, val: 13, riskScore: 0,
            fx: zx, fy: SUBNET_Y, x: zx, y: SUBNET_Y,
        });
        links.push({ source: 'hub', target: subnetId, value: 3 });

        zone.devices.forEach((dev, di) => {
            const col = di % layout.cols;
            const row = Math.floor(di / layout.cols);
            const dx  = zx - layout.clusterW / 2 + col * DEV_GAP;
            const dy  = DEVICE_Y_BASE + row * ROW_GAP;
            nodes.push({ ...dev, fx: dx, fy: dy, x: dx, y: dy });
            links.push({ source: subnetId, target: dev.id, value: 2 });
        });
    });

    return { nodes, links };
};

// ─── Static demo — tree layout ────────────────────────────
const DEMO_GRAPH = (() => {
    const demoZoneMap = {
        DMZ:  { meta: { name: 'DMZ',  cidr: '10.10.10.0/24', icon: '🌐' }, devices: [
            { id:'d1', name:'WEB-01',   ip:'10.10.10.10', group:'server',   riskScore:88, criticality:'CRITICAL', vulnCount:7, infoCount:0, val:16 },
            { id:'d2', name:'API-GW',   ip:'10.10.10.20', group:'router',   riskScore:55, criticality:'MEDIUM',   vulnCount:3, infoCount:0, val:16 },
            { id:'d3', name:'DNS-SVR',  ip:'10.10.10.30', group:'router',   riskScore:45, criticality:'MEDIUM',   vulnCount:2, infoCount:0, val:16 },
        ]},
        CORP: { meta: { name: 'CORP', cidr: '10.10.20.0/24', icon: '🏢' }, devices: [
            { id:'d4', name:'FILE-SVR', ip:'10.10.20.10', group:'server',   riskScore:72, criticality:'HIGH',     vulnCount:4, infoCount:0, val:16 },
            { id:'d5', name:'MAIL-SVR', ip:'10.10.20.20', group:'server',   riskScore:62, criticality:'HIGH',     vulnCount:3, infoCount:0, val:16 },
            { id:'d6', name:'WS-01',    ip:'10.10.20.40', group:'desktop',  riskScore:35, criticality:'MEDIUM',   vulnCount:1, infoCount:0, val:16 },
        ]},
        DATA: { meta: { name: 'DATA', cidr: '10.10.30.0/24', icon: '🗄' }, devices: [
            { id:'d7', name:'DB-01',    ip:'10.10.30.10', group:'database', riskScore:88, criticality:'CRITICAL', vulnCount:6, infoCount:0, val:16 },
            { id:'d8', name:'REDIS',    ip:'10.10.30.20', group:'database', riskScore:80, criticality:'CRITICAL', vulnCount:5, infoCount:0, val:16 },
        ]},
        MGMT: { meta: { name: 'MGMT', cidr: '10.10.40.0/24', icon: '📡' }, devices: [
            { id:'d9',  name:'TRAF-GEN', ip:'10.10.40.10', group:'server', riskScore:10, criticality:'LOW', vulnCount:0, infoCount:0, val:16 },
            { id:'d10', name:'LOG-SHIP', ip:'10.10.40.20', group:'server', riskScore:10, criticality:'LOW', vulnCount:0, infoCount:0, val:16 },
        ]},
    };
    return buildTreeGraph(demoZoneMap);
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

// ─── Subnet Detail Panel ──────────────────────────────────
const SubnetDetailPanel = ({ node, graphData, onClose }) => {
    const subnetDevices = graphData.links
        .filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === node.id)
        .map(l => {
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return graphData.nodes.find(n => n.id === tid);
        })
        .filter(Boolean);

    const totalVulns = subnetDevices.reduce((s, d) => s + (d.vulnCount || 0), 0);
    const critCount  = subnetDevices.filter(d => (d.riskScore || 0) >= 75 || (d.criticality || '').toUpperCase() === 'CRITICAL').length;
    const highCount  = subnetDevices.filter(d => { const r = d.riskScore || 0; const c = (d.criticality || '').toUpperCase(); return (r >= 50 && r < 75) || c === 'HIGH'; }).length;
    const medCount   = subnetDevices.filter(d => { const r = d.riskScore || 0; return r >= 20 && r < 50; }).length;
    const safeCount  = Math.max(0, subnetDevices.length - critCount - highCount - medCount);
    const avgRisk    = subnetDevices.length
        ? Math.round(subnetDevices.reduce((s, d) => s + (d.riskScore || 0), 0) / subnetDevices.length)
        : 0;
    const riskColor  = avgRisk >= 75 ? '#ff0055' : avgRisk >= 50 ? '#ff6a00' : avgRisk >= 20 ? '#ffaa00' : '#00ff88';

    return (
        <div className="glass-card flex flex-col h-full overflow-hidden" style={{ border: '1px solid rgba(0,255,255,0.12)' }}>
            {/* Header */}
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(0,255,255,0.08)', background: 'rgba(0,12,18,0.6)' }}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none">{node.icon || '🔷'}</span>
                        <div>
                            <div className="text-white font-black text-base uppercase tracking-widest">{node.name} Zone</div>
                            <div className="font-mono text-xs mt-0.5" style={{ color: 'rgba(0,255,255,0.55)' }}>{node.cidr}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-1 text-lg leading-none">×</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Devices',  value: subnetDevices.length, color: '#00ffff' },
                        { label: 'Vulns',    value: totalVulns, color: totalVulns > 0 ? '#ff6a00' : '#00ff88' },
                        { label: 'Avg Risk', value: `${avgRisk}%`, color: riskColor },
                        { label: 'Critical', value: critCount, color: critCount > 0 ? '#ff0055' : '#00ff88' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}1a` }}>
                            <div className="text-xl font-black" style={{ color }}>{value}</div>
                            <div className="text-gray-500 text-xs mt-0.5 uppercase tracking-wider">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Risk distribution bar */}
                {subnetDevices.length > 0 && (
                    <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Risk Distribution</div>
                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {critCount  > 0 && <div style={{ flex: critCount,  background: '#ff0055', borderRadius: 4 }} />}
                            {highCount  > 0 && <div style={{ flex: highCount,  background: '#ff6a00', borderRadius: 4 }} />}
                            {medCount   > 0 && <div style={{ flex: medCount,   background: '#ffaa00', borderRadius: 4 }} />}
                            {safeCount  > 0 && <div style={{ flex: safeCount,  background: '#00ff88', borderRadius: 4 }} />}
                        </div>
                        <div className="flex justify-between text-xs mt-1.5">
                            <span style={{ color: '#ff0055' }}>{critCount} crit</span>
                            <span style={{ color: '#ff6a00' }}>{highCount} high</span>
                            <span style={{ color: '#ffaa00' }}>{medCount} med</span>
                            <span style={{ color: '#00ff88' }}>{safeCount} low</span>
                        </div>
                    </div>
                )}

                {/* Device list */}
                <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Devices ({subnetDevices.length})</div>
                    <div className="space-y-1.5">
                        {subnetDevices.length === 0 && (
                            <div className="text-gray-600 text-xs text-center py-4">No devices discovered in this zone</div>
                        )}
                        {subnetDevices.map((dev, i) => {
                            const r   = dev.riskScore || 0;
                            const crt = (dev.criticality || '').toUpperCase();
                            const eff = r > 0 ? r : crt === 'CRITICAL' ? 90 : crt === 'HIGH' ? 70 : crt === 'MEDIUM' ? 40 : 10;
                            const rc  = eff >= 75 ? '#ff0055' : eff >= 50 ? '#ff6a00' : eff >= 20 ? '#ffaa00' : '#00ff88';
                            const lbl = eff >= 75 ? 'CRIT' : eff >= 50 ? 'HIGH' : eff >= 20 ? 'MED' : 'LOW';
                            return (
                                <div key={dev.id ?? i} className="flex items-center justify-between rounded-lg px-3 py-2"
                                     style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${rc}1a` }}>
                                    <div className="min-w-0">
                                        <div className="text-white text-xs font-bold truncate">{dev.name || dev.ip}</div>
                                        <div className="font-mono text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{dev.ip || '—'}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {(dev.vulnCount || 0) > 0 && (
                                            <span className="text-xs" style={{ color: rc }}>⚠ {dev.vulnCount}</span>
                                        )}
                                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                                              style={{ background: `${rc}1a`, color: rc, border: `1px solid ${rc}44` }}>
                                            {lbl}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
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

    // Map lab target objects into tree graph
    const transformLabTargetsToGraph = (targets) => {
        const zoneMap = {};
        targets.forEach((t) => {
            let group = 'server';
            if (t.protocol === 'dns')                                    group = 'router';
            else if (t.protocol === 'postgresql' || t.protocol === 'redis') group = 'database';

            const riskScore  = (t.cvss || 0) * 10;
            const criticality = t.cvss >= 9 ? 'CRITICAL' : t.cvss >= 7 ? 'HIGH' : t.cvss >= 4 ? 'MEDIUM' : 'LOW';
            const zone       = inferZone(t.hostname);
            const zid        = t.zone?.toUpperCase() || zone.id;

            if (!zoneMap[zid]) zoneMap[zid] = { meta: { name: zid, cidr: zone.cidr, icon: zone.icon || '🔷' }, devices: [] };
            zoneMap[zid].devices.push({
                id:          `lab_${t.container}`,
                name:        t.name || t.hostname,
                ip:          t.hostname,
                group,
                vulnCount:   (t.vulns || []).length,
                infoCount:   0,
                val:         16,
                riskScore,
                criticality,
                details: {
                    ip_address:  t.hostname,
                    hostname:    t.name,
                    device_type: group,
                    os_name:     t.os || null,
                    status:      'active',
                    open_ports:  String(t.port),
                    risk_score:  riskScore,
                    criticality,
                    zone:        zid,
                    description: t.description,
                    services: t.port ? [{
                        port:         t.port,
                        protocol:     'tcp',
                        state:        'open',
                        service_name: t.protocol || 'unknown',
                        product:      t.name || '',
                        version:      '',
                        cpe:          '',
                    }] : [],
                    vulnerabilities: (t.vulns || []).map((v, i) => ({
                        id:          String(i),
                        title:       v.name || v.title || v.type || 'Vulnerability',
                        severity:    (v.severity || 'medium').toLowerCase(),
                        type:        v.type || '',
                        url:         v.url  || '',
                        cve_id:      v.cve_id || '',
                        description: v.description || v.detail || '',
                        status:      'open',
                    })),
                },
            });
        });
        setGraphData(buildTreeGraph(zoneMap));
    };

    const transformDataToGraph = (assets) => {
        if (!Array.isArray(assets) || assets.length === 0) return;
        const zoneMap = {};
        assets.forEach((asset) => {
            const zone = inferZone(asset.ip_address);
            if (!zoneMap[zone.id]) zoneMap[zone.id] = { meta: { name: zone.name, cidr: zone.cidr, icon: zone.icon || '🔷' }, devices: [] };
            zoneMap[zone.id].devices.push({
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
            });
        });
        setGraphData(buildTreeGraph(zoneMap));
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
        if (node.id === 'hub') { setSelectedNode(null); return; }
        if (node.isSubnet) {
            setSelectedNode(node);
            if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 800);
                fgRef.current.zoom(2.2, 1000);
            }
            return;
        }
        setSelectedNode(node);
        // Numeric ID → direct detail fetch
        if (node.id && typeof node.id === 'number') {
            try {
                const { data: detail } = await networkService.getAssetDetail(node.id);
                setSelectedNode(prev =>
                    prev?.id === node.id
                        ? { ...prev, details: { ...(prev.details || {}), ...detail }, vulnCount: detail.vuln_count || 0, infoCount: detail.info_count || 0 }
                        : prev
                );
            } catch (_) {}
        } else if (node.ip) {
            // String ID (lab target) — find matching asset by IP then fetch detail
            try {
                const { data: assets } = await networkService.getAssets();
                const match = assets?.find(a => a.ip_address === node.ip);
                if (match && typeof match.id === 'number') {
                    const { data: detail } = await networkService.getAssetDetail(match.id);
                    setSelectedNode(prev =>
                        prev?.id === node.id
                            ? { ...prev, details: { ...(prev.details || {}), ...detail }, vulnCount: detail.vuln_count || 0, infoCount: detail.info_count || 0 }
                            : prev
                    );
                }
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

        // All sizes in canvas pixels (PX = 1 canvas pixel in graph units).
        // This keeps every node the same visual size regardless of zoom level.
        const PX = 1 / globalScale;

        // ── Subnet zone circle (fixed 17 px canvas radius) ────
        if (node.isSubnet) {
            const c = '#00ffff';
            const r = 17 * PX;

            ctx.shadowColor = c; ctx.shadowBlur = 22 * PX;
            ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.35, 0, Math.PI * 2);
            ctx.strokeStyle = `${c}18`; ctx.lineWidth = 1.5 * PX; ctx.stroke();

            const bg = ctx.createRadialGradient(node.x, node.y - r * 0.3, 0, node.x, node.y, r);
            bg.addColorStop(0, 'rgba(0,38,50,0.97)'); bg.addColorStop(1, 'rgba(0,12,18,0.99)');
            ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = c; ctx.lineWidth = 2 * PX; ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.beginPath(); ctx.arc(node.x, node.y, r * 0.78, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.strokeStyle = `${c}28`; ctx.lineWidth = 1.2 * PX; ctx.stroke();

            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `${12 * PX}px sans-serif`; ctx.fillStyle = c;
            ctx.fillText(node.icon || '🔷', node.x, node.y - 7 * PX);
            ctx.font = `800 ${9 * PX}px Outfit, monospace`;
            ctx.fillText(node.name, node.x, node.y + 6 * PX);
            ctx.font = `500 ${7 * PX}px Outfit, monospace`; ctx.fillStyle = `${c}77`;
            ctx.fillText(node.cidr || '', node.x, node.y + r + 9 * PX);
            return;
        }

        // ── Hub & device nodes ────────────────────────────────
        const color  = getNodeColor(node);
        const isHub  = node.id === 'hub';
        const isRisk = node.riskScore > 50;
        const isCrit = node.riskScore > 75;
        const t      = Date.now() / 800;

        ctx.shadowColor = color;
        ctx.shadowBlur  = (isCrit ? 28 : isRisk ? 20 : isHub ? 22 : 12) * PX;

        if (isHub) {
            const r = 20 * PX;   // fixed 20 px canvas radius

            ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.65, 0, Math.PI * 2);
            ctx.strokeStyle = `${color}22`; ctx.lineWidth = 1.5 * PX; ctx.stroke();
            ctx.beginPath(); ctx.arc(node.x, node.y, r * 1.25, 0, Math.PI * 2);
            ctx.strokeStyle = `${color}40`; ctx.lineWidth = 1 * PX; ctx.stroke();

            const bg = ctx.createRadialGradient(node.x, node.y - r * 0.3, 0, node.x, node.y, r);
            bg.addColorStop(0, 'rgba(0,45,55,0.98)'); bg.addColorStop(1, 'rgba(0,20,28,0.99)');
            ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 2.5 * PX; ctx.stroke();

            const pulse = (Math.sin(t * 1.8) + 1) / 2;
            ctx.beginPath(); ctx.arc(node.x, node.y, r * (0.48 + pulse * 0.08), 0, Math.PI * 2);
            ctx.strokeStyle = `${color}${Math.floor((0.35 + pulse * 0.45) * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1.5 * PX; ctx.stroke();
            ctx.beginPath(); ctx.arc(node.x, node.y, r * 0.22, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        } else {
            const half = 15 * PX;   // fixed 15 px canvas half-side (30 px square)
            const cr   = 3 * PX;

            if (isRisk) {
                const pulse = (Math.sin(t) + 1) / 2;
                const pr    = half * (1.35 + pulse * 0.28);
                const alpha = isCrit ? (0.25 + pulse * 0.3) : (0.1 + pulse * 0.2);
                ctx.beginPath();
                safeRoundRect(ctx, node.x - pr, node.y - pr, pr * 2, pr * 2, cr * 2);
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = (isCrit ? 2 : 1.5) * PX; ctx.stroke();
            }

            const bg = ctx.createRadialGradient(node.x, node.y - half * 0.25, 0, node.x, node.y, half * 1.4);
            bg.addColorStop(0, 'rgba(20,32,44,0.95)'); bg.addColorStop(1, 'rgba(8,14,22,0.98)');
            ctx.beginPath();
            safeRoundRect(ctx, node.x - half, node.y - half, half * 2, half * 2, cr);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = (isCrit ? 2.5 : isRisk ? 2 : 1.8) * PX; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(node.x - half * 0.6, node.y - half + 1.2 * PX);
            ctx.lineTo(node.x + half * 0.6, node.y - half + 1.2 * PX);
            ctx.strokeStyle = `${color}30`; ctx.lineWidth = 1.5 * PX; ctx.stroke();

            ctx.shadowBlur  = 0;
            ctx.globalAlpha = isRisk ? 1 : 0.82;
            drawDeviceIcon(ctx, node.group || 'desktop', node.x, node.y, half, color);
            ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 0;

        // Label beneath node — always 8 canvas px font
        const label   = node.name || '';
        const labelFs = 8 * PX;
        ctx.font = `600 ${labelFs}px Outfit, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const textW   = ctx.measureText(label).width + 10 * PX;
        const nodePx  = isHub ? 20 * PX : 15 * PX;
        const labelY  = node.y + nodePx + 5 * PX;

        ctx.fillStyle   = 'rgba(2,9,15,0.82)';
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth   = 0.7 * PX;
        ctx.beginPath();
        safeRoundRect(ctx, node.x - textW / 2, labelY - 2 * PX, textW, labelFs + 4 * PX, 3 * PX);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = selectedNode?.id === node.id ? '#ffffff' : 'rgba(255,255,255,0.78)';
        ctx.fillText(label, node.x, labelY);
    }, [selectedNode]);

    const graphContainerStyle = isFullscreen
        ? { position: 'fixed', top: '48px', right: 0, bottom: 0, left: 'var(--sidebar-width, 208px)', zIndex: 9999, background: '#0c1c25' }
        : { height: compact ? 320 : 460 };

    return (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 animate-fade-in w-full`}>

            {/* Details Panel */}
            {!compact && (
                <div className={`lg:order-1 transition-all duration-500 ${selectedNode ? 'col-span-1 opacity-100' : 'hidden lg:block opacity-20 pointer-events-none'}`}>
                    {selectedNode?.isSubnet ? (
                        <SubnetDetailPanel
                            node={selectedNode}
                            graphData={graphData}
                            onClose={() => { setSelectedNode(null); doFit(); }}
                        />
                    ) : selectedNode ? (
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
                                Click any <span style={{ color:'#00ffff' }}>node</span> or <span style={{ color:'#00ffff' }}>subnet</span> on the topology map to view details.
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
                            if (node.isSubnet) return `<div style="padding:10px;background:rgba(2,9,15,0.95);border:1px solid rgba(0,255,255,0.25);border-radius:10px;font-family:Outfit,sans-serif"><div style="font-size:13px;font-weight:800;color:#00ffff;text-transform:uppercase">${node.icon || ''} ${node.name}</div><div style="font-size:10px;color:rgba(0,255,255,0.55);margin-top:3px;font-family:monospace">${node.cidr || ''}</div></div>`;
                            const crit = (node.criticality || '').toUpperCase();
                            const critRisk = crit === 'CRITICAL' ? 90 : crit === 'HIGH' ? 70 : crit === 'MEDIUM' ? 40 : crit === 'LOW' ? 15 : 0;
                            const eff = node.riskScore > 0 ? node.riskScore : critRisk;
                            const lbl = eff >= 75 ? 'CRITICAL' : eff >= 50 ? 'HIGH' : eff >= 20 ? 'MEDIUM' : eff > 0 ? 'LOW' : 'NONE';
                            const rc  = eff >= 75 ? '#ff0055' : eff >= 50 ? '#ff6a00' : eff >= 20 ? '#ffaa00' : eff > 0 ? '#00ccff' : '#00ff88';
                            const v = node.vulnCount || 0;
                            return `<div style="padding:12px;background:rgba(2,9,15,0.97);border:1px solid ${rc}44;border-radius:10px;font-family:Outfit,sans-serif;min-width:180px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase">${node.name}</div><div style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${rc}22;border:1px solid ${rc}66;color:${rc}">${lbl}</div></div><div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:8px">${node.ip || 'INTERNAL'}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:10px;color:rgba(255,255,255,0.5)">Risk</span><span style="font-size:11px;font-weight:800;color:${rc}">${eff}%</span></div><div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden"><div style="height:100%;width:${eff}%;background:${rc};border-radius:2px"></div></div>${v > 0 ? `<div style="margin-top:8px;font-size:10px;color:${rc}">⚠ ${v} vuln${v === 1 ? '' : 's'}</div>` : ''}</div>`;
                        }}
                        linkColor={(link) => link.value >= 3 ? 'rgba(0,255,255,0.45)' : 'rgba(0,255,255,0.14)'}
                        linkWidth={(link) => link.value >= 3 ? 2.5 : 1.2}
                        linkDirectionalParticles={(link) => link.value >= 3 ? 4 : 2}
                        linkDirectionalParticleWidth={(link) => link.value >= 3 ? 2.5 : 1.5}
                        linkDirectionalParticleColor={(link) => {
                            if (link.value >= 3) return '#00ffff';
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
