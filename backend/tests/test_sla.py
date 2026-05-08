"""
Tests for app/services/sla.py — due_date_for and check_and_action_breaches
"""
import uuid
from datetime import date, timedelta

from app.models.scan import Finding, FindingStatus, SeverityLevel
from app.services.sla import due_date_for, check_and_action_breaches


# ── due_date_for ──────────────────────────────────────────────────────────────

class TestDueDateFor:
    def test_critical_is_7_days(self):
        d = due_date_for(SeverityLevel.CRITICAL)
        assert d == date.today() + timedelta(days=7)

    def test_high_is_30_days(self):
        d = due_date_for(SeverityLevel.HIGH)
        assert d == date.today() + timedelta(days=30)

    def test_medium_is_90_days(self):
        d = due_date_for(SeverityLevel.MEDIUM)
        assert d == date.today() + timedelta(days=90)

    def test_low_is_180_days(self):
        d = due_date_for(SeverityLevel.LOW)
        assert d == date.today() + timedelta(days=180)

    def test_info_returns_none(self):
        assert due_date_for(SeverityLevel.INFO) is None

    def test_string_severity_critical(self):
        d = due_date_for("critical")
        assert d == date.today() + timedelta(days=7)

    def test_string_severity_high(self):
        d = due_date_for("high")
        assert d == date.today() + timedelta(days=30)

    def test_unknown_string_defaults_to_180(self):
        d = due_date_for("unknown_severity")
        assert d == date.today() + timedelta(days=180)


# ── check_and_action_breaches ─────────────────────────────────────────────────

def _seed_finding(db, title, severity, status=FindingStatus.OPEN, days_overdue=1):
    """Insert a Finding with a past due_date."""
    f = Finding(
        id=str(uuid.uuid4()),
        fingerprint=str(uuid.uuid4()),
        title=title,
        vuln_type="test",
        severity=severity,
        status=status,
        due_date=date.today() - timedelta(days=days_overdue),
        first_seen=None,
        last_seen=None,
    )
    db.add(f)
    db.flush()
    return f


class TestCheckAndActionBreaches:
    def test_no_findings_returns_zero(self, db_session):
        count = check_and_action_breaches(db_session)
        assert count == 0

    def test_open_overdue_finding_creates_action_item(self, db_session):
        _seed_finding(db_session, "Overdue HIGH", SeverityLevel.HIGH)
        count = check_and_action_breaches(db_session)
        assert count >= 1

    def test_fixed_finding_not_actioned(self, db_session):
        _seed_finding(db_session, "Fixed Finding", SeverityLevel.HIGH, status=FindingStatus.FIXED)
        count = check_and_action_breaches(db_session)
        assert count == 0

    def test_finding_with_no_due_date_not_actioned(self, db_session):
        f = Finding(
            id=str(uuid.uuid4()),
            fingerprint=str(uuid.uuid4()),
            title="No Due Date",
            vuln_type="test",
            severity=SeverityLevel.MEDIUM,
            status=FindingStatus.OPEN,
            due_date=None,
        )
        db_session.add(f)
        db_session.flush()
        count = check_and_action_breaches(db_session)
        assert count == 0

    def test_future_due_date_not_actioned(self, db_session):
        f = Finding(
            id=str(uuid.uuid4()),
            fingerprint=str(uuid.uuid4()),
            title="Future Due",
            vuln_type="test",
            severity=SeverityLevel.HIGH,
            status=FindingStatus.OPEN,
            due_date=date.today() + timedelta(days=10),
        )
        db_session.add(f)
        db_session.flush()
        count = check_and_action_breaches(db_session)
        assert count == 0

    def test_duplicate_breach_not_created_twice(self, db_session):
        _seed_finding(db_session, "Dup Breach", SeverityLevel.CRITICAL)
        count1 = check_and_action_breaches(db_session)
        count2 = check_and_action_breaches(db_session)
        assert count1 >= 1
        assert count2 == 0  # already actioned
