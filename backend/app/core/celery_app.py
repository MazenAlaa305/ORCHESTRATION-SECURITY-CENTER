from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.services.scan_tasks"],
)

celery_app.conf.beat_schedule = {
    # Periodic infrastructure scan (existing)
    "hourly-network-scan": {
        "task": "app.services.scan_tasks.trigger_periodic_scan",
        "schedule": crontab(minute=0),
        "args": ("localhost",),
    },
    # Phase 4.3 — SLA breach detection runs every hour
    "hourly-sla-breach-check": {
        "task": "app.services.scan_tasks.check_sla_breaches",
        "schedule": crontab(minute=5),
    },
    # User-defined scheduled scans — fires every minute, croniter filters which are due
    "check-due-schedules": {
        "task": "app.services.scan_tasks.check_due_schedules",
        "schedule": crontab(minute="*"),
    },
}
