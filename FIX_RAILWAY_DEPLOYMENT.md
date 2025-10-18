# 🚨 Quick Fix for Railway "Failed to fetch" Errors

## Immediate Action Required

Your Ghost Gym application is experiencing "Failed to fetch" errors because the frontend doesn't know where to find the backend API.

## 🎯 Quick Fix (2 minutes)

### Step 1: Determine Your Railway Setup

**Check your Railway dashboard:**
- Do you have ONE service or TWO separate services?

### Step 2A: If You Have ONE Railway Service (Monolithic)

✅ **Good news!** The fix is automatic. Just redeploy:

```bash
git add .
git commit -m "fix: Configure API base URL for Railway deployment"
git push
```

Railway will automatically redeploy and the issue will be resolved.

### Step 2B: If You Have TWO Railway Services (Separate Frontend/Backend)

1. **Get your backend URL** from Railway dashboard
   - Example: `https://ghost-gym-backend-production.up.railway.app`

2. **Edit `frontend/dashboard.html`** (line ~51):

```javascript
// Change this:
window.GHOST_GYM_API_URL = '';

// To this (use YOUR backend URL):
window.GHOST_GYM_API_URL = 'https://ghost-gym-backend-production.up.railway.app';
```

3. **Commit and push**:

```bash
git add frontend/dashboard.html
git commit -m "fix: Configure backend API URL for Railway"
git push
```

## ✅ Verification

After Railway redeploys (1-2 minutes):

1. Open your app in browser
2. Press F12 to open console
3. Look for: `🔗 API Base URL: https://your-backend-url`
4. Verify no more "Failed to fetch" errors
5. Programs and workouts should now load

## 🔍 What Was Wrong?

**Before Fix:**
```javascript
this.apiBase = '';  // Empty! Caused relative URLs to fail
```

**After Fix:**
```javascript
this.apiBase = this.getApiBaseUrl();  // Automatically detects correct URL
```

## 📊 Expected Console Output

**Before (Broken):**
```
❌ Error getting programs: TypeError: Failed to fetch
❌ Error getting workouts: TypeError: Failed to fetch
⚠️ Program polling error: TypeError: Failed to fetch
```

**After (Fixed):**
```
🔗 API Base URL: https://your-backend.railway.app
✅ Firebase Data Manager initialized
🔍 DEBUG: Got programs from Firestore: 0
🔍 DEBUG: Got workouts from Firestore: 0
```

## 🆘 Still Having Issues?

### Check Backend Health
Visit: `https://your-backend-url.railway.app/api/health`

Should return:
```json
{"status": "healthy"}
```

### Check CORS Settings
If backend is healthy but still getting errors, update CORS in `run.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Check Railway Logs
```bash
railway logs
```

Look for startup errors or API request failures.

## 📚 More Information

See [`RAILWAY_API_CONFIGURATION.md`](RAILWAY_API_CONFIGURATION.md) for detailed configuration options and troubleshooting.

---

**Need help?** Check the Railway logs or open an issue with:
1. Your Railway setup (1 service or 2?)
2. Console errors (F12 → Console tab)
3. Network errors (F12 → Network tab)