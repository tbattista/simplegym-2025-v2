# Resume Session Auth Timing Race Condition Fix

## Issue Discovered

When testing the auto-resume feature with an authenticated user, the session failed to resume properly:

**Symptoms**:
```
🔄 Auto-resuming session (away for 0.8 minutes, threshold: 2 min)
❌ Error loading workout: Workout not found (ID: workout-fe915404)
Available workouts: 1
Available IDs: workout-1764811032213-1rs86c9uk
Current storage mode: localStorage
Authenticated: No
```

Then later in the logs:
```
🔄 Auth state changed: firestore mode (call #2)
```

## Root Cause

**Critical timing bug**: `checkPersistedSession()` was called **BEFORE** `waitForAuthReady()` in the controller's initialization sequence.

### The Broken Flow

1. Page loads → Auth hasn't resolved yet
2. `dataManager.storageMode` defaults to `localStorage` 
3. `checkPersistedSession()` triggers (line 145)
4. Auto-resume attempts to load workout from `localStorage`
5. **Workout doesn't exist in localStorage** (it's in Firestore)
6. Error shown to user
7. *Later* auth resolves → `storageMode` switches to `firestore`

### Code Location

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:125-177)

**Before (Broken)**:
```javascript
async initialize() {
    // Line 145: Check session BEFORE auth ready
    const hasSession = await this.lifecycleManager.checkPersistedSession();
    
    // ... later at line 164 ...
    // Wait for auth - TOO LATE!
    const authState = await this.dataManager.waitForAuthReady();
}
```

## Solution

Move `waitForAuthReady()` to execute **BEFORE** `checkPersistedSession()`.

### Implementation

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:125-177)

**After (Fixed)**:
```javascript
async initialize() {
    // Setup auth listener
    this.authService.onAuthStateChange((user) => {
        this.handleAuthStateChange(user);
    });
    
    // ✅ CRITICAL FIX: Wait for auth state BEFORE checking persisted session
    console.log('⏳ Waiting for initial auth state...');
    const authState = await this.dataManager.waitForAuthReady();
    console.log('✅ Auth state ready:', authState);
    console.log('   Storage mode:', authState.storageMode);
    console.log('   Authenticated:', authState.isAuthenticated);
    
    // ✨ NOW check for persisted session - storage mode is correct!
    const hasSession = await this.lifecycleManager.checkPersistedSession();
    if (hasSession) {
        return; // Auto-resume or show prompt
    }
    
    // Continue with normal initialization...
}
```

## Result

Now the correct flow:

1. Page loads
2. **Wait for auth to resolve** → `storageMode` set correctly
3. `checkPersistedSession()` executes with correct storage mode
4. Auto-resume looks in **Firestore** (not localStorage)
5. Workout found successfully ✅
6. Session resumes seamlessly

## Testing

### Before Fix
```
storageMode: localStorage  ❌
Workout lookup: localStorage
Result: Workout not found
```

### After Fix
```
storageMode: firestore  ✅
Workout lookup: firestore
Result: Workout found, session resumed
```

## Impact

This fix ensures:
- ✅ Auto-resume works correctly for authenticated users
- ✅ Workouts are loaded from the correct storage location
- ✅ No false "workout not found" errors
- ✅ Seamless user experience on page refresh

## Files Modified

- [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:125-177) - Reordered initialization sequence

## Related

- Original feature: [`RESUME_SESSION_OFFCANVAS_IMPLEMENTATION_COMPLETE.md`](RESUME_SESSION_OFFCANVAS_IMPLEMENTATION_COMPLETE.md)
- Previous fix: [`RESUME_SESSION_OFFCANVAS_AUTO_RESUME_FIX.md`](RESUME_SESSION_OFFCANVAS_AUTO_RESUME_FIX.md)

---

**Fix Date**: 2026-01-08  
**Status**: ✅ Fixed - Auth timing properly sequenced
**Priority**: Critical - Affects all authenticated users using auto-resume
