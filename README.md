# InboxZero

An AI batch triage service for support messages. Submit a pile of text items, a background worker classifies each one with AI (category, priority, sentiment, summary, suggested reply), and the UI tracks per-item progress in real time.

---

## Submission checklist

- [x] **Repo link:** [https://github.com/zeynepsevvalsener/InboxZero](https://github.com/zeynepsevvalsener/InboxZero)
- [x] **Live Vercel URL:** [https://inbox-zero-peach-phi.vercel.app](https://inbox-zero-peach-phi.vercel.app)
- [x] **Backend location:** Render — [https://inboxzero-api-paft.onrender.com](https://inboxzero-api-paft.onrender.com)
- [x] **Register:** Go to the live URL and create an account (any email + password, min. 6 characters).
- [x] **AI provider:** OpenAI (`gpt-4o-mini`, default); Anthropic (`claude-3-haiku`) support also available — set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`
- [x] **Queue/broker + retry & idempotency:** Celery + Redis — see [Retry & idempotency](#retry--idempotency)
- [x] `.env.example` **committed:** `[.env.example](.env.example)` and `[frontend/.env.example](frontend/.env.example)`
- [x] **Migration file(s) committed:** `[backend/alembic/versions/](backend/alembic/versions/)`
- [x] `docker compose up` **brings up API + worker + DB + broker:** see [Run locally](#run-locally)
- [ ] **Demo video link:** 
- [x] **No secrets committed**

---



## Tech stack


| Layer                | Choice                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Backend API**      | Python 3.12, FastAPI, Uvicorn                                                                 |
| **Worker / queue**   | **Celery 5.4 + Redis 7** (broker + result backend), separate worker container                 |
| **Scheduler**        | Celery Beat (stale-item recovery every 120s)                                                  |
| **Database**         | PostgreSQL 16                                                                                 |
| **Migrations**       | Alembic                                                                                       |
| **Auth**             | JWT (email/password → bearer token)                                                           |
| **AI**               | OpenAI (`gpt-4o-mini`, default); Anthropic (`claude-3-haiku-20240307`) support also available |
| **Frontend**         | Next.js 15 (App Router), React 19, TypeScript                                                 |
| **Data fetching**    | TanStack React Query v5 (polling + cache invalidation)                                        |
| **Containers**       | Docker + docker-compose (local); Render Blueprint (production backend)                        |
| **Frontend hosting** | Vercel                                                                                        |
| **CI**               | GitHub Actions — pytest (Postgres) + Next.js build                                            |


---



## Architecture

```
┌─────────────┐     JWT      ┌──────────────┐    enqueue     ┌─────────────┐
│  Next.js    │ ──────────► │   FastAPI    │ ─────────────► │    Redis    │
│  (Vercel)   │ ◄─ polling ─│   (Render)   │                │  (broker)   │
└─────────────┘              └──────┬───────┘                └──────┬──────┘
                                      │                               │
                                      ▼                               ▼
                               ┌──────────────┐                ┌─────────────┐
                               │  PostgreSQL  │ ◄──────────────│   Celery    │
                               │ users/jobs/  │  update items  │   Worker    │
                               │    items     │                │  (+ beat)   │
                               └──────────────┘                └──────┬──────┘
                                                                      │
                                                                      ▼
                                                               ┌─────────────┐
                                                               │ OpenAI /    │
                                                               │ Anthropic   │
                                                               └─────────────┘
```

**Request flow**

1. `POST /jobs` creates a job + item rows in Postgres, enqueues one Celery task per item, and returns immediately with `job_id` and `processing` status.
2. The worker picks tasks from Redis, calls the AI provider per item, and writes results back to the same `items` row.
3. The frontend polls job endpoints while work is in progress; polling stops when the job reaches a terminal state.
4. Job status rolls up to `completed` when every item is `done` or `failed`.

---



## Retry & idempotency



### Retries

- **Transient AI errors** (timeouts, rate limits, simulated failures) raise `TransientAIError`. Celery auto-retries with exponential backoff (`CELERY_RETRY_BACKOFF`, default 2s base, max 60s, jitter) up to `CELERY_MAX_RETRIES` (default 3).
- **Permanent AI errors** (bad API key, invalid response) raise `PermanentAIError` — the item is marked `failed` immediately with no retry.
- **Failure isolation:** one bad item never blocks the rest of the batch.
- **Manual retry:** `POST /jobs/{job_id}/items/{item_id}/retry` re-enqueues failed items or items stuck in `processing` beyond `STALE_PROCESSING_MINUTES` (default 5).
- **Stale recovery:** Celery Beat runs `recover_stale_items` every 120s and re-enqueues items stuck in `processing`.
- **Worker concurrency cap:** `WORKER_CONCURRENCY` (default 3) limits parallel AI calls to avoid provider rate limits.



### Idempotency

Work is keyed by `**item.id**` — there is no separate results table.

- Workers acquire a row lock (`SELECT … FOR UPDATE`) before processing.
- If status is already `done`, the task returns immediately (no-op).
- If another worker is actively processing (status `processing` and `updated_at` within the stale window), the task skips.
- AI results overwrite the same `items` row in place; re-running never inserts duplicate rows.
- Re-processing a `done` item is a no-op; retrying a `failed` item resets error fields and re-enqueues cleanly.



### Demo failure hook

Any item whose text contains the word `**FAIL**` raises a simulated transient error — useful for demonstrating retries in the demo video:

```
This is a billing question FAIL please retry
```

---



## Data model

Tables are created by Alembic migrations (not runtime auto-create):


| Table   | Key columns                                                 |
| ------- | ----------------------------------------------------------- |
| `users` | `id`, `email` (unique), `password_hash`, `created_at`       |
| `jobs`  | `id`, `user_id`, `status` (`processing`                     |
| `items` | `id`, `job_id`, `user_id`, `input_text`, `status` (`queued` |


Migrations:

- `backend/alembic/versions/0001_initial_schema.py` — `users`, `jobs`, `items`
- `backend/alembic/versions/0002_job_locale.py` — `jobs.locale`

---



## API reference

Base URL: `http://localhost:8000` (local) or your Render API URL (production).

Interactive docs: `/docs` (Swagger UI).


| Method | Path                                   | Auth   | Description                                                        |
| ------ | -------------------------------------- | ------ | ------------------------------------------------------------------ |
| `GET`  | `/health`                              | No     | Health check                                                       |
| `POST` | `/auth/register`                       | No     | Register → `{ access_token, token_type }`                          |
| `POST` | `/auth/login`                          | No     | Login → JWT                                                        |
| `POST` | `/jobs`                                | Bearer | Submit batch → `{ id, status, total_items }` (returns immediately) |
| `GET`  | `/jobs`                                | Bearer | List current user's jobs                                           |
| `GET`  | `/jobs/{job_id}`                       | Bearer | Job detail + all items                                             |
| `POST` | `/jobs/{job_id}/items/{item_id}/retry` | Bearer | Re-enqueue a failed or stale item                                  |


**Submit batch** (`POST /jobs`):

```json
{
  "items": ["My app crashes on login", "Where is my invoice?"],
  "locale": "en"
}
```

- Max `MAX_BATCH_ITEMS` per batch (default 50).
- Empty lines are stripped; at least one non-empty item is required.
- `locale`: `"en"` or `"tr"` — controls AI summary/reply language.

All `/jobs` routes require `Authorization: Bearer <token>`. Users can only access their own jobs and items.

---



## Run locally



### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (frontend dev server)
- OpenAI API key (or Anthropic — see below)



### AI provider

**OpenAI** is the default (`AI_PROVIDER=openai`). **Anthropic** support is also implemented in code: set `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, and optionally `ANTHROPIC_MODEL` (see `backend/app/services/ai.py`).

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum set:


| Variable            | Required           | Notes                                      |
| ------------------- | ------------------ | ------------------------------------------ |
| `JWT_SECRET_KEY`    | Yes                | Long random string                         |
| `OPENAI_API_KEY`    | If using OpenAI    | `AI_PROVIDER=openai` (default)             |
| `ANTHROPIC_API_KEY` | If using Anthropic | `AI_PROVIDER=anthropic`                    |
| `CORS_ORIGINS`      | Yes                | `http://localhost:3000` for local frontend |


See `[.env.example](.env.example)` for the full list.

### 2. Start the backend stack

```bash
docker compose up --build
```

This starts:


| Service    | Port | Role                              |
| ---------- | ---- | --------------------------------- |
| `postgres` | 5432 | Database                          |
| `redis`    | 6379 | Celery broker + result backend    |
| `api`      | 8000 | FastAPI                           |
| `worker`   | —    | Celery worker (consumes queue)    |
| `beat`     | —    | Celery Beat (stale-item recovery) |


**Run migrations** (required on first run — local compose starts uvicorn without auto-migrate):

```bash
docker compose exec api alembic upgrade head
```

> Production Docker image (`backend/Dockerfile`) runs `scripts/start-api.sh`, which applies migrations automatically before starting uvicorn.



### 3. Start the frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register a new account, submit a batch, and watch items move through `queued → processing → done`.

### 4. Run tests

Backend tests use real PostgreSQL (AI is mocked):

```bash
# With docker compose postgres running:
docker compose exec postgres psql -U inboxzero -c "CREATE DATABASE inboxzero_test;" 2>/dev/null || true

cd backend
pip install -r requirements-dev.txt
DATABASE_URL=postgresql+psycopg://inboxzero:inboxzero@localhost:5432/inboxzero_test pytest
```

---



## Deployment



### Frontend — Vercel (required)

1. Import the repo in Vercel (root directory: `frontend`).
2. Set environment variable:
  - `NEXT_PUBLIC_API_URL` → [https://inboxzero-api-paft.onrender.com](https://inboxzero-api-paft.onrender.com)
3. Deploy.

**Live URL:** [https://inbox-zero-peach-phi.vercel.app](https://inbox-zero-peach-phi.vercel.app)

### Backend — Render (cloud)

Deploy via **Render Dashboard → New → Blueprint** using `[render.yaml](render.yaml)`.

Provisioned resources:

- PostgreSQL (`inboxzero-db`)
- Redis Key-Value (`inboxzero-redis`)
- Web service (`inboxzero-api`) — runs migrations + API via `backend/Dockerfile`
- Worker service (`inboxzero-worker`) — Celery worker + embedded beat via `backend/Dockerfile.worker`

After deploy, set in the Render dashboard:


| Service | Variable         | Value           |
| ------- | ---------------- | --------------- |
| API     | `OPENAI_API_KEY` | Your OpenAI key |
| API     | `CORS_ORIGINS`   | Your Vercel URL |
| API     | `FRONTEND_URL`   | Your Vercel URL |
| Worker  | `OPENAI_API_KEY` | Same key        |


> Background workers require a **paid** Render instance (free tier does not support workers).



### Wire frontend ↔ backend

1. Copy the Render API URL: [https://inboxzero-api-paft.onrender.com](https://inboxzero-api-paft.onrender.com)
2. Set `NEXT_PUBLIC_API_URL` on Vercel to that URL and redeploy.
3. Set `CORS_ORIGINS` and `FRONTEND_URL` on Render to your Vercel URL.



### Local backend + Vercel frontend (alternative)

If you run the backend locally instead of Render, expose it with a tunnel so the live Vercel site can reach it:

```bash
# Terminal 1 — stack
docker compose up

# Terminal 2 — tunnel (pick one)
ngrok http 8000
# or
cloudflared tunnel --url http://localhost:8000
```

Then set `NEXT_PUBLIC_API_URL` on Vercel to the tunnel HTTPS URL and add that origin to `CORS_ORIGINS` in `.env`.

---



## Frontend behavior (React Query)

- **Live progress:** jobs list and job detail poll every 2s while any job is `processing`; polling stops when all jobs are terminal (`refetchInterval` returns `false`).
- **Cache invalidation:** after submitting a batch, `queryClient.invalidateQueries({ queryKey: ["jobs"] })` refreshes the jobs list without a full page reload.
- **Manual retry:** invalidates both the job detail and jobs list queries after a successful retry.

---



## Project structure

```
InboxZero/
├── .env.example              # Backend + docker-compose env template
├── docker-compose.yml        # postgres, redis, api, worker, beat
├── render.yaml               # Render Blueprint (production backend)
├── backend/
│   ├── Dockerfile            # API image (migrations + uvicorn)
│   ├── Dockerfile.worker       # Celery worker + beat
│   ├── alembic/versions/     # Database migrations
│   ├── app/
│   │   ├── api/                # auth, jobs routes
│   │   ├── models/             # User, Job, Item
│   │   ├── services/           # auth, jobs, ai
│   │   ├── worker/             # Celery app + tasks
│   │   └── utils/idempotency.py
│   └── tests/                  # pytest (auth, jobs, worker)
└── frontend/
    ├── .env.example
    ├── vercel.json
    └── src/                    # Next.js App Router + React Query
```

---



## Demo video

**Link:** 