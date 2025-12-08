# Bonus Exercise Search Fix - Workout Mode

## Issue
When clicking "Add Exercise" in workout mode, the offcanvas opens but shows "No exercises found" or an empty list. The search functionality doesn't work because exercises aren't being loaded.

## Root Cause
In `frontend/assets/js/components/unified-offcanvas-factory.js`, the `createBonusExercise` method calls a non-existent method on the exercise cache service:

**Line 718:**
```javascript
await window.exerciseCacheService.ensureInitialized();
```

The `ExerciseCacheService` class doesn't have an `ensureInitialized()` method. The correct method is `loadExercises()`.

## Impact
- Exercises array remains empty (`state.allExercises = []`)
- Search filtering operates on empty array
- Users see "No exercises found" regardless of search query
- Filter chips don't work because there's no data to filter

## Solution

### File: `frontend/assets/js/components/unified-offcanvas-factory.js`

**Change line 718 from:**
```javascript
await window.exerciseCacheService.ensureInitialized();
```

**To:**
```javascript
await window.exerciseCacheService.loadExercises();
```

This will properly load exercises from the cache service before attempting to display them.

## Testing Checklist
After applying the fix:

1. ✅ Open workout mode page
2. ✅ Click "Add Exercise" button (bonus exercise)
3. ✅ Verify offcanvas opens and shows loading state
4. ✅ Verify exercises load and display in the list
5. ✅ Test search functionality:
   - Type "bench" → should show bench press exercises
   - Type "squat" → should show squat variations
   - Type "curl" → should show curl exercises
6. ✅ Test filter chips:
   - Click "Chest" → should filter to chest exercises
   - Click "Legs" → should filter to leg exercises
   - Click "All" → should show all exercises
7. ✅ Test combined search + filter:
   - Select "Chest" filter
   - Type "press" in search
   - Should show only chest press exercises
8. ✅ Test clear button:
   - Type in search box
   - Click X button
   - Search should clear and show all exercises
9. ✅ Test exercise selection:
   - Click an exercise from the list
   - Verify it's added to the workout
   - Verify offcanvas closes

## Additional Notes

### Why This Happened
The code was likely copied from another component that had a custom `ensureInitialized()` wrapper method, but the `ExerciseCacheService` uses the standard `loadExercises()` method instead.

### Related Code
- Exercise cache service: `frontend/assets/js/services/exercise-cache-service.js`
- Bonus exercise offcanvas: `frontend/assets/js/components/unified-offcanvas-factory.js` (lines 615-918)
- Workout mode controller: `frontend/assets/js/controllers/workout-mode-controller.js` (lines 1078-1112)

### Performance Impact
The `loadExercises()` method includes smart caching:
- First call: Loads from API or localStorage cache
- Subsequent calls: Returns cached data immediately
- No performance degradation from this fix

## Implementation Priority
🔴 **HIGH** - This breaks core functionality (adding exercises during workout)