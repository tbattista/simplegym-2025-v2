# Workout Library Button State Fix

## Issue
When users clicked on a workout card to edit it, the workout library would collapse but the "Hide Workouts" button would not change to "Show Workouts". This created an inconsistent UI state where the button text didn't match the actual visibility of the library.

## Root Cause
Two different functions were handling the collapse/expand behavior:

1. **`toggleWorkoutLibraryContent()`** (in [`workouts.html`](frontend/workouts.html:824-878))
   - Called by the "Hide Workouts" / "Show Workouts" button
   - Properly toggles content visibility AND updates button text
   - Updates padding and margins for visual consistency

2. **`collapseWorkoutLibrary()`** (in [`workout-editor.js`](frontend/assets/js/components/workout-editor.js:470-503))
   - Called when loading a workout into the editor
   - Only hid the content
   - Did NOT update the button text or state

## Solution
Unified the collapse/expand behavior by making all operations use `toggleWorkoutLibraryContent()` as the single source of truth for library visibility state.

### Changes Made

**File: [`frontend/assets/js/components/workout-editor.js`](frontend/assets/js/components/workout-editor.js)**

#### 1. Updated `loadWorkoutIntoEditor()` (line ~93)
```javascript
// BEFORE:
collapseWorkoutLibrary(workout.name);

// AFTER:
// Collapse workout library using the same function as the button
// This ensures the button state updates correctly
const expandedContent = document.getElementById('workoutLibraryExpandedContent');
if (expandedContent && expandedContent.style.display !== 'none') {
    toggleWorkoutLibraryContent();
}
```

#### 2. Updated `createNewWorkoutInEditor()` (line ~154)
```javascript
// BEFORE:
collapseWorkoutLibrary('New Workout');

// AFTER:
// Collapse workout library using the same function as the button
const expandedContent = document.getElementById('workoutLibraryExpandedContent');
if (expandedContent && expandedContent.style.display !== 'none') {
    toggleWorkoutLibraryContent();
}
```

#### 3. Updated `cancelEditWorkout()` (line ~344)
```javascript
// BEFORE:
expandWorkoutLibrary();

// AFTER:
// Expand workout library using the same function as the button
const expandedContent = document.getElementById('workoutLibraryExpandedContent');
if (expandedContent && expandedContent.style.display === 'none') {
    toggleWorkoutLibraryContent();
}
```

#### 4. Converted Helper Functions to Wrappers (line ~470)
The original `collapseWorkoutLibrary()` and `expandWorkoutLibrary()` functions were converted to wrapper functions that call `toggleWorkoutLibraryContent()`. This maintains backward compatibility while ensuring consistent behavior.

```javascript
/**
 * Collapse workout library after selection
 * Now uses toggleWorkoutLibraryContent() for consistent button state
 * @deprecated Use toggleWorkoutLibraryContent() directly instead
 */
function collapseWorkoutLibrary(workoutName) {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display !== 'none') {
        toggleWorkoutLibraryContent();
    }
}

/**
 * Expand workout library
 * Now uses toggleWorkoutLibraryContent() for consistent button state
 * @deprecated Use toggleWorkoutLibraryContent() directly instead
 */
function expandWorkoutLibrary() {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display === 'none') {
        toggleWorkoutLibraryContent();
    }
}
```

## Benefits

1. **Single Source of Truth**: All collapse/expand operations now go through `toggleWorkoutLibraryContent()`
2. **Consistent Button State**: Button text always matches the actual library visibility state
3. **Minimal Changes**: Only affects the [`workout-editor.js`](frontend/assets/js/components/workout-editor.js) file
4. **Backward Compatible**: Original helper functions still exist as wrappers
5. **No Breaking Changes**: All existing functionality is maintained

## Testing Checklist

To verify the fix works correctly:

- [x] Click a workout card → Library collapses AND button changes to "Show Workouts"
- [x] Click "Show Workouts" button → Library expands AND button changes to "Hide Workouts"
- [x] Click "Hide Workouts" button → Library collapses AND button changes to "Show Workouts"
- [x] Click "New" button → Library collapses AND button changes to "Show Workouts"
- [x] Click "Cancel" in editor → Library expands AND button changes to "Hide Workouts"
- [x] Verify no console errors
- [x] Test button state persistence across multiple workout selections

## Technical Details

### Why Check Display State Before Toggling?

The conditional checks (`if (expandedContent.style.display !== 'none')`) prevent unnecessary toggling:

- When loading a workout, we only collapse if the library is currently expanded
- When canceling, we only expand if the library is currently collapsed
- This prevents the button from toggling twice and ending up in the wrong state

### Function Flow

```
User Action → loadWorkoutIntoEditor() → Check if expanded → toggleWorkoutLibraryContent()
                                                                    ↓
                                                          Updates content visibility
                                                          Updates button text
                                                          Updates padding/margins
```

## Related Files

- [`frontend/workouts.html`](frontend/workouts.html) - Contains the `toggleWorkoutLibraryContent()` function
- [`frontend/assets/js/components/workout-editor.js`](frontend/assets/js/components/workout-editor.js) - Updated to use the unified toggle function
- [`frontend/assets/js/dashboard/views.js`](frontend/assets/js/dashboard/views.js) - Renders workout cards that trigger the editor

## Version
- **Fixed in**: 2025-01-06
- **Affects**: Ghost Gym V0.4.1
- **Component**: Workout Builder / Workout Library