# Workout Mode: Pre-Session Editing and Exercise Reordering

## Overview

This plan implements two major features for the workout mode page:

1. **Pre-Session Editing** - Allow users to edit workout details (sets, reps, rest, weight) BEFORE starting a workout session
2. **Exercise Reordering** - Drag-and-drop functionality to reorder exercises for the current session

## Current State Analysis

### Existing Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         workout-mode.html                               │
├─────────────────────────────────────────────────────────────────────────┤
│  workout-mode-controller.js     workout-session-service.js              │
│  ├── loadWorkout()              ├── currentSession                      │
│  ├── renderWorkout()            ├── preWorkoutBonusExercises            │
│  ├── handleStartWorkout()       ├── updateExerciseWeight()              │
│  ├── handleEditExercise()       ├── updateExerciseDetails()             │
│  └── handleCompleteWorkout()    └── persistSession()                    │
├─────────────────────────────────────────────────────────────────────────┤
│  exercise-card-renderer.js                                              │
│  ├── renderCard()                                                       │
│  ├── _renderCardActionButtons() ← Only shows when isSessionActive=true  │
│  └── _renderWeightBadge()                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Current Behavior

| Feature | Before Session | During Session | After Completion |
|---------|----------------|----------------|------------------|
| Edit Weight | ✅ Works via weight button | ✅ Works | ✅ Saves to template |
| Edit Sets/Reps/Rest | ❌ Buttons hidden | ✅ Works | ❌ Session-only |
| Skip Exercise | ❌ N/A | ✅ Works | N/A |
| Reorder Exercises | ❌ Not available | ❌ Not available | ❌ Not available |

### Target Behavior

| Feature | Before Session | During Session | After Completion |
|---------|----------------|----------------|------------------|
| Edit Weight | ✅ Works | ✅ Works | ✅ Saves to template |
| Edit Sets/Reps/Rest | ✅ **NEW** | ✅ Works | ✅ Session-only* |
| Skip Exercise | ❌ N/A | ✅ Works | N/A |
| Reorder Exercises | ✅ **NEW** | ✅ **NEW** | ✅ Saves to history* |

*Future toggle will allow saving to template

---

## Feature 1: Pre-Session Editing

### Concept

Create a "pre-session state" where users can modify workout details before officially starting the session. Changes are stored temporarily and applied when the session starts.

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WORKOUT TEMPLATE ─────┐                                                 │
│  (from Firebase)       │                                                 │
│                        ▼                                                 │
│                ┌───────────────┐                                         │
│                │ Render Cards  │                                         │
│                │  (initial)    │                                         │
│                └───────┬───────┘                                         │
│                        │                                                 │
│                        ▼                                                 │
│        ┌───────────────────────────────┐                                 │
│        │      PRE-SESSION STATE        │  ◄─── NEW: preSessionEdits {}   │
│        │  (before Start Workout btn)   │                                 │
│        ├───────────────────────────────┤                                 │
│        │  User edits:                  │                                 │
│        │  - Sets, Reps, Rest           │                                 │
│        │  - Weight (already works)     │                                 │
│        │  - Reorder exercises          │                                 │
│        └───────────────┬───────────────┘                                 │
│                        │                                                 │
│                        ▼  [Start Workout clicked]                        │
│        ┌───────────────────────────────┐                                 │
│        │    startSession() called      │                                 │
│        │   Pre-session edits merged    │                                 │
│        │     into session.exercises    │                                 │
│        └───────────────┬───────────────┘                                 │
│                        │                                                 │
│                        ▼                                                 │
│        ┌───────────────────────────────┐                                 │
│        │      ACTIVE SESSION           │                                 │
│        │  (current behavior)           │                                 │
│        └───────────────┬───────────────┘                                 │
│                        │                                                 │
│                        ▼  [Complete Workout]                             │
│        ┌───────────────────────────────┐                                 │
│        │    SAVE TO HISTORY            │                                 │
│        │  - Weight → Template ✓        │                                 │
│        │  - Sets/Reps/Rest → History   │                                 │
│        │  - Order → History            │                                 │
│        │  - Future: Toggle for all     │                                 │
│        └───────────────────────────────┘                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Implementation Tasks

#### 1. Add Pre-Session Storage (workout-session-service.js)

