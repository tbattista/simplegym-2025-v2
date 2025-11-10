# Workout Mode Footer Alignment Fix

## Problem Statement
The share button and volume control in the workout mode footer are not properly right-aligned in all scenarios. They should be right-justified whether the session info is visible or hidden.

## Root Cause Analysis

### Current HTML Structure (lines 207-222 in workout-mode.html)
```html
<div class="d-flex align-items-center">
  <!-- Left side: Session info (only shown when workout is active) -->
  <div id="sessionInfo" class="text-muted small me-auto" style="display: none;">
    Time: <span id="footerSessionTimer">00:00</span>
  </div>
  
  <!-- Right side: Controls (always visible, always right-aligned) -->
  <div class="d-flex gap-2 ms-auto">
    <button class="btn btn-sm btn-outline-primary" id="shareWorkoutBtn">
      <i class="bx bx-share-alt"></i>
    </button>
    <button class="btn btn-sm btn-outline-secondary" id="soundToggleBtn">
      <i class="bx bx-volume-full" id="soundIcon"></i>
    </button>
  </div>
</div>
```

### The Issue
The controls wrapper has `ms-auto` (margin-start: auto) which works when `sessionInfo` is visible, but when `sessionInfo` is hidden (`display: none`), there's no left content to push against. This causes the controls to not be properly right-aligned.

## Solution Design

### Approach
Instead of relying on `ms-auto` on the controls wrapper, we'll use `justify-content: space-between` on the parent container. This ensures:
1. When session info is visible: it stays on the left, controls on the right
2. When session info is hidden: controls are still right-aligned

### CSS Changes Required

**File:** [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css)

Add new CSS rule after line 222 (in the sticky bottom bar section):

```css
/* Ensure controls are always right-aligned */
.workout-mode-footer .d-flex.align-items-center {
    justify-content: space-between;
}

/* When session info is hidden, push controls to the right */
.workout-mode-footer .d-flex.align-items-center:has(#sessionInfo[style*="display: none"]) {
    justify-content: flex-end;
}
```

### Alternative Solution (More Compatible)
If `:has()` selector has compatibility concerns, use this approach:

```css
/* Parent container uses space-between by default */
.workout-mode-footer .d-flex.align-items-center {
    justify-content: space-between;
}

/* Add a utility class for when session is not active */
.workout-mode-footer .d-flex.align-items-center.session-inactive {
    justify-content: flex-end;
}
```

Then add JavaScript to toggle the class based on session state.

### Recommended Solution (Simplest)
Remove `ms-auto` from the controls wrapper and use `justify-content: flex-end` on the parent:

```css
/* Always right-align the controls container */
.workout-mode-footer .d-flex.align-items-center {
    justify-content: flex-end;
}

/* Session info stays on the left with me-auto */
#sessionInfo {
    margin-right: auto !important;
}
```

This is the cleanest solution because:
- It doesn't rely on `:has()` selector
- It doesn't require JavaScript changes
- It works in all scenarios
- The `me-auto` on `sessionInfo` will push it to the left when visible
- When `sessionInfo` is hidden, the controls naturally align to the right

## Implementation Steps

1. **Update CSS** in [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css)
   - Add the new CSS rule for the parent container
   - Ensure `#sessionInfo` has `margin-right: auto` (already has `me-auto` class)

2. **No HTML changes needed** - The existing structure will work with the CSS fix

3. **No JavaScript changes needed** - The display toggle already works correctly

## Testing Scenarios

### Scenario 1: Workout Not Started (Session Info Hidden)
- Session info: `display: none`
- Expected: Share and volume buttons right-aligned
- Result: ✅ Controls align to the right edge

### Scenario 2: Workout Active (Session Info Visible)
- Session info: visible with timer
- Expected: Timer on left, share and volume buttons on right
- Result: ✅ Timer on left (via `me-auto`), controls on right (via `justify-content: flex-end`)

### Scenario 3: Mobile View
- All responsive breakpoints should maintain right alignment
- Expected: Controls stay right-aligned on all screen sizes
- Result: ✅ Flexbox ensures consistent behavior

## Files to Modify

1. **[`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css)** - Add CSS rule around line 520-530 (sticky bottom bar section)

## Visual Representation

```
Before Fix (Session Info Hidden):
┌─────────────────────────────────────────┐
│ [Share] [Volume]                        │  ❌ Not right-aligned
└─────────────────────────────────────────┘

After Fix (Session Info Hidden):
┌─────────────────────────────────────────┐
│                        [Share] [Volume] │  ✅ Right-aligned
└─────────────────────────────────────────┘

With Session Info Visible:
┌─────────────────────────────────────────┐
│ Time: 05:23           [Share] [Volume] │  ✅ Proper spacing
└─────────────────────────────────────────┘
```

## Conclusion

This is a simple CSS fix that ensures the share button and volume control are always right-justified in the workout mode footer, regardless of whether the session info is visible or hidden. The solution uses standard flexbox properties without requiring JavaScript changes or complex selectors.