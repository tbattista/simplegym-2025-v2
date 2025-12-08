# Bonus Exercise Offcanvas - Demo Style Migration Plan

## Overview
Replace the current complex bonus exercise offcanvas (lines 608-990 in `unified-offcanvas-factory.js`) with a simpler, cleaner demo-style version while maintaining full backend integration.

## Current vs Demo Comparison

### Current Production (Complex)
**Location:** `unified-offcanvas-factory.js` lines 608-990

**Features:**
- ✅ Autocomplete search with exercise database integration
- ✅ Previous exercises from last session (collapsible)
- ✅ Manual entry form (collapsible with sets/reps/weight)
- ✅ Auto-create custom exercises
- ✅ Real-time validation
- ✅ Complex UI with multiple sections

**Issues:**
- Too many options overwhelming users
- Collapsible sections add complexity
- Manual entry form rarely used
- Search is primary action but buried in UI

### Demo Version (Simple)
**Location:** `workout-mode-demo-v2.html` lines 150-207

**Features:**
- ✅ Prominent search input with clear button
- ✅ Filter chips (All, Chest, Shoulders, Triceps)
- ✅ Simple exercise list
- ✅ Empty state when no results
- ✅ Click exercise to add
- ❌ Uses dummy data (needs real backend)

**Advantages:**
- Search-first design
- Visual filter chips for quick filtering
- Cleaner, more focused UI
- Faster interaction flow

---

## Implementation Strategy

### Phase 1: Analysis & Design ✓

#### Key Differences Identified:

1. **Search Section**
   - Demo: Prominent at top with clear button
   - Current: Inside collapsible section with autocomplete

2. **Filtering**
   - Demo: Visual filter chips (All, Chest, Shoulders, Triceps)
   - Current: No visual filters (relies on search)

3. **Exercise List**
   - Demo: Simple list-group items with click to add
   - Current: Complex chips with previous exercises

4. **Manual Entry**
   - Demo: None (simplified)
   - Current: Collapsible form with sets/reps/weight

5. **Previous Exercises**
   - Demo: None shown
   - Current: Collapsible section with chips

---

### Phase 2: New Structure Design

#### HTML Structure (Demo Style)
```html
<div class="offcanvas offcanvas-bottom offcanvas-bottom-base" 
     style="height: 85vh;">
  
  <!-- Header -->
  <div class="offcanvas-header border-bottom">
    <h5 class="offcanvas-title">
      <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise
    </h5>
    <button type="button" class="btn-close" 
            data-bs-dismiss="offcanvas"></button>
  </div>
  
  <!-- Body with padding removed for full-width sections -->
  <div class="offcanvas-body p-0">
    
    <!-- Search Section (sticky at top) -->
    <div class="bonus-search-section p-3 border-bottom bg-light">
      <div class="input-group">
        <span class="input-group-text">
          <i class="bx bx-search"></i>
        </span>
        <input type="text" 
               class="form-control" 
               id="bonusExerciseSearch"
               placeholder="Search exercises..."
               autocomplete="off">
        <button class="btn btn-outline-secondary" 
                type="button" 
                id="clearSearchBtn" 
                style="display: none;">
          <i class="bx bx-x"></i>
        </button>
      </div>
      
      <!-- Filter Chips -->
      <div class="mt-3 d-flex flex-wrap gap-2" 
           id="filterChipsContainer">
        <!-- Chips rendered dynamically -->
      </div>
    </div>
    
    <!-- Exercise List (scrollable) -->
    <div class="list-group list-group-flush" 
         id="bonusExerciseList"
         style="max-height: calc(85vh - 200px); overflow-y: auto;">
      <!-- Exercise items rendered here -->
    </div>
    
    <!-- Empty State -->
    <div id="emptyState" 
         class="text-center py-5" 
         style="display: none;">
      <i class="bx bx-search-alt display-1 text-muted"></i>
      <p class="text-muted mt-3">No exercises found</p>
      <button class="btn btn-sm btn-outline-primary" 
              onclick="clearBonusSearch()">
        Clear Search
      </button>
    </div>
    
  </div>
</div>
```

#### Filter Chips Configuration
```javascript
const MUSCLE_GROUP_FILTERS = [
  { id: 'all', label: 'All', icon: 'bx-grid-alt' },
  { id: 'chest', label: 'Chest', icon: 'bx-body' },
  { id: 'back', label: 'Back', icon: 'bx-body' },
  { id: 'shoulders', label: 'Shoulders', icon: 'bx-body' },
  { id: 'arms', label: 'Arms', icon: 'bx-body' },
  { id: 'legs', label: 'Legs', icon: 'bx-body' },
  { id: 'core', label: 'Core', icon: 'bx-body' }
];
```

