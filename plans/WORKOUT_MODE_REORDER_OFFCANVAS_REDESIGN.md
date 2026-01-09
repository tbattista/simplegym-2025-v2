# Workout Mode Reorder - Offcanvas Redesign

## Overview

Replace the complex inline drag-and-drop reorder system with a simple, isolated reorder offcanvas. This follows the industry-standard pattern used by apps like Strong, Hevy, and JEFIT.

**Key Principle:** Completely isolate reorder functionality from workout mode's complex state management (timers, card expand/collapse, editable fields).

---

## Part 1: Code Removal (Cleanup)

### Files to Modify

#### 1. workout-mode.html

**REMOVE:**
```html
<!-- Lines 133-146: Remove reorder toggle from header -->
<div id="exerciseCardsHeader" class="d-flex justify-content-between align-items-center mb-3">
  <h6 class="mb-0">
    <i class="bx bx-list-ul me-1"></i>
    Exercises
  </h6>
  <!-- DELETE THIS ENTIRE BLOCK -->
  <div class="form-check form-switch mb-0">
    <input class="form-check-input" type="checkbox" role="switch"
           id="reorderModeToggle" style="cursor: pointer;">
    <label class="form-check-label" for="reorderModeToggle" style="cursor: pointer;">
      <span class="edit-mode-label">Reorder</span>
    </label>
  </div>
  <!-- END DELETE -->
</div>
```

**REMOVE:**
```html
<!-- Line 211: Remove SortableJS CDN -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
```

---

#### 2. workout-mode-controller.js

**REMOVE these state properties from constructor:**
```javascript
// Lines 89-94
this.reorderModeEnabled = false;
this.isDragInProgress = false;
this.sortable = null;  // If present
```

**REMOVE these methods entirely:**
- `initializeSortable()` - Lines 562-629
- `initializeReorderMode()` - Lines 635-671
- `enterReorderMode()` - Lines 678-710
- `exitReorderMode()` - Lines 717-732
- `handleExerciseReorder()` - Lines 739-757
- `updateDragMode()` - Lines 1319-1362

**SIMPLIFY renderWorkout() - REMOVE these sections:**
```javascript
// Lines 391-399: Remove reorder mode guards
if (!forceRender && this.reorderModeEnabled) {
    console.log('⚠️ Skipping renderWorkout during reorder mode');
    return;
}

if (!forceRender && this.isDragInProgress) {
    console.log('⚠️ Skipping renderWorkout during active drag');
    return;
}

// Lines 405-406: Remove sortable state tracking
const hadSortable = !!this.sortable;
const wasEnabled = hadSortable && !this.sortable.option('disabled');

// Lines 501-531: Remove all sortable re-initialization code
if (hadSortable && this.sortable) { ... }
this.initializeSortable();
if (fullCardDrag) { ... }
if (this.reorderModeEnabled) { ... }
```

**SIMPLIFY toggleExerciseCard() - REMOVE guard:**
```javascript
// Lines 1300-1308: Remove this guard entirely
const fullCardDrag = localStorage.getItem('workoutFullCardDrag') !== 'false';
if (!fullCardDrag && this.reorderModeEnabled) {
    console.log('⚠️ Card expansion blocked during Toggle Mode reorder');
    return;
}
```

**REMOVE from initialize():**
```javascript
// Remove this line
this.initializeReorderMode();
```

**SIMPLIFY Weight Manager callback:**
```javascript
// Line 58-63: Remove reorder mode check
onWeightUpdated: (exerciseName, weight) => {
    // REMOVE this check:
    // if (!this.reorderModeEnabled) {
    this.renderWorkout();
    // }
},
```

---

#### 3. workout-timer-manager.js

**REMOVE these properties and methods:**
```javascript
// Remove property
this.domUpdatesPaused = false;

// Remove methods entirely
pauseDOMUpdates() { ... }
resumeDOMUpdates() { ... }

// Remove guards in updateTimerDisplay()
if (this.domUpdatesPaused) return;
if (typeof Sortable !== 'undefined' && (Sortable.active || Sortable.dragged)) { return; }
```

---

#### 4. bottom-action-bar-config.js

**REMOVE Full Card Drag toggle from workout-mode config (Lines 1089-1103):**
```javascript
// DELETE THIS ENTIRE OBJECT from menuItems array
{
    type: 'toggle',
    icon: 'bx-move',
    title: 'Full Card Drag',
    description: 'Long-press anywhere to reorder',
    checked: localStorage.getItem('workoutFullCardDrag') !== 'false',
    storageKey: 'workoutFullCardDrag',
    onChange: (enabled) => {
        console.log('🖐️ Full card drag toggled:', enabled);
        if (window.workoutModeController) {
            window.workoutModeController.updateDragMode(enabled);
        }
    }
}
```

