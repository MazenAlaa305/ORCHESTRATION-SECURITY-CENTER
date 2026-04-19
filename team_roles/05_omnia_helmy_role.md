# Omnia Helmy — Data Visualization & Network Topology
# أمنية حلمي — تصوير البيانات وطوبولوجيا الشبكة

> **Sub-Team:** 2 — Frontend & Visualization | **الفريق الفرعي:** 2 — الواجهة الأمامية والتصوير
> **Stack:** React, D3.js, React Force Graph, Recharts, Chart.js, SVG

---

## Role Summary | ملخص الدور

**English:** Omnia owns every chart, graph, and visualization on the dashboard. Her most important component is the **Network Topology** — the interactive force-directed graph that shows discovered assets as glowing nodes and their connections as edges. During a live scan, nodes change color in real-time (grey → green for safe, red for critical). She also owns all trend charts and heatmaps.

**عربي:** أمنية تمتلك كل رسم بياني وتصوير على لوحة التحكم. أهم مكوّناتها هو **طوبولوجيا الشبكة** — الرسم البياني التفاعلي الموجّه بالقوة الذي يُظهر الأصول المكتشفة كنقاط متوهّجة واتصالاتها كحواف. أثناء المسح الحي، تتغير ألوان النقاط فوريًا (رمادي → أخضر للآمن، أحمر للحرج). كما تمتلك جميع مخططات الاتجاه وخرائط الحرارة.

---

## Files She Owns | الملفات التي تمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `frontend/src/components/dashboard/NetworkTopology.jsx` | Force graph — nodes, edges, hover tooltips | رسم القوة — نقاط، حواف، نصائح التمرير |
| `frontend/src/components/dashboard/VulnTrend.jsx` | Vulnerability trend line chart (Chart.js) | مخطط خط اتجاه الثغرات |
| `frontend/src/components/dashboard/RiskHeatmap.jsx` | D3 heatmap — risk by asset type × severity | خريطة حرارة D3 |
| `frontend/src/components/dashboard/UptimeGauge.jsx` | Circular arc gauge for uptime/health | مقياس قوس دائري للصحة |
| `frontend/src/components/dashboard/StatCards.jsx` | KPI stat cards from real-time context | بطاقات KPI من السياق الفوري |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `frontend/src/components/dashboard/SeverityDonut.jsx` | Donut chart: critical/high/medium/low counts | مخطط دونات: أعداد الخطورة |
| `frontend/src/components/dashboard/AssetTimeline.jsx` | Timeline of scan events per asset | جدول زمني لأحداث المسح لكل أصل |
| `frontend/src/components/dashboard/ExposureMap.jsx` | Visual subnet exposure heatmap | خريطة حرارة التعرض المرئي للشبكة الفرعية |

---

## Key Code Explained | شرح الكود الرئيسي

### `NetworkTopology.jsx` — The Force Graph

**English:** This is the most visually impressive component. It uses `react-force-graph-2d` — a React wrapper around D3's force simulation. Nodes repel each other (like magnets), and edges pull connected nodes together, creating a natural layout automatically.

**عربي:** هذا المكوّن الأكثر إبهارًا بصريًا. يستخدم `react-force-graph-2d` — غلاف React حول محاكاة قوة D3. تتنافر النقاط مع بعضها (مثل المغناطيس)، والحواف تسحب النقاط المتصلة ببعض، مما يخلق تخطيطًا طبيعيًا تلقائيًا.

```javascript
// Node data format — what the backend sends as ScanAsset records
const graphData = {
    nodes: [
        {
            id: "10.10.10.10",
            label: "Juice Shop",
            riskScore: 95,          // Determines node COLOR
            // 0-30: green (safe)
            // 31-69: orange (medium)
            // 70-100: red (critical)
            deviceType: "web-server",
            openPorts: [80, 443, 3000],
        },
        {
            id: "10.10.20.10",
            label: "File Server",
            riskScore: 80,
            deviceType: "file-server",
        }
    ],
    links: [
        { source: "10.10.10.10", target: "10.10.20.10" }
        // Edge drawn between Juice Shop and File Server
    ]
};

// The component
<ForceGraph2D
    graphData={graphData}
    nodeColor={(node) => {
        if (node.riskScore >= 70) return '#ff4444';   // Red = critical
        if (node.riskScore >= 31) return '#ff8c00';   // Orange = medium
        return '#00ff88';                             // Green = safe
    }}
    nodeLabel={(node) => `${node.label} — Risk: ${node.riskScore}/100`}
    onNodeClick={(node) => openAssetDetailPanel(node)}  // Click to inspect
/>
```

**عربي للكود:**
```javascript
// شكل بيانات النقطة — ما يرسله الـ backend كسجلات ScanAsset
const graphData = {
    nodes: [
        {
            id: "10.10.10.10",
            label: "Juice Shop",
            riskScore: 95,     // يحدد لون النقطة
            // 0-30: أخضر (آمن)، 31-69: برتقالي (متوسط)، 70-100: أحمر (حرج)
        }
    ],
    links: [{ source: "10.10.10.10", target: "10.10.20.10" }]
    // حافة مرسومة بين نقطتين
};
```

**The Hover Tooltip (already implemented):**
```javascript
// When user hovers over a node, a tooltip shows:
// - Asset name and IP
// - Health Score (e.g., "Health: 13/100")
// - AI Expert Advice (from Gemini advisory)
// - Top 3 vulnerabilities
```

