# Workout Mode: Pre-Session Editing & Exercise Reordering - Phases 1 & 2 Complete

**Date:** 2025-12-23  
**Status:** ✅ Phase 1 & 2 Complete | Phase 3 Pending (Backend Required)  
**Version:** 2.0.0

---

## Executive Summary

Successfully implemented **pre-session workout editing** and **drag-and-drop exercise reordering** for workout-mode.html. Users can now customize their workouts before starting by editing exercise details and changing exercise order. All changes are session-only (except weight, which continues to save to template).

---

## Phase 1: Pre-Session Editing ✅

### What Was Implemented

Users can now **edit exercise details BEFORE starting a workout**:
- Sets, reps, rest time, weight
- Changes stored in memory until workout starts
- Edits apply automatically when session begins
- Edit button now shows on cards before session starts

### Files Modified

#### 1. [`workout-session-service.js`](frontend/assets/js/services/workout-session-service.js)
```javascript
// New properties
this.preSessionEdits = {};  // Store edits before session
this.preSessionOrder = [];  // Store custom order (Phase 2)

// New methods
updatePreSessionExercise(exerciseName, details)  // Save pre-session edit
getPreSessionEdits(exerciseName)                 // Retrieve edit
clearPreSessionEdits()                           // Clear all edits
_applyPreSessionEdits()                          // Apply on session start
```

#### 2. [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js)
- Modified `renderCard()` to display pre-session edits
- Modified `_renderCardActionButtons()` to show Edit button before session
- Data priority: Session > Pre-Session > Template

#### 3. [`workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js)
- Modified `handleEditExercise()` to support pre-session editing
- Added `_getCurrentExerciseData()` helper method
- Smart routing: pre-session → memory, active session → server

### User Flow - Phase 1

**Before Starting Workout:**
1. Load workout → Cards show template defaults
2. Click "Edit" on any exercise
3. Modify sets/reps/rest/weight → Save
4. Card updates immediately with new values
5. Message: "Exercise updated - changes will apply when you start the workout"

**When Starting Workout:**
1. Click "Start Workout"
2. Pre-session edits automatically applied
3. Pre-session storage cleared
4. Workout begins with customized values

---

## Phase 2: Exercise Reordering ✅

### What Was Implemented

Users can now **reorder exercises via drag-and-drop**:
- Drag handle (☰ icon) on each exercise card
- Smooth drag-and-drop with SortableJS
- Visual feedback during drag
- Custom order stored and applied when rendering
- Only works BEFORE session starts (safety feature)

### Files Modified

#### 1. [`workout-mode.html`](frontend/workout-mode.html)
```html
<!-- Added SortableJS library -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
```

#### 2. [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js)
```html
<!-- Added drag handle to card header -->
<div class="exercise-drag-handle" title="Drag to reorder">
    <i class="bx bx-menu"></i>
</div>
```

#### 3. [`workout-session-service.js`](frontend/assets/js/services/workout-session-service.js)
```javascript
// New methods for reordering
setExerciseOrder(exerciseNames)  // Set custom order
getExerciseOrder()               // Get current order
clearExerciseOrder()             // Clear custom order
hasCustomOrder()                 // Check if order exists
```

#### 4. [`workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js)
```javascript
// New methods
initializeSortable()                        // Initialize SortableJS
handleExerciseReorder(oldIndex, newIndex)  // Handle reorder event

// Modified methods
renderWorkout()  // Now applies custom order when rendering
```

#### 5. [`workout-mode.css`](frontend/assets/css/workout-mode.css)
```css
/* New styles for drag-and-drop */
.exercise-drag-handle { ... }      /* Drag handle styling */
.sortable-ghost { ... }             /* Ghost element while dragging */
.sortable-drag { ... }              /* Dragged element */
.sortable-chosen { ... }            /* Chosen/active element */
```

### User Flow - Phase 2

**Reordering Exercises:**
1. Load workout → See drag handles (☰) on left of each card
2. Hover over drag handle → Visual feedback
3. Click and drag exercise card up or down
4. Drop in new position
5. Message: "Exercise order updated - changes will apply when you start the workout"
6. Custom order preserved until page reload

---

