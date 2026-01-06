# Bonus Exercise → Additional Exercise Rename Plan

## Overview

**Goal:** Change all user-facing references from "Bonus Exercise" to "Additional Exercise" to better represent exercises that are added by users but are not part of the original workout template.

**Key Changes:**
1. Remove the "🎁" (gift/present) emoji prefix from additional exercises
2. Change "Bonus" wording to "Additional" or "Added" throughout the UI
3. Keep internal variable names as `bonus` for backward compatibility with data storage

---

## Naming Convention

| Context | Old Text | New Text |
|---------|----------|----------|
| Button label | "Bonus" | "Add" |
| Modal/Offcanvas title | "Add Bonus Exercise" | "Add Exercise" |
| Section headers | "Bonus Exercises" | "Additional Exercises" |
| Badge in history | "Bonus" | "Added" |
| Card prefix | "🎁 BONUS:" | *(removed entirely)* |
| Card indicator | "🎁" | "+" or subtle styling |
| Tooltip | "Add bonus exercise" | "Add exercise" |

---

## Files to Modify

### 1. CSS Files

#### `frontend/assets/css/workout-mode.css`
**Lines 1405-1407:**
```css
/* BEFORE */
.exercise-card.bonus-exercise .exercise-card-summary h6::before {
    content: "🎁 BONUS: ";
    color: var(--bs-success);
}

/* AFTER */
.exercise-card.bonus-exercise .exercise-card-summary h6::before {
    content: "+ ";
    color: var(--bs-success);
}
```

**Lines 2281-2283:**
```css
/* BEFORE */
.exercise-card.bonus-exercise .exercise-card-summary h6::before {
    content: "🎁 ";
    font-size: 1.1rem;
}

/* AFTER - Remove this rule entirely or change to */
.exercise-card.bonus-exercise .exercise-card-summary h6::before {
    content: "+ ";
    font-size: 0.9rem;
}
```

---

### 2. HTML Files

#### `frontend/workout-mode.html`
**Lines 107-109:**
```html
<!-- BEFORE -->
<button class="btn btn-sm btn-outline-success" id="addBonusExerciseBtn" style="display: none;" title="Add bonus exercises before starting">
  <i class="bx bx-plus-circle me-1"></i>Bonus
</button>

<!-- AFTER -->
<button class="btn btn-sm btn-outline-success" id="addBonusExerciseBtn" style="display: none;" title="Add exercises">
  <i class="bx bx-plus-circle me-1"></i>Add
</button>
```

**Line 49-50:** Change CSS reference comment
```html
<!-- BEFORE -->
<!-- Bonus Exercise Search CSS -->
<link rel="stylesheet" href="/static/assets/css/components/bonus-exercise-search.css" />

<!-- AFTER (internal naming can stay the same, just update comment) -->
<!-- Exercise Search CSS (for additional exercises) -->
<link rel="stylesheet" href="/static/assets/css/components/bonus-exercise-search.css" />
```

#### `frontend/workout-builder.html`
**Lines 294-296:**
```html
<!-- BEFORE -->
<span id="bonusExerciseTitle">Edit Bonus Exercise</span>

<!-- AFTER -->
<span id="bonusExerciseTitle">Edit Additional Exercise</span>
```

#### `frontend/share.html`
**Lines 160-161:**
```html
<!-- BEFORE -->
<h5 class="card-header">
  <i class="bx bx-plus-circle me-2"></i>
  Bonus Exercises
</h5>

<!-- AFTER -->
<h5 class="card-header">
  <i class="bx bx-plus-circle me-2"></i>
  Additional Exercises
</h5>
```

#### `frontend/dashboard.html`
**Lines 398-401:**
```html
<!-- BEFORE -->
<h6 class="mb-0">Bonus Exercises</h6>
<button type="button" class="btn btn-outline-secondary btn-sm" id="addBonusExerciseBtn">
    <i class="bi bi-plus-lg me-1"></i>
    Add Bonus
</button>

<!-- AFTER -->
<h6 class="mb-0">Additional Exercises</h6>
<button type="button" class="btn btn-outline-secondary btn-sm" id="addBonusExerciseBtn">
    <i class="bi bi-plus-lg me-1"></i>
    Add Exercise
</button>
```

#### `frontend/bottom-nav-demo.html`
**Multiple locations - Update demo labels:**
```html
<!-- BEFORE -->
<span class="action-btn-label">Bonus</span>

<!-- AFTER -->
<span class="action-btn-label">Add</span>
```

#### `frontend/bottom-nav-demo-alt.html`
**Same changes as bottom-nav-demo.html**

---

### 3. JavaScript Files

#### `frontend/assets/js/dashboard/workout-history.js`
**Line 379-380:**
```javascript
// BEFORE
} else if (ex.is_bonus) {
    statusBadge = '<span class="badge bg-success">Bonus</span>';

// AFTER
} else if (ex.is_bonus) {
    statusBadge = '<span class="badge bg-success">Added</span>';
```

