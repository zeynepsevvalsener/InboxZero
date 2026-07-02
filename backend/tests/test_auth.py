def test_register_returns_jwt(client):
    resp = client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_register_duplicate_email_conflict(client):
    payload = {"email": "dupe@example.com", "password": "password123"}
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_login_returns_jwt(client):
    client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/register",
        json={"email": "wrong@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": "wrong@example.com", "password": "nope-nope"},
    )
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/jobs").status_code == 401


def test_protected_route_rejects_invalid_token(client):
    resp = client.get("/jobs", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
