# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Estimation Pro Max** is a full-stack web application for creating, managing, and pricing project estimations. Users (Estimators) build detailed project estimations feature by feature, which are saved to a database and exported as formatted Excel spreadsheets.

### Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS (shadcn/ui components)
- **Backend**: FastAPI + Python + MongoDB (with Motor async driver)
- **Authentication**: JWT (Access + Refresh tokens)
- **Data Validation**: Pydantic models

## Common Development Commands

### Frontend (React + Vite + TypeScript)
```powershell
# Navigate to frontend directory
cd "frontend"

# Install dependencies
npm install

# Development server (runs on port 8080, or 8081 if 8080 is occupied)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend (FastAPI + Python)
```powershell
# Navigate to backend directory
cd "backend"

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest -q

# Code formatting and linting
black . && flake8
```

## Key Application Components

### Frontend Architecture

- **Entry Point**: `frontend/src/main.tsx` → `App.tsx`
- **Layout**: `AppLayout.tsx` with `Sidebar.tsx` and `Header.tsx`
- **Routing**: React Router with role-based route protection
- **State Management**: 
  - Global: React Context (`AuthContext`, `SearchContext`)
  - Server: TanStack React Query for caching
- **Forms**: React Hook Form with Zod validation
- **API Client**: `src/lib/api.ts` with typed endpoints

### Backend Architecture

- **Main**: `app/main.py` - FastAPI app factory, router registration, CORS
- **Security**: `app/core/security.py` - JWT auth, password hashing
- **Database**: `app/db/mongo.py` - MongoDB connection with Motor
- **Models**: `app/models/` - Pydantic schemas for data validation
- **Routes**: `app/routes/` - API endpoints organized by feature
- **Services**: `app/services/` - Business logic and database operations

## Core Business Logic

### Estimation Workflow

1. **Project Setup**: Users create estimations via `EstimationStepper.tsx` (6-step process)
2. **Data Structure**: Dual schema approach:
   - **Legacy**: `Estimation` model for listing/management
   - **Detailed**: `EstimationEnvelope` in `envelope_data` field for rich data
3. **Excel Generation**: `populate_estimates.py` script processes JSON → Excel
4. **Pricing**: Multi-currency support with role-based day rates

### Key Data Models

- **User**: `id`, `email`, `name`, `role` (Admin/Estimator/Ops), `is_active`
- **Estimation**: `title`, `client`, `status`, `creator_id`, `envelope_data`
- **EstimationEnvelope**: `project`, `rows` (features), `summary`
- **Resource**: `name`, `role`, `rates` (multi-currency)
- **PricingRate**: `role`, `region`, `day_rate`, `currency`

### Authentication & Authorization

- **JWT Tokens**: Access + refresh token system
- **Role-based Access**: 
  - **Estimators**: Create/edit own estimations
  - **Ops**: Review estimations, manage pricing
  - **Admins**: Full system access, user management
- **Route Protection**: `RequireAuth` and `RequireRole` components

## Development Guidelines

### Frontend Standards

- Use TypeScript strict mode where possible
- Prefer shadcn/ui components over custom CSS
- Keep components small and composable
- Use absolute imports via `@/` alias
- Handle loading/error states consistently
- Store auth tokens in localStorage (access) + httpOnly cookies preferred for refresh

### Backend Standards

- Use async/await throughout (Motor driver)
- Validate all input/output with Pydantic models  
- Implement proper error handling with HTTP status codes
- Use dependency injection for auth/role checks
- Maintain database indexes for performance
- Never commit secrets (use `.env` file)

### Database Considerations

- **MongoDB Collections**: `users`, `estimations`, `resources`, `pricing_rates`
- **Key Indexes**: 
  - `users.email` (unique)
  - `estimations.client`, `estimations.status`
  - `pricing_rates` composite on `(role, region, version)`
- **Temporary Records**: Use `is_temporary: true` flag for drafts

## API Endpoints Overview

### Authentication (`/api/v1/auth/`)
- `POST /login` - User authentication  
- `POST /signup` - User registration (role: Estimator)
- `POST /change-password` - Password update
- `GET /users/me` - Current user profile

### Estimations (`/estimations/`)
- `GET /` - List estimations (filtered by role)
- `POST /` - Create new estimation
- `GET /{id}` - Get estimation details
- `PATCH /{id}` - Update estimation metadata
- `PUT /{id}/envelope` - Update detailed estimation data

### Pricing (`/pricing/`)
- `GET /rates` - List pricing rates
- `POST /rates` - Create pricing rate (Admin)
- `PUT /rates/{id}` - Update rate (Admin)
- `GET /fx` - Currency exchange rates
- `GET /projects/{id}/resources` - Project resource pricing
- `PUT /projects/{id}/summary` - Update pricing summary

### Tools (`/tools/`)
- `POST /process-estimation` - JSON to Excel conversion (main workflow)

### Resources (`/resources/`)
- `GET /` - List available resources
- `POST /` - Create resource (Admin)
- `PUT /{id}` - Update resource (Admin)

## Common Pitfalls & Solutions

### Frontend Issues

1. **Pricing Table Bugs**: 
   - **Problem**: Duplicate columns, incorrect calculations
   - **Solution**: Use structured `pricingRows` state with proper hourly→day rate calculation (×8 hours)

2. **Dropdown Role Filtering**:
   - **Problem**: Selected roles appear in subsequent dropdowns
   - **Solution**: Filter `availableRoles` by excluding `usedRoles`

3. **State Management**:
   - **Problem**: Complex nested state updates
   - **Solution**: Use immutable updates with spread operator, consider useReducer for complex state

### Backend Issues

1. **MongoDB ObjectId Serialization**:
   - **Problem**: BSON ObjectId not JSON serializable
   - **Solution**: Convert to string: `doc["_id"] = str(doc["_id"])`

2. **Async Database Operations**:
   - **Problem**: Mixing sync/async database calls
   - **Solution**: Use Motor driver consistently with `await`

3. **Pydantic Model Validation**:
   - **Problem**: Field naming conflicts (MongoDB `_id` vs Pydantic `id`)
   - **Solution**: Use `serialization_alias` in Field definitions

## Environment Setup

### Frontend Environment Variables
```env
VITE_API_URL=http://localhost:8000
```

### Backend Environment Variables
```env
MONGO_URL=mongodb://localhost:27017
MONGO_DB=estimation_pro_max
JWT_SECRET=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## File Structure Reference

```
estimation-final-flow/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── forms/EstimationStepper.tsx (main estimation creation)
│   │   │   ├── layout/AppLayout.tsx
│   │   │   └── ui/ (shadcn components)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── lib/api.ts (API client)
│   │   ├── pages/ (route components)
│   │   └── main.tsx (entry point)
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── core/security.py (auth logic)
│   │   ├── db/mongo.py (database connection)
│   │   ├── models/ (Pydantic schemas)
│   │   ├── routes/ (API endpoints)
│   │   ├── services/ (business logic)
│   │   └── main.py (FastAPI app)
│   └── requirements.txt
└── data scripts/populate_estimates.py (Excel generation)
```

## Testing Strategy

### Frontend Testing
- Focus on component behavior and user interactions
- Test API integration with mock responses
- Verify form validation and error handling

### Backend Testing  
- Unit tests for business logic in `services/`
- Integration tests for API endpoints
- Database tests with test containers or mocks

## Production Considerations

- **Security**: Implement rate limiting, input sanitization
- **Performance**: Database indexing, query optimization
- **Monitoring**: Error tracking, performance metrics
- **Deployment**: Containerization with Docker
- **Backup**: Regular MongoDB backups
- **SSL**: HTTPS in production with proper certificates