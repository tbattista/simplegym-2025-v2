# Plan: Move Share Button from Center Modal to Bottom Popover

## Overview
This document outlines the plan to move the share functionality from a center modal to a bottom popover in the workout-builder.html page, improving the look and feel to match other popovers like the more button.

## Current Implementation
1. The share functionality is currently implemented as a modal (`shareWorkoutModal`) that opens when the share button in the bottom action bar is clicked.
2. The share modal contains tabs for public and private sharing options.
3. The share button is currently in the bottom action bar (left side) as configured in `bottom-action-bar-config.js` (lines 167-190).

## Tasks to Complete

### Task 1: Create a Share Offcanvas (Bottom Popover)
- File: `frontend/workout-builder.html`
- Action: Create a new offcanvas element for share functionality, similar to the moreMenuOffcanvas
- Details: Add a new offcanvas with ID "shareMenuOffcanvas" after the existing moreMenuOffcanvas

### Task 2: Move Share Options to the New Offcanvas
- File: `frontend/workout-builder.html`
- Action: Adapt the share modal content to work in an offcanvas layout
- Details: Convert the modal tabs and forms to a more compact offcanvas-friendly design

### Task 3: Remove Share Button from Bottom Action Bar
- File: `frontend/assets/js/config/bottom-action-bar-config.js`
- Action: Remove the share button from the leftActions array in the 'workout-builder' configuration
- Details: Remove the object with icon: 'bx-share-alt', label: 'Share', title: 'Share workout'

### Task 4: Update Share Modal Component to Work with Offcanvas
- File: `frontend/assets/js/components/share-modal.js`
- Action: Modify the ShareModal class to work with an offcanvas instead of a modal
- Details: Update the createModalHTML method to create an offcanvas, and update related methods

### Task 5: Update Event Listeners for New Share Offcanvas
- File: `frontend/assets/js/components/workout-editor.js`
- Action: Update event listeners to work with the new share offcanvas
- Details: Add event listeners for the new share menu items

### Task 6: Test the Changes
- Action: Verify that the share functionality works correctly from the bottom popover
- Details: Test both public and private sharing options

## Implementation Details

### Task 1: Create a Share Offcanvas
```html
<!-- In frontend/workout-builder.html, add after moreMenuOffcanvas -->
<!-- Share Menu Offcanvas (Bottom) -->
<div class="offcanvas offcanvas-bottom" tabindex="-1"
     id="shareMenuOffcanvas"
     aria-labelledby="shareMenuLabel">
  
  <!-- Header -->
  <div class="offcanvas-header border-bottom">
    <h5 class="offcanvas-title" id="shareMenuLabel">
      <i class="bx bx-share-alt me-2"></i>
      Share Workout
    </h5>
    <button type="button" class="btn-close"
            data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>
  
  <!-- Body -->
  <div class="offcanvas-body p-0">
    <!-- Share options will be added here -->
  </div>
</div>
```

### Task 2: Move Share Options to the New Offcanvas
```html
<!-- In frontend/workout-builder.html, inside the shareMenuOffcanvas body -->
<div class="offcanvas-body p-0">
  <!-- Public Share Option -->
  <div class="more-menu-item" id="publicShareMenuItem">
    <i class="bx bx-globe"></i>
    <div class="more-menu-item-content">
      <div class="more-menu-item-title">Share Publicly</div>
      <small class="more-menu-item-description">Anyone can discover and save</small>
    </div>
  </div>
  
  <!-- Private Share Option -->
  <div class="more-menu-item" id="privateShareMenuItem">
    <i class="bx bx-link"></i>
    <div class="more-menu-item-content">
      <div class="more-menu-item-title">Create Private Link</div>
      <small class="more-menu-item-description">Only people with link can access</small>
    </div>
  </div>
</div>
```

### Task 3: Remove Share Button from Bottom Action Bar
```javascript
// In frontend/assets/js/config/bottom-action-bar-config.js
// Remove this entire section from leftActions:
{
    icon: 'bx-share-alt',
    label: 'Share',
    title: 'Share workout',
    action: function() {
        // Get current workout ID
        const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                        window.ghostGym?.workoutBuilder?.currentWorkout?.id;
        
        if (workoutId) {
            console.log('🔗 Opening share modal for workout:', workoutId);
            if (window.openShareModal) {
                window.openShareModal(workoutId);
            } else {
                console.error('❌ Share modal not available');
                alert('Share feature is loading. Please try again in a moment.');
            }
        } else {
            console.warn('⚠️ No workout ID available');
            alert('Please save the workout first before sharing');
        }
    }
},
```

