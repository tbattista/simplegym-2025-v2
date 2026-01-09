# Workout Mode Reorder - Best Practices Implementation Plan

## Research Summary

Based on analysis of the SortableJS documentation and best practices, the following key patterns should be implemented to ensure proper state management during reorder operations with live timers.

## Core Issue

The state change between reorder mode and normal mode doesn't properly coordinate with live updates (timers, DOM updates). This causes issues where:
1. Timer DOM updates interfere with drag operations
2. `renderWorkout()` calls during reorder mode destroy and recreate DOM
3. State becomes inconsistent between timer manager and reorder state

## Best Practices from SortableJS Documentation

### 1. Use `onStart` and `onEnd` Events for Operation Pausing
```javascript
onStart: function(evt) {
    // Pause timer DOM updates
    // Prevent renderWorkout calls
    // Set drag-in-progress flag
},
onEnd: function(evt) {
    // Resume timer DOM updates
    // Allow renderWorkout calls
    // Clear drag-in-progress flag
}
```

### 2. Use Dynamic Option Management Instead of Recreating Instances
```javascript
// Instead of:
if (this.sortable) {
    this.sortable.destroy();
    this.sortable = null;
}
this.sortable = Sortable.create(...);

// Use:
if (this.sortable) {
    this.sortable.option('disabled', !this.reorderModeEnabled);
} else {
    this.sortable = Sortable.create(...);
}
```

### 3. Check Active Drag State Before DOM Manipulation
```javascript
// Before updating timer DOM:
if (Sortable.active || Sortable.dragged) {
    return; // Skip update during active drag
}
```

## Implementation Plan

### Phase 1: Add Drag State Management

**File: `workout-mode-controller.js`**

Add a drag-in-progress flag and expose it globally:

```javascript
constructor() {
    // ...existing code...
    
    // Drag state management for coordinating with timer updates
    this.isDragInProgress = false;
}

initializeSortable() {
    // ...existing setup...
    
    this.sortable = Sortable.create(container, {
        // ...existing options...
        
        onStart: (evt) => {
            console.log('🎯 Drag started:', evt.oldIndex);
            this.isDragInProgress = true;
            container.classList.add('sortable-container-dragging');
            
            // ✅ BEST PRACTICE: Pause timer DOM updates during drag
            if (this.timerManager) {
                this.timerManager.pauseDOMUpdates();
            }
        },
        
        onEnd: (evt) => {
            console.log('🎯 Drag ended:', evt.oldIndex, '→', evt.newIndex);
            this.isDragInProgress = false;
            container.classList.remove('sortable-container-dragging');
            
            // ✅ BEST PRACTICE: Resume timer DOM updates after drag
            if (this.timerManager) {
                this.timerManager.resumeDOMUpdates();
            }
            
            // Handle reorder if position changed
            if (evt.oldIndex !== evt.newIndex) {
                this.handleExerciseReorder(evt.oldIndex, evt.newIndex);
            }
        }
    });
}
```

### Phase 2: Add DOM Update Pausing to Timer Manager

**File: `workout-timer-manager.js`**

Add methods to pause/resume DOM updates while keeping timer tracking active:

```javascript
constructor(sessionService) {
    // ...existing code...
    
    // DOM update pause state
    this.domUpdatesPaused = false;
    this.lastPausedTime = null;
}

/**
 * Pause DOM updates (timer still runs but doesn't update DOM)
 * Used during drag operations to prevent conflicts
 */
pauseDOMUpdates() {
    this.domUpdatesPaused = true;
    console.log('⏸️ Timer DOM updates paused');
}

/**
 * Resume DOM updates and immediately refresh display
 */
resumeDOMUpdates() {
    this.domUpdatesPaused = false;
    console.log('▶️ Timer DOM updates resumed');
    
    // Immediately update display with current time
    this.updateTimerDisplay();
}

/**
 * Update timer display - now checks pause state
 */
updateTimerDisplay() {
    // ✅ BEST PRACTICE: Skip DOM updates while paused
    if (this.domUpdatesPaused) {
        return;
    }
    
    // Also check if Sortable has active drag
    if (typeof Sortable !== 'undefined' && (Sortable.active || Sortable.dragged)) {
        return;
    }
    
    const elapsed = this.getElapsedSeconds();
    const formattedTime = WorkoutUtils.formatTime(elapsed);
    
    const timerElement = document.getElementById('floatingTimer');
    if (timerElement) {
        timerElement.textContent = formattedTime;
    }
}
```

### Phase 3: Guard `renderWorkout()` During Reorder Mode

**File: `workout-mode-controller.js`**

Add a guard to prevent re-renders during active reorder operations:

```javascript
/**
 * Render workout cards
 * GUARDED: Prevents re-renders during reorder mode or active drag
 */
renderWorkout(forceRender = false) {
    // ✅ BEST PRACTICE: Prevent re-renders during reorder operations
    if (!forceRender && this.reorderModeEnabled) {
        console.log('⚠️ Skipping renderWorkout during reorder mode');
        return;
    }
    
    if (!forceRender && this.isDragInProgress) {
        console.log('⚠️ Skipping renderWorkout during active drag');
        return;
    }
    
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    // ...rest of existing renderWorkout code...
}
```

Update all callbacks to use `forceRender` when appropriate:

```javascript
// Weight updates should still render (user explicitly changed something)
onWeightUpdated: (exerciseName, weight) => {
    if (!this.reorderModeEnabled) {
        this.renderWorkout();
    }
},

// Explicit render requests should force render
onRenderWorkout: () => this.renderWorkout(true),
```

### Phase 4: Use Dynamic Sortable Option Toggling

**File: `workout-mode-controller.js`**

