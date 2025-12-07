# Bonus Exercise Offcanvas - Bootstrap Scroll Error Analysis

## Error Details

**Error Message:**
```
Uncaught TypeError: Cannot read properties of null (reading 'scroll')
    at completeCallBack (bootstrap.esm.js:3353:30)
```

**Stack Trace:**
- Occurs during Bootstrap offcanvas transition
- Triggered when `offcanvas.show()` is called
- Happens in Bootstrap's internal `completeCallBack` function

## Root Cause

Bootstrap's Offcanvas component tries to access scroll-related properties during the show transition, but the element reference becomes null or undefined. This happens because:

1. **Dynamic Element Creation**: The offcanvas is created dynamically and immediately shown
2. **Timing Issue**: Bootstrap's transition callback fires before the element is fully ready
3. **Scroll Configuration**: Even with `data-bs-scroll="false"`, Bootstrap still tries to access scroll properties

## Current Implementation (Lines 620-626)

```javascript
const offcanvasHtml = `
    <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-tall"
         tabindex="-1"
         id="bonusExerciseOffcanvas"
         aria-labelledby="bonusExerciseOffcanvasLabel"
         aria-modal="true"
         role="dialog"
         data-bs-scroll="false">
```

## Bootstrap's Internal Issue

Looking at the error location (`bootstrap.esm.js:3353`), Bootstrap is trying to:
1. Complete the show transition
2. Access scroll properties on the body or offcanvas element
3. Restore scroll position after showing

The null reference occurs because Bootstrap's internal state management loses track of the element during rapid creation/show operations.

## Solution Strategy

### Option 1: Add Delay Before Show (RECOMMENDED)
Add a small delay between element creation and showing to ensure DOM is ready:

```javascript
// After creating offcanvas
setTimeout(() => {
    offcanvas.show();
}, 50);
```

### Option 2: Ensure Body Scroll Lock
Explicitly set body scroll properties before showing:

```javascript
// Before showing offcanvas
document.body.style.overflow = 'hidden';
document.body.style.paddingRight = '0px';
```

### Option 3: Use requestAnimationFrame
Use browser's animation frame to ensure DOM is painted:

```javascript
requestAnimationFrame(() => {
    offcanvas.show();
});
```

### Option 4: Add Explicit Scroll Container
Ensure the offcanvas body has explicit scroll handling:

```html
<div class="offcanvas-body" style="overflow-y: auto; -webkit-overflow-scrolling: touch;">
```

## Recommended Fix

Combine Options 1 and 4 for maximum compatibility:

1. Add explicit overflow styling to offcanvas body
2. Use `requestAnimationFrame` for showing (more reliable than setTimeout)
3. Keep `data-bs-scroll="false"` to prevent body scroll

## Implementation Plan

1. ✅ Update `createOffcanvas()` method to use `requestAnimationFrame`
2. ✅ Add explicit overflow styling to bonus exercise offcanvas body
3. ✅ Test on multiple browsers and devices
4. ✅ Verify no regression in other offcanvas types

## Testing Checklist

- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)
- [ ] Multiple rapid opens/closes
- [ ] With and without previous exercises
- [ ] With autocomplete dropdown active

## Related Files

- `frontend/assets/js/components/unified-offcanvas-factory.js` (lines 1112-1177)
- `frontend/assets/css/components/bonus-exercise-offcanvas.css`

## References

- Bootstrap Offcanvas Documentation: https://getbootstrap.com/docs/5.3/components/offcanvas/
- Similar Issue: https://github.com/twbs/bootstrap/issues/37474
- Scroll Lock Best Practices: https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/