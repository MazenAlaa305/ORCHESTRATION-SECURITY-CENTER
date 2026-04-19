"""
Professional PDF Report Generator — Found 404

Produces an audit-ready, multi-section security report:
  1. Cover page
  2. Executive Summary (C-suite narrative)
  3. Business Impact Analysis
  4. Vulnerability Categorization (CVSS-aligned)
  5. Technical Findings (per-vulnerability detail)
  6. Remediation Roadmap
  7. Appendix — scan metadata, integrity signature
"""
from __future__ import annotations

import logging
from datetime import datetime
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)


# ─── Design tokens ────────────────────────────────────────────────────────────
PRIMARY = colors.HexColor("#4338ca")     # indigo-700
ACCENT = colors.HexColor("#06b6d4")      # cyan-500
INK = colors.HexColor("#111827")         # near-black
MUTED = colors.HexColor("#6b7280")       # gray-500
SOFT_BG = colors.HexColor("#f3f4f6")     # gray-100

# CVSS severity palette (aligned with CVSS v3.1 qualitative ratings)
SEV_COLORS = {
    "critical": colors.HexColor("#b91c1c"),  # red-700     CVSS 9.0–10.0
    "high":     colors.HexColor("#ea580c"),  # orange-600  CVSS 7.0–8.9
    "medium":   colors.HexColor("#ca8a04"),  # yellow-600  CVSS 4.0–6.9
    "low":      colors.HexColor("#2563eb"),  # blue-600    CVSS 0.1–3.9
    "info":     colors.HexColor("#6b7280"),  # gray-500    CVSS 0.0
}

SEV_ORDER = ["critical", "high", "medium", "low", "info"]


# ─── Public API ───────────────────────────────────────────────────────────────
class PDFReportGenerator:
    """Builds a professional PDF report from a scan_data dict."""

    @staticmethod
    def generate_report(scan_data: dict, scan_id: str = "", findings_hash: str = "") -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.6 * inch,
            title=f"Found 404 Security Report — {scan_data.get('target', 'Unknown')}",
            author="Found 404 Security Platform",
        )

        styles = _build_styles()
        vulns = scan_data.get("vulnerabilities", []) or []
        sev_counts = _count_severities(vulns)
        elements: list[Any] = []

        # 1. Cover
        elements += _cover_page(scan_data, styles, scan_id)
        elements.append(PageBreak())

        # 2. Executive Summary
        elements += _executive_summary(scan_data, sev_counts, styles)
        elements.append(PageBreak())

        # 3. Business Impact
        elements += _business_impact(scan_data, sev_counts, styles)
        elements.append(PageBreak())

        # 4. Vulnerability Categorization (CVSS)
        elements += _vuln_categorization(vulns, sev_counts, styles)
        elements.append(PageBreak())

        # 5. Technical Findings
        elements += _technical_findings(vulns, styles)
        elements.append(PageBreak())

        # 6. Remediation Roadmap
        elements += _remediation_roadmap(vulns, scan_data.get("actions", []), styles)
        elements.append(PageBreak())

        # 7. Appendix (scan metadata + signature block)
        elements += _appendix(scan_data, styles, scan_id, findings_hash)

        doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
        buffer.seek(0)
        return buffer


