from __future__ import annotations

from src.config.settings import settings

try:
    from celery import Celery

    celery_app = Celery(
        "donc_ai",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["src.queues.tasks"],
    )
    celery_app.conf.task_track_started = True
    celery_app.conf.result_expires = 3600
except Exception:
    celery_app = None
