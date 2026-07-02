import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item, Job
from app.schemas.job import JobCounts

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {"done", "failed"}


def create_job(
    db: Session, user_id: uuid.UUID, texts: list[str], *, locale: str = "en"
) -> tuple[Job, list[Item]]:
    """Create a job and its items in one transaction. Enqueueing happens in the API layer."""
    cleaned = [t.strip() for t in texts if t and t.strip()]

    job = Job(user_id=user_id, status="processing", total_items=len(cleaned), locale=locale)
    db.add(job)
    db.flush()

    items = [
        Item(job_id=job.id, user_id=user_id, input_text=text, status="queued")
        for text in cleaned
    ]
    db.add_all(items)
    db.commit()
    db.refresh(job)
    for item in items:
        db.refresh(item)
    return job, items


def get_job_counts(db: Session, job_id: uuid.UUID) -> JobCounts:
    rows = db.execute(
        select(Item.status, func.count()).where(Item.job_id == job_id).group_by(Item.status)
    ).all()
    counts = JobCounts()
    for status, count in rows:
        setattr(counts, status, count)
    return counts


def compute_progress(counts: JobCounts, total_items: int) -> float:
    """Percentage of items in a terminal state (done + failed)."""
    if total_items <= 0:
        return 0.0
    terminal = counts.done + counts.failed
    return round((terminal / total_items) * 100, 1)


def recompute_job_status(db: Session, job_id: uuid.UUID) -> None:
    """Set job to completed once every item has reached a terminal state."""
    non_terminal = db.scalar(
        select(func.count())
        .select_from(Item)
        .where(Item.job_id == job_id, Item.status.notin_(TERMINAL_STATUSES))
    )
    job = db.get(Job, job_id)
    if job is None:
        return
    job.status = "completed" if non_terminal == 0 else "processing"
    db.commit()


def enqueue_item(db: Session, item: Item, *, recompute: bool = True) -> None:
    """Enqueue a single item for background processing."""
    from app.worker.tasks import process_item

    try:
        process_item.delay(str(item.id))
    except Exception as exc:
        logger.exception("Failed to enqueue item %s", item.id)
        item.status = "failed"
        item.error = f"enqueue: {exc}"
        db.add(item)
        if recompute:
            db.commit()
            recompute_job_status(db, item.job_id)
        raise