#### `frontend/assets/js/components/offcanvas/offcanvas-exercise.js`
**Lines 38-39:**
```javascript
// BEFORE
<h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
    <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise

// AFTER
<h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
    <i class="bx bx-plus-circle me-2"></i>Add Exercise
```

#### `frontend/assets/js/components/workout-detail-offcanvas.js`
**Line 242:**
```javascript
// BEFORE
html += '<h6 class="mb-3 mt-4">Bonus Exercises</h6>';

// AFTER
html += '<h6 class="mb-3 mt-4">Additional Exercises</h6>';
```

#### `frontend/assets/js/components/workout-detail-modal.js`
**Line 87:**
```javascript
// BEFORE
<h6 class="mb-3">Bonus Exercises</h6>

// AFTER
<h6 class="mb-3">Additional Exercises</h6>
```

#### `frontend/assets/js/services/workout-exercise-operations-manager.js`
**Line 280:**
```javascript
// BEFORE
title: 'Add Bonus Exercise',

// AFTER
title: 'Add Exercise',
```

#### `frontend/assets/js/config/bottom-action-bar-config.js`
**Lines 1015, 1078, 1262:**
```javascript
// BEFORE
title: 'Add bonus exercise',

// AFTER
title: 'Add exercise',
```

#### `frontend/assets/js/dashboard/workouts.js`
**Multiple locations:**

Line 611 - `renumberBonusExercises()`:
```javascript
// BEFORE
title.textContent = `Bonus Exercise ${index + 1}`;

// AFTER
title.textContent = `Additional Exercise ${index + 1}`;
```

Line 645:
```javascript
// BEFORE
title.textContent = `Bonus Exercise ${bonusNumber}`;

// AFTER
title.textContent = `Additional Exercise ${bonusNumber}`;
```

#### `frontend/assets/js/modules/card-renderer.js`
**Lines 213, 229-230, 252:**
```javascript
// BEFORE - Line 213
const exerciseName = data.name || `New Bonus Exercise ${bonusNumber}`;

// AFTER
const exerciseName = data.name || `New Additional Exercise ${bonusNumber}`;

// BEFORE - Lines 229-230
title="Edit bonus exercise"

// AFTER
title="Edit additional exercise"

// BEFORE - Line 252
const exerciseName = bonusData.name || 'New Bonus Exercise';

// AFTER
const exerciseName = bonusData.name || 'New Additional Exercise';
```

#### `frontend/assets/js/dashboard/exercise-history-demo.js`
**Line 375 - Already correct!**
```javascript
// This is already using "+ Added" which is the desired format
${exercise.isBonus ? '<div class="bonus-indicator">+ Added</div>' : ''}
```

---

## Important: What NOT to Change

### Internal Variable/Function Names (Keep as-is for backward compatibility)
- `is_bonus` - Database field, must stay the same
- `bonus_exercises` - API field, must stay the same
- `preWorkoutBonusExercises` - Internal state
- `getBonusExercises()` - Method name
- `addBonusExercise()` - Method name
- `.bonus-exercise` - CSS class (internal)
- `bonusExerciseOffcanvas` - Element ID

### Backend Files (Keep as-is)
- `backend/models.py` - `BonusExercise` class
- API endpoints with `bonus` in path
- Database schema

---

## Visual Comparison

### Before
```
┌─────────────────────────────────────┐
│ 🎁 BONUS: Bicep Curls              │
│ 3 sets × 12 reps                   │
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────┐
│ + Bicep Curls                      │
│ 3 sets × 12 reps                   │
└─────────────────────────────────────┘
```

---

## Testing Checklist

### Workout Mode Page
- [ ] Exercise cards show "+ " prefix instead of "🎁 BONUS:"
- [ ] "Add" button displays correctly
- [ ] Adding an exercise works as expected
- [ ] Additional exercises render with subtle green styling

### Workout History Page
- [ ] Badge shows "Added" instead of "Bonus"
- [ ] Exercise rows display correctly
- [ ] History loads without errors

### Dashboard/Workout Builder
- [ ] "Additional Exercises" section header displays
- [ ] "Add Exercise" button works
- [ ] Exercise editor offcanvas has correct title

### Share Page
- [ ] "Additional Exercises" section displays
- [ ] Shared workout shows additional exercises correctly

### Exercise History Demo
- [ ] "+ Added" indicator displays (already correct)

---

## Rollback Plan

If issues arise, the changes are purely cosmetic (user-facing text/styling only). To rollback:
1. Revert the specific file changes
2. No database migration needed
3. No API changes needed

---

## Implementation Order

1. **CSS First** - Update workout-mode.css (removes emoji globally)
2. **HTML Files** - Update static text in HTML templates
3. **JavaScript Files** - Update dynamic text generation
4. **Demo Files** - Update demo pages (lower priority)
5. **Testing** - Verify all pages display correctly

---

## Summary

**Total Files to Modify:** ~15 files
**Risk Level:** Low (cosmetic changes only)
**Database Changes:** None
**API Changes:** None
**Breaking Changes:** None (internal names unchanged)