**تلميح التمرير (مطبّق مسبقًا):**
```javascript
// عندما يمرر المستخدم فوق نقطة، تُظهر تلميحًا:
// - اسم الأصل وIP
// - درجة الصحة (مثلًا "الصحة: 13/100")
// - نصيحة خبير AI (من استشارة Gemini)
// - أفضل 3 ثغرات
```

---

### `VulnTrend.jsx` — The Trend Line Chart

**English:** Shows how vulnerability counts changed across multiple scans — the "before/after remediation" comparison. Uses Chart.js with the `react-chartjs-2` wrapper.

**عربي:** يُظهر كيف تغيّرت أعداد الثغرات عبر مسوح متعددة — مقارنة "قبل/بعد المعالجة". يستخدم Chart.js مع غلاف `react-chartjs-2`.

```javascript
// Chart data structure
const data = {
    labels: ['Scan 1', 'Scan 2', 'Scan 3'],  // X-axis: scan names
    datasets: [
        {
            label: 'Critical',
            data: [5, 3, 1],          // Y-axis: counts per scan
            borderColor: '#ff4444',   // Red line
            fill: true,               // Filled area under line (gradient)
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
        },
        {
            label: 'High',
            data: [8, 6, 4],
            borderColor: '#ff8c00',   // Orange line
        }
    ]
};

// Important: Chart.js Filler plugin must be registered
// (it draws the filled area under the line)
import { Chart, Filler } from 'chart.js';
Chart.register(Filler);  // ← Omnia already added this
```

---

### `RiskHeatmap.jsx` — D3 Heatmap

**English:** A grid where rows = asset types (web-server, database, file-server) and columns = severity levels (CRITICAL, HIGH, MEDIUM, LOW). Each cell color intensity = count of findings. Built with pure D3.js using `useEffect` + `useRef` to access the DOM directly.

**عربي:** شبكة حيث الصفوف = أنواع الأصول (خادم ويب، قاعدة بيانات، خادم ملفات) والأعمدة = مستويات الخطورة (CRITICAL، HIGH، MEDIUM، LOW). كثافة لون كل خلية = عدد النتائج. مبني بـ D3.js الصرف باستخدام `useEffect` + `useRef` للوصول المباشر لـ DOM.

```javascript
// D3 in React — the right pattern
const svgRef = useRef(null);  // Reference to the <svg> element

useEffect(() => {
    // This runs AFTER React renders the empty <svg>
    // D3 takes over and draws inside it
    const svg = d3.select(svgRef.current);
    
    // Create color scale: 0 findings = white, many findings = dark red
    const colorScale = d3.scaleSequential()
        .domain([0, maxCount])
        .interpolator(d3.interpolateReds);
    
    // Draw cells
    svg.selectAll('.cell')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('fill', d => colorScale(d.count))
        .attr('x', d => xScale(d.severity))
        .attr('y', d => yScale(d.assetType));
    
}, [heatmapData]);  // Re-run when data changes

return <svg ref={svgRef} width={width} height={height} />;
```

**عربي للكود:**
```javascript
// D3 في React — النمط الصحيح
const svgRef = useRef(null);  // مرجع لعنصر <svg>

useEffect(() => {
    // يعمل بعد أن يُصيّر React الـ <svg> الفارغ
    // D3 يتولى الرسم بداخله
    // أنشئ مقياس اللون: 0 نتائج = أبيض، كثير نتائج = أحمر داكن
    // ارسم الخلايا
}, [heatmapData]);  // أعد التشغيل عند تغيير البيانات

return <svg ref={svgRef} />;
```

---

## What Omnia Must Learn | ما يجب على أمنية تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| D3.js: scales, SVG paths, `d3.forceSimulation()` | Build and debug heatmap + any new D3 charts | بناء وتصحيح خريطة الحرارة |
| `useEffect` + `useRef` for imperative D3 DOM access | The ONLY correct way to use D3 inside React | الطريقة الوحيدة الصحيحة لاستخدام D3 داخل React |
| `react-force-graph-2d` — node/link data format | Add new node properties and colors | إضافة خصائص وألوان جديدة |
| Recharts: `<LineChart>`, `<BarChart>`, `ResponsiveContainer` | Charts that auto-resize with the browser window | مخططات تتغير حجمها تلقائيًا |
| Chart.js plugin system: `Chart.register(...)` | Fix "plugin not found" errors | إصلاح أخطاء "البرنامج المساعد غير موجود" |
| `ResizeObserver` API | Make D3 charts resize when panel changes width | جعل رسوم D3 تتغير حجمها عند تغيير عرض اللوحة |

**Resources | الموارد:**
- D3.js gallery: https://observablehq.com/@d3/gallery
- react-force-graph: https://github.com/vasturiano/react-force-graph
- Recharts: https://recharts.org/en-US/examples
- react-chartjs-2: https://react-chartjs-2.js.org/

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Add real-time node color updates during scan by risk score | تحديثات لون النقطة الفورية أثناء المسح |
| 11 | Build `SeverityDonut.jsx` with live KPI data | بناء مخطط الدونات |
| 12 | Add `ExposureMap.jsx`; empty-state handling for all charts | إضافة خريطة التعرض؛ معالجة الحالة الفارغة |
| 13 | Visual regression check on all charts across screen sizes | فحص تراجع بصري على جميع الأحجام |
