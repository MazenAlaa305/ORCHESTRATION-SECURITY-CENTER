/**
 * ══════════════════════════════════════════════════════════════════════════
 * Found 404 — Graduation Project Defense Presentation
 * Google Apps Script for Google Slides
 * ══════════════════════════════════════════════════════════════════════════
 *
 * INSTRUCTIONS:
 *   1. Go to https://script.google.com
 *   2. Create a new project
 *   3. Paste this entire script
 *   4. Click Run > createPresentation
 *   5. Authorize when prompted
 *   6. The presentation URL will be logged — check View > Logs
 *
 * Theme: Futuristic Glass / iOS Dark Mode
 * Typography: Merriweather (Light)
 * ══════════════════════════════════════════════════════════════════════════
 */

// ── Colour Palette (Hex Strings) ────────────────────────────────────────
const COLORS = {
  BG_DARK:      '#0A0E27',
  BG_CARD:      '#141A36',
  BG_CARD_ALT:  '#1A2240',
  ACCENT_CYAN:  '#00D4FF',
  ACCENT_BLUE:  '#4A90D9',
  ACCENT_GREEN: '#00FF88',
  ACCENT_ORANGE:'#FFAA00',
  ACCENT_RED:   '#FF0055',
  TEXT_WHITE:   '#FFFFFF',
  TEXT_LIGHT:   '#C0C8D8',
  TEXT_DIM:     '#7B8BA8',
};

const FONT = 'Merriweather';
const SLIDE_W = 720; // points (10 inches)
const SLIDE_H = 405; // points (5.625 inches) — 16:9

// ── Helpers ─────────────────────────────────────────────────────────────

function setSlideBackground(slide, hexColor) {
  slide.getBackground().setSolidFill(hexColor);
}

function addTextBox(slide, left, top, width, height, text, opts) {
  opts = opts || {};
  const shape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left, top, width, height);
  shape.getBorder().setTransparent();
  shape.getFill().setTransparent();

  const tf = shape.getText();
  tf.setText(text);

  const style = tf.getTextStyle();
  style.setFontFamily(opts.font || FONT);
  style.setFontSize(opts.size || 14);
  style.setForegroundColor(opts.color || COLORS.TEXT_WHITE);
  style.setBold(opts.bold || false);
  style.setItalic(opts.italic || false);

  if (opts.align) {
    const paragraphs = tf.getParagraphs();
    for (let i = 0; i < paragraphs.length; i++) {
      paragraphs[i].getRange().getParagraphStyle().setParagraphAlignment(
        opts.align === 'CENTER' ? SlidesApp.ParagraphAlignment.CENTER :
        opts.align === 'RIGHT'  ? SlidesApp.ParagraphAlignment.END :
        SlidesApp.ParagraphAlignment.START
      );
    }
  }

  return shape;
}

function addCard(slide, left, top, width, height, fillColor, borderColor, borderWeight) {
  const shape = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, left, top, width, height);
  shape.getFill().setSolidFill(fillColor || COLORS.BG_CARD);
  if (borderColor) {
    shape.getBorder().setWeight(borderWeight || 1);
    shape.getBorder().getLineFill().setSolidFill(borderColor);
  } else {
    shape.getBorder().setTransparent();
  }
  return shape;
}

function addAccentLine(slide, left, top, width) {
  const line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left, top, width || 40, 3);
  line.getFill().setSolidFill(COLORS.ACCENT_CYAN);
  line.getBorder().setTransparent();
  return line;
}

function addFooterBar(slide) {
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, SLIDE_H - 5, SLIDE_W, 3);
  bar.getFill().setSolidFill(COLORS.ACCENT_CYAN);
  bar.getBorder().setTransparent();
}

function addSlideNumber(slide, num) {
  addTextBox(slide, SLIDE_W - 50, SLIDE_H - 25, 40, 20, String(num),
    { size: 8, color: COLORS.TEXT_DIM, align: 'RIGHT' });
}

function addTitle(slide, title, subtitle) {
  addAccentLine(slide, 50, 28);
  addTextBox(slide, 95, 18, 580, 35, title,
    { size: 22, color: COLORS.TEXT_WHITE, bold: true });
  if (subtitle) {
    addTextBox(slide, 95, 52, 580, 22, subtitle,
      { size: 11, color: COLORS.TEXT_DIM });
  }
}

function addBulletCard(slide, left, top, width, height, title, bullets, opts) {
  opts = opts || {};
  const card = addCard(slide, left, top, width, height, COLORS.BG_CARD, opts.border || COLORS.ACCENT_BLUE);
  const content = title + '\n' + bullets.join('\n');
  const shape = addTextBox(slide, left + 10, top + 8, width - 20, height - 16, content,
    { size: 9, color: COLORS.TEXT_LIGHT });

  // Style the title line
  const tf = shape.getText();
  const titleRange = tf.getRange(0, title.length);
  titleRange.getTextStyle().setFontSize(12);
  titleRange.getTextStyle().setForegroundColor(opts.titleColor || COLORS.ACCENT_CYAN);
  titleRange.getTextStyle().setBold(true);

  return card;
}

function addKPIBox(slide, left, top, width, height, label, value, color) {
  addCard(slide, left, top, width, height, COLORS.BG_CARD, color, 1.5);
  addTextBox(slide, left, top + 8, width, 28, String(value),
    { size: 22, color: color, bold: true, align: 'CENTER' });
  addTextBox(slide, left, top + 38, width, 20, label,
    { size: 8, color: COLORS.TEXT_DIM, align: 'CENTER' });
}

function addArrow(slide, left, top, width) {
  const arrow = slide.insertShape(SlidesApp.ShapeType.RIGHT_ARROW, left, top, width || 25, 18);
  arrow.getFill().setSolidFill(COLORS.ACCENT_CYAN);
  arrow.getBorder().setTransparent();
}