# ─── Styles ───────────────────────────────────────────────────────────────────
def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()

    return {
        "cover_title":   ParagraphStyle("cover_title",   parent=base["Title"],
                                        fontSize=32, leading=38, alignment=TA_CENTER,
                                        textColor=PRIMARY, spaceAfter=12),
        "cover_sub":     ParagraphStyle("cover_sub",     parent=base["Normal"],
                                        fontSize=14, alignment=TA_CENTER,
                                        textColor=MUTED, spaceAfter=24),
        "h1":            ParagraphStyle("h1",            parent=base["Heading1"],
                                        fontSize=20, leading=26, textColor=PRIMARY,
                                        spaceBefore=4, spaceAfter=14),
        "h2":            ParagraphStyle("h2",            parent=base["Heading2"],
                                        fontSize=14, leading=18, textColor=INK,
                                        spaceBefore=10, spaceAfter=8),
        "h3":            ParagraphStyle("h3",            parent=base["Heading3"],
                                        fontSize=11, leading=14, textColor=PRIMARY,
                                        spaceBefore=6, spaceAfter=4),
        "body":          ParagraphStyle("body",          parent=base["Normal"],
                                        fontSize=10, leading=14, alignment=TA_JUSTIFY,
                                        textColor=INK, spaceAfter=8),
        "body_tight":    ParagraphStyle("body_tight",    parent=base["Normal"],
                                        fontSize=9, leading=12, textColor=INK),
        "muted":         ParagraphStyle("muted",         parent=base["Normal"],
                                        fontSize=9, leading=12, textColor=MUTED),
        "finding_title": ParagraphStyle("finding_title", parent=base["Heading3"],
                                        fontSize=11, leading=14, textColor=INK,
                                        spaceBefore=8, spaceAfter=2),
        "meta":          ParagraphStyle("meta",          parent=base["Normal"],
                                        fontSize=8, leading=10, textColor=MUTED,
                                        alignment=TA_LEFT),
        "classification": ParagraphStyle("classification", parent=base["Normal"],
                                        fontSize=9, alignment=TA_CENTER, textColor=colors.white,
                                        backColor=colors.HexColor("#b91c1c"),
                                        borderPadding=4),
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _count_severities(vulns: list[dict]) -> dict[str, int]:
    counts = {k: 0 for k in SEV_ORDER}
    for v in vulns:
        sev = str(v.get("severity", "info")).lower()
        counts[sev] = counts.get(sev, 0) + 1
    return counts


def _cvss_band(score: float) -> str:
    """CVSS v3.1 qualitative rating."""
    if score >= 9.0:
        return "critical"
    if score >= 7.0:
        return "high"
    if score >= 4.0:
        return "medium"
    if score > 0.0:
        return "low"
    return "info"


def _risk_grade(risk_score: float) -> tuple[str, colors.Color, str]:
    """Return (grade, color, narrative) for a 0–100 risk score."""
    if risk_score >= 80:
        return "F", SEV_COLORS["critical"], "Critical exposure — immediate containment required"
    if risk_score >= 60:
        return "D", SEV_COLORS["high"], "Elevated exposure — remediate within 7 days"
    if risk_score >= 40:
        return "C", SEV_COLORS["medium"], "Moderate exposure — remediate within 30 days"
    if risk_score >= 20:
        return "B", SEV_COLORS["low"], "Low exposure — monitor and patch routinely"
    return "A", colors.HexColor("#059669"), "Minimal exposure — posture within accepted tolerance"


def _fmt_date(value) -> str:
    if value is None:
        return "N/A"
    if isinstance(value, str):
        return value
    try:
        return value.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return str(value)


def _safe(text: str, limit: int = 2000) -> str:
    """Escape XML-unsafe chars and truncate for Paragraph rendering."""
    if not text:
        return ""
    s = str(text)[:limit]
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ─── Sections ─────────────────────────────────────────────────────────────────
def _cover_page(scan_data: dict, styles: dict, report_id: str) -> list:
    target = _safe(scan_data.get("target", "Unknown"))
    completed = _fmt_date(scan_data.get("completed_at"))
    risk_score = float(scan_data.get("risk_score") or 0.0)
    grade, grade_color, _ = _risk_grade(risk_score)

    elements = [
        Spacer(1, 1.2 * inch),
        Paragraph("FOUND 404", styles["cover_title"]),
        Paragraph("Security Assessment Report", styles["cover_sub"]),
        Spacer(1, 0.6 * inch),
    ]

    cover_meta = [
        ["Target", target],
        ["Scan Completed", completed],
        ["Report ID", report_id or "N/A"],
        ["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
    ]
    tbl = Table(cover_meta, colWidths=[2.0 * inch, 4.5 * inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("TEXTCOLOR", (1, 0), (1, -1), INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.8 * inch))

    # Risk grade badge
    badge = Table(
        [[Paragraph(f"<font size=48 color='{grade_color.hexval()}'><b>{grade}</b></font>",
                    styles["body"]),
          Paragraph(f"<b>Overall Risk Grade</b><br/>"
                    f"<font size=9 color='#6b7280'>Composite score: {risk_score:.1f} / 100</font>",
                    styles["body"])]],
        colWidths=[1.5 * inch, 4.0 * inch]
    )
    badge.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 1.5, grade_color),
        ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    elements.append(badge)
    elements.append(Spacer(1, 1.2 * inch))
    elements.append(Paragraph("CONFIDENTIAL — INTERNAL USE ONLY", styles["classification"]))
    return elements


def _executive_summary(scan_data: dict, sev_counts: dict, styles: dict) -> list:
    target = _safe(scan_data.get("target", "Unknown"))
    total_vulns = sum(sev_counts.values())
    critical = sev_counts.get("critical", 0)
    high = sev_counts.get("high", 0)
    asset_count = len(scan_data.get("assets", []))
    risk_score = float(scan_data.get("risk_score") or 0.0)
    grade, grade_color, narrative = _risk_grade(risk_score)

    elements = [Paragraph("1. Executive Summary", styles["h1"])]

    lead = (
        f"On {_fmt_date(scan_data.get('completed_at'))}, Found 404 completed a "
        f"<b>{_safe(scan_data.get('scan_type', 'full'))}</b> security assessment of "
        f"<b>{target}</b>. The assessment discovered "
        f"<b>{asset_count}</b> asset(s) and identified <b>{total_vulns}</b> vulnerabilities "
        f"across five severity tiers.<br/><br/>"
        f"The target received an overall risk grade of "
        f"<font color='{grade_color.hexval()}'><b>{grade}</b></font> "
        f"(composite score {risk_score:.1f}/100). "
        f"<b>{narrative}.</b>"
    )
    elements.append(Paragraph(lead, styles["body"]))
    elements.append(Spacer(1, 0.15 * inch))

    # Findings-at-a-glance grid
    elements.append(Paragraph("Findings at a Glance", styles["h2"]))
    grid_rows = [["Critical", "High", "Medium", "Low", "Informational"]]
    grid_rows.append([
        str(sev_counts.get("critical", 0)),
        str(sev_counts.get("high", 0)),
        str(sev_counts.get("medium", 0)),
        str(sev_counts.get("low", 0)),
        str(sev_counts.get("info", 0)),
    ])
    grid = Table(grid_rows, colWidths=[1.25 * inch] * 5, rowHeights=[0.3 * inch, 0.55 * inch])
    style = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, 1), 20),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ]
    for idx, sev in enumerate(SEV_ORDER):
        style.append(("BACKGROUND", (idx, 0), (idx, 0), SEV_COLORS[sev]))
        style.append(("TEXTCOLOR", (idx, 1), (idx, 1), SEV_COLORS[sev]))
    grid.setStyle(TableStyle(style))
    elements.append(grid)
    elements.append(Spacer(1, 0.25 * inch))

    # Key takeaways
    elements.append(Paragraph("Key Takeaways", styles["h2"]))
    takeaways = []
    if critical > 0:
        takeaways.append(
            f"<b>{critical} critical vulnerabilit{'y' if critical == 1 else 'ies'}</b> "
            f"require immediate containment within 24 hours (CVSS 9.0–10.0)."
        )
    if high > 0:
        takeaways.append(
            f"<b>{high} high-severity issue(s)</b> should be remediated within 7 days "
            f"per industry SLA guidance (CVSS 7.0–8.9)."
        )
    if critical == 0 and high == 0 and total_vulns > 0:
        takeaways.append(
            f"No critical or high-severity vulnerabilities were detected. "
            f"The remaining {total_vulns} finding(s) represent routine hygiene improvements."
        )
    if total_vulns == 0:
        takeaways.append("No vulnerabilities were detected in this assessment cycle.")
    takeaways.append(
        "All findings include cryptographic integrity signatures; the report may be "
        "verified at any time via the platform's audit API."
    )
    for t in takeaways:
        elements.append(Paragraph(f"• {t}", styles["body"]))

    return elements