```javascript
// NEW: Add pre-session edits storage
class WorkoutSessionService {
    constructor() {
        // ... existing code ...
        this.preSessionEdits = {};  // NEW: Store edits before session starts
        this.preSessionOrder = [];  // NEW: Store exercise order changes
    }
    
    // NEW: Update pre-session exercise details
    updatePreSessionExercise(exerciseName, details) {
        this.preSessionEdits[exerciseName] = {
            ...(this.preSessionEdits[exerciseName] || {}),
            ...details,
            modified_at: new Date().toISOString()
        };
        this.notifyListeners('preSessionEditUpdated', { exerciseName, details });
    }
    
    // NEW: Get pre-session edits for an exercise
    getPreSessionEdits(exerciseName) {
        return this.preSessionEdits[exerciseName] || null;
    }
    
    // MODIFY: startSession() to apply pre-session edits
    async startSession(workoutId, workoutName, workoutData = null) {
        // ... existing session creation code ...
        
        // Apply pre-session edits to session exercises
        this._applyPreSessionEdits();
        
        // Apply pre-session order
        this._applyPreSessionOrder();
        
        // Clear pre-session storage
        this.preSessionEdits = {};
        this.preSessionOrder = [];
    }
}
```

#### 2. Update Card Renderer (exercise-card-renderer.js)

```javascript
// MODIFY: Show edit controls before session starts
_renderCardActionButtons(exerciseName, index, isSkipped, isCompleted, isSessionActive) {
    // NEW: Always show Edit button, but hide Skip/Complete before session
    const editButton = `
        <button class="btn btn-sm btn-outline-primary flex-fill"
                onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                title="Edit exercise details">
            <i class="bx bx-edit me-1"></i>Edit
        </button>
    `;
    
    if (!isSessionActive) {
        // Pre-session: Only show Edit button
        return `
            <div class="card-action-buttons mt-3 pt-3 border-top d-flex gap-2">
                ${editButton}
            </div>
        `;
    }
    
    // During session: Show all buttons (existing behavior)
    // ... existing code ...
}
```

#### 3. Update Controller (workout-mode-controller.js)

```javascript
// MODIFY: handleEditExercise to work before session starts
handleEditExercise(exerciseName, index) {
    const isSessionActive = this.sessionService.isSessionActive();
    
    // Get current data (from session if active, otherwise from pre-session or template)
    const currentData = this._getCurrentExerciseData(exerciseName, index);
    
    window.UnifiedOffcanvasFactory.createExerciseDetailsEditor(
        currentData,
        async (updatedData) => {
            if (isSessionActive) {
                // Existing behavior: update session
                this.sessionService.updateExerciseDetails(exerciseName, updatedData);
            } else {
                // NEW: Store in pre-session edits
                this.sessionService.updatePreSessionExercise(exerciseName, updatedData);
            }
            
            // Re-render to show updated values
            this.renderWorkout();
        }
    );
}

// NEW: Helper to get current exercise data from any source
_getCurrentExerciseData(exerciseName, index) {
    // Priority: Session > Pre-Session > Template
    const sessionData = this.sessionService.getExerciseWeight(exerciseName);
    const preSessionData = this.sessionService.getPreSessionEdits(exerciseName);
    const templateData = this.getExerciseGroupByIndex(index);
    
    return {
        exerciseName,
        sets: sessionData?.target_sets || preSessionData?.sets || templateData?.sets || '3',
        reps: sessionData?.target_reps || preSessionData?.reps || templateData?.reps || '8-12',
        rest: sessionData?.rest || preSessionData?.rest || templateData?.rest || '60s',
        weight: sessionData?.weight || preSessionData?.weight || templateData?.default_weight || '',
        weightUnit: sessionData?.weight_unit || preSessionData?.weightUnit || templateData?.default_weight_unit || 'lbs'
    };
}
```

---

## Feature 2: Exercise Reordering

### Concept

Add drag-and-drop functionality to reorder exercises. The new order is:
- Stored in session state
- Applied to workout display immediately
- Saved to workout history when session completes

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ⋮⋮  Bench Press                         135 lbs    ▼          │
│  ⋮⋮  3 sets × 8-12 reps • 90s                                  │
├─────────────────────────────────────────────────────────────────┤
│      ↕ DRAG INDICATOR (visible on hover/touch)                 │
├─────────────────────────────────────────────────────────────────┤
│  ⋮⋮  Incline Dumbbell Press              50 lbs     ▼          │
│  ⋮⋮  3 sets × 10-12 reps • 60s                                 │
└─────────────────────────────────────────────────────────────────┘
        ▲
        │
   Drag handle (⋮⋮) on left side of card header