---

### Phase 3: CSS Additions

#### New Styles Needed
**File:** `frontend/assets/css/components/unified-offcanvas.css`

```css
/* ============================================
   BONUS EXERCISE DEMO STYLE
   ============================================ */

/* Search Section (sticky header) */
.bonus-search-section {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
}

/* Filter Chips */
.filter-chip {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1.5px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-chip:hover {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.1);
  transform: translateY(-1px);
}

.filter-chip.active {
  background: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
}

.filter-chip i {
  font-size: 1rem;
}

/* Exercise List Items */
.bonus-exercise-item {
  padding: 1rem 1.25rem;
  border: none;
  border-bottom: 1px solid var(--bs-border-color);
  cursor: pointer;
  transition: background 0.2s ease;
}

.bonus-exercise-item:hover {
  background: rgba(var(--bs-primary-rgb), 0.05);
}

.bonus-exercise-item:active {
  background: rgba(var(--bs-primary-rgb), 0.1);
}

.bonus-exercise-item .exercise-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.bonus-exercise-item .exercise-meta {
  font-size: 0.875rem;
  color: var(--bs-secondary-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bonus-exercise-item .muscle-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* Empty State */
#emptyState {
  padding: 3rem 1.5rem;
}

#emptyState i {
  font-size: 4rem;
  opacity: 0.3;
}

/* Dark Mode Support */
[data-bs-theme="dark"] .bonus-search-section {
  background: var(--bs-gray-900);
  border-bottom-color: var(--bs-gray-700);
}

[data-bs-theme="dark"] .filter-chip {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-700);
}

[data-bs-theme="dark"] .bonus-exercise-item {
  border-bottom-color: var(--bs-gray-700);
}

/* Mobile Responsive */
@media (max-width: 576px) {
  .filter-chip {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .bonus-exercise-item {
    padding: 0.875rem 1rem;
  }
}
```

---

### Phase 4: JavaScript Implementation

#### New Method Structure
**File:** `frontend/assets/js/components/unified-offcanvas-factory.js`

Replace `createBonusExercise()` method (lines 608-990) with:

```javascript
/**
 * Create demo-style bonus exercise offcanvas
 * Simple search-first design with filter chips
 * @param {Object} data - Configuration data
 * @param {Function} onAddExercise - Callback when exercise is added
 * @returns {Object} Offcanvas instance
 */
static createBonusExercise(data, onAddExercise) {
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" 
             tabindex="-1"
             id="bonusExerciseOffcanvas"
             aria-labelledby="bonusExerciseOffcanvasLabel"
             data-bs-scroll="false"
             style="height: 85vh;">
            
            <!-- Header -->
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
                    <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise
                </h5>
                <button type="button" class="btn-close" 
                        data-bs-dismiss="offcanvas" 
                        aria-label="Close"></button>
            </div>
            
            <!-- Body -->
            <div class="offcanvas-body p-0">
                
                <!-- Search Section -->
                <div class="bonus-search-section p-3 border-bottom bg-light">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bx bx-search"></i>
                        </span>
                        <input type="text"
                               class="form-control"
                               id="bonusExerciseSearch"
                               placeholder="Search exercises..."
                               autocomplete="off"
                               aria-label="Search exercises">
                        <button class="btn btn-outline-secondary"
                                type="button"
                                id="clearSearchBtn"
                                style="display: none;"
                                aria-label="Clear search">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                    
                    <!-- Filter Chips -->
                    <div class="mt-3 d-flex flex-wrap gap-2" 
                         id="filterChipsContainer">
                        <!-- Rendered dynamically -->
                    </div>
                </div>
                
                <!-- Exercise List -->
                <div class="list-group list-group-flush" 
                     id="bonusExerciseList"
                     style="max-height: calc(85vh - 200px); overflow-y: auto;">
                    <!-- Rendered dynamically -->
                </div>
                
                <!-- Empty State -->
                <div id="emptyState" class="text-center py-5" style="display: none;">
                    <i class="bx bx-search-alt display-1 text-muted"></i>
                    <p class="text-muted mt-3">No exercises found</p>
                    <button class="btn btn-sm btn-outline-primary" 
                            id="clearBonusSearchBtn">
                        Clear Search
                    </button>
                </div>
                
            </div>
        </div>
    `;
    
    return this.createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, 
        (offcanvas, offcanvasElement) => {
            this.setupBonusExerciseListeners(offcanvasElement, offcanvas, onAddExercise);
        }
    );
}

/**
 * Setup bonus exercise event listeners and state
 * @private
 */