def _business_impact(scan_data: dict, sev_counts: dict, styles: dict) -> list:
    """Translate technical findings into business risk language for executives."""
    critical = sev_counts.get("critical", 0)
    high = sev_counts.get("high", 0)
    medium = sev_counts.get("medium", 0)
    total = sum(sev_counts.values())

    elements = [
        Paragraph("2. Business Impact Analysis", styles["h1"]),
        Paragraph(
            "This section translates the technical findings into business-level risks "
            "to support budget prioritisation and executive decision-making. Each impact "
            "dimension is rated based on the severity distribution and the nature of the "
            "affected target.",
            styles["body"],
        ),
        Spacer(1, 0.1 * inch),
    ]

    # Per-dimension scoring
    def _rate(critical_weight: float) -> tuple[str, colors.Color]:
        score = critical * critical_weight + high * (critical_weight * 0.5) + medium * 0.15
        if score >= 4:
            return "HIGH", SEV_COLORS["critical"]
        if score >= 2:
            return "ELEVATED", SEV_COLORS["high"]
        if score > 0:
            return "MODERATE", SEV_COLORS["medium"]
        return "LOW", SEV_COLORS["low"]

    dimensions = [
        ("Data Confidentiality",
         "Risk of unauthorised disclosure of customer records, credentials, or "
         "intellectual property if findings are exploited.",
         _rate(1.0)),
        ("Service Availability",
         "Likelihood of service disruption or denial-of-service impact on "
         "revenue-generating systems.",
         _rate(0.7)),
        ("Regulatory Compliance",
         "Exposure under frameworks such as GDPR, PCI-DSS, HIPAA, or ISO 27001 — "
         "unresolved high-severity findings on in-scope systems may constitute reportable incidents.",
         _rate(0.9)),
        ("Reputational Risk",
         "Potential for brand damage, customer churn, or press coverage "
         "following public disclosure of a breach.",
         _rate(0.8)),
        ("Financial Exposure",
         "Combined cost risk: incident response, regulatory fines, legal costs, "
         "and business interruption.",
         _rate(0.85)),
    ]

    data = [["Dimension", "Rating", "Business Consequence"]]
    for name, desc, (rating, colour) in dimensions:
        data.append([
            Paragraph(f"<b>{name}</b>", styles["body_tight"]),
            Paragraph(f"<font color='{colour.hexval()}'><b>{rating}</b></font>",
                      styles["body_tight"]),
            Paragraph(desc, styles["body_tight"]),
        ])

    tbl = Table(data, colWidths=[1.6 * inch, 1.0 * inch, 4.0 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_BG]),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.2 * inch))

    # Executive recommendation
    elements.append(Paragraph("Recommended Board-Level Actions", styles["h2"]))
    recs = []
    if critical > 0:
        recs.append("Convene an incident response review within 24 hours for the critical findings.")
        recs.append("Assess whether any critical issue meets the disclosure threshold under applicable data-protection law.")
    if high > 0:
        recs.append("Allocate engineering capacity to close high-severity issues within one week.")
    if total > 0:
        recs.append("Track remediation progress via the platform's ticketing integration and re-scan after fixes.")
    recs.append("Review this report with internal audit and incorporate findings into quarterly risk reporting.")
    for r in recs:
        elements.append(Paragraph(f"• {r}", styles["body"]))

    return elements


