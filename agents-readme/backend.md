## Backend (FastAPI + MongoDB)

### App entry
- `backend/app/main.py` sets up FastAPI with CORS, signal handling, DB init/indexes, and includes routers:
  - `app.routes.auth`, `app.routes.users`, `app.routes.estimations`, `app.routes.pricing`, `app.routes.dashboard`, `app.routes.tools`
  - Legacy CLI router `app.routers.estimates` for compatibility

### Models
- `app/models/estimation.py`
  - `Estimation`: core document with `_id`, `title`, `client`, `status`, `creator_id`, `current_version`, `versions`, `review_records`, timestamps, and optional `envelope_data`
  - `EstimationEnvelope`: typed structure of uploaded/edited JSON (project info, rows, summary)
  - `EstimationVersion`: version snapshot metadata
- `app/models/user.py`
  - `User`, `UserPublic`, `UserCreate` with strict role `Admin|Estimator|Ops`

### Persistence
- `app/db/mongo.py` exposes `get_db()` Motor client and index management
- Collections: `users`, `estimations`

### Services
- `app/services/estimations.py`
  - `get_estimation`, `list_estimations`: enrich docs with `estimator_name` from `creator_id`, and replace version `created_by` ids with names for display
  - `update_estimation_title_client_desc`: selective updates; accepts `creator_id` (admin-only validated in route)
  - `update_envelope_data`: sets `envelope_data`
  - `update_features`, `update_resources`, `snapshot_version`, `rollback_version`
- `app/services/users.py`
  - `list_users`: coerces unknown roles to `Estimator` to avoid validation errors; `create_default_admin` ensures name is `MSBC Admin`

### Routes
- `app/routes/estimations.py`
  - List/get/create/delete; role-aware list
  - PATCH `/{id}`: estimators/ops/admin can update basics; only admin can change `creator_id`
  - PUT `/{id}/envelope`: update envelope JSON
  - PUT `/{id}/features|resources`: legacy arrays
  - POST `/{id}/versions` and rollback
- `app/routes/tools.py`
  - POST `/tools/process-estimation`: save estimation from JSON and run `data scripts/populate_estimates.py` to generate Excel

### Auth and roles
- `app/core/security.py` provides JWT handling and dependencies
- `app/routes/users.py` enforces Admin for user management


