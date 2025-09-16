## Frontend Index

### Active Routes
- `/` Dashboard (auth required)
- `/estimations` Estimations list + Stepper dialog (Create flow)
- `/estimates` Legacy estimates page
- `/pricing` Pricing (Ops/Admin)
- `/users` Users (Admin)
- `/settings` Settings
- `/login` Login
- `/signup` Signup

### Estimations Flow (Current)
- Create flow uses Stepper component (`components/forms/EstimationStepper.tsx`) from the `EstimationsNew` page.
- Quick JSON → Excel upload uses `api.tools.processEstimation` pointing to backend `/tools/process-estimation`.

### Removed/Pruned
- JSON editor page and related API helpers removed to keep single source of truth (Stepper + quick upload).

### API Client
- See `src/lib/api.ts` for endpoints used by the UI.
