# found 404 — Enhanced Full Dashboard Redesign
**Status**: Ready for Implementation  
**Scope**: Complete visual overhaul with advanced cyber-systemic aesthetic, motion design, and data visualization mastery.

---

## 0. Executive Summary

Your current dashboard has strong bones. This enhanced plan retains the working layout while elevating:
- **Deeper visual hierarchy** with layered transparency and depth
- **Advanced micro-interactions** (scanline effects, data pulse animations, glitch on alert)
- **Sophisticated data viz** (animated gauges, real-time particle streams, heatmap overlays)
- **Typography-first design** with distinctive font pairing
- **Immersive network topology** with physics-based node interactions
- **Responsive animations** that build narrative momentum

---

## 1. Enhanced Design System

### 1.1 Color Tokens (Refined Palette)
```js
// tailwind.config.js - Advanced Color System
cyber: {
  // Primaries
  bg:         '#01050a',    // Ultra-dark obsidian (darker than #02090f)
  surface:    '#0f1922',    // Card/panel surface (elevated)
  accent:     '#00ffff',    // Bright cyan (from #22d3ee, brighter for pop)
  
  // Risk Gradient
  safe:       '#00ff88',    // Vibrant green
  medium:     '#ffaa00',    // Warm amber (warning)
  critical:   '#ff0055',    // Hot magenta-red (danger > pure red)
  
  // UI Elements
  muted:      '#1a2332',    // Dividers & borders
  ghost:      '#0a1118',    // Subtle backgrounds
  
  // Glow/Shadow Tints (for layered depth)
  glowCyan:   'rgba(0, 255, 255, 0.15)',
  glowRed:    'rgba(255, 0, 85, 0.2)',
  glowGreen:  'rgba(0, 255, 136, 0.15)',
}

// New: Glow intensity layers
glowLayers: {
  low:   { blur: 8px,  opacity: 0.2 },
  mid:   { blur: 16px, opacity: 0.35 },
  high:  { blur: 24px, opacity: 0.5 },
  extreme: { blur: 32px, opacity: 0.6 }, // Critical alerts
}
```

### 1.2 Advanced Utilities & Effects
```css
/* Global Styles - index.css */

:root {
  --transition-fast: 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-smooth: 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-slow: 600ms cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* Glass Morphism - Multi-layered depth */
.glass-card {
  background: linear-gradient(135deg, rgba(15, 25, 34, 0.8), rgba(10, 17, 24, 0.9));
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(0, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 8px 32px rgba(0, 0, 0, 0.4);
}

.glass-card:hover {
  border-color: rgba(0, 255, 255, 0.25);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 48px rgba(0, 255, 255, 0.15);
  transition: all var(--transition-smooth);
}

/* Node Box - Network Topology */
.node-box {
  background: rgba(15, 25, 34, 0.85);
  border: 2px solid rgba(0, 255, 255, 0.5);
  border-radius: 20px;
  box-shadow: 
    0 0 12px rgba(0, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: all var(--transition-smooth);
}

.node-box:hover {
  border-color: rgba(0, 255, 255, 0.8);
  box-shadow: 
    0 0 24px rgba(0, 255, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Glow Effects - Tiered */
.glow-cyan {
  box-shadow: 0 0 18px rgba(0, 255, 255, 0.45);
}

.glow-cyan-intense {
  box-shadow: 
    0 0 18px rgba(0, 255, 255, 0.45),
    0 0 36px rgba(0, 255, 255, 0.3),
    inset 0 0 24px rgba(0, 255, 255, 0.08);
}

.glow-red {
  box-shadow: 0 0 18px rgba(255, 0, 85, 0.5);
  animation: pulse-red 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.glow-amber {
  box-shadow: 0 0 18px rgba(255, 170, 0, 0.4);
  animation: pulse-amber 2s ease-in-out infinite;
}

.glow-green {
  box-shadow: 0 0 18px rgba(0, 255, 136, 0.35);
}

/* Scanline Effect - Cyber Immersion */
@keyframes scanline {
  0% { top: -100%; opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { top: 100%; opacity: 0.3; }
}

.scanline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(0, 255, 255, 0.5), 
    transparent);
  animation: scanline 6s linear infinite;
  pointer-events: none;
}

/* Pulse Animations */
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 18px rgba(255, 0, 85, 0.5); }
  50% { box-shadow: 0 0 36px rgba(255, 0, 85, 0.8); }
}

@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 18px rgba(255, 170, 0, 0.4); }
  50% { box-shadow: 0 0 28px rgba(255, 170, 0, 0.6); }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 18px rgba(0, 255, 136, 0.35); }
  50% { box-shadow: 0 0 28px rgba(0, 255, 136, 0.55); }
}

/* Data Stream Animation - for live feeds */
@keyframes data-flow {
  0% { 
    background-position: 0% 0%;
    opacity: 0;
  }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% {
    background-position: 100% 0%;
    opacity: 0;
  }
}

.data-stream {
  position: relative;
  overflow: hidden;
}

.data-stream::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    rgba(0, 255, 255, 0.3),
    transparent);
  animation: data-flow 2s ease-in-out infinite;
  pointer-events: none;
}

/* Glitch Effect - for critical alerts */
@keyframes glitch-x {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@keyframes glitch-y {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(1px); }
  75% { transform: translateY(-1px); }
}

.glitch-alert {
  animation: glitch-x 150ms, glitch-y 150ms 75ms;
  animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Input Styling */
.cyber-input {
  background: rgba(10, 17, 24, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  padding: 12px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  transition: all var(--transition-fast);
}

.cyber-input:focus {
  background: rgba(15, 25, 34, 0.8);
  border-color: rgba(0, 255, 255, 0.6);
  box-shadow: 
    0 0 20px rgba(0, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  outline: none;
}

.cyber-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* Separator - Cyber Divider */
.cyber-divider {
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(0, 255, 255, 0.2),
    transparent);
  margin: 16px 0;
}

/* Badge/Tag System */
.cyber-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: 1px solid currentColor;
  transition: all var(--transition-fast);
}

.badge-safe {
  color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.4);
}

.badge-medium {
  color: #ffaa00;
  background: rgba(255, 170, 0, 0.1);
  border-color: rgba(255, 170, 0, 0.4);
}

.badge-critical {
  color: #ff0055;
  background: rgba(255, 0, 85, 0.1);
  border-color: rgba(255, 0, 85, 0.4);
  animation: pulse-red 1.5s ease-in-out infinite;
}

/* Typography Hierarchy */
body {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  background: #01050a;
}

h1 { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -1px; }
h2 { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
h3 { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }

code, pre { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
```