Replace destroy/create pattern with dynamic option toggling:

```javascript
/**
 * Initialize drag-and-drop sorting with SortableJS
 * Only creates instance once, uses dynamic options for state changes
 */
initializeSortable() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container || typeof Sortable === 'undefined') {
        console.warn('⚠️ Sortable not initialized - container or library missing');
        return;
    }
    
    // ✅ BEST PRACTICE: Only create sortable once, use options to toggle
    if (!this.sortable) {
        this.sortable = Sortable.create(container, {
            animation: 150,
            handle: '.exercise-drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            fallbackClass: 'sortable-fallback',
            
            // Mobile optimizations
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 5,
            
            scroll: true,
            scrollSensitivity: 60,
            scrollSpeed: 10,
            bubbleScroll: true,
            
            delay: 150,
            delayOnTouchOnly: true,
            
            // Filter interactive elements
            filter: '.btn, .weight-badge, button, a, input, select, textarea',
            preventOnFilter: false,
            
            // Start disabled
            disabled: true,
            
            onStart: (evt) => {
                console.log('🎯 Drag started:', evt.oldIndex);
                this.isDragInProgress = true;
                container.classList.add('sortable-container-dragging');
                
                if (this.timerManager) {
                    this.timerManager.pauseDOMUpdates();
                }
            },
            
            onEnd: (evt) => {
                console.log('🎯 Drag ended:', evt.oldIndex, '→', evt.newIndex);
                this.isDragInProgress = false;
                container.classList.remove('sortable-container-dragging');
                
                if (this.timerManager) {
                    this.timerManager.resumeDOMUpdates();
                }
                
                if (evt.oldIndex !== evt.newIndex) {
                    this.handleExerciseReorder(evt.oldIndex, evt.newIndex);
                }
            }
        });
        
        console.log('✅ SortableJS initialized for exercise reordering');
    }
}

/**
 * Enter reorder mode
 * Uses dynamic option toggling instead of recreation
 */
enterReorderMode() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    this.reorderModeEnabled = true;
    
    // Add visual indicator
    container.classList.add('reorder-mode-active');
    
    // Collapse any expanded cards
    document.querySelectorAll('.exercise-card.expanded').forEach(card => {
        this.collapseCard(card);
    });
    
    // ✅ BEST PRACTICE: Use option toggling instead of recreating
    if (this.sortable) {
        this.sortable.option('disabled', false);
    } else {
        this.initializeSortable();
        if (this.sortable) {
            this.sortable.option('disabled', false);
        }
    }
    
    // Feedback
    if (window.showAlert) {
        window.showAlert('Reorder mode active - Drag exercises to reorder', 'info');
    }
    
    console.log('✅ Reorder mode entered');
}

/**
 * Exit reorder mode
 * Uses dynamic option toggling instead of recreation
 */
exitReorderMode() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    this.reorderModeEnabled = false;
    
    // Remove visual indicator
    container.classList.remove('reorder-mode-active');
    
    // ✅ BEST PRACTICE: Use option toggling
    if (this.sortable) {
        this.sortable.option('disabled', true);
    }
    
    console.log('✅ Reorder mode exited');
}
```

### Phase 5: Update Sortable After DOM Changes

When `renderWorkout()` does need to run (forced), we need to ensure Sortable still works:

```javascript
renderWorkout(forceRender = false) {
    // ...guard checks...
    
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    // Track if sortable exists and its current state
    const hadSortable = !!this.sortable;
    const wasEnabled = hadSortable && !this.sortable.option('disabled');
    
    // Render new content
    let html = '';
    // ...generate HTML...
    
    container.innerHTML = html;
    
    // ✅ BEST PRACTICE: Re-associate sortable with new DOM elements
    if (this.sortable) {
        // Destroy old instance since DOM was replaced
        this.sortable.destroy();
        this.sortable = null;
    }
    
    // Reinitialize sortable with new DOM
    this.initializeSortable();
    
    // Restore previous state
    if (wasEnabled && this.sortable) {
        this.sortable.option('disabled', false);
    }
    
    // Restore reorder mode visual state
    if (this.reorderModeEnabled) {
        container.classList.add('reorder-mode-active');
    }
    
    // ...rest of method...
}
```

## Summary of Changes

| File | Changes |
|------|---------|
| `workout-mode-controller.js` | Add `isDragInProgress` flag, update `onStart`/`onEnd` callbacks, guard `renderWorkout()`, use dynamic option toggling |
| `workout-timer-manager.js` | Add `pauseDOMUpdates()`/`resumeDOMUpdates()` methods, guard `updateTimerDisplay()` |

## Key Best Practices Applied

1. **Pause DOM Updates During Drag** - Timer keeps running but doesn't touch DOM during drag operations
2. **Dynamic Option Toggling** - Use `sortable.option()` instead of destroy/create
3. **Check Active Drag State** - Guard DOM operations with `Sortable.active` or `Sortable.dragged`
4. **Guard renderWorkout()** - Prevent re-renders during reorder mode unless explicitly forced
5. **Coordinate State** - Use `isDragInProgress` flag to coordinate between controller and managers

## Testing Checklist

- [ ] Start workout session with timer
- [ ] Toggle reorder mode ON - timer continues counting but doesn't cause issues
- [ ] Drag an exercise while timer is running - no jitter or freeze
- [ ] Release drag - timer display updates immediately
- [ ] Toggle reorder mode OFF - timer continues normally
- [ ] Expand a card and click Complete button - button works
- [ ] Add a bonus exercise during session - workout updates correctly
- [ ] Toggle reorder mode after adding bonus - works without freeze

## Migration Notes

- No breaking changes to public API
- All changes are internal implementation details
- Backwards compatible with existing saved sessions
