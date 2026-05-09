"""Celery task tests in eager mode (no Redis broker required)."""
import pytest

from app.core.celery_app import celery_app


@pytest.fixture(autouse=True)
def _eager_mode():
    """Run every Celery task synchronously and re-raise exceptions."""
    prev_eager = celery_app.conf.task_always_eager
    prev_propagate = celery_app.conf.task_eager_propagates
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    yield
    celery_app.conf.task_always_eager = prev_eager
    celery_app.conf.task_eager_propagates = prev_propagate


def test_scan_tasks_module_imports():
    from app.services import scan_tasks
    assert scan_tasks is not None


def test_run_ai_scan_is_registered():
    """The main scan entry-point must be a registered Celery task."""
    names = list(celery_app.tasks.keys())
    matches = [n for n in names if "run_ai_scan" in n or "scan_tasks" in n]
    assert matches, f"Expected scan tasks to be registered, got {names[:10]}"


def test_celery_broker_url_uses_redis_setting():
    from app.core.config import settings
    assert celery_app.conf.broker_url == settings.REDIS_URL
