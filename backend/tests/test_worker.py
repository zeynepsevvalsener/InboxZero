from unittest.mock import patch

import pytest

from app.models import Item
from app.services import ai
from app.worker.tasks import process_item

CLASSIFICATION = {
    "category": "bug",
    "priority": "high",
    "sentiment": "negative",
    "summary": "App crashes on save.",
    "suggested_reply": "Sorry about that — we're looking into it.",
}


def _run_task(item_id) -> str:
    return process_item.apply(args=[str(item_id)]).get()


def test_process_item_success_persists_results(make_user, make_job, db):
    user = make_user()
    job = make_job(user, ["The app crashes when I save."])
    item = db.query(Item).filter(Item.job_id == job.id).first()

    with patch("app.services.ai.classify", return_value=CLASSIFICATION) as classify:
        result = _run_task(item.id)

    assert result == "done"
    classify.assert_called_once()
    db.refresh(item)
    assert item.status == "done"
    assert item.category == "bug"
    assert item.summary == "App crashes on save."
    assert item.attempts == 1


def test_idempotent_done_item_is_skipped(make_user, make_job, db):
    user = make_user()
    job = make_job(user, ["already handled"])
    item = db.query(Item).filter(Item.job_id == job.id).first()
    item.status = "done"
    db.commit()

    with patch("app.services.ai.classify") as classify:
        result = _run_task(item.id)

    assert result == "already-done"
    classify.assert_not_called()


def test_actively_processing_item_is_skipped(make_user, make_job, db):
    user = make_user()
    job = make_job(user, ["in flight"])
    item = db.query(Item).filter(Item.job_id == job.id).first()
    item.status = "processing"
    db.commit()

    with patch("app.services.ai.classify") as classify:
        result = _run_task(item.id)

    assert result == "already-processing"
    classify.assert_not_called()


def test_permanent_error_marks_item_failed(make_user, make_job, db):
    user = make_user()
    job = make_job(user, ["no api key configured"])
    item = db.query(Item).filter(Item.job_id == job.id).first()

    with patch("app.services.ai.classify", side_effect=ai.PermanentAIError("no key")):
        result = _run_task(item.id)

    assert result == "failed"
    db.refresh(item)
    assert item.status == "failed"
    assert "permanent" in item.error


def test_fail_hook_raises_transient_error():
    with pytest.raises(ai.TransientAIError):
        ai.classify("Please FAIL this item on purpose.")
