# endpoints/reports.py — Documentation

## File Purpose

Manages **PDF security report generation and retrieval**. Allows users to request a professionally formatted report for any completed scan, delivered as a downloadable PDF.

## Key Endpoints

### `GET /reports/{scan_id}` — `get_report(scan_id, background_tasks, db)`
Generates and returns a PDF security report for a given scan.

**Logic:**
1. Retrieves the scan from the database using `scan_id`. Returns HTTP 404 if not found.
2. Validates that the scan is in `COMPLETED` status. Returns HTTP 400 if the scan has not finished.
3. Instantiates `PDFReportGenerator` and calls `generate_report(scan_id, db)` to produce the PDF as a byte string.
4. Returns the PDF as a `StreamingResponse` with `Content-Type: application/pdf` and a `Content-Disposition: attachment; filename=report_{scan_id}.pdf` header, triggering a download in the browser.

### `GET /reports/` — `list_reports(db)`
Returns a list of all scans that have reports available (i.e., all completed scans). Each entry includes the scan summary metadata to allow the user to select which report to download from the `Reports` component in the dashboard.

## Dependencies

### Internal
- `app.core.database.get_db`
- `app.models.scan.Scan`, `ScanStatus`
- `app.services.pdf_generator.PDFReportGenerator`

### External
- `fastapi` — APIRouter, Depends, HTTPException
- `fastapi.responses.StreamingResponse` — For PDF streaming delivery
