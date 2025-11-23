# Railway Deployment Troubleshooting Guide

**Issue:** Workout mode list works locally but not on Railway  
**Date:** 2025-11-09  
**Status:** 🔧 Troubleshooting

## Problem

The workout list component fix works perfectly on localhost but doesn't work when deployed to Railway. This is a common deployment issue with several possible causes.

## Most Likely Cause: Browser/CDN Caching

Railway and browsers aggressively cache static files. Even though you've updated the HTML file, the browser or Railway's CDN might be serving the old version.

## Solution Steps

### 1. Force Cache Bust (Already Done ✅)

Updated all script version parameters in [`workout-mode.html`](frontend/workout-mode.html:271):

```html
<!-- OLD versions -->
<script src="/static/assets/js/components/workout-list-component.js?v=1.0.0"></script>
<script src="/static/assets/js/controllers/workout-mode-controller.js?v=20251108-01"></script>
<script src="/static/assets/js/workout-mode-refactored.js?v=20251108-01"></script>

<!-- NEW versions (cache-busted) -->
<script src="/static/assets/js/components/workout-list-component.js?v=20251109-01"></script>
<script src="/static/assets/js/controllers/workout-mode-controller.js?v=20251109-01"></script>
<script src="/static/assets/js/workout-mode-refactored.js?v=20251109-01"></script>
```

### 2. Deploy to Railway

```bash
# Commit the changes
git add frontend/workout-mode.html
git commit -m "fix: Add workout-list-component.js to workout mode page with cache bust"
git push origin main
```

Railway will automatically detect the push and redeploy.

### 3. Clear Browser Cache (Important!)

After Railway finishes deploying, you MUST clear your browser cache:

**Option A: Hard Refresh (Recommended)**
- **Chrome/Edge:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- **Firefox:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- **Safari:** `Cmd + Option + R`

**Option B: Clear Cache via DevTools**
1. Open DevTools (`F12`)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option C: Incognito/Private Window**
- Open the Railway URL in an incognito/private window
- This bypasses all cached files

### 4. Verify Deployment

Check these in order:

#### A. Check Railway Deployment Status
1. Go to Railway dashboard
2. Verify the deployment shows "Success"
3. Check deployment logs for any errors

#### B. Verify File is Served
Open DevTools Network tab and check:
```
https://your-app.railway.app/static/assets/js/components/workout-list-component.js?v=20251109-01
```

Should return HTTP 200 with the JavaScript file content.

#### C. Check Console for Errors
Open browser console (`F12` → Console tab) and look for:
- ✅ `📦 Workout List Component loaded`
- ✅ `🎮 Workout Mode Controller loaded`
- ❌ Any 404 errors for missing scripts
- ❌ Any JavaScript errors

### 5. Additional Troubleshooting

If it still doesn't work after cache clearing:

#### Check Git Status
```bash
# Verify the file was committed
git status

# Verify the changes are in the commit
git diff HEAD~1 frontend/workout-mode.html
```

#### Check Railway Build Logs
1. Go to Railway dashboard
2. Click on your deployment
3. Check "Build Logs" tab
4. Look for any errors during build

#### Verify File Exists in Deployment
The file should be at:
```
frontend/assets/js/components/workout-list-component.js
```

Check that it's not in `.gitignore` and is being deployed.

#### Check Network Tab
1. Open DevTools → Network tab
2. Reload the page
3. Filter by "JS"
4. Look for `workout-list-component.js`
5. Check:
   - Status code (should be 200)
   - Response headers (check cache headers)
   - Response body (should contain the JavaScript code)

## Common Issues & Solutions

### Issue: 404 Not Found for workout-list-component.js

**Cause:** File not deployed or wrong path  
**Solution:**
```bash
# Verify file exists locally
ls -la frontend/assets/js/components/workout-list-component.js

# Check .gitignore doesn't exclude it
cat .gitignore | grep -i component

# Force add if needed
git add -f frontend/assets/js/components/workout-list-component.js
git commit -m "fix: Ensure workout-list-component.js is deployed"
git push
```

### Issue: Old HTML Still Loading

**Cause:** Railway CDN caching the HTML file  
**Solution:**
1. Wait 5-10 minutes for CDN cache to expire
2. Use hard refresh (`Ctrl + Shift + R`)
3. Try incognito mode
4. Add a version parameter to the HTML route (requires backend change)

### Issue: Script Loads but Component Not Working

**Cause:** JavaScript error or dependency issue  
**Solution:**
1. Check browser console for errors
2. Verify all dependencies load before the component:
   - ✅ jQuery
   - ✅ Bootstrap
   - ✅ Firebase services
   - ✅ Data manager
3. Check that `window.dataManager` exists

### Issue: Works in Incognito but Not Regular Browser

**Cause:** Browser cache is very persistent  
**Solution:**
```
1. Close ALL browser tabs for your Railway app
2. Clear browser cache completely:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content
3. Restart browser
4. Open Railway URL in new tab
```

## Verification Checklist

After deploying, verify these in order:

- [ ] Railway deployment shows "Success"
- [ ] Hard refresh performed (`Ctrl + Shift + R`)
- [ ] DevTools Network tab shows `workout-list-component.js?v=20251109-01` with HTTP 200
- [ ] Console shows `📦 Workout List Component loaded`
- [ ] Console shows `🎮 Workout Mode Controller loaded`
- [ ] No 404 errors in console
- [ ] No JavaScript errors in console
- [ ] Workout list appears on the page
- [ ] Search bar is functional
- [ ] Clicking "Start" on a workout loads it

## Quick Test Commands

```bash
# Test if file is accessible (replace with your Railway URL)
curl -I https://your-app.railway.app/static/assets/js/components/workout-list-component.js

# Should return HTTP 200

# Test if HTML is updated (check for the new version parameter)
curl https://your-app.railway.app/workout-mode.html | grep "workout-list-component.js?v=20251109-01"

# Should return a line with the script tag
```

## Prevention for Future

To avoid caching issues in the future:

1. **Always use version parameters** on script tags
2. **Increment version on every change** (use date format: `YYYYMMDD-NN`)
3. **Test in incognito first** after deployment
4. **Document version changes** in commit messages
5. **Consider using a build tool** that auto-generates cache-busting hashes

## Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Check Railway logs** for any server errors
2. **Verify environment variables** are set correctly
3. **Test the API endpoint** directly: `/api/workouts`
4. **Check Firebase configuration** in production
5. **Compare working local vs broken production** using DevTools

## Contact Points

- Railway Dashboard: Check deployment status and logs
- Browser DevTools: Check Network tab and Console
- Git History: Verify changes were committed and pushed

---

**Last Updated:** 2025-11-09  
**Related Files:**
- [`frontend/workout-mode.html`](frontend/workout-mode.html:271)
- [`frontend/assets/js/components/workout-list-component.js`](frontend/assets/js/components/workout-list-component.js:1)
- [`WORKOUT_MODE_LIST_FIX.md`](WORKOUT_MODE_LIST_FIX.md:1)