```

### Implementation Tasks

#### 1. Add Drag-and-Drop Library

Use SortableJS (lightweight, touch-friendly, no jQuery dependency):

```html
<!-- Add to workout-mode.html -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
```

#### 2. Add Reorder State (workout-session-service.js)

```javascript
class WorkoutSessionService {
    constructor() {
        // ... existing code ...
        this.exerciseOrder = [];  // NEW: Current exercise order
    }
    
    // NEW: Update exercise order
    updateExerciseOrder(newOrder) {
        this.exerciseOrder = newOrder;
        this.notifyListeners('exerciseOrderChanged', { order: newOrder });
        this.persistSession();  // Persist to localStorage
    }
    
    // NEW: Get current exercise order
    getExerciseOrder() {
        return this.exerciseOrder;
    }
    
    // NEW: Initialize order from workout template
    initializeExerciseOrder(exerciseGroups, bonusExercises = []) {
        this.exerciseOrder = [
            ...exerciseGroups.map((g, i) => ({
                name: g.exercises?.a,
                originalIndex: i,
                isBonus: false
            })),
            ...bonusExercises.map((b, i) => ({
                name: b.name,
                originalIndex: exerciseGroups.length + i,
                isBonus: true
            }))
        ];
    }
}
```

#### 3. Add Drag Handle to Cards (exercise-card-renderer.js)

```javascript
renderCard(group, index, isBonus = false, totalCards = 0) {
    // ... existing code ...
    
    return `
        <div class="card exercise-card ${bonusClass} ${isSkipped ? 'skipped' : ''} ${isCompleted ? 'completed' : ''}" 
             data-exercise-index="${index}" 
             data-exercise-name="${this._escapeHtml(mainExercise)}"
             data-original-index="${index}">
            <div class="card-header exercise-card-header">
                <!-- NEW: Drag handle -->
                <div class="drag-handle" title="Drag to reorder">
                    <i class="bx bx-grid-vertical"></i>
                </div>
                
                <div class="exercise-card-summary" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <!-- ... existing content ... -->
                </div>
                
                <!-- ... rest of header ... -->
            </div>
            <!-- ... card body ... -->
        </div>
    `;
}
```

#### 4. Initialize SortableJS (workout-mode-controller.js)

```javascript
class WorkoutModeController {
    constructor() {
        // ... existing code ...
        this.sortable = null;  // NEW: SortableJS instance
    }
    
    // NEW: Initialize drag-and-drop
    initializeDragAndDrop() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        this.sortable = new Sortable(container, {
            animation: 200,
            handle: '.drag-handle',
            ghostClass: 'exercise-card-ghost',
            chosenClass: 'exercise-card-chosen',
            dragClass: 'exercise-card-drag',
            onEnd: (evt) => this.handleReorder(evt)
        });
        
        console.log('✅ Drag-and-drop initialized');
    }
    
    // NEW: Handle reorder event
    handleReorder(evt) {
        const { oldIndex, newIndex } = evt;
        
        if (oldIndex === newIndex) return;
        
        // Update order in session service
        const order = this.sessionService.getExerciseOrder();
        const [movedItem] = order.splice(oldIndex, 1);
        order.splice(newIndex, 0, movedItem);
        
        // Update order indices
        order.forEach((item, i) => {
            item.currentIndex = i;
        });
        
        this.sessionService.updateExerciseOrder(order);
        
        // Update data-exercise-index attributes
        this.updateCardIndices();
        
        console.log('📋 Exercises reordered:', order.map(o => o.name));
        
        // Show feedback
        if (window.showAlert) {
            window.showAlert('Exercise order updated', 'info');
        }
    }
    
    // NEW: Update card indices after reorder
    updateCardIndices() {
        const cards = document.querySelectorAll('.exercise-card');
        cards.forEach((card, index) => {
            card.setAttribute('data-exercise-index', index);
        });
    }
    
    // MODIFY: renderWorkout to use exercise order
    renderWorkout() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        // Get ordered exercise list
        const orderedExercises = this._getOrderedExercises();
        
        let html = '';
        orderedExercises.forEach((exercise, index) => {
            if (exercise.isBonus) {
                // Render bonus exercise
                html += this.cardRenderer.renderCard(exercise.group, index, true, orderedExercises.length);
            } else {
                // Render regular exercise
                html += this.cardRenderer.renderCard(exercise.group, index, false, orderedExercises.length);
            }
        });
        
        container.innerHTML = html;
        
        // Initialize drag-and-drop after render
        this.initializeDragAndDrop();
        
        // ... rest of existing code ...
    }
}
```

#### 5. Add CSS for Drag-and-Drop (workout-mode.css)

```css
/* Drag Handle */
.drag-handle {
    cursor: grab;
    padding: 0.5rem;
    color: var(--bs-secondary);
    opacity: 0.5;
    transition: opacity 0.2s ease;
}

