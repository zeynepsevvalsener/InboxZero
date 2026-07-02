import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Item, Job, User
from app.schemas.job import (
    CreateJobRequest,
    CreateJobResponse,
    ItemResponse,
    JobDetailResponse,
    JobSummaryResponse,
)
from app.services.jobs import (
    compute_progress,
    create_job,
    enqueue_item,
    get_job_counts,
    recompute_job_status,
)
from app.utils.idempotency import can_manual_retry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _item_to_response(item: Item) -> ItemResponse:
    return ItemResponse(
        id=str(item.id),
        status=item.status,
        attempts=item.attempts,
        input_text=item.input_text,
        category=item.category,
        priority=item.priority,
        sentiment=item.sentiment,
        summary=item.summary,
        suggested_reply=item.suggested_reply,
        error=item.error,
        updated_at=item.updated_at,
        retryable=can_manual_retry(item),
    )


def _job_summary(db: Session, job: Job) -> JobSummaryResponse:
    counts = get_job_counts(db, job.id)
    return JobSummaryResponse(
        id=str(job.id),
        status=job.status,
        total_items=job.total_items,
        created_at=job.created_at,
        counts=counts,
        progress=compute_progress(counts, job.total_items),
    )


def _get_owned_job(db: Session, job_id: uuid.UUID, user: User) -> Job:
    job = db.get(Job, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


@router.post("", response_model=CreateJobResponse, status_code=status.HTTP_201_CREATED)
def submit_batch(
    payload: CreateJobRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CreateJobResponse:
    texts = [t for t in payload.items if t and t.strip()]
    if not texts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch must contain at least one non-empty item.",
        )
    if len(texts) > settings.max_batch_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch exceeds maximum of {settings.max_batch_items} items.",
        )

    job, items = create_job(db, user.id, texts, locale=payload.locale)

    # Enqueue after commit so the worker never races an uncommitted row.
    for item in items:
        try:
            enqueue_item(db, item, recompute=False)
        except Exception:
            pass  # enqueue_item already marks item failed
    db.commit()
    recompute_job_status(db, job.id)
    db.refresh(job)

    return CreateJobResponse(id=str(job.id), status=job.status, total_items=job.total_items)


@router.get("", response_model=list[JobSummaryResponse])
def list_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[JobSummaryResponse]:
    jobs = db.scalars(
        select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc())
    ).all()
    return [_job_summary(db, job) for job in jobs]


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobDetailResponse:
    job = _get_owned_job(db, job_id, user)
    items = db.scalars(
        select(Item)
        .where(Item.job_id == job.id, Item.user_id == user.id)
        .order_by(Item.updated_at.asc())
    ).all()
    summary = _job_summary(db, job)
    return JobDetailResponse(
        **summary.model_dump(),
        items=[_item_to_response(i) for i in items],
    )


@router.post("/{job_id}/items/{item_id}/retry", response_model=ItemResponse)
def retry_item(
    job_id: uuid.UUID,
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ItemResponse:
    job = _get_owned_job(db, job_id, user)
    item = db.get(Item, item_id)
    if item is None or item.job_id != job.id or item.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    if not can_manual_retry(item):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed or stale processing items can be retried.",
        )

    item.status = "queued"
    item.error = None
    db.commit()
    db.refresh(item)

    try:
        enqueue_item(db, item, recompute=False)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not re-enqueue item for processing.",
        ) from exc

    recompute_job_status(db, job.id)
    db.refresh(item)
    return _item_to_response(item)
