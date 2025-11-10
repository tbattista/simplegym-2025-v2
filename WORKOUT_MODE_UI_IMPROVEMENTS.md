# Workout Mode UI Improvements - Implementation Plan

## Overview
Comprehensive UI improvements to the workout mode page header and footer, following Sneat template best practices and the design shown in the provided mockup.

## Changes Summary

### 1. Header Redesign
- Remove "Change workout" link
- Implement proper typography hierarchy (h1 → h2 → h3)
- Add workout details and "last completed" information
- Follow Sneat heading styles

### 2. Footer Button Additions
- Add "Edit Workout" button (navigates to builder with workout loaded)
- Add "Change Workout" button (navigates to workout database)
- Maintain existing Share and Volume buttons
- Ensure all buttons are right-aligned

## Detailed Implementation Plan

### Part 1: Header Structure Changes

#### Current Structure (lines 87-98 in workout-mode.html)
```html
<div class="workout-mode-header">
  <div class="mb-4">
    <h4 class="mb-1" id="workoutModeTitle">
      <i class="bx bx-dumbbell me-2"></i>
      <span id="workoutName">Loading workout...</span>
    </h4>
    <a href="workouts.html" class="text-muted small" id="changeWorkoutLink">
      <i class="bx bx-refresh me-1"></i>Change workout
    </a>
  </div>
</div>
```

#### New Structure (Sneat-compliant)
```html
<div class="workout-mode-header">
  <div class="mb-4">
    <!-- Page Title (h4 - Sneat standard for page titles) -->
    <h4 class="mb-2">Workout Mode</h4>
    
    <!-- Workout Name (h5 - secondary heading) -->
    <h5 class="mb-1" id="workoutName">Loading workout...</h5>
    
    <!-- Workout Details (small text with muted color) -->
    <div class="text-muted small" id="workoutDetails">
      <span id="workoutDescription"></span>
    </div>
    
    <!-- Last Completed (small text with icon) -->
    <div class="text-muted small mt-1" id="lastCompletedContainer" style="display: none;">
      <i class="bx bx-history me-1"></i>
      Last completed: <span id="lastCompletedDate">Never</span>
    </div>
  </div>
</div>
```

### Part 2: Footer Button Layout Changes

#### Current Structure (lines 207-222 in workout-mode.html)
```html
<div class="d-flex align-items-center">
  <!-- Left side: Session info -->
  <div id="sessionInfo" class="text-muted small me-auto" style="display: none;">
    Time: <span id="footerSessionTimer">00:00</span>
  </div>
  
  <!-- Right side: Controls -->
  <div class="d-flex gap-2 ms-auto">
    <button class="btn btn-sm btn-outline-primary" id="shareWorkoutBtn">
      <i class="bx bx-share-alt"></i>
    </button>
    <button class="btn btn-sm btn-outline-secondary" id="soundToggleBtn">
      <i class="bx bx-volume-full" id="soundIcon"></i>
    </button>
  </div>
</div>
```

#### New Structure (with Edit and Change buttons)
```html
<div class="d-flex align-items-center">
  <!-- Left side: Session info -->
  <div id="sessionInfo" class="text-muted small me-auto" style="display: none;">
    Time: <span id="footerSessionTimer">00:00</span>
  </div>
  
  <!-- Right side: Controls (4 buttons) -->
  <div class="d-flex gap-2 ms-auto">
    <button class="btn btn-sm btn-outline-secondary" id="editWorkoutBtn" title="Edit this workout">
      <i class="bx bx-edit-alt"></i>
    </button>
    <button class="btn btn-sm btn-outline-secondary" id="changeWorkoutBtn" title="Change workout">
      <i class="bx bx-refresh"></i>
    </button>
    <button class="btn btn-sm btn-outline-primary" id="shareWorkoutBtn" title="Share workout">
      <i class="bx bx-share-alt"></i>
    </button>
    <button class="btn btn-sm btn-outline-secondary" id="soundToggleBtn" title="Toggle sound">
      <i class="bx bx-volume-full" id="soundIcon"></i>
    </button>
  </div>
</div>
```

### Part 3: CSS Updates