### 1.3 Typography Stack
| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Display/Headings** | Syne | 400, 700, 900 | H1, H2, section titles, dramatic emphasis |
| **UI/Labels** | Outfit | 400–700 | Buttons, nav, labels, body text |
| **Code/IPs** | JetBrains Mono | 400, 600 | IPs, CLI logs, terminal-like content |

---

## 2. Enhanced Network Topology (Reference-Matched, Upgraded)

### 2.1 Improved Node Rendering
The current screenshots show **circular nodes**. Your plan calls for **rounded squares**. We'll do rounded squares but add:
- **Physics-based gravity** (nodes attract/repel dynamically)
- **Risk-aware sizing** (critical nodes larger with more glow)
- **Icon glyph improvements** (custom SVG instead of text symbols)
- **Connection particle streams** (animated particles flowing along links)

```javascript
// NetworkTopology.jsx - Enhanced Implementation

nodeCanvasObject={(node, ctx, globalScale) => {
  if (node.x === undefined) return;
  
  const size = node.val * 0.85;
  const half = size;
  const r = size * 0.3; // corner radius (slightly larger for smoother look)
  const color = getNodeColor(node);
  
  // Risk score influences glow intensity
  const isRisky = node.riskScore > 50;
  const isCritical = node.riskScore > 75;
  
  // 1. OUTER GLOW LAYER (multi-step)
  ctx.shadowColor = color;
  ctx.shadowBlur = isCritical ? 32 : isRisky ? 20 : 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // 2. ROUNDED SQUARE BORDER (primary shape)
  ctx.beginPath();
  ctx.moveTo(node.x - half + r, node.y - half);
  ctx.arcTo(node.x + half, node.y - half, node.x + half, node.y + half, r);
  ctx.arcTo(node.x + half, node.y + half, node.x - half, node.y + half, r);
  ctx.arcTo(node.x - half, node.y + half, node.x - half, node.y - half, r);
  ctx.arcTo(node.x - half, node.y - half, node.x + half, node.y - half, r);
  ctx.closePath();
  
  // Fill with gradient for depth
  const gradient = ctx.createLinearGradient(node.x - half, node.y - half, node.x + half, node.y + half);
  gradient.addColorStop(0, 'rgba(15, 25, 34, 0.9)');
  gradient.addColorStop(1, 'rgba(10, 17, 24, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Border with dynamic thickness
  ctx.strokeStyle = color;
  ctx.lineWidth = (isCritical ? 3 : isRisky ? 2.5 : 2) / globalScale;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // 3. INNER HIGHLIGHT (top-left shine for depth)
  ctx.beginPath();
  ctx.moveTo(node.x - half + r, node.y - half);
  ctx.lineTo(node.x + half - r, node.y - half);
  ctx.arcTo(node.x + half, node.y - half, node.x + half, node.y + half, r);
  ctx.strokeStyle = `${color}20`;
  ctx.lineWidth = 1 / globalScale;
  ctx.stroke();
  
  // 4. DEVICE ICON (SVG-like, custom symbols)
  const iconMap = {
    gateway: '⊕',
    server: '▦',
    firewall: '⬡',
    desktop: '▣',
    mobile: '◈',
    database: '◉',
    cloud: '☁'
  };
  
  ctx.font = `bold ${size * 0.8}px 'JetBrains Mono'`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = isRisky ? 1 : 0.9;
  ctx.fillText(iconMap[node.group] || iconMap.desktop, node.x, node.y);
  ctx.globalAlpha = 1;
  
  // 5. ANIMATED PULSING RING (critical + high-risk nodes)
  if (isRisky) {
    const t = Date.now() / 800;
    const pulse = (Math.sin(t) + 1) / 2;
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, half * (1.2 + pulse * 0.4), 0, 2 * Math.PI);
    const alpha = isCritical ? (0.3 + pulse * 0.3) : (0.15 + pulse * 0.2);
    ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`;
    ctx.lineWidth = (isCritical ? 2 : 1.5) / globalScale;
    ctx.stroke();
  }
  
  // 6. LABEL (visible on hover or zoom)
  if (globalScale > 1.5 || selectedNode?.id === node.id) {
    const label = node.name;
    ctx.font = `600 ${10 / globalScale}px 'Outfit'`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, node.x, node.y + half + 14 / globalScale);
  }
}}
```

### 2.2 Link Enhancements (Particle Streams)
```javascript
// Animated particle flow along connections
linkColor={() => 'rgba(0, 255, 255, 0.15)'}
linkWidth={1.5}
linkDirectionalParticles={4}
linkDirectionalParticleWidth={2.5}
linkDirectionalParticleColor={(link) => {
  const targetRisk = link.target?.riskScore || 0;
  if (targetRisk > 75) return '#ff0055';
  if (targetRisk > 50) return '#ffaa00';
  return '#00ffff';
}}
linkDirectionalParticleSpeed={0.005}

