# Workout Database Share Button Implementation Plan

## Summary

Add a "Share" button to the workout card dropdown menu on the workout-database.html page. When clicked, it opens the share offcanvas (from share-modal.js).

## Current State Analysis

### Files Involved

1. **[workout-database.html](../frontend/workout-database.html)** - Main page
   - Does NOT currently load `share-modal.js`
   - Needs script tag added

2. **[workout-card.js](../frontend/assets/js/components/workout-card.js)** - Reusable card component
   - `_renderDropdownMenu()` method builds menu items from `dropdownActions` config
   - Currently supports: `view`, `history`, `edit`, `duplicate`, `delete`
   - Needs 'share' action added to the menu rendering logic

3. **[workout-database.js](../frontend/assets/js/dashboard/workout-database.js)** - Page controller
   - Line 991: `dropdownActions: ['history', 'edit', 'duplicate', 'delete']`
   - Lines 961-987: `actions` array with handlers
   - Needs 'share' added to both

4. **[share-modal.js](../frontend/assets/js/components/share-modal.js)** - Share offcanvas component
   - Already exists with global `window.openShareModal(workoutId)` function
   - No changes needed

## Implementation Steps

### Step 1: Load share-modal.js in workout-database.html

Add the script tag after `workout-detail-offcanvas.js` (line 292):

```html
<script src="/static/assets/js/components/share-modal.js"></script>
```

### Step 2: Add 'share' to WorkoutCard dropdown rendering

In `_renderDropdownMenu()` method of [workout-card.js:77-145](../frontend/assets/js/components/workout-card.js#L77-L145), add handling for 'share' action after 'duplicate' (around line 121):

```javascript
if (dropdownActions.includes('share')) {
    menuItems += `
            <li>
                <a class="dropdown-item" href="javascript:void(0);" data-action="share">
                    <i class="bx bx-share-alt me-2"></i>Share
                </a>
            </li>`;
}
```

### Step 3: Add share click handler to WorkoutCard

In `_attachEventListeners()` method of [workout-card.js:433-501](../frontend/assets/js/components/workout-card.js#L433-L501), add handler for 'share' action (around line 472 after 'duplicate' handler):

```javascript
} else if (actionId === 'share') {
    // Share action from dropdown
    const shareAction = this.config.actions.find(a => a.id === 'share');
    if (shareAction && shareAction.onClick) {
        shareAction.onClick(this.workout);
    }
}
```

### Step 4: Add 'share' to workout-database.js config

In `initSharedComponents()` function in [workout-database.js:961-996](../frontend/assets/js/dashboard/workout-database.js#L961-L996):

1. Add share action to the `actions` array (after duplicate, around line 987):
```javascript
{
    id: 'share',
    label: 'Share',
    icon: 'bx-share-alt',
    variant: 'outline-secondary',
    onClick: (workout) => shareWorkout(workout.id)
}
```

2. Add 'share' to `dropdownActions` array (line 991):
```javascript
dropdownActions: ['history', 'edit', 'duplicate', 'share', 'delete'],
```

### Step 5: Add shareWorkout helper function

Add to [workout-database.js](../frontend/assets/js/dashboard/workout-database.js) after `duplicateWorkout` function:

```javascript
/**
 * Share workout - Opens share offcanvas
 */
function shareWorkout(workoutId) {
    console.log('🔗 Sharing workout:', workoutId);

    if (window.openShareModal) {
        window.openShareModal(workoutId);
    } else {
        console.error('❌ Share modal not available');
        alert('Share functionality not available');
    }
}
```

## Menu Order

The dropdown menu will show items in this order (matching the logical flow):
1. **History** - View past sessions
2. **Edit** - Modify the workout
3. **Duplicate** - Copy the workout
4. **Share** - Share with others
5. ---divider---
6. **Delete** - Remove workout (danger action)

## Files to Modify

| File | Change |
|------|--------|
| `frontend/workout-database.html` | Add `<script>` for share-modal.js |
| `frontend/assets/js/components/workout-card.js` | Add 'share' to `_renderDropdownMenu()` and `_attachEventListeners()` |
| `frontend/assets/js/dashboard/workout-database.js` | Add share action/handler, update dropdownActions |

## Testing Checklist

- [ ] Share button appears in workout card dropdown menu
- [ ] Clicking Share opens the share offcanvas
- [ ] Share offcanvas shows correct workout data
- [ ] Public sharing works (creates share link)
- [ ] Private sharing works (creates private link)
- [ ] Copy to clipboard works for share URLs
- [ ] No console errors on page load
- [ ] No console errors when clicking Share
