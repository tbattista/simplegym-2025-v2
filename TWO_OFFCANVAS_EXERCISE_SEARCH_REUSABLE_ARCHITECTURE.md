# Two-Offcanvas Exercise Search - Reusable Architecture

## Design Principles

1. **Separation of Concerns** - Each offcanvas has ONE clear purpose
2. **Maximum Reusability** - Can be used anywhere in the app (workout-mode, workout-builder, etc.)
3. **Minimal Code Duplication** - Share common logic and components
4. **Callback-Based** - Parent context controls what happens with selected data
5. **Configuration-Driven** - Behavior controlled by config objects, not hardcoded logic

## Component Architecture

### 1. Exercise Search Offcanvas (Standalone, Reusable)
**Purpose:** Search and select an exercise from the library

**API:**
```javascript
UnifiedOffcanvasFactory.createExerciseSearchOffcanvas({
    title: 'Search Exercises',           // Optional, default: 'Search Exercises'
    showFilters: true,                   // Optional, default: true
    allowMultiSelect: false,             // Optional, default: false
    preSelectedExercises: [],            // Optional, for multi-select
    buttonText: 'Select',                // Optional, default: 'Select'
    buttonIcon: 'bx-check'              // Optional, default: 'bx-check'
}, onSelectExercise);

// Callback receives:
onSelectExercise(exerciseData) {
    // exerciseData = {
    //     id: 'exercise-123',
    //     name: 'Bench Press',
    //     targetMuscleGroup: 'Chest',
    //     difficulty: 'Intermediate',
    //     equipment: 'Barbell',
    //     tier: 1
    // }
}
```

**Use Cases:**
- Workout Mode: Select exercise to add as bonus
- Workout Builder: Select exercise to add to template
- Exercise Database: Browse and view exercises
- Any page that needs exercise selection

**Features:**
- Full search functionality
- All filters (muscle, difficulty, equipment, favorites)
- Pagination
- Responsive design
- Dark mode support
- Keyboard navigation

### 2. Add Exercise Form Offcanvas (Standalone, Reusable)
**Purpose:** Collect exercise parameters (name, sets, reps, rest, weight)

**API:**
```javascript
UnifiedOffcanvasFactory.createAddExerciseForm({
    title: 'Add Exercise',               // Optional, default: 'Add Exercise'
    exerciseName: '',                    // Optional, pre-fill name
    exerciseId: null,                    // Optional, link to DB exercise
    sets: '3',                           // Optional, default: '3'
    reps: '12',                          // Optional, default: '12'
    rest: '60s',                         // Optional, default: '60s'
    weight: '',                          // Optional, default: ''
    weightUnit: 'lbs',                   // Optional, default: 'lbs'
    showSearchButton: true,              // Optional, default: true
    showWeightFields: false,             // Optional, default: false
    requiredFields: ['name'],            // Optional, default: ['name']
    buttonText: 'Add Exercise',          // Optional, default: 'Add Exercise'
    buttonIcon: 'bx-plus-circle'        // Optional, default: 'bx-plus-circle'
}, onAddExercise, onSearchClick);

// Callbacks:
onAddExercise(exerciseData) {
    // exerciseData = {
    //     name: 'Bench Press',
    //     exerciseId: 'exercise-123',  // null if custom
    //     sets: '3',
    //     reps: '12',
    //     rest: '60s',
    //     weight: '135',               // if showWeightFields: true
    //     weightUnit: 'lbs'            // if showWeightFields: true
    // }
}

onSearchClick() {
    // Optional callback when search button clicked
    // Parent can open Exercise Search offcanvas
}
```

**Use Cases:**
- Workout Mode: Add bonus exercise with sets/reps/rest
- Workout Builder: Add exercise to template
- Quick Add: Simple exercise entry form
- Any page that needs exercise data collection

**Features:**
- Flexible field configuration
- Optional search button integration
- Validation
- Auto-enable/disable submit button
- Responsive design

## Reusable Component Structure

### Shared Exercise Search Logic (DRY Principle)

Extract common search functionality into a reusable module:

