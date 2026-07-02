from celery import Celery

from app.config import settings

celery_app = Celery(
    "inboxzero",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    result_expires=3600,
    beat_schedule={
        "recover-stale-items": {
            "task": "app.worker.tasks.recover_stale_items",
            "schedule": 120.0,
        },
    },
)