**REMOVE Full Card Drag toggle from workout-mode-active config (Lines 1210-1224):**
Same object as above - DELETE from menuItems array.

---

#### 5. workout-mode.css

**REMOVE these entire sections (approximately lines 2505-2693):**

```css
/* DELETE EVERYTHING FROM HERE... */

/* Default: Hide drag handles when reorder mode is disabled */
#exerciseCardsContainer:not(.reorder-mode-active) .exercise-drag-handle { ... }

/* Show drag handles when reorder mode is active */
#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle { ... }

/* Visual indicator that cards are draggable in reorder mode */
#exerciseCardsContainer.reorder-mode-active .exercise-card { ... }

/* Reorder mode active indicator */
#exerciseCardsContainer.reorder-mode-active { ... }

/* Toggle label styling */
.reorder-mode-label { ... }

/* Active toggle label */
#reorderModeToggle:checked + label .reorder-mode-label { ... }

/* Dark theme adjustments for reorder mode */
[data-bs-theme="dark"] #exerciseCardsContainer.reorder-mode-active { ... }

/* Drag handle styling */
.exercise-drag-handle { ... }

/* MOBILE FIX: Only drag handle captures touch events */
#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle { ... }

/* SortableJS ghost */
.sortable-ghost { ... }

/* SortableJS drag */
.sortable-drag { ... }

/* SortableJS chosen */
.sortable-chosen { ... }

/* Container while dragging */
.sortable-container-dragging { ... }

/* Placeholder/drop zone styling */
.sortable-fallback { ... }

/* Dark theme adjustments */
[data-bs-theme="dark"] .exercise-drag-handle { ... }
[data-bs-theme="dark"] .sortable-ghost { ... }
[data-bs-theme="dark"] .sortable-drag { ... }

/* Responsive drag handle */
@media (max-width: 768px) { .exercise-drag-handle { ... } }
@media (max-width: 576px) { .exercise-drag-handle { ... } }

/* Accessibility */
.exercise-drag-handle:focus-visible { ... }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) { .sortable-drag { ... } }

/* ...TO HERE */
```

---

#### 6. exercise-card-renderer.js

**REMOVE drag handle from rendered card:**
```javascript
// Find and remove the drag handle HTML from the card template
// Usually in the header rendering section:
<div class="exercise-drag-handle">
    <i class="bx bx-menu"></i>
</div>
```

---

#### 7. localStorage Cleanup

**Keys to remove:**
- `workoutFullCardDrag` - No longer needed

---

## Part 2: New Implementation

### Add Reorder Button to More Menu

**File:** `bottom-action-bar-config.js`

Add new menu item to both `workout-mode` and `workout-mode-active` configs:

```javascript
{
    icon: 'bx-sort-alt-2',
    title: 'Reorder Exercises',
    description: 'Change the exercise order',
    onClick: () => {
        if (window.workoutModeController?.showReorderOffcanvas) {
            window.workoutModeController.showReorderOffcanvas();
        }
    }
}
```

---

### New Reorder Offcanvas

**File:** `workout-mode-controller.js`

Add new method:

