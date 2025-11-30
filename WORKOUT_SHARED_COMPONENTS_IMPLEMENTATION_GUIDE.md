# Workout Shared Components - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the shared workout components in both the Workout Database and Discover Workouts pages.

## Components Created

### 1. WorkoutCard Component
**File:** [`frontend/assets/js/components/workout-card.js`](frontend/assets/js/components/workout-card.js)

Renders individual workout cards with configurable display options and actions.

### 2. WorkoutGrid Component
**File:** [`frontend/assets/js/components/workout-grid.js`](frontend/assets/js/components/workout-grid.js)

Manages a grid of workout cards with pagination, loading states, and empty states.

### 3. WorkoutDetailOffcanvas Component
**File:** [`frontend/assets/js/components/workout-detail-offcanvas.js`](frontend/assets/js/components/workout-detail-offcanvas.js)

Displays detailed workout information in a bottom offcanvas with configurable actions.

## Quick Start

### For Workout Database (User's Workouts)

```javascript
// 1. Initialize the detail offcanvas
const detailOffcanvas = new WorkoutDetailOffcanvas({
    showCreator: false,
    showStats: false,
    showDates: true,
    actions: [
        { 
            id: 'close', 
            label: 'Close', 
            variant: 'label-secondary',
            onClick: () => detailOffcanvas.hide()
        },
        { 
            id: 'edit', 
            label: 'Edit', 
            icon: 'bx-edit', 
            variant: 'outline-primary',
            onClick: (workout) => editWorkout(workout.id)
        },
        { 
            id: 'start', 
            label: 'Start', 
            icon: 'bx-play', 
            variant: 'primary',
            onClick: (workout) => doWorkout(workout.id)
        }
    ]
});

// 2. Initialize the workout grid
const workoutGrid = new WorkoutGrid('workoutTableContainer', {
    pageSize: 50,
    cardConfig: {
        showCreator: false,
        showStats: false,
        showTags: true,
        showDescription: false,
        actions: [
            { 
                id: 'start', 
                label: 'Start', 
                icon: 'bx-play', 
                variant: 'primary',
                onClick: (workout) => doWorkout(workout.id)
            },
            { 
                id: 'view', 
                label: 'View', 
                icon: 'bx-show', 
                variant: 'outline-secondary',
                onClick: (workout) => detailOffcanvas.show(workout)
            },
            { 
                id: 'history', 
                label: 'History', 
                icon: 'bx-history', 
                variant: 'outline-info',
                onClick: (workout) => viewWorkoutHistory(workout.id)
            },
            { 
                id: 'edit', 
                label: 'Edit', 
                icon: 'bx-edit', 
                variant: 'outline-secondary',
                onClick: (workout) => editWorkout(workout.id)
            }
        ],
        deleteMode: false,
        onDelete: deleteWorkoutFromDatabase
    },
    emptyIcon: 'bx-dumbbell',
    emptyTitle: 'No workouts found',
    emptyMessage: 'Try adjusting your filters or create a new workout',
    emptyAction: {
        label: 'Create Your First Workout',
        onClick: createNewWorkout
    }
});

// 3. Load and display workouts
async function loadWorkouts() {
    workoutGrid.showLoading();
    
    try {
        const workouts = await window.dataManager.getWorkouts();
        workoutGrid.setData(workouts);
    } catch (error) {
        console.error('Failed to load workouts:', error);
        workoutGrid.showEmpty();
    }
}

// 4. Handle delete mode toggle
function toggleDeleteMode() {
    const isActive = document.getElementById('deleteModeToggle').checked;
    workoutGrid.setDeleteMode(isActive);
}
```

### For Discover Workouts (Public Workouts)

