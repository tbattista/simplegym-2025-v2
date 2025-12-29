# Weight Progression Indicator Implementation Plan

## Feature Summary

Replace the current +5/-5 weight adjustment buttons with **Up/Down weight progression indicators**. Users can mark during a workout whether they should increase or decrease weight for their next session. This indicator persists to Firestore and displays on the next workout as a helpful reminder.

---

## User Flow

### During Workout
1. User opens exercise card during active workout session
2. Instead of +5/-5 buttons, they see Up ⬆️ / Down ⬇️ toggle buttons
3. User taps "Up" to indicate they should increase weight next time
4. Button becomes "filled" state showing selection
5. Tapping same button again clears the selection (toggle behavior)
6. Indicator saves automatically with session auto-save

### On Next Workout Session
1. User loads same workout for new session
2. Exercise card shows badge/indicator if previous session had direction set
3. Example: "⬆️ Increase weight" subtitle or icon on card header
4. User can acknowledge/clear the indicator when they update weight
5. Starting new session clears old indicators from display

---

## Technical Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CURRENT SESSION                              │
├─────────────────────────────────────────────────────────────────────┤
│  User taps Up/Down button                                           │
│         ↓                                                            │
│  setWeightDirection in sessionService                               │
│         ↓                                                            │
│  Updates currentSession.exercises[name].next_weight_direction       │
│         ↓                                                            │
│  Auto-save triggers → PUT /api/v3/workout-sessions/{id}             │
│         ↓                                                            │
│  Firestore: exercises_performed[n].next_weight_direction saved      │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    Session Completes
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         EXERCISE HISTORY                             │
├─────────────────────────────────────────────────────────────────────┤
│  completeSession() processes exercises_performed                    │
│         ↓                                                            │
│  For each exercise with next_weight_direction:                      │
│  → Update exercise_history[exercise_name].last_weight_direction     │
│         ↓                                                            │
│  Firestore: users/{uid}/exercise_history/{exerciseName}             │
│  → last_weight_direction: up or down or null                        │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    Next Workout Loads
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXT SESSION                                 │
├─────────────────────────────────────────────────────────────────────┤
│  fetchExerciseHistory() loads exercise history                      │
│         ↓                                                            │
│  ExerciseCardRenderer reads last_weight_direction                   │
│         ↓                                                            │
│  Displays indicator badge on card:                                  │
│  ⬆️ Increase weight or ⬇️ Decrease weight                          │
│         ↓                                                            │
│  User updates weight, indicator auto-clears on first edit           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Backend Schema Update
**File: `backend/models.py`**

Add `next_weight_direction` field to `ExercisePerformance` model:

```python
class ExercisePerformance(BaseModel):
    # ... existing fields ...
    
    # Weight Progression Indicator (Phase 1)
    next_weight_direction: Optional[str] = Field(
        None, 
        description="User intent for next session: 'up', 'down', or null"
    )
```

Add `last_weight_direction` field to `ExerciseHistory` model:

```python
class ExerciseHistory(BaseModel):
    # ... existing fields ...
    
    # Weight Progression from last session
    last_weight_direction: Optional[str] = Field(
        None,
        description="Weight direction from last session: 'up', 'down', or null"
    )
```

**No API endpoint changes needed** - existing update and complete endpoints will handle the new fields automatically through Pydantic model.

---

### Phase 2: Frontend Session Service
**File: `frontend/assets/js/services/workout-session-service.js`**

Add methods to manage weight direction:

```javascript
/**
 * Set weight direction indicator for an exercise
 * @param {string} exerciseName - Exercise name
 * @param {string|null} direction - 'up', 'down', or null to clear
 */
setWeightDirection(exerciseName, direction) {
    if (!this.currentSession?.exercises) {
        console.warn('⚠️ No active session to set weight direction');
        return;
    }
    
    const validDirections = ['up', 'down', null];
    if (!validDirections.includes(direction)) {
        console.error('❌ Invalid weight direction:', direction);
        return;
    }
    
    const existingData = this.currentSession.exercises[exerciseName] || {};
    this.currentSession.exercises[exerciseName] = {
        ...existingData,
        next_weight_direction: direction,
        direction_set_at: direction ? new Date().toISOString() : null
    };
    
    console.log(`${direction === 'up' ? '⬆️' : direction === 'down' ? '⬇️' : '⏹️'} Weight direction set for ${exerciseName}: ${direction || 'cleared'}`);
    this.notifyListeners('weightDirectionUpdated', { exerciseName, direction });
    this.persistSession();
}

/**
 * Get weight direction for an exercise
 * @param {string} exerciseName - Exercise name
 * @returns {string|null} 'up', 'down', or null
 */
getWeightDirection(exerciseName) {
    return this.currentSession?.exercises?.[exerciseName]?.next_weight_direction || null;
}

/**
 * Get last weight direction from history (for display on load)
 * @param {string} exerciseName - Exercise name
 * @returns {string|null} 'up', 'down', or null
 */
getLastWeightDirection(exerciseName) {
    return this.exerciseHistory?.[exerciseName]?.last_weight_direction || null;
}
```