def _vuln_categorization(vulns: list[dict], sev_counts: dict, styles: dict) -> list:
    elements = [
        Paragraph("3. Vulnerability Categorization (CVSS v3.1)", styles["h1"]),
        Paragraph(
            "Findings are categorised using the Common Vulnerability Scoring System "
            "(CVSS) v3.1 qualitative ratings. The table below shows the distribution "
            "across the five rating bands.",
            styles["body"],
        ),
        Spacer(1, 0.15 * inch),
    ]

    bands = [
        ("Critical", "9.0 – 10.0", sev_counts.get("critical", 0), SEV_COLORS["critical"]),
        ("High",     "7.0 – 8.9",  sev_counts.get("high", 0),     SEV_COLORS["high"]),
        ("Medium",   "4.0 – 6.9",  sev_counts.get("medium", 0),   SEV_COLORS["medium"]),
        ("Low",      "0.1 – 3.9",  sev_counts.get("low", 0),      SEV_COLORS["low"]),
        ("Informational", "0.0",   sev_counts.get("info", 0),     SEV_COLORS["info"]),
    ]

    rows = [["Rating", "CVSS Range", "Count", "Action SLA"]]
    slas = {
        "Critical": "Contain within 24h",
        "High": "Remediate within 7d",
        "Medium": "Remediate within 30d",
        "Low": "Routine patching",
        "Informational": "Awareness only",
    }
    for name, rng, cnt, colour in bands:
        rows.append([
            Paragraph(f"<font color='{colour.hexval()}'><b>{name}</b></font>",
                      styles["body_tight"]),
            rng,
            str(cnt),
            slas[name],
        ])

    tbl = Table(rows, colWidths=[1.6 * inch, 1.5 * inch, 0.9 * inch, 2.6 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(tbl)

    # Top-CVSS summary
    if vulns:
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph("Top 10 Findings by CVSS", styles["h2"]))
        top = sorted(vulns, key=lambda v: float(v.get("cvss_score") or 0.0), reverse=True)[:10]
        rows = [["#", "Title", "Severity", "CVSS", "Location"]]
        for idx, v in enumerate(top, 1):
            sev = str(v.get("severity", "info")).lower()
            colour = SEV_COLORS.get(sev, MUTED)
            rows.append([
                str(idx),
                Paragraph(_safe(v.get("title", "") or v.get("type", "") or "Vulnerability"),
                          styles["body_tight"]),
                Paragraph(f"<font color='{colour.hexval()}'><b>{sev.upper()}</b></font>",
                          styles["body_tight"]),
                f"{float(v.get('cvss_score') or 0.0):.1f}",
                Paragraph(_safe(v.get("url") or v.get("host") or "—", 90), styles["body_tight"]),
            ])
        top_tbl = Table(rows, colWidths=[0.35 * inch, 2.3 * inch, 1.0 * inch, 0.7 * inch, 2.25 * inch])
        top_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(top_tbl)

    return elements


def _technical_findings(vulns: list[dict], styles: dict) -> list:
    elements = [
        Paragraph("4. Technical Findings", styles["h1"]),
        Paragraph(
            "Each finding below includes its CVSS rating, affected location, "
            "detection method, and vendor-supplied remediation guidance where available.",
            styles["body"],
        ),
    ]

    if not vulns:
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph(
            "No vulnerabilities were detected in this scan.", styles["muted"]))
        return elements

    # Sort by CVSS descending, then severity
    ordered = sorted(
        vulns,
        key=lambda v: (
            SEV_ORDER.index(str(v.get("severity", "info")).lower())
            if str(v.get("severity", "info")).lower() in SEV_ORDER else 99,
            -float(v.get("cvss_score") or 0.0),
        )
    )

    for idx, v in enumerate(ordered, 1):
        sev = str(v.get("severity", "info")).lower()
        colour = SEV_COLORS.get(sev, MUTED)
        title = _safe(v.get("title") or v.get("type") or f"Finding #{idx}")
        cvss = float(v.get("cvss_score") or 0.0)

        # Heading bar
        heading = Table(
            [[
                Paragraph(f"<b>#{idx} — {title}</b>", styles["finding_title"]),
                Paragraph(f"<font color='{colour.hexval()}'><b>{sev.upper()}</b></font> "
                          f"<font color='#6b7280'>• CVSS {cvss:.1f}</font>",
                          styles["body_tight"]),
            ]],
            colWidths=[4.5 * inch, 2.0 * inch]
        )
        heading.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
            ("LINEABOVE", (0, 0), (-1, 0), 1.5, colour),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(heading)

        # Detail grid
        detail_rows = [
            ["Location", _safe(v.get("url") or v.get("host") or "—", 200)],
            ["Type", _safe(v.get("type") or "—")],
        ]
        if v.get("cvss_vector"):
            detail_rows.append(["CVSS Vector", _safe(v.get("cvss_vector"), 100)])
        if v.get("cve_id"):
            detail_rows.append(["CVE", _safe(v.get("cve_id"))])
        if v.get("template_id"):
            detail_rows.append(["Detector", _safe(v.get("template_id"))])
        if v.get("parameter"):
            detail_rows.append(["Parameter", _safe(v.get("parameter"), 100)])
        if v.get("port"):
            detail_rows.append(["Port/Service",
                                f"{v.get('port')}/{_safe(v.get('service') or 'tcp')}"])
        if v.get("confidence") is not None:
            detail_rows.append(["AI Confidence", f"{float(v['confidence']) * 100:.0f}%"])

        # Convert value cells to Paragraphs for wrapping
        detail_data = [[Paragraph(f"<b>{k}</b>", styles["body_tight"]),
                        Paragraph(val, styles["body_tight"])]
                       for k, val in detail_rows]
        detail_tbl = Table(detail_data, colWidths=[1.4 * inch, 5.1 * inch])
        detail_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(detail_tbl)

        if v.get("description"):
            elements.append(Spacer(1, 0.05 * inch))
            elements.append(Paragraph("<b>Description</b>", styles["h3"]))
            elements.append(Paragraph(_safe(v["description"], 1200), styles["body"]))

        if v.get("remediation"):
            elements.append(Paragraph("<b>Remediation</b>", styles["h3"]))
            elements.append(Paragraph(_safe(v["remediation"], 1200), styles["body"]))

        elements.append(Spacer(1, 0.15 * inch))

    return elements


