# Workout Mode Pre-Session Skip & Replace - Implementation Complete

## Overview

Successfully implemented Skip and Replace functionality for exercise cards **before** starting the workout session. Users can now customize their workout plan by skipping or replacing exercises in the pre-session state, with changes preserved when the workout starts.

## Implementation Summary

### Files Modified (3 files)

#### 1. [`workout-session-service.js`](../frontend/assets/js/services/workout-session-service.js)

**Added pre-session skip storage and methods:**

- **Line 20**: Added `this.preSessionSkips = {}` storage
- **Line 85-90**: Added call to `_applyPreSessionSkips()` in `startSession()`
- **Lines 524-612**: Added new methods:
  - `skipPreSessionExercise(exerciseName, reason)` - Mark exercise for skip
  - `unskipPreSessionExercise(exerciseName)` - Remove skip
  - `isPreSessionSkipped(exerciseName)` - Check if skipped
  - `getPreSessionSkips()` - Get all skips
  - `_applyPreSessionSkips()` - Apply skips when session starts
  - `clearPreSessionSkips()` - Clear all skips

**How it works:**
- Pre-session skips are stored separately in `preSessionSkips` object
- When session starts, skips are applied to `currentSession.exercises`
- After applying, pre-session skips are cleared

#### 2. [`exercise-card-renderer.js`](../frontend/assets/js/components/exercise-card-renderer.js)

**Updated card rendering to support pre-session skips:**

- **Line 71**: Check for pre-session skip state: `const preSessionSkipped = !isSessionActive && this.sessionService.isPreSessionSkipped(mainExercise)`
- **Line 72**: Merge skip states: `const isSkipped = weightData?.is_skipped || preSessionSkipped`
- **Lines 420-467**: Updated `_renderCardActionButtons()` to show:
  - **Pre-session (normal)**: Modify, Replace, Skip buttons
  - **Pre-session (skipped)**: Unskip, Modify buttons
  - **Active session**: Unchanged (existing behavior)

**Visual feedback:**
- Skipped exercises show same visual state in both pre-session and active session
- Greyed out card with warning icon
- Shows skip reason: "Skipped before workout"

#### 3. [`workout-exercise-operations-manager.js`](../frontend/assets/js/services/workout-exercise-operations-manager.js)

**Updated handlers to support pre-session operations:**

- **Lines 30-85**: Updated `handleSkipExercise()`
  - Pre-session: Simple skip without reason prompt
  - Active session: Show skip reason offcanvas (existing)
  
- **Lines 92-140**: Updated `handleUnskipExercise()`
  - Pre-session: Immediate unskip without confirmation
  - Active session: Show confirmation modal (existing)
  
- **Lines 163-217**: Updated `handleReplaceExercise()`
  - Pre-session: Skip + open Add Exercise form
  - Active session: Skip + save + open Add Exercise form (existing)

## User Experience Flow

### Pre-Session Skip Flow

```
1. User views workout (before starting)
2. Expands exercise card
3. Clicks "Skip" button
4. Exercise immediately shows as skipped (no prompt)
5. Card shows "Unskip" button
6. When session starts → skip is applied to active session
```

### Pre-Session Replace Flow

```
1. User views workout (before starting)
2. Expands exercise card
3. Clicks "Replace" button
4. Exercise marked as skipped
5. Add Exercise form opens automatically
6. User selects replacement exercise
7. Replacement added as bonus exercise
```

### Pre-Session Unskip Flow

```
1. User has skipped an exercise
2. Changes mind before starting
3. Clicks "Unskip" button
4. Exercise immediately restored to normal state
```

## Button Layout Comparison

### Pre-Session (Normal State)
```
┌─────────────────────────────────────┐
│ [Modify] [Replace] [Skip]           │
└─────────────────────────────────────┘
```

### Pre-Session (Skipped State)
```
┌─────────────────────────────────────┐
│ [Unskip]                            │
│ [Modify]                            │
└─────────────────────────────────────┘
```

### Active Session (Normal State)
```
┌─────────────────────────────────────┐
│ [Complete]                          │
│ [Modify] [Replace] [Skip]           │
└─────────────────────────────────────┘
```

## Technical Details

### Data Structure

**Pre-session skip object:**
```javascript
preSessionSkips = {
  "Bench Press": {
    is_skipped: true,
    skip_reason: "Skipped before workout",
    skipped_at: "2026-01-09T02:00:00.000Z"
  }
}
```

**Applied to session:**
```javascript
currentSession.exercises["Bench Press"] = {
  ...existingData,
  is_skipped: true,
  skip_reason: "Skipped before workout",
  skipped_at: "2026-01-09T02:00:00.000Z"
}
```

### Lifecycle

1. **Pre-session edits**: Stored in `preSessionEdits`
2. **Pre-session skips**: Stored in `preSessionSkips`
3. **Pre-session order**: Stored in `preSessionOrder`
4. **Session starts**: All pre-session data applied to `currentSession.exercises`
5. **After applying**: Pre-session storage cleared

## Benefits

✅ **Better workout planning**: Users can customize before starting
✅ **Consistent UX**: Same visual feedback in both states
✅ **No lost work**: Pre-session changes preserved when workout starts
✅ **Minimal new code**: Leverages existing infrastructure
✅ **Simple UX**: No unnecessary prompts in pre-session state

## Testing Checklist

- [ ] Pre-session: Skip button appears on normal exercise cards
- [ ] Pre-session: Replace button appears on normal exercise cards
- [ ] Pre-session: Clicking Skip marks exercise with visual state
- [ ] Pre-session: Skipped card shows Unskip and Modify buttons
- [ ] Pre-session: Clicking Unskip restores normal state
- [ ] Pre-session: Clicking Replace marks as skipped + opens Add Exercise
- [ ] Pre-session: Skipped state persists across page refresh
- [ ] Session start: Pre-session skips apply correctly
- [ ] Session start: Skip state transfers to active session
- [ ] Active session: Existing Skip/Unskip/Replace behavior unchanged
- [ ] Mobile: Buttons display correctly on small screens
- [ ] Dark theme: Skipped state styling correct

## Browser Testing

To test this feature:

1. **Navigate to workout mode** without starting the session
2. **Expand an exercise card** - should see Modify, Replace, Skip buttons
3. **Click Skip** - card should show skipped state immediately
4. **Click Unskip** - card should restore to normal
5. **Click Replace** - exercise skipped + Add Exercise form opens
6. **Start the workout** - skipped exercises should remain skipped
7. **Verify active session** - existing functionality should work as before

## Related Files

- Plan: [`WORKOUT_MODE_PRE_SESSION_SKIP_REPLACE_PLAN.md`](./WORKOUT_MODE_PRE_SESSION_SKIP_REPLACE_PLAN.md)
- Service: [`workout-session-service.js`](../frontend/assets/js/services/workout-session-service.js)
- Renderer: [`exercise-card-renderer.js`](../frontend/assets/js/components/exercise-card-renderer.js)
- Operations: [`workout-exercise-operations-manager.js`](../frontend/assets/js/services/workout-exercise-operations-manager.js)

## Implementation Date

**Date**: January 8, 2026
**Version**: 1.0.0
**Status**: ✅ Complete - Ready for Testing
