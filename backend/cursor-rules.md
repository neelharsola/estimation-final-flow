## Cursor Rules — Backend (FastAPI + MongoDB)

These rules guide automated edits in this backend.

- Code style
  - Use black and flake8. Run: `black . && flake8`.
  - Python ≥3.11. Keep async-first design; avoid blocking calls.
  - Preserve existing indentation and formatting; do not mass-reformat unrelated files.
  - Prefer explicit names, typed Pydantic models, early returns, and guard clauses.

- Project layout
  - `app/main.py`: app factory, router registration, CORS, startup/shutdown.
  - `app/core/`: `config.py` (env), `security.py` (JWT, hashing, deps).
  - `app/db/mongo.py`: Motor client init, `ensure_indexes()`.
  - `app/models/`: Pydantic schemas for users, estimations, pricing.
  - `app/routes/`: Routers per module (`auth`, `users`, `estimations`, `pricing`, `dashboard`, `tools`).
  - `app/services/`: Business logic (DB operations, calculations).
  - `app/tests/`: pytest tests.

- Environment
  - Copy `.env.example` to `.env` and set: `MONGO_URL`, `MONGO_DB`, `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`.
  - Never commit secrets.

- Install & run
  - `pip install -r backend/requirements.txt`
  - Dev server: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - Tests: `pytest -q`

- Auth & RBAC
  - JWT access + refresh in `core/security.py`.
  - Password hashing via bcrypt (passlib).
  - Enforce roles using dependencies; admin is read-only for estimations, manages users/rates.

- MongoDB
  - Use Motor async driver only. No sync PyMongo.
  - Maintain indexes: `users.email` unique; `estimations.client`, `estimations.status`; `pricing_rates` composite index on `(role, region, version)`.

- API rules
  - All endpoints async. Validate request/response with Pydantic models only.
  - Estimations require ≥2 reviewer approvals before `status=ready_for_pricing`.
  - Versioning: snapshot, list versions, rollback.
  - Pricing calculator uses latest rate by `(role, region)` (default region if unspecified).

- Edits policy for Cursor
  - Prefer small, cohesive edits. Update/add tests when changing behavior.
  - Do not remove or bypass security/validation.
  - Keep routes modular; avoid cross-import cycles. Put logic into `services/`.
  - When adding new models or routers, register them in `main.py` and create indexes if needed.
  - Do not hardcode file paths; use env/config. For temp files, use `tempfile`.

- Lint/format gates (run in CI/local)
  - `black --check .`
  - `flake8`
  - `pytest -q`


