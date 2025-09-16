## Agents Handbook

This folder is a compact, high-signal guide for autonomous agents working on this project. It explains the stack, key flows, API surfaces, and where to make changes.

- See `flow.md` for end-to-end product and data flows.
- See `backend.md` for API, data model, and persistence.
- See `frontend.md` for UI structure and client API.

### Stack at a glance
- Backend: FastAPI + Motor (MongoDB), JWT auth, modular routers and services
- Frontend: React + TypeScript + Vite, shadcn/ui components, context-based auth
- Data: MongoDB (collections: `users`, `estimations`, pricing collections)

### Key endpoints
- Estimations (legacy-compatible):
  - GET `/estimations` list; estimator role sees own, others see all
  - GET `/estimations/{id}` details (enriched with `estimator_name`)
  - PATCH `/estimations/{id}` update basic fields; only Admin can change `creator_id`
  - PUT `/estimations/{id}/envelope` set `envelope_data` (features/resource JSON)
  - PUT `/estimations/{id}/features` and `/resources` (legacy)
  - POST `/tools/process-estimation` upload JSON to generate Excel and persist

### Where to change what
- Add/adjust API behavior: `backend/app/routes/*.py` and `backend/app/services/*.py`
- Data schema: `backend/app/models/*.py`
- UI pages and components: `frontend/src/pages/*`, `frontend/src/components/*`
- Client API: `frontend/src/lib/api.ts`

### Pointers moved
- Backend: `backend/INDEX.md` now points here
- Frontend: `frontend/README.md` now points here

### File tree (key paths)

Backend

```
backend/
  app/
    main.py
    core/
      config.py
      constants.py
      security.py
    db/
      mongo.py
    models/
      estimation.py
      user.py
      estimate.py
      pricing.py
      audit.py
    services/
      estimations.py
      users.py
      importer.py
      exporter.py
      pricing.py
      excel.py
      audit.py
    routes/
      auth.py
      users.py
      estimations.py
      estimates.py
      pricing.py
      dashboard.py
      tools.py
    routers/
      estimates.py
    tests/
      test_auth.py
  data scripts/
    populate_estimates.py
    sample.xlsx
    sample.FILLED.xlsx
    estimate.json
  Dockerfile
  docker-compose.yml
  requirements.txt
  pyproject.toml
  INDEX.md
```

Frontend

```
frontend/
  src/
    main.tsx
    App.tsx
    index.css
    App.css
    lib/
      api.ts
      utils.ts
    contexts/
      AuthContext.tsx
      SearchContext.tsx
    hooks/
      use-current-user.tsx
      use-mobile.tsx
      use-toast.ts
    pages/
      Index.tsx
      Dashboard.tsx
      EstimationsNew.tsx
      EstimationDetailsPage.tsx
      EstimatePage.tsx
      Pricing.tsx
      PricingNew.tsx
      Proposals.tsx
      Settings.tsx
      Signup.tsx
      Users.tsx
      NotFound.tsx
    components/
      layout/
        AppLayout.tsx
        Header.tsx
        Sidebar.tsx
      dialogs/
        EstimationDetailsDialog.tsx
      forms/
        EstimationStepper.tsx
        NewProposalDialog.tsx
        NewRoleDialog.tsx
      ui/
        button.tsx
        input.tsx
        textarea.tsx
        select.tsx
        table.tsx
        dialog.tsx
        drawer.tsx
        accordion.tsx
        alert.tsx
        alert-dialog.tsx
        badge.tsx
        card.tsx
        calendar.tsx
        checkbox.tsx
        command.tsx
        dropdown-menu.tsx
        form.tsx
        hover-card.tsx
        label.tsx
        menubar.tsx
        pagination.tsx
        popover.tsx
        progress.tsx
        radio-group.tsx
        select.tsx
        separator.tsx
        sheet.tsx
        sidebar.tsx
        skeleton.tsx
        slider.tsx
        sonner.tsx
        switch.tsx
        tabs.tsx
        toaster.tsx
        tooltip.tsx
        toggle.tsx
        toggle-group.tsx
        resizable.tsx
        scroll-area.tsx
        carousel.tsx
        chart.tsx
        avatar.tsx
        aspect-ratio.tsx
        input-otp.tsx
        table.tsx
        use-toast.ts
  README.md
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  eslint.config.js
  index.html
  public/
    favicon.ico
    robots.txt
    placeholder.svg
```


