# Resume Session Auto-Resume Threshold - Final Fix

## Problem Statement

The auto-resume threshold (< 2 minutes = auto-resume, >= 2 minutes = show offcanvas) is not working correctly. Users report the offcanvas NOT appearing after extended absences (51+ minutes), meaning auto-resume is happening when it shouldn't.

## Root Cause Analysis

### Original Implementation (visibilitychange)
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden && this.sessionService.isSessionActive()) {
        console.log('📝 Page hidden - updating session timestamp');
        this.sessionService.persistSession();
    }
});
```

### Why It Fails

1. **visibilitychange doesn't fire on page refresh**
   - The event only fires when switching tabs or minimizing the browser
   - Pressing F5 or clicking refresh does NOT trigger visibilitychange

2. **isSessionActive() returns false on fresh page load**
   - `isSessionActive()` checks `this.currentSession && this.currentSession.status === 'in_progress'`
   - On a fresh page load, `currentSession` is `null` until restored by `checkPersistedSession()`
   - The event listener is registered BEFORE session restoration

3. **Timing Problem**
   - The listener is registered at line 146-151 in `initialize()`
   - `checkPersistedSession()` runs AFTER the listener is registered (line 165)
   - So even if visibilitychange fired, `currentSession` wouldn't be set yet

### The Actual Scenario That Fails

1. User starts workout at 10:00 AM
2. User resumes session → `resumeSession()` calls `persistSession()` → `lastUpdated` = 10:00 AM
3. User stays on page until 10:51 AM (51 minutes) WITHOUT switching tabs
4. User refreshes the page
5. `visibilitychange` doesn't fire (it's a same-tab refresh)
6. Page reloads with `lastUpdated` still = 10:00 AM
7. `minutesSinceUpdate` = 51 minutes → should show offcanvas
8. BUT console shows auto-resume happening → implies `lastUpdated` was recently updated somehow

**Wait, if lastUpdated was 51 minutes old, it SHOULD show offcanvas!**

Actually, looking at the console log:
```
💾 Session timestamp updated after resume
```

This happens at line 405 in `resumeSession()`:
```javascript
this.sessionService.persistSession();
console.log('💾 Session timestamp updated after resume');
```

So `resumeSession()` was called (line 304 auto-resume path), which updates `lastUpdated` to NOW after the resume. The stack trace shows `checkPersistedSession @ line 304` calling `resumeSession`.

**The REAL Issue:**

The `lastUpdated` in the persisted session was < 2 minutes old when `checkPersistedSession()` ran. This could happen if:

1. A previous `persistSession()` was called recently (within 2 minutes)
2. Something else updated the session timestamp

Looking at the flow more carefully:
- After FIRST resume, `resumeSession()` calls `persistSession()` at line 399-401
- This updates `lastUpdated` to NOW
- If user stays on page for 51 minutes and then refreshes WITHOUT any `persistSession()` calls in between
- The `lastUpdated` should be 51 minutes old

**But wait - the user may have been DOING things during those 51 minutes!**

Looking at workout-session-service.js, `persistSession()` is called during:
- `autoSaveSession()` 
- Other operations

So if the user was interacting with the workout, `persistSession()` may have been called more recently than when they initially resumed!

## Solution

### The Fix: Use beforeunload to ALWAYS update timestamp before page unload

```javascript
// Replace visibilitychange with beforeunload (or use both)
window.addEventListener('beforeunload', () => {
    // Directly update localStorage without checking isSessionActive()
    const stored = localStorage.getItem('ghost_gym_active_workout_session');
    if (stored) {
        try {
            const sessionData = JSON.parse(stored);
            sessionData.lastUpdated = new Date().toISOString();
            localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
        } catch (e) {
            // Silently fail - not critical
        }
    }
});
```

### Why This Works

| Scenario | beforeunload fires? | Result |
|----------|---------------------|--------|
| Page refresh (F5) | ✅ Yes | `lastUpdated` = NOW, auto-resume if quick |
| Browser close | ✅ Yes | `lastUpdated` = when closed, show offcanvas if > 2 min |
| Navigate away | ✅ Yes | `lastUpdated` = when navigated |
| Tab switch | ❌ No (use visibilitychange) | Handled by visibilitychange |

### Complete Implementation

**In workout-mode-controller.js `initialize()` method (around line 144-151):**

```javascript
// ✅ FIX: Use beforeunload to update session timestamp before page unload
// This works for refresh, close, and navigation - not just tab switching
window.addEventListener('beforeunload', () => {
    // Directly update localStorage - don't check isSessionActive()
    // because currentSession might not be set on fresh page load
    const stored = localStorage.getItem('ghost_gym_active_workout_session');
    if (stored) {
        try {
            const sessionData = JSON.parse(stored);
            sessionData.lastUpdated = new Date().toISOString();
            localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
            console.log('📝 Session timestamp updated before page unload');
        } catch (e) {
            console.warn('⚠️ Failed to update session timestamp on unload:', e);
        }
    }
});

// Keep visibilitychange as additional coverage for tab switching
document.addEventListener('visibilitychange', () => {
    if (document.hidden && this.sessionService.isSessionActive()) {
        console.log('📝 Page hidden - updating session timestamp');
        this.sessionService.persistSession();
    }
});
```

## Files to Modify

1. **`frontend/assets/js/controllers/workout-mode-controller.js`** (lines 144-151)
   - Replace current visibilitychange-only approach with beforeunload + visibilitychange

## Expected Behavior After Fix

| User Action | Time Away | Expected Result |
|------------|-----------|-----------------|
| Quick refresh (F5) | < 2 min | Auto-resume silently |
| Slow refresh | > 2 min | Show "Resume Workout?" offcanvas |
| Close browser | > 2 min | Show "Resume Workout?" offcanvas on return |
| Switch tabs and back | < 2 min | Auto-resume silently |
| Switch tabs and back | > 2 min | Show "Resume Workout?" offcanvas |

## Testing Checklist

- [ ] Start workout, refresh immediately → should auto-resume
- [ ] Start workout, wait 3 minutes, refresh → should show offcanvas
- [ ] Start workout, switch tabs for 1 minute, come back → should auto-resume
- [ ] Start workout, switch tabs for 3 minutes, come back → should show offcanvas
- [ ] Start workout, close browser, return next day → should show offcanvas

## Implementation Status

- [ ] Update workout-mode-controller.js with beforeunload + visibilitychange
- [ ] Test all scenarios
- [ ] Update documentation