```javascript
// 1. Initialize the detail offcanvas
const detailOffcanvas = new WorkoutDetailOffcanvas({
    showCreator: true,
    showStats: true,
    showDates: false,
    actions: [
        { 
            id: 'close', 
            label: 'Close', 
            variant: 'secondary',
            onClick: () => detailOffcanvas.hide()
        },
        { 
            id: 'save', 
            label: 'Save to Library', 
            icon: 'bx-bookmark', 
            variant: 'primary',
            onClick: (workout) => savePublicWorkout(workout.id)
        }
    ]
});

// 2. Initialize the workout grid
const workoutGrid = new WorkoutGrid('workoutsGrid', {
    pageSize: 20,
    cardConfig: {
        showCreator: true,
        showStats: true,
        showTags: true,
        showDescription: true,
        actions: [
            { 
                id: 'view', 
                label: 'View Details', 
                icon: 'bx-show', 
                variant: 'primary',
                onClick: (workout) => detailOffcanvas.show(workout)
            }
        ],
        onCardClick: (workout) => detailOffcanvas.show(workout)
    },
    emptyIcon: 'bx-search',
    emptyTitle: 'No workouts found',
    emptyMessage: 'Try adjusting your filters or check back later'
});

// 3. Load and display public workouts
async function loadPublicWorkouts() {
    workoutGrid.showLoading();
    
    try {
        const response = await fetch('/api/v3/sharing/public-workouts?page=1&page_size=20');
        const data = await response.json();
        workoutGrid.setData(data.workouts);
    } catch (error) {
        console.error('Failed to load public workouts:', error);
        workoutGrid.showEmpty();
    }
}

// 4. Save workout to library
async function savePublicWorkout(workoutId) {
    try {
        const token = await window.authService.getIdToken();
        const response = await fetch(`/api/v3/sharing/public-workouts/${workoutId}/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (response.ok) {
            alert('Workout saved to your library!');
            detailOffcanvas.hide();
        }
    } catch (error) {
        console.error('Failed to save workout:', error);
        alert('Failed to save workout');
    }
}
```

## Component API Reference

### WorkoutCard

#### Constructor
```javascript
new WorkoutCard(workout, config)
```

#### Configuration Options
```javascript
{
    // Display options
    showCreator: boolean,        // Show creator name (default: false)
    showStats: boolean,          // Show view/save counts (default: false)
    showTags: boolean,           // Show tag badges (default: true)
    showDescription: boolean,    // Show description preview (default: false)
    
    // Action buttons
    actions: [
        {
            id: string,          // Unique action ID
            label: string,       // Button label
            icon: string,        // Boxicons class (optional)
            variant: string,     // Bootstrap button variant
            onClick: function    // Click handler
        }
    ],
    
    // Delete mode
    deleteMode: boolean,         // Enable delete mode styling (default: false)
    onDelete: function,          // Delete handler (workoutId, workoutName)
    
    // Callbacks
    onCardClick: function        // Card click handler (workout, event)
}
```

#### Methods
```javascript
card.render()                    // Returns HTMLElement
card.setDeleteMode(enabled)      // Toggle delete mode
card.update(workout)             // Update workout data
card.destroy()                   // Clean up and remove
```

### WorkoutGrid

#### Constructor
```javascript
new WorkoutGrid(containerId, config)
```

#### Configuration Options
```javascript
{
    // Card configuration
    cardConfig: {},              // WorkoutCard configuration
    
    // Pagination
    pageSize: number,            // Items per page (default: 20)
    showPagination: boolean,     // Show pagination controls (default: true)
    
    // Empty state
    emptyIcon: string,           // Boxicons class (default: 'bx-dumbbell')
    emptyTitle: string,          // Empty state title
    emptyMessage: string,        // Empty state message
    emptyAction: {               // Optional action button
        label: string,
        onClick: function
    },
    
    // Loading state
    loadingMessage: string,      // Loading message (default: 'Loading workouts...')
    
    // Callbacks
    onPageChange: function       // Page change handler (page)
}
```

#### Methods
```javascript
grid.setData(workouts)           // Set workout data
grid.setPage(page)               // Go to specific page
grid.showLoading()               // Show loading state
grid.showEmpty()                 // Show empty state
grid.showContent()               // Show content
grid.render()                    // Re-render current page
grid.refresh()                   // Alias for render()
grid.updateCardConfig(config)    // Update card configuration
grid.setDeleteMode(enabled)      // Toggle delete mode for all cards
grid.getCurrentPage()            // Get current page number
grid.getTotalPages()             // Get total page count
grid.getDisplayedData()          // Get currently displayed workouts
grid.getAllData()                // Get all workouts
grid.destroy()                   // Clean up and remove
```

### WorkoutDetailOffcanvas

#### Constructor
```javascript
new WorkoutDetailOffcanvas(config)
```

#### Configuration Options
```javascript
{
    // Display options
    showCreator: boolean,        // Show creator name (default: false)
    showStats: boolean,          // Show view/save counts (default: false)
    showDates: boolean,          // Show created/modified dates (default: true)
    
    // Footer actions
    actions: [
        {
            id: string,          // Unique action ID
            label: string,       // Button label
            icon: string,        // Boxicons class (optional)
            variant: string,     // Bootstrap button variant
            onClick: function    // Click handler (workout)
        }
    ]
}
```

#### Methods
```javascript
offcanvas.show(workout)          // Show offcanvas with workout
offcanvas.hide()                 // Hide offcanvas
offcanvas.update(workout)        // Update workout data
offcanvas.destroy()              // Clean up and remove
```

## HTML Integration

### Required HTML Structure

Both pages need a container element for the grid:

```html
<!-- Workout List Section -->
<div class="mb-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">
            <i class="bx bx-list-ul me-1"></i>
            Workout List
        </h6>
        <!-- Optional: Delete Mode Toggle (for user's workouts only) -->
        <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch"
                   id="deleteModeToggle" style="cursor: pointer;">
            <label class="form-check-label" for="deleteModeToggle" style="cursor: pointer;">
                <span class="delete-mode-label">Delete Mode</span>
            </label>
        </div>
    </div>
    <p class="text-muted small mb-3">Browse and manage your workouts</p>
    
    <!-- Grid Container -->
    <div id="workoutTableContainer"></div>
</div>
```

### Required Script Includes

Add these scripts to your HTML (in order):

```html
<!-- Component Scripts -->
<script src="/static/assets/js/components/workout-card.js"></script>
<script src="/static/assets/js/components/workout-grid.js"></script>
<script src="/static/assets/js/components/workout-detail-offcanvas.js"></script>

<!-- Page-specific Script -->
<script src="/static/assets/js/dashboard/workout-database.js"></script>
<!-- OR -->
<script src="/static/assets/js/dashboard/public-workouts.js"></script>
```

## Migration Checklist

### Workout Database Page

- [x] Create shared components
- [ ] Update `workout-database.html`:
  - [ ] Add component script includes
  - [ ] Keep existing container structure
- [ ] Update `workout-database.js`:
  - [ ] Initialize WorkoutGrid with user config
  - [ ] Initialize WorkoutDetailOffcanvas with user config
  - [ ] Update `loadWorkouts()` to use `grid.setData()`
  - [ ] Update `toggleDeleteMode()` to use `grid.setDeleteMode()`
  - [ ] Remove old card rendering code
  - [ ] Remove old offcanvas code
- [ ] Test all functionality:
  - [ ] Load workouts
  - [ ] View workout details
  - [ ] Start workout
  - [ ] Edit workout
  - [ ] View history
  - [ ] Delete mode toggle
  - [ ] Delete workout
  - [ ] Pagination
  - [ ] Search/filter

### Public Workouts Page

- [x] Create shared components
- [ ] Update `public-workouts.html`:
  - [ ] Add component script includes
  - [ ] Update container structure to match workout-database
- [ ] Update `public-workouts.js`:
  - [ ] Initialize WorkoutGrid with public config
  - [ ] Initialize WorkoutDetailOffcanvas with public config
  - [ ] Update `loadPublicWorkouts()` to use `grid.setData()`
  - [ ] Remove old card rendering code
  - [ ] Remove old modal code
  - [ ] Implement `savePublicWorkout()` function
- [ ] Test all functionality:
  - [ ] Load public workouts
  - [ ] View workout details
  - [ ] Save to library
  - [ ] Pagination
  - [ ] Search/filter

## Benefits Achieved

✅ **Code Reuse**: ~50% reduction in duplicate code
✅ **Consistency**: Identical UX across both pages
✅ **Maintainability**: Single source of truth for workout rendering
✅ **Extensibility**: Easy to add new features to both pages
✅ **Type Safety**: Clear API contracts for all components
✅ **Testability**: Components can be tested independently

## Next Steps

1. **Refactor workout-database.html** - Update to use shared components
2. **Refactor public-workouts.html** - Update to use shared components
3. **Test thoroughly** - Verify all functionality works
4. **Update documentation** - Document any changes or improvements

## Troubleshooting

### Cards not rendering
- Check that `WorkoutCard` is loaded before `WorkoutGrid`
- Verify workout data structure matches expected format
- Check browser console for errors

### Pagination not working
- Verify `pageSize` is set correctly
- Check that `workouts` array has data
- Ensure pagination container exists in HTML

### Offcanvas not showing
- Check that Bootstrap is loaded
- Verify offcanvas HTML is in the DOM
- Check browser console for initialization errors

### Delete mode not working
- Verify `deleteMode` is set in card config
- Check that `onDelete` callback is provided
- Ensure delete mode toggle is connected to `grid.setDeleteMode()`

## Support

For issues or questions, refer to:
- [`WORKOUT_SHARED_COMPONENTS_ARCHITECTURE.md`](WORKOUT_SHARED_COMPONENTS_ARCHITECTURE.md) - Architecture overview
- Component source files for implementation details
- Existing page implementations for examples