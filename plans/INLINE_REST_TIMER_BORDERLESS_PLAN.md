# Plan: Remove Bounding Box from Inline Rest Timer

## Analysis

### Current State
The inline rest timer in the exercise card expanded body currently has a **bounding box** with:
- Background: `var(--workout-bg)`
- Border: `1px solid var(--workout-border)`
- Border-radius: `0.5rem`
- Padding: `0.75rem 1rem`

This creates a visible container/card effect around the rest timer.

### Target State (from screenshot)
The rest timer should appear as **simple inline elements** without a bounding box:
- **Left side**: Time display (e.g., "60s") with clock icon
- **Right side**: "Start Rest" link with play icon
- No background, no border, no padding container
- Clean integration with the Notes + Timer row layout

### Files Involved
1. **[_timer.css](frontend/assets/css/workout-mode/_timer.css)** - Contains `.inline-rest-timer` styling with border/background
2. **[exercise-card-renderer.js](frontend/assets/js/components/exercise-card-renderer.js:521-536)** - Renders the timer HTML structure

### Current HTML Structure (rendered)
```html
<div class="inline-rest-timer" data-rest-seconds="60" data-rest-display="60s">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div data-inline-timer-display="0">
            <strong><i class="bx bx-time-five me-1"></i>60s</strong>
        </div>
        <div data-inline-timer="0">
            <!-- Timer controls rendered by InlineRestTimer -->
        </div>
    </div>
</div>
```

---

## Proposed Solution

Remove the bounding box by:
1. Setting `.inline-rest-timer` background to transparent
2. Removing the border
3. Removing the padding (or making it minimal)
4. Ensuring the layout still works within `.workout-timer-col`

---

## Implementation Plan

### Step 1: Update `_timer.css` - Remove Bounding Box
**File:** `frontend/assets/css/workout-mode/_timer.css`

**Change:** Lines 13-18

**From:**
```css
.inline-rest-timer {
    background: var(--workout-bg);
    border: 1px solid var(--workout-border);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
}
```

**To:**
```css
.inline-rest-timer {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
}
```

### Step 2: Update Dark Mode Styles
**File:** `frontend/assets/css/workout-mode/_timer.css`

**Change:** Lines 20-23

**From:**
```css
[data-bs-theme="dark"] .inline-rest-timer {
    background: var(--workout-dark-bg);
    border-color: var(--workout-dark-border);
}
```

**To:**
```css
[data-bs-theme="dark"] .inline-rest-timer {
    background: transparent;
    border-color: transparent;
}
```

### Step 3: Add Styling for Timer Link Elements (Missing)
**File:** `frontend/assets/css/workout-mode/_timer.css`

**Add after the READY STATE section (~line 38):**

```css
/* Inline timer links */
.inline-timer-link {
    color: var(--workout-accent);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
}

.inline-timer-link:hover {
    text-decoration: underline;
}

.inline-timer-link i {
    font-size: 1.125rem;
}

/* Secondary action link (reset) */
.inline-timer-action {
    color: var(--workout-muted);
    text-decoration: none;
    font-size: 0.8125rem;
    cursor: pointer;
}

.inline-timer-action:hover {
    color: var(--workout-accent);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/css/workout-mode/_timer.css` | Remove bounding box styles, add link styling |

---

## Risks & Considerations

1. **Layout Integrity**: Removing padding may affect the visual balance with the "Add Note" button on the left. The `.workout-notes-timer-row` flexbox should handle this, but we should verify alignment.

2. **Dark Mode**: Must ensure transparent styles work in both light and dark themes.

3. **Timer States**: The timer has multiple states (ready, counting, paused, done). All should look consistent without the bounding box.

4. **No JS Changes Required**: The HTML structure stays the same; only CSS styling changes.

---

## Testing Checklist

- [ ] Timer appears without bounding box in light mode
- [ ] Timer appears without bounding box in dark mode
- [ ] "Start Rest" link is clickable and styled correctly
- [ ] Timer countdown displays correctly when running
- [ ] Pause/Resume/Reset links display correctly
- [ ] "Done!" state displays correctly
- [ ] Timer aligns properly with "Add Note" button on the left
- [ ] Timer visual doesn't overlap or clip other card content
