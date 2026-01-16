# Workout Navigation Unification - Implementation Plan

## Overview
Unify all workout navigation to [`workout-builder.html`](frontend/workout-builder.html:1) to use URL parameters consistently, removing the dual sessionStorage/URL parameter approach.

## Current State Problems

### Inconsistent Navigation Methods
1. **Edit from workout-database** → Uses `sessionStorage`
2. **Edit from workout-mode** → Uses URL parameter `?id=`
3. **New workout FAB** → Uses URL parameter `?new=true`
4. **Shared workouts** → Uses URL parameters `?share_id=` or `?share_token=`
5. **Page refresh recovery** → Uses `localStorage` (this is correct and should remain)

### Issues
- Non-bookmarkable URLs when using sessionStorage
- Debugging complexity
- Inconsistent patterns across codebase
- Browser history doesn't work correctly for sessionStorage approach

## Proposed Solution

### Unified Approach: URL Parameters
All navigation to workout-builder should use URL parameters:
- **Edit existing workout**: `workout-builder.html?id={workoutId}`
- **Create new workout**: `workout-builder.html?new=true`
- **Shared workouts**: `workout-builder.html?share_id={id}` or `?share_token={token}`
- **Keep localStorage**: Only for refresh recovery (current behavior is correct)

### Benefits
1. ✅ Bookmarkable/shareable URLs
2. ✅ Transparent debugging via URL inspection
3. ✅ Browser history works correctly
4. ✅ Standard web application pattern
5. ✅ Consistent across all entry points

## Implementation Changes

### 1. Update [`workout-database.js`](frontend/assets/js/dashboard/workout-database.js:616-624)

**Current Code:**
```javascript
function editWorkout(workoutId) {
    console.log('📝 Editing workout:', workoutId);
    
    // Store workout ID in sessionStorage
    sessionStorage.setItem('editWorkoutId', workoutId);
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
}

function createNewWorkout() {
    console.log('➕ Creating new workout');
    
    // Clear any existing workout ID
    sessionStorage.removeItem('editWorkoutId');
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
}
```

**New Code:**
```javascript
function editWorkout(workoutId) {
    console.log('📝 Editing workout:', workoutId);
    
    // Navigate to workout-builder.html with URL parameter
    window.location.href = `workout-builder.html?id=${workoutId}`;
}

function createNewWorkout() {
    console.log('➕ Creating new workout');
    
    // Navigate to workout-builder.html with new=true parameter
    window.location.href = 'workout-builder.html?new=true';
}
```

### 2. Update [`workout-builder.html`](frontend/workout-builder.html:588-648)

**Current Code (lines 588-594):**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('share_id');
const shareToken = urlParams.get('share_token');
const urlWorkoutId = urlParams.get('id');
const sessionWorkoutId = sessionStorage.getItem('editWorkoutId');
const localStorageWorkoutId = localStorage.getItem('currentEditingWorkoutId');
```

**New Code:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('share_id');
const shareToken = urlParams.get('share_token');
const urlWorkoutId = urlParams.get('id');
const localStorageWorkoutId = localStorage.getItem('currentEditingWorkoutId');
// sessionStorage removed - all navigation now uses URL parameters
```

**Current Code (lines 647-648):**
```javascript
// Priority 2: Load user's own workout
const editWorkoutId = urlWorkoutId || sessionWorkoutId || localStorageWorkoutId;
```

**New Code:**
```javascript
// Priority 2: Load user's own workout (URL param or localStorage for refresh recovery)
const editWorkoutId = urlWorkoutId || localStorageWorkoutId;
```

**Current Code (lines 658-661):**
```javascript
// Clear the session storage if it was used
if (sessionWorkoutId) {
    sessionStorage.removeItem('editWorkoutId');
}
```

**Remove this block** - No longer needed since we're not using sessionStorage.

### 3. Update [`bottom-action-bar-config.js`](frontend/assets/js/config/bottom-action-bar-config.js:560-562)

**Current Code:**
```javascript
onClick: function() {
    console.log('➕ Create new workout FAB clicked');
    sessionStorage.removeItem('editWorkoutId');
    window.location.href = 'workout-builder.html?new=true';
}
```

**New Code:**
```javascript
onClick: function() {
    console.log('➕ Create new workout FAB clicked');
    // Navigate with URL parameter (sessionStorage no longer used)
    window.location.href = 'workout-builder.html?new=true';
}
```

### 4. Verify [`workout-editor.js`](frontend/assets/js/components/workout-editor.js:583-589)

**Current Code (lines 583-589):**
```javascript
// Clear localStorage when user intentionally cancels
try {
    localStorage.removeItem('currentEditingWorkoutId');
    console.log('🗑️ Cleared workout ID from localStorage (cancelled)');
} catch (error) {
    console.warn('⚠️ Could not clear localStorage:', error);
}
```

**Keep as-is** - localStorage is correctly used only for refresh recovery.

### 5. Update [`bottom-action-bar-config.js`](frontend/assets/js/config/bottom-action-bar-config.js:656-658)

**Current Code:**
```javascript
try {
    localStorage.removeItem('currentEditingWorkoutId');
    console.log('🗑️ Cleared workout ID from localStorage (creating new workout)');
```

**Keep as-is** - This is in a delete mode handler and is correct.

## Testing Checklist

After implementation, test:
- [ ] Edit workout from workout-database.html → URL shows `?id={workoutId}`
- [ ] Create new workout from FAB → URL shows `?new=true`
- [ ] Edit workout from workout-mode → Already uses URL param (verify still works)
- [ ] Shared workout links → Already uses URL params (verify still works)
- [ ] Page refresh while editing → localStorage recovery works
- [ ] Browser back button → Works correctly with URL history
- [ ] Bookmark workout edit URL → Can return to editing same workout
- [ ] sessionStorage cleanup → No `editWorkoutId` entries in sessionStorage

## Edge Cases to Verify

1. **Concurrent tabs**: User opens same workout in two tabs
2. **Deep linking**: User bookmarks edit URL and returns days later
3. **Browser history**: Back/forward navigation works correctly
4. **Refresh recovery**: localStorage still handles unsaved changes on refresh
5. **URL manipulation**: User manually changes `?id=` parameter

## Rollback Plan

If issues arise:
1. Revert changes to [`workout-database.js`](frontend/assets/js/dashboard/workout-database.js:616)
2. Revert changes to [`workout-builder.html`](frontend/workout-builder.html:588)
3. Restore sessionStorage logic

## Success Metrics

- ✅ All workout edit URLs are bookmarkable
- ✅ Browser history navigation works correctly
- ✅ No sessionStorage usage for workout IDs
- ✅ Consistent navigation pattern across all entry points
- ✅ localStorage used only for refresh recovery