function newSlide(presentation) {
  // Get the blank layout directly from the master (PredefinedLayout.BLANK
  // can return undefined in some environments).
  var masters = presentation.getMasters();
  var layouts = masters[0].getLayouts();
  var blankLayout = null;

  for (var i = 0; i < layouts.length; i++) {
    var name = layouts[i].getLayoutName().toUpperCase();
    if (name === 'BLANK' || name === 'EMPTY' || name === 'TITLE ONLY') {
      blankLayout = layouts[i];
      if (name === 'BLANK') break; // prefer exact match
    }
  }
  // Fallback: use the last layout (typically the simplest)
  if (!blankLayout) blankLayout = layouts[layouts.length - 1];

  var slide = presentation.appendSlide(blankLayout);

  // Remove any placeholder elements inherited from the layout
  var elements = slide.getPageElements();
  for (var i = elements.length - 1; i >= 0; i--) {
    try { elements[i].remove(); } catch (e) { /* skip locked elements */ }
  }

  setSlideBackground(slide, COLORS.BG_DARK);
  addFooterBar(slide);
  return slide;
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function createPresentation() {
  const prs = SlidesApp.create('Found 404 — Defense Presentation');

  // Keep a reference to the default slide — we'll remove it AFTER adding new slides
  // (removing it first breaks appendSlide because no master layout is available)
  const defaultSlide = prs.getSlides()[0];


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ═══════════════════════════════════════════════════════════════════════
  let s = newSlide(prs);

  addTextBox(s, 50, 80, 620, 55, 'FOUND 404',
    { size: 44, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });

  addTextBox(s, 50, 140, 620, 35, 'Autonomous Security Orchestration Platform for SMEs',
    { size: 18, color: COLORS.TEXT_WHITE, align: 'CENTER' });

  addAccentLine(s, 310, 185, 100);

  addTextBox(s, 50, 200, 620, 25, 'Graduation Project Defense  |  2026',
    { size: 12, color: COLORS.TEXT_DIM, align: 'CENTER' });

  addTextBox(s, 50, 240, 620, 25,
    'AI-Driven DAST  \u2022  Multi-Agent Pipeline  \u2022  Unified Risk Engine  \u2022  SIEM/SOAR Integration',
    { size: 10, color: COLORS.TEXT_DIM, align: 'CENTER' });

  // Corner accents
  [[20, 15], [680, 15], [20, 365], [680, 365]].forEach(function(pos) {
    const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, pos[0], pos[1], 20, 20);
    dot.getFill().setSolidFill(COLORS.ACCENT_BLUE);
    dot.getBorder().setTransparent();
  });

  addSlideNumber(s, 1);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 2 — AGENDA
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'AGENDA', 'Presentation Roadmap');

  const agenda = [
    ['01', 'Problem Statement & Motivation'],
    ['02', 'Research Objectives'],
    ['03', 'Literature Review & Gaps'],
    ['04', 'System Architecture Overview'],
    ['05', 'Microservices Decomposition'],
    ['06', 'Multi-Agent Orchestration Pipeline'],
    ['07', 'Unified Risk Engine \u2014 Deterministic Scoring'],
    ['08', 'Deterministic vs. Non-Deterministic Logic'],
    ['09', 'SIEM / SOAR Integration'],
    ['10', 'Living Lab Environment'],
    ['11', 'Dashboard & Real-Time Visualization'],
    ['12', 'Results, Evaluation & Contributions'],
    ['13', 'Future Work & Conclusion'],
  ];

  agenda.forEach(function(item, i) {
    const col = i < 7 ? 0 : 1;
    const row = i < 7 ? i : i - 7;
    const x = 50 + col * 350;
    const y = 80 + row * 40;
    addTextBox(s, x, y, 35, 25, item[0],
      { size: 14, color: COLORS.ACCENT_CYAN, bold: true });
    addTextBox(s, x + 40, y + 2, 300, 25, item[1],
      { size: 11, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 2);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 3 — ABSTRACT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'ABSTRACT', 'Executive Summary');

  const abstractText =
    'Found 404 is an AI-driven Dynamic Application Security Testing (DAST) platform ' +
    'purpose-built for Small and Medium Enterprises. The system orchestrates a multi-agent ' +
    'autonomous pipeline\u2014ReconAgent, AttackAgent, ValidationAgent, and ReportingAgent\u2014' +
    'powered by Google Gemini LLM, unifying industry-standard tools (Nmap, Nuclei, OpenVAS, ' +
    'Wazuh) under a single microservices architecture.\n\n' +
    'The platform introduces a Unified Risk Engine that computes deterministic risk scores ' +
    'by weighting vulnerability severity, asset criticality, and network exposure. A living ' +
    'lab with 4 subnets and 11 vulnerable containers simulates realistic SME environments ' +
    'for validation. Real-time dashboards, SIEM/SOAR integration, and non-technical advisory ' +
    'generation bridge the gap between complex security telemetry and actionable business decisions.';

  addCard(s, 40, 75, 640, 240, COLORS.BG_CARD, COLORS.ACCENT_BLUE);
  addTextBox(s, 55, 85, 610, 220, abstractText,
    { size: 11, color: COLORS.TEXT_LIGHT });

  addTextBox(s, 40, 325, 640, 22,
    'Keywords:  DAST  \u2022  Multi-Agent Systems  \u2022  Risk Quantification  \u2022  SIEM/SOAR  \u2022  LLM-Enhanced Security  \u2022  SME Cybersecurity',
    { size: 9, color: COLORS.ACCENT_CYAN, align: 'CENTER' });

  addSlideNumber(s, 3);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 4 — PROBLEM STATEMENT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'PROBLEM STATEMENT', 'The SME Security Gap');

  const problems = [
    ['\u26A0  Tool Fragmentation', 'SMEs lack resources to manage Nmap, Nuclei, OpenVAS, and Wazuh independently. Each tool has its own interface, output format, and expertise requirements.', COLORS.ACCENT_RED],
    ['\u26A0  Alert Fatigue', 'Security tools generate thousands of findings with no unified prioritization. Non-technical stakeholders cannot interpret raw CVE data or CVSS scores.', COLORS.ACCENT_RED],
    ['\u26A0  Reactive Posture', 'Most SMEs discover vulnerabilities after exploitation. Continuous automated testing and real-time risk dashboards are enterprise-only capabilities.', COLORS.ACCENT_ORANGE],
    ['\u26A0  Expertise Shortage', 'Global deficit of 3.4M cybersecurity professionals (ISC\u00B2 2023). SMEs cannot hire dedicated security teams or afford managed SIEM services.', COLORS.ACCENT_ORANGE],
  ];

  problems.forEach(function(p, i) {
    const y = 75 + i * 78;
    addCard(s, 40, y, 640, 70, COLORS.BG_CARD, p[2]);
    addTextBox(s, 55, y + 5, 610, 18, p[0],
      { size: 12, color: p[2], bold: true });
    addTextBox(s, 55, y + 25, 610, 40, p[1],
      { size: 9, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 4);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 5 — RESEARCH OBJECTIVES
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'RESEARCH OBJECTIVES', 'Goals & Deliverables');

  const objectives = [
    ['RO-1', 'Design a multi-agent autonomous DAST pipeline that chains reconnaissance, attack, validation, and reporting stages without human intervention.'],
    ['RO-2', 'Develop a Unified Risk Engine with deterministic scoring that weights vulnerability severity against asset criticality and network exposure.'],
    ['RO-3', 'Integrate heterogeneous security tools (Nmap, Nuclei, OpenVAS, Wazuh) via a unified microservices API layer.'],
    ['RO-4', 'Implement AI-enhanced advisory generation using Google Gemini LLM to translate technical findings into non-technical business language.'],
    ['RO-5', 'Build a living lab simulation environment modeling a realistic 4-subnet SME network topology for validation.'],
    ['RO-6', 'Deliver a real-time dashboard with WebSocket-driven updates and SIEM/SOAR integration for operational visibility.'],
  ];

  objectives.forEach(function(obj, i) {
    const y = 78 + i * 50;
    // Badge
    const badge = addCard(s, 40, y, 50, 25, COLORS.ACCENT_CYAN);
    addTextBox(s, 40, y + 2, 50, 20, obj[0],
      { size: 10, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });
    // Description
    addTextBox(s, 100, y, 580, 45, obj[1],
      { size: 10, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 5);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 6 — LITERATURE REVIEW
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'LITERATURE REVIEW & RESEARCH GAPS', 'Related Work Analysis');

  const litData = [
    ['OWASP ZAP', 'Open-source DAST', 'Single-tool, no orchestration, no AI advisory', COLORS.ACCENT_ORANGE],
    ['Burp Suite Pro', 'Commercial DAST', 'Expensive, manual-heavy, no SIEM integration', COLORS.ACCENT_ORANGE],
    ['DefectDojo', 'Vuln aggregation', 'No active scanning, no multi-agent pipeline', COLORS.ACCENT_ORANGE],
    ['Qualys VMDR', 'Enterprise VM', 'Cost-prohibitive for SMEs, cloud-only', COLORS.ACCENT_RED],
    ['Found 404', 'AI-Driven DAST + SOAR', 'Unified pipeline, deterministic scoring, LLM advisory', COLORS.ACCENT_GREEN],
  ];

  // Headers
  addTextBox(s, 40, 75, 150, 18, 'Platform', { size: 10, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 200, 75, 160, 18, 'Category', { size: 10, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 370, 75, 310, 18, 'Limitation / Advantage', { size: 10, color: COLORS.ACCENT_CYAN, bold: true });

  litData.forEach(function(row, i) {
    const y = 100 + i * 50;
    const bg = i % 2 === 0 ? COLORS.BG_CARD : COLORS.BG_CARD_ALT;
    addCard(s, 40, y, 640, 42, bg, i === 4 ? COLORS.ACCENT_GREEN : null, i === 4 ? 1.5 : 0);
    addTextBox(s, 50, y + 8, 140, 25, row[0],
      { size: 11, color: COLORS.TEXT_WHITE, bold: i === 4 });
    addTextBox(s, 200, y + 8, 160, 25, row[1],
      { size: 10, color: COLORS.TEXT_LIGHT });
    addTextBox(s, 370, y + 8, 300, 25, row[2],
      { size: 9, color: row[3] });
  });

  addSlideNumber(s, 6);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 7 — SYSTEM ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'SYSTEM ARCHITECTURE OVERVIEW', 'Microservices & Integration Points');

  const tiers = [
    ['PRESENTATION TIER', COLORS.ACCENT_CYAN, ['React/Vite SPA\n(Port 5173)', 'WebSocket Client\n(/ws/logs)', 'Real-Time\nDashboard', 'RiskScore Gauge\n& Agent Logs']],
    ['APPLICATION TIER', COLORS.ACCENT_BLUE, ['FastAPI Gateway\n(Port 8000)', 'Agent Orchestrator\n(4 Agents)', 'Celery Workers\n+ Beat', 'Unified Risk\nEngine']],
    ['DATA & SECURITY TIER', COLORS.ACCENT_GREEN, ['PostgreSQL\n(Port 5432)', 'Redis Pub/Sub\n(Port 6379)', 'Elasticsearch\n/Kibana SIEM', 'Wazuh Manager\n+ n8n SOAR']],
  ];

  tiers.forEach(function(tier, i) {
    const y = 72 + i * 110;

    // Tier card
    addCard(s, 30, y, 660, 100, COLORS.BG_CARD, tier[1], 1.5);

    // Tier label badge
    const badge = addCard(s, 40, y + 5, 150, 25, tier[1]);
    addTextBox(s, 40, y + 5, 150, 22, tier[0],
      { size: 9, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });

    // Items
    tier[2].forEach(function(item, j) {
      const x = 40 + j * 160;
      addCard(s, x, y + 38, 152, 55, COLORS.BG_CARD_ALT, tier[1], 0.5);
      addTextBox(s, x + 5, y + 42, 142, 48, item,
        { size: 8, color: COLORS.TEXT_LIGHT, align: 'CENTER' });
    });
  });

  addSlideNumber(s, 7);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 8 — MICROSERVICES
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'MICROSERVICES DECOMPOSITION', '11 Containerized Services');

  const services = [
    ['Backend (FastAPI)', '8000', 'API + WebSocket gateway', COLORS.ACCENT_CYAN],
    ['Frontend (Vite)', '5173', 'React SPA dashboard', COLORS.ACCENT_CYAN],
    ['PostgreSQL', '5432', 'Primary data store', COLORS.ACCENT_BLUE],
    ['Redis', '6379', 'Celery broker + Pub/Sub', COLORS.ACCENT_BLUE],
    ['Celery Worker', '\u2014', 'Async task processing', COLORS.ACCENT_BLUE],
    ['Celery Beat', '\u2014', 'Hourly scan scheduler', COLORS.ACCENT_BLUE],
    ['OpenVAS/GVM', '9390', 'Vulnerability scanner', COLORS.ACCENT_GREEN],
    ['Elasticsearch', '9200', 'SIEM log aggregation', COLORS.ACCENT_GREEN],
    ['Kibana', '5601', 'SIEM visualization', COLORS.ACCENT_GREEN],
    ['Wazuh Manager', '55000', 'Security event mgmt', COLORS.ACCENT_ORANGE],
    ['n8n', '5678', 'SOAR orchestration', COLORS.ACCENT_ORANGE],
  ];

  // Headers
  addTextBox(s, 50, 72, 200, 18, 'Service', { size: 9, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 260, 72, 80, 18, 'Port', { size: 9, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 350, 72, 330, 18, 'Role', { size: 9, color: COLORS.ACCENT_CYAN, bold: true });

  services.forEach(function(svc, i) {
    const y = 92 + i * 27;
    const bg = i % 2 === 0 ? COLORS.BG_CARD : COLORS.BG_CARD_ALT;
    addCard(s, 40, y, 640, 24, bg);

    const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, 50, y + 5, 12, 12);
    dot.getFill().setSolidFill(svc[3]);
    dot.getBorder().setTransparent();

    addTextBox(s, 70, y + 2, 180, 18, svc[0], { size: 9, color: COLORS.TEXT_WHITE });
    addTextBox(s, 260, y + 2, 80, 18, svc[1], { size: 9, color: COLORS.TEXT_DIM, align: 'CENTER' });
    addTextBox(s, 350, y + 2, 320, 18, svc[2], { size: 9, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 8);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 9 — DATABASE SCHEMA
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'DATABASE ARCHITECTURE', 'SQLAlchemy ORM \u2014 9 Core Tables');

  const tables = [
    ['Target', 'UUID PK, name, base_url, source, tech_stack (JSON), asset_value, data_sensitivity'],
    ['Scan', 'UUID PK, target_id FK, status, scan_type, risk_score (0-100), agent_thoughts (JSON)'],
    ['Vulnerability', 'UUID PK, scan_id FK, type, severity, status, confidence_score, ai_validation (JSON)'],
    ['AgentLog', 'UUID PK, scan_id FK, agent_name, action, reasoning (JSON), input/output data'],
    ['Endpoint', 'UUID PK, target_id FK, url, method, parameters (JSON), auth_required'],
    ['ScanAsset', 'INT PK, scan_id FK, ip_address, hostname, os_name, device_type, ai_insight'],
    ['AssetService', 'INT PK, asset_id FK, port, protocol, service_name, product, version, CPE'],
    ['NetworkAsset', 'INT PK, ip_address UNIQUE, status, criticality, risk_score, first/last_seen'],
    ['ActionItem', 'INT PK, scan_id FK, title, priority, status, type (REMEDIATION | CONFIG)'],
  ];

  tables.forEach(function(tbl, i) {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = 30 + col * 345;
    const y = 72 + row * 62;
    addCard(s, x, y, 335, 56, COLORS.BG_CARD, COLORS.ACCENT_BLUE);
    addTextBox(s, x + 10, y + 4, 315, 16, tbl[0],
      { size: 10, color: COLORS.ACCENT_CYAN, bold: true });
    addTextBox(s, x + 10, y + 22, 315, 30, tbl[1],
      { size: 7, color: COLORS.TEXT_DIM });
  });

  addSlideNumber(s, 9);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 10 — AGENT PIPELINE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'MULTI-AGENT ORCHESTRATION PIPELINE', '4-Stage Autonomous DAST Workflow');

  const agents = [
    ['1', 'RECON\nAGENT', 'Nmap scan\nPlaywright crawl\nTech stack detect\nEndpoint discovery', COLORS.ACCENT_BLUE],
    ['2', 'ATTACK\nAGENT', 'Nuclei templates\nPayload injection\nService heuristics\nConcurrent testing', COLORS.ACCENT_RED],
    ['3', 'VALIDATION\nAGENT', 'Confidence filter >0.6\nLLM re-validation\nFalse positive detect\nDeterministic rules', COLORS.ACCENT_ORANGE],
    ['4', 'REPORTING\nAGENT', 'Executive summary\nPoC generation\nRemediation templates\nMarkdown report', COLORS.ACCENT_GREEN],
  ];

  agents.forEach(function(agent, i) {
    const x = 25 + i * 175;
    // Card
    addCard(s, x, 78, 160, 240, COLORS.BG_CARD, agent[3], 2);

    // Number circle
    const circle = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 60, 88, 40, 40);
    circle.getFill().setSolidFill(agent[3]);
    circle.getBorder().setTransparent();
    addTextBox(s, x + 60, 92, 40, 30, agent[0],
      { size: 18, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });

    // Name
    addTextBox(s, x + 5, 135, 150, 40, agent[1],
      { size: 12, color: agent[3], bold: true, align: 'CENTER' });

    // Description
    addTextBox(s, x + 8, 180, 145, 120, agent[2],
      { size: 8, color: COLORS.TEXT_LIGHT, align: 'CENTER' });

    // Arrow
    if (i < 3) {
      addArrow(s, x + 163, 190, 12);
    }
  });

  // Post-processing bar
  addCard(s, 25, 330, 670, 40, COLORS.BG_CARD_ALT, COLORS.ACCENT_CYAN, 1.5);
  addTextBox(s, 35, 335, 650, 30,
    'POST-PROCESSING:  UnifiedRiskEngine \u2192 Score  \u2192  ActionItems  \u2192  WebSocket Broadcast',
    { size: 10, color: COLORS.ACCENT_CYAN, align: 'CENTER' });

  addSlideNumber(s, 10);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 11 — RECON AGENT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'RECON AGENT \u2014 Deep Dive', 'Infrastructure Discovery & Web Crawling');

  addBulletCard(s, 25, 75, 335, 140, 'Nmap Integration', [
    '\u2022 Quick: -F -T4 (top 100 ports)',
    '\u2022 Full: -sV -T4 (service detection)',
    '\u2022 Deep: -sV -O -A --script=vulners',
    '\u2022 OS fingerprinting, MAC vendor lookup',
    '\u2022 Creates ScanAsset + AssetService',
  ], { border: COLORS.ACCENT_BLUE });

  addBulletCard(s, 370, 75, 335, 140, 'Playwright Web Crawling', [
    '\u2022 JS-enabled headless browser',
    '\u2022 Discovers links, forms, inputs',
    '\u2022 Waits for networkidle (SPA)',
    '\u2022 Fallback to requests library',
    '\u2022 Auth credential injection',
  ], { border: COLORS.ACCENT_CYAN });

  addBulletCard(s, 25, 225, 335, 130, 'Tech Stack Detection', [
    '\u2022 HTTP headers: Server, X-Powered-By',
    '\u2022 Content: React, Vue, Angular, WP',
    '\u2022 Framework fingerprinting',
    '\u2022 Stored as Target.tech_stack JSON',
  ], { border: COLORS.ACCENT_GREEN });

  addBulletCard(s, 370, 225, 335, 130, 'Output Schema', [
    '\u2022 endpoints[]: {url, method, params}',
    '\u2022 tech_stack: {server, frontend, cms}',
    '\u2022 forms[]: {action, method, inputs[]}',
    '\u2022 assets[]: {ip, ports[], os, hostname}',
  ], { border: COLORS.ACCENT_ORANGE });

  addSlideNumber(s, 11);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 12 — ATTACK AGENT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'ATTACK AGENT \u2014 Deep Dive', 'Vulnerability Discovery & Payload Testing');

  addBulletCard(s, 25, 75, 335, 140, 'Service \u2192 Nuclei Templates', [
    '\u2022 http/https \u2192 cve, exposures, misconfig',
    '\u2022 ftp/ssh \u2192 default-logins',
    '\u2022 mysql/postgresql \u2192 default-logins',
    '\u2022 redis/smb \u2192 cve, misconfig',
    '\u2022 Timeout: 600s, JSONL parsing',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 370, 75, 335, 140, 'Payload Library', [
    "\u2022 SQLi: ' OR '1'='1, UNION SELECT",
    '\u2022 XSS: <script>alert(1)</script>',
    '\u2022 BOLA: ../../../etc/passwd',
    '\u2022 SSRF: http://127.0.0.1',
    '\u2022 Concurrent via asyncio.Semaphore',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  addBulletCard(s, 25, 225, 335, 130, 'Lab-Specific Heuristics', [
    '\u2022 Port 6379 (Redis no-auth) \u2192 CRITICAL',
    '\u2022 Port 3000 (Juice Shop) \u2192 HIGH',
    '\u2022 Port 445 (SMB weak) \u2192 CRITICAL',
    '\u2022 Port 5432 (PG exposed) \u2192 HIGH',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 370, 225, 335, 130, 'Concurrency Model', [
    '\u2022 asyncio.gather() for parallel dispatch',
    '\u2022 httpx.AsyncClient (10s timeout)',
    '\u2022 Up to 50 concurrent endpoint tests',
    '\u2022 Response analysis: codes + content',
  ], { border: COLORS.ACCENT_BLUE });

  addSlideNumber(s, 12);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 13 — VALIDATION AGENT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'VALIDATION AGENT \u2014 Deep Dive', 'False Positive Filtering & Confidence Scoring');

  addBulletCard(s, 25, 75, 335, 160, 'Deterministic Filtering (Stage 1)', [
    '\u2022 Confidence threshold: \u2265 0.6',
    '\u2022 Evidence completeness check',
    '\u2022 Cross-reference known patterns',
    '\u2022 Reject without evidence',
    '\u2022 Status: OPEN \u2192 FALSE_POSITIVE',
    '\u2022 100% reproducible',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  addBulletCard(s, 370, 75, 335, 160, 'LLM Re-Validation (Stage 2)', [
    '\u2022 Only for Stage 1 passes',
    '\u2022 Google Gemini 2.0 Flash',
    '\u2022 Input: type, URL, evidence, conf',
    '\u2022 Output: REAL / FALSE_POSITIVE',
    '\u2022 New confidence assigned',
    '\u2022 Non-deterministic enhancer',
  ], { border: COLORS.ACCENT_CYAN });

  // Funnel visualization
  addTextBox(s, 25, 245, 680, 18, 'VALIDATION FUNNEL',
    { size: 12, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });

  const funnelData = [
    ['ALL FINDINGS', 600, COLORS.ACCENT_RED],
    ['Confidence \u2265 0.6', 450, COLORS.ACCENT_ORANGE],
    ['LLM Verified', 300, COLORS.ACCENT_GREEN],
  ];

  funnelData.forEach(function(f, i) {
    const y = 270 + i * 38;
    const x = (SLIDE_W - f[1]) / 2;
    addCard(s, x, y, f[1], 30, COLORS.BG_CARD, f[2], 2);
    addTextBox(s, x, y + 4, f[1], 20, f[0],
      { size: 10, color: f[2], bold: true, align: 'CENTER' });
  });

  addSlideNumber(s, 13);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 14 — REPORTING AGENT
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'REPORTING AGENT \u2014 Deep Dive', 'AI-Generated Advisory & PoC Scripts');

  addBulletCard(s, 25, 75, 335, 145, 'Executive Summary', [
    '\u2022 Powered by Google Gemini 2.0 Flash',
    '\u2022 Target: Non-technical CEO/CTO',
    '\u2022 3-4 sentences on security posture',
    '\u2022 Most concerning finding highlighted',
    '\u2022 Simple language, no jargon policy',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  addBulletCard(s, 370, 75, 335, 145, 'PoC Generation', [
    '\u2022 Auto Python scripts for Critical/High',
    '\u2022 Templates: SQLi, XSS, BOLA exploits',
    '\u2022 Target URL + payload injection',
    '\u2022 Responsible disclosure format',
    '\u2022 Facilitates remediation verification',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 25, 230, 335, 130, 'Remediation Intelligence', [
    '\u2022 Vuln-specific fix recommendations',
    '\u2022 Config hardening suggestions',
    '\u2022 Mapped to OWASP best practices',
    '\u2022 Drives ActionItem generation',
  ], { border: COLORS.ACCENT_BLUE });

  addBulletCard(s, 370, 230, 335, 130, 'Report Assembly', [
    '\u2022 Full Markdown report',
    '\u2022 Risk score + vulnerability table',
    '\u2022 Asset inventory + ports',
    '\u2022 Exportable via Reports panel',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  addSlideNumber(s, 14);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 15 — UNIFIED RISK ENGINE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'UNIFIED RISK ENGINE', 'Deterministic Risk Quantification Framework');

  // Formula
  addCard(s, 25, 72, 670, 55, COLORS.BG_CARD_ALT, COLORS.ACCENT_CYAN, 2);
  addTextBox(s, 35, 75, 650, 25,
    'RISK  =  min(100,  PENALTY  \u00D7  ASSET_MULT  \u00D7  EXPOSURE_MULT)',
    { size: 16, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });
  addTextBox(s, 35, 100, 650, 20,
    'PENALTY = \u03A3(severity_weight \u00D7 confidence) + \u03A3(port_risk_penalty)',
    { size: 10, color: COLORS.TEXT_LIGHT, align: 'CENTER' });

  // Three columns
  addBulletCard(s, 25, 135, 215, 215, 'Severity Weights', [
    'CRITICAL \u2192 25 pts',
    'HIGH \u2192 15 pts',
    'MEDIUM \u2192 7 pts',
    'LOW \u2192 2 pts',
    'INFO \u2192 0 pts',
    '',
    'Weighted by confidence (0\u20131)',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 250, 135, 215, 215, 'Port Risk Penalties', [
    'FTP (21) \u2192 15 pts',
    'Telnet (23) \u2192 20 pts',
    'SMB (445) \u2192 20 pts',
    'RDP (3389) \u2192 15 pts',
    'Redis (6379) \u2192 10 pts',
    'PG (5432) \u2192 10 pts',
    'MySQL (3306) \u2192 10 pts',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  addBulletCard(s, 475, 135, 215, 215, 'Multipliers', [
    'CRITICAL \u2192 1.5\u00D7',
    'HIGH \u2192 1.2\u00D7',
    'MEDIUM \u2192 1.0\u00D7',
    'LOW \u2192 0.8\u00D7',
    '',
    'Public IP \u2192 1.0\u00D7',
    'Private (RFC1918) \u2192 0.6\u00D7',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  addSlideNumber(s, 15);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 16 — WORKED EXAMPLE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'RISK SCORING \u2014 Worked Example', 'Deterministic Calculation Walkthrough');

  // Scenario
  addCard(s, 25, 72, 670, 68, COLORS.BG_CARD, COLORS.ACCENT_BLUE, 1.5);
  addTextBox(s, 40, 75, 640, 18, 'SCENARIO:  Lab Redis Cache (10.10.30.20)',
    { size: 13, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 40, 95, 640, 15,
    'Asset: MEDIUM (1.0\u00D7)  |  Network: Private (0.6\u00D7)  |  Port 6379 open (Redis, no auth)',
    { size: 9, color: COLORS.TEXT_LIGHT });
  addTextBox(s, 40, 112, 640, 15,
    'Finding 1: CRITICAL \u2014 Unprotected Redis (conf: 1.0)  |  Finding 2: HIGH \u2014 Service Exposure (conf: 0.8)',
    { size: 9, color: COLORS.TEXT_LIGHT });

  // Steps
  const steps = [
    ['Step 1: Vuln Penalties', 'CRITICAL: 25 \u00D7 1.0 = 25  |  HIGH: 15 \u00D7 0.8 = 12', COLORS.ACCENT_RED],
    ['Step 2: Port Risk', 'Redis (6379): +10 points', COLORS.ACCENT_ORANGE],
    ['Step 3: Total Penalty', '\u03A3 = 25 + 12 + 10 = 47.0', COLORS.ACCENT_BLUE],
    ['Step 4: Multipliers', '47 \u00D7 1.0 (MEDIUM) \u00D7 0.6 (Private) = 28.2', COLORS.ACCENT_GREEN],
    ['Step 5: Final Score', 'RISK = min(100, 28.2) = 28.2 / 100', COLORS.ACCENT_CYAN],
  ];

  steps.forEach(function(step, i) {
    const y = 150 + i * 45;
    addCard(s, 25, y, 670, 38, COLORS.BG_CARD, step[2]);
    addTextBox(s, 40, y + 6, 200, 25, step[0],
      { size: 10, color: step[2], bold: true });
    addTextBox(s, 250, y + 6, 430, 25, step[1],
      { size: 10, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 16);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 17 — DETERMINISTIC VS NON-DETERMINISTIC
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'DETERMINISTIC vs. NON-DETERMINISTIC', 'Hybrid Intelligence Architecture');

  // Left column
  addCard(s, 25, 72, 335, 290, COLORS.BG_CARD, COLORS.ACCENT_GREEN, 2);
  addTextBox(s, 35, 76, 315, 20, 'DETERMINISTIC COMPONENTS',
    { size: 13, color: COLORS.ACCENT_GREEN, bold: true });

  const detItems = [
    '\u2713 Risk Score Calculation',
    '   Same vulns + ports = Same score',
    '\u2713 Nmap Port Scanning',
    '   Reproducible infrastructure discovery',
    '\u2713 Nuclei Template Matching',
    '   Known CVE patterns, no ambiguity',
    '\u2713 Confidence Filtering (\u22650.6)',
    '   Binary pass/fail gate',
    '\u2713 Health Score Computation',
    '   Fixed deduction rules per severity',
    '\u2713 Action Item Generation',
    '   Rule-based: HIGH/CRITICAL \u2192 action',
  ];

  addTextBox(s, 35, 98, 315, 255, detItems.join('\n'),
    { size: 8, color: COLORS.TEXT_LIGHT });

  // Right column
  addCard(s, 370, 72, 335, 290, COLORS.BG_CARD, COLORS.ACCENT_CYAN, 2);
  addTextBox(s, 380, 76, 315, 20, 'NON-DETERMINISTIC COMPONENTS',
    { size: 13, color: COLORS.ACCENT_CYAN, bold: true });

  const ndetItems = [
    '\u25CB LLM Re-Validation (Gemini)',
    '   VERDICT: REAL / FALSE_POSITIVE',
    '\u25CB Executive Summary Generation',
    '   Natural language for non-tech audience',
    '\u25CB PoC Script Enhancement',
    '   LLM-augmented exploit code',
    '\u25CB Asset Intelligence Advisory',
    '   Risk explanation, business impact',
    '\u25CB SIEM Event Analysis',
    '   AI interpretation of alerts',
    '',
    'KEY: AI enhances but never overrides',
    'deterministic scoring decisions.',
  ];

  addTextBox(s, 380, 98, 315, 255, ndetItems.join('\n'),
    { size: 8, color: COLORS.TEXT_LIGHT });

  addSlideNumber(s, 17);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 18 — ASSET CRITICALITY
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'ASSET CRITICALITY WEIGHTING', 'Context-Aware Risk Amplification');

  addTextBox(s, 30, 75, 660, 40,
    'The Unified Risk Engine does not treat all assets equally. A CRITICAL vulnerability on a production ' +
    'database carries more organizational risk than the same vulnerability on a test workstation.',
    { size: 9, color: COLORS.TEXT_LIGHT });

  // Visual bar chart (manual)
  const barData = [
    ['CRITICAL (1.5\u00D7)', 75, COLORS.ACCENT_RED],
    ['HIGH (1.2\u00D7)', 60, COLORS.ACCENT_ORANGE],
    ['MEDIUM (1.0\u00D7)', 50, COLORS.ACCENT_CYAN],
    ['LOW (0.8\u00D7)', 40, COLORS.ACCENT_GREEN],
  ];

  addTextBox(s, 30, 118, 250, 15, 'Risk Score Impact (Penalty = 50)',
    { size: 9, color: COLORS.ACCENT_CYAN, bold: true });

  barData.forEach(function(bar, i) {
    const y = 140 + i * 35;
    addTextBox(s, 30, y, 120, 18, bar[0], { size: 8, color: COLORS.TEXT_LIGHT });
    const barWidth = bar[1] * 3;
    addCard(s, 160, y, barWidth, 22, bar[2]);
    addTextBox(s, 160 + barWidth + 5, y, 30, 18, String(bar[1]),
      { size: 9, color: bar[2], bold: true });
  });

  // Exposure card
  addBulletCard(s, 400, 118, 290, 180, 'Network Exposure Factor', [
    '\u2022 Public IP: 1.0\u00D7 (full risk)',
    '\u2022 Private (RFC 1918): 0.6\u00D7',
    '',
    'Rationale: Internal assets require',
    'attacker to breach perimeter first,',
    'reducing effective exposure.',
    '',
    'Combined: Criticality \u00D7 Exposure',
    'e.g., CRITICAL + Public = 1.5\u00D7',
    'e.g., LOW + Private = 0.48\u00D7',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  addSlideNumber(s, 18);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 19 — HEALTH SCORE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'HEALTH SCORE COMPUTATION', 'Complementary Metric (100 = Safe)');

  addCard(s, 25, 72, 670, 40, COLORS.BG_CARD_ALT, COLORS.ACCENT_GREEN, 2);
  addTextBox(s, 35, 78, 650, 25,
    'HEALTH = max(0, 100 \u2212 \u03A3(vuln_deductions) \u2212 \u03A3(port_deductions))  |  Cap: 90 if vulns exist',
    { size: 12, color: COLORS.ACCENT_GREEN, bold: true, align: 'CENTER' });

  addBulletCard(s, 25, 120, 335, 130, 'Vulnerability Deductions', [
    'CRITICAL: \u221220 pts each',
    'HIGH: \u221210 pts each',
    'MEDIUM: \u22125 pts each',
    'LOW: \u22120 pts each',
    'Cap: max 90 if vulns exist',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 370, 120, 325, 130, 'Port Deductions', [
    'FTP (21): \u221215 pts',
    'Telnet (23): \u221215 pts',
    'SMB (445): \u221215 pts',
    'RDP (3389): \u221215 pts',
    'Floor: never below 0',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  // Example
  addCard(s, 25, 260, 670, 65, COLORS.BG_CARD, COLORS.ACCENT_CYAN);
  addTextBox(s, 40, 265, 640, 18, 'EXAMPLE:  2 CRITICAL + 1 HIGH + Open Telnet',
    { size: 11, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 40, 285, 640, 15,
    'Health = 100 \u2212 (2\u00D720) \u2212 (1\u00D710) \u2212 15 = 100 \u2212 40 \u2212 10 \u2212 15 = 35 / 100',
    { size: 10, color: COLORS.TEXT_LIGHT });
  addTextBox(s, 40, 302, 640, 15,
    'Interpretation: Asset is in POOR health \u2014 immediate remediation required.',
    { size: 9, color: COLORS.ACCENT_RED });

  addSlideNumber(s, 19);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 20 — ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'ACTION ITEM GENERATION', 'Automated Remediation Tracking');

  addBulletCard(s, 25, 75, 335, 175, 'Rule-Based Generation', [
    '\u2022 Rule 1: Critical/High vulns \u2192 REMEDIATION',
    '   title = vuln.title or "Fix {type}"',
    '   priority = severity.upper()',
    '',
    '\u2022 Rule 2: High-risk ports \u2192 CONFIG',
    '   Ports: 21, 23, 445, 3389, 6379',
    '   title = "Secure {service} on {ip}"',
    '',
    '\u2022 Deduplication by title',
  ], { border: COLORS.ACCENT_BLUE });

  addBulletCard(s, 370, 75, 335, 175, 'ActionItem Lifecycle', [
    '\u2022 OPEN \u2192 IN_PROGRESS \u2192 RESOLVED',
    '\u2022 OPEN \u2192 ACCEPTED (risk accepted)',
    '',
    'Types:',
    '\u2022 REMEDIATION \u2014 Fix vulnerability',
    '\u2022 CONFIGURATION \u2014 Harden infra',
    '\u2022 new_device \u2014 New device found',
    '\u2022 alert \u2014 SIEM notification',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  // Flow
  const flowItems = ['Scan Complete', 'Risk Engine', 'Action Items', 'Dashboard', 'Resolved'];
  flowItems.forEach(function(label, i) {
    const x = 30 + i * 135;
    addCard(s, x, 270, 120, 40, COLORS.BG_CARD, COLORS.ACCENT_CYAN);
    addTextBox(s, x, 278, 120, 25, label,
      { size: 8, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });
    if (i < 4) {
      addArrow(s, x + 122, 282, 12);
    }
  });

  addSlideNumber(s, 20);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 21 — CELERY PIPELINE
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'CELERY TASK PIPELINE', 'Asynchronous Scan Execution & Scheduling');

  const phases = [
    ['Phase 1: NMAP', 'Nmap \u2192 ScanAsset + AssetService + Vulnerability records', COLORS.ACCENT_BLUE],
    ['Phase 2: AI INTEL', 'Gemini batch_analyze \u2192 ai_insight JSON per asset', COLORS.ACCENT_CYAN],
    ['Phase 3: NUCLEI', 'Template-based vuln detection \u2192 Vulnerability records with CVE', COLORS.ACCENT_RED],
    ['Phase 4: RISK ENG', 'UnifiedRiskEngine \u2192 risk_score + health_score + action_items', COLORS.ACCENT_GREEN],
    ['Phase 5: MONITOR', 'AssetMonitor \u2192 Detect new devices, update NetworkAsset', COLORS.ACCENT_ORANGE],
    ['Phase 6: PUBLISH', 'Redis Pub/Sub \u2192 WebSocket \u2192 Frontend RISK_UPDATE event', COLORS.ACCENT_CYAN],
  ];

  phases.forEach(function(phase, i) {
    const y = 72 + i * 45;
    addCard(s, 25, y, 670, 38, COLORS.BG_CARD, phase[2]);

    const badge = addCard(s, 30, y + 5, 140, 25, phase[2]);
    addTextBox(s, 30, y + 6, 140, 22, phase[0],
      { size: 8, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });

    addTextBox(s, 180, y + 8, 500, 22, phase[1],
      { size: 9, color: COLORS.TEXT_LIGHT });
  });

  // Celery Beat info
  addCard(s, 25, 348, 670, 32, COLORS.BG_CARD_ALT, COLORS.ACCENT_ORANGE);
  addTextBox(s, 35, 352, 650, 22,
    'CELERY BEAT:  Hourly scans via crontab(minute=0)  |  max_retries=2  |  retry_delay=30s',
    { size: 9, color: COLORS.ACCENT_ORANGE, align: 'CENTER' });

  addSlideNumber(s, 21);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 22 — SIEM/SOAR
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'SIEM / SOAR INTEGRATION', 'Wazuh + Elasticsearch + n8n');

  addBulletCard(s, 15, 75, 230, 155, 'Wazuh Manager', [
    '\u2022 Security event mgmt',
    '\u2022 Agent monitoring (1514/1515)',
    '\u2022 REST API (port 55000)',
    '\u2022 Active response triggers',
    '\u2022 JWT authentication',
  ], { border: COLORS.ACCENT_BLUE });

  addBulletCard(s, 250, 75, 230, 155, 'Elasticsearch + Kibana', [
    '\u2022 Log aggregation (9200)',
    '\u2022 sme-lab-events-*',
    '\u2022 wazuh-alerts-*',
    '\u2022 ECS format compliance',
    '\u2022 Kibana dashboards (5601)',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  addBulletCard(s, 485, 75, 230, 155, 'n8n SOAR', [
    '\u2022 Workflow automation (5678)',
    '\u2022 Webhook-triggered response',
    '\u2022 Found 404 API connector',
    '\u2022 Automated incident flows',
    '\u2022 Slack/Email notifications',
  ], { border: COLORS.ACCENT_ORANGE, titleColor: COLORS.ACCENT_ORANGE });

  // Log flow
  addTextBox(s, 25, 240, 670, 18, 'LOG FLOW ARCHITECTURE',
    { size: 11, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });

  const logFlow = ['Traffic Gen', 'Log Shipper', 'Elasticsearch', 'Wazuh', 'Dashboard', 'n8n'];
  const logColors = [COLORS.ACCENT_RED, COLORS.ACCENT_ORANGE, COLORS.ACCENT_GREEN,
                     COLORS.ACCENT_BLUE, COLORS.ACCENT_CYAN, COLORS.ACCENT_ORANGE];

  logFlow.forEach(function(label, i) {
    const x = 15 + i * 118;
    addCard(s, x, 262, 108, 45, COLORS.BG_CARD, logColors[i]);
    addTextBox(s, x, 270, 108, 30, label,
      { size: 8, color: logColors[i], bold: true, align: 'CENTER' });
    if (i < 5) addArrow(s, x + 110, 278, 8);
  });

  // Wazuh rules
  addCard(s, 25, 320, 670, 45, COLORS.BG_CARD, COLORS.ACCENT_BLUE);
  addTextBox(s, 35, 322, 650, 15, 'Wazuh Rule Mapping',
    { size: 9, color: COLORS.ACCENT_CYAN, bold: true });
  addTextBox(s, 35, 338, 650, 20,
    'Auth Failure \u2192 Rule 5710 (L5)  \u2022  Port Scan \u2192 Rule 510 (L6)  \u2022  Brute Force \u2192 Rule 5712 (L10)',
    { size: 8, color: COLORS.TEXT_LIGHT });

  addSlideNumber(s, 22);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 23 — LIVING LAB
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'LIVING LAB ENVIRONMENT', '4 Subnets, 11 Vulnerable Containers');

  const subnets = [
    ['DMZ (10.10.10.0/24)', COLORS.ACCENT_RED, [
      ['Juice Shop', '10.10.10.10:3000'],
      ['API Gateway', '10.10.10.20:8081'],
      ['DNS Server', '10.10.10.30:53'],
    ]],
    ['Corporate (10.10.20.0/24)', COLORS.ACCENT_ORANGE, [
      ['File Server', '10.10.20.10:445'],
      ['Mail Server', '10.10.20.20'],
      ['Workstation', '10.10.20.40'],
    ]],
    ['Data (10.10.30.0/24)', COLORS.ACCENT_CYAN, [
      ['PostgreSQL', '10.10.30.10:5432'],
      ['Redis Cache', '10.10.30.20:6380'],
    ]],
    ['Mgmt (10.10.40.0/24)', COLORS.ACCENT_GREEN, [
      ['Traffic Gen', '10.10.40.x'],
      ['Log Shipper', '10.10.40.x'],
    ]],
  ];

  subnets.forEach(function(subnet, i) {
    const x = 15 + i * 175;

    // Header
    const header = addCard(s, x, 72, 168, 28, subnet[1]);
    addTextBox(s, x, 75, 168, 22, subnet[0],
      { size: 8, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });

    // Hosts
    subnet[2].forEach(function(host, j) {
      const y = 108 + j * 85;
      addCard(s, x, y, 168, 75, COLORS.BG_CARD, subnet[1]);
      addTextBox(s, x + 8, y + 8, 152, 18, host[0],
        { size: 10, color: COLORS.TEXT_WHITE, bold: true });
      addTextBox(s, x + 8, y + 30, 152, 18, host[1],
        { size: 8, color: COLORS.ACCENT_CYAN });
    });
  });

  addSlideNumber(s, 23);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 24 — TRAFFIC & LOGS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'TRAFFIC GENERATION & LOG SHIPPING', 'Simulated Enterprise Activity');

  addBulletCard(s, 25, 75, 335, 155, '7 Traffic Generators (Threaded)', [
    '\u2022 HTTP: Employee browsing + API',
    '\u2022 DNS: Internal + external queries',
    '\u2022 SMB: File server access',
    '\u2022 Database: PostgreSQL queries',
    '\u2022 Redis: GET/SET cache operations',
    '\u2022 Email: SMTP/POP3/IMAP',
    '\u2022 Suspicious: Scans, brute force, exfil',
  ], { border: COLORS.ACCENT_RED, titleColor: COLORS.ACCENT_RED });

  addBulletCard(s, 370, 75, 335, 155, 'Log Shipper Pipeline', [
    '\u2022 Tail /var/log/traffic/traffic.log',
    '\u2022 Transform to ECS format',
    '\u2022 Transform to Wazuh alert format',
    '\u2022 Buffer: size \u2265 50 or 10s interval',
    '\u2022 Bulk-index to Elasticsearch',
    '\u2022 sme-lab-events-* + wazuh-alerts-*',
    '\u2022 Proper index field mappings',
  ], { border: COLORS.ACCENT_GREEN, titleColor: COLORS.ACCENT_GREEN });

  // Intensity table
  addTextBox(s, 25, 240, 670, 18, 'Traffic Intensity Intervals (seconds)',
    { size: 10, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });

  const intensityHeaders = ['', 'HTTP', 'DNS', 'SMB', 'DB', 'Redis', 'Email', 'Suspicious'];
  intensityHeaders.forEach(function(h, i) {
    addTextBox(s, 25 + i * 82, 260, 80, 18, h,
      { size: 8, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });
  });

  const intensityData = [
    ['Low', '30', '45', '60', '40', '20', '120', '300'],
    ['Medium', '10', '15', '30', '20', '10', '60', '120'],
    ['High', '3', '5', '10', '8', '5', '30', '60'],
  ];

  const rowColors = [COLORS.ACCENT_GREEN, COLORS.ACCENT_ORANGE, COLORS.ACCENT_RED];
  intensityData.forEach(function(row, i) {
    const y = 280 + i * 28;
    addCard(s, 25, y, 655, 24, i % 2 === 0 ? COLORS.BG_CARD : COLORS.BG_CARD_ALT);
    row.forEach(function(cell, j) {
      addTextBox(s, 25 + j * 82, y + 2, 80, 18, cell,
        { size: 8, color: j === 0 ? rowColors[i] : COLORS.TEXT_LIGHT,
          bold: j === 0, align: 'CENTER' });
    });
  });

  addSlideNumber(s, 24);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 25 — DASHBOARD COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'DASHBOARD & REAL-TIME VISUALIZATION', 'React/Vite SPA with WebSocket Updates');

  const components = [
    ['RiskScore Gauge', '0\u2013100 gauge\nGreen/Orange/Red', COLORS.ACCENT_CYAN],
    ['Scan Pipeline', 'Visual step progress\nQueued\u2192Nmap\u2192Nuclei\u2192AI', COLORS.ACCENT_BLUE],
    ['Agent Log Viewer', 'Console terminal\nReal-time 2s fetch', COLORS.ACCENT_GREEN],
    ['Action Center', 'Remediation items\nOPEN \u2192 RESOLVED', COLORS.ACCENT_ORANGE],
    ['Activity Feed', 'Security events\nSeverity-prioritized', COLORS.ACCENT_RED],
    ['Network Topology', 'Graph viz of\ndiscovered assets', COLORS.ACCENT_BLUE],
    ['Risk Heatmap', 'Asset risk matrix\nColor-coded grid', COLORS.ACCENT_RED],
    ['Lab Environment', 'Container status\nTelemetry & controls', COLORS.ACCENT_GREEN],
  ];

  components.forEach(function(comp, i) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 15 + col * 175;
    const y = 72 + row * 155;
    addCard(s, x, y, 168, 140, COLORS.BG_CARD, comp[2], 1.5);
    addTextBox(s, x + 8, y + 10, 152, 20, comp[0],
      { size: 11, color: comp[2], bold: true });
    addTextBox(s, x + 8, y + 40, 152, 80, comp[1],
      { size: 9, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 25);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 26 — REAL-TIME EVENTS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'REAL-TIME EVENT ARCHITECTURE', 'Redis Pub/Sub \u2192 WebSocket \u2192 React Context');

  const rtStages = [
    ['BACKEND\n(Event Publisher)', 'Redis Pub/Sub\npublish("RISK_UPDATE")\nPost Risk Engine', COLORS.ACCENT_BLUE],
    ['GATEWAY\n(FastAPI WebSocket)', 'Endpoint: /ws/logs\nRedis listener + backoff\n2s\u21924s\u21928s\u219232s', COLORS.ACCENT_CYAN],
    ['FRONTEND\n(RealTimeContext)', 'WS.onmessage\ndispatch({type,payload})\nAll components update', COLORS.ACCENT_GREEN],
  ];

  rtStages.forEach(function(stage, i) {
    const x = 20 + i * 235;
    addCard(s, x, 78, 220, 155, COLORS.BG_CARD, stage[2], 2);
    addTextBox(s, x + 10, 85, 200, 35, stage[0],
      { size: 12, color: stage[2], bold: true, align: 'CENTER' });
    addTextBox(s, x + 10, 125, 200, 90, stage[1],
      { size: 9, color: COLORS.TEXT_LIGHT, align: 'CENTER' });
    if (i < 2) addArrow(s, x + 222, 150, 12);
  });

  // Event types
  addCard(s, 20, 245, 680, 130, COLORS.BG_CARD_ALT, COLORS.ACCENT_CYAN);
  addTextBox(s, 30, 248, 660, 18, 'WebSocket Event Types',
    { size: 11, color: COLORS.ACCENT_CYAN, bold: true });

  const wsEvents = [
    'RISK_UPDATE \u2192 {scan_id, overall_score, health_score, vuln_count} \u2192 KPI Gauges',
    '[RECON] start_recon \u2192 {target_url, scan_type} \u2192 Agent Log + Pipeline',
    '[ATTACK] test_complete \u2192 {findings_count} \u2192 Activity Feed',
    '[VALIDATION] complete \u2192 {validated, false_positives} \u2192 Status indicators',
    '[REPORTING] complete \u2192 {report_summary, poc_count} \u2192 Reports panel',
  ];

  addTextBox(s, 30, 268, 660, 100, wsEvents.map(function(e) { return '\u2022 ' + e; }).join('\n'),
    { size: 8, color: COLORS.TEXT_LIGHT });

  addSlideNumber(s, 26);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 27 — CAPABILITIES MATRIX
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'SECURITY SCANNING CAPABILITIES MATRIX', 'Tool Coverage & Intelligence Layers');

  const caps = [
    ['Port Scanning', 'Nmap', 'ReconAgent', '\u2713', '\u2014'],
    ['Service Detection', 'Nmap -sV', 'ReconAgent', '\u2713', '\u2014'],
    ['OS Detection', 'Nmap -O', 'ReconAgent', '\u2713', '\u2014'],
    ['Web Crawling', 'Playwright', 'ReconAgent', '\u2713', '\u2014'],
    ['Template Vulns', 'Nuclei', 'AttackAgent', '\u2713', '\u2014'],
    ['Payload Testing', 'AttackAgent', 'AttackAgent', '\u2713', '\u2014'],
    ['FP Filtering', 'Validation', 'ValidationAgent', '\u2713', 'Gemini'],
    ['Risk Scoring', 'UnifiedRiskEngine', 'All', '\u2713', '\u2014'],
    ['PoC Scripts', 'Templates+LLM', 'ReportingAgent', 'Template', 'Gemini'],
    ['Exec Summary', 'LLM', 'ReportingAgent', '\u2014', 'Gemini'],
    ['Asset Intel', 'Gemini', 'IntelligenceAgent', '\u2014', 'Gemini'],
  ];

  const capHeaders = ['Capability', 'Tool', 'Agent', 'Deterministic', 'AI-Enhanced'];
  capHeaders.forEach(function(h, j) {
    addTextBox(s, 30 + j * 132, 72, 128, 18, h,
      { size: 8, color: COLORS.ACCENT_CYAN, bold: true });
  });

  caps.forEach(function(cap, i) {
    const y = 92 + i * 26;
    const bg = i % 2 === 0 ? COLORS.BG_CARD : COLORS.BG_CARD_ALT;
    addCard(s, 25, y, 670, 23, bg);
    cap.forEach(function(val, j) {
      const color = (j >= 3 && val !== '\u2014') ? COLORS.ACCENT_GREEN : COLORS.TEXT_LIGHT;
      addTextBox(s, 30 + j * 132, y + 2, 128, 18, val,
        { size: 8, color: color });
    });
  });

  addSlideNumber(s, 27);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 28 — API ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'API ENDPOINTS OVERVIEW', 'FastAPI REST + WebSocket Gateway');

  const apiGroups = [
    ['Scans', COLORS.ACCENT_CYAN, [
      'POST /scans \u2014 Sync scan (Celery)',
      'POST /scans/ai \u2014 AI scan (Orchestrator)',
      'GET /scans \u2014 List with status filter',
      'GET /scans/{id} \u2014 Detail + vulns + assets',
    ]],
    ['Dashboard', COLORS.ACCENT_GREEN, [
      'GET /dashboard/risk-overview',
      'GET /dashboard/kpi-snapshot',
      'GET /dashboard/actions',
      'POST /dashboard/refresh-risk',
    ]],
    ['Network', COLORS.ACCENT_BLUE, [
      'GET /network/assets',
      'GET /network/assets/new',
      'GET /network/activity',
    ]],
    ['SIEM & Lab', COLORS.ACCENT_ORANGE, [
      'GET /siem/alerts \u2014 ES alerts',
      'GET /siem/health \u2014 ES health',
      'GET /lab/status \u2014 Container status',
      'POST /lab/seed \u2014 Register targets',
    ]],
  ];

  apiGroups.forEach(function(group, i) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 25 + col * 345;
    const y = 72 + row * 160;
    addBulletCard(s, x, y, 335, 150, group[0], group[1],
      { border: group[1], titleColor: group[1] });
  });

  addSlideNumber(s, 28);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 29 — RESULTS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'VULNERABILITY ANALYSIS \u2014 Lab Results', 'Severity Distribution & Coverage');

  // Manual bar chart for severities
  const sevData = [
    ['Critical', 4, COLORS.ACCENT_RED],
    ['High', 8, COLORS.ACCENT_ORANGE],
    ['Medium', 12, '#FFD700'],
    ['Low', 6, COLORS.ACCENT_GREEN],
    ['Info', 3, COLORS.ACCENT_BLUE],
  ];

  addTextBox(s, 25, 72, 300, 18, 'Severity Distribution',
    { size: 12, color: COLORS.ACCENT_CYAN, bold: true });

  sevData.forEach(function(sev, i) {
    const y = 95 + i * 38;
    addTextBox(s, 25, y + 3, 65, 18, sev[0],
      { size: 9, color: COLORS.TEXT_LIGHT });
    const barW = sev[1] * 18;
    addCard(s, 95, y, barW, 28, sev[2]);
    addTextBox(s, 95 + barW + 5, y + 3, 30, 20, String(sev[1]),
      { size: 10, color: sev[2], bold: true });
  });

  // Summary
  addBulletCard(s, 360, 72, 340, 295, 'Lab Scan Findings Summary', [
    '\u2022 33 total vulnerabilities discovered',
    '\u2022 4 CRITICAL: Redis no-auth, SMB,',
    '  PostgreSQL, DNS zone transfer',
    '\u2022 8 HIGH: Juice Shop, default logins',
    '\u2022 12 MEDIUM: HTTP misconfiguration',
    '\u2022 6 LOW: Information disclosure',
    '\u2022 3 INFO: Version banners',
    '',
    '\u2022 False positive rate: <5%',
    '\u2022 Avg scan: 3-5 min (quick)',
    '\u2022 100% deterministic risk scoring',
  ], { border: COLORS.ACCENT_CYAN });

  addSlideNumber(s, 29);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 30 — NOVEL CONTRIBUTIONS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'NOVEL CONTRIBUTIONS', 'Research Impact & Innovation');

  const contribs = [
    ['1', 'Unified Risk Engine', 'Deterministic scoring: CVSS-like severity + asset criticality + exposure. Reproducible for compliance.', COLORS.ACCENT_CYAN],
    ['2', 'Multi-Agent Pipeline', '4-stage autonomous DAST: Recon \u2192 Attack \u2192 Validation \u2192 Reporting. Minutes not days.', COLORS.ACCENT_BLUE],
    ['3', 'SME Simplification', 'AI translation of CVE data to non-technical language via Gemini for CEO-level decisions.', COLORS.ACCENT_GREEN],
    ['4', 'Living Lab', '4-subnet, 11-container network modeling realistic SME topology with traffic simulation.', COLORS.ACCENT_ORANGE],
    ['5', 'Hybrid Intelligence', 'Clean deterministic/non-deterministic separation. AI enhances, never overrides.', COLORS.ACCENT_RED],
  ];

  contribs.forEach(function(c, i) {
    const y = 72 + i * 62;

    const circle = s.insertShape(SlidesApp.ShapeType.ELLIPSE, 30, y + 5, 28, 28);
    circle.getFill().setSolidFill(c[3]);
    circle.getBorder().setTransparent();
    addTextBox(s, 30, y + 7, 28, 22, c[0],
      { size: 12, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });

    addTextBox(s, 65, y, 200, 22, c[1],
      { size: 12, color: c[3], bold: true });
    addTextBox(s, 65, y + 22, 620, 32, c[2],
      { size: 9, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 30);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 31 — METRICS
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'QUANTITATIVE METRICS', 'Platform Performance & Coverage');

  const kpis = [
    ['Microservices', '11', COLORS.ACCENT_CYAN],
    ['Agent Types', '4', COLORS.ACCENT_BLUE],
    ['Integrations', '5+', COLORS.ACCENT_GREEN],
    ['Lab Containers', '11', COLORS.ACCENT_ORANGE],
    ['Subnets', '4', COLORS.ACCENT_RED],
  ];

  kpis.forEach(function(kpi, i) {
    addKPIBox(s, 20 + i * 140, 78, 132, 65, kpi[0], kpi[1], kpi[2]);
  });

  const kpis2 = [
    ['Concurrent Tests', '50', COLORS.ACCENT_CYAN],
    ['Quick Scan', '2-5m', COLORS.ACCENT_GREEN],
    ['Deep Scan', '15+m', COLORS.ACCENT_ORANGE],
    ['FP Rate', '<5%', COLORS.ACCENT_GREEN],
    ['DB Tables', '9', COLORS.ACCENT_BLUE],
  ];

  kpis2.forEach(function(kpi, i) {
    addKPIBox(s, 20 + i * 140, 158, 132, 65, kpi[0], kpi[1], kpi[2]);
  });

  addBulletCard(s, 20, 240, 680, 110, 'Platform Highlights', [
    '\u2022 Risk scoring is 100% deterministic \u2014 same inputs = identical outputs (audit-ready)',
    '\u2022 Celery Beat enables continuous monitoring with hourly automated scans',
    '\u2022 WebSocket pipeline: <100ms latency from scan to dashboard update',
    '\u2022 Docker Compose with health checks, resource limits, auto-restart',
  ], { border: COLORS.ACCENT_CYAN });

  addSlideNumber(s, 31);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 32 — FUTURE WORK
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'FUTURE WORK', 'Roadmap & Research Extensions');

  const futureItems = [
    ['Multi-Tenant Architecture', 'RBAC, tenant isolation, per-org dashboards.', COLORS.ACCENT_CYAN],
    ['ML Anomaly Detection', 'Baseline traffic + zero-day detection.', COLORS.ACCENT_BLUE],
    ['Kubernetes Orchestration', 'Horizontal scaling, auto-healing, prod-grade.', COLORS.ACCENT_GREEN],
    ['Compliance Mapping', 'ISO 27001, NIST CSF, PCI-DSS mapping.', COLORS.ACCENT_ORANGE],
    ['Agentic Remediation', 'Auto-apply fixes with human approval.', COLORS.ACCENT_RED],
    ['Extended Tools', 'Burp Suite API, Snyk, CSPM integration.', COLORS.ACCENT_CYAN],
  ];

  futureItems.forEach(function(item, i) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 25 + col * 345;
    const y = 72 + row * 100;
    addCard(s, x, y, 335, 88, COLORS.BG_CARD, item[2], 1.5);
    addTextBox(s, x + 12, y + 8, 310, 22, item[0],
      { size: 11, color: item[2], bold: true });
    addTextBox(s, x + 12, y + 32, 310, 48, item[1],
      { size: 9, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 32);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 33 — CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);
  addTitle(s, 'CONCLUSION', 'Summary & Key Takeaways');

  const conclusions = [
    'Found 404 demonstrates that enterprise-grade security orchestration can be made accessible to SMEs through intelligent automation and AI-driven advisory generation.',
    'The Unified Risk Engine provides deterministic, reproducible risk quantification that bridges raw vulnerability data and actionable business intelligence.',
    'The multi-agent pipeline reduces MTTD from days to minutes by autonomously chaining reconnaissance, attack, validation, and reporting.',
    'The hybrid architecture ensures both reliability and contextual intelligence \u2014 AI enhances but never overrides deterministic security decisions.',
    'The living lab validates the platform against a realistic SME topology with 4 subnets and 11 vulnerable containers.',
  ];

  conclusions.forEach(function(text, i) {
    const y = 72 + i * 62;
    const check = s.insertShape(SlidesApp.ShapeType.ELLIPSE, 30, y + 5, 25, 25);
    check.getFill().setSolidFill(COLORS.ACCENT_GREEN);
    check.getBorder().setTransparent();
    addTextBox(s, 30, y + 6, 25, 20, '\u2713',
      { size: 12, color: COLORS.BG_DARK, bold: true, align: 'CENTER' });
    addTextBox(s, 62, y, 630, 55, text,
      { size: 10, color: COLORS.TEXT_LIGHT });
  });

  addSlideNumber(s, 33);


  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 34 — Q&A
  // ═══════════════════════════════════════════════════════════════════════
  s = newSlide(prs);

  addTextBox(s, 50, 60, 620, 50, 'THANK YOU',
    { size: 40, color: COLORS.ACCENT_CYAN, bold: true, align: 'CENTER' });

  addTextBox(s, 50, 115, 620, 35, 'Questions & Discussion',
    { size: 22, color: COLORS.TEXT_WHITE, align: 'CENTER' });

  addAccentLine(s, 280, 160, 160);

  addTextBox(s, 50, 175, 620, 22,
    'Found 404 \u2014 Autonomous Security Orchestration Platform for SMEs',
    { size: 12, color: COLORS.TEXT_DIM, align: 'CENTER' });

  const discussionTopics = [
    'Deterministic vs. Non-Deterministic Architecture',
    'Unified Risk Engine Weighting Calibration',
    'Multi-Agent Orchestration Scalability',
    'Living Lab Fidelity & Real-World Applicability',
  ];

  discussionTopics.forEach(function(topic, i) {
    addTextBox(s, 200, 210 + i * 30, 400, 22, '\u25B8  ' + topic,
      { size: 10, color: COLORS.TEXT_LIGHT });
  });

  // Corner accents
  [[20, 15], [680, 15], [20, 365], [680, 365]].forEach(function(pos) {
    const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, pos[0], pos[1], 20, 20);
    dot.getFill().setSolidFill(COLORS.ACCENT_BLUE);
    dot.getBorder().setTransparent();
  });

  addSlideNumber(s, 34);


  // ═══════════════════════════════════════════════════════════════════════
  // CLEANUP: Remove the original default blank slide
  // ═══════════════════════════════════════════════════════════════════════
  if (defaultSlide) {
    defaultSlide.remove();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════
  Logger.log('Presentation created: ' + prs.getUrl());
  Logger.log('Slides: ' + prs.getSlides().length);
  return prs.getUrl();
}