static setupBonusExerciseListeners(offcanvasElement, offcanvas, onAddExercise) {
    // State management
    const state = {
        searchQuery: '',
        activeFilter: 'all',
        exercises: [],
        filteredExercises: []
    };
    
    // DOM elements
    const searchInput = offcanvasElement.querySelector('#bonusExerciseSearch');
    const clearBtn = offcanvasElement.querySelector('#clearSearchBtn');
    const filterContainer = offcanvasElement.querySelector('#filterChipsContainer');
    const exerciseList = offcanvasElement.querySelector('#bonusExerciseList');
    const emptyState = offcanvasElement.querySelector('#emptyState');
    const clearSearchBtn = offcanvasElement.querySelector('#clearBonusSearchBtn');
    
    // Initialize on shown
    offcanvasElement.addEventListener('shown.bs.offcanvas', async () => {
        await loadExercises();
        renderFilterChips();
        renderExerciseList();
        
        // Auto-focus search on desktop
        if (window.innerWidth > 768) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }, { once: true });
    
    // Search input handler
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        clearBtn.style.display = state.searchQuery ? 'block' : 'none';
        filterExercises();
        renderExerciseList();
    });
    
    // Clear button handler
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearBtn.style.display = 'none';
        filterExercises();
        renderExerciseList();
        searchInput.focus();
    });
    
    // Clear search from empty state
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        state.activeFilter = 'all';
        clearBtn.style.display = 'none';
        renderFilterChips();
        filterExercises();
        renderExerciseList();
    });
    
    // Load exercises from database
    async function loadExercises() {
        try {
            if (window.exerciseCacheService) {
                state.exercises = await window.exerciseCacheService.getAllExercises();
                state.filteredExercises = [...state.exercises];
                console.log(`✅ Loaded ${state.exercises.length} exercises`);
            } else {
                console.warn('⚠️ exerciseCacheService not available');
                state.exercises = [];
                state.filteredExercises = [];
            }
        } catch (error) {
            console.error('❌ Failed to load exercises:', error);
            state.exercises = [];
            state.filteredExercises = [];
        }
    }
    
    // Render filter chips
    function renderFilterChips() {
        const filters = [
            { id: 'all', label: 'All' },
            { id: 'chest', label: 'Chest' },
            { id: 'back', label: 'Back' },
            { id: 'shoulders', label: 'Shoulders' },
            { id: 'arms', label: 'Arms' },
            { id: 'legs', label: 'Legs' },
            { id: 'core', label: 'Core' }
        ];
        
        filterContainer.innerHTML = filters.map(filter => `
            <button class="filter-chip ${state.activeFilter === filter.id ? 'active' : ''}"
                    data-filter="${filter.id}"
                    type="button">
                ${filter.label}
            </button>
        `).join('');
        
        // Attach click handlers
        filterContainer.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                state.activeFilter = e.target.dataset.filter;
                renderFilterChips();
                filterExercises();
                renderExerciseList();
            });
        });
    }
    
    // Filter exercises based on search and muscle group
    function filterExercises() {
        let filtered = [...state.exercises];
        
        // Apply muscle group filter
        if (state.activeFilter !== 'all') {
            filtered = filtered.filter(ex => 
                ex.muscle_group?.toLowerCase() === state.activeFilter
            );
        }
        
        // Apply search filter
        if (state.searchQuery) {
            filtered = filtered.filter(ex =>
                ex.name.toLowerCase().includes(state.searchQuery) ||
                ex.muscle_group?.toLowerCase().includes(state.searchQuery) ||
                ex.equipment?.toLowerCase().includes(state.searchQuery)
            );
        }
        
        state.filteredExercises = filtered;
    }
    
    // Render exercise list
    function renderExerciseList() {
        if (state.filteredExercises.length === 0) {
            exerciseList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        exerciseList.style.display = 'block';
        emptyState.style.display = 'none';
        
        exerciseList.innerHTML = state.filteredExercises.map(exercise => `
            <button class="list-group-item list-group-item-action bonus-exercise-item"
                    data-exercise-id="${exercise.id}"
                    data-exercise-name="${this.escapeHtml(exercise.name)}">
                <div class="exercise-name">${this.escapeHtml(exercise.name)}</div>
                <div class="exercise-meta">
                    ${exercise.muscle_group ? `
                        <span class="badge muscle-badge bg-label-primary text-capitalize">
                            ${this.escapeHtml(exercise.muscle_group)}
                        </span>
                    ` : ''}
                    ${exercise.equipment ? `
                        <span class="text-muted">
                            <i class="bx bx-dumbbell me-1"></i>${this.escapeHtml(exercise.equipment)}
                        </span>
                    ` : ''}
                </div>
            </button>
        `).join('');
        
        // Attach click handlers
        exerciseList.querySelectorAll('.bonus-exercise-item').forEach(item => {
            item.addEventListener('click', async () => {
                const exerciseName = item.dataset.exerciseName;
                
                // Show loading state
                item.disabled = true;
                item.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';
                
                try {
                    // Auto-create if needed
                    if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                        const currentUser = window.dataManager.getCurrentUser();
                        const userId = currentUser?.uid || null;
                        await window.exerciseCacheService.autoCreateIfNeeded(exerciseName, userId);
                    }
                    
                    // Call the add callback
                    await onAddExercise({
                        name: exerciseName,
                        sets: '3',
                        reps: '12',
                        weight: '',
                        unit: 'lbs'
                    });
                    
                    // Close offcanvas
                    offcanvas.hide();
                    
                } catch (error) {
                    console.error('❌ Error adding exercise:', error);
                    item.disabled = false;
                    // Restore original content
                    renderExerciseList();
                    
                    if (window.showAlert) {
                        window.showAlert('Failed to add exercise. Please try again.', 'danger');
                    }
                }
            });
        });
    }
}
```

---

### Phase 5: Backend Integration Points

#### Required Services
1. **exerciseCacheService** - Load all exercises
   - Method: `getAllExercises()`
   - Returns: Array of exercise objects

2. **exerciseCacheService** - Auto-create custom exercises
   - Method: `autoCreateIfNeeded(name, userId)`
   - Creates exercise if it doesn't exist

3. **dataManager** - User authentication
   - Method: `isUserAuthenticated()`
   - Method: `getCurrentUser()`

#### Exercise Object Structure
```javascript
{
  id: string,
  name: string,
  muscle_group: string,  // 'chest', 'back', 'shoulders', etc.
  equipment: string,     // 'barbell', 'dumbbell', 'cable', etc.
  difficulty: string,    // 'beginner', 'intermediate', 'advanced'
  tier: number          // 1-3
}
```

---

### Phase 6: Migration Steps

#### Step 1: Backup Current Implementation
```bash
# Create backup of current method
cp frontend/assets/js/components/unified-offcanvas-factory.js \
   frontend/assets/js/components/unified-offcanvas-factory.js.backup