.drag-handle:hover {
    opacity: 1;
}

.drag-handle:active {
    cursor: grabbing;
}

/* Drag States */
.exercise-card-ghost {
    opacity: 0.4;
    background: var(--bs-primary-bg-subtle);
    border: 2px dashed var(--bs-primary);
}

.exercise-card-chosen {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    transform: scale(1.02);
}

.exercise-card-drag {
    opacity: 1 !important;
}

/* Mobile Touch Improvements */
@media (max-width: 768px) {
    .drag-handle {
        padding: 0.75rem;
        font-size: 1.25rem;
    }
}
```

---

## Feature 3: Saving Order to History

### Implementation

When session completes, include the final exercise order in the session data:

```javascript
// In workout-mode-controller.js
collectExerciseData() {
    const exercisesPerformed = [];
    const order = this.sessionService.getExerciseOrder();
    
    // Use the current order instead of template order
    order.forEach((orderItem, orderIndex) => {
        const exerciseName = orderItem.name;
        const exerciseData = this.sessionService.getExerciseWeight(exerciseName);
        
        exercisesPerformed.push({
            exercise_name: exerciseName,
            // ... existing fields ...
            order_index: orderIndex,  // Use reordered position
            original_order_index: orderItem.originalIndex,  // Keep original for reference
            was_reordered: orderItem.originalIndex !== orderIndex
        });
    });
    
    return exercisesPerformed;
}
```

---

## Future Enhancement: Save-to-Template Toggle

### Concept

Add a settings toggle (per exercise or global) to control whether changes save to the template:

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Exercise: Bench Press                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sets:  [ 3 ]    Reps: [ 8-12 ]    Rest: [ 90s ]               │
│                                                                 │
│  Weight: [ 135 ] lbs                                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ☐ Save weight to template (always on)                         │
│  ☐ Save sets/reps/rest to template (future)                    │
│  ☐ Save exercise order to template (future)                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [ Cancel ]                              [ Save ]              │
└─────────────────────────────────────────────────────────────────┘
```

This feature is deferred for future implementation but the architecture supports it.

---

## Implementation Phases

### Phase 1: Pre-Session Editing
- [ ] Add `preSessionEdits` storage to workout-session-service.js
- [ ] Add `updatePreSessionExercise()` method
- [ ] Add `getPreSessionEdits()` method
- [ ] Modify `startSession()` to apply pre-session edits
- [ ] Update `_renderCardActionButtons()` to show Edit button before session
- [ ] Update `handleEditExercise()` to handle pre-session state
- [ ] Update card renderer to read from pre-session edits
- [ ] Test: Edit before start, verify changes applied to session

### Phase 2: Exercise Reordering
- [ ] Add SortableJS to workout-mode.html
- [ ] Add `exerciseOrder` state to workout-session-service.js
- [ ] Add drag handle to exercise card header
- [ ] Initialize SortableJS in controller
- [ ] Handle reorder events and update state
- [ ] Add CSS for drag-and-drop visual feedback
- [ ] Update `renderWorkout()` to use exercise order
- [ ] Persist order to localStorage with session
- [ ] Test: Reorder exercises, verify order maintained

### Phase 3: Save Order to History
- [ ] Modify `collectExerciseData()` to use reordered positions
- [ ] Add `was_reordered` flag to exercise data
- [ ] Include order in session completion API call
- [ ] Test: Complete session, verify order in history

### Phase 4: Future - Save to Template Toggle
- [ ] Add toggle UI to exercise edit offcanvas
- [ ] Add toggle state management
- [ ] Modify completion logic to respect toggles
- [ ] Add global settings for default behavior

---

## File Changes Summary

| File | Changes |
|------|---------|
| `workout-mode.html` | Add SortableJS script |
| `workout-session-service.js` | Add preSessionEdits, exerciseOrder, related methods |
| `exercise-card-renderer.js` | Add drag handle, modify action buttons |
| `workout-mode-controller.js` | Add drag-drop init, modify edit handler, update render |
| `workout-mode.css` | Add drag-and-drop styles |
| `unified-offcanvas/` | (Future) Add save-to-template toggle |

