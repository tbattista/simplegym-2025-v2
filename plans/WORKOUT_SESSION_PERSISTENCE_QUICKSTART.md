# Workout Session Persistence - Quick Start Guide

## 🚀 Ready to Implement?

This guide provides a streamlined path to implementing workout session persistence in Ghost Gym. Follow these steps in order for a smooth implementation.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Read [`WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md`](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md)
- ✅ Reviewed [`WORKOUT_SESSION_PERSISTENCE_ARCHITECTURE.md`](WORKOUT_SESSION_PERSISTENCE_ARCHITECTURE.md)
- ✅ Access to the codebase with write permissions
- ✅ Local development environment running
- ✅ Ability to test in multiple browsers

## 🎯 Implementation Order

### Step 1: Add Persistence Methods (30 minutes)

**File**: [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:1)

**Action**: Add four new methods after line 356:

1. `persistSession()` - Save session to localStorage
2. `restoreSession()` - Load session from localStorage
3. `clearPersistedSession()` - Remove session from localStorage
4. `hasPersistedSession()` - Check if session exists

**Code**: See [Implementation Plan - Step 1](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md#step-1-add-persistence-methods-to-workoutsessionservice)

**Test**: 
```javascript
// In browser console
window.workoutSessionService.persistSession();
window.workoutSessionService.restoreSession();
```

### Step 2: Hook Auto-Persist (15 minutes)

**File**: [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:1)

**Action**: Add `this.persistSession()` calls to 5 locations:

1. After [`startSession()`](frontend/assets/js/services/workout-session-service.js:70) - line 70
2. After [`updateExerciseWeight()`](frontend/assets/js/services/workout-session-service.js:262) - line 262
3. After [`autoSaveSession()`](frontend/assets/js/services/workout-session-service.js:174) - line 174
4. After [`completeSession()`](frontend/assets/js/services/workout-session-service.js:125) - line 125 (use `clearPersistedSession()`)
5. In [`clearSession()`](frontend/assets/js/services/workout-session-service.js:315) - line 315 (use `clearPersistedSession()`)

**Code**: See [Implementation Plan - Step 2](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md#step-2-auto-persist-on-session-changes)

**Test**: Start workout, check localStorage in DevTools

### Step 3: Add Restoration Check (10 minutes)

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)

**Action**: Add session check in [`initialize()`](frontend/assets/js/controllers/workout-mode-controller.js:62) method before line 76

**Code**: See [Implementation Plan - Step 3](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md#step-3-add-session-restoration-to-controller)

**Test**: Start workout, refresh page, should see console log about persisted session

### Step 4: Create Resume Prompt (45 minutes)

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)

**Action**: Add two new methods after [`showLoginPrompt()`](frontend/assets/js/controllers/workout-mode-controller.js:1107):

1. `showResumeSessionPrompt(sessionData)` - Display offcanvas with resume options
2. `resumeSession(sessionData)` - Restore session state and continue workout

**Code**: See [Implementation Plan - Step 4](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md#step-4-create-resume-session-prompt)

**Test**: Start workout, refresh page, should see resume prompt

### Step 5: Handle Edge Cases (30 minutes)

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)

**Action**: Modify [`handleStartWorkout()`](frontend/assets/js/controllers/workout-mode-controller.js:839) to check for conflicting sessions

**Code**: See [Implementation Plan - Step 5](WORKOUT_SESSION_PERSISTENCE_IMPLEMENTATION_PLAN.md#step-5-handle-edge-cases)

**Test**: Start workout A, navigate to workout B, try to start - should see confirmation

## ✅ Testing Checklist

After implementation, test these scenarios:

### Basic Flow
```
1. Start workout
2. Enter weight "135 lbs" for Bench Press
3. Refresh page
4. Click "Resume Workout"
5. Verify: Weight shows "135 lbs", timer continues
```

### Timer Accuracy
```
1. Start workout
2. Wait 5 minutes
3. Refresh page
4. Resume workout
5. Verify: Timer shows 5+ minutes
```

### Session Expiration
```
1. Start workout
2. Manually set lastUpdated to 25 hours ago in localStorage
3. Refresh page
4. Verify: No resume prompt, session auto-cleared
```

### Edge Cases
```
1. Start workout A
2. Navigate to workout B
3. Click "Start Workout"
4. Verify: Confirmation prompt appears
```

## 🐛 Common Issues & Solutions

### Issue: "Session not persisting"
**Solution**: Check browser console for localStorage errors. Verify `persistSession()` is being called.

### Issue: "Resume prompt not showing"
**Solution**: Check that `restoreSession()` is called before workout ID check in `initialize()`.

### Issue: "Timer shows wrong time"
**Solution**: Verify `startedAt` is stored as ISO string and parsed correctly on restore.

### Issue: "Weights not restored"
**Solution**: Check that `exercises` object structure matches between persist and restore.

## 📊 Verification Commands

Use these in browser console to verify implementation:

```javascript
// Check if session is persisted
localStorage.getItem('ghost_gym_active_workout_session');

// Parse and view session data
JSON.parse(localStorage.getItem('ghost_gym_active_workout_session'));

// Check service state
window.workoutSessionService.getCurrentSession();

// Manually trigger persistence
window.workoutSessionService.persistSession();

// Manually restore session
window.workoutSessionService.restoreSession();

// Clear session
window.workoutSessionService.clearPersistedSession();
```

## 🎨 UI/UX Validation

Ensure these user experience elements work correctly:

- [ ] Resume prompt shows workout name
- [ ] Elapsed time displays correctly (e.g., "30 minutes ago" or "2h 15m ago")
- [ ] Exercise count shows "X/Y weights set"
- [ ] "Resume Workout" button is primary (blue)
- [ ] "Start Fresh" button is secondary (gray)
- [ ] Success message shows on resume
- [ ] Timer continues from original start time
- [ ] All weights appear in exercise cards
- [ ] Floating timer widget displays correctly

## 📈 Success Criteria

Implementation is complete when:

1. ✅ All 5 code modifications are in place
2. ✅ All basic flow tests pass
3. ✅ Timer accuracy is verified
4. ✅ Session expiration works correctly
5. ✅ Edge cases are handled gracefully
6. ✅ No console errors appear
7. ✅ UI/UX elements display correctly
8. ✅ Works across Chrome, Firefox, Safari

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Code reviewed by team member
- [ ] Tested in multiple browsers
- [ ] Tested on mobile devices
- [ ] localStorage quota handling verified
- [ ] Error handling tested (private browsing, etc.)
- [ ] Documentation updated
- [ ] User guide created

## 📝 Files Modified

This implementation touches only 2 files:

1. **[`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:1)**
   - Add 4 new methods (~80 lines)
   - Add 5 persistence hooks (~5 lines)
   - Total: ~85 lines added

2. **[`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)**
   - Add session check in initialize (~10 lines)
   - Add 2 new methods (~150 lines)
   - Modify handleStartWorkout (~30 lines)
   - Total: ~190 lines added/modified

**Total Impact**: ~275 lines across 2 files

## 🎯 Next Steps

1. **Switch to Code Mode**: Use the `switch_mode` tool to switch to code mode
2. **Start with Step 1**: Implement persistence methods first
3. **Test Each Step**: Verify each step works before moving to next
4. **Iterate**: Fix issues as they arise
5. **Deploy**: Once all tests pass, deploy to production

## 💡 Pro Tips

- **Test frequently**: After each step, test in browser
- **Use console logs**: Add temporary logs to debug issues
- **Check localStorage**: Use DevTools Application tab to inspect
- **Test offline**: Disconnect network to verify offline behavior
- **Clear cache**: Sometimes needed to see changes

## 🆘 Need Help?

If you encounter issues:

1. Check browser console for errors
2. Verify localStorage in DevTools
3. Review implementation plan for details
4. Test in incognito mode (rules out extensions)
5. Check that all code is in correct locations

---

**Ready to implement?** Switch to Code mode and start with Step 1! 🚀

```bash
# Command to switch modes
switch_mode code