```

#### Step 2: Add CSS Styles
1. Open `frontend/assets/css/components/unified-offcanvas.css`
2. Add new demo-style CSS at the end (before closing comment)
3. Test styles in isolation

#### Step 3: Replace JavaScript Method
1. Locate `createBonusExercise()` method (lines 608-990)
2. Replace with new demo-style implementation
3. Remove `validateAddButton()` helper method (lines 992-1009) - no longer needed

#### Step 4: Update Method Signature
**Old signature:**
```javascript
static createBonusExercise(data, onAddNew, onAddPrevious)
```

**New signature:**
```javascript
static createBonusExercise(data, onAddExercise)
```

**Breaking Change:** Callers must be updated to use single callback

#### Step 5: Update Callers
Find all calls to `createBonusExercise()` and update:

**Old pattern:**
```javascript
UnifiedOffcanvasFactory.createBonusExercise(
  { previousExercises: [...] },
  async (data) => { /* add new */ },
  async (index) => { /* add previous */ }
);
```

**New pattern:**
```javascript
UnifiedOffcanvasFactory.createBonusExercise(
  {},
  async (data) => { /* add exercise */ }
);
```

---

### Phase 7: Testing Checklist

#### Functional Testing
- [ ] Search input filters exercises correctly
- [ ] Clear button appears/disappears appropriately
- [ ] Filter chips change active state on click
- [ ] Filter chips filter exercises by muscle group
- [ ] Exercise list renders correctly
- [ ] Empty state shows when no results
- [ ] Click exercise adds it to workout
- [ ] Loading state shows during add operation
- [ ] Error handling works if add fails
- [ ] Offcanvas closes after successful add
- [ ] Auto-create works for custom exercises

#### UI/UX Testing
- [ ] Search input auto-focuses on desktop
- [ ] Search input doesn't auto-focus on mobile
- [ ] Filter chips are responsive on mobile
- [ ] Exercise list scrolls smoothly
- [ ] Hover states work correctly
- [ ] Active states are visually clear
- [ ] Empty state is centered and clear
- [ ] Loading spinners are visible

#### Integration Testing
- [ ] exerciseCacheService loads exercises
- [ ] Exercise database returns correct format
- [ ] Auto-create creates custom exercises
- [ ] User authentication check works
- [ ] Workout session receives added exercise
- [ ] Toast notifications show on success/error

#### Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

#### Dark Mode Testing
- [ ] Search section background correct
- [ ] Filter chips styled correctly
- [ ] Exercise list items readable
- [ ] Empty state visible
- [ ] Borders and separators visible

---

### Phase 8: Rollback Plan

#### If Issues Arise
1. **Immediate Rollback:**
   ```bash
   # Restore backup
   cp frontend/assets/js/components/unified-offcanvas-factory.js.backup \
      frontend/assets/js/components/unified-offcanvas-factory.js
   ```

2. **Remove CSS:**
   - Delete demo-style CSS additions
   - Clear browser cache

3. **Revert Caller Updates:**
   - Restore old callback pattern
   - Test previous exercises functionality

#### Gradual Migration Option
If full migration is risky, create parallel method:
```javascript
// Keep old method
static createBonusExerciseV1(data, onAddNew, onAddPrevious) { ... }