---

## Testing Checklist

### Pre-Session Editing
- [ ] Can edit exercise from collapsed card state
- [ ] Can edit exercise from expanded card state
- [ ] Edited values display correctly before session
- [ ] Edited values persist to session when started
- [ ] Weight continues to save to template on completion
- [ ] Sets/reps/rest remain session-only

### Exercise Reordering
- [ ] Drag handle visible on all cards
- [ ] Can drag to reorder exercises
- [ ] Visual feedback during drag
- [ ] Order maintained after re-render
- [ ] Order persisted to localStorage
- [ ] Order saved to history on completion
- [ ] Works on mobile (touch drag)

### Edge Cases
- [ ] Page refresh preserves pre-session edits (optional)
- [ ] Order works with bonus exercises
- [ ] Order correct after adding bonus exercise mid-session
- [ ] Reorder works when session is paused/resumed

---

## Appendix A: Sneat/Bootstrap Best Practices

This section documents the coding standards and patterns that should be followed during implementation to maintain consistency with the Sneat Bootstrap template.

### CSS Naming Conventions

Follow existing patterns in `workout-mode.css`:

```css
/* Component prefix pattern: [component]-[element]-[modifier] */
.exercise-card                    /* Main component */
.exercise-card-header             /* Child element */
.exercise-card-body               /* Child element */
.exercise-card-summary            /* Child element */
.exercise-card.expanded           /* State modifier */
.exercise-card.skipped            /* State modifier */
.exercise-card.completed          /* State modifier */

/* New drag-and-drop classes should follow same pattern: */
.exercise-card-ghost              /* Drag state */
.exercise-card-chosen             /* Drag state */
.exercise-card-drag               /* Drag state */
.drag-handle                      /* Drag UI element */
```

### Bootstrap Utility Classes

Use Bootstrap 5 utility classes for layout and spacing:

```html
<!-- Flexbox utilities -->
<div class="d-flex align-items-center justify-content-between gap-2">

<!-- Spacing utilities (Sneat uses 0.25rem increments) -->
<div class="mt-3 mb-2 py-1 px-2">  <!-- margin-top: 0.75rem, margin-bottom: 0.5rem, etc. -->

<!-- Text utilities -->
<span class="text-muted small">   <!-- Color and size -->
<h6 class="fw-semibold mb-0">     <!-- Font weight -->

<!-- Border utilities -->
<div class="border-top pt-3">

<!-- Display utilities -->
<div class="d-none d-md-block">   <!-- Responsive visibility -->
```

### Icon Usage (BoxIcons)

Use BoxIcons consistently (already loaded via iconify):

```html
<!-- Standard icon patterns from Sneat -->
<i class="bx bx-edit me-1"></i>           <!-- Edit action -->
<i class="bx bx-check-circle me-1"></i>   <!-- Complete/success -->
<i class="bx bx-skip-next me-1"></i>      <!-- Skip action -->
<i class="bx bx-time-five me-1"></i>      <!-- Timer/time -->
<i class="bx bx-dumbbell me-1"></i>       <!-- Exercise/weight -->
<i class="bx bx-grid-vertical"></i>       <!-- Drag handle -->
<i class="bx bx-chevron-down"></i>        <!-- Expand indicator -->

<!-- Icon sizing follows icon-base pattern -->
<i class="icon-base bx bx-menu icon-md"></i>
```

### Card Patterns

Follow Sneat card structure:

```html
<!-- Standard card structure -->
<div class="card mb-4">
    <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Title</h5>
        <button class="btn btn-sm btn-outline-primary">Action</button>
    </div>
    <div class="card-body">
        <!-- Content -->
    </div>
    <div class="card-footer text-body-secondary">
        Footer content
    </div>
</div>

<!-- List group inside card (from Sneat) -->
<div class="card">
    <ul class="list-group list-group-flush">
        <li class="list-group-item d-flex justify-content-between align-items-center">
            Label
            <span class="badge bg-primary">Value</span>
        </li>
    </ul>
</div>
```

### Button Patterns

Use consistent button styling:

```html
<!-- Primary action -->
<button class="btn btn-primary">Start Workout</button>

<!-- Secondary/outline actions -->
<button class="btn btn-outline-primary btn-sm">Edit</button>
<button class="btn btn-outline-secondary btn-sm">Cancel</button>

<!-- Icon-only buttons -->
<button class="btn btn-sm btn-outline-secondary" title="Sound toggle">
    <i class="bx bx-volume-full"></i>
</button>

<!-- Button groups -->
<div class="btn-group" role="group">
    <button class="btn btn-outline-primary">Option 1</button>
    <button class="btn btn-outline-primary">Option 2</button>
</div>
```

