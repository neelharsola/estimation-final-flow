## Cursor Rules — Frontend (Vite + React + TypeScript + Tailwind)

These rules guide automated edits in this frontend.

- Tech stack
  - Vite + React + TypeScript. Tailwind CSS already configured.
  - Use existing UI components under `src/components/ui/`.

- Code style
  - TypeScript strict where possible. Prefer explicit prop types and enums.
  - Keep components small and composable. Co-locate hooks in `src/hooks/`.
  - Do not introduce new CSS systems; stick to Tailwind utility classes.
  - Avoid magic strings; centralize constants when reused.

- API integration
  - Backend base URL via env (e.g., `VITE_API_URL`).
  - Use `fetch` with typed responses or a lightweight client; handle 401/403 globally.
  - Store auth tokens in memory or httpOnly cookies (preferred server-side). Avoid localStorage for refresh tokens.

- Routing & state
  - Keep page components in `src/pages/`.
  - Lift shared state to context providers as needed; avoid overusing global state.

- Features to integrate
  - Auth: login/signup forms; attach Bearer token to requests.
  - Estimations: CRUD, features/resources editors, review actions, version list/rollback.
  - Pricing: rates admin (admin only), calculation view for an estimation.
  - Dashboard: call `/dashboard/summary` and render counts.
  - Tools: upload JSON + Excel to `/tools/populate-estimates` and stream back filled workbook; allow JSON download.

- Edits policy for Cursor
  - Preserve file structure; reuse UI primitives. Avoid large refactors in a single edit.
  - Keep accessibility in mind (labels, roles, keyboard navigation).
  - Do not commit secrets; read URLs from env.
  - Add test ids where flaky selectors are likely.


