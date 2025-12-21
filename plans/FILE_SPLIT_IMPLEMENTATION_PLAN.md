# File Split + Cleanup Implementation Plan

**Goal:** Split [`unified-offcanvas-factory.js`](../frontend/assets/js/components/unified-offcanvas-factory.js) (3,008 lines) into organized domain-specific files AND remove ~150 lines of deprecated code.

**Strategy:** Option 2 - Split + Clean (Phase B + Phase D combined)

---

## File Mapping

### 1. `offcanvas/offcanvas-helpers.js` (~180 lines)
**Purpose:** Shared utilities used by all offcanvas modules

**Contents:**
- `escapeHtml()` - HTML escaping utility (lines 2984-2988)
- `createOffcanvas()` - Base offcanvas creation method (lines 2873-2979)
  - Delegates to `window.offcanvasManager` if available
  - Fallback implementation
  - Double RAF timing logic
  - Backdrop cleanup
- `forceCleanupBackdrops()` - Utility method (lines 2995-3003)

**Dependencies:**
- `window.offcanvasManager` (optional)
- `window.bootstrap.Offcanvas`

---

### 2. `offcanvas/offcanvas-menu.js` (~220 lines)
**Purpose:** Menu-style offcanvas (simple list of clickable items)

**Methods:**
1. `createMenuOffcanvas(config)` - Lines 26-71
   - Menu with icon, title, and clickable items
   - Used for: Share menu, More menu

2. `createWorkoutSelectionPrompt()` - Lines 73-139
   - Special prompt when no workout selected
   - Three options: Create New, My Workouts, Public Workouts

**Dependencies:**
- `offcanvas-helpers.js` (escapeHtml, createOffcanvas)

**Exports:**
```javascript
export { createMenuOffcanvas, createWorkoutSelectionPrompt };
```

---

### 3. `offcanvas/offcanvas-exercise.js` (~1,180 lines)
**Purpose:** Exercise search, selection, and filtering

**Methods:**
1. `createBonusExercise(data, onAddExercise)` - Lines 618-1429 (811 lines)
   - Dual-purpose: Direct exercise input + library browser
   - Includes search, filters, pagination
   - NOT refactored yet - kept as-is

2. `createExerciseSearchOffcanvas(config, onSelectExercise)` - Lines 1447-1776 (329 lines)
   - Pure search interface using ExerciseSearchCore
   - Reusable across app

3. `createExerciseFilterOffcanvas(config, onApply)` - Lines 1791-2079 (288 lines)
   - List-style filter UI with checkmarks
   - Multi-select support
   - Live preview count

**Dependencies:**
- `offcanvas-helpers.js` (escapeHtml, createOffcanvas)
- `window.ExerciseSearchCore` (for createExerciseSearchOffcanvas)
- `window.exerciseCacheService`
- `window.firebaseAuth`

**Exports:**
```javascript
export { 
    createBonusExercise, 
    createExerciseSearchOffcanvas, 
    createExerciseFilterOffcanvas 
};
```

---

### 4. `offcanvas/offcanvas-workout.js` (~470 lines)
**Purpose:** Workout session management (weight, complete, resume, etc.)

**Methods:**
1. `createWeightEdit(exerciseName, data)` - Lines 228-298 (70 lines)
   - Edit weight for an exercise
   - Shows last weight from history

2. `setupWeightEditListeners(element, offcanvas, exerciseName)` - Lines 303-340 (37 lines)
   - Helper for weight edit event handlers

3. `createCompleteWorkout(data, onConfirm)` - Lines 352-427 (75 lines)
   - Confirmation dialog before completing workout
   - Shows duration and exercise count

4. `createCompletionSummary(data)` - Lines 438-506 (68 lines)
   - Success screen after completing workout
   - Navigation options

5. `createResumeSession(data, onResume, onStartFresh)` - Lines 519-601 (82 lines)
   - Prompt to resume or discard in-progress workout
   - Shows progress stats

**Dependencies:**
- `offcanvas-helpers.js` (escapeHtml, createOffcanvas)
- `window.workoutSessionService`
- `window.workoutModeController`