### CSS Variables

Use Bootstrap/Sneat CSS variables for theming:

```css
/* Colors */
color: var(--bs-body-color);           /* Default text */
color: var(--bs-heading-color);         /* Headings */
color: var(--bs-secondary);             /* Muted text */
color: var(--bs-primary);               /* Primary brand color */
color: var(--bs-success);               /* Success states */
color: var(--bs-warning);               /* Warning states */
color: var(--bs-danger);                /* Error states */

/* Backgrounds */
background: var(--bs-card-bg);          /* Card backgrounds */
background: var(--bs-gray-50);          /* Light backgrounds */
background: rgba(var(--bs-primary-rgb), 0.05);  /* Subtle primary tint */

/* Borders */
border-color: var(--bs-border-color);   /* Default borders */
border-radius: var(--bs-border-radius); /* Standard radius */
```

### Dark Mode Support

All new styles must support dark mode:

```css
/* Light mode styles (default) */
.drag-handle {
    color: var(--bs-secondary);
}

/* Dark mode overrides */
[data-bs-theme="dark"] .drag-handle {
    color: var(--bs-gray-400);
}
```

### Transitions and Animations

Use consistent timing from existing workout-mode.css:

```css
/* Standard transition timing */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* For performance, prefer transform/opacity */
transition: transform 0.2s ease, opacity 0.2s ease;

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
    .drag-handle,
    .exercise-card-ghost {
        animation: none !important;
        transition: none !important;
    }
}
```

### Mobile Responsive

Follow existing breakpoint patterns:

```css
/* Desktop first, then mobile overrides */
.drag-handle {
    padding: 0.5rem;
}

@media (max-width: 768px) {
    .drag-handle {
        padding: 0.75rem;
        font-size: 1.25rem;
    }
}

@media (max-width: 576px) {
    .drag-handle {
        padding: 0.6rem;
    }
}
```

### JavaScript Patterns

Follow existing controller patterns:

```javascript
// Method naming convention
class WorkoutModeController {
    // Public methods - camelCase
    handleEditExercise() {}
    handleReorder() {}
    
    // Private helper methods - _prefixed
    _getCurrentExerciseData() {}
    _applyPreSessionEdits() {}
    
    // Event handlers
    handleReorder(evt) {
        // Always check for validity first
        if (!evt || evt.oldIndex === evt.newIndex) return;
        
        // Log for debugging
        console.log('📋 Exercises reordered');
        
        // Update state
        this.sessionService.updateExerciseOrder(order);
        
        // Update UI
        this.updateCardIndices();
        
        // Show feedback
        if (window.showAlert) {
            window.showAlert('Exercise order updated', 'info');
        }
    }
}
```

### HTML Template Patterns

Use template literals consistently:

```javascript
// Escape user input
_escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Use template literals with proper indentation
renderCard(group, index) {
    return `
        <div class="card exercise-card"
             data-exercise-index="${index}"
             data-exercise-name="${this._escapeHtml(name)}">
            <div class="card-header exercise-card-header">
                <!-- Drag handle (NEW) -->
                <div class="drag-handle" title="Drag to reorder">
                    <i class="bx bx-grid-vertical"></i>
                </div>
                
                <!-- Rest of header -->
            </div>
        </div>
    `;
}
```

---

## Appendix B: File Organization

### CSS Files

All new CSS should be added to `workout-mode.css` in appropriate sections:

```css
/* ============================================
   DRAG AND DROP STYLES
   ============================================ */

/* Drag Handle */
.drag-handle { ... }

/* Drag States */
.exercise-card-ghost { ... }
.exercise-card-chosen { ... }

/* Dark Theme */
[data-bs-theme="dark"] .drag-handle { ... }

/* Mobile Responsive */
@media (max-width: 768px) {
    .drag-handle { ... }
}
```

### JavaScript Files

Keep changes within existing files to maintain current architecture:

| File | Purpose |
|------|---------|
| `workout-session-service.js` | State management (preSessionEdits, exerciseOrder) |
| `workout-mode-controller.js` | UI logic, event handling, SortableJS init |
| `exercise-card-renderer.js` | Card HTML generation (drag handle, action buttons) |

### No New Files Required

All changes can be made within existing files, maintaining clean architecture.