Update `collectExerciseData()` to include `next_weight_direction`:

```javascript
// In collectExerciseData(), add to each exercise object:
next_weight_direction: exerciseData?.next_weight_direction || null
```

---

### Phase 3: Card Renderer Update
**File: `frontend/assets/js/components/exercise-card-renderer.js`**

Replace +5/-5 buttons with direction toggle buttons in the weight section:

**Before (lines 134-149):**
```html
<div class="btn-group btn-group-sm" role="group">
    <button class="btn btn-outline-secondary weight-adjust-btn"
            data-exercise-name="${exerciseName}"
            data-adjustment="-5"
            onclick="window.workoutModeController.handleWeightAdjust(this);">
        <span>-5</span>
    </button>
    <button class="btn btn-outline-secondary weight-adjust-btn"
            data-exercise-name="${exerciseName}"
            data-adjustment="5"
            onclick="window.workoutModeController.handleWeightAdjust(this);">
        <span>+5</span>
    </button>
</div>
```

**After:**
```html
<div class="btn-group btn-group-sm weight-direction-group" role="group">
    <button class="btn weight-direction-btn ${currentDirection === 'down' ? 'active' : 'btn-outline-secondary'}"
            data-exercise-name="${exerciseName}"
            data-direction="down"
            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
            title="Decrease weight next time">
        <i class="bx bx-chevron-down"></i>
    </button>
    <button class="btn weight-direction-btn ${currentDirection === 'up' ? 'active' : 'btn-outline-secondary'}"
            data-exercise-name="${exerciseName}"
            data-direction="up"
            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
            title="Increase weight next time">
        <i class="bx bx-chevron-up"></i>
    </button>
</div>
```

Add direction indicator badge to card header when history shows pending direction:

```javascript
// In renderCard(), after getting history:
const lastDirection = this.sessionService.getLastWeightDirection(mainExercise);
const directionBadge = lastDirection 
    ? `<span class="badge bg-label-${lastDirection === 'up' ? 'success' : 'warning'} ms-2" title="From last session">
         <i class="bx bx-chevron-${lastDirection}"></i> ${lastDirection === 'up' ? 'Increase' : 'Decrease'} weight
       </span>` 
    : '';

// Add to card header after exercise name
```

---

### Phase 4: Controller Update
**File: `frontend/assets/js/controllers/workout-mode-controller.js`**

Replace `handleWeightAdjust()` with `handleWeightDirection()`:

```javascript
/**
 * Handle weight direction indicator toggle
 * @param {HTMLElement} button - The direction button that was clicked
 */
handleWeightDirection(button) {
    const exerciseName = button.getAttribute('data-exercise-name');
    const direction = button.getAttribute('data-direction');
    
    if (!this.sessionService.isSessionActive()) {
        if (window.showAlert) {
            window.showAlert('Start your workout to set weight direction', 'warning');
        }
        return;
    }
    
    // Toggle behavior: if already set to this direction, clear it
    const currentDirection = this.sessionService.getWeightDirection(exerciseName);
    const newDirection = currentDirection === direction ? null : direction;
    
    console.log(`🎯 Weight direction for ${exerciseName}: ${currentDirection} → ${newDirection}`);
    
    // Update session service
    this.sessionService.setWeightDirection(exerciseName, newDirection);
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(newDirection ? 15 : 5);
    }
    
    // Auto-save
    this.autoSave(null).catch(error => {
        console.error('❌ Failed to auto-save after direction change:', error);
    });
    
    // Re-render to update button states
    this.renderWorkout();
    
    // Show feedback
    if (window.showAlert && newDirection) {
        const message = newDirection === 'up' 
            ? `${exerciseName}: ⬆️ Increase weight next time`
            : `${exerciseName}: ⬇️ Decrease weight next time`;
        window.showAlert(message, 'info');
    }
}
```