```javascript
/**
 * Show reorder exercises offcanvas
 * Isolated from workout mode state - no conflicts with timers/cards
 */
showReorderOffcanvas() {
    // Build exercise list from current workout + bonus exercises
    const exercises = this.buildExerciseList();
    
    if (exercises.length < 2) {
        if (window.showAlert) {
            window.showAlert('Need at least 2 exercises to reorder', 'warning');
        }
        return;
    }
    
    // Create offcanvas with simple sortable list
    if (window.UnifiedOffcanvasFactory) {
        window.UnifiedOffcanvasFactory.createReorderOffcanvas({
            id: 'reorderExercisesOffcanvas',
            title: 'Reorder Exercises',
            icon: 'bx-sort-alt-2',
            exercises: exercises,
            onSave: (newOrder) => {
                this.applyExerciseOrder(newOrder);
            }
        });
    }
}

/**
 * Build list of exercises for reorder UI
 */
buildExerciseList() {
    const exercises = [];
    
    // Get current order (may already have custom order)
    const customOrder = this.sessionService.getExerciseOrder();
    
    // Regular exercises
    if (this.currentWorkout.exercise_groups) {
        this.currentWorkout.exercise_groups.forEach((group, index) => {
            exercises.push({
                name: group.exercises?.a || `Exercise ${index + 1}`,
                type: 'regular',
                index: index
            });
        });
    }
    
    // Bonus exercises
    const bonusExercises = this.sessionService.getBonusExercises();
    if (bonusExercises && bonusExercises.length > 0) {
        bonusExercises.forEach((bonus, index) => {
            exercises.push({
                name: bonus.name,
                type: 'bonus',
                index: index
            });
        });
    }
    
    // Apply custom order if exists
    if (customOrder.length > 0) {
        const orderedExercises = [];
        customOrder.forEach(name => {
            const ex = exercises.find(e => e.name === name);
            if (ex) orderedExercises.push(ex);
        });
        // Add any not in order
        exercises.forEach(ex => {
            if (!customOrder.includes(ex.name)) {
                orderedExercises.push(ex);
            }
        });
        return orderedExercises;
    }
    
    return exercises;
}

/**
 * Apply new exercise order
 */
applyExerciseOrder(newOrder) {
    // newOrder is array of exercise names in new order
    this.sessionService.setExerciseOrder(newOrder);
    
    // Re-render workout with new order
    this.renderWorkout();
    
    if (window.showAlert) {
        window.showAlert('Exercise order updated', 'success');
    }
    
    console.log('✅ Exercise order applied:', newOrder);
}
```

---

### New Offcanvas Factory Method

**File:** `unified-offcanvas-factory.js` (or appropriate location)

Add new factory method:

```javascript
/**
 * Create reorder exercises offcanvas
 * Isolated drag-and-drop list - no interference with parent page state
 */
static createReorderOffcanvas(options) {
    const {
        id = 'reorderOffcanvas',
        title = 'Reorder Exercises',
        icon = 'bx-sort-alt-2',
        exercises = [],
        onSave = () => {},
        onCancel = () => {}
    } = options;
    
    // Build exercise list HTML
    const listHTML = exercises.map((ex, index) => `
        <div class="reorder-item" data-exercise-name="${ex.name}" data-index="${index}">
            <div class="reorder-handle">
                <i class="bx bx-menu"></i>
            </div>
            <div class="reorder-content">
                <span class="reorder-name">${ex.name}</span>
                ${ex.type === 'bonus' ? '<span class="badge bg-label-info ms-2">Bonus</span>' : ''}
            </div>
        </div>
    `).join('');
    
    const offcanvasHTML = `
        <div class="offcanvas offcanvas-bottom" tabindex="-1" id="${id}">
            <div class="offcanvas-header">
                <h5 class="offcanvas-title">
                    <i class="bx ${icon} me-2"></i>
                    ${title}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <p class="text-muted small mb-3">
                    <i class="bx bx-info-circle me-1"></i>
                    Drag exercises to reorder
                </p>
                <div class="reorder-list" id="${id}List">
                    ${listHTML}
                </div>
            </div>
            <div class="offcanvas-footer p-3 border-top">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-grow-1" data-bs-dismiss="offcanvas">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary flex-grow-1" id="${id}SaveBtn">
                        <i class="bx bx-check me-1"></i>
                        Save Order
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing offcanvas if present
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    
    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', offcanvasHTML);
    
    const offcanvasElement = document.getElementById(id);
    const offcanvas = new bootstrap.Offcanvas(offcanvasElement);
    
    // Initialize Sortable on the list (load dynamically)
    let sortableInstance = null;
    
    offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
        const list = document.getElementById(`${id}List`);
        if (list && typeof Sortable !== 'undefined') {
            sortableInstance = Sortable.create(list, {
                animation: 150,
                handle: '.reorder-handle',
                ghostClass: 'reorder-ghost',
                chosenClass: 'reorder-chosen',
                dragClass: 'reorder-drag'
            });
        } else if (typeof Sortable === 'undefined') {
            // Dynamically load SortableJS only when needed
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
            script.onload = () => {
                sortableInstance = Sortable.create(list, {
                    animation: 150,
                    handle: '.reorder-handle',
                    ghostClass: 'reorder-ghost',
                    chosenClass: 'reorder-chosen',
                    dragClass: 'reorder-drag'
                });
            };
            document.head.appendChild(script);
        }
    });
    
    // Save button handler
    const saveBtn = document.getElementById(`${id}SaveBtn`);
    saveBtn.addEventListener('click', () => {
        const list = document.getElementById(`${id}List`);
        const newOrder = Array.from(list.querySelectorAll('.reorder-item'))
            .map(item => item.dataset.exerciseName);
        
        onSave(newOrder);
        offcanvas.hide();
    });
    
    // Cleanup on hide
    offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        offcanvasElement.remove();
    });
    
    // Show offcanvas
    offcanvas.show();
    
    return { offcanvas, offcanvasElement };
}
```

---

### CSS for Reorder Offcanvas

**File:** `workout-mode.css` (or new file `reorder-offcanvas.css`)

```css
/* ============================================
   REORDER EXERCISES OFFCANVAS
   Isolated, simple drag-and-drop list
   ============================================ */

