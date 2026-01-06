# Workout Mode Reorder Issues - Implementation Plan

## Executive Summary

The user reported two issues with the reorder functionality in `workout-mode.html`:
1. **Timer Reset Bug**: Timer stops/resets to 0 when reorder toggle is selected during active session
2. **Mobile Scrolling**: Difficult to scroll while edit/reorder mode is active on mobile

---

## Issue 1: Timer Reset Bug

### Symptoms
- Timer display shows "00:00" when reorder toggle is activated during active workout
- Timer value persists correctly (proven by page refresh restoring the correct time)
- Only the DISPLAY is affected, not the underlying session data

### Root Cause Analysis

After comprehensive code review, I traced the following code paths:

#### What Happens When Reorder Mode is Entered
1. User toggles [`#reorderModeToggle`](frontend/workout-mode.html:140)
2. [`initializeReorderMode()`](frontend/assets/js/controllers/workout-mode-controller.js:552) listens for change event
3. [`enterReorderMode()`](frontend/assets/js/controllers/workout-mode-controller.js:570) is called which:
   - Sets `this.reorderModeEnabled = true`
   - Adds `reorder-mode-active` class to container
   - Collapses all expanded cards via [`collapseCard()`](frontend/assets/js/controllers/workout-mode-controller.js:581)
   - Enables SortableJS

#### Key Finding
The [`enterReorderMode()`](frontend/assets/js/controllers/workout-mode-controller.js:570) function does NOT directly call any timer functions. However, I identified a potential race condition:

1. The session timer runs on [`setInterval`](frontend/assets/js/services/workout-timer-manager.js:45) updating [`#floatingTimer`](frontend/assets/js/services/bottom-action-bar-service.js:258)
2. The timer display element is inside [`#floatingTimerEndCombo`](frontend/assets/js/services/bottom-action-bar-service.js:251)
3. When cards collapse, any scroll or DOM changes might cause re-rendering issues

#### Suspected Root Cause
Without being able to reproduce the bug directly, the most likely cause is one of:

1. **DOM Re-rendering**: Something triggers a re-render that recreates the timer display element
2. **CSS Transition Side Effect**: The card collapse animation might be triggering unexpected behavior
3. **Event Propagation**: The toggle event might be bubbling up and triggering unintended handlers

### Recommended Fix

Add a timer state preservation guard in the reorder mode functions:

```javascript
// In workout-mode-controller.js, modify enterReorderMode()
enterReorderMode() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    // PRESERVE TIMER STATE before any DOM changes
    const timerDisplay = document.getElementById('floatingTimer');
    const preservedTime = timerDisplay ? timerDisplay.textContent : null;
    
    this.reorderModeEnabled = true;
    container.classList.add('reorder-mode-active');
    
    // Collapse cards...
    document.querySelectorAll('.exercise-card.expanded').forEach(card => {
        this.collapseCard(card);
    });
    
    // Ensure sortable is initialized
    if (!this.sortable) {
        this.initializeSortable();
    }
    
    if (this.sortable) {
        this.sortable.option('disabled', false);
    }
    
    // RESTORE TIMER STATE if it was cleared
    if (preservedTime && timerDisplay && timerDisplay.textContent === '00:00') {
        timerDisplay.textContent = preservedTime;
        console.warn('⚠️ Timer was reset during reorder mode - restored:', preservedTime);
    }
    
    // Show feedback
    if (window.showAlert) {
        window.showAlert('Reorder mode active - Drag exercises to reorder', 'info');
    }
    
    console.log('✅ Reorder mode entered');
}
```

### Alternative: Add Debug Logging First
Before implementing the fix, add console logging to identify the exact cause:

```javascript
// Add to enterReorderMode() temporarily
console.log('🔍 Timer before reorder:', document.getElementById('floatingTimer')?.textContent);
// ... existing code ...
console.log('🔍 Timer after reorder:', document.getElementById('floatingTimer')?.textContent);
```

---

## Issue 2: Mobile Scrolling Difficulty

### Root Cause

The CSS in [`workout-mode.css`](frontend/assets/css/workout-mode.css:2504) sets cursor styles that mislead users, and critically **no `touch-action` property is set**:

```css
/* Current problematic CSS */
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    cursor: move;  /* Makes whole card appear draggable */
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    cursor: grab;  /* But only header should be draggable */
}
```

### Why This Causes Issues