// Add optional: animated dashes on links
linkCanvasObject={(link, ctx, globalScale) => {
  // Draw animated dashes on high-risk connections
  if (link.target?.riskScore > 50) {
    // Dash animation logic here
  }
}}
```

### 2.3 Legend Panel (Enhanced, Floating)
```jsx
const TopologyLegend = () => (
  <div className="absolute top-6 left-6 z-20 node-box p-4 space-y-3 max-w-xs">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Network Legend</p>
      <div className="w-2 h-2 rounded-full bg-cyan-400 glow-cyan animate-pulse"></div>
    </div>
    
    {[
      { color: '#00ffff', label: 'Gateway Hub', icon: '⊕' },
      { color: '#00ff88', label: 'Operational', icon: '▦' },
      { color: '#ffaa00', label: 'Warning', icon: '⬡' },
      { color: '#ff0055', label: 'Critical/Infected', icon: '◉' },
    ].map(({ color, label, icon }) => (
      <div key={label} className="flex items-center gap-2 group cursor-help">
        <div 
          className="w-3 h-3 rounded font-bold text-[10px] flex items-center justify-center text-black group-hover:scale-125 transition-transform"
          style={{ 
            background: color, 
            boxShadow: `0 0 12px ${color}80`,
            fontFamily: 'JetBrains Mono'
          }}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-tight">{label}</span>
      </div>
    ))}
    
    <div className="pt-2 border-t border-cyber-muted/50">
      <p className="text-[8px] text-gray-600 italic">Hover nodes for details • Drag to move • Scroll to zoom</p>
    </div>
  </div>
);
```

### 2.4 ForceGraph Configuration (Physics)
```javascript
<ForceGraph2D
  backgroundColor="#01050a"
  
  // Force-directed layout for natural spreading
  d3AlphaDecay={0.018}        // Slower decay = longer settling
  d3VelocityDecay={0.32}      // Friction between nodes
  d3Force="charge"
  d3AlphaMin={0.001}
  
  cooldownTicks={150}         // More ticks for smoother layout
  cooldownTime={5000}         // 5 second animation
  
  // Node interactions
  onNodeHover={handleNodeHover}
  onNodeClick={handleNodeClick}
  
  // Custom node size based on risk
  nodeVal={(node) => {
    const baseSize = node.riskScore > 50 ? 15 : 12;
    return baseSize + (node.connections?.length || 0) * 1.5;
  }}
  
  // Star layout (optional, for hub-and-spoke topology)
  dagMode={null}  // Remove if using force-directed
/>
```

---

## 3. Enhanced Dashboard Layout & Sections

### 3.1 Global Layout Structure (Refined)
```
┌─────────────────────────────────────────────────────┐
│ TOPBAR (64px)                                       │
│ Logo • Status Badge • Quick Scan • Clock • User     │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │ PAGE HEADER (breadcrumb + actions)       │
│ (64px    │ ┌────────────────────────────────────┐  │
│  icons   │ │ KPI STAT CARDS (4 pills)           │  │
│  +       │ │  Health • Vulns • Assets • Engine  │  │
│  labels) │ └────────────────────────────────────┘  │
│          │ TAB BAR (6 main tabs)                    │
│          │ ════════════════════════════════════   │
│          │                                          │
│          │ ─── ACTIVE TAB CONTENT ───              │
│          │ (varies by section)                     │
│          │                                          │
│          │ ┌────────────────────────────────────┐  │
│          │ │ LIVE CONSOLE DRAWER (collapsible) │  │
│          │ │ Real-time logs/alerts              │  │
│          │ └────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

