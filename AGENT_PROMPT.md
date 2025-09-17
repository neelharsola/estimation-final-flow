
# AI Agent Prompt: Estimation Pro Max Full-Stack Application

This document outlines the complete functionality of the "Estimation Pro Max" application. It is intended to provide a comprehensive guide for an AI coding agent to understand, maintain, and extend the application.

## 1. High-Level Overview

**Estimation Pro Max** is a full-stack web application designed for creating, managing, and pricing project estimations. It allows users (Estimators) to build detailed project estimations feature by feature, which are then saved to a database and can be exported as formatted Microsoft Excel spreadsheets.

The application supports multiple user roles (Estimator, Ops, Admin) with different permissions. The core workflow involves creating a detailed estimation from a JSON structure, which is then processed by a Python script on the backend to populate a predefined Excel template.

- **Frontend**: A modern, responsive UI built with **React, Vite, TypeScript, and Tailwind CSS (using shadcn/ui)**.
- **Backend**: A robust API built with **Python, FastAPI, and MongoDB** for data persistence.

---

## 2. Backend Functionality (`/backend`)

The backend is a FastAPI application that serves a JSON API for the frontend and handles the core business logic.

### 2.1. Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (with `motor` for asynchronous operations)
- **Authentication**: JWT (Access + Refresh Tokens) with `python-jose` and `passlib` for password hashing.
- **Data Validation**: Pydantic models.
- **Key Dependencies**: `uvicorn`, `fastapi`, `motor`, `pydantic`, `python-jose`, `passlib`, `openpyxl`.

### 2.2. Database Models (`/app/models`)

The application uses MongoDB and defines the following core Pydantic models for validation and data structure.

- **`User`**: Represents a user account.
  - Fields: `id`, `email`, `name`, `password_hash`, `role` (`Admin`, `Estimator`, `Ops`), `is_active`, `created_at`.
- **`Estimate` (New Schema)**: Represents a detailed, structured estimation. This is the canonical format for new estimations.
  - Fields: `id`, `schema_version`, `project` (name, estimator, hours/day, etc.), `rows` (list of features with detailed hour breakdowns), `summary` (totals).
- **`Estimation` (Legacy Schema)**: Represents an older, more general estimation record. It is still actively used for listing and high-level management.
  - Fields: `id`, `title`, `client`, `description`, `status` (`draft`, `under_review`, `ready_for_pricing`), `creator_id`, `current_version` (features, resources), `versions`.
  - **Crucially, it contains an `envelope_data` field which holds the entire new `Estimate` schema.** This allows for backward compatibility while transitioning to the new, more detailed format.
- **`PricingRate`**: Stores regional pricing data.
  - Fields: `id`, `role`, `region`, `day_rate`, `currency`, `version`.
- **`AuditLog`**: Records significant user actions.
  - Fields: `id`, `user_id`, `action`, `resource_id`, `timestamp`.

### 2.3. Core Business Logic & Scripts

#### **Excel Generation (`/data scripts/populate_estimates.py`)**

This is a critical script. Its function is to:
1.  Accept a path to a JSON file (matching the `Estimate` schema) and a path to a template Excel file (`sample.xlsx`).
2.  Read the `rows` from the JSON data.
3.  Open the Excel template and find the `Estimation` sheet.
4.  Iterate through the JSON rows and populate the corresponding columns in the spreadsheet, starting from the next available empty row.
5.  It preserves existing formulas in the template by copying them down to new rows.
6.  Save the newly populated workbook to a specified output path.

### 24. API Endpoints

#### **Authentication (`/app/routes/auth.py`)**
- `POST /api/v1/auth/login`: Authenticates a user and returns a JWT `access_token` and `refresh_token`.
- `POST /api/v1/auth/signup`: Creates a new user. **Role is hardcoded to `Estimator` for security.**
- `POST /api/v1/auth/change-password`: Allows an authenticated user to change their password.
- `GET /api/v1/users/me`: Returns the profile of the currently authenticated user.

#### **User Management (`/app/routes/users.py`) - Admin Only**
- `GET /api/v1/users`: Lists all users.
- `POST /api/v1/users`: Creates a new user (callable by an Admin).
- `PATCH /api/v1/users/{id}`: Updates a user's role.
- `DELETE /api/v1/users/{id}`: Deletes a user.

#### **Estimations (New Workflow) (`/app/routes/estimates.py`)**
- `POST /api/v1/estimates`: Creates an `Estimate` record and generates an Excel file.
- `POST /api/v1/estimates/upload`: Accepts a JSON file upload, creates an `Estimate` record, and generates the Excel file.
- `GET /api/v1/estimates/{id}`: Retrieves a single `Estimate` by its ID.
- `GET /api/v1/estimates/{id}/excel`: Downloads the generated Excel file for a given estimate.
- `PUT /api/v1/estimates/{id}`: Updates an existing estimate and regenerates the Excel file.
- `GET /api/v1/estimates/`: Lists all estimates with pagination and filtering.

