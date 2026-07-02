"""Shared pytest fixtures.

Tests run against a real PostgreSQL database (the queue/DB plumbing is the point of
the challenge, so tests exercise the actual Postgres types and constraints). Set
``DATABASE_URL`` to a disposable test database; it defaults to a local ``inboxzero_test``
database on the compose Postgres. The AI provider is always mocked — no network calls.
"""

import os
import uuid

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://inboxzero:inboxzero@localhost:5432/inboxzero_test",
)
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("AI_PROVIDER", "openai")

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Item, Job, User  # noqa: E402
from app.services.auth import create_access_token, hash_password  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_user(db):
    def _make(email: str = "user@example.com", password: str = "password123") -> User:
        user = User(email=email.lower(), password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def auth_header():
    def _header(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}

    return _header


@pytest.fixture
def make_job(db):
    def _make(user: User, texts: list[str], status: str = "processing") -> Job:
        job = Job(user_id=user.id, status=status, total_items=len(texts))
        db.add(job)
        db.flush()
        for text in texts:
            db.add(Item(job_id=job.id, user_id=user.id, input_text=text, status="queued"))
        db.commit()
        db.refresh(job)
        return job

    return _make
