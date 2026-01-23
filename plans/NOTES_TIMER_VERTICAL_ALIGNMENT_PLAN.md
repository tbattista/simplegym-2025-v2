# Plan: Vertical Alignment of Note Button and Timer Row

## Analysis

### Current State

The exercise card's expanded body contains a "Notes + Timer Section" with:
- **Left side**: Note button ("Add Note" or "Edit Note")
- **Right side**: Timer display (e.g., "60s") + Timer control ("Start Rest" link)

**Current HTML Structure:**
```html
<div class="workout-notes-timer-row">
    <div class="workout-notes-col">
        <button class="workout-note-toggle-btn">
            <i class="bx bx-note"></i>
            <span>Add Note</span>
        </button>
    </div>
    <div class="workout-timer-col">
        <div class="inline-rest-timer">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div data-inline-timer-display="0">
                    <strong><i class="bx bx-time-five me-1"></i>60s</strong>
                </div>
                <div data-inline-timer="0">
                    <a class="inline-timer-link">
                        <i class="bx bx-play-circle"></i> Start Rest
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Problem

The note button, timer time display, and timer control link are not consistently vertically aligned. This can happen due to:

1. **Nested flex containers**: The timer has multiple nested divs with their own flex properties
2. **Inline style override**: The inline `style="display: flex; align-items: center;"` on the inner div may not propagate alignment correctly
3. **Inconsistent element heights**: The button vs. link elements may have different natural heights
4. **Icon size inconsistency**: `bx bx-note` (1rem) vs `bx bx-time-five` (inherited) vs `bx bx-play-circle` (1.125rem via `.inline-timer-link i`)

### Current CSS

**[_notes.css](frontend/assets/css/workout-mode/_notes.css) (lines 128-143):**
```css
.workout-notes-timer-row {
    display: flex;
    gap: 1rem;
    align-items: center;  /* Should center children vertically */
    justify-content: space-between;
    width: 100%;
}

.workout-notes-col {
    flex: 0 0 auto;
}

.workout-timer-col {
    flex: 0 0 auto;
    margin-left: auto;
}
```

**[_timer.css](frontend/assets/css/workout-mode/_timer.css) (lines 13-21):**
```css
.inline-rest-timer {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    display: flex;
    align-items: center;  /* Should center timer elements */
    gap: 0.5rem;
}
```

---

## Proposed Solution

Ensure consistent vertical alignment by:

1. **Adding explicit `align-items: center`** to all flex containers in the timer column
2. **Removing the inline style** from the JS renderer (move to CSS for consistency)
3. **Ensuring consistent line-height** across button and link elements
4. **Normalizing icon sizes** to a consistent value

---

## Implementation Plan

### Step 1: Update `_notes.css` - Ensure Column Alignment
**File:** `frontend/assets/css/workout-mode/_notes.css`

Add explicit vertical alignment to the column containers:

```css
.workout-notes-col,
.workout-timer-col {
    display: flex;
    align-items: center;
}
```

### Step 2: Update `_timer.css` - Consistent Timer Row Styling
**File:** `frontend/assets/css/workout-mode/_timer.css`

Add a specific class for the timer row layout and ensure all inner elements align:

```css
/* Timer row - aligns timer display and controls */
.inline-rest-timer > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

/* Timer display element */
.inline-timer-display,
[data-inline-timer-display] {
    display: flex;
    align-items: center;
    line-height: 1;
}

/* Timer controls element */
[data-inline-timer] {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
```

### Step 3: Update `_timer.css` - Normalize Link Styling
**File:** `frontend/assets/css/workout-mode/_timer.css`

Ensure `.inline-timer-link` has consistent height with the note button:

```css
.inline-timer-link {
    color: var(--workout-accent);
    text-decoration: none;
    font-size: 0.875rem;  /* Same as note button */
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    line-height: 1;  /* Consistent line height */
}

.inline-timer-link i {
    font-size: 1rem;  /* Same as note button icon */
}
```

### Step 4: Update `exercise-card-renderer.js` - Remove Inline Style
**File:** `frontend/assets/js/components/exercise-card-renderer.js`

**Change (lines 524-536):**

**From:**
```javascript
return `
    <div class="inline-rest-timer" data-rest-seconds="${restSeconds}" data-rest-display="${restDisplay}">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div data-inline-timer-display="${index}">
                <strong><i class="bx bx-time-five me-1"></i>${restDisplay}</strong>
            </div>
            <div data-inline-timer="${index}">
                <!-- Timer controls will be rendered here by InlineRestTimer component -->
            </div>
        </div>
    </div>
`;
```

**To:**
```javascript
return `
    <div class="inline-rest-timer" data-rest-seconds="${restSeconds}" data-rest-display="${restDisplay}">
        <div class="inline-rest-timer-inner">
            <div class="inline-timer-display" data-inline-timer-display="${index}">
                <strong><i class="bx bx-time-five me-1"></i>${restDisplay}</strong>
            </div>
            <div class="inline-timer-controls" data-inline-timer="${index}">
                <!-- Timer controls will be rendered here by InlineRestTimer component -->
            </div>
        </div>
    </div>
`;
```

### Step 5: Add CSS for New Classes
**File:** `frontend/assets/css/workout-mode/_timer.css`

Add styling for the new semantic classes:

```css
/* Inner timer container - horizontal layout */
.inline-rest-timer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
}

/* Timer display - left side */
.inline-timer-display {
    display: flex;
    align-items: center;
    line-height: 1;
}

/* Timer controls - right side */
.inline-timer-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/css/workout-mode/_notes.css` | Add `display: flex; align-items: center` to column classes |
| `frontend/assets/css/workout-mode/_timer.css` | Add `.inline-rest-timer-inner`, `.inline-timer-display`, `.inline-timer-controls` classes; normalize icon sizes |
| `frontend/assets/js/components/exercise-card-renderer.js` | Replace inline style with CSS classes in `_renderInlineRestTimer()` |

---

## Risks & Considerations

1. **Timer States**: The InlineRestTimer component dynamically renders different HTML for ready/counting/paused/done states. Need to verify alignment works in all states.

2. **Dark Mode**: Changes should be theme-agnostic (using CSS variables), but verify in both light and dark mode.

3. **Responsive Behavior**: The flex layout should handle narrower screens gracefully without breaking alignment.

4. **Existing Class Conflicts**: The new class names should not conflict with existing styles.

---

## Testing Checklist

- [ ] Note button and timer display vertically aligned in ready state
- [ ] Note button and "Start Rest" link vertically aligned
- [ ] Alignment maintained during timer countdown (counting state)
- [ ] Alignment maintained when paused (Resume/Reset links)
- [ ] Alignment maintained in done state (Restart link)
- [ ] Consistent vertical alignment in light mode
- [ ] Consistent vertical alignment in dark mode
- [ ] No visual regressions in other parts of the card
- [ ] Icons are consistent size across all elements

---

## Visual Reference

**Target Alignment:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [📝 Add Note]                          ⏱ 60s   ▶ Start Rest │
│       ↑                                   ↑           ↑     │
│       └───────────────────────────────────┴───────────┘     │
│                    All on same vertical center line         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
