## System Flow

### Authentication
1. User logs in → JWT saved in localStorage (`access_token`)
2. Client attaches Authorization header for API calls

### Estimation lifecycle
1. Create/import
   - Via Stepper: prepares JSON envelope and POSTs to `/tools/process-estimation`
   - Backend stores estimation in `estimations` with `envelope_data`
   - Excel is generated and returned for download
2. List
   - GET `/estimations` returns enriched rows with `estimator_name`; role-based filtering
3. View/Edit
   - GET `/estimations/{id}` returns full estimation including `envelope_data`
   - User edits top-level fields and feature rows inline
   - Save:
     - PATCH `/estimations/{id}` for changed basics; only Admin can change `creator_id`
     - PUT `/estimations/{id}/envelope` when rows or envelope metadata changed
4. Versioning (optional)
   - POST `/estimations/{id}/versions` to snapshot current version
   - POST `/estimations/{id}/versions/{n}/rollback` to restore

### Pricing (outline)
- Pricing endpoints calculate totals from the estimation; see `backend/app/routes/pricing.py`

### Error handling & constraints
- Unique `title` index on estimations; duplicate titles will error unless handled
- Users listing coerces unknown roles to `Estimator` to avoid validation failures


