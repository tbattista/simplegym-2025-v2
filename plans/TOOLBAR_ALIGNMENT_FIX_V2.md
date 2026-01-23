# Plan: Fix Toolbar Vertical Alignment (V2 - JS + CSS)

## Analysis

### Root Cause Identified
The **JavaScript** in `exercise-card-renderer.js` has an **inline style** on line 526 that creates a nested flex container:

```javascript
<div style="display: flex; align-items: center; justify-content: space-between;">
```

This nested div overrides our CSS and controls the layout. The CSS changes to `.inline-rest-timer` have no effect on the inner elements because they're inside this inline-styled div.

### Current Structure (Problem)
```
.inline-rest-timer (CSS: flex, align-items: center)
└── div (INLINE STYLE: display: flex) ← OVERRIDES CSS
    ├── div[data-inline-timer-display] → "58s"
    └── div[data-inline-timer] → "Resume" "Reset"
```

### Target Structure (Solution)
Remove the nested div and let `.inline-rest-timer` directly contain the elements:

```
.inline-rest-timer (CSS: flex, align-items: center, gap)
├── span[data-inline-timer-display] → "58s"
└── span[data-inline-timer] → "Resume" "Reset"
```

---

## Implementation Plan

### Step 1: Update JavaScript - Flatten HTML Structure

**File:** `frontend/assets/js/components/exercise-card-renderer.js`

**Change `_renderInlineRestTimer` method (lines 521-536):**

**From:**
```javascript
_renderInlineRestTimer(restSeconds, index) {
    const restDisplay = restSeconds >= 60 ? `${Math.floor(restSeconds / 60)}min` : `${restSeconds}s`;

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
}
```

**To:**
```javascript
_renderInlineRestTimer(restSeconds, index) {
    const restDisplay = restSeconds >= 60 ? `${Math.floor(restSeconds / 60)}min` : `${restSeconds}s`;

    return `
        <div class="inline-rest-timer" data-rest-seconds="${restSeconds}" data-rest-display="${restDisplay}">
            <span class="inline-timer-display" data-inline-timer-display="${index}">
                <i class="bx bx-time-five"></i>${restDisplay}
            </span>
            <span class="inline-timer-controls" data-inline-timer="${index}">
                <!-- Timer controls will be rendered here by InlineRestTimer component -->
            </span>
        </div>
    `;
}
```

**Key changes:**
- Removed nested `<div style="...">` wrapper
- Changed inner `<div>` to `<span>` (inline-level)
- Removed `<strong>` wrapper (use CSS for font-weight)
- Removed `me-1` class from icon (use CSS gap instead)
- Added semantic classes for CSS targeting

### Step 2: Update CSS - Style the Flattened Structure

**File:** `frontend/assets/css/workout-mode/_timer.css`

**Update `.inline-rest-timer` section:**

```css
.inline-rest-timer {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 1rem;  /* Spacing between timer display and controls */
}

/* Timer display (e.g., "60s" or countdown) */
.inline-timer-display {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--workout-text);
}

.inline-timer-display i {
    font-size: 1rem;
    line-height: 1;
}

/* Timer controls container */
.inline-timer-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;  /* Spacing between Resume and Reset */
}
```

### Step 3: Update InlineRestTimer JS - Match New Structure

**File:** `frontend/assets/js/components/inline-rest-timer.js`

The `render()` method updates `displayElement.innerHTML` and `displayElement.className`. We need to update it to not wrap content in `<strong>` since we're using CSS for styling now.

**Update render() method state handlers:**

**Ready state (line 71):**
```javascript
displayElement.innerHTML = `<i class="bx bx-time-five"></i>${this.restDisplayText || this.totalSeconds + 's'}`;
```

**Counting state (line 84):**
```javascript
displayElement.innerHTML = `<i class="bx bx-time-five"></i>${formattedTime}`;
displayElement.className = `inline-timer-display ${displayClass}`;
```

**Paused state (line 94):**
```javascript
displayElement.innerHTML = `<i class="bx bx-pause"></i>${formattedTime}`;
displayElement.className = 'inline-timer-display text-warning';
```

**Done state (line 103):**
```javascript
displayElement.innerHTML = `<i class="bx bx-check-circle"></i>Done!`;
displayElement.className = 'inline-timer-display text-success';
```

### Step 4: Update Note Button Icon Alignment

**File:** `frontend/assets/css/workout-mode/_notes.css`

Ensure note button icon has consistent sizing:

```css
.workout-notes-timer-row .workout-note-toggle-btn i {
    font-size: 1rem;
    line-height: 1;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/js/components/exercise-card-renderer.js` | Flatten HTML structure, remove inline style |
| `frontend/assets/js/components/inline-rest-timer.js` | Remove `<strong>` wrappers, update class names |
| `frontend/assets/css/workout-mode/_timer.css` | Add `.inline-timer-display` and `.inline-timer-controls` styles |
| `frontend/assets/css/workout-mode/_notes.css` | Add `line-height: 1` to note button icon |

---

## Testing Checklist

- [ ] All elements vertically aligned: Add Note | 60s | Start Rest
- [ ] Proper spacing between elements (gap: 1rem between display and controls)
- [ ] Proper spacing between action links (gap: 0.75rem between Resume and Reset)
- [ ] Timer countdown displays correctly
- [ ] Timer state changes (ready → counting → paused → done) work
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] No visual regression on mobile