/* Offcanvas sizing */
#reorderExercisesOffcanvas {
    max-height: 70vh;
}

/* List container */
.reorder-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Individual item */
.reorder-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: 0.5rem;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* Drag handle */
.reorder-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--bs-secondary-color);
    cursor: grab;
    touch-action: none;
}

.reorder-handle:active {
    cursor: grabbing;
}

.reorder-handle i {
    font-size: 1.25rem;
}

/* Exercise name */
.reorder-content {
    flex: 1;
    display: flex;
    align-items: center;
}

.reorder-name {
    font-weight: 500;
}

/* Sortable states */
.reorder-ghost {
    opacity: 0.4;
    background-color: rgba(var(--bs-primary-rgb), 0.1);
}

.reorder-chosen {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: var(--bs-primary);
}

.reorder-drag {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Dark theme */
[data-bs-theme="dark"] .reorder-item {
    background-color: var(--bs-gray-800);
}

[data-bs-theme="dark"] .reorder-ghost {
    background-color: rgba(var(--bs-primary-rgb), 0.2);
}
```

---

## Summary

### What Gets Removed

| File | What to Remove |
|------|----------------|
| `workout-mode.html` | Reorder toggle HTML, SortableJS CDN |
| `workout-mode-controller.js` | 7 methods, 3 state properties, guards in renderWorkout/toggleExerciseCard |
| `workout-timer-manager.js` | pauseDOMUpdates/resumeDOMUpdates, domUpdatesPaused |
| `bottom-action-bar-config.js` | Full Card Drag toggle (2 locations) |
| `workout-mode.css` | ~190 lines of reorder/sortable CSS |
| `exercise-card-renderer.js` | Drag handle HTML |

### What Gets Added

| File | What to Add |
|------|-------------|
| `workout-mode-controller.js` | showReorderOffcanvas(), buildExerciseList(), applyExerciseOrder() |
| `bottom-action-bar-config.js` | "Reorder Exercises" menu item (2 locations) |
| `unified-offcanvas-factory.js` | createReorderOffcanvas() factory method |
| CSS file | ~60 lines of reorder offcanvas styles |

### Benefits

1. **Complete isolation** - Reorder offcanvas has zero interaction with workout state
2. **Simplified codebase** - Remove ~400 lines of complex coordination code
3. **No conflicts** - Timers, cards, editable fields all unaffected
4. **Lazy loading** - SortableJS only loaded when user opens reorder
5. **Industry standard** - Follows pattern from Strong, Hevy, JEFIT
6. **Explicit action** - User must intentionally open reorder, no accidents

---

## Implementation Order

1. **Phase 1: Cleanup** - Remove all old reorder code
2. **Phase 2: Add Offcanvas Factory** - Create the new reorder offcanvas component
3. **Phase 3: Add Controller Methods** - Add new reorder methods to controller
4. **Phase 4: Add Menu Item** - Add "Reorder Exercises" to More menu
5. **Phase 5: Add CSS** - Add offcanvas styles
6. **Phase 6: Test** - Verify all workout mode features work without reorder conflicts

---

## Testing Checklist

### After Cleanup
- [ ] Workout mode loads without errors
- [ ] Cards expand/collapse normally
- [ ] Timers work without jitter
- [ ] Weight editing works
- [ ] Skip/Replace exercise works
- [ ] Add bonus exercise works
- [ ] Complete workout works

### New Reorder Feature
- [ ] "Reorder Exercises" appears in More menu
- [ ] Offcanvas opens correctly
- [ ] Exercises listed with current order
- [ ] Drag-and-drop works smoothly
- [ ] Bonus exercises show badge
- [ ] Save applies new order
- [ ] Cancel closes without changes
- [ ] Order persists after offcanvas closes
- [ ] Cards render in new order
- [ ] Works on mobile touch devices
