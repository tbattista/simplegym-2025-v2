# Workout Builder Popover Redesign Plan

## Overview
Convert the workout builder's accordion-based exercise group editing to a bottom popover/offcanvas pattern, following Sneat template UI best practices as demonstrated in [`workout-database.html`](frontend/workout-database.html).

**Design Decision:** One exercise group per popover edit (Option A) - provides a cleaner, more focused editing experience that aligns with Sneat patterns.

---

## Current Implementation Analysis

### Current Structure (Accordion-Based)
- **Location:** [`frontend/workout-builder.html`](frontend/workout-builder.html:227-229)
- **Container:** `#exerciseGroups` with `.accordion-workout-groups` class
- **Items:** `.accordion-item.exercise-group` elements
- **Behavior:** 
  - Accordion headers show exercise preview
  - Clicking header expands to show edit fields
  - Edit mode allows drag-and-drop reordering
  - Delete button in accordion body

### Components to Convert

#### 1. Exercise Group Accordion Items
**Current:** Lines 506-607 in [`workouts.js`](frontend/assets/js/dashboard/workouts.js:506-607)
```javascript
// Accordion structure with:
- .accordion-header with preview
- .accordion-button (collapsible)
- .accordion-body with form fields
- Drag handle for reordering
```

**Convert To:** Compact card with preview + Edit button

#### 2. Bonus Exercises
**Current:** Lines 703-764 in [`workouts.js`](frontend/assets/js/dashboard/workouts.js:703-764)
- Similar accordion structure
- Simpler fields (name, sets, reps, rest)

**Convert To:** Same card + popover pattern

---

## New Design Architecture

### 1. Main View - Exercise Group Cards

Replace accordion with **compact preview cards** similar to workout cards in workout-database:

```html
<div id="exerciseGroups" class="exercise-groups-container">
  <!-- Each group becomes a card -->
  <div class="exercise-group-card" data-group-id="group-123">
    <div class="card">
      <div class="card-body">
        <!-- Preview Content -->
        <div class="exercise-preview">
          <h6 class="exercise-main">Bench Press</h6>
          <div class="exercise-alternates">
            <span class="text-muted small">Alt: Dumbbell Press</span>
          </div>
          <div class="exercise-meta">
            <span class="badge bg-label-primary">3 Sets</span>
            <span class="badge bg-label-info">8-12 Reps</span>
            <span class="badge bg-label-secondary">60s Rest</span>
            <span class="badge bg-label-success">135 lbs</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="btn-group mt-2">
          <button class="btn btn-outline-primary btn-edit-group" 
                  data-group-id="group-123">
            <i class="bx bx-edit"></i> Edit
          </button>
          <button class="btn btn-outline-danger btn-delete-group"
                  data-group-id="group-123">
            <i class="bx bx-trash"></i> Delete
          </button>
        </div>
        
        <!-- Drag Handle (visible in edit mode) -->
        <div class="drag-handle" style="display: none;">
          <i class="bx bx-menu"></i>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 2. Bottom Popover - Exercise Group Editor

**Pattern:** Bootstrap Offcanvas (bottom) - matches [`workout-database.html`](frontend/workout-database.html:244-269)

```html
<!-- Exercise Group Edit Offcanvas -->
<div class="offcanvas offcanvas-bottom" tabindex="-1" 
     id="exerciseGroupEditOffcanvas" 
     aria-labelledby="exerciseGroupEditLabel">
  
  <!-- Header -->
  <div class="offcanvas-header border-bottom">
    <h5 class="offcanvas-title" id="exerciseGroupEditLabel">
      <i class="bx bx-dumbbell me-2"></i>
      <span id="exerciseGroupTitle">Edit Exercise Group</span>
    </h5>
    <button type="button" class="btn-close" 
            data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>
  
  <!-- Body - Scrollable -->
  <div class="offcanvas-body" id="exerciseGroupEditBody">
    <!-- Exercise Inputs -->
    <div class="mb-3">
      <label class="form-label">Primary Exercise *</label>
      <input type="text" class="form-control exercise-input exercise-autocomplete-input"
             id="editExerciseA" placeholder="Search exercises...">
    </div>
    
    <div class="mb-3">
      <label class="form-label">Alternate Exercise B</label>
      <input type="text" class="form-control exercise-input exercise-autocomplete-input"
             id="editExerciseB" placeholder="Search exercises...">
    </div>
    
    <div class="mb-3">
      <label class="form-label">Alternate Exercise C</label>
      <input type="text" class="form-control exercise-input exercise-autocomplete-input"
             id="editExerciseC" placeholder="Search exercises...">
    </div>
    
    <!-- Sets, Reps, Rest -->
    <div class="row g-2 mb-3">
      <div class="col-4">
        <label class="form-label">Sets</label>
        <input type="text" class="form-control sets-input text-center" 
               id="editSets" value="3">
      </div>
      <div class="col-4">
        <label class="form-label">Reps</label>
        <input type="text" class="form-control reps-input text-center" 
               id="editReps" value="8-12">
      </div>
      <div class="col-4">
        <label class="form-label">Rest</label>
        <input type="text" class="form-control rest-input text-center" 
               id="editRest" value="60s">
      </div>
    </div>
    
    <!-- Weight -->
    <div class="mb-3">
      <label class="form-label">
        <i class="bx bx-dumbbell me-1"></i>
        Default Weight
      </label>
      <div class="row g-2">
        <div class="col-4">
          <input type="text" class="form-control weight-input text-center" 
                 id="editWeight" placeholder="0">
        </div>
        <div class="col-8">
          <div class="btn-group w-100" role="group">
            <button type="button" class="btn btn-outline-secondary weight-unit-btn active" 
                    data-unit="lbs">lbs</button>
            <button type="button" class="btn btn-outline-secondary weight-unit-btn" 
                    data-unit="kg">kg</button>
            <button type="button" class="btn btn-outline-secondary weight-unit-btn" 
                    data-unit="other">other</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Footer - Action Buttons -->
  <div class="offcanvas-footer border-top p-3">
    <div class="d-flex gap-2">
      <button type="button" class="btn btn-label-secondary flex-fill" 
              data-bs-dismiss="offcanvas">Cancel</button>
      <button type="button" class="btn btn-primary flex-fill" 
              id="saveExerciseGroupBtn">
        <i class="bx bx-save me-1"></i>
        Save Changes
      </button>
    </div>
  </div>
