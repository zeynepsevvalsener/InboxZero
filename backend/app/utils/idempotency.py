"""Helpers for idempotent item processing."""

from datetime import datetime, timedelta, timezone

from app.config import settings
from app.models import Item


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _stale_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=settings.stale_processing_minutes)


def is_already_done(item: Item) -> bool:
    return item.status == "done"


def is_actively_processing(item: Item) -> bool:
    """Return True if another worker is likely still working on this item."""
    if item.status != "processing":
        return False
    if item.updated_at is None:
        return True
    return _aware(item.updated_at) > _stale_cutoff()


def is_stale_processing(item: Item) -> bool:
    """Return True if item is stuck in processing beyond the stale window."""
    if item.status != "processing":
        return False
    if item.updated_at is None:
        return False
    return _aware(item.updated_at) <= _stale_cutoff()


def can_manual_retry(item: Item) -> bool:
    """Failed items and stale processing items can be manually retried."""
    return item.status == "failed" or is_stale_processing(item)
