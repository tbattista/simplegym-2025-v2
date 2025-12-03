# Workout Database Card Fixes - Implementation Plan

## Overview
Fix three critical issues with workout cards on the workout database page:
1. Exercise preview not displaying
2. Delete mode breaking card content
3. Cards not reverting properly when delete mode is toggled off

## Current Issues Analysis

### Issue 1: Missing Exercise Preview
**Problem**: Configuration has `showExercisePreview: true` but no rendering logic exists.
**Location**: `frontend/assets/js/components/workout-card.js`
**Impact**: Users can't see which exercises are in a workout without opening details.

### Issue 2: Delete Mode Breaking Cards
**Problem**: `setDeleteMode()` method incorrectly replaces entire content instead of just buttons.
**Location**: Lines 260-266 in `workout-card.js`
**Current Code**:
```javascript
const actionsContainer = cardBody.querySelector('.btn-group, .btn-delete-workout, button[data-action]')?.parentElement;
if (actionsContainer) {
    actionsContainer.innerHTML = this._renderActions();
    this._attachEventListeners();
}
```
**Impact**: Card title, metadata, tags, and description disappear when delete mode is enabled.

### Issue 3: Cards Not Reverting
**Problem**: When delete mode is toggled off, cards don't restore their original content.
**Root Cause**: The `setDeleteMode()` method only re-renders actions, not the full card.
**Impact**: Cards remain in broken state until page reload.

## Solution Design

### Fix 1: Add Exercise Preview Rendering

Add a new method `_renderExercisePreview()` to WorkoutCard component:

```javascript
/**
 * Render exercise preview (first few exercises)
 */
_renderExercisePreview() {
    if (!this.config.showExercisePreview) return '';
    
    const workoutData = this.workout.workout_data || this.workout;
    const exercises = [];
    
    // Collect exercises from groups
    if (workoutData.exercise_groups) {
        workoutData.exercise_groups.forEach(group => {
            if (group.exercises) {
                Object.values(group.exercises).forEach(name => {
                    if (name) exercises.push(name);
                });
            }
        });
    }
    
    // Add bonus exercises
    if (workoutData.bonus_exercises) {
        workoutData.bonus_exercises.forEach(bonus => {
            if (bonus.name) exercises.push(bonus.name);
        });
    }
    
    if (exercises.length === 0) return '';
    
    // Show first 3 exercises
    const displayExercises = exercises.slice(0, 3);
    const remaining = exercises.length - displayExercises.length;
    
    return `
        <div class="mb-2">
            <small class="text-muted d-block mb-1">Exercises:</small>
            ${displayExercises.map(ex => 
                `<small class="d-block text-truncate">• ${this._escapeHtml(ex)}</small>`
            ).join('')}
            ${remaining > 0 ? `<small class="text-muted">+${remaining} more</small>` : ''}
        </div>
    `;
}
```

Update `render()` method to include exercise preview:
```javascript
<div class="card-body">
    ${this._renderHeader()}
    ${this._renderMetadata()}
    ${this._renderDescription()}
    ${this._renderExercisePreview()}  <!-- ADD THIS LINE -->
    ${this._renderTags()}
    ${this._renderStats()}
    ${this._renderActions()}
</div>
```

### Fix 2: Correct Delete Mode Implementation

Replace the entire `setDeleteMode()` method with a proper implementation:

```javascript
/**
 * Set delete mode
 * @param {boolean} enabled
 */
setDeleteMode(enabled) {
    this.config.deleteMode = enabled;
    
    if (this.element) {
        const card = this.element.querySelector('.card');
        const cardBody = card.querySelector('.card-body');
        
        if (enabled) {
            // Add delete mode styling
            card.classList.add('delete-mode');
            
            // Find and replace ONLY the actions section
            const actionsSection = cardBody.querySelector('.btn-group, button[data-action]:last-child');
            if (actionsSection) {
                actionsSection.outerHTML = this._renderActions();
            }
        } else {
            // Remove delete mode styling
            card.classList.remove('delete-mode');
            
            // Find and replace ONLY the delete button with original actions
            const deleteButton = cardBody.querySelector('.btn-delete-workout');
            if (deleteButton) {
                deleteButton.outerHTML = this._renderActions();
            }
        }
        
        // Re-attach event listeners for the new buttons
        this._attachEventListeners();
    }
}
```