### 3.2 Stat Cards (KPI Pills) — Enhanced
```jsx
// StatCards.jsx - Advanced animated counters + glow

const StatCard = ({ title, value, target, icon, color, trend }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  // Animated count-up from 0 to value
  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [value]);
  
  return (
    <div className="group relative overflow-hidden rounded-xl p-4 flex-1"
         style={{
           background: 'linear-gradient(135deg, rgba(15, 25, 34, 0.6), rgba(10, 17, 24, 0.8))',
           border: `2px solid ${color}30`,
           boxShadow: `0 0 20px ${color}15, inset 0 1px 0 rgba(255, 255, 255, 0.03)`
         }}>
      
      {/* Animated background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
           style={{
             background: `radial-gradient(circle at center, ${color}10, transparent)`,
             animation: 'pulse 2s ease-in-out infinite'
           }}/>
      
      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black" style={{ color }}>
              {displayValue}
            </span>
            {target && (
              <span className="text-xs text-gray-600">/ {target}</span>
            )}
          </div>
          {trend && (
            <p className="text-[10px] text-gray-500 mt-1">
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
            </p>
          )}
        </div>
        
        <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity"
             style={{ color }}>
          {icon}
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent"
           style={{ color, opacity: 0.5 }}/>
    </div>
  );
};

// Usage
<div className="grid grid-cols-4 gap-4 mb-6">
  <StatCard title="Security Health" value={85} target={100} icon="🛡️" color="#00ff88" trend={+12} />
  <StatCard title="Vulnerabilities" value={3} icon="⚠️" color="#ffaa00" trend={-2} />
  <StatCard title="Assets" value={42} icon="📡" color="#00ffff" trend={+5} />
  <StatCard title="Engine" value="IDLE" icon="⚡" color="#ff0055" />
</div>
```

### 3.3 Enhanced Gauge Ring (Risk Score)
```jsx
// GaugeRing.jsx - Animated circular arc gauge

import { useEffect, useRef } from 'react';

export const GaugeRing = ({ score = 85, max = 100, color = '#00ff88' }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    
    // Clear
    ctx.fillStyle = '#01050a';
    ctx.fillRect(0, 0, w, h);
    
    // Background arc (gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, (Math.PI * 1.5) + 0.001, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 12;
    ctx.stroke();
    
    // Progress arc
    const progress = (score / max) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + progress, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Text
    ctx.font = 'bold 48px Syne';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score, centerX, centerY - 10);
    
    ctx.font = '14px Outfit';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('SCORE', centerX, centerY + 30);
    
  }, [score, color]);
  
  return (
    <canvas 
      ref={canvasRef}
      width={280}
      height={280}
      className="w-full h-auto"
    />
  );
};
```

### 3.4 Tab 1: Command Center (Overview)
**Layout**: 3-column grid with advanced interactions

```jsx
<div className="grid grid-cols-12 gap-6">
  {/* Left Panel (3/12) */}
  <div className="col-span-3 space-y-4">
    {/* Risk Score Gauge */}
    <div className="glass-card p-6">
      <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">
        🛡️ Security Health
      </p>
      <GaugeRing score={85} max={100} color="#00ff88" />
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">OPERATIONAL</span>
          <span className="font-bold text-green-400">100/100</span>
        </div>
        <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-green-500 to-cyan-400"></div>
        </div>
      </div>
    </div>
    
    {/* Quick Scan Button */}
    <div className="glass-card p-4">
      <input type="text" placeholder="Enter target..." className="cyber-input mb-3 w-full" />
      <button className="cyber-button w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500">
        ⚡ Quick Scan
      </button>
    </div>
    
    {/* Activity Feed */}
    <div className="glass-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        📊 Activity (Last 24h)
      </p>
      <div className="space-y-2">
        {[
          { label: 'Scans Completed', value: '12', color: '#00ff88' },
          { label: 'Vulns Found', value: '3', color: '#ffaa00' },
          { label: 'Alerts', value: '1', color: '#ff0055' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span style={{ color }} className="font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
  
  {/* Center Panel (6/12) - Network Topology */}
  <div className="col-span-6">
    <div className="glass-card p-6 h-[600px]">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
        🌐 Live Network Topology
      </p>
      <NetworkTopology />
      <div className="scanline-overlay" />
    </div>
  </div>
  
  {/* Right Panel (3/12) - Action Center */}
  <div className="col-span-3 space-y-4">
    <div className="glass-card p-4 border-red-500/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-500 font-bold text-lg animate-pulse">🚨</span>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Urgent Actions
        </p>
      </div>
      <div className="space-y-2">
        {[
          { label: 'New Device: 172.30.0.10', severity: 'high' },
          { label: 'Scan Queued', severity: 'medium' },
        ].map((item, i) => (
          <div key={i} className="p-2 rounded bg-red-500/10 border-l-2 border-red-500/60 text-xs cursor-pointer hover:bg-red-500/20 transition">
            {item.label}
          </div>
        ))}
      </div>
    </div>
    
    {/* Quick Stats */}
    <div className="glass-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        📈 Summary
      </p>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Devices Online</span>
          <span className="text-cyan-400 font-bold">6</span>
        </div>
        <div className="flex justify-between">
          <span>Threats Detected</span>
          <span className="text-red-400 font-bold">1</span>
        </div>
        <div className="flex justify-between">
          <span>Last Scan</span>
          <span className="text-gray-400 font-bold">2h ago</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 3.5 Tab 2: Operations (Enhanced)

#### Scanner Sub-tab
```jsx
// Left: One-click CTA, Right: Risk Distribution Chart

