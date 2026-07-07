# ─────────────────────────────────────────────────────────────────────────────
#  Golabs ERP — Celery Application
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import os

from celery import Celery

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_WORKER_POOL: str = os.getenv("CELERY_WORKER_POOL", "prefork")

celery_app = Celery(
    "golabs_erp",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.core.workers.tasks",
    ],
)

celery_app.conf.update(
    task_serializer    = "json",
    accept_content     = ["json"],
    result_serializer  = "json",
    timezone           = "Europe/Istanbul",
    enable_utc         = True,
    task_track_started = True,
    task_time_limit    = 30 * 60,   # 30 dakika max çalışma süresi
    worker_pool        = CELERY_WORKER_POOL,
    worker_prefetch_multiplier = 1,
    broker_connection_retry_on_startup = True,
)

# ─── Celery Beat Schedule ──────────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    "detect-stalled-workflows": {
        "task": "tasks.detect_stalled_workflow_runs",
        "schedule": 300.0,   # her 5 dakika
    },
    "check-low-stock-hourly": {
        "task": "tasks.check_low_stock",
        "schedule": 3600.0,  # her 1 saat
    },
}