// Add new method
static createBonusExerciseV2(data, onAddExercise) { ... }

// Gradually migrate callers
```

---

## Benefits of Demo Style

### User Experience
1. **Faster Interaction** - Search-first design
2. **Visual Filtering** - Filter chips are intuitive
3. **Less Cognitive Load** - Simpler UI, fewer options
4. **Mobile-Friendly** - Touch-optimized list items

### Developer Experience
1. **Simpler Code** - ~400 lines vs ~380 lines (similar but cleaner)
2. **Easier Maintenance** - Fewer edge cases
3. **Better Performance** - Less DOM manipulation
4. **Clearer Intent** - Single-purpose UI

### Technical Benefits
1. **Real Backend Integration** - Uses actual exercise database
2. **Auto-Create Support** - Custom exercises still work
3. **Consistent Styling** - Matches unified-offcanvas patterns
4. **Accessibility** - Proper ARIA labels and keyboard nav

---

## Removed Features (Intentional)

### 1. Previous Exercises Section
**Reason:** Adds complexity, rarely used
**Alternative:** Users can search for recently used exercises

### 2. Manual Entry Form
**Reason:** Duplicates search functionality
**Alternative:** Users can search and select, then edit after adding

### 3. Collapsible Sections
**Reason:** Hides primary actions
**Alternative:** All actions visible at once

### 4. Sets/Reps/Weight in Offcanvas
**Reason:** Slows down add flow
**Alternative:** Add with defaults, edit in workout view

---

## Success Metrics

### Quantitative
- [ ] Reduce average time to add exercise by 30%
- [ ] Increase bonus exercise usage by 20%
- [ ] Reduce user errors/confusion by 50%
- [ ] Maintain 100% backend integration

### Qualitative
- [ ] Users report easier exercise discovery
- [ ] Fewer support requests about adding exercises
- [ ] Positive feedback on simplified UI
- [ ] No regression in functionality

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| CSS Additions | 1 hour | None |
| JavaScript Refactor | 3 hours | CSS complete |
| Caller Updates | 1 hour | JS complete |
| Testing | 2 hours | All complete |
| Documentation | 1 hour | Testing complete |
| **Total** | **8 hours** | |

---

## Next Steps

1. ✅ Review this plan with team
2. ⏳ Get approval for breaking changes
3. ⏳ Schedule implementation window
4. ⏳ Create feature branch
5. ⏳ Implement CSS changes
6. ⏳ Implement JavaScript changes
7. ⏳ Update callers
8. ⏳ Run full test suite
9. ⏳ Deploy to staging
10. ⏳ User acceptance testing
11. ⏳ Deploy to production
12. ⏳ Monitor for issues

---

## Questions for Review

1. **Should we keep previous exercises?**
   - Could add as optional feature
   - Show at bottom of list with special styling

2. **Should we add manual entry back?**
   - Could add as "Create Custom" button
   - Opens simple name-only form

3. **What muscle groups to include?**
   - Current: All, Chest, Back, Shoulders, Arms, Legs, Core
   - Could add: Cardio, Full Body, Other

4. **Should we show exercise details?**
   - Could add tooltip/popover on hover
   - Show difficulty, equipment, description

5. **Migration strategy?**
   - Big bang (replace all at once)
   - Gradual (feature flag, A/B test)
   - Parallel (keep both, deprecate old)

---

## Conclusion

This migration simplifies the bonus exercise offcanvas while maintaining full backend integration. The demo-style approach prioritizes speed and clarity, making it easier for users to find and add exercises during their workout.

The implementation is straightforward, with clear rollback options if issues arise. The main risk is the breaking change to the method signature, which requires updating all callers.

**Recommendation:** Proceed with migration, using gradual rollout if possible to minimize risk.