---

### Phase 5: Backend History Update
**File: `backend/services/firestore_data_service.py`**

Update `_update_exercise_histories()` to save weight direction:

```python
async def _update_exercise_histories(self, user_id: str, session):
    """Update exercise history documents after session completion"""
    try:
        for exercise in session.exercises_performed:
            session_data = {
                # ... existing fields ...
                'last_weight_direction': exercise.next_weight_direction  # NEW
            }
            
            # Update or create history document
            # ... existing code ...
```

---

### Phase 6: CSS Styling
**File: `frontend/assets/css/workout-mode.css`**

Add styles for direction buttons:

```css
/* Weight Direction Buttons */
.weight-direction-group {
    display: flex;
    gap: 0.25rem;
}

.weight-direction-btn {
    padding: 0.375rem 0.625rem;
    font-size: 1rem;
    border-radius: 0.375rem !important;
    transition: all 0.15s ease-in-out;
}

.weight-direction-btn:hover {
    transform: scale(1.05);
}

.weight-direction-btn.active {
    background-color: var(--bs-primary) !important;
    border-color: var(--bs-primary) !important;
    color: white !important;
}

.weight-direction-btn[data-direction="up"].active {
    background-color: var(--bs-success) !important;
    border-color: var(--bs-success) !important;
}

.weight-direction-btn[data-direction="down"].active {
    background-color: var(--bs-warning) !important;
    border-color: var(--bs-warning) !important;
}

/* Direction Indicator Badge in Card Header */
.weight-direction-indicator {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    animation: pulse-subtle 2s infinite;
}

@keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/models.py` | Add `next_weight_direction` to ExercisePerformance, `last_weight_direction` to ExerciseHistory |
| `backend/services/firestore_data_service.py` | Update `_update_exercise_histories()` to save direction |
| `frontend/assets/js/services/workout-session-service.js` | Add `setWeightDirection()`, `getWeightDirection()`, `getLastWeightDirection()` |
| `frontend/assets/js/components/exercise-card-renderer.js` | Replace +5/-5 with direction buttons, add history badge |
| `frontend/assets/js/controllers/workout-mode-controller.js` | Replace `handleWeightAdjust()` with `handleWeightDirection()` |
| `frontend/assets/css/workout-mode.css` | Add direction button and badge styles |

---

## Testing Checklist

### Unit Tests
- [ ] `setWeightDirection()` correctly updates session
- [ ] `getWeightDirection()` returns current direction
- [ ] `getLastWeightDirection()` reads from history
- [ ] Direction included in `collectExerciseData()`
- [ ] Toggle behavior: same button clears direction

### Integration Tests
- [ ] Direction saves during auto-save
- [ ] Direction persists after session complete
- [ ] Direction appears on next workout load
- [ ] Direction clears when weight is modified
- [ ] Works for regular and bonus exercises

### UI Tests
- [ ] Buttons render correctly (Up/Down icons)
- [ ] Active state shows filled button
- [ ] Haptic feedback on mobile
- [ ] Badge appears in card header
- [ ] Animation draws attention without being annoying

---

## Migration Notes

- **No database migration needed** - Firestore is schemaless, new fields will simply be null for existing sessions
- **Backwards compatible** - Old sessions without direction will work normally
- **Gradual rollout** - Feature will only show indicators after first use

---

## Future Enhancements

1. **Smart Suggestions**: Auto-suggest direction based on completed reps vs target
2. **Trend Analysis**: Show weight trend over last 5 sessions
3. **Coach Mode**: Trainer can set direction for clients
4. **Bulk Direction**: Set same direction for similar exercises

---

## Summary

This feature replaces the quick weight adjustment buttons with a more meaningful "progression indicator" that helps users track their intent for the next workout. The implementation follows existing patterns:

- Uses existing session auto-save mechanism
- Matches ExercisePerformance model extension pattern
- Follows card renderer HTML structure
- Integrates with exercise history system

The change is surgical and focused:
- **Remove**: +5/-5 buttons and `handleWeightAdjust()`
- **Add**: Up/Down toggle buttons and `handleWeightDirection()`
- **Extend**: ExercisePerformance and ExerciseHistory models
- **Display**: Badge on card header when history has pending direction
