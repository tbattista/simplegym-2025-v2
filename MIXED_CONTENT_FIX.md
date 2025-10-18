# Mixed Content Error Fix

## Problem
HTTPS page making HTTP API requests → Browser blocks them

## Solution
Created global `getApiUrl()` function that forces HTTPS in production

## Files Updated
- `frontend/js/firebase/data-manager.js` - Added getApiUrl() utility
- `frontend/js/ghost-gym-dashboard.js` - Updated all fetch calls
- `frontend/js/firebase/migration-ui.js` - Updated all fetch calls  
- `frontend/js/components/exercise-autocomplete.js` - Updated all fetch calls
- `frontend/js/exercise-database.js` - Updated all fetch calls

## Deploy
```bash
git add .
git commit -m "fix: Force HTTPS for all API calls to prevent Mixed Content errors"
git push
```

## Verify
After Railway redeploys, check console for:
```
🔗 API Base URL: https://simplegym-v2-production.up.railway.app
```

No more Mixed Content errors.