</div>
```

### 3. Bonus Exercise Popover

Similar structure but simpler fields:

```html
<div class="offcanvas offcanvas-bottom" tabindex="-1" 
     id="bonusExerciseEditOffcanvas">
  <!-- Header, Body with name/sets/reps/rest, Footer -->
</div>
```

---

## CSS Updates

### New Styles Needed

**File:** [`frontend/assets/css/workout-builder.css`](frontend/assets/css/workout-builder.css)

```css
/* ============================================
   EXERCISE GROUP CARDS (Replace Accordion)
   ============================================ */

.exercise-groups-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.exercise-group-card {
    transition: all 0.2s ease;
}

.exercise-group-card .card {
    border: 2px solid var(--bs-border-color);
    transition: all 0.2s ease;
}

.exercise-group-card .card:hover {
    border-color: var(--bs-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Selected state for editing */
.exercise-group-card.editing .card {
    border-color: var(--bs-primary);
    background: rgba(var(--bs-primary-rgb), 0.05);
}

/* Exercise Preview */
.exercise-preview {
    margin-bottom: 0.75rem;
}

.exercise-preview .exercise-main {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: var(--bs-heading-color);
}

.exercise-preview .exercise-alternates {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.exercise-preview .exercise-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

/* Drag Handle (Edit Mode) */
.exercise-group-card .drag-handle {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    cursor: move;
    font-size: 1.5rem;
    color: var(--bs-secondary);
    padding: 0.5rem;
}

.exercise-group-card .drag-handle:hover {
    color: var(--bs-primary);
}

/* Edit Mode Active */
.exercise-groups-container.edit-mode-active .exercise-group-card {
    cursor: move;
}

.exercise-groups-container.edit-mode-active .drag-handle {
    display: block !important;
}

.exercise-groups-container.edit-mode-active .btn-group {
    pointer-events: none;
    opacity: 0.5;
}

/* ============================================
   OFFCANVAS EDITOR STYLES
   ============================================ */

/* Match workout-database offcanvas sizing */
#exerciseGroupEditOffcanvas,
#bonusExerciseEditOffcanvas {
    height: auto !important;
    max-height: 85vh;
    min-height: 40vh;
}

#exerciseGroupEditOffcanvas .offcanvas-body,
#bonusExerciseEditOffcanvas .offcanvas-body {
    overflow-y: auto;
    max-height: calc(85vh - 140px);
}

/* Form styling in offcanvas */
.offcanvas-body .form-label {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.offcanvas-body .form-control {
    font-size: 0.875rem;
}

/* Weight unit buttons */
.offcanvas-body .weight-unit-btn.active {
    background-color: var(--bs-primary);
    border-color: var(--bs-primary);
    color: white;
}

/* ============================================
   DARK MODE
   ============================================ */

[data-bs-theme="dark"] .exercise-group-card .card {
    background: #1e293b;
    border-color: #475569;
}

[data-bs-theme="dark"] .exercise-group-card .card:hover {
    background: #334155;
}

[data-bs-theme="dark"] .exercise-preview .exercise-main {
    color: #f8fafc;
}
```

---

## JavaScript Implementation

### Core Functions to Update

#### 1. Add Exercise Group (Modified)
**File:** [`frontend/assets/js/dashboard/workouts.js`](frontend/assets/js/dashboard/workouts.js:492)

```javascript
function addExerciseGroup() {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;
    
    const groupCount = container.children.length + 1;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create card instead of accordion
    const groupHtml = `
        <div class="exercise-group-card" data-group-id="${groupId}">
            <div class="card">
                <div class="card-body">
                    <div class="exercise-preview">
                        <h6 class="exercise-main">New Exercise Group ${groupCount}</h6>
                        <div class="exercise-alternates">
                            <span class="text-muted small">Click Edit to add exercises</span>
                        </div>
                        <div class="exercise-meta"></div>
                    </div>
                    
                    <div class="btn-group mt-2">
                        <button class="btn btn-outline-primary btn-edit-group" 
                                onclick="openExerciseGroupEditor('${groupId}')">
                            <i class="bx bx-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-delete-group"
                                onclick="deleteExerciseGroupCard('${groupId}')">
                            <i class="bx bx-trash"></i> Delete
                        </button>
                    </div>
                    
                    <div class="drag-handle" style="display: none;">
                        <i class="bx bx-menu"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', groupHtml);
    
    // Auto-open editor for new group
    openExerciseGroupEditor(groupId);
    
    markEditorDirty();
}
```

#### 2. Open Exercise Group Editor (New)

```javascript
/**
 * Open bottom offcanvas to edit exercise group
 * @param {string} groupId - ID of group to edit
 */
function openExerciseGroupEditor(groupId) {
    const groupCard = document.querySelector(`[data-group-id="${groupId}"]`);
    if (!groupCard) return;
    
    // Get current data from card or create new
    const groupData = getExerciseGroupData(groupId);
    
    // Populate offcanvas fields
    document.getElementById('editExerciseA').value = groupData.exercises.a || '';
    document.getElementById('editExerciseB').value = groupData.exercises.b || '';
    document.getElementById('editExerciseC').value = groupData.exercises.c || '';
    document.getElementById('editSets').value = groupData.sets || '3';
    document.getElementById('editReps').value = groupData.reps || '8-12';
    document.getElementById('editRest').value = groupData.rest || '60s';
    document.getElementById('editWeight').value = groupData.default_weight || '';
    
    // Set weight unit
    document.querySelectorAll('.weight-unit-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-unit') === (groupData.default_weight_unit || 'lbs');
        btn.classList.toggle('active', isActive);
    });
    
    // Store current group ID for saving
    window.currentEditingGroupId = groupId;
    
    // Mark card as editing
    document.querySelectorAll('.exercise-group-card').forEach(c => c.classList.remove('editing'));
    groupCard.classList.add('editing');
    
    // Initialize autocompletes
    initializeExerciseAutocompletes();
    
    // Open offcanvas
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('exerciseGroupEditOffcanvas'));
    offcanvas.show();
}
```

#### 3. Save Exercise Group from Offcanvas (New)

```javascript
/**
 * Save exercise group changes from offcanvas
 */
function saveExerciseGroupFromOffcanvas() {
    const groupId = window.currentEditingGroupId;
    if (!groupId) return;
    
    // Collect data from offcanvas
    const groupData = {
        exercises: {
            a: document.getElementById('editExerciseA').value.trim(),
            b: document.getElementById('editExerciseB').value.trim(),
            c: document.getElementById('editExerciseC').value.trim()
        },
        sets: document.getElementById('editSets').value,
        reps: document.getElementById('editReps').value,
        rest: document.getElementById('editRest').value,
        default_weight: document.getElementById('editWeight').value.trim(),
        default_weight_unit: document.querySelector('.weight-unit-btn.active')?.getAttribute('data-unit') || 'lbs'
    };
    
    // Validate
    if (!groupData.exercises.a) {
        showAlert('Primary exercise is required', 'danger');
        return;
    }
    
    // Update card preview
    updateExerciseGroupCardPreview(groupId, groupData);
    
    // Close offcanvas
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('exerciseGroupEditOffcanvas'));
    if (offcanvas) offcanvas.hide();
    
    // Remove editing state
    document.querySelector(`[data-group-id="${groupId}"]`)?.classList.remove('editing');
    
    // Mark as dirty for autosave
    markEditorDirty();
    
    console.log('✅ Exercise group updated:', groupId);
}
```

#### 4. Update Card Preview (New)

```javascript
/**
 * Update exercise group card preview after editing
 * @param {string} groupId - Group ID
 * @param {object} groupData - Group data
 */
function updateExerciseGroupCardPreview(groupId, groupData) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    if (!card) return;
    
    const preview = card.querySelector('.exercise-preview');
    if (!preview) return;
    
    // Update main exercise
    const mainEl = preview.querySelector('.exercise-main');
    mainEl.textContent = groupData.exercises.a || 'New Exercise Group';
    
    // Update alternates
    const alternatesEl = preview.querySelector('.exercise-alternates');
    const alternates = [groupData.exercises.b, groupData.exercises.c].filter(e => e);
    if (alternates.length > 0) {
        alternatesEl.innerHTML = alternates.map(alt => 
            `<span class="text-muted small">Alt: ${escapeHtml(alt)}</span>`
        ).join('<br>');
    } else {
        alternatesEl.innerHTML = '';
    }
    
    // Update meta badges
    const metaEl = preview.querySelector('.exercise-meta');
    metaEl.innerHTML = `
        <span class="badge bg-label-primary">${groupData.sets} Sets</span>
        <span class="badge bg-label-info">${groupData.reps} Reps</span>
        <span class="badge bg-label-secondary">${groupData.rest} Rest</span>
        ${groupData.default_weight ? 
            `<span class="badge bg-label-success">${groupData.default_weight} ${groupData.default_weight_unit}</span>` 
            : ''}
    `;
}
```

#### 5. Collect Exercise Groups (Modified)

Update [`collectExerciseGroups()`](frontend/assets/js/dashboard/workouts.js:415) to work with cards:

```javascript
function collectExerciseGroups() {
    const groups = [];
    const groupCards = document.querySelectorAll('.exercise-group-card');
    
    groupCards.forEach(card => {
        const groupId = card.getAttribute('data-group-id');
        const groupData = getExerciseGroupData(groupId);
        
        // Only include if has at least one exercise
        if (groupData.exercises.a) {
            groups.push(groupData);
        }
    });
    
    return groups;
}
```

#### 6. Get Exercise Group Data (New Helper)

```javascript
/**
 * Get exercise group data from card or stored data
 * @param {string} groupId - Group ID
 * @returns {object} Group data
 */
function getExerciseGroupData(groupId) {
    // Check if data is stored (for existing groups)
    if (window.exerciseGroupsData && window.exerciseGroupsData[groupId]) {
        return window.exerciseGroupsData[groupId];
    }
    
    // Return empty template for new groups
    return {
        exercises: { a: '', b: '', c: '' },
        sets: '3',
        reps: '8-12',
        rest: '60s',
        default_weight: '',
        default_weight_unit: 'lbs'
    };
}

/**
 * Store exercise group data
 * @param {string} groupId - Group ID
 * @param {object} data - Group data
 */
function storeExerciseGroupData(groupId, data) {
    window.exerciseGroupsData = window.exerciseGroupsData || {};
    window.exerciseGroupsData[groupId] = data;
}
```

---

## Edit Mode (Reorder) Updates

### Modified Behavior

1. **Enter Edit Mode:**
   - Show drag handles on cards
   - Disable Edit/Delete buttons
   - Enable Sortable.js on card container
   - Cards become draggable

2. **Exit Edit Mode:**
   - Hide drag handles
   - Re-enable Edit/Delete buttons
   - Save new order if changed

### Updated Functions

```javascript
function enterEditMode() {
    const container = document.getElementById('exerciseGroups');
    container.classList.add('edit-mode-active');
    
    // Show drag handles
    document.querySelectorAll('.exercise-group-card .drag-handle').forEach(handle => {
        handle.style.display = 'block';
    });
    
    // Initialize Sortable if not already
    if (!container.sortableInstance) {
        container.sortableInstance = new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                markEditorDirty();
            }
        });
    }
}

function exitEditMode() {
    const container = document.getElementById('exerciseGroups');
    container.classList.remove('edit-mode-active');
    
    // Hide drag handles
    document.querySelectorAll('.exercise-group-card .drag-handle').forEach(handle => {
        handle.style.display = 'none';
    });
}
```

---

## Mobile Responsiveness

### Key Considerations

1. **Offcanvas Height:** Auto-adjust based on content (max 85vh)
2. **Touch Targets:** Minimum 44px for buttons
3. **Form Fields:** Full-width, adequate spacing
4. **Keyboard:** Proper input types and autocomplete

### Mobile-Specific CSS

```css
@media (max-width: 768px) {
    .exercise-group-card .card-body {
        padding: 0.75rem;
    }
    
    .exercise-preview .exercise-main {
        font-size: 1rem;
    }
    
    .exercise-preview .exercise-meta {
        gap: 0.375rem;
    }
    
    .exercise-preview .badge {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
    }
    
    .btn-group .btn {
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem;
    }
    
    /* Offcanvas adjustments */
    #exerciseGroupEditOffcanvas,
    #bonusExerciseEditOffcanvas {
        max-height: 90vh;
    }
}
```

---

## Integration Points

### 1. Load Workout Into Editor
**File:** [`frontend/assets/js/components/workout-editor.js`](frontend/assets/js/components/workout-editor.js:11)

Update to create cards instead of accordions:

```javascript
function loadWorkoutIntoEditor(workoutId) {
    // ... existing code ...
    
    // Clear and populate exercise groups
    const exerciseGroupsContainer = document.getElementById('exerciseGroups');
    exerciseGroupsContainer.innerHTML = '';
    
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        workout.exercise_groups.forEach((group, index) => {
            const groupId = `group-${Date.now()}-${index}`;
            
            // Store group data
            storeExerciseGroupData(groupId, group);
            
            // Create card
            const groupHtml = createExerciseGroupCard(groupId, group, index + 1);
            exerciseGroupsContainer.insertAdjacentHTML('beforeend', groupHtml);
        });
    } else {
        addExerciseGroup();
    }
    
    // ... rest of existing code ...
}
```

### 2. Autosave Integration

Autosave should trigger when:
- Offcanvas is closed after changes
- Any field in offcanvas is modified (with debounce)

```javascript
// Add listeners in openExerciseGroupEditor
document.querySelectorAll('#exerciseGroupEditOffcanvas input, #exerciseGroupEditOffcanvas select').forEach(input => {
    input.addEventListener('change', () => {
        // Auto-save on change
        saveExerciseGroupFromOffcanvas();
    });
});
```

---

## Testing Checklist

### Functional Tests
- [ ] Add new exercise group creates card
- [ ] Edit button opens offcanvas with correct data
- [ ] Save button updates card preview
- [ ] Cancel button discards changes
- [ ] Delete button removes card with confirmation
- [ ] Drag-and-drop reordering works in edit mode
- [ ] Autosave triggers correctly
- [ ] Exercise autocomplete works in offcanvas
- [ ] Weight unit buttons toggle correctly
- [ ] Bonus exercises follow same pattern

### UI/UX Tests
- [ ] Cards match Sneat design patterns
- [ ] Offcanvas height adjusts properly
- [ ] Smooth animations and transitions
- [ ] Proper focus management
- [ ] Keyboard navigation works
- [ ] Touch targets adequate on mobile
- [ ] Dark mode styling correct

### Integration Tests
- [ ] Load existing workout populates cards correctly
- [ ] Save workout collects data from cards
- [ ] Edit mode doesn't interfere with editing
- [ ] Multiple groups can be edited sequentially
- [ ] Data persists across page navigation

---

## Migration Strategy

### Phase 1: Preparation
1. Create new CSS classes (don't remove old ones yet)
2. Add offcanvas HTML to workout-builder.html
3. Create new JavaScript functions (keep old ones)

### Phase 2: Implementation
1. Update `addExerciseGroup()` to create cards
2. Implement `openExerciseGroupEditor()` and save function
3. Update `collectExerciseGroups()` to read from cards
4. Modify `loadWorkoutIntoEditor()` to create cards

### Phase 3: Testing
1. Test with existing workouts
2. Test all CRUD operations
3. Test edit mode
4. Test mobile responsiveness

### Phase 4: Cleanup
1. Remove old accordion CSS
2. Remove old accordion JavaScript
3. Update documentation

---

## Files to Modify

### HTML
- [`frontend/workout-builder.html`](frontend/workout-builder.html)
  - Add exercise group edit offcanvas (after line 269)
  - Add bonus exercise edit offcanvas
  - Keep `#exerciseGroups` container

### CSS
- [`frontend/assets/css/workout-builder.css`](frontend/assets/css/workout-builder.css)
  - Add card styles (lines 99-188 can be adapted)
  - Add offcanvas styles
  - Update edit mode styles (lines 660-748)
  - Keep mobile responsive styles (lines 1044-1348)

### JavaScript
- [`frontend/assets/js/dashboard/workouts.js`](frontend/assets/js/dashboard/workouts.js)
  - Modify `addExerciseGroup()` (line 492)
  - Add `openExerciseGroupEditor()`
  - Add `saveExerciseGroupFromOffcanvas()`
  - Add `updateExerciseGroupCardPreview()`
  - Modify `collectExerciseGroups()` (line 415)
  - Update edit mode functions (lines 1479-1764)

- [`frontend/assets/js/components/workout-editor.js`](frontend/assets/js/components/workout-editor.js)
  - Modify `loadWorkoutIntoEditor()` (line 11)
  - Update to create cards instead of accordions

---

## Benefits of This Approach

### User Experience
✅ **Cleaner Interface:** Cards are more scannable than accordions
✅ **Focused Editing:** One group at a time reduces cognitive load
✅ **Better Mobile UX:** Bottom offcanvas is thumb-friendly
✅ **Consistent Pattern:** Matches workout-database design

### Developer Experience
✅ **Simpler State Management:** No accordion collapse state to track
✅ **Easier Testing:** Isolated edit operations
✅ **Better Maintainability:** Clear separation of view and edit
✅ **Sneat Compliance:** Follows template best practices

### Performance
✅ **Lighter DOM:** Cards are simpler than accordions
✅ **Lazy Loading:** Offcanvas only renders when opened
✅ **Smoother Animations:** Bootstrap offcanvas is optimized

---

## Next Steps

1. **Review this plan** with the team
2. **Create a branch** for the redesign
3. **Implement Phase 1** (preparation)
4. **Test incrementally** after each phase
5. **Switch to Code mode** to begin implementation

---

## Questions for Clarification

1. Should we keep the ability to add more than 3 exercises (d, e, f) per group?
2. Should the offcanvas auto-save on field change or only on explicit Save button click?
3. Do we want a "Quick Add" mode that skips the offcanvas for simple groups?
4. Should bonus exercises have the exact same UI or a simplified version?

---

**Ready to proceed to implementation?** Switch to Code mode and we'll start with Phase 1!