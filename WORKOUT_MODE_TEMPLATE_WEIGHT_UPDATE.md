# Workout Mode - Template Weight Update Feature

## Overview
Automatically updates workout template `default_weight` fields after completing a workout session, ensuring the workout builder always displays the most recent weights used.

## Problem Solved
Previously, when users completed workouts with updated weights, those weights were only saved to session history. When editing the workout template 2 months later, users would see outdated weights from the template instead of their most recent performance.

## Solution
After completing a workout session, the system now:
1. Collects all final weights from the completed session
2. Updates the workout template's `default_weight` and `default_weight_unit` fields
3. Persists changes to both Firestore and localStorage (depending on auth state)

## Implementation Details

### Location
`frontend/assets/js/controllers/workout-mode-controller.js`

### Key Method
```javascript
async updateWorkoutTemplateWeights(exercisesPerformed)
```

### Flow
1. **Workout Completion** → User clicks "Complete Workout"
2. **Session Saved** → `sessionService.completeSession()` saves session to history
3. **Template Updated** → `updateWorkoutTemplateWeights()` updates workout template
4. **Database Persisted** → `dataManager.updateWorkout()` saves to Firestore/localStorage

### Code Changes

#### 1. Modified `showCompleteWorkoutOffcanvas()` (Line 876-879)
```javascript
const exercisesPerformed = this.collectExerciseData();
const completedSession = await this.sessionService.completeSession(exercisesPerformed);

// NEW: Update workout template with final weights
await this.updateWorkoutTemplateWeights(exercisesPerformed);
```

#### 2. Added `updateWorkoutTemplateWeights()` Method (Line 674-741)
- Creates weight map from `exercisesPerformed`
- Updates `exercise_groups[].default_weight` fields
- Updates `bonus_exercises[].default_weight` fields
- Calls `dataManager.updateWorkout()` to persist changes
- Non-blocking: Errors don't prevent workout completion

## Data Flow

### Before (Session History Only)
```
Workout Session → Session History → ✅ Saved
                                   ↓
Workout Template → ❌ Not Updated (shows old weights)
```

### After (Template + History)
```
Workout Session → Session History → ✅ Saved
                ↓
                → Workout Template → ✅ Updated (shows latest weights)
```

## Benefits

### For Users
- ✅ See most recent weights when editing workouts
- ✅ No manual weight updates needed
- ✅ Accurate progression tracking over time
- ✅ Better UX when restructuring workouts months later

### For System
- ✅ Works with both Firestore and localStorage
- ✅ Non-blocking (won't break workout completion)
- ✅ Automatic and transparent
- ✅ Maintains data consistency

## Example Scenario

### Initial Workout Template
```json
{
  "name": "Push Day",
  "exercise_groups": [
    {
      "exercises": { "a": "Bench Press" },
      "sets": "3",
      "reps": "8-12",
      "default_weight": "135",
      "default_weight_unit": "lbs"
    }
  ]
}
```

### After Completing Workout with 155 lbs
```json
{
  "name": "Push Day",
  "exercise_groups": [
    {
      "exercises": { "a": "Bench Press" },
      "sets": "3",
      "reps": "8-12",
      "default_weight": "155",  // ✅ Updated!
      "default_weight_unit": "lbs"
    }
  ]
}
```

### 2 Months Later in Workout Builder
User opens workout to restructure → Sees **155 lbs** (latest weight) instead of 135 lbs (original template weight)

## Error Handling

### Non-Critical Failure
If template update fails:
- ✅ Workout completion still succeeds
- ✅ Session history still saved
- ❌ Template not updated (user can manually edit)
- 📝 Error logged to console

### Reasons for Failure
- Network issues (Firestore mode)
- Permission errors
- Invalid workout data
- Database unavailable

## Testing Checklist

- [ ] Complete workout with updated weights
- [ ] Verify template updated in database
- [ ] Open workout in builder → See latest weights
- [ ] Test with localStorage mode (logged out)
- [ ] Test with Firestore mode (logged in)
- [ ] Test with bonus exercises
- [ ] Test error handling (network offline)
- [ ] Verify session history still works

## Related Files

### Modified
- `frontend/assets/js/controllers/workout-mode-controller.js` - Added template update logic

### Dependencies
- `frontend/assets/js/firebase/data-manager.js` - `updateWorkout()` method
- `frontend/assets/js/services/workout-session-service.js` - `completeSession()` method

## Future Enhancements

### Potential Improvements
1. **Selective Updates** - Only update if weight increased
2. **User Preference** - Toggle to disable auto-updates
3. **Notification** - Show toast when template updated
4. **History Comparison** - Show weight progression in UI
5. **Rollback** - Undo template update if needed

## Version History

- **v1.0.0** (2025-11-16) - Initial implementation
  - Auto-update template weights after workout completion
  - Support for both Firestore and localStorage
  - Non-blocking error handling

## Notes

- Template updates happen **after** session completion
- Updates are **automatic** and require no user action
- Feature works in **both authenticated and anonymous modes**
- Errors are **logged but don't block** workout completion
- Weight format supports **strings** (e.g., "4x45 plates", "BW+25")