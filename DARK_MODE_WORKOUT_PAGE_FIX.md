# Dark Mode Workout Page Fix

## Issue Summary
The workout pages had sections that were not properly switching to dark mode. Specifically, the workout library section, search box, and editor section backgrounds remained white in dark mode.

## Root Cause
The issue was caused by **inline styles using CSS variables** in [`workouts.html`](frontend/workouts.html:96). While CSS variables (`--bs-card-bg`, `--bs-body-bg`) are updated by the theme manager, inline styles have higher specificity than CSS classes, which prevented proper dark mode styling from being applied.

### Problematic Code (Before):
```html
<!-- Line 96 -->
<div id="workoutLibrarySection" class="card mb-3" style="background: var(--bs-card-bg);">

<!-- Line 119 -->
<div class="card mb-3" style="background: var(--bs-body-bg); border: 1px solid var(--bs-border-color);">

<!-- Line 161 -->
<div class="card" style="background: var(--bs-card-bg);">
```

## Solution Implemented

### 1. Removed Inline Styles from HTML
Replaced inline styles with semantic CSS classes in [`workouts.html`](frontend/workouts.html):

```html
<!-- Line 96 - Workout Library Section -->
<div id="workoutLibrarySection" class="card mb-3 workout-library-card">

<!-- Line 119 - Search Box -->
<div class="card mb-3 workout-search-card">

<!-- Line 161 - Workout Editor Section -->
<div class="card workout-editor-card">
```

### 2. Added CSS Rules in workout-builder.css
Added proper light and dark mode styles in [`workout-builder.css`](frontend/assets/css/workout-builder.css:748):

```css
/* Light Mode Styles */
.workout-library-card {
    background: var(--bs-card-bg);
}

.workout-search-card {
    background: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
}

.workout-editor-card {
    background: var(--bs-card-bg);
}

/* Dark Mode Overrides */
[data-bs-theme="dark"] .workout-library-card {
    background: #1e293b !important;
    border-color: #475569;
}

[data-bs-theme="dark"] .workout-search-card {
    background: #0f172a !important;
    border-color: #475569 !important;
}

[data-bs-theme="dark"] .workout-editor-card {
    background: #1e293b !important;
    border-color: #475569;
}
```

## Why This Works

1. **Semantic Classes**: Using descriptive class names (`.workout-library-card`, `.workout-search-card`, `.workout-editor-card`) makes the code more maintainable and allows for proper CSS specificity.

2. **CSS Variables in Stylesheets**: CSS variables work correctly when defined in stylesheets rather than inline styles, as they can be properly overridden by dark mode selectors.

3. **!important for Dark Mode**: The `!important` flag ensures dark mode styles override any other conflicting rules, including Bootstrap's default styles.

4. **Proper Color Hierarchy**: 
   - `#0f172a` (darker) for search box background
   - `#1e293b` (medium) for card backgrounds
   - `#475569` for borders

## Best Practices Going Forward

### ❌ DON'T:
```html
<!-- Avoid inline styles with CSS variables -->
<div style="background: var(--bs-card-bg);">
```

### ✅ DO:
```html
<!-- Use semantic CSS classes -->
<div class="workout-library-card">
```

```css
/* Define styles in CSS files */
.workout-library-card {
    background: var(--bs-card-bg);
}

[data-bs-theme="dark"] .workout-library-card {
    background: #1e293b !important;
}
```

## Testing Checklist

- [x] Workout library section switches to dark background
- [x] Search box switches to darker background
- [x] Workout editor section switches to dark background
- [x] All text remains readable in both modes
- [x] Borders are visible in both modes
- [x] No white flashes when toggling themes

## Files Modified

1. [`frontend/workouts.html`](frontend/workouts.html) - Removed inline styles, added semantic classes
2. [`frontend/assets/css/workout-builder.css`](frontend/assets/css/workout-builder.css) - Added light/dark mode CSS rules

## Related Documentation

- [DARK_MODE_IMPLEMENTATION_COMPLETE.md](DARK_MODE_IMPLEMENTATION_COMPLETE.md) - Original dark mode implementation
- [Theme Manager Service](frontend/assets/js/services/theme-manager.js) - Theme switching logic

## Date
2025-01-03