### Task 4: Update Share Modal Component to Work with Offcanvas
```javascript
// In frontend/assets/js/components/share-modal.js
// Modify the createModalHTML method to create an offcanvas instead of a modal
createOffcanvasHTML() {
    const offcanvasHTML = `
        <div class="offcanvas offcanvas-bottom" tabindex="-1"
             id="${this.offcanvasId}" aria-hidden="true">
          
          <!-- Header -->
          <div class="offcanvas-header border-bottom">
            <h5 class="offcanvas-title" id="shareMenuLabel">
              <i class="bx bx-share-alt me-2"></i>
              Share Workout
            </h5>
            <button type="button" class="btn-close"
                    data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          
          <!-- Body -->
          <div class="offcanvas-body p-0">
            <!-- Public Share Option -->
            <div class="more-menu-item" id="publicShareMenuItem">
              <i class="bx bx-globe"></i>
              <div class="more-menu-item-content">
                <div class="more-menu-item-title">Share Publicly</div>
                <small class="more-menu-item-description">Anyone can discover and save</small>
              </div>
            </div>
            
            <!-- Private Share Option -->
            <div class="more-menu-item" id="privateShareMenuItem">
              <i class="bx bx-link"></i>
              <div class="more-menu-item-content">
                <div class="more-menu-item-title">Create Private Link</div>
                <small class="more-menu-item-description">Only people with link can access</small>
              </div>
            </div>
          </div>
        </div>
    `;

    // Remove existing offcanvas if present
    const existingOffcanvas = document.getElementById(this.offcanvasId);
    if (existingOffcanvas) {
        existingOffcanvas.remove();
    }

    // Add offcanvas to body
    document.body.insertAdjacentHTML('beforeend', offcanvasHTML);
}
```

### Task 5: Update Event Listeners for New Share Offcanvas
```javascript
// In frontend/assets/js/components/workout-editor.js, add after the cancel menu item listener
// NEW: Share Menu - Public Share Item
const publicShareMenuItem = document.getElementById('publicShareMenuItem');
if (publicShareMenuItem) {
    publicShareMenuItem.addEventListener('click', () => {
        console.log('🌐 Public share menu item clicked');
        
        // Close share menu offcanvas first
        const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
        if (shareMenuOffcanvas) {
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }
        }
        
        // Trigger public share after offcanvas closes (300ms animation)
        setTimeout(() => {
            if (window.shareModal && window.shareModal.handlePublicShare) {
                window.shareModal.handlePublicShare();
            } else {
                console.error('❌ shareModal.handlePublicShare function not found');
            }
        }, 300);
    });
    console.log('✅ Public share menu item listener attached');
} else {
    console.warn('⚠️ Public share menu item not found in DOM');
}

// NEW: Share Menu - Private Share Item
const privateShareMenuItem = document.getElementById('privateShareMenuItem');
if (privateShareMenuItem) {
    privateShareMenuItem.addEventListener('click', () => {
        console.log('🔗 Private share menu item clicked');
        
        // Close share menu offcanvas first
        const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
        if (shareMenuOffcanvas) {
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }
        }
        
        // Trigger private share after offcanvas closes (300ms animation)
        setTimeout(() => {
            if (window.shareModal && window.shareModal.handlePrivateShare) {
                window.shareModal.handlePrivateShare();
            } else {
                console.error('❌ shareModal.handlePrivateShare function not found');
            }
        }, 300);
    });
    console.log('✅ Private share menu item listener attached');
} else {
    console.warn('⚠️ Private share menu item not found in DOM');
}
```

## Expected Outcome
After these changes:
1. The share button will no longer appear in the bottom action bar
2. The share functionality will be accessible through a bottom popover (offcanvas) that matches the style of the more menu
3. Users will be able to choose between public and private sharing options from the bottom popover
4. The user experience will be more streamlined with consistent UI patterns across the application