def _remediation_roadmap(vulns: list[dict], actions: list[dict], styles: dict) -> list:
    elements = [
        Paragraph("5. Remediation Roadmap", styles["h1"]),
        Paragraph(
            "Remediation tasks are sequenced by severity and estimated effort. "
            "Items at the top should be addressed first to reduce the highest-impact risks.",
            styles["body"],
        ),
    ]

    # Build roadmap from vulnerabilities (preferred) or legacy actions
    tasks: list[dict] = []
    for v in vulns:
        sev = str(v.get("severity", "info")).lower()
        tasks.append({
            "priority": sev,
            "title": v.get("title") or v.get("type") or "Vulnerability",
            "sla": {"critical": "24 hours", "high": "7 days", "medium": "30 days",
                    "low": "90 days", "info": "Best effort"}.get(sev, "Best effort"),
            "remediation": v.get("remediation") or "See vendor advisory for patched version.",
        })
    if not tasks:
        for a in actions:
            priority = (a.get("priority") or "low").lower()
            tasks.append({
                "priority": priority,
                "title": a.get("title") or "Action",
                "sla": {"critical": "24 hours", "high": "7 days",
                        "medium": "30 days", "low": "90 days"}.get(priority, "Best effort"),
                "remediation": a.get("description") or "",
            })

    if not tasks:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            "No remediation actions are required at this time.", styles["muted"]))
        return elements

    tasks.sort(key=lambda t: SEV_ORDER.index(t["priority"]) if t["priority"] in SEV_ORDER else 99)

    rows = [["Priority", "Task", "SLA", "Recommended Fix"]]
    for t in tasks[:25]:
        sev = t["priority"]
        colour = SEV_COLORS.get(sev, MUTED)
        rows.append([
            Paragraph(f"<font color='{colour.hexval()}'><b>{sev.upper()}</b></font>",
                      styles["body_tight"]),
            Paragraph(_safe(t["title"], 120), styles["body_tight"]),
            Paragraph(t["sla"], styles["body_tight"]),
            Paragraph(_safe(t["remediation"], 300), styles["body_tight"]),
        ])

    tbl = Table(rows, colWidths=[1.0 * inch, 2.1 * inch, 1.0 * inch, 2.9 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(tbl)

    if len(tasks) > 25:
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(
            f"Showing top 25 of {len(tasks)} tasks. Full list available via the platform API.",
            styles["muted"]))

    return elements


def _appendix(scan_data: dict, styles: dict, report_id: str, findings_hash: str) -> list:
    try:
        from app.core.config import settings
        app_version = getattr(settings, "APP_VERSION", "unknown")
    except Exception:
        app_version = "unknown"

    elements = [
        Paragraph("Appendix A — Report Integrity & Metadata", styles["h1"]),
        Paragraph(
            "This report is protected by a SHA-256 findings hash and an HMAC-SHA256 "
            "signature over the rendered PDF bytes. Verification is available via "
            "<b>GET /api/v1/reports/{report_id}/verify</b>.",
            styles["body"],
        ),
        Spacer(1, 0.1 * inch),
    ]

    meta = [
        ["Report ID", report_id or "N/A"],
        ["Scan ID", str(scan_data.get("scan_id", "N/A"))],
        ["Platform Version", f"Found 404 v{app_version}"],
        ["Generated (UTC)", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")],
        ["Scan Started", _fmt_date(scan_data.get("started_at"))],
        ["Scan Completed", _fmt_date(scan_data.get("completed_at"))],
        ["Assets Discovered", str(len(scan_data.get("assets", [])))],
        ["Findings Hash (SHA-256)",
         (findings_hash or "N/A") if findings_hash else "N/A"],
    ]
    tbl = Table(
        [[Paragraph(f"<b>{k}</b>", styles["body_tight"]),
          Paragraph(_safe(str(v), 200), styles["body_tight"])]
         for k, v in meta],
        colWidths=[2.0 * inch, 4.5 * inch]
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph(
        "Methodology: Assessment follows OWASP Testing Guide v4.2 and NIST SP 800-115. "
        "Severity ratings align with CVSS v3.1. All findings were validated by "
        "Found 404's AI orchestration layer before inclusion in this report.",
        styles["muted"]
    ))
    return elements


def _page_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.75 * inch, 0.4 * inch, "Found 404 — Confidential Security Report")
    canvas.drawRightString(letter[0] - 0.75 * inch, 0.4 * inch, f"Page {doc.page}")
    canvas.restoreState()