## Technical Architecture

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ PRE-SESSION STATE (Before "Start Workout")                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Template → Pre-Session Edits → Display                     │
│  Defaults      + Custom Order     (cards in                 │
│                (in memory)         custom order)             │
│                                                              │
│  User Actions:                                               │
│  • Edit exercise → updatePreSessionExercise()               │
│  • Drag to reorder → setExerciseOrder()                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    [Start Workout]
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE SESSION STATE (After "Start Workout")                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Create session with template defaults                   │
│  2. Apply pre-session edits (_applyPreSessionEdits)         │
│  3. Apply custom order (Phase 3 - needs backend)            │
│  4. Clear pre-session storage                               │
│  5. Session data → Display (in custom order)                │
│                                                              │
│  User clicks "Edit" → Save to session → Auto-save to server │
│  Drag-and-drop DISABLED during session (safety)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### SortableJS Configuration
```javascript
Sortable.create(container, {
    animation: 150,                      // Smooth 150ms animation
    handle: '.exercise-drag-handle',     // Only drag from handle
    ghostClass: 'sortable-ghost',        // Ghost element class
    chosenClass: 'sortable-chosen',      // Active element class
    dragClass: 'sortable-drag',          // Dragging element class
    scroll: true,                        // Auto-scroll enabled
    scrollSensitivity: 60,               // Scroll trigger distance
    scrollSpeed: 10,                     // Scroll speed
    bubbleScroll: true,                  // Scroll parent containers
    
    // SAFETY: Disable during active session
    filter: function(evt, target) {
        return window.workoutModeController.sessionService.isSessionActive();
    },
    
    onEnd: (evt) => {
        // Save new order when drag ends
        if (evt.oldIndex !== evt.newIndex) {
            handleExerciseReorder(evt.oldIndex, evt.newIndex);
        }
    }
});
```

---

## Key Features

### ✅ Phase 1 Features
- **Pre-Session Editing** - Edit any exercise before starting
- **Immediate Visual Feedback** - Cards update instantly
- **Automatic Application** - Edits apply when workout starts
- **Session-Only Changes** - Doesn't modify template (except weight)
- **Smart Data Priority** - Session > Pre-Session > Template

### ✅ Phase 2 Features
- **Drag-and-Drop Reordering** - Smooth, intuitive interface
- **Visual Drag Handle** - Clear affordance (☰ icon)
- **Drag Feedback** - Ghost, chosen, and drag states
- **Auto-Scroll** - Scrolls automatically when dragging to edge
- **Safety Lock** - Disabled during active session
- **Custom Order Preservation** - Remembers order until reload

---

## Phase 3: Save Order to History (Pending - Backend Required)

### What's Needed

To save custom exercise order to workout history and retrieve it on next session:

#### Backend API Changes Required

1. **Modify `/api/v3/workout-sessions/{id}/complete` endpoint**
   - Accept `exercise_order` field in request body
   - Store order array in session document
   
2. **Modify workout session document schema**
   ```python
   # Add to workout session document
   exercise_order: List[str]  # Ordered list of exercise names
   ```

3. **Modify `/api/v3/workout-sessions/history/workout/{id}` endpoint**
   - Return `exercise_order` from last session
   - Frontend can use this to pre-populate order

#### Frontend Changes Required (After Backend)

1. **Update `collectExerciseData()` in controller**
   ```javascript
   // Include order in session data
   const exerciseOrder = this.sessionService.getExerciseOrder();
   if (exerciseOrder.length > 0) {
       sessionData.exercise_order = exerciseOrder;
   }
   ```

2. **Update `completeSession()` in session service**
   ```javascript
   body: JSON.stringify({
       completed_at: new Date().toISOString(),
       exercises_performed: exercisesPerformed,
       exercise_order: this.getExerciseOrder(),  // NEW
       notes: ''
   })
   ```

3. **Update `fetchExerciseHistory()` in session service**
   ```javascript
   // Extract and apply last session's order
   if (historyData.last_exercise_order) {
       this.setExerciseOrder(historyData.last_exercise_order);
   }
   ```

### Phase 3 Benefits
- Custom order persists across sessions
- Last session's order auto-applies to next workout
- User can still re-order if desired
- History tracks how user evolved their workout structure

---

## Files Modified Summary

### Phase 1
1. ✅ `frontend/assets/js/services/workout-session-service.js` - Pre-session storage
2. ✅ `frontend/assets/js/components/exercise-card-renderer.js` - Edit button always visible
3. ✅ `frontend/assets/js/controllers/workout-mode-controller.js` - Pre-session edit handling

### Phase 2
4. ✅ `frontend/workout-mode.html` - SortableJS library
5. ✅ `frontend/assets/js/components/exercise-card-renderer.js` - Drag handle UI
6. ✅ `frontend/assets/js/services/workout-session-service.js` - Order methods
7. ✅ `frontend/assets/js/controllers/workout-mode-controller.js` - Sortable init + order handling
8. ✅ `frontend/assets/css/workout-mode.css` - Drag-and-drop styles

### Phase 3 (Pending)
9. ⏳ `backend/api/workout_sessions.py` - Accept/store order
10. ⏳ `frontend/assets/js/controllers/workout-mode-controller.js` - Send order on completion
11. ⏳ `frontend/assets/js/services/workout-session-service.js` - Retrieve/apply last order

---

## Testing Checklist

