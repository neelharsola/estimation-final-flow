## Frontend (React + TypeScript)

### Structure
- Entry: `frontend/src/main.tsx`, `App.tsx`
- Pages: `frontend/src/pages/*` (e.g., `EstimationsNew.tsx`, `EstimationDetailsPage.tsx`)
- Components: `frontend/src/components/*` (including shadcn/ui wrappers)
- Contexts: `frontend/src/contexts/*` (`AuthContext.tsx`)
- Client API: `frontend/src/lib/api.ts`

### Key screens
- Estimations list: loads `/estimations`, displays `estimator_name` and status
- Estimation details:
  - Top-level fields editable; Save issues targeted PATCH
  - Features table is click-to-edit per-cell; numeric cells select-on-focus
  - Admin sees Estimator dropdown (fetched from `/api/v1/users`) and can change `creator_id`
  - Save also persists `envelope_data` when rows or related metadata change
  - Download Excel button posts current envelope JSON to `/tools/process-estimation` and downloads result

### Client API
- `api.estimations.list/get/update/delete`
- `api.estimations.updateEnvelope(id, envelope)`
- `api.users.list` (Admin token required)
- `api.tools.processEstimation(file)` returns Blob

### Conventions
- Prefer partial updates; compute diffs client-side
- Display-friendly fields (e.g., `estimator_name`) are provided by backend


