# Workout Mode Reorder Issues Analysis

**Date:** 2026-01-05  
**Issue Reporter:** User  
**Analyst:** Claude (Architect Mode)

---

## Executive Summary

The user reported two issues with the reorder functionality in `workout-mode.html`:

1. **Timer Issue**: Timer stops/resets to 0 when reorder button is selected, but comes back on page refresh
2. **Mobile Scrolling Issue**: Hard to scroll on mobile while reorder/edit mode is active

This document analyzes the root causes and proposes fixes.

---

## Issue 1: Timer Stops/Resets to 0 During Reorder Mode

### Symptoms
- Timer display resets to "00:00" when user toggles the reorder switch
- Timer shows correct elapsed time after page refresh
- Session data appears to persist correctly (hence working on refresh)

### Code Analysis

#### Reorder Mode Entry Flow

When user toggles the reorder switch, this code executes:

**File:** [`workout-mode-controller.js`](../frontend/assets/js/controllers/workout-mode-controller.js:570-600)

```javascript
enterReorderMode() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    this.reorderModeEnabled = true;
    
    // Add active class to container
    container.classList.add('reorder-mode-active');
    
    // Collapse any expanded cards for cleaner drag experience
    document.querySelectorAll('.exercise-card.expanded').forEach(card => {
        this.collapseCard(card);
    });
    
    // ... enable sortable
}
```

#### Timer Architecture

The application has TWO timer systems:

| Timer Type | Purpose | Manager | Display Elements |
|------------|---------|---------|------------------|
| **Session Timer** | Tracks total workout elapsed time | `WorkoutTimerManager.startSessionTimer()` | `#floatingTimer`, `#floatingTimerDisplay`, `#sessionTimer` |
| **Rest Timer** | Countdown for rest periods | `RestTimer` class | Individual card timer elements |

**File:** [`workout-timer-manager.js`](../frontend/assets/js/services/workout-timer-manager.js:26-53)

```javascript
startSessionTimer() {
    const session = this.sessionService.getCurrentSession();
    if (!session) return;
    
    this.sessionTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
        // ... update DOM elements
    }, 1000);
}
```

### Potential Root Causes

#### Theory 1: Card Collapse Clears Timers (UNLIKELY)
The `collapse()` method only handles CSS transitions - it doesn't touch timer logic:

```javascript
// exercise-card-manager.js:92-106
collapse(card) {
    card.classList.remove('expanded');
    const body = card.querySelector('.exercise-card-body');
    if (body) {
        setTimeout(() => {
            if (!card.classList.contains('expanded')) {
                body.style.display = 'none';
            }
        }, 200);
    }
}
```

#### Theory 2: Something Calls stopSessionTimer() (NEEDS VERIFICATION)
The `stopSessionTimer()` method explicitly resets the display:

```javascript
// workout-timer-manager.js:59-70
stopSessionTimer() {
    if (this.sessionTimerInterval) {
        clearInterval(this.sessionTimerInterval);
        this.sessionTimerInterval = null;
    }
    
    // Reset timer display to 00:00
    const floatingTimer = document.getElementById('floatingTimer');
    if (floatingTimer) floatingTimer.textContent = '00:00';
}
```

**Question:** Is there code path that calls `stopSessionTimer()` during reorder mode entry?

#### Theory 3: DOM Elements Getting Re-rendered (POSSIBLE)
If any code re-renders the exercise cards container during reorder mode, the timer display elements might get recreated with default "00:00" values.

#### Theory 4: This Only Happens BEFORE Session Starts (NEEDS CLARIFICATION)
If the user is toggling reorder mode BEFORE starting a workout session, the timer wouldn't be running anyway. The "reset to 0" might just be showing the default state.

### Information Needed from User

1. Is this happening during an **active workout session** or **before starting** the workout?
2. Which timer exactly is resetting - the **workout elapsed timer** (top/floating) or the **rest timer** (inside cards)?
3. Are there any **console errors** when this happens? (Press F12 → Console tab)

---

## Issue 2: Mobile Scrolling Difficulty During Reorder Mode

### Symptoms
- Difficult to scroll the page on mobile devices when reorder mode is active
- User likely experiencing scroll gestures being interpreted as drag attempts

### Code Analysis

#### SortableJS Configuration

**File:** [`workout-mode-controller.js`](../frontend/assets/js/controllers/workout-mode-controller.js:507-547)