1. **Missing `touch-action`**: Without `touch-action: pan-y`, touch events on the card body are captured by SortableJS
2. **Misleading Cursors**: `cursor: move` on the whole card suggests it's draggable anywhere
3. **SortableJS Config**: Currently uses `forceFallback: false` which relies on native drag/drop

### Recommended Fix

#### CSS Changes in [`workout-mode.css`](frontend/assets/css/workout-mode.css)

```css
/* REPLACE existing reorder mode styles (around line 2503) */

/* Allow vertical scrolling on the card body during reorder mode */
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    /* Remove cursor: move - only the drag handle should have it */
    touch-action: pan-y;  /* Allow vertical scrolling */
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    /* Remove cursor: grab - only the drag handle should have it */
    touch-action: pan-y;  /* Allow vertical scrolling */
}

/* ONLY the drag handle should show drag cursors and capture touch */
#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle {
    cursor: grab;
    touch-action: none;  /* Drag handle captures all touch events */
}

#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle:active {
    cursor: grabbing;
}
```

#### JavaScript Changes in [`workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:507)

Update SortableJS configuration for better mobile experience:

```javascript
initializeSortable() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container || typeof Sortable === 'undefined') {
        console.warn('⚠️ Sortable not initialized - container or library missing');
        return;
    }
    
    this.sortable = Sortable.create(container, {
        animation: 150,
        handle: '.exercise-drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        fallbackClass: 'sortable-fallback',
        
        // MOBILE FIX: Enable fallback for better touch support
        forceFallback: true,  // Changed from false
        fallbackOnBody: true,
        fallbackTolerance: 5,  // Slight tolerance to differentiate tap from drag
        
        scroll: true,
        scrollSensitivity: 60,
        scrollSpeed: 10,
        bubbleScroll: true,
        
        // Delay before drag starts (helps distinguish scroll from drag)
        delay: 150,
        delayOnTouchOnly: true,  // Only apply delay on touch devices
        
        disabled: !this.reorderModeEnabled,
        
        onStart: (evt) => {
            console.log('🎯 Drag started:', evt.oldIndex);
            container.classList.add('sortable-container-dragging');
        },
        
        onEnd: (evt) => {
            console.log('🎯 Drag ended:', evt.oldIndex, '→', evt.newIndex);
            container.classList.remove('sortable-container-dragging');
            
            if (evt.oldIndex !== evt.newIndex) {
                this.handleExerciseReorder(evt.oldIndex, evt.newIndex);
            }
        }
    });
    
    console.log('✅ SortableJS initialized for exercise reordering');
}
```

---

## Implementation Checklist

### Phase 1: Add Debug Logging (Optional but Recommended)
- [ ] Add console.log before and after reorder mode operations
- [ ] Test on mobile to capture exact timer value changes
- [ ] Identify the exact moment timer resets

### Phase 2: Fix Timer Reset Bug
- [ ] Update [`enterReorderMode()`](frontend/assets/js/controllers/workout-mode-controller.js:570) to preserve and restore timer state
- [ ] Test entering/exiting reorder mode during active workout
- [ ] Verify timer continues running correctly

### Phase 3: Fix Mobile Scrolling
- [ ] Update CSS in [`workout-mode.css`](frontend/assets/css/workout-mode.css) with `touch-action` properties
- [ ] Update SortableJS config in [`workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:507)
- [ ] Test on mobile devices:
  - [ ] Verify scrolling works when NOT touching drag handle
  - [ ] Verify dragging works when touching drag handle
  - [ ] Verify drag handle is clearly distinguishable

### Phase 4: Testing
- [ ] Test reorder mode on desktop
- [ ] Test reorder mode on mobile (iOS Safari, Android Chrome)
- [ ] Test timer persistence during reorder mode
- [ ] Test page refresh restores correct timer value

---

## Files to Modify

| File | Changes |
|------|---------|
| [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js) | Update `enterReorderMode()`, `initializeSortable()` |
| [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css) | Add `touch-action` properties to reorder mode styles |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Timer fix causes other issues | Low | Medium | Test thoroughly after changes |
| Mobile scrolling breaks desktop | Low | Low | Use `delayOnTouchOnly: true` |
| SortableJS fallback performance | Low | Low | Only affects during drag |

---

## Next Steps

1. **User Approval**: Confirm this analysis matches the observed behavior
2. **Switch to Code Mode**: Implement the fixes
3. **Testing**: Manual testing on desktop and mobile
4. **Verification**: Confirm both issues are resolved