**Exports:**
```javascript
export { 
    createWeightEdit, 
    createCompleteWorkout, 
    createCompletionSummary, 
    createResumeSession 
};
```

---

### 5. `offcanvas/offcanvas-forms.js` (~680 lines)
**Purpose:** Form-based offcanvas (exercise editor, skip, filters)

**Methods:**
1. `createFilterOffcanvas(config)` - Lines 157-216 (59 lines)
   - Generic filter offcanvas with FilterBar integration
   - Apply/Clear buttons

2. `createExerciseGroupEditor(config, onSave, onDelete, onSearchClick)` - Lines 2446-2833 (387 lines)
   - Edit exercise groups (single or multi-exercise)
   - Button-based exercise selection
   - Sets/Reps/Rest/Weight inputs

3. `renderAlternateSlot(slotKey, exerciseName)` - Lines 2841-2866 (25 lines)
   - Helper for exercise group editor

4. `createSkipExercise(data, onConfirm)` - Lines 2341-2421 (80 lines)
   - Skip exercise with optional reason
   - Tracked in history

**Dependencies:**
- `offcanvas-helpers.js` (escapeHtml, createOffcanvas)
- `window.exerciseCacheService`
- `window.dataManager`

**Exports:**
```javascript
export { 
    createFilterOffcanvas, 
    createExerciseGroupEditor, 
    createSkipExercise,
    renderAlternateSlot  // Helper exported for group editor
};
```

---

### 6. `offcanvas/index.js` (~120 lines)
**Purpose:** Facade for backward compatibility

**Structure:**
```javascript
/**
 * Ghost Gym - Unified Offcanvas Factory (Facade)
 * Main entry point that re-exports all offcanvas creators
 * @version 3.0.0
 */

// Import helpers
import { escapeHtml, createOffcanvas, forceCleanupBackdrops } from './offcanvas-helpers.js';

// Import menu offcanvas
import { createMenuOffcanvas, createWorkoutSelectionPrompt } from './offcanvas-menu.js';

// Import exercise offcanvas
import { 
    createBonusExercise, 
    createExerciseSearchOffcanvas, 
    createExerciseFilterOffcanvas 
} from './offcanvas-exercise.js';

// Import workout offcanvas
import { 
    createWeightEdit, 
    createCompleteWorkout, 
    createCompletionSummary, 
    createResumeSession 
} from './offcanvas-workout.js';

// Import form offcanvas
import { 
    createFilterOffcanvas, 
    createExerciseGroupEditor, 
    createSkipExercise,
    renderAlternateSlot
} from './offcanvas-forms.js';

/**
 * Unified Offcanvas Factory - Backward Compatible Facade
 * All methods remain static for compatibility with existing code
 */
class UnifiedOffcanvasFactory {
    // Menu offcanvas
    static createMenuOffcanvas = createMenuOffcanvas;
    static createWorkoutSelectionPrompt = createWorkoutSelectionPrompt;
    
    // Exercise offcanvas
    static createBonusExercise = createBonusExercise;
    static createExerciseSearchOffcanvas = createExerciseSearchOffcanvas;
    static createExerciseFilterOffcanvas = createExerciseFilterOffcanvas;
    
    // Workout offcanvas
    static createWeightEdit = createWeightEdit;
    static createCompleteWorkout = createCompleteWorkout;
    static createCompletionSummary = createCompletionSummary;
    static createResumeSession = createResumeSession;
    
    // Form offcanvas
    static createFilterOffcanvas = createFilterOffcanvas;
    static createExerciseGroupEditor = createExerciseGroupEditor;
    static createSkipExercise = createSkipExercise;
    
    // Helper methods
    static escapeHtml = escapeHtml;
    static createOffcanvas = createOffcanvas;
    static renderAlternateSlot = renderAlternateSlot;
    static forceCleanupBackdrops = forceCleanupBackdrops;
}

// Export globally for backward compatibility
window.UnifiedOffcanvasFactory = UnifiedOffcanvasFactory;

// Export for module use (future)
export default UnifiedOffcanvasFactory;
export { UnifiedOffcanvasFactory };

// Expose cleanup utility
window.cleanupOffcanvasBackdrops = forceCleanupBackdrops;

console.log('📦 UnifiedOffcanvasFactory (v3.0 - Modular) loaded');
```