```javascript
this.sortable = Sortable.create(container, {
    animation: 150,
    handle: '.exercise-drag-handle',     // Only handle triggers drag
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    fallbackClass: 'sortable-fallback',
    forceFallback: false,               // ⚠️ May cause mobile issues
    scroll: true,
    scrollSensitivity: 60,
    scrollSpeed: 10,
    bubbleScroll: true,
    disabled: !this.reorderModeEnabled,
    // ...
});
```

#### CSS That Affects Cursor/Touch Perception

**File:** [`workout-mode.css`](../frontend/assets/css/workout-mode.css:2504-2512)

```css
/* Visual indicator that cards are draggable in reorder mode */
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    cursor: move;                        /* ⚠️ Suggests entire card is draggable */
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    cursor: grab;                        /* ⚠️ Suggests header is draggable */
}
```

### Root Cause Analysis

#### Problem 1: Missing `touch-action` CSS Property

The CSS does NOT include `touch-action` properties, which are **critical** for controlling how touch events are handled on mobile:

```css
/* MISSING from current CSS */
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    touch-action: pan-y;  /* Allow vertical scroll */
}

#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle {
    touch-action: none;   /* Only handle blocks touch scroll */
}
```

Without `touch-action: pan-y`, the browser may interpret vertical swipe gestures as potential drag operations, blocking natural scrolling.

#### Problem 2: `forceFallback: false` May Cause Issues

Setting `forceFallback: false` lets the browser use native HTML5 drag-and-drop, which can conflict with touch scroll behavior on mobile. Setting it to `true` would use SortableJS's own implementation which may be more consistent.

#### Problem 3: Misleading Cursor Styles

The CSS shows `cursor: move` and `cursor: grab` on the entire card and header, even though only the `.exercise-drag-handle` actually triggers dragging. This creates a confusing UX where users think they can drag from anywhere.

---

## Proposed Solutions

### Fix 1: Add `touch-action` CSS Properties

**File:** `frontend/assets/css/workout-mode.css`

```css
/* Add after line 2512 */

/* Mobile touch scrolling fix for reorder mode */
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    touch-action: pan-y;   /* Allow vertical scrolling on cards */
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    touch-action: pan-y;   /* Allow vertical scrolling on header */
}

#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle {
    touch-action: none;    /* Only drag handle blocks scroll for drag */
}
```

### Fix 2: Remove Misleading Cursor Styles

**File:** `frontend/assets/css/workout-mode.css`

Change from:
```css
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    cursor: move;
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    cursor: grab;
}
```

To:
```css
#exerciseCardsContainer.reorder-mode-active .exercise-card {
    cursor: default;       /* Normal cursor - not draggable */
}

#exerciseCardsContainer.reorder-mode-active .exercise-card-header {
    cursor: default;       /* Normal cursor - not draggable */
}

/* Only drag handle shows grab cursor */
#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle {
    cursor: grab;
}

#exerciseCardsContainer.reorder-mode-active .exercise-drag-handle:active {
    cursor: grabbing;
}
```

### Fix 3: Consider Using `forceFallback: true` for Mobile

**File:** `frontend/assets/js/controllers/workout-mode-controller.js`

```javascript
this.sortable = Sortable.create(container, {
    // ...
    forceFallback: true,  // Use SortableJS fallback for consistent behavior
    // ...
});
```

This forces SortableJS to use its own drag implementation instead of HTML5 drag-and-drop, which can be more reliable on touch devices.

### Fix 4: Investigate Timer Reset (Pending User Clarification)

Depending on user's answers:
- If happening during active session: Need to trace what's calling `stopSessionTimer()`
- If happening before session: This may be expected behavior (no session = no timer)

---

## Implementation Order

### Phase 1: Mobile Scrolling Fix (High Priority)
1. Add `touch-action` CSS properties
2. Fix misleading cursor styles
3. Test on mobile device

### Phase 2: Timer Investigation (Medium Priority)
1. Get clarification from user on exact scenario
2. Add console logging to trace timer state
3. Implement fix based on findings

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/css/workout-mode.css` | Add `touch-action` properties, fix cursor styles |
| `frontend/assets/js/controllers/workout-mode-controller.js` | Potentially change `forceFallback` option |
| Possibly other files | Depending on timer investigation results |

---

## Testing Checklist

- [ ] Toggle reorder mode on desktop - verify scrolling works
- [ ] Toggle reorder mode on mobile - verify vertical scrolling works
- [ ] Drag exercise using handle on mobile - verify drag works
- [ ] Verify timer doesn't reset when entering reorder mode during active session
- [ ] Verify page refresh restores timer correctly
- [ ] Test drag-and-drop reordering on both desktop and mobile