#### **Estimations (Legacy Workflow) (`/app/routes/estimations.py`)**
- `GET /estimations`: Lists all `Estimation` records. Estimators see only their own; Admins/Ops see all.
- `POST /estimations`: Creates a new legacy `Estimation` record.
- `GET /estimations/{id}`: Retrieves a single `Estimation` record.
- `PATCH /estimations/{id}`: Updates top-level fields like title, client, status.
- `PUT /estimations/{id}/envelope`: **Key endpoint for the UI editor.** Updates the detailed `envelope_data` field with a full JSON payload.

#### **Pricing (`/app/routes/pricing.py`) - Admin Only**
- `GET /pricing/rates`: Lists all pricing rates.
- `POST /pricing/rates`: Creates a new pricing rate.
- `PUT /pricing/rates/{id}`: Updates a pricing rate.
- `DELETE /pricing/rates/{id}`: Deletes a pricing rate.

#### **Tools (`/app/routes/tools.py`)**
- `POST /tools/process-estimation`: **This is the primary endpoint for the UI's "New Estimation" stepper.**
  1.  Accepts a JSON file upload.
  2.  Creates a legacy `Estimation` record in the database. The uploaded JSON is stored in the `envelope_data` field.
  3.  Executes the `populate_estimates.py` script to generate a filled Excel file.
  4.  Returns the generated Excel file as a `FileResponse` for download.

---

## 3. Frontend Functionality (`/frontend`)

The frontend is a single-page application (SPA) built with React, providing a dynamic and responsive user interface for interacting with the backend API.

### 3.1. Tech Stack

- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS with `shadcn/ui` components.
- **Routing**: `react-router-dom`
- **State Management**:
  - **Global State**: React Context API (`AuthContext`, `SearchContext`).
  - **Server State**: `@tanstack/react-query` for caching API data.
- **Forms**: `react-hook-form` with `zod` for validation.

### 3.2. Application Structure & Pages

- **`AppLayout.tsx`**: The main layout component, containing a persistent `Sidebar` and a `Header`.
- **`Sidebar.tsx`**: Provides navigation links. Links are conditionally rendered based on the user's role (`Admin`, `Estimator`, `Ops`).
- **`Header.tsx`**: Contains a global search bar and a user profile dropdown menu (for settings and logout).
- **Pages (`/src/pages`)**:
  - `/login` (`Index.tsx`): Login page.
  - `/signup` (`Signup.tsx`): User registration page.
  - `/` (`Dashboard.tsx`): The main dashboard, showing summary statistics.
  - `/estimations` (`EstimationsNew.tsx`): The primary page for managing estimations. It lists all existing estimations and provides the entry point to create new ones.
  - `/estimations/:id` (`EstimationDetailsPage.tsx`): Displays the full, editable details of a single estimation.
  - `/pricing` (`PricingNew.tsx`): A page for Admins to manage pricing rates.
  - `/users` (`Users.tsx`): A page for Admins to manage users.
  - `/settings` (`Settings.tsx`): Allows users to update their profile and password.

### 3.3. Key User Flows

#### **Authentication Flow**
1.  A new user signs up via the `/signup` page. The backend automatically assigns them the "Estimator" role.
2.  The user logs in via the `/login` page.
3.  On successful login, JWT tokens (`access_token`, `refresh_token`) are stored in `localStorage`.
4.  The `AuthContext` provider fetches the user's profile (`/api/v1/users/me`) and makes it available globally.
5.  Routes are protected using `RequireAuth` and `RequireRole` components, which redirect unauthenticated or unauthorized users.

#### **New Estimation Flow (Primary)**
1.  The user clicks "New Estimation" on the `/estimations` page, which opens the `EstimationStepper.tsx` dialog.
2.  **Step 1 (Project Info)**: The user can either:
    a. **Upload a JSON file**: This pre-populates the entire form, including project info and all feature rows.
    b. **Manual Entry**: Fill in the project name, client, and description.
3.  **Step 2 (Features)**: The user adds, edits, or removes feature rows. Each row includes platform, module, component, feature description, complexity, etc.
4.  **Step 3 (Resources/Hours)**: The user inputs the estimated hours for various disciplines (UI Design, Backend, etc.) for each feature row.
5.  **Step 4 (Review & Save)**: The user reviews the complete estimation summary.
6.  On clicking "Save Estimation", the frontend:
    a. Compiles all the form data into a single JSON object.
    b. Creates a `File` object from this JSON.
    c. Sends this file to the `/tools/process-estimation` backend endpoint.
    d. The backend saves the estimation and returns a filled Excel file, which the browser automatically downloads.
    e. The dialog closes, and the estimations list on the main page refreshes to show the new entry.

#### **Estimation Management Flow**
1.  The `/estimations` page fetches and displays a list of all estimations from the `/estimations` endpoint.
2.  The user can search and filter this list.
3.  Clicking on an estimation's title navigates the user to the `/estimations/:id` details page.
4.  On the details page, the user can view all data and edit it inline. Changes are saved by calling `PUT /estimations/:id/envelope`.
5.  The user can also download the associated Excel file from this page.

#### **Admin Flows**
- **User Management**: Admins can navigate to the `/users` page to view a list of all users. They can change user roles or deactivate accounts.
- **Pricing Management**: Admins can navigate to the `/pricing` page to view and edit the daily rates for different roles and regions.
