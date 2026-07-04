import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw, Move, Crosshair } from 'lucide-react';
import AssetDetailPanel from './AssetDetailPanel';
import TopologyLegend from './TopologyLegend';
import { networkService, labService } from '../../services/api';
import { useRealTime } from '../../context/RealTimeContext';

// ─── Severity palette ─────────────────────────────────────
// Single source of truth for tier → color/label. Every other surface
// (canvas, tooltip, subnet panel, legend) MUST read from this map so
// the dashboard never drifts out of sync with itself.
const SEVERITY = {
    critical: { color: '#ff0055', label: 'Critical', pulse: true  },
    high:     { color: '#ff6a00', label: 'High',     pulse: true  },
    medium:   { color: '#ffaa00', label: 'Medium',   pulse: false },
    low:      { color: '#00ccff', label: 'Low',      pulse: false },
    secure:   { color: '#00ff88', label: 'Secure',   pulse: false },
    offline:  { color: '#6b7280', label: 'Offline',  pulse: false, dashed: true },
    unknown:  { color: '#7a8a9a', label: 'Unscanned', pulse: false },
    hub:      { color: '#00ffff', label: 'Gateway',  pulse: false },
    subnet:   { color: '#00ffff', label: 'Subnet',   pulse: false },
};

// True iff a device has positive scan evidence. Backend defaults
// criticality:"MEDIUM" + risk_score:0 for every asset on first insert,
// so we only trust those fields once a scan has actually populated
// something concrete (services, OS, timestamps).
const hasScanEvidence = (node) => {
    if (!node) return false;
    if (node.scanned === true) return true;
    const d = node.details || {};
    return d.last_scan_at != null
        || d.last_scanned_at != null
        || d.lastScanAt != null
        || (Array.isArray(d.services) && d.services.length > 0)
        || d.os_name != null
        || d.os_family != null;
};

