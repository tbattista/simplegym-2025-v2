# Plan: Move Cancel Button from Nav Bar to More Menu

## Overview
This document outlines the plan to move the cancel button from the bottom action bar to the more menu in the workout-builder.html page.

## Current Implementation
1. The cancel button is currently in the bottom action bar (left side) as configured in `bottom-action-bar-config.js` (lines 157-167).
2. The cancel functionality is implemented in the `cancelEditWorkout()` function in `workout-editor.js` (lines 440-482).
3. The "More" menu is also in the bottom action bar (right side) and opens the "moreMenuOffcanvas" offcanvas.
4. The More Menu Offcanvas currently only contains a "Delete Workout" option.

## Tasks to Complete

### Task 1: Remove the cancel button from the bottom action bar configuration
- File: `frontend/assets/js/config/bottom-action-bar-config.js`
- Action: Remove the cancel button from the leftActions array in the 'workout-builder' configuration
- Details: Remove the object with icon: 'bx-x', label: 'Cancel', title: 'Cancel editing' (lines 157-167)

### Task 2: Add a cancel option to the More Menu Offcanvas in workout-builder.html
- File: `frontend/workout-builder.html`
- Action: Add a new menu item for cancel in the moreMenuOffcanvas, positioned above the delete button
- Details: Add a new div with class "more-menu-item" and id "cancelWorkoutMenuItem" before the delete workout menu item (around line 462)

### Task 3: Update workout-editor.js to handle the new cancel menu item click
- File: `frontend/assets/js/components/workout-editor.js`
- Action: Add an event listener for the new cancel menu item
- Details: Similar to the delete workout menu item listener (lines 745-771), add a new listener for the cancel menu item

### Task 4: Test the changes
- Action: Verify that the cancel functionality works correctly from the more menu
- Details: Test both the cancel and delete functionality to ensure they work as expected

## Implementation Details

### Task 1: Remove cancel button from bottom action bar
```javascript
// In frontend/assets/js/config/bottom-action-bar-config.js
// Remove this entire section from leftActions:
{
    icon: 'bx-x',
    label: 'Cancel',
    title: 'Cancel editing',
    action: function() {
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.click();
        }
    }
},
```

### Task 2: Add cancel option to More Menu Offcanvas
```html
<!-- In frontend/workout-builder.html, add before the delete workout menu item -->
<div class="more-menu-item" id="cancelWorkoutMenuItem">
    <i class="bx bx-x"></i>
    <div class="more-menu-item-content">
        <div class="more-menu-item-title">Cancel Edit</div>
        <small class="more-menu-item-description">Discard changes and exit</small>
    </div>
</div>
```

### Task 3: Update workout-editor.js
```javascript
// In frontend/assets/js/components/workout-editor.js, add after the delete workout menu item listener
// NEW: More Menu - Cancel Workout Item
const cancelWorkoutMenuItem = document.getElementById('cancelWorkoutMenuItem');
if (cancelWorkoutMenuItem) {
    cancelWorkoutMenuItem.addEventListener('click', () => {
        console.log('❌ Cancel workout menu item clicked');
        
        // Close more menu offcanvas first
        const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
        if (moreMenuOffcanvas) {
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }
        }
        
        // Trigger cancel after offcanvas closes (300ms animation)
        setTimeout(() => {
            if (window.cancelEditWorkout) {
                window.cancelEditWorkout();
            } else {
                console.error('❌ cancelEditWorkout function not found');
            }
        }, 300);
    });
    console.log('✅ Cancel workout menu item listener attached');
} else {
    console.warn('⚠️ Cancel workout menu item not found in DOM');
}
```

## Expected Outcome
After these changes:
1. The cancel button will no longer appear in the bottom action bar
2. The cancel option will be available in the more menu, positioned above the delete option
3. The cancel functionality will work exactly as before, just accessed from a different location
4. The user experience will be more streamlined with related actions grouped together in the more menu