```javascript
// File: frontend/assets/js/components/exercise-search-core.js

class ExerciseSearchCore {
    constructor(config = {}) {
        this.state = {
            searchQuery: '',
            muscleGroup: '',
            difficulty: '',
            equipment: [],
            favoritesOnly: false,
            sortBy: 'name',
            sortOrder: 'asc',
            allExercises: [],
            filteredExercises: [],
            paginatedExercises: [],
            currentPage: 1,
            pageSize: config.pageSize || 30
        };
    }
    
    async loadExercises() { /* ... */ }
    filterExercises() { /* ... */ }
    applySorting() { /* ... */ }
    applyPagination() { /* ... */ }
    renderExerciseList(container, onSelectCallback) { /* ... */ }
    renderFilters(container) { /* ... */ }
    renderPagination(container) { /* ... */ }
}

window.ExerciseSearchCore = ExerciseSearchCore;
```

### UnifiedOffcanvasFactory Methods (Simplified)

Both offcanvas methods use the shared core:

```javascript
// File: frontend/assets/js/components/unified-offcanvas-factory.js

class UnifiedOffcanvasFactory {
    
    /**
     * Create standalone exercise search offcanvas
     * REUSABLE across entire app
     */
    static createExerciseSearchOffcanvas(config = {}, onSelectExercise) {
        const {
            title = 'Search Exercises',
            showFilters = true,
            allowMultiSelect = false,
            buttonText = 'Select',
            buttonIcon = 'bx-check'
        } = config;
        
        // Use shared search core
        const searchCore = new ExerciseSearchCore(config);
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1" id="exerciseSearchOffcanvas"
                 style="height: 85vh;">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title">
                        <i class="bx bx-search me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                </div>
                <div class="offcanvas-body p-0">
                    <!-- Search Box -->
                    <div class="search-section p-3 border-bottom bg-light">
                        <div class="input-group">
                            <span class="input-group-text"><i class="bx bx-search"></i></span>
                            <input type="text" class="form-control" id="exerciseSearchInput"
                                   placeholder="Search exercises..." autocomplete="off">
                        </div>
                    </div>
                    
                    <!-- Filters (optional) -->
                    ${showFilters ? `
                        <div class="filters-section p-3 border-bottom" id="filtersContainer">
                            <!-- Rendered by searchCore.renderFilters() -->
                        </div>
                    ` : ''}
                    
                    <!-- Exercise List -->
                    <div class="exercise-list-section flex-grow-1">
                        <div id="exerciseListContainer" class="p-3">
                            <!-- Rendered by searchCore.renderExerciseList() -->
                        </div>
                        <div id="paginationContainer" class="p-2 border-top bg-light">
                            <!-- Rendered by searchCore.renderPagination() -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('exerciseSearchOffcanvas', offcanvasHtml, (offcanvas, element) => {
            // Initialize search core
            searchCore.loadExercises().then(() => {
                if (showFilters) {
                    searchCore.renderFilters(element.querySelector('#filtersContainer'));
                }
                searchCore.renderExerciseList(
                    element.querySelector('#exerciseListContainer'),
                    (exercise) => {
                        onSelectExercise(exercise);
                        offcanvas.hide();
                    }
                );
                searchCore.renderPagination(element.querySelector('#paginationContainer'));
            });
            
            // Search input handler
            element.querySelector('#exerciseSearchInput')?.addEventListener('input', (e) => {
                searchCore.state.searchQuery = e.target.value;
                searchCore.filterExercises();
            });
        });
    }
    
    /**
     * Create standalone add exercise form offcanvas
     * REUSABLE across entire app
     */
    static createAddExerciseForm(config = {}, onAddExercise, onSearchClick = null) {
        const {
            title = 'Add Exercise',
            exerciseName = '',
            exerciseId = null,
            sets = '3',
            reps = '12',
            rest = '60s',
            weight = '',
            weightUnit = 'lbs',
            showSearchButton = true,
            showWeightFields = false,
            requiredFields = ['name'],
            buttonText = 'Add Exercise',
            buttonIcon = 'bx-plus-circle'
        } = config;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1" id="addExerciseFormOffcanvas">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title">
                        <i class="bx ${buttonIcon} me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                </div>
                <div class="offcanvas-body">
                    <!-- Exercise Name -->
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Exercise Name</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="exerciseNameInput"
                                   value="${this.escapeHtml(exerciseName)}"
                                   placeholder="Enter exercise name" autocomplete="off">
                            ${showSearchButton ? `
                                <button class="btn btn-outline-secondary" type="button" id="searchExerciseBtn">
                                    <i class="bx bx-search"></i> Search
                                </button>
                            ` : ''}
                        </div>
                        <small class="text-muted">Enter custom name or search library</small>
                    </div>
                    
                    <!-- Sets, Reps, Rest -->
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="form-label small">Sets</label>
                            <input type="text" class="form-control" id="setsInput" value="${sets}">
                        </div>
                        <div class="col-4">
                            <label class="form-label small">Reps</label>
                            <input type="text" class="form-control" id="repsInput" value="${reps}">
                        </div>
                        <div class="col-4">
                            <label class="form-label small">Rest</label>
                            <input type="text" class="form-control" id="restInput" value="${rest}">
                        </div>
                    </div>
                    
                    <!-- Weight Fields (optional) -->
                    ${showWeightFields ? `
                        <div class="row g-2 mb-3">
                            <div class="col-8">
                                <label class="form-label small">Weight</label>
                                <input type="text" class="form-control" id="weightInput" value="${weight}">
                            </div>
                            <div class="col-4">
                                <label class="form-label small">Unit</label>
                                <select class="form-select" id="weightUnitSelect">
                                    <option value="lbs" ${weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                                    <option value="kg" ${weightUnit === 'kg' ? 'selected' : ''}>kg</option>
                                    <option value="other" ${weightUnit === 'other' ? 'selected' : ''}>other</option>
                                </select>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Submit Button -->
                    <button class="btn btn-primary w-100" id="submitExerciseBtn" disabled>
                        <i class="bx ${buttonIcon} me-2"></i>${this.escapeHtml(buttonText)}
                    </button>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('addExerciseFormOffcanvas', offcanvasHtml, (offcanvas, element) => {
            // Store exercise ID (if linked to DB)
            let linkedExerciseId = exerciseId;
            
            // Get form elements
            const nameInput = element.querySelector('#exerciseNameInput');
            const setsInput = element.querySelector('#setsInput');
            const repsInput = element.querySelector('#repsInput');
            const restInput = element.querySelector('#restInput');
            const weightInput = element.querySelector('#weightInput');
            const weightUnitSelect = element.querySelector('#weightUnitSelect');
            const submitBtn = element.querySelector('#submitExerciseBtn');
            const searchBtn = element.querySelector('#searchExerciseBtn');
            
            // Validation function
            const validateForm = () => {
                const isValid = requiredFields.every(field => {
                    if (field === 'name') return nameInput.value.trim().length > 0;
                    return true;
                });
                submitBtn.disabled = !isValid;
            };
            
            // Input handlers
            nameInput?.addEventListener('input', validateForm);
            
            // Search button handler
            if (searchBtn && onSearchClick) {
                searchBtn.addEventListener('click', () => {
                    onSearchClick((selectedExercise) => {
                        // Callback to populate form with selected exercise
                        nameInput.value = selectedExercise.name;
                        linkedExerciseId = selectedExercise.id;
                        validateForm();
                    });
                });
            }
            
            // Submit handler
            submitBtn?.addEventListener('click', () => {
                const exerciseData = {
                    name: nameInput.value.trim(),
                    exerciseId: linkedExerciseId,
                    sets: setsInput.value.trim(),
                    reps: repsInput.value.trim(),
                    rest: restInput.value.trim()
                };
                
                if (showWeightFields) {
                    exerciseData.weight = weightInput.value.trim();
                    exerciseData.weightUnit = weightUnitSelect.value;
                }
                
                onAddExercise(exerciseData);
                offcanvas.hide();
            });
            
            // Initial validation
            validateForm();
        });
    }
}
```

## Usage Examples

### Example 1: Workout Mode (Current Use Case)

```javascript
// In workout-mode-controller.js

