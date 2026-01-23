# Debug Plan: "Workout Not Found" Error Investigation

## Problem Statement

User encounters error when accessing workout-mode.html:
```
Error: Workout not found (ID: workout-d20441cf)
Available workouts: 0
Available IDs: none
Current storage mode: localStorage
Authenticated: No
```

**Critical context**: User clicked on a workout from the workout-database.html page, then got this error on workout-mode.html. This means workouts were visible in the database view, but not accessible in workout mode.

## Root Cause Analysis

### Understanding the Error

The error occurs in `workout-mode-controller.js:285` when:
1. URL has workout ID: `?id=workout-d20441cf`
2. User is NOT authenticated (anonymous mode)
3. DataManager queries `localStorage` for workouts
4. `localStorage.getItem('gym_workouts')` returns empty/null array
5. `workouts.find(w => w.id === workoutId)` returns undefined
6. Error is thrown

### Key Observation: Mismatched ID Format

**Standard ID format** (from `data-manager.js:638`):
```javascript
id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
// Example: workout-1704067200000-a7b3c9d2e
```

**User's ID**: `workout-d20441cf` (missing timestamp portion)

This suggests the workout was **NOT** created by the local `createLocalStorageWorkout()` function. It was likely:
1. Created in Firebase/Firestore while authenticated
2. A shared workout URL from another user
3. Created by an older version of the app with different ID format

### Critical Finding: Data Flow Discrepancy

Both pages use the same data manager:
- **workout-database.js** (line 114): `const workouts = await window.dataManager.getWorkouts();`
- **workout-mode-controller.js** (line 260): `const workouts = await this.dataManager.getWorkouts();`

If workouts appear in the database but return 0 in workout-mode, this indicates:

1. **Race Condition**: DataManager auth state differs between page loads
2. **Auth State Change**: User was authenticated on database page, but not on workout-mode page
3. **Cached Data**: workout-database may have displayed cached/stale data

### Most Likely Root Cause: **Auth State Race Condition**

The workout-database page may have loaded workouts while:
- User was still authenticated (session not expired)
- DataManager was in `firestore` mode

Then when navigating to workout-mode:
- Auth state changed (token expired, session ended)
- DataManager switched to `localStorage` mode
- localStorage has 0 workouts

### Root Causes (Most Likely → Least Likely)

| # | Cause | Probability | Evidence |
|---|-------|-------------|----------|
| 1 | **Auth state changed between pages** | VERY HIGH | User was auth'd on database, not auth'd on workout-mode |
| 2 | **Session token expired during navigation** | HIGH | Common in Firebase Auth |
| 3 | **Browser restored tab without auth** | MEDIUM | Bookmarked URL or tab restore |
| 4 | **localStorage was cleared** | LOW | No evidence |
| 5 | **Workout was deleted** | LOW | No evidence |

## Recommended Debug Steps

### Step 1: Check Browser DevTools for localStorage Content

In browser console, run:
```javascript
// Check all localStorage keys
Object.keys(localStorage).filter(k => k.includes('gym') || k.includes('workout'));

// Check gym_workouts specifically
const workouts = JSON.parse(localStorage.getItem('gym_workouts') || '[]');
console.log('Workouts in localStorage:', workouts.length);
console.log('Workout IDs:', workouts.map(w => w.id));

// Check for any persisted session
const session = localStorage.getItem('ghost_gym_active_workout_session');
console.log('Active session:', session);
```

### Step 2: Determine Workout Origin

Ask user:
1. **Did you create this workout while logged in?** → If yes, login to access Firebase workouts
2. **Did someone share this URL with you?** → If yes, the workout may not be accessible without authentication
3. **Did you clear browser data recently?** → If yes, localStorage was wiped
4. **Are you using incognito/private mode?** → If yes, no localStorage persistence

### Step 3: Authentication Path

If the workout was created while authenticated:
1. Log in to the application
2. DataManager will switch to `storageMode: 'firestore'`
3. Workouts will be fetched from Firebase API
4. Workout should be found

## Possible Solutions

### Solution A: User Needs to Log In (Most Likely)

**Scenario**: User created workout while authenticated, now trying to access anonymously.

**Fix**:
- Prompt user to log in
- After auth, DataManager switches to Firestore mode
- Workout loads from cloud

**Code location**: No code changes needed - user action required.

### Solution B: Improve Error UX

**Scenario**: Make the error more actionable for users.

**Current behavior**: Shows technical error message.

**Proposed improvement**:
1. Detect if ID format suggests cloud origin
2. Show "Login to access this workout" prompt instead of error
3. Add "Return to workout database" button

**Files to modify**:
- `frontend/assets/js/controllers/workout-mode-controller.js` (lines 270-285)
- `frontend/assets/js/services/workout-ui-state-manager.js` (error display)

### Solution C: Support Shared Workout URLs

**Scenario**: Enable accessing workouts via shared URLs without authentication.

**Proposed approach**:
1. Create public workout endpoint: `/api/v3/workouts/public/{workout_id}`
2. Add sharing flag to workouts
3. Modify loadWorkout to try public endpoint if standard load fails

**Files to modify**:
- `backend/api/workouts.py` - add public endpoint
- `frontend/assets/js/controllers/workout-mode-controller.js` - fallback logic
- `frontend/assets/js/firebase/data-manager.js` - public fetch method

### Solution D: Cross-Storage Lookup

**Scenario**: Check both localStorage AND try API before failing.

**Proposed approach**:
1. If localStorage returns empty, attempt API call (even if not authenticated)
2. API returns 401 → show "login required" message
3. API returns 404 → show "workout not found"
4. API returns 200 → display workout (if public/shared)

**Files to modify**:
- `frontend/assets/js/controllers/workout-mode-controller.js`
- `frontend/assets/js/firebase/data-manager.js`

## Recommended Action

**Immediate**: Ask user to log in. The workout ID format (`workout-d20441cf`) strongly suggests it was created in Firebase, not localStorage.

**Medium-term**: Implement Solution B (improved error UX) to better guide users when this situation occurs.

**Long-term**: Consider Solution C (shared workout URLs) if sharing is a desired feature.

## Questions for User

1. Did you create this workout while logged in to the application?
2. How did you get this URL (bookmark, shared link, etc.)?
3. Are you trying to access a workout you created, or someone else's workout?
4. Have you cleared your browser data or are you in incognito mode?

## Files Reference

| File | Purpose |
|------|---------|
| [workout-mode-controller.js](frontend/assets/js/controllers/workout-mode-controller.js) | Main controller, error at line 285 |
| [data-manager.js](frontend/assets/js/firebase/data-manager.js) | Dual-mode storage, localStorage at line 556 |
| [workout-ui-state-manager.js](frontend/assets/js/services/workout-ui-state-manager.js) | Error display at line 83 |
| [app-config.js](frontend/assets/js/app-config.js) | API configuration |

---

## Next Steps After User Feedback

Based on user answers, proceed with:
- If user should log in → Guide them through auth
- If UX improvement needed → Implement Solution B
- If sharing feature desired → Plan Solution C implementation
