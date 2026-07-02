from unittest.mock import patch

from app.models import Item
from app.services.jobs import recompute_job_status


def test_submit_returns_immediately_without_running_ai(client, make_user, auth_header):
    user = make_user()
    with (
        patch("app.worker.tasks.process_item.delay") as delay,
        patch("app.services.ai.classify") as classify,
    ):
        resp = client.post(
            "/jobs",
            headers=auth_header(user),
            json={"items": ["first message", "second message"]},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "processing"
    assert body["total_items"] == 2
    # Work is enqueued, not run inline: the AI is never called in the request thread.
    assert delay.call_count == 2
    classify.assert_not_called()


def test_submit_rejects_empty_batch(client, make_user, auth_header):
    user = make_user()
    with patch("app.worker.tasks.process_item.delay"):
        resp = client.post(
            "/jobs",
            headers=auth_header(user),
            json={"items": ["   ", ""]},
        )
    assert resp.status_code == 400


def test_tenant_isolation_get_job(client, make_user, auth_header, make_job):
    owner = make_user(email="owner@example.com")
    intruder = make_user(email="intruder@example.com")
    job = make_job(owner, ["a message"])

    resp = client.get(f"/jobs/{job.id}", headers=auth_header(intruder))
    assert resp.status_code == 404


def test_tenant_isolation_list_jobs(client, make_user, auth_header, make_job):
    owner = make_user(email="owner2@example.com")
    intruder = make_user(email="intruder2@example.com")
    make_job(owner, ["a message"])

    resp = client.get("/jobs", headers=auth_header(intruder))
    assert resp.status_code == 200
    assert resp.json() == []


def test_tenant_isolation_retry(client, make_user, auth_header, make_job, db):
    owner = make_user(email="owner3@example.com")
    intruder = make_user(email="intruder3@example.com")
    job = make_job(owner, ["a message"])
    item = db.query(Item).filter(Item.job_id == job.id).first()

    resp = client.post(
        f"/jobs/{job.id}/items/{item.id}/retry", headers=auth_header(intruder)
    )
    assert resp.status_code == 404


def test_job_rollup_converges_to_completed(client, make_user, auth_header, make_job, db):
    user = make_user()
    job = make_job(user, ["one", "two"])
    items = db.query(Item).filter(Item.job_id == job.id).all()
    items[0].status = "done"
    items[1].status = "failed"
    db.commit()

    recompute_job_status(db, job.id)

    resp = client.get(f"/jobs/{job.id}", headers=auth_header(user))
    body = resp.json()
    assert body["status"] == "completed"
    assert body["progress"] == 100.0
    assert body["counts"] == {"queued": 0, "processing": 0, "done": 1, "failed": 1}


def test_manual_retry_requeues_failed_item(client, make_user, auth_header, make_job, db):
    user = make_user()
    job = make_job(user, ["broken"])
    item = db.query(Item).filter(Item.job_id == job.id).first()
    item.status = "failed"
    item.error = "boom"
    db.commit()

    with patch("app.worker.tasks.process_item.delay") as delay:
        resp = client.post(
            f"/jobs/{job.id}/items/{item.id}/retry", headers=auth_header(user)
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "queued"
    assert resp.json()["error"] is None
    delay.assert_called_once_with(str(item.id))


def test_manual_retry_rejects_non_retryable_item(client, make_user, auth_header, make_job, db):
    user = make_user()
    job = make_job(user, ["queued item"])
    item = db.query(Item).filter(Item.job_id == job.id).first()

    resp = client.post(
        f"/jobs/{job.id}/items/{item.id}/retry", headers=auth_header(user)
    )
    assert resp.status_code == 409