<div className="grid grid-cols-3 gap-6">
  <div className="col-span-1">
    {/* ONE-CLICK SCAN */}
    <div className="glass-card p-8 flex flex-col items-center justify-center h-[400px] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" 
           style={{
             background: 'radial-gradient(circle, #00ffff 0%, transparent 70%)',
             animation: 'pulse 3s ease-in-out infinite'
           }}/>
      
      <div className="relative z-10 text-center">
        <button className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-4xl hover:scale-110 transition-transform shadow-lg hover:shadow-cyan-500/50 mb-4 group">
          ▶
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 group-hover:animate-pulse"/>
        </button>
        <h3 className="text-lg font-bold uppercase mt-4 tracking-tight">Full Scan</h3>
        <p className="text-xs text-gray-500 mt-2">Network Vulnerability<br/>Assessment</p>
      </div>
    </div>
    
    {/* AUTOMATED SCANNING */}
    <div className="glass-card p-4 mt-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">⏱️ Auto-Scan</p>
      <select className="cyber-input w-full mb-3">
        <option>Every Sunday</option>
        <option>Daily</option>
        <option>Weekly</option>
      </select>
      <input type="time" defaultValue="02:00" className="cyber-input w-full mb-3" />
      <button className="cyber-button w-full border border-cyan-500 hover:bg-cyan-500/20">
        Save Schedule
      </button>
    </div>
  </div>
  
  <div className="col-span-2">
    {/* RISK DISTRIBUTION DONUT CHART */}
    <div className="glass-card p-6 h-[400px] flex flex-col justify-center items-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 self-start">
        📊 Vulnerability Risk Distribution
      </p>
      <DonutChart 
        data={[
          { name: 'Safe', value: 78, color: '#00ff88' },
          { name: 'Medium', value: 15, color: '#ffaa00' },
          { name: 'Critical', value: 7, color: '#ff0055' },
        ]}
      />
    </div>
  </div>
</div>
```

#### History Sub-tab (Timeline View)
```jsx
// Timeline-style scan history with expandable cards

<div className="space-y-3">
  <div className="flex items-center gap-4 p-4 glass-card group cursor-pointer hover:border-cyan-500/50">
    {/* Status Indicator */}
    <div className="relative">
      <div className="w-3 h-3 rounded-full bg-green-500 glow-green"/>
    </div>
    
    {/* Scan Info */}
    <div className="flex-1">
      <p className="font-semibold text-sm">#f9c31685 — http://lab_juice.shop:3000</p>
      <p className="text-xs text-gray-500 mt-1">Completed • Risk Score: 0.0 • 24/03/2026</p>
    </div>
    
    {/* Actions */}
    <div className="flex gap-2">
      <button className="px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 rounded transition">
        👁️ PREVIEW
      </button>
      <button className="px-3 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/20 rounded transition">
        📄 REPORT
      </button>
    </div>
    
    {/* Expand Arrow */}
    <span className="text-gray-600 group-hover:text-cyan-400 transition">▼</span>
  </div>
</div>
```

#### Targets Sub-tab (Card Grid)
```jsx
// Target cards with one-click AI scan

<div className="grid grid-cols-3 gap-4">
  {targets.map(target => (
    <div key={target.id} className="glass-card p-4 group hover:border-cyan-500/75 relative overflow-hidden">
      <div className="absolute top-2 right-2">
        <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {target.tier}
        </span>
      </div>
      
      <h4 className="font-bold text-sm mb-3 group-hover:text-cyan-400 transition">{target.name}</h4>
      <p className="text-xs text-cyan-400 font-mono mb-4">{target.url}</p>
      
      <p className="text-xs text-gray-600 mb-4">Unknown stack</p>
      
      <button className="w-full py-2 px-3 rounded font-bold text-xs uppercase bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/50 text-purple-300 transition">
        ⚡ AI Scan
      </button>
      
      <button className="absolute top-2 left-2 text-gray-600 hover:text-red-400 transition">
        🗑️
      </button>
    </div>
  ))}
</div>
```

### 3.6 Tab 3: Threat Center (Advanced)

#### SIEM Alerts (Live Feed)
```jsx
// Unified Inbox with severity tags and glitch entry animation

