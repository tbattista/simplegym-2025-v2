# Phase 2 Skip Functionality - Troubleshooting Guide

## Issue: Skip Button Not Appearing

### Quick Checklist

1. **Hard Refresh the Page**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`
   - This clears cached JavaScript files

2. **Verify Session is Active**
   - The skip button only appears when a workout session is **active**
   - Click "Start Workout" button first
   - The button should appear after starting the session

3. **Check Browser Console**
   - Press `F12` to open Developer Tools
   - Look for any JavaScript errors
   - Check if files are loading correctly

4. **Verify File Changes**
   - Check that [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:79-92) has the skip button code
   - Lines 79-92 should contain the skip/unskip button HTML

### Expected Behavior

**Before Starting Workout:**
- ❌ No skip button visible
- Exercise cards show weight badge only

**After Starting Workout:**
- ✅ Skip button appears (orange outline, skip icon)
- Button is next to weight badge in card header
- Clicking skip button opens skip reason modal

**After Skipping Exercise:**
- ✅ Skip button replaced with "Unskip" button (solid orange)
- Exercise card grayed out with orange left border
- Exercise name has strikethrough and warning icon

### Debug Steps

#### Step 1: Check if Session is Active

Open browser console (`F12`) and run:
```javascript
window.workoutSessionService.isSessionActive()
```

Expected result: `true` (if workout started) or `false` (if not started)

#### Step 2: Check Exercise Weight Data

```javascript
window.workoutSessionService.getExerciseWeight('Bench Press')
```

Expected result: Object with exercise data or `null`

#### Step 3: Verify Controller Methods Exist

```javascript
typeof window.workoutModeController.handleSkipExercise
typeof window.workoutModeController.handleUnskipExercise
```

Expected result: Both should return `"function"`

#### Step 4: Check if Card Renderer is Updated

```javascript
window.ExerciseCardRenderer
```

Expected result: Should show the class definition

#### Step 5: Manual Test

Try manually calling the skip function:
```javascript
window.workoutModeController.handleSkipExercise('Bench Press', 0)
```

This should open the skip reason modal if everything is working.

### Common Issues

#### Issue 1: Cached JavaScript Files
**Symptom:** Old code still running  
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

#### Issue 2: Session Not Started
**Symptom:** Skip button never appears  
**Solution:** Click "Start Workout" button first

#### Issue 3: JavaScript Error
**Symptom:** Button code exists but doesn't render  
**Solution:** Check browser console for errors

#### Issue 4: CSS Not Loaded
**Symptom:** Button appears but looks wrong  
**Solution:** Verify [`workout-mode.css`](frontend/assets/css/workout-mode.css:1-75) has skip button styles

### File Verification

Verify these files have been updated:

1. ✅ [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js)
   - Lines 54-56: Skip state detection
   - Lines 79-92: Skip/unskip buttons

2. ✅ [`frontend/assets/js/components/unified-offcanvas-factory.js`](frontend/assets/js/components/unified-offcanvas-factory.js)
   - Lines 682+: `createSkipExercise()` method

3. ✅ [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js)
   - Lines 349-383: `skipExercise()` and `unskipExercise()` methods

4. ✅ [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js)
   - Lines 1392-1456: `handleSkipExercise()` and `handleUnskipExercise()` methods

5. ✅ [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css)
   - Lines 1-75: Skip button and skipped card styling

### Visual Reference

**Expected Skip Button Location:**
```
┌─────────────────────────────────────────────┐
│ Bench Press              [135 lbs] [Skip]   │ ← Skip button here
│ 3 × 8-12 • Rest: 60s                        │
└─────────────────────────────────────────────┘
```

**Button HTML (from code):**
```html
<button class="btn btn-sm btn-outline-warning skip-exercise-btn"
        onclick="event.stopPropagation(); window.workoutModeController.handleSkipExercise('Bench Press', 0);"
        title="Skip this exercise">
    <i class="bx bx-skip-next"></i>
</button>
```

### Still Not Working?

If the skip button still doesn't appear after:
1. Hard refreshing the page
2. Starting a workout session
3. Checking browser console for errors

Then please provide:
1. Screenshot of the exercise card
2. Browser console output (F12 → Console tab)
3. Result of running the debug commands above
4. Browser and version you're using

This will help identify the specific issue.