handleBonusExercises() {
    // Open Add Exercise form
    const addFormOffcanvas = UnifiedOffcanvasFactory.createAddExerciseForm(
        {
            title: 'Add Bonus Exercise',
            showSearchButton: true,
            showWeightFields: false
        },
        // onAddExercise callback
        (exerciseData) => {
            this.sessionService.addBonusExercise(exerciseData);
            this.renderWorkout();
            if (window.showAlert) {
                window.showAlert(`${exerciseData.name} added!`, 'success');
            }
        },
        // onSearchClick callback
        (populateCallback) => {
            // Open Exercise Search offcanvas
            UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
                {
                    title: 'Search Exercise Library',
                    showFilters: true
                },
                (selectedExercise) => {
                    // Populate the Add Exercise form
                    populateCallback(selectedExercise);
                }
            );
        }
    );
}
```

### Example 2: Workout Builder (Add to Template)

```javascript
// In workout-builder.js

addExerciseToTemplate() {
    UnifiedOffcanvasFactory.createAddExerciseForm(
        {
            title: 'Add Exercise to Template',
            showSearchButton: true,
            showWeightFields: true,  // Include default weight
            buttonText: 'Add to Template'
        },
        (exerciseData) => {
            // Add to workout template
            this.currentWorkout.exercise_groups.push({
                exercises: { a: exerciseData.name },
                sets: exerciseData.sets,
                reps: exerciseData.reps,
                rest: exerciseData.rest,
                default_weight: exerciseData.weight,
                default_weight_unit: exerciseData.weightUnit
            });
            this.renderWorkout();
        },
        (populateCallback) => {
            UnifiedOffcanvasFactory.createExerciseSearchOffcanvas({}, populateCallback);
        }
    );
}
```

### Example 3: Quick Exercise Browser (View Only)

```javascript
// In exercise-database.js

