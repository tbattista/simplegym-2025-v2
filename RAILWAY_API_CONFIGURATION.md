# Railway API Configuration Guide

## Problem Solved
This guide addresses the "Failed to fetch" errors caused by the frontend trying to access the backend API on a different Railway domain.

## Root Cause
The `apiBase` in `data-manager.js` was empty, causing relative URL requests that failed when frontend and backend are deployed as separate Railway services.

## Solution Implemented

### 1. Automatic Environment Detection
The `data-manager.js` now automatically detects the environment:
- **Development (localhost)**: Uses `http://localhost:8000`
- **Production (Railway)**: Uses configured URL or same origin

### 2. Configuration Options

#### Option A: Same-Origin Deployment (Recommended)
If your frontend and backend are served from the **same Railway service** (single deployment):

**No configuration needed!** The system will automatically use `window.location.origin`.

#### Option B: Separate Railway Services
If your frontend and backend are **separate Railway services**:

1. Get your backend Railway URL (e.g., `https://ghost-gym-backend.railway.app`)

2. Open `frontend/dashboard.html` and find this section (around line 51):

```javascript
// Ghost Gym Configuration
window.GHOST_GYM_API_URL = '';
```

3. Set your backend URL:

```javascript
// Ghost Gym Configuration
window.GHOST_GYM_API_URL = 'https://your-backend-service.railway.app';
```

4. Commit and push to trigger Railway redeployment:

```bash
git add frontend/dashboard.html
git commit -m "Configure backend API URL for Railway"
git push
```

## Verification

After deployment, check the browser console. You should see:

```
🔗 API Base URL: https://your-backend-service.railway.app
```

Instead of the previous errors:
```
❌ Error getting programs: TypeError: Failed to fetch
```

## Railway Deployment Scenarios

### Scenario 1: Monolithic Deployment (Single Service)
```
Railway Service: ghost-gym-v3
├── Backend (FastAPI) - Port 8000
└── Frontend (Static files) - Served by FastAPI
URL: https://ghost-gym-v3.railway.app
```

**Configuration**: Leave `GHOST_GYM_API_URL` empty (default)

### Scenario 2: Microservices Deployment (Separate Services)
```
Railway Service 1: ghost-gym-backend
└── Backend (FastAPI) - Port 8000
URL: https://ghost-gym-backend.railway.app

Railway Service 2: ghost-gym-frontend
└── Frontend (Static files)
URL: https://ghost-gym-frontend.railway.app
```

**Configuration**: Set `GHOST_GYM_API_URL = 'https://ghost-gym-backend.railway.app'`

## CORS Configuration

If using separate services, ensure your backend allows CORS from the frontend domain.

In `run.py`, verify CORS settings:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ghost-gym-frontend.railway.app",  # Add your frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing

### Local Testing
1. Start backend: `python run.py` (runs on http://localhost:8000)
2. Open frontend: `http://localhost:8000/dashboard` or serve frontend separately
3. Check console for: `🔗 API Base URL: http://localhost:8000`

### Production Testing
1. Deploy to Railway
2. Open browser console (F12)
3. Look for: `🔗 API Base URL: https://your-domain.railway.app`
4. Verify no "Failed to fetch" errors
5. Check that programs and workouts load successfully

## Troubleshooting

### Still seeing "Failed to fetch" errors?

1. **Check API URL in console**:
   - Look for `🔗 API Base URL:` log
   - Verify it points to your backend

2. **Verify backend is running**:
   - Visit `https://your-backend.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

3. **Check CORS configuration**:
   - Open browser Network tab
   - Look for CORS errors in failed requests
   - Update `allow_origins` in backend if needed

4. **Verify authentication**:
   - Ensure Firebase is properly initialized
   - Check for auth token in request headers

### Mixed Content Warnings?

If you see "Mixed Content" warnings:
- Ensure backend URL uses `https://` not `http://`
- Railway automatically provides HTTPS for all services

## Environment Variables (Alternative Method)

For more advanced setups, you can use Railway environment variables:

1. In Railway dashboard, add environment variable:
   - Key: `VITE_API_URL` or `REACT_APP_API_URL`
   - Value: `https://your-backend.railway.app`

2. Update `data-manager.js` to read from env:
```javascript
const apiUrl = import.meta.env.VITE_API_URL || window.GHOST_GYM_API_URL || '';
```

## Summary

✅ **Fixed**: Empty `apiBase` causing relative URL failures
✅ **Added**: Automatic environment detection
✅ **Added**: Configurable API URL for Railway deployments
✅ **Added**: Console logging for debugging

The application now works correctly whether deployed as:
- Single Railway service (monolithic)
- Separate Railway services (microservices)
- Local development environment