#### Add to workout-mode.css (after line 30)
```css
/* Enhanced header typography following Sneat standards */
.workout-mode-header h4 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--bs-heading-color);
    margin-bottom: 0.5rem;
}

.workout-mode-header h5 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--bs-heading-color);
    margin-bottom: 0.25rem;
}

.workout-mode-header #workoutDetails {
    font-size: 0.875rem;
    line-height: 1.5;
}

.workout-mode-header #lastCompletedContainer {
    font-size: 0.875rem;
    display: flex;
    align-items: center;
}

.workout-mode-header #lastCompletedContainer i {
    color: var(--bs-primary);
}
```

#### Update footer button styles (after line 542)
```css
/* Footer button group - ensure proper spacing and alignment */
.workout-mode-footer .d-flex gap-2 {
    gap: 0.5rem !important;
}

/* Footer icon-only buttons */
.workout-mode-footer .btn-sm {
    width: 38px;
    height: 38px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.workout-mode-footer .btn-sm i {
    font-size: 1.25rem;
    margin: 0;
}

/* Hover states for footer buttons */
.workout-mode-footer .btn-outline-secondary:hover {
    background-color: var(--bs-secondary);
    border-color: var(--bs-secondary);
    color: white;
}

.workout-mode-footer .btn-outline-primary:hover {
    background-color: var(--bs-primary);
    border-color: var(--bs-primary);
    color: white;
}
```

### Part 4: JavaScript Changes

#### Update workout-mode-controller.js

##### 1. Add method to fetch last completed date (after line 165)
```javascript
/**
 * Fetch last completed date for current workout
 */
async fetchLastCompleted() {
    try {
        if (!this.currentWorkout || !this.authService.isUserAuthenticated()) {
            return null;
        }
        
        const token = await this.authService.getIdToken();
        if (!token) return null;
        
        // Use the history endpoint to get last session
        const url = window.config.api.getUrl(`/api/v3/workout-sessions/history/workout/${this.currentWorkout.id}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.warn('Could not fetch last completed date');
            return null;
        }
        
        const historyData = await response.json();
        
        // Get the most recent session date
        if (historyData.last_session_date) {
            return new Date(historyData.last_session_date);
        }
        
        return null;
        
    } catch (error) {
        console.error('Error fetching last completed:', error);
        return null;
    }
}
```

##### 2. Update loadWorkout method to display new header info (modify around line 148)
```javascript
// Update page title and header
document.getElementById('workoutName').textContent = this.currentWorkout.name;
document.title = `👻 ${this.currentWorkout.name} - Workout Mode - Ghost Gym`;

// Update workout details
const detailsEl = document.getElementById('workoutDetails');
if (detailsEl && this.currentWorkout.description) {
    detailsEl.textContent = this.currentWorkout.description;
}

// Fetch and display last completed date
const lastCompleted = await this.fetchLastCompleted();
const lastCompletedContainer = document.getElementById('lastCompletedContainer');
const lastCompletedDate = document.getElementById('lastCompletedDate');

if (lastCompleted && lastCompletedContainer && lastCompletedDate) {
    const formattedDate = lastCompleted.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    lastCompletedDate.textContent = formattedDate;
    lastCompletedContainer.style.display = 'flex';
} else if (lastCompletedContainer) {
    lastCompletedContainer.style.display = 'none';
}
```

##### 3. Add footer button event listeners (in setupEventListeners method, after line 597)
```javascript
// Edit workout button
const editBtn = document.getElementById('editWorkoutBtn');
if (editBtn) {
    editBtn.addEventListener('click', () => this.handleEditWorkout());
}

// Change workout button
const changeBtn = document.getElementById('changeWorkoutBtn');
if (changeBtn) {
    changeBtn.addEventListener('click', () => this.handleChangeWorkout());
}
```

##### 4. Add navigation handler methods (after line 1149)
```javascript
/**
 * Handle edit workout button click
 * Navigate to builder with current workout loaded
 */
handleEditWorkout() {
    if (!this.currentWorkout) {
        console.error('No workout to edit');
        return;
    }
    
    // Navigate to builder with workout ID
    window.location.href = `builder.html?id=${this.currentWorkout.id}`;
}

/**
 * Handle change workout button click
 * Navigate to workout database
 */