browseExercises() {
    UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
        {
            title: 'Browse Exercise Library',
            showFilters: true,
            buttonText: 'View Details',
            buttonIcon: 'bx-info-circle'
        },
        (selectedExercise) => {
            // Navigate to exercise detail page
            window.location.href = `exercise-detail.html?id=${selectedExercise.id}`;
        }
    );
}
```

### Example 4: Replace Exercise in Workout

```javascript
// In workout-mode.js

replaceExercise(currentExerciseName) {
    UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
        {
            title: 'Replace Exercise',
            buttonText: 'Replace',
            buttonIcon: 'bx-refresh'
        },
        (selectedExercise) => {
            // Replace in workout
            this.sessionService.replaceExercise(currentExerciseName, selectedExercise.name);
            this.renderWorkout();
        }
    );
}
```

## Code Reuse Benefits

1. **Single Source of Truth** - Exercise search logic in one place
2. **Consistent UX** - Same search experience everywhere
3. **Easy Maintenance** - Fix bugs once, applies everywhere
4. **Flexible Configuration** - Adapt to different contexts via config
5. **Testable** - Core logic can be unit tested independently
6. **Extensible** - Easy to add new features (e.g., multi-select)

## File Structure

```
frontend/assets/js/
├── components/
│   ├── unified-offcanvas-factory.js    # Factory methods
│   ├── exercise-search-core.js         # Shared search logic (NEW)
│   └── exercise-card-renderer.js       # Existing
├── controllers/
│   └── workout-mode-controller.js      # Uses factory methods
└── services/
    └── workout-session-service.js      # Existing
```

## Migration Path

1. **Phase 1:** Create `exercise-search-core.js` with shared logic
2. **Phase 2:** Add `createExerciseSearchOffcanvas` to factory
3. **Phase 3:** Add `createAddExerciseForm` to factory
4. **Phase 4:** Update workout-mode-controller to use new methods
5. **Phase 5:** Gradually migrate other pages (workout-builder, etc.)

## Testing Strategy

### Unit Tests (exercise-search-core.js)
- Filter logic
- Sorting logic
- Pagination logic
- Search query handling

### Integration Tests
- Offcanvas creation and display
- Callback execution
- Form validation
- Exercise selection flow

### E2E Tests
- Complete workflow: open → search → select → add
- Multiple contexts (workout-mode, workout-builder)
- Mobile responsive behavior
- Keyboard navigation

## Summary

This architecture provides:
- ✅ **Maximum Reusability** - Use anywhere in the app
- ✅ **Minimal Duplication** - Shared core logic
- ✅ **Simple API** - Configuration-driven behavior
- ✅ **Flexible** - Adapt to different contexts
- ✅ **Maintainable** - Single source of truth
- ✅ **Testable** - Isolated, testable components