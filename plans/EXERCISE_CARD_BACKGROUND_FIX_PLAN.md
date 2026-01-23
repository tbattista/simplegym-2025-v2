# Exercise Card Background Fix Plan

## Problem Statement

When a user clicks on an exercise card in workout-mode, the card expands but also changes to a gray/light-blue background color. The user does not want any background color change when clicking - the card should simply expand without visual state changes to the background.

## Root Cause Analysis

### CSS Rules Causing the Gray Background

The background change is triggered by the `.expanded` class being added to `.workout-card`. Three CSS rules in `_card-base.css` apply backgrounds:

1. **Line 90-92 - Header hover state:**
   ```css
   .workout-card-header:hover {
       background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
   }
   ```

2. **Line 94-97 - Expanded header state:**
   ```css
   .workout-card.expanded .workout-card-header {
       background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
       cursor: default;
   }
   ```

3. **Line 314-317 - Expanded body state:**
   ```css
   .workout-card.expanded .workout-card-body {
       display: block;
       background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
   }
   ```

### JavaScript Trigger

**File:** `exercise-card-renderer.js` (line 80)

```javascript
onclick="if(!event.target.closest('.workout-more-btn, .workout-edit-btn, .workout-menu, .inline-rest-timer')) this.classList.toggle('expanded')"
```

The click handler toggles the `expanded` class, which triggers the CSS rules above.

## Proposed Solution

Remove the background color changes from both hover and expanded states while keeping other functionality (cursor change, chevron rotation, body display toggle).

### Changes Required

**File:** `frontend/assets/css/workout-mode/_card-base.css`

#### Change 1: Remove hover background (lines 90-92)
```css
/* BEFORE */
.workout-card-header:hover {
    background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
}

/* AFTER */
.workout-card-header:hover {
    /* No background change on hover */
}
```

#### Change 2: Remove expanded header background (lines 94-97)
```css
/* BEFORE */
.workout-card.expanded .workout-card-header {
    background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
    cursor: default;
}

/* AFTER */
.workout-card.expanded .workout-card-header {
    cursor: default;
}
```

#### Change 3: Remove expanded body background (lines 314-317)
```css
/* BEFORE */
.workout-card.expanded .workout-card-body {
    display: block;
    background: var(--workout-status-active, rgba(99, 102, 241, 0.06));
}

/* AFTER */
.workout-card.expanded .workout-card-body {
    display: block;
}
```

## What Will Still Work

- Card border changes to accent color on hover and when expanded (keeps visual feedback)
- Chevron rotates when expanded
- Card body shows/hides correctly
- Logged state (green left border + subtle green background) still works
- Skipped state (yellow left border + subtle yellow background) still works

## Files to Modify

| File | Change |
|------|--------|
| `frontend/assets/css/workout-mode/_card-base.css` | Remove background from hover and expanded states |

## Implementation Steps

1. Open `frontend/assets/css/workout-mode/_card-base.css`
2. Remove or comment out `background` property from `.workout-card-header:hover` (line 91)
3. Remove `background` property from `.workout-card.expanded .workout-card-header` (line 95)
4. Remove `background` property from `.workout-card.expanded .workout-card-body` (line 316)
5. Test by clicking cards in workout mode - they should expand without background change
6. Verify logged/skipped states still show their backgrounds correctly

## Risk Assessment

**Low Risk** - This is a CSS-only change that removes visual styling. No JavaScript logic changes required. The logged/skipped states use different CSS variables (`--workout-status-logged` and `--workout-status-skipped`) so they won't be affected.

## Verification Checklist

- [ ] Click on a card - expands without gray background
- [ ] Click again - collapses without visual artifacts
- [ ] Hover over collapsed card - no background change
- [ ] Logged exercise cards still show green-tinted background
- [ ] Skipped exercise cards still show yellow-tinted background
- [ ] Border accent color still appears on hover/expanded
- [ ] Chevron still rotates when expanded
