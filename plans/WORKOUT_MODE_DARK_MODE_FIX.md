# Workout Mode Dark Mode Fix

## Issue
Exercise cards on the workout mode page were displaying with white backgrounds in dark mode instead of the proper dark theme colors.

## Root Cause
The `.exercise-card` and `.exercise-card-body` base styles were missing explicit `background` properties, causing them to inherit the default white background instead of using the theme-aware `var(--bs-card-bg)` variable.

## Solution

### Changes Made

#### 1. Added Background to Exercise Card Base Style
**File:** [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css:205)

**Line 205 - Added:**
```css
.exercise-card {
    margin-bottom: 1rem;
    background: var(--bs-card-bg);  /* ← ADDED */
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 2px 6px 0 rgba(67, 89, 113, 0.12);
}
```

#### 2. Added Background to Exercise Card Body
**File:** [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css:370)

**Line 370 - Added:**
```css
.exercise-card-body {
    padding: 1.25rem;
    background: var(--bs-card-bg);  /* ← ADDED */
    animation: slideDown 0.3s ease;
    border-radius: 0 0 8px 8px;  /* ← ADDED for proper rounded corners */
}
```

#### 3. Added Dark Theme Override for Card Body
**File:** [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css:717)

**Line 717 - Added:**
```css
[data-bs-theme="dark"] .exercise-card-body {
    background: var(--bs-gray-900);
}
```

## How It Works

### Theme-Aware Variables
The fix uses Bootstrap's theme-aware CSS variables:

**Light Theme:**
- `var(--bs-card-bg)` → White background
- Cards display with light backgrounds

**Dark Theme:**
- `var(--bs-card-bg)` → Dark gray background (`var(--bs-gray-900)`)
- Cards display with dark backgrounds
- Existing dark theme overrides (lines 696-713) now work properly

### Existing Dark Theme Styles
The dark theme styles were already defined but weren't working because the base styles lacked the `background` property:

```css
[data-bs-theme="dark"] .exercise-card {
    background: var(--bs-gray-900);  /* This now overrides the base */
    border-color: var(--bs-gray-700);
}

[data-bs-theme="dark"] .exercise-card:hover {
    border-color: var(--bs-primary);
    background: var(--bs-gray-800);
}

[data-bs-theme="dark"] .exercise-card-header {
    background: var(--bs-gray-900);
    border-color: var(--bs-gray-700);
}
```

## Visual Result

### Before Fix
```
Dark Mode:
┌─────────────────────────┐
│ Exercise Card Header    │ ← Dark (worked)
├─────────────────────────┤
│ WHITE CARD BODY         │ ← WHITE (broken) ❌
│ Content...              │
└─────────────────────────┘
```

### After Fix
```
Dark Mode:
┌─────────────────────────┐
│ Exercise Card Header    │ ← Dark
├─────────────────────────┤
│ Dark Card Body          │ ← Dark (fixed) ✅
│ Content...              │
└─────────────────────────┘
```

## Benefits

1. **Proper Dark Mode Support:** Exercise cards now display correctly in dark mode
2. **Theme Consistency:** Uses Bootstrap's theme-aware variables for automatic theme switching
3. **Better UX:** No more jarring white cards in dark mode
4. **Maintainability:** Uses standard Bootstrap patterns that work with theme toggles

## Testing

To verify the fix:

1. **Light Theme:**
   - Navigate to workout mode page
   - Verify cards have white/light backgrounds
   - Check that all card sections are visible

2. **Dark Theme:**
   - Toggle to dark theme
   - Navigate to workout mode page
   - Verify cards have dark gray backgrounds
   - Check that text is readable
   - Verify hover states work correctly

3. **Theme Switching:**
   - Toggle between light and dark themes
   - Verify cards update immediately
   - Check that no white flashes occur

## Related Files

- [`frontend/assets/css/workout-mode.css`](frontend/assets/css/workout-mode.css) - Main workout mode styles
- [`frontend/workout-mode.html`](frontend/workout-mode.html) - Workout mode page

## Related Issues

This fix complements the popover styling standardization completed earlier:
- [Workout Mode Popover Styling Implementation](WORKOUT_MODE_POPOVER_STYLING_IMPLEMENTATION.md)
- [Workout Mode Popover Styling Plan](WORKOUT_MODE_POPOVER_STYLING_PLAN.md)