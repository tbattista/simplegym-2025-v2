# Phase 2: Skip Button Layout Guide

## New 2x3 Button Grid Layout

The skip button is now integrated into the exercise card's button grid, creating a 2x3 layout when a workout session is active.

### Visual Layout

**During Active Workout Session:**

```
┌─────────────────────────────────────────────────────────┐
│ Bench Press                              [135 lbs]      │
│ 3 × 8-12 • Rest: 60s                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Rest: 60s    │ [Start Rest] │   [Skip]     │  Row 1 │
│  ├──────────────┼──────────────┼──────────────┤        │
│  │ [Edit Weight]│    [Next]    │   (empty)    │  Row 2 │
│  └──────────────┴──────────────┴──────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**After Skipping Exercise:**

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Bench Press                           [135 lbs]      │ ← Grayed out
│ 3 × 8-12 • Rest: 60s                                    │
├─────────────────────────────────────────────────────────┤
│ ⚠️ Exercise Skipped                                     │
│ Equipment unavailable                                    │
│                                                          │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Rest: 60s    │ [Start Rest] │  [Unskip]    │  Row 1 │
│  ├──────────────┼──────────────┼──────────────┤        │
│  │ [Edit Weight]│    [Next]    │   (empty)    │  Row 2 │
│  └──────────────┴──────────────┴──────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Before Starting Workout (No Session Active):**

```
┌─────────────────────────────────────────────────────────┐
│ Bench Press                              [135 lbs]      │
│ 3 × 8-12 • Rest: 60s                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Rest: 60s    │ [Start Rest] │   (empty)    │  Row 1 │
│  ├──────────────┼──────────────┼──────────────┤        │
│  │ [Edit Weight]│    [Next]    │   (empty)    │  Row 2 │
│  └──────────────┴──────────────┴──────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Button Grid Positions

### Row 1 (Top Row)
- **Column 1:** Rest Timer Label (shows "Rest: 60s")
- **Column 2:** Start Rest Button (rendered by timer component)
- **Column 3:** Skip/Unskip Button (only visible during active session)

### Row 2 (Bottom Row)
- **Column 1:** Edit Weight Button
- **Column 2:** Next/End Button
- **Column 3:** Empty placeholder (for grid alignment)

## CSS Classes

### Grid Container
```css
.workout-button-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;      /* Default 2x2 */
    grid-template-rows: auto auto;
    gap: 0.5rem;
    margin-top: 1rem;
}

.workout-button-grid-2x3 {
    grid-template-columns: 1fr 1fr 1fr;  /* 2x3 with skip button */
}
```

### Button Styling
```css
.workout-grid-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    padding: 0.5rem;
    font-weight: 500;
    white-space: nowrap;
    border-radius: 8px;
    transition: all 0.2s ease;
    min-height: 44px;
    height: 44px;
}
```

### Skip Button Specific
```css
/* Skip button - orange outline */
.btn-outline-warning.workout-grid-btn {
    border-color: var(--bs-warning);
    color: var(--bs-warning);
}

/* Unskip button - solid orange */
.btn-warning.workout-grid-btn {
    background-color: var(--bs-warning);
    border-color: var(--bs-warning);
    color: white;
}
```

## Implementation Details

### HTML Structure (from exercise-card-renderer.js)

```html
<div class="workout-button-grid workout-button-grid-2x3">
    <!-- Row 1, Column 1: Rest Timer -->
    <div class="rest-timer-grid-label">
        <div class="rest-timer" data-rest-seconds="60" data-timer-id="timer-0"></div>
    </div>
    
    <!-- Row 1, Column 2: Start Rest Button -->
    <div class="rest-timer-button-slot"></div>
    
    <!-- Row 1, Column 3: Skip Button (conditional) -->
    <button class="btn btn-outline-warning workout-grid-btn"
            onclick="window.workoutModeController.handleSkipExercise('Bench Press', 0);">
        <i class="bx bx-skip-next me-1"></i>Skip
    </button>
    
    <!-- Row 2, Column 1: Edit Weight -->
    <button class="btn btn-outline-primary workout-grid-btn">
        <i class="bx bx-edit-alt me-1"></i>Edit Weight
    </button>
    
    <!-- Row 2, Column 2: Next -->
    <button class="btn btn-primary workout-grid-btn">
        Next<i class="bx bx-right-arrow-alt ms-1"></i>
    </button>
    
    <!-- Row 2, Column 3: Empty Placeholder -->
    <div class="workout-grid-btn-placeholder"></div>
</div>
```

## Responsive Behavior

### Desktop (> 768px)
- Full 2x3 grid layout
- All buttons clearly visible
- Adequate spacing between buttons

### Mobile (≤ 768px)
- Grid maintains 2x3 layout
- Buttons may have slightly smaller text
- Touch-friendly 44px minimum height maintained

## User Flow

1. **User starts workout** → Skip button appears in Row 1, Column 3
2. **User clicks Skip** → Skip reason modal opens
3. **User enters reason (optional)** → Confirms skip
4. **Exercise is skipped** → Card grays out, Skip button changes to Unskip
5. **User can unskip** → Click Unskip button to restore exercise
6. **Workout completes** → Skipped exercises saved with reasons

## Advantages of This Layout

1. **Always Visible:** Skip button is part of the main button grid, not hidden in header
2. **Consistent Position:** Always in the same location (Row 1, Column 3)
3. **Clear Hierarchy:** Grouped with other workout actions
4. **Touch-Friendly:** Large button size (44px height) for mobile
5. **Visual Balance:** 2x3 grid provides good visual structure
6. **Conditional Display:** Only shows when session is active, keeping UI clean

## Testing Checklist

- [ ] Skip button appears in Row 1, Column 3 when session starts
- [ ] Skip button hidden when no active session
- [ ] Skip button changes to Unskip after skipping
- [ ] Grid layout maintains proper spacing
- [ ] Buttons are touch-friendly on mobile
- [ ] All buttons remain accessible and clickable
- [ ] Grid adapts properly to different screen sizes

## Files Modified

1. [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:128-177)
   - Changed from 2x2 to 2x3 grid
   - Added skip button in Row 1, Column 3
   - Added placeholder in Row 2, Column 3

2. [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css:283-299)
   - Added `.workout-button-grid-2x3` class
   - Added `.workout-grid-btn-placeholder` class
   - Maintained existing button styling