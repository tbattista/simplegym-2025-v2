# Plan: Fix Vertical Alignment of Notes + Timer Toolbar

## Analysis

### Current Problem
The "Add Note" button, timer display (58s), "Resume" link, and "Reset" link are **not vertically aligned**. Looking at the screenshot, you can see the elements sit at different vertical positions.

### Root Cause
The HTML structure has **nested flex containers** with inconsistent alignment:

```
workout-notes-timer-row (flex, align-items: center)
├── workout-notes-col
│   └── workout-note-toggle-btn (flex, align-items: center) ✓
└── workout-timer-col
    └── inline-rest-timer (flex, align-items: center)
        └── div (inline style: display: flex; align-items: center) ← NESTED
            ├── div[data-inline-timer-display] → contains <strong><i>58s</strong>
            └── div[data-inline-timer] → contains <a>Resume</a> <a>Reset</a>
```

**Issues:**
1. The `inline-rest-timer` wraps another `<div style="display: flex">` - unnecessary nesting
2. The timer display div contains `<strong>` with an icon - the icon and text may have different baselines
3. The action links (Resume, Reset) are rendered as sibling `<a>` elements inside one div without explicit alignment
4. The `bx-sm` icon class may have different sizing than the note button icon

### Current HTML (Rendered - Paused State)
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
                    <strong class="text-warning"><i class="bx bx-pause me-1"></i>58s</strong>
                </div>
                <div data-inline-timer="0">
                    <a class="inline-timer-link text-primary">Resume</a>
                    <a class="inline-timer-action ms-2">Reset</a>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

## Proposed Solution

### Option A: CSS-Only Fix (Recommended)
Fix alignment through CSS without changing the HTML/JS structure:

1. Remove the inline style from JS and control all layout via CSS
2. Ensure all elements use the same `align-items: center` baseline
3. Make icons consistent size across all elements
4. Add `display: flex` and `align-items: center` to the timer controls container

### Option B: Refactor HTML Structure
Flatten the nesting to have a single flex row with all items as direct children. This would require JS changes.

**Recommendation:** Option A - CSS-only fix is simpler and less risky.

---

## Implementation Plan (Option A)

### Step 1: Update `_timer.css` - Fix Inner Container Alignment

Add CSS to override the inline style and ensure proper alignment of all timer elements.

**File:** `frontend/assets/css/workout-mode/_timer.css`

**Add after `.inline-rest-timer` styles:**

```css
/* Inner flex container (override inline style) */
.inline-rest-timer > div {
    display: flex !important;
    align-items: center !important;
    gap: 0.5rem;
}

/* Timer display element */
.inline-rest-timer [data-inline-timer-display] {
    display: flex;
    align-items: center;
}

.inline-rest-timer [data-inline-timer-display] strong {
    display: flex;
    align-items: center;
}

/* Timer controls container */
.inline-rest-timer [data-inline-timer] {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
```

### Step 2: Ensure Consistent Icon Sizing

**File:** `frontend/assets/css/workout-mode/_timer.css`

Update the `.inline-timer-link` and `.inline-timer-action` to have consistent icon sizing with the note button.

```css
.inline-timer-link i,
.inline-timer-action i {
    font-size: 1rem;  /* Match note button icon */
    line-height: 1;
}
```

### Step 3: Update Note Button Icon for Consistency

**File:** `frontend/assets/css/workout-mode/_notes.css`

Ensure the note button icon has `line-height: 1` for proper alignment:

```css
.workout-notes-timer-row .workout-note-toggle-btn i {
    font-size: 1rem;
    line-height: 1;
}
```

### Step 4: (Optional) Remove Inline Style from JS

**File:** `frontend/assets/js/components/exercise-card-renderer.js`

Remove the inline `style` attribute since CSS now controls the layout:

**From (line 526):**
```javascript
<div style="display: flex; align-items: center; justify-content: space-between;">
```

**To:**
```javascript
<div class="inline-rest-timer-inner">
```

Then add CSS for `.inline-rest-timer-inner` (or rely on the `> div` selector).

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/css/workout-mode/_timer.css` | Add alignment CSS for inner containers, fix icon sizing |
| `frontend/assets/css/workout-mode/_notes.css` | Add `line-height: 1` to note button icon |
| `frontend/assets/js/components/exercise-card-renderer.js` | (Optional) Remove inline style |

---

## Risks & Considerations

1. **Using `!important`**: The inline style on the inner div requires `!important` to override. Alternatively, we can remove the inline style from JS (Step 4).

2. **Icon Baseline**: Boxicons (`bx`) icons may have padding/margin affecting alignment. Using `line-height: 1` and `display: flex` with `align-items: center` on parent containers should resolve this.

3. **Multiple Timer States**: The timer has 4 states (ready, counting, paused, done) with different content. All need to align consistently.

---

## Testing Checklist

- [ ] "Add Note" button aligns with timer in **ready** state (60s + Start Rest)
- [ ] "Add Note" button aligns with timer in **counting** state (58s + Pause)
- [ ] "Add Note" button aligns with timer in **paused** state (58s + Resume + Reset)
- [ ] "Add Note" button aligns with timer in **done** state (Done! + Restart)
- [ ] Icons are same size across all elements
- [ ] Works in both light and dark mode
- [ ] Works on mobile viewport
