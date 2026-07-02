"""Celery task that processes a single item with AI.

Idempotency: work is keyed by ``item.id``. The task early-returns if the item is
already ``done``, skips if another worker is actively processing it, and results are
overwritten in place (no result rows are ever inserted). Failure of one item never
affects the rest of the batch.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import Item, Job
from app.services import ai
from app.services.jobs import enqueue_item, recompute_job_status
from app.utils.idempotency import is_actively_processing, is_already_done
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.worker.tasks.process_item",
    autoretry_for=(ai.TransientAIError,),
    retry_backoff=settings.celery_retry_backoff,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=settings.celery_max_retries,
)
def process_item(self, item_id: str) -> str:
    db = SessionLocal()
    try:
        item = db.execute(
            select(Item).where(Item.id == uuid.UUID(item_id)).with_for_update()
        ).scalar_one_or_none()
        if item is None:
            return "missing"

        if is_already_done(item):
            return "already-done"

        if is_actively_processing(item):
            return "already-processing"

        # Pick up queued, failed-recovery, or stale processing items.
        item.status = "processing"
        item.attempts += 1
        item.error = None
        db.commit()

        job = db.get(Job, item.job_id)
        locale = job.locale if job else "en"

        try:
            result = ai.classify(item.input_text, locale=locale)
        except ai.TransientAIError as exc:
            item.error = f"transient: {exc}"
            if self.request.retries >= self.max_retries:
                item.status = "failed"
                db.commit()
                recompute_job_status(db, item.job_id)
            else:
                item.status = "queued"
                db.commit()
            raise
        except ai.PermanentAIError as exc:
            item.status = "failed"
            item.error = f"permanent: {exc}"
            db.commit()
            recompute_job_status(db, item.job_id)
            return "failed"
        except Exception as exc:
            logger.exception("Unexpected error processing item %s", item_id)
            item.status = "failed"
            item.error = f"unexpected: {exc}"
            db.commit()
            recompute_job_status(db, item.job_id)
            return "failed"

        item.category = result["category"]
        item.priority = result["priority"]
        item.sentiment = result["sentiment"]
        item.summary = result["summary"]
        item.suggested_reply = result["suggested_reply"]
        item.status = "done"
        item.error = None
        db.commit()

        recompute_job_status(db, item.job_id)
        return "done"
    finally:
        db.close()


@celery_app.task(name="app.worker.tasks.recover_stale_items")
def recover_stale_items() -> int:
    """Re-enqueue items stuck in processing (worker crash / hang recovery)."""
    db = SessionLocal()
    recovered = 0
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.stale_processing_minutes)
        stale_items = db.scalars(
            select(Item).where(Item.status == "processing", Item.updated_at < cutoff)
        ).all()

        job_ids: set[uuid.UUID] = set()
        for item in stale_items:
            item.status = "queued"
            item.error = "recovered: processing timed out"
            db.add(item)
            job_ids.add(item.job_id)
            recovered += 1

        if recovered:
            db.commit()
            for item in stale_items:
                try:
                    enqueue_item(db, item, recompute=False)
                except Exception:
                    pass
            db.commit()
            for job_id in job_ids:
                recompute_job_status(db, job_id)

        return recovered
    finally:
        db.close()