handleChangeWorkout() {
    // Navigate to workout database page
    window.location.href = 'workout-database.html';
}
```

## Sneat Template Best Practices Applied

### Typography Hierarchy
- **h4**: Page title ("Workout Mode") - 1.5rem, 600 weight
- **h5**: Workout name - 1.25rem, 600 weight  
- **small text**: Details and metadata - 0.875rem

### Button Styling
- Icon-only buttons: 38x38px (Sneat standard for small icon buttons)
- Consistent spacing: 0.5rem gap between buttons
- Outline style for secondary actions
- Proper hover states with color transitions

### Color Usage
- Primary color for important actions (Share)
- Secondary color for utility actions (Edit, Change, Volume)
- Muted text for metadata
- Primary color for icons in metadata

### Spacing
- Consistent margin-bottom values (mb-1, mb-2, mb-4)
- Proper gap between button groups
- Adequate padding in containers

## Mobile Responsiveness

### Add to workout-mode.css media queries (after line 816)
```css
@media (max-width: 768px) {
    /* Header adjustments */
    .workout-mode-header h4 {
        font-size: 1.25rem;
    }
    
    .workout-mode-header h5 {
        font-size: 1.1rem;
    }
    
    /* Footer button adjustments */
    .workout-mode-footer .btn-sm {
        width: 36px;
        height: 36px;
    }
    
    .workout-mode-footer .btn-sm i {
        font-size: 1.1rem;
    }
}

@media (max-width: 576px) {
    /* Extra small screens */
    .workout-mode-header h4 {
        font-size: 1.1rem;
    }
    
    .workout-mode-header h5 {
        font-size: 1rem;
    }
    
    .workout-mode-footer .btn-sm {
        width: 34px;
        height: 34px;
    }
    
    .workout-mode-footer .btn-sm i {
        font-size: 1rem;
    }
}
```

## Implementation Checklist

### HTML Changes
- [ ] Update header structure in workout-mode.html (lines 87-98)
- [ ] Add new header elements (h4, h5, details, last completed)
- [ ] Update footer button structure (lines 207-222)
- [ ] Add Edit and Change buttons with proper icons

### CSS Changes
- [ ] Add enhanced header typography styles
- [ ] Add last completed container styles
- [ ] Update footer button sizing and spacing
- [ ] Add hover states for footer buttons
- [ ] Add mobile responsive styles

### JavaScript Changes
- [ ] Add fetchLastCompleted() method to controller
- [ ] Update loadWorkout() to populate new header fields
- [ ] Add event listeners for Edit and Change buttons
- [ ] Add handleEditWorkout() navigation method
- [ ] Add handleChangeWorkout() navigation method

## Testing Scenarios

1. **Header Display**
   - Verify "Workout Mode" title displays correctly
   - Verify workout name displays as h5
   - Verify workout description displays (if present)
   - Verify "last completed" shows for authenticated users with history
   - Verify "last completed" hidden for new workouts or anonymous users

2. **Footer Buttons**
   - Verify all 4 buttons display and are right-aligned
   - Verify Edit button navigates to builder with workout ID
   - Verify Change button navigates to workout database
   - Verify Share button still works
   - Verify Volume button still works

3. **Responsive Behavior**
   - Test header typography scales on mobile
   - Test footer buttons remain accessible on small screens
   - Test button spacing remains consistent

4. **Session State**
   - Verify session timer still displays when workout active
   - Verify buttons remain right-aligned with session info visible

## Files to Modify

1. **frontend/workout-mode.html** (lines 87-98, 207-222)
2. **frontend/assets/css/workout-mode.css** (add new styles)
3. **frontend/assets/js/controllers/workout-mode-controller.js** (add methods and update existing)

## API Endpoints Used

- `GET /api/v3/workout-sessions/history/workout/{workoutId}` - Fetch last completed date
  - Returns: `{ last_session_date: "2025-01-10T...", exercises: {...} }`

## Notes

- The "last completed" feature requires authentication
- Edit button navigates to builder.html with `?id=` parameter
- Change button navigates to workout-database.html (not workouts.html)
- All changes maintain backward compatibility
- Follows existing Sneat patterns used throughout the app