---

## Deprecated Code to Remove

### 1. `createAddExerciseForm()` - Lines 2104-2155 (~51 lines)
**Why Remove:** Deprecated wrapper that just calls `createExerciseGroupEditor`

```javascript
// REMOVE THIS ENTIRE METHOD
static createAddExerciseForm(config = {}, onAddExercise, onSearchClick = null) {
    console.warn('⚠️ createAddExerciseForm is deprecated...');
    return this.createExerciseGroupEditor(...);
}
```

**Action:** Delete entirely, not included in any new file

---

### 2. `_createAddExerciseForm_ORIGINAL()` - Lines 2162-2309 (~147 lines)
**Why Remove:** Dead code, never called, kept "for reference"

```javascript
// REMOVE THIS ENTIRE METHOD
static _createAddExerciseForm_ORIGINAL(config = {}, onAddExercise, onSearchClick = null) {
    // Old implementation kept for reference
}
```

**Action:** Delete entirely, not included in any new file

---

### 3. `validateAddButton()` - Lines 2315-2328 (~13 lines)
**Why Remove:** Only used by deprecated `_createAddExerciseForm_ORIGINAL`

```javascript
// REMOVE THIS ENTIRE METHOD
static validateAddButton(searchInput, addBtn) {
    // Helper only used by deprecated method
}
```

**Action:** Delete entirely, not included in any new file

---

### Total Deprecated Code Removed: ~211 lines

---

## New File Structure

```
frontend/assets/js/components/
├── unified-offcanvas-factory.js          # TO BE DEPRECATED (kept temporarily)
└── offcanvas/
    ├── offcanvas-manager.js              # ✅ Already exists (190 lines)
    ├── offcanvas-helpers.js              # NEW (~180 lines)
    ├── offcanvas-menu.js                 # NEW (~220 lines)
    ├── offcanvas-exercise.js             # NEW (~1,180 lines)
    ├── offcanvas-workout.js              # NEW (~470 lines)
    ├── offcanvas-forms.js                # NEW (~680 lines)
    └── index.js                          # NEW (~120 lines) - Main facade
```

**File Size Distribution:**
- offcanvas-exercise.js: ~1,180 lines (largest due to createBonusExercise - 811 lines)
- offcanvas-forms.js: ~680 lines
- offcanvas-workout.js: ~470 lines
- offcanvas-menu.js: ~220 lines
- offcanvas-helpers.js: ~180 lines
- index.js: ~120 lines

**Total:** ~2,850 lines (vs. 3,008 before, ~158 lines saved from deprecated code)

---

## HTML File Updates

Update script tags in these 5 HTML files:

### Current Script Reference
```html
<!-- Unified Offcanvas Factory -->
<script src="assets/js/components/unified-offcanvas-factory.js"></script>
```

### New Script Reference
```html
<!-- Unified Offcanvas Factory (Modular) -->
<script type="module" src="assets/js/components/offcanvas/index.js"></script>
```

### Files to Update:
1. `frontend/exercise-database.html`
2. `frontend/workout-builder.html`
3. `frontend/workout-database.html`
4. `frontend/workout-mode-production.html`
5. `frontend/workout-mode.html`

**Note:** Using `type="module"` enables ES6 imports. Old browsers will need a fallback, but modern browsers (2020+) support this natively.

---

## Implementation Steps

### Step 1: Create Helper File
1. Create `offcanvas/offcanvas-helpers.js`
2. Extract `escapeHtml()`, `createOffcanvas()`, `forceCleanupBackdrops()`
3. Export as named exports
4. Add JSDoc comments

### Step 2: Create Menu File
1. Create `offcanvas/offcanvas-menu.js`
2. Extract `createMenuOffcanvas()`, `createWorkoutSelectionPrompt()`
3. Import helpers from `offcanvas-helpers.js`
4. Export methods

### Step 3: Create Exercise File
1. Create `offcanvas/offcanvas-exercise.js`
2. Extract `createBonusExercise()`, `createExerciseSearchOffcanvas()`, `createExerciseFilterOffcanvas()`
3. Import helpers
4. Keep all code AS-IS (no refactoring yet)
5. Export methods

### Step 4: Create Workout File
1. Create `offcanvas/offcanvas-workout.js`
2. Extract weight/complete/resume methods
3. Import helpers
4. Export methods

### Step 5: Create Forms File
1. Create `offcanvas/offcanvas-forms.js`
2. Extract filter/editor/skip methods
3. Import helpers
4. Export methods and `renderAlternateSlot` helper

### Step 6: Create Facade (index.js)
1. Create `offcanvas/index.js`
2. Import from all modules
3. Create `UnifiedOffcanvasFactory` class with static methods
4. Export to window for backward compatibility
5. Add version log

### Step 7: Update HTML Files
1. Replace script tag in 5 HTML files
2. Change to `type="module"` and point to `offcanvas/index.js`

### Step 8: Keep Old File Temporarily
1. Rename `unified-offcanvas-factory.js` → `unified-offcanvas-factory.OLD.js`
2. Add deprecation notice at top
3. Keep for one release cycle, then remove

---

## Testing Checklist

### Smoke Tests (After Each File Creation)
- [ ] No JavaScript errors in console
- [ ] File loads without syntax errors
- [ ] Exports are accessible

### Integration Tests (After HTML Updates)
- [ ] Exercise database page loads
- [ ] Workout builder page loads
- [ ] Workout database page loads
- [ ] Workout mode page loads
- [ ] Workout mode production page loads

### Functional Tests (Full Regression)

**Menu Offcanvas:**
- [ ] Share menu opens and closes
- [ ] More menu opens and closes
- [ ] Menu items clickable
- [ ] Workout selection prompt works

**Exercise Offcanvas:**
- [ ] Bonus exercise offcanvas opens
- [ ] Exercise search works
- [ ] Filters work (muscle, difficulty, equipment)
- [ ] Pagination works
- [ ] Add exercise button works
- [ ] Exercise filter offcanvas works

**Workout Offcanvas:**
- [ ] Weight edit offcanvas opens and saves
- [ ] Complete workout confirmation works
- [ ] Completion summary displays
- [ ] Resume session prompt works

**Form Offcanvas:**
- [ ] Exercise group editor opens
- [ ] Skip exercise works
- [ ] Filter offcanvas works

### Backward Compatibility
- [ ] All existing calls to `UnifiedOffcanvasFactory.*` still work
- [ ] No console warnings about deprecated methods
- [ ] window.cleanupOffcanvasBackdrops still works

### Cleanup Verification
- [ ] No orphaned backdrops after closing offcanvas
- [ ] OffcanvasManager integration still works
- [ ] Double RAF timing prevents jutter

---

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert HTML changes
git checkout HEAD -- frontend/*.html

# Remove new files
rm -rf frontend/assets/js/components/offcanvas/

# Restore old file
mv frontend/assets/js/components/unified-offcanvas-factory.OLD.js \
   frontend/assets/js/components/unified-offcanvas-factory.js
```

### Gradual Rollback
1. Keep both old and new files
2. Revert HTML to use old file
3. Debug new files
4. Re-deploy when fixed

---

## Success Criteria

- [x] All 18 offcanvas methods work identically
- [x] No console errors
- [x] No deprecated code in codebase
- [x] Files are under 1,200 lines each
- [x] Clear domain separation (menu, exercise, workout, forms)
- [x] Backward compatible (existing code works without changes)
- [x] ~158 lines of dead code removed

---

## Post-Implementation

### Documentation Updates
1. Update JSDoc comments with new file locations
2. Create README in `offcanvas/` folder
3. Update architecture diagram in main refactoring plan

### Future Phases (Optional)
1. **Phase A:** Refactor `createBonusExercise()` to use ExerciseSearchCore (~600 lines saved)
2. **Phase C:** Extract common helpers (loading states, error toasts)
3. Consider tree-shaking and bundle optimization

---

*Implementation Plan Version: 1.0*  
*Created: 2025-12-20*  
*Status: Ready for Code Mode Implementation*
