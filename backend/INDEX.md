# Backend Index

## Roles (canonical)
- Admin
- Estimator
- Ops

Notes:
- Signup (POST /api/v1/auth/signup) always creates Estimator. Admin cannot be created via signup.
- Admin can promote/demote roles via Users API.
- Frontend normalizes roles to lowercase, backend stores title-case.

## Key Endpoints
- Auth:
  - POST `/api/v1/auth/login`
  - POST `/api/v1/auth/signup` (forces Estimator)
  - POST `/api/v1/auth/change-password`
- Users (Admin only except `me`):
  - GET `/api/v1/users` (list)
  - POST `/api/v1/users` (create)
  - PATCH `/api/v1/users/{id}` (update role)
  - GET `/api/v1/users/me`
- Estimates (v1):
  - POST `/api/v1/estimates` (JSON to estimate + Excel)
  - POST `/api/v1/estimates/upload` (Upload JSON file)
  - GET `/api/v1/estimates/{id}`
  - GET `/api/v1/estimates/{id}/excel`
  - PUT `/api/v1/estimates/{id}`
  - GET `/api/v1/estimates/` (paginated list)
  - Roles: Estimator/Ops/Admin can view; Estimator/Admin can write
- Pricing:
  - GET `/pricing/rates`
  - POST `/pricing/rates` (Admin)
  - PUT `/pricing/rates/{id}` (Admin)
  - DELETE `/pricing/rates/{id}` (Admin)
  - POST `/pricing/calc`
- Tools:
  - POST `/tools/process-estimation` (Upload JSON → Excel; saves DB record)

## Conventions
- Roles stored in DB are title-case. See `app/core/constants.py` for normalization.
- Default admin seeded on startup in `app/services/users.py:create_default_admin`.
- CORS configured via `app/main.py` using env `CORS_ORIGINS`.