### Fix 3: Ensure Proper State Management

Update the `_renderActions()` section in the card body to wrap actions in a consistent container:

```javascript
render() {
    const col = document.createElement('div');
    col.className = 'col';
    
    const cardClass = this.config.deleteMode ? 'card h-100 delete-mode' : 'card h-100';
    
    col.innerHTML = `
        <div class="${cardClass}" data-workout-id="${this.workout.id}">
            <div class="card-body">
                ${this._renderHeader()}
                ${this._renderMetadata()}
                ${this._renderDescription()}
                ${this._renderExercisePreview()}
                ${this._renderTags()}
                ${this._renderStats()}
                <div class="card-actions mt-auto">  <!-- ADD WRAPPER -->
                    ${this._renderActions()}
                </div>
            </div>
        </div>
    `;
    
    this.element = col;
    this._attachEventListeners();
    
    return col;
}
```

Update `setDeleteMode()` to target the wrapper:

```javascript
setDeleteMode(enabled) {
    this.config.deleteMode = enabled;
    
    if (this.element) {
        const card = this.element.querySelector('.card');
        const cardBody = card.querySelector('.card-body');
        const actionsWrapper = cardBody.querySelector('.card-actions');
        
        if (enabled) {
            card.classList.add('delete-mode');
        } else {
            card.classList.remove('delete-mode');
        }
        
        // Replace actions content only
        if (actionsWrapper) {
            actionsWrapper.innerHTML = this._renderActions();
            this._attachEventListeners();
        }
    }
}
```

## Implementation Steps

1. **Add Exercise Preview Feature**
   - Add `_renderExercisePreview()` method to WorkoutCard
   - Update `render()` to include exercise preview
   - Test with various workout configurations

2. **Fix Delete Mode Toggle**
   - Wrap actions in `.card-actions` container
   - Update `setDeleteMode()` to only replace actions content
   - Preserve all other card content during toggle

3. **Test All Scenarios**
   - Cards display exercises correctly
   - Delete mode enables without breaking layout
   - Delete mode disables and restores original buttons
   - Delete functionality works properly
   - Multiple toggles work correctly

## CSS Updates (if needed)

Add to `workout-database.css`:

```css
/* Exercise preview in cards */
.card .exercise-preview {
    font-size: 0.875rem;
    line-height: 1.5;
}

.card .exercise-preview small {
    color: var(--bs-secondary);
}

/* Card actions container */
.card-actions {
    margin-top: auto;
    padding-top: 0.5rem;
}

/* Ensure proper spacing in delete mode */
.card.delete-mode .card-actions {
    padding-top: 0.75rem;
}
```

## Testing Checklist

- [ ] Exercise preview displays correctly (first 3 exercises)
- [ ] "+X more" indicator shows when more than 3 exercises
- [ ] Delete mode toggle turns on successfully
- [ ] Card content (title, metadata, tags) remains visible in delete mode
- [ ] Delete button appears and functions in delete mode
- [ ] Delete mode toggle turns off successfully
- [ ] Original action buttons restore when delete mode is disabled
- [ ] Multiple delete mode toggles work without issues
- [ ] Delete confirmation and actual deletion work
- [ ] Cards update properly after deletion
- [ ] No console errors during any operations

## Rollback Plan

If issues occur:
1. Revert `workout-card.js` to previous version
2. Clear browser cache
3. Verify workouts still display in grid

## Success Criteria

- Users can see exercise lists in cards without opening details
- Delete mode works smoothly without breaking card layout
- Cards properly toggle between normal and delete modes
- All existing functionality (Start, View, History, Edit buttons) continues to work
- No visual glitches or content disappearing

## Related Files

- `frontend/assets/js/components/workout-card.js` - Main fix location
- `frontend/assets/js/components/workout-grid.js` - Calls setDeleteMode
- `frontend/assets/js/dashboard/workout-database.js` - Initializes grid with config
- `frontend/assets/css/workout-database.css` - Styling (minimal changes)
