# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Start development server (runs on port 8001)
python run.py

# API documentation available at http://localhost:8001/docs

# Install dependencies
pip install -r requirements.txt
```

## Architecture Overview

Ghost Gym V2 is a workout log generator with:
- **Backend**: FastAPI (Python) serving REST API and static files
- **Frontend**: Vanilla JavaScript with Bootstrap 5 (Sneat template)
- **Database**: Firebase Firestore (cloud) with localStorage fallback
- **PDF Generation**: Gotenberg microservice (Docker-based)
- **Deployment**: Railway with NIXPACKS builder

### Directory Structure
```
backend/
├── main.py              # FastAPI app entry point
├── models.py            # Pydantic data models
├── api/                 # 14 router modules (workouts, programs, exercises, etc.)
├── services/            # Business logic (firebase_service, data_service, etc.)
├── middleware/          # Auth middleware
└── templates/html/      # Jinja2 templates for PDF generation

frontend/
├── index.html           # Main dashboard
├── workout-mode.html    # Active workout execution
├── workout-builder.html # Create/edit workouts
├── exercise-database.html
├── assets/
│   ├── js/
│   │   ├── controllers/ # Page logic (workout-mode-controller.js)
│   │   ├── services/    # Firebase, auth, data management
│   │   └── components/  # Reusable UI (modals, offcanvas, cards)
│   └── css/             # Component-scoped styles
```

### Key Data Flow
1. **Authentication**: Firebase Auth → JWT token in Bearer header
2. **Storage**: Authenticated users → Firestore, Anonymous → localStorage
3. **Workout Mode**: WorkoutModeController → SessionService → DataManager → API

### Frontend Patterns
- Services registered on `window` object (window.authService, window.dataManager)
- Event-driven communication (authStateChanged, themeChanged events)
- Controllers compose multiple services (lifecycle, timer, weight managers)
- Modal/Offcanvas managers handle Bootstrap component lifecycle

### API Patterns
- All endpoints under `/api/v3/` prefix
- Firebase-specific endpoints under `/api/v3/firebase/`
- Dual-mode: Firebase for authenticated, local storage for anonymous
- FastAPI Depends() for service injection and auth

## Data Validation Rules
- Workout names: 1-50 characters
- Exercise names: 1-100 characters
- Sets/Reps: Flexible format - supports numbers, ranges, or plain text (e.g., "3", "8-12", "AMRAP")
- Rest format: number + unit (e.g., "60s", "2min")

## Key Files for Common Tasks

**Adding API endpoints**: `backend/api/` - create new router, register in main.py
**Workout session logic**: `frontend/assets/js/services/workout-session-service.js`
**Exercise card rendering**: `frontend/assets/js/components/exercise-card-renderer.js`
**Auth flow**: `frontend/assets/js/services/auth-service.js`
**Firebase config**: `frontend/assets/js/app-config.js`

## Environment Variables
Required in `.env`:
- FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- RAILWAY_PUBLIC_DOMAIN (for share URLs in production)
- GOTENBERG_URL (PDF service, optional)
- PORT (defaults to 8001)