// Stable hash used to deterministically assign a demo severity tier to
// unscanned hosts — keeps the topology visually informative while the
// real OpenVAS/Nuclei sweep is still in progress. Same node → same colour
// across reloads, so users don't see flicker.
const stableHash = (s) => {
    const str = String(s || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
};

// Unscanned/unknown nodes now resolve to the muted 'unknown' tier instead
// of being painted a random severity. The previous DEMO_TIER_WHEEL produced
// nice-looking demos but caused real-world contradictions — e.g. a 0-vuln
// internal traffic generator would render as Critical-red on the canvas
// while the detail panel correctly reported "Secure". Real scan data alone
// drives node colour now; the legend and the topology can never disagree.

// ─── Severity classifier ─────────────────────────────────
// Returns { tier, color, label, pulse } for any node. This is the only
// function that decides what colour a device gets — everywhere else in
// the file reads through it. Resolution order matters:
//   1. structural nodes (hub/subnet) bypass severity
//   2. offline status wins over everything else for visual prominence
//   3. risk_score (scanner output) is the most reliable evidence
//   4. criticality is trusted ONLY when there's scan evidence — otherwise
//      we'd colour every unscanned host as MEDIUM (the backend default)
//   5. with scan evidence and no risk → secure (green)
//   6. without any scan evidence → unknown (muted gray, NOT green)
const classifySeverity = (node) => {
    if (!node) return { tier: 'unknown', ...SEVERITY.unknown };
    if (node.id === 'hub')   return { tier: 'hub',    ...SEVERITY.hub };
    if (node.isSubnet)       return { tier: 'subnet', ...SEVERITY.subnet };

    const status = (node.status || node.details?.status || '').toLowerCase();
    const isOffline = status === 'offline' || status === 'down';

    const risk  = Number(node.riskScore) || 0;
    const vulns = Number(node.vulnCount) || 0;
    const crit  = (node.criticality || '').toUpperCase();
    const scanned = hasScanEvidence(node);

    // Offline hosts with no scan evidence and no known vulns render as
    // muted Offline-grey so they don't compete visually with real risks.
    if (isOffline && !scanned && risk === 0 && vulns === 0 && !crit) {
        return { tier: 'offline', ...SEVERITY.offline };
    }

    if (risk >= 75) return { tier: 'critical', ...SEVERITY.critical };
    if (risk >= 50) return { tier: 'high',     ...SEVERITY.high };
    if (risk >= 20) return { tier: 'medium',   ...SEVERITY.medium };

    if (vulns > 0) {
        if (crit === 'CRITICAL') return { tier: 'critical', ...SEVERITY.critical };
        if (crit === 'HIGH')     return { tier: 'high',     ...SEVERITY.high };
        return { tier: 'medium', ...SEVERITY.medium };
    }

    if (scanned) {
        // Once a scan has touched a host, the criticality field is the
        // authoritative severity classification — even when risk_score is
        // still 0 (OpenVAS often leaves it 0 until a full audit finishes).
        // Without this rule, a MEDIUM-criticality device with no vulns
        // renders green/Secure and the dashboard looks like everything is
        // safe when it isn't.
        if (crit === 'CRITICAL') return { tier: 'critical', ...SEVERITY.critical };
        if (crit === 'HIGH')     return { tier: 'high',     ...SEVERITY.high };
        if (crit === 'MEDIUM')   return { tier: 'medium',   ...SEVERITY.medium };
        if (risk > 0)            return { tier: 'low',      ...SEVERITY.low };
        // scanned + LOW (or empty) criticality + no risk + no vulns → safe
        return { tier: 'secure', ...SEVERITY.secure };
    }

    // No scan evidence → 'unknown' (gray). We deliberately do NOT invent
    // a severity here; the legend, the canvas, and the detail panel all
    // need to agree, and only real scan output can produce a real tier.
    return { tier: 'unknown', ...SEVERITY.unknown };
};

const getNodeColor = (node) => classifySeverity(node).color;

// Convenience used by the canvas renderer + AssetDetailPanel duplicate.
const isSecureDevice = (node) => classifySeverity(node).tier === 'secure';

// ─── Relative time formatting for the "updated Ns ago" badge ──────────
const formatRelativeTime = (ts, now = Date.now()) => {
    const sec = Math.max(0, Math.floor((now - ts) / 1000));
    if (sec < 5)    return 'just now';
    if (sec < 60)   return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
};

// ─── Effective risk derivation ────────────────────────────
// OpenVAS often returns vulnerabilities without updating risk_score
// (it ships vulns; the risk_score is computed downstream and may lag).
// Without a proxy, a host that just had 9 vulns found stays at riskScore=0
// and never turns red on the topology. Both the full-rebuild path and
// the incremental-patch path MUST run through this so the canvas reacts
// to scan results immediately.
const deriveEffectiveRisk = (asset) => {
    const scannerRisk = Number(asset?.risk_score) || 0;
    if (scannerRisk > 0) return scannerRisk;
    const vulnCount = Number(asset?.vuln_count) || 0;
    if (vulnCount === 0) return 0;
    if (vulnCount <= 2)  return 25;
    if (vulnCount <= 5)  return 45;
    if (vulnCount <= 9)  return 60;
    return 78;
};

// ─── OS family inference from os_name string (used when backend
// did not populate os_family). Kept conservative: only return a family
// if a well-known token is matched, otherwise null so UI shows "Unknown".
const inferOsFamily = (osName) => {
    const s = (osName || '').toLowerCase();
    if (!s) return null;
    if (/(ubuntu|debian|centos|rhel|red\s*hat|fedora|arch|alpine|kali|suse|gentoo|amazon\s*linux|oracle\s*linux|linux)/.test(s)) return 'Linux';
    if (/(windows|win10|win11|win7|win8|server\s*200|server\s*201|server\s*202)/.test(s))                                  return 'Windows';
    if (/(macos|mac\s*os|darwin|osx|os\s*x)/.test(s))                                                                       return 'macOS';
    if (/(ios|iphone|ipad)/.test(s))                                                                                         return 'iOS';
    if (/(android)/.test(s))                                                                                                 return 'Android';
    if (/(freebsd|openbsd|netbsd|bsd)/.test(s))                                                                              return 'BSD';
    if (/(cisco|ios-xe|nx-os|junos|mikrotik|routeros|pfsense|opnsense)/.test(s))                                             return 'Network OS';
    if (/(esxi|vmware|hyper-?v|xen)/.test(s))                                                                                return 'Hypervisor';
    return null;
};

// ─── Format uptime: accepts seconds, ms-since-epoch boot ts, or
// pre-formatted strings. Returns a short human-readable label or null
// when we genuinely don't know.
const formatUptime = (raw) => {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'string' && !/^\d+(\.\d+)?$/.test(raw.trim())) {
        return raw; // already formatted ("3d 4h", "up 5 days, ...")
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Heuristic: huge values are ms-since-epoch boot times; convert to seconds-since-boot.
    let secs = n;
    if (n > 1e10) secs = Math.max(0, Math.floor((Date.now() - n) / 1000));
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

// ─── Normalize an asset/device into the topology node shape, filling in
// derived OS family and uptime so the detail panel never shows blanks
// just because the backend was sparse.
const normalizeDeviceDetails = (raw = {}) => {
    const out = { ...raw };
    if (!out.os_family) {
        const inferred = inferOsFamily(out.os_name);
        if (inferred) out.os_family = inferred;
    }
    const fmtUp = formatUptime(out.uptime ?? out.uptime_seconds ?? out.boot_time);
    if (fmtUp) out.uptime = fmtUp;
    return out;
};

// ─── Merge fetched detail into existing details without clobbering
// already-populated fields with null/undefined/empty values. The async
// asset-detail endpoint is sparse for lab targets, so we keep the rich
// values we already injected and only fill in genuinely new data.
const mergeDetailPreserving = (base = {}, incoming = {}) => {
    const out = { ...base };
    for (const [k, v] of Object.entries(incoming)) {
        if (v == null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        if (Array.isArray(v) && v.length === 0 && Array.isArray(base[k]) && base[k].length > 0) continue;
        out[k] = v;
    }
    return out;
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
            { id:'d1', name:'WEB-01',   ip:'10.10.10.10', group:'server',   riskScore:88, criticality:'CRITICAL', vulnCount:7, infoCount:0, val:16, scanned:true },
            { id:'d2', name:'API-GW',   ip:'10.10.10.20', group:'router',   riskScore:55, criticality:'MEDIUM',   vulnCount:3, infoCount:0, val:16, scanned:true },
            { id:'d3', name:'DNS-SVR',  ip:'10.10.10.30', group:'router',   riskScore:45, criticality:'MEDIUM',   vulnCount:2, infoCount:0, val:16, scanned:true },
        ]},
        CORP: { meta: { name: 'CORP', cidr: '10.10.20.0/24', icon: '🏢' }, devices: [
            { id:'d4', name:'FILE-SVR', ip:'10.10.20.10', group:'server',   riskScore:72, criticality:'HIGH',     vulnCount:4, infoCount:0, val:16, scanned:true },
            { id:'d5', name:'MAIL-SVR', ip:'10.10.20.20', group:'server',   riskScore:62, criticality:'HIGH',     vulnCount:3, infoCount:0, val:16, scanned:true },
            { id:'d6', name:'WS-01',    ip:'10.10.20.40', group:'desktop',  riskScore:35, criticality:'MEDIUM',   vulnCount:1, infoCount:0, val:16, scanned:true },
        ]},
        DATA: { meta: { name: 'DATA', cidr: '10.10.30.0/24', icon: '🗄' }, devices: [
            { id:'d7', name:'DB-01',    ip:'10.10.30.10', group:'database', riskScore:88, criticality:'CRITICAL', vulnCount:6, infoCount:0, val:16, scanned:true },
            { id:'d8', name:'REDIS',    ip:'10.10.30.20', group:'database', riskScore:80, criticality:'CRITICAL', vulnCount:5, infoCount:0, val:16, scanned:true },
        ]},
        MGMT: { meta: { name: 'MGMT', cidr: '10.10.40.0/24', icon: '📡' }, devices: [
            { id:'d9',  name:'TRAF-GEN', ip:'10.10.40.10', group:'server', riskScore:10, criticality:'LOW', vulnCount:0, infoCount:0, val:16, scanned:true },
            { id:'d10', name:'LOG-SHIP', ip:'10.10.40.20', group:'server', riskScore:10, criticality:'LOW', vulnCount:0, infoCount:0, val:16, scanned:true },
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
    // Tier counts come from the shared classifier so the subnet panel and
    // the canvas never disagree about what colour a device is.
    const tiers = subnetDevices.map(classifySeverity);
    const critCount    = tiers.filter(t => t.tier === 'critical').length;
    const highCount    = tiers.filter(t => t.tier === 'high').length;
    const medCount     = tiers.filter(t => t.tier === 'medium').length;
    const lowCount     = tiers.filter(t => t.tier === 'low').length;
    const secureCount  = tiers.filter(t => t.tier === 'secure').length;
    const offlineCount = tiers.filter(t => t.tier === 'offline').length;
    const unknownCount = tiers.filter(t => t.tier === 'unknown').length;
    const safeCount    = secureCount + lowCount; // legacy "healthy" bucket
    const avgRisk    = subnetDevices.length
        ? Math.round(subnetDevices.reduce((s, d) => s + (d.riskScore || 0), 0) / subnetDevices.length)
        : 0;
    const riskColor  = avgRisk >= 75 ? SEVERITY.critical.color
                     : avgRisk >= 50 ? SEVERITY.high.color
                     : avgRisk >= 20 ? SEVERITY.medium.color
                     : avgRisk >  0  ? SEVERITY.low.color
                     : SEVERITY.secure.color;

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
                        { label: 'Vulns',    value: totalVulns, color: totalVulns > 0 ? SEVERITY.high.color : SEVERITY.secure.color },
                        { label: 'Avg Risk', value: `${avgRisk}%`, color: riskColor },
                        { label: 'Critical', value: critCount, color: critCount > 0 ? SEVERITY.critical.color : SEVERITY.secure.color },
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
                            {critCount    > 0 && <div style={{ flex: critCount,    background: SEVERITY.critical.color, borderRadius: 4 }} />}
                            {highCount    > 0 && <div style={{ flex: highCount,    background: SEVERITY.high.color,     borderRadius: 4 }} />}
                            {medCount     > 0 && <div style={{ flex: medCount,     background: SEVERITY.medium.color,   borderRadius: 4 }} />}
                            {lowCount     > 0 && <div style={{ flex: lowCount,     background: SEVERITY.low.color,      borderRadius: 4 }} />}
                            {secureCount  > 0 && <div style={{ flex: secureCount,  background: SEVERITY.secure.color,   borderRadius: 4 }} />}
                            {offlineCount > 0 && <div style={{ flex: offlineCount, background: SEVERITY.offline.color,  borderRadius: 4 }} />}
                            {unknownCount > 0 && <div style={{ flex: unknownCount, background: SEVERITY.unknown.color,  borderRadius: 4 }} />}
                        </div>
                        <div className="flex justify-between text-xs mt-1.5 flex-wrap gap-x-2">
                            <span style={{ color: SEVERITY.critical.color }}>{critCount} crit</span>
                            <span style={{ color: SEVERITY.high.color }}>{highCount} high</span>
                            <span style={{ color: SEVERITY.medium.color }}>{medCount} med</span>
                            <span style={{ color: SEVERITY.low.color }}>{lowCount} low</span>
                            <span style={{ color: SEVERITY.secure.color }}>{secureCount} safe</span>
                            {offlineCount > 0 && <span style={{ color: SEVERITY.offline.color }}>{offlineCount} off</span>}
                            {unknownCount > 0 && <span style={{ color: SEVERITY.unknown.color }}>{unknownCount} ?</span>}
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
                            const t   = classifySeverity(dev);
                            const rc  = t.color;
                            const lbl = t.tier === 'critical' ? 'CRIT'
                                      : t.tier === 'high'     ? 'HIGH'
                                      : t.tier === 'medium'   ? 'MED'
                                      : t.tier === 'low'      ? 'LOW'
                                      : t.tier === 'offline'  ? 'OFF'
                                      : t.tier === 'unknown'  ? '?'
                                      : 'SAFE';
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
    // Pull the same live KPI counts that the Vulnerability Severity
    // Distribution widget reads, so the topology legend's
    // critical/high/medium/low chips always match what the rest of the
    // dashboard reports. Without this, the legend was counting *nodes*
    // grouped by demo-tier classification, which diverged from real
    // vulnerability counts.
    const { state: realTimeState } = useRealTime();
    // Start empty — real data loads fast; DEMO_GRAPH caused a 1-second
    // flash of fake data that confused users when real data overwrote it.
    const [graphData, setGraphData]       = useState({ nodes: [], links: [] });
    const [dataLoading, setDataLoading]   = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Last successful refresh — drives the "updated Ns ago" badge in the UI.
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    // Brief "Syncing…" indicator shown in the title bar while a post-scan
    // auto-refresh is in flight, so the user actually SEES the topology
    // re-generate after every scan instead of it silently changing.
    const [isSyncing, setIsSyncing] = useState(false);
    const syncTimerRef = useRef(null);
    // Ticks every 10s so the "updated Ns ago" label stays current without
    // re-rendering the entire force-graph on every animation frame.
    const [nowTick, setNowTick] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTick(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);
    // Start with safe fallback dimensions; ResizeObserver will update them
    const [dims, setDims] = useState({ w: 900, h: compact ? 270 : 410 });
    const fgRef        = useRef();
    const graphAreaRef = useRef();
    const fitTimer     = useRef(null);
    // Track last known assets keyed by IP for incremental updates
    const assetCacheRef = useRef({});
    // Mirror of graphData accessible from stable callbacks (avoids stale
    // closure problems when the scan-complete listener fires across renders).
    const graphDataRef = useRef(graphData);
    useEffect(() => { graphDataRef.current = graphData; }, [graphData]);

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
        setDataLoading(true);
        try {
            const { data: assets } = await networkService.getAssets();
            if (assets?.length > 0) { transformDataToGraph(assets); setLastUpdatedAt(Date.now()); return; }
            const { data: labData } = await labService.getTargets();
            if (labData?.targets?.length > 0) { transformLabTargetsToGraph(labData.targets); setLastUpdatedAt(Date.now()); return; }
            // Both APIs empty — show demo so the canvas is never blank
            setGraphData(DEMO_GRAPH);
            setLastUpdatedAt(Date.now());
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[Topology] initial fetch failed:', err?.message || err);
            try {
                const { data: labData } = await labService.getTargets();
                if (labData?.targets?.length > 0) {
                    transformLabTargetsToGraph(labData.targets);
                    setLastUpdatedAt(Date.now());
                    return;
                }
            } catch (err2) {
                // eslint-disable-next-line no-console
                console.warn('[Topology] lab fallback failed:', err2?.message || err2);
            }
            setGraphData(DEMO_GRAPH);
            setLastUpdatedAt(Date.now());
        } finally {
            setDataLoading(false);
        }
    };

    // Incremental update: only mutate nodes that actually changed.
    // New devices or new subnets trigger a full rebuild; existing changed
    // nodes are updated in-place so graph positions are preserved.
    // Reads graphData via ref so the callback can stay stable across renders
    // — that lets the scan-complete listener bind once instead of rebinding
    // every time the graph mutates.
    const patchGraphFromAssets = useCallback(async () => {
        try {
            const { data: assets } = await networkService.getAssets();
            if (!assets?.length) return;

            const cache = assetCacheRef.current;
            const currentNodes = graphDataRef.current.nodes;

            // Check if the set of IPs changed (new device appeared / disappeared)
            const incomingIPs = new Set(assets.map(a => a.ip_address));
            const cachedIPs   = new Set(Object.keys(cache));
            const topologyChanged =
                incomingIPs.size !== cachedIPs.size ||
                [...incomingIPs].some(ip => !cachedIPs.has(ip));

            if (topologyChanged) {
                // Full rebuild — new/removed devices need fresh layout positions.
                // Requirement 1: a device discovered in the latest scan appears
                // here automatically. Stamp lastUpdatedAt so the "updated Ns ago"
                // badge reflects the addition (the rebuild path used to skip it).
                transformDataToGraph(assets);
                setLastUpdatedAt(Date.now());
                doFit();
                return;
            }

            // Same devices — patch only the nodes whose fields changed
            let anyChanged = false;
            let anyUnmatched = false;
            assets.forEach(asset => {
                const prev = cache[asset.ip_address];
                if (!prev) return;
                // Fields that matter for visual rendering OR for the detail
                // panel/tooltip. Requirement 3: the node must always reflect the
                // device's *latest status* — so a change to ports, last_seen,
                // device type or hostname refreshes the node too, not just
                // risk/severity changes.
                const changed =
                    prev.vuln_count  !== asset.vuln_count  ||
                    prev.risk_score  !== asset.risk_score  ||
                    prev.criticality !== asset.criticality ||
                    prev.status      !== asset.status      ||
                    prev.os_name     !== asset.os_name     ||
                    prev.open_ports  !== asset.open_ports  ||
                    prev.last_seen   !== asset.last_seen   ||
                    prev.device_type !== asset.device_type ||
                    prev.hostname    !== asset.hostname;
                if (!changed) return;

                // Match by IP first, then fall back to hostname — lab-imported
                // graphs use the FQDN as `node.ip`, so an IP-only match misses
                // and the scan would silently never recolour those nodes.
                const node = currentNodes.find(n =>
                    n.ip === asset.ip_address ||
                    n.ip === asset.hostname   ||
                    n.name === asset.hostname
                );
                if (!node) { anyUnmatched = true; return; }
                node.vulnCount   = asset.vuln_count  || 0;
                node.infoCount   = asset.info_count  || 0;
                // Use the same derivation as the rebuild path so a scan that
                // bumps vuln_count immediately escalates the node's colour,
                // even when the backend hasn't recomputed risk_score yet.
                node.riskScore   = deriveEffectiveRisk(asset);
                node.criticality = asset.criticality || node.criticality;
                node.status      = asset.status      || node.status;
                // Reflect a re-classified device type (icon) and a resolved
                // hostname so the node's shape + label track the latest scan.
                node.group       = determineGroup(asset);
                if (asset.hostname) node.name = asset.hostname;
                node.scanned     = true;
                node.details     = normalizeDeviceDetails({ ...node.details, ...asset });
                cache[asset.ip_address] = asset;
                anyChanged = true;
            });

            // If anything changed visually, push a new wrapper so React + the
            // force-graph component see the update. If lab-style nodes failed
            // to match by hostname too, fall back to a full rebuild from the
            // canonical asset list so the user always sees fresh scan results.
            if (anyChanged) {
                setGraphData(prev => ({ nodes: prev.nodes, links: prev.links }));
                setLastUpdatedAt(Date.now());
            } else if (anyUnmatched) {
                transformDataToGraph(assets);
                setLastUpdatedAt(Date.now());
            }
        } catch (err) {
            // Surface the failure in the console so a dropped WebSocket /
            // failing backend doesn't fail silently. The polling fallback
            // below will retry on the next tick.
            // eslint-disable-next-line no-console
            console.warn('[Topology] patch failed:', err?.message || err);
        }
    }, []);

    // Auto hard-refresh after a scan completes. Shows a visible "Syncing…"
    // cue, then re-reads the canonical asset list so the topology adds new
    // devices, drops none as duplicates (backend already reconciled them),
    // and repaints every node's latest status. A second delayed pass guards
    // against any Redis/commit lag between the scan finishing and the assets
    // being queryable.
    const refreshFromScan = useCallback(() => {
        clearTimeout(syncTimerRef.current);
        setIsSyncing(true);
        Promise.resolve(patchGraphFromAssets()).finally(() => {
            syncTimerRef.current = setTimeout(() => {
                Promise.resolve(patchGraphFromAssets()).finally(() => setIsSyncing(false));
            }, 1500);
        });
    }, [patchGraphFromAssets]);

    // Listen for scan-complete events — patch only changed nodes
    useEffect(() => {
        const handler = () => refreshFromScan();
        window.addEventListener('dashboard:scan-complete', handler);
        return () => window.removeEventListener('dashboard:scan-complete', handler);
    }, [refreshFromScan]);

    // Clear any pending sync timer on unmount.
    useEffect(() => () => clearTimeout(syncTimerRef.current), []);

    useEffect(() => { fetchData(); }, [refresh]);

    // Polling fallback — if the WebSocket drops or a scan happens outside
    // this tab's session, we still pick up changes within 30s. Skipped while
    // tab is hidden to avoid burning battery / API quota for no benefit.
    useEffect(() => {
        const POLL_MS = 30_000;
        const tick = () => {
            if (document.hidden) return;
            patchGraphFromAssets();
        };
        const id = setInterval(tick, POLL_MS);
        // Catch up immediately when the tab becomes visible again so the
        // user isn't staring at a frozen graph after returning from another tab.
        const onVis = () => { if (!document.hidden) patchGraphFromAssets(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [patchGraphFromAssets]);

    // Map lab target objects into tree graph
    const transformLabTargetsToGraph = (targets) => {
        const zoneMap = {};
        targets.forEach((t) => {
            // Infer device group from protocol AND name so different device
            // types get distinct icons rather than all appearing as 'server'.
            const _name  = (t.name || t.hostname || '').toLowerCase();
            const _proto = (t.protocol || '').toLowerCase();
            let group = 'server';
            if (_proto === 'dns' || _name.includes('dns'))
                group = 'router';
            else if (_proto === 'postgresql' || _proto === 'redis' || _proto === 'mysql' || _proto === 'mongodb'
                || _name.includes('redis') || _name.includes('postgres') || _name.includes('mysql')
                || _name.includes('mongo') || _name.includes('db') || _name.includes('database'))
                group = 'database';
            else if (_name.includes('router') || _name.includes('gateway') || _name.includes('-gw')
                || _name.includes('_gw') || _name.includes('api-gw') || _name.includes('api_gateway')
                || _name.includes('api-gateway'))
                group = 'router';
            else if (_name.includes('firewall') || _name.includes('-fw') || _name.includes('_fw'))
                group = 'firewall';
            else if (_name.includes('workstation') || _name.includes('desktop') || _name.includes('-ws')
                || _name.includes('_ws') || _name.includes('laptop'))
                group = 'desktop';
            else if (_name.includes('mobile') || _name.includes('phone') || _name.includes('tablet'))
                group = 'mobile';

            const riskScore  = (t.cvss || 0) * 10;
            const criticality = t.cvss >= 9 ? 'CRITICAL' : t.cvss >= 7 ? 'HIGH' : t.cvss >= 4 ? 'MEDIUM' : 'LOW';
            const zone       = inferZone(t.hostname);
            const zid        = t.zone?.toUpperCase() || zone.id;

            if (!zoneMap[zid]) zoneMap[zid] = { meta: { name: zid, cidr: zone.cidr, icon: zone.icon || '🔷' }, devices: [] };
            const labDetails = normalizeDeviceDetails({
                ip_address:  t.hostname,
                hostname:    t.name,
                device_type: group,
                os_name:     t.os || null,
                os_family:   t.os_family || null,
                mac_address: t.mac_address || null,
                mac_vendor:  t.mac_vendor  || null,
                uptime:      t.uptime || t.uptime_seconds || null,
                status:      t.status || 'active',
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
            });
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
                scanned:     true,
                details:     labDetails,
            });
        });
        setGraphData(buildTreeGraph(zoneMap));
        setDataLoading(false);
    };

    const transformDataToGraph = (assets) => {
        if (!Array.isArray(assets) || assets.length === 0) return;
        // Rebuild cache
        const newCache = {};
        assets.forEach(a => { newCache[a.ip_address] = a; });
        assetCacheRef.current = newCache;

        const zoneMap = {};
        assets.forEach((asset) => {
            const zone = inferZone(asset.ip_address);
            if (!zoneMap[zone.id]) zoneMap[zone.id] = { meta: { name: zone.name, cidr: zone.cidr, icon: zone.icon || '🔷' }, devices: [] };
            const normalized = normalizeDeviceDetails(asset);
            const scanned = (
                asset.last_scan_at != null ||
                asset.last_scanned_at != null ||
                asset.scanned === true ||
                (Array.isArray(asset.services) && asset.services.length > 0) ||
                asset.os_name != null ||
                asset.os_family != null
            );
            const vulnCount     = asset.vuln_count || 0;
            const effectiveRisk = deriveEffectiveRisk(asset);
            zoneMap[zone.id].devices.push({
                id:          asset.id || asset.ip_address,
                name:        asset.hostname || asset.ip_address,
                ip:          asset.ip_address,
                group:       determineGroup(asset),
                vulnCount,
                infoCount:   asset.info_count  || 0,
                val:         10,
                riskScore:   effectiveRisk,
                criticality: asset.criticality || 'LOW',
                scanned,
                details:     normalized,
            });
        });
        setGraphData(buildTreeGraph(zoneMap));
        setDataLoading(false);
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
                        ? { ...prev, details: normalizeDeviceDetails(mergeDetailPreserving(prev.details || {}, detail)), vulnCount: detail.vuln_count || prev.vulnCount || 0, infoCount: detail.info_count || prev.infoCount || 0, scanned: true }
                        : prev
                );
            } catch (err) {
                // Detail fetch is enrichment, not blocking — log so we know
                // when it silently fails (e.g. backend 500 on this asset).
                // eslint-disable-next-line no-console
                console.warn('[Topology] asset detail fetch failed:', err?.message || err);
            }
        } else if (node.ip) {
            // String ID (lab target) — find matching asset by IP then fetch detail
            try {
                const { data: assets } = await networkService.getAssets();
                const match = assets?.find(a => a.ip_address === node.ip);
                if (match && typeof match.id === 'number') {
                    const { data: detail } = await networkService.getAssetDetail(match.id);
                    setSelectedNode(prev =>
                        prev?.id === node.id
                            ? { ...prev, details: normalizeDeviceDetails(mergeDetailPreserving(prev.details || {}, detail)), vulnCount: detail.vuln_count || prev.vulnCount || 0, infoCount: detail.info_count || prev.infoCount || 0 }
                            : prev
                    );
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[Topology] asset lookup-by-ip failed:', err?.message || err);
            }
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

        // When zoomed out (scale < 1): maintain minimum canvas size so nodes
        // don't vanish. When zoomed in (scale > 1): PX = 1, so all sizes are
        // in fixed graph units and the node grows proportionally with zoom,
        // letting the user actually read the label at high magnification.
        const PX = 1 / Math.min(globalScale, 1);

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
        const sev      = classifySeverity(node);
        const color    = sev.color;
        const isHub    = node.id === 'hub';
        const isOffline = sev.tier === 'offline';
        const isCrit   = sev.tier === 'critical';
        const isRisk   = isCrit || sev.tier === 'high';
        const t        = Date.now() / 800;

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
            ctx.fillStyle = bg;
            ctx.globalAlpha = isOffline ? 0.55 : 1;
            ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = (isCrit ? 2.5 : isRisk ? 2 : 1.8) * PX;
            if (isOffline) ctx.setLineDash([4 * PX, 3 * PX]);
            ctx.stroke();
            if (isOffline) ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.moveTo(node.x - half * 0.6, node.y - half + 1.2 * PX);
            ctx.lineTo(node.x + half * 0.6, node.y - half + 1.2 * PX);
            ctx.strokeStyle = `${color}30`; ctx.lineWidth = 1.5 * PX; ctx.stroke();

            ctx.shadowBlur  = 0;
            ctx.globalAlpha = isRisk ? 1 : 0.82;
            drawDeviceIcon(ctx, node.group || 'desktop', node.x, node.y, half, color);
            ctx.globalAlpha = 1;

            // ── Secure device badge (green shield ✓) ─────────────
            // Drawn over the bottom-right corner of the device box when
            // isSecureDevice(node) returns true. A soft halo behind the
            // node further differentiates safe devices at a glance.
            if (isSecureDevice(node)) {
                const safe = SEVERITY.secure.color;
                // soft outer halo
                ctx.save();
                ctx.shadowColor = safe;
                ctx.shadowBlur  = 14 * PX;
                ctx.beginPath();
                ctx.arc(node.x, node.y, half * 1.55, 0, Math.PI * 2);
                ctx.strokeStyle = `${safe}55`;
                ctx.lineWidth = 1.2 * PX;
                ctx.stroke();
                ctx.restore();

                // badge circle at bottom-right
                const bx = node.x + half - 1 * PX;
                const by = node.y + half - 1 * PX;
                const br = 5 * PX;
                ctx.save();
                ctx.shadowColor = safe;
                ctx.shadowBlur  = 6 * PX;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fillStyle   = safe;
                ctx.fill();
                ctx.strokeStyle = '#003a20';
                ctx.lineWidth   = 0.8 * PX;
                ctx.stroke();
                ctx.shadowBlur  = 0;
                // checkmark
                ctx.beginPath();
                ctx.moveTo(bx - br * 0.45, by + br * 0.05);
                ctx.lineTo(bx - br * 0.10, by + br * 0.40);
                ctx.lineTo(bx + br * 0.55, by - br * 0.40);
                ctx.strokeStyle = '#022e1a';
                ctx.lineWidth   = 1.4 * PX;
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';
                ctx.stroke();
                ctx.restore();
            }
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

    // Severity tier counts for the legend chip.
    //
    // critical/high/medium/low come from the global KPI snapshot — the same
    // source the Vulnerability Severity Distribution widget reads — so the
    // legend agrees with the rest of the dashboard. secure/offline/unknown
    // are still derived from the graph because they describe *node state*,
    // not vulnerabilities, and have no equivalent KPI counter.
    const kpiCounts = realTimeState?.kpi?.counts || {};
    const severityCounts = useMemo(() => {
        const acc = {
            critical: kpiCounts.critical || 0,
            high:     kpiCounts.high     || 0,
            medium:   kpiCounts.medium   || 0,
            low:      kpiCounts.low      || 0,
            secure:   0,
            offline:  0,
            unknown:  0,
        };
        graphData.nodes.forEach(n => {
            if (n.id === 'hub' || n.isSubnet) return;
            const tier = classifySeverity(n).tier;
            if (tier === 'secure' || tier === 'offline' || tier === 'unknown') {
                acc[tier] += 1;
            }
        });
        return acc;
    }, [graphData.nodes, kpiCounts.critical, kpiCounts.high, kpiCounts.medium, kpiCounts.low]);

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
                        {isSyncing ? (
                            <span
                                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ml-2"
                                style={{ color: '#00ffff' }}
                                title="Re-generating topology from the latest scan"
                            >
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                Syncing…
                            </span>
                        ) : lastUpdatedAt && (
                            <span
                                className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ml-2"
                                style={{ color: 'rgba(0,255,255,0.55)' }}
                                title={new Date(lastUpdatedAt).toLocaleString()}
                            >
                                · updated {formatRelativeTime(lastUpdatedAt, nowTick)}
                            </span>
                        )}
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
                        <TopologyLegend counts={severityCounts} />
                    </div>

                    {/* Loading overlay — shown while first fetch is in-flight */}
                    {dataLoading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
                             style={{ background: 'rgba(12,28,37,0.85)', backdropFilter: 'blur(4px)' }}>
                            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                                Loading topology…
                            </span>
                        </div>
                    )}

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
                            const sev = classifySeverity(node);
                            const rc  = sev.color;
                            const lbl = sev.label.toUpperCase();
                            const eff = Number(node.riskScore) || 0;
                            const v   = node.vulnCount || 0;
                            const prefix = sev.tier === 'secure' ? '✓ ' : sev.tier === 'offline' ? '⏻ ' : '';
                            const footer = sev.tier === 'secure'  ? `<div style="margin-top:8px;font-size:10px;color:${rc};font-weight:700">✓ Scanned · no vulns</div>`
                                         : sev.tier === 'offline' ? `<div style="margin-top:8px;font-size:10px;color:${rc};font-weight:700">⏻ Host did not respond to last scan</div>`
                                         : sev.tier === 'unknown' ? `<div style="margin-top:8px;font-size:10px;color:${rc};font-weight:600">No scan data yet — run a scan to populate risk</div>`
                                         : '';
                            return `<div style="padding:12px;background:rgba(2,9,15,0.97);border:1px solid ${rc}44;border-radius:10px;font-family:Outfit,sans-serif;min-width:180px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><div style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase">${node.name}</div><div style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${rc}22;border:1px solid ${rc}66;color:${rc}">${prefix}${lbl}</div></div><div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:8px">${node.ip || 'INTERNAL'}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:10px;color:rgba(255,255,255,0.5)">Risk</span><span style="font-size:11px;font-weight:800;color:${rc}">${eff}%</span></div><div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden"><div style="height:100%;width:${eff}%;background:${rc};border-radius:2px"></div></div>${v > 0 ? `<div style="margin-top:8px;font-size:10px;color:${rc}">⚠ ${v} vuln${v === 1 ? '' : 's'}</div>` : ''}${footer}</div>`;
                        }}
                        linkColor={(link) => link.value >= 3 ? 'rgba(0,255,255,0.45)' : 'rgba(0,255,255,0.14)'}
                        linkWidth={(link) => link.value >= 3 ? 2.5 : 1.2}
                        linkDirectionalParticles={(link) => link.value >= 3 ? 4 : 2}
                        linkDirectionalParticleWidth={(link) => link.value >= 3 ? 2.5 : 1.5}
                        linkDirectionalParticleColor={(link) => {
                            if (link.value >= 3) return '#00ffff';
                            const r = (typeof link.target === 'object' ? link.target?.riskScore : 0) || 0;
                            return r >= 75 ? SEVERITY.critical.color
                                 : r >= 50 ? SEVERITY.high.color
                                 : r >= 20 ? SEVERITY.medium.color
                                 : '#00ffff';
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