### ✅ Phase 1 - Pre-Session Editing
- [x] Edit button shows before workout starts
- [x] Clicking Edit opens offcanvas with current values
- [x] Saving edits updates card display immediately
- [x] Multiple exercises can be edited
- [x] Edits persist across card collapses/expansions
- [x] Success message shows for pre-session edits
- [x] Pre-session edits apply when workout starts
- [x] Edited values show in active session
- [x] Pre-session storage cleared after applying
- [x] Template defaults used for non-edited exercises

### ✅ Phase 2 - Exercise Reordering
- [x] Drag handles (☰) visible on all cards
- [x] Hover feedback on drag handles
- [x] Smooth drag-and-drop animation
- [x] Ghost element shows during drag
- [x] Custom order saves when drag ends
- [x] Success message shows after reorder
- [x] Custom order applies when rendering
- [x] Order persists across re-renders
- [x] Drag disabled during active session
- [x] Auto-scroll works when dragging to edges

### ⏳ Phase 3 - Save to History (Pending Backend)
- [ ] Order saves to backend on completion
- [ ] Last session's order retrieved on load
- [ ] Order auto-applies to next session
- [ ] User can override retrieved order
- [ ] History shows custom order

---

## Known Limitations

### Current (Phases 1 & 2)
1. **Session-only changes** - Edits don't save to template (by design)
2. **Weight still saves to template** - Existing behavior preserved
3. **Order not persisted** - Resets on page reload (Phase 3 needed)
4. **No session-time reordering** - Can only reorder before starting (safety)
5. **No undo** - Can't undo reorder (refresh page to reset)

### Future Enhancements
1. **Save-to-template toggle** - Option to save all changes to template
2. **Session-time reordering** - Enable drag during active session
3. **Undo/redo** - Reorder history with undo functionality
4. **Reorder animation** - Smoother transitions when applying order
5. **Bulk actions** - Multi-select and move multiple exercises

---

## Code Examples

### Pre-Session Edit Flow
```javascript
// User edits "Bench Press" before starting
controller.handleEditExercise('Bench Press', 0);
  ↓
// Controller saves to pre-session storage
sessionService.updatePreSessionExercise('Bench Press', {
    sets: '4',
    reps: '10',
    rest: '90s',
    weight: '185',
    weightUnit: 'lbs'
});
  ↓
// When user starts workout
sessionService.startSession(...);
  ↓
// Edits automatically applied
sessionService._applyPreSessionEdits();
```

### Exercise Reorder Flow
```javascript
// User drags "Squats" from index 2 to index 0
SortableJS.onEnd → controller.handleExerciseReorder(2, 0);
  ↓
// Controller gets new order from DOM
const cards = document.querySelectorAll('.exercise-card');
const names = Array.from(cards).map(card => card.dataset.exerciseName);
// names = ['Squats', 'Bench Press', 'Deadlift', ...]
  ↓
// Save to session service
sessionService.setExerciseOrder(names);
  ↓
// On next render, order is applied
controller.renderWorkout();
  ↓
// Cards render in custom order
```

---

## Performance Considerations

- **SortableJS lightweight** - ~8KB minified
- **Minimal DOM manipulation** - Only re-renders after drag end
- **CSS transitions** - Hardware-accelerated animations
- **Debounced feedback** - No lag during drag
- **Memory efficient** - Order stored as simple array

---

## Accessibility

- **Keyboard accessible** - Drag handles can be focused
- **Focus indicators** - Clear outline on handle focus
- **Screen reader friendly** - Semantic HTML structure
- **Reduced motion** - Respects `prefers-reduced-motion`
- **High contrast** - Border thickness increases in high contrast mode

---

## Browser Compatibility

- **Modern browsers** - Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile responsive** - Touch-enabled drag on mobile devices
- **Fallback** - Graceful degradation if SortableJS fails to load

---

## Success Metrics

✅ **Phase 1 Complete**
- Users can edit exercises before starting
- Edits display immediately
- Edits apply automatically on start
- No breaking changes

✅ **Phase 2 Complete**
- Users can reorder exercises via drag-and-drop
- Smooth, intuitive interface
- Visual feedback during interaction
- Custom order preserved during session

⏳ **Phase 3 Pending**
- Requires backend modifications
- Will enable persistent custom order across sessions

---

## Next Steps

1. **Test Phases 1 & 2** - User acceptance testing
2. **Backend API Updates** - Implement Phase 3 backend changes
3. **Complete Phase 3** - Connect frontend to new backend endpoints
4. **Future Enhancements** - Save-to-template toggle, session-time reordering

---

**Status: Phases 1 & 2 COMPLETE ✅ | Phase 3 PENDING (Backend Required) ⏳**

Ready for user testing and Phase 3 implementation when backend team is available.