<div className="glass-card p-6">
  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
    🚨 Unified SIEM Inbox
  </p>
  
  <div className="space-y-2 max-h-96 overflow-y-auto">
    {alerts.map((alert, i) => (
      <div 
        key={i}
        className="flex items-start gap-3 p-3 rounded border-l-4 transition hover:bg-white/5 glitch-alert"
        style={{
          borderColor: alert.severity === 'critical' ? '#ff0055' : alert.severity === 'warning' ? '#ffaa00' : '#00ffff',
          animationDelay: `${i * 50}ms`
        }}
      >
        <span className="text-lg mt-0.5">
          {alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟠' : '🔵'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs uppercase">{alert.severity}</p>
          <p className="text-sm text-gray-300 truncate">{alert.message}</p>
          <p className="text-xs text-gray-600 mt-1">{alert.timestamp}</p>
        </div>
      </div>
    ))}
  </div>
</div>
```

#### Vulnerabilities (Filterable Card Grid)
```jsx
// VulnerabilitiesPanel - advanced filtering + detail drawer

const [filters, setFilters] = useState({ severity: 'all' });

<div className="space-y-4">
  {/* Filter Bar */}
  <div className="flex gap-2 flex-wrap">
    {['ALL', 'CRITICAL', 'HIGH', 'MED', 'LOW'].map(sev => (
      <button
        key={sev}
        onClick={() => setFilters({ severity: sev.toLowerCase() })}
        className={`px-4 py-2 rounded text-xs font-bold uppercase transition ${
          filters.severity === sev.toLowerCase() || (sev === 'ALL' && filters.severity === 'all')
            ? 'bg-cyan-500/40 border border-cyan-500 text-cyan-300'
            : 'bg-gray-900/40 border border-gray-700 text-gray-400 hover:border-gray-600'
        }`}
      >
        {sev}
      </button>
    ))}
  </div>
  
  {/* Vulnerability Cards */}
  <div className="grid grid-cols-2 gap-4">
    {filteredVulns.map(vuln => (
      <div 
        key={vuln.id}
        className="glass-card p-4 cursor-pointer hover:border-cyan-500/75 group"
        onClick={() => setDetailDrawer(vuln)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-bold text-sm group-hover:text-cyan-400 transition flex-1">{vuln.title}</h4>
          <span className={`cyber-badge badge-${vuln.severity.toLowerCase()}`}>
            {vuln.severity}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{vuln.type}</p>
        <p className="text-xs text-gray-600 line-clamp-2">{vuln.description}</p>
      </div>
    ))}
  </div>
</div>
```

### 3.7 Tab 4: AI Brain (Agent Pipeline)
```jsx
// Stage-based pipeline with expandable logs

const stages = ['RECON', 'ATTACK', 'VALIDATE', 'REPORT'];

<div className="space-y-4">
  {/* Pipeline Visualization */}
  <div className="glass-card p-6">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">
      🧠 AI Agent Pipeline
    </p>
    
    {/* Stage Flow */}
    <div className="flex items-center justify-between mb-8">
      {stages.map((stage, i) => (
        <div key={stage} className="flex-1 flex items-center">
          {/* Stage Block */}
          <div className="flex-1">
            <div className="glass-card p-4 text-center relative group">
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">{stage}</p>
              <p className="text-sm font-bold text-cyan-400">●●●</p>
              <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 bg-cyan-500/10 transition"/>
            </div>
          </div>
          
          {/* Arrow Connector */}
          {i < stages.length - 1 && (
            <div className="w-12 h-1 bg-gradient-to-r from-cyan-500/50 to-transparent mx-2"/>
          )}
        </div>
      ))}
    </div>
    
    {/* Expandable Logs */}
    {stages.map(stage => (
      <details key={stage} className="mb-3">
        <summary className="cursor-pointer p-3 rounded hover:bg-white/5 font-mono text-sm font-bold uppercase">
          📋 {stage} Logs
        </summary>
        <div className="mt-2 p-3 bg-black/30 rounded font-mono text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto">
          <p>> Initializing {stage} phase...</p>
          <p>> [17:42:13] Scanning network topology...</p>
          <p>> [17:42:14] Found 6 nodes</p>
          <p className="text-cyan-400">> [17:42:15] ✓ Phase complete</p>
        </div>
      </details>
    ))}
  </div>
</div>
```

### 3.8 Tab 5: Reports (Card Grid)
```jsx
// Report cards with PDF previews + metadata

<div className="glass-card p-6">
  <div className="flex items-center justify-between mb-6">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
      📄 Security Reports
    </p>
    <button className="px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 rounded">
      ⬇️ Export All
    </button>
  </div>
  
  {/* Summary Banner */}
  <div className="grid grid-cols-3 gap-4 mb-6">
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-gray-500">Total Scans</p>
      <p className="text-2xl font-bold text-cyan-400 mt-1">24</p>
    </div>
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-gray-500">Highest Risk</p>
      <p className="text-2xl font-bold text-red-400 mt-1">7.8</p>
    </div>
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-gray-500">Last Generated</p>
      <p className="text-sm font-bold text-gray-400 mt-1">24/03/2026</p>
    </div>
  </div>
  
  {/* Report Cards */}
  <div className="grid grid-cols-3 gap-4">
    {reports.map(report => (
      <div key={report.id} className="glass-card p-4 flex flex-col group cursor-pointer">
        {/* PDF Thumbnail Placeholder */}
        <div className="w-full aspect-video bg-gray-900 rounded mb-3 flex items-center justify-center text-3xl group-hover:bg-gray-800 transition">
          📄
        </div>
        <h4 className="font-bold text-sm mb-1 group-hover:text-cyan-400 transition">{report.name}</h4>
        <p className="text-xs text-gray-500 mb-3">
          {report.date} • {report.size}
        </p>
        <button className="px-3 py-2 text-xs font-bold uppercase bg-cyan-500/20 border border-cyan-500/50 rounded hover:bg-cyan-500/40 transition">
          ⬇️ Download
        </button>
      </div>
    ))}
  </div>
</div>
```

### 3.9 Tab 6: Settings (Card Grid)
```jsx
// 3 organized config cards

<div className="grid grid-cols-3 gap-6">
  {/* API Configuration */}
  <div className="glass-card p-6">
    <h3 className="text-sm font-bold uppercase mb-4">🔌 API Configuration</h3>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Backend URL</label>
        <input type="text" value="http://localhost:8000/api/v1" className="cyber-input w-full mt-2" />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">API Key</label>
        <input type="password" value="••••••••••••••••" className="cyber-input w-full mt-2" />
      </div>
    </div>
  </div>
  
  {/* Scan Defaults */}
  <div className="glass-card p-6">
    <h3 className="text-sm font-bold uppercase mb-4">⚙️ Scan Defaults</h3>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Default Scan Type</label>
        <select className="cyber-input w-full mt-2">
          <option>Full</option>
          <option>Quick</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Threads</label>
          <input type="number" value="10" className="cyber-input w-full mt-2" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Timeout (s)</label>
          <input type="number" value="30" className="cyber-input w-full mt-2" />
        </div>
      </div>
    </div>
  </div>
  
  {/* Lab Environment */}
  <div className="glass-card p-6">
    <h3 className="text-sm font-bold uppercase mb-4">🧪 Lab Environment</h3>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">VITE_API_URL</label>
        <input type="text" value="http://localhost:8000/api/v1" className="cyber-input w-full mt-2 text-xs" />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">NODE_ENV</label>
        <input type="text" value="development" className="cyber-input w-full mt-2 text-xs" />
      </div>
    </div>
  </div>
</div>

{/* Save Button */}
<button className="mt-6 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold uppercase rounded text-sm shadow-lg hover:shadow-cyan-500/50 transition">
  💾 Save Changes
</button>
```

---

## 4. New & Enhanced Components

### 4.1 New Component Library

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `CyberButton` | Elevated button with animated border trace | Hover glow, click pulse, loading state |
| `CyberBadge` | Severity/status badge | CRITICAL/HIGH/MED/LOW with color coding |
| `GaugeRing` | Circular progress indicator | Animated arc, smooth counting |
| `DonutChart` | Risk distribution chart | 3-color segments, hover tooltip |
| `SkeletonPulse` | Shimmer loading placeholder | Matches light/dark theme |
| `Toast` | Slide-in notification | Auto-dismiss, stacked queue |
| `TopologyLegend` | Floating network legend | Responsive, sticky positioning |
| `DataStreamCard` | Card with animated data flow | Real-time value updates |

### 4.2 CyberButton Component
```jsx
// components/ui/CyberButton.jsx

export const CyberButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg hover:shadow-cyan-500/50',
    secondary: 'border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`
        ${variants[variant]} ${sizes[size]}
        font-bold uppercase tracking-wider
        rounded transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        relative overflow-hidden group
        ${className}
      `}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {/* Animated border trace on click */}
      <div className="absolute inset-0 border border-white opacity-0 group-active:opacity-50 rounded animate-pulse"/>
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
```

### 4.3 Toast Notification System
```jsx
// components/ui/Toast.jsx

export const Toast = ({ 
  message, 
  severity = 'info',
  autoClose = 4000,
  onClose 
}) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);
  
  const colors = {
    success: { bg: 'bg-green-500/20', border: 'border-green-500', icon: '✓' },
    warning: { bg: 'bg-amber-500/20', border: 'border-amber-500', icon: '⚠' },
    error: { bg: 'bg-red-500/20', border: 'border-red-500', icon: '✕' },
    info: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', icon: 'ℹ' },
  };
  
  const style = colors[severity];
  
  return (
    <div 
      className={`
        fixed bottom-6 right-6 z-50
        ${style.bg} border ${style.border}
        p-4 rounded-lg flex items-center gap-3
        animate-slide-in shadow-lg
      `}
    >
      <span className="text-lg">{style.icon}</span>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-4">
        ×
      </button>
    </div>
  );
};
```

---

## 5. Advanced Animation & Interaction Layer

### 5.1 Page Load Sequence
```jsx
// Staggered reveal animation on dashboard load
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.6 }}
>
  {/* Stat Cards - staggered reveal */}
  <motion.div className="grid grid-cols-4 gap-4">
    {statCards.map((card, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1, duration: 0.5 }}
      >
        <StatCard {...card} />
      </motion.div>
    ))}
  </motion.div>
  
  {/* Main content - delayed entrance */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.6 }}
  >
    {/* Topology, Charts, etc */}
  </motion.div>
</motion.div>
```

### 5.2 Real-time Data Updates
```jsx
// Animated value changes with flash/pulse
const AnimatedValue = ({ value, formatter }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (value !== prevValue.current) {
      // Flash animation on change
      setDisplayValue(value);
      prevValue.current = value;
    }
  }, [value]);
  
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="font-bold text-cyan-400"
    >
      {formatter ? formatter(displayValue) : displayValue}
    </motion.span>
  );
};
```

---

## 6. File Structure (Updated)

```
src/
├── components/
│   ├── ui/
│   │   ├── CyberButton.jsx          [NEW]
│   │   ├── CyberBadge.jsx           [NEW]
│   │   ├── GaugeRing.jsx            [NEW/ENHANCED]
│   │   ├── DonutChart.jsx           [NEW]
│   │   ├── SkeletonPulse.jsx        [NEW]
│   │   ├── Toast.jsx                [NEW]
│   │   └── AnimatedValue.jsx        [NEW]
│   ├── dashboard/
│   │   ├── Dashboard.jsx            [REFACTOR]
│   │   ├── NetworkTopology.jsx      [REBUILD]
│   │   ├── TopologyLegend.jsx       [NEW]
│   │   ├── StatCards.jsx            [ENHANCE]
│   │   ├── RiskScore.jsx            [ENHANCE]
│   │   ├── ScanHistory.jsx          [REFACTOR → Timeline]
│   │   ├── TargetsManager.jsx       [REFACTOR → Card Grid]
│   │   ├── UnifiedInbox.jsx         [ENHANCE]
│   │   ├── VulnerabilitiesPanel.jsx [ENHANCE]
│   │   ├── AgentLogViewer.jsx       [REFACTOR → Pipeline]
│   │   ├── ReportsPanel.jsx         [NEW]
│   │   └── SettingsPanel.jsx        [REFACTOR]
│   └── layout/
│       ├── Layout.jsx               [REFACTOR]
│       ├── Topbar.jsx               [NEW]
│       ├── Sidebar.jsx              [REFACTOR]
│       └── LiveConsole.jsx          [ENHANCE]
├── hooks/
│   ├── useAnimatedCounter.js        [NEW]
│   ├── useToast.js                  [NEW]
│   └── useNetworkData.js            [EXISTING]
├── utils/
│   ├── colors.js                    [NEW - Color system]
│   └── animations.js                [NEW - Easing functions]
├── styles/
│   ├── index.css                    [MAJOR REWRITE]
│   ├── animations.css               [NEW]
│   └── typography.css               [NEW]
└── index.html                       [Add font imports]
```

---

## 7. Implementation Roadmap (Enhanced)

| Phase | Scope | Components | Est. Time |
|-------|-------|-----------|-----------|
| **1** | Design tokens, CSS, Fonts, Layout | Colors, Utilities, Fonts, Layout.jsx, Sidebar | **1.5 days** |
| **2** | Network Topology rebuild (enhanced) | NetworkTopology.jsx, TopologyLegend.jsx, node physics | **1.5 days** |
| **3** | UI Component Library | CyberButton, Badge, Gauge, Toast, SkeletonPulse | **1.5 days** |
| **4** | Dashboard Sections (all 6 tabs) | StatCards, RiskScore, all tab sections | **3 days** |
| **5** | Animations & Polish | Framer Motion integration, micro-interactions, scanlines | **1.5 days** |
| **6** | Testing & Optimization | Lighthouse audit, performance, cross-browser | **1 day** |
| **TOTAL** | | | **~10 days** |

---

## 8. Performance & Accessibility

### 8.1 Optimization Checklist
- [ ] Code-split dashboard tabs (lazy load)
- [ ] Memoize network topology to prevent re-renders
- [ ] Use `will-change` for animated elements
- [ ] Compress animations (prefers-reduced-motion)
- [ ] Lighthouse Core Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### 8.2 Accessibility
- [ ] ARIA labels on buttons & icons
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators (visible outline)
- [ ] Color contrast: 4.5:1 for text
- [ ] Screen reader support for alerts/toasts

---

## 9. Approval & Next Steps

✅ **This plan is ready for implementation.**

**To proceed:**
1. Confirm color palette preference (brighter cyan #00ffff vs current #22d3ee)
2. Approve Phase 1 timeline (design tokens + CSS)
3. Assign developer resources
4. Schedule daily standups

**Questions?** Provide feedback on:
- Network topology physics (current circular → rounded square with animations)
- Glow intensity & scanline effect frequency
- Any custom brand elements to integrate

---

**END OF ENHANCED PLAN**
