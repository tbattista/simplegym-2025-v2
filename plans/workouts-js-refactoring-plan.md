# Refactoring Plan: `workouts.js` (2,047 lines)

**File**: `frontend/assets/js/dashboard/workouts.js`
**Goal**: Break monolithic file into focused modules, remove deprecated code
**Risk Level**: Medium — central to workout builder page
**Estimated Result**: `workouts.js` reduced from 2,047 → ~600 lines across 4-5 focused modules

---

## Phase 1: Remove Deprecated Code (~380 lines deleted)

**Risk**: Low — code is already marked for cleanup and superseded by modern implementations.

### Task 1.1: Remove Legacy Edit Mode (Lines 1256–1559)
- **What**: Old accordion-based edit mode for reordering exercise groups
- **Why safe**: Comments say "Phase 6 cleanup", replaced by 3-dot menu / card-based editing
- **Functions to remove**:
  - `initializeEditMode()`
  - `enterEditMode()`
  - `exitEditMode()`
  - `collapseAllAccordions()`
  - `enableAllAccordions()`
  - `disableAllAccordions()`
  - `updateSortableForEditMode()`
  - `collectExerciseGroupsOrder()`
  - `saveExerciseGroupOrder()`
  - `showToast()` (if only used by edit mode)
- **Window exports to remove** (Lines 1549–1559): All edit mode exports
- **Verification**: Search codebase for any remaining calls to these functions

### Task 1.2: Remove Legacy Offcanvas Save (Lines 1717–1789)
- **What**: Old `saveExerciseGroupFromOffcanvas()` — superseded by `UnifiedOffcanvasFactory`
- **Why safe**: Modern editor flow at lines 1576–1710 handles this via factory pattern
- **Functions to remove**:
  - `saveExerciseGroupFromOffcanvas()` (legacy path)
- **Verification**: Confirm `openExerciseGroupEditor()` uses factory pattern exclusively

### Task 1.3: Remove Dual-Path Form Collection
- **What**: `collectExerciseGroups()` (lines 325–404) has both card-based AND accordion-based collection
- **Action**: Remove the accordion-based fallback path (keep only card-based)
- **Why safe**: Card-based layout is the current UI; accordion layout was the old approach
- **Verification**: Confirm `workout-builder.html` only uses card-based layout

### Task 1.4: Clean Up Window Exports
- **Remove** any exports that referenced deleted functions
- **Document** remaining exports with comments

**Phase 1 Deliverable**: ~1,670 lines, zero deprecated code, same functionality

---

## Phase 2: Extract Exercise Group Manager (~386 lines)

**Risk**: Medium — these functions are called from multiple places via `window` globals.

### Task 2.1: Create `frontend/assets/js/dashboard/exercise-group-manager.js`

**Functions to extract**:
| Function | Lines | Purpose |
|----------|-------|---------|
| `addExerciseGroup()` | 457–497 | Add new group with defaults |
| `addWeightUnitButtonListeners()` | 502–535 | Weight unit toggle (kg/lbs) |
| `removeExerciseGroup()` | 566–590 | Remove group from DOM + data |
| `renumberExerciseGroups()` | 715–730 | Update group numbering after reorder |
| `updateExerciseGroupPreview()` | 735–803 | Update preview text on card |
| `initializeExerciseGroupSorting()` | 660–710 | Sortable.js drag-drop setup |
| `addExerciseToGroup()` | 808–842 | Add exercise from offcanvas |
| `removeExerciseFromGroup()` | 842–857 | Remove exercise from group |

**Pattern**:
```javascript
// exercise-group-manager.js
const ExerciseGroupManager = {
    add() { ... },
    remove(groupId) { ... },
    renumber() { ... },
    updatePreview(groupId) { ... },
    initSorting() { ... },
    addExercise(groupId, exercise) { ... },
    removeExercise(groupId, exerciseIndex) { ... },
    addWeightUnitListeners(container) { ... }
};

window.ExerciseGroupManager = ExerciseGroupManager;

// Backward-compat globals (remove in future)
window.addExerciseGroup = ExerciseGroupManager.add;
window.removeExerciseGroup = ExerciseGroupManager.remove;
// etc.
```

### Task 2.2: Create `frontend/assets/js/dashboard/bonus-exercise-manager.js`

**Functions to extract**:
| Function | Lines | Purpose |
|----------|-------|---------|
| `addBonusExercise()` | 540–561 | Add bonus exercise |
| `removeBonusExercise()` | 593–607 | Remove bonus exercise |
| `renumberBonusExercises()` | 612–620 | Update numbering |
| `updateBonusExercisePreview()` | 625–655 | Update preview text |

**Pattern**: Same as ExerciseGroupManager — object with methods + backward-compat globals.

### Task 2.3: Update Script Tags
- Add new `<script>` tags in `workout-builder.html` BEFORE `workouts.js`
- Order: `exercise-group-manager.js` → `bonus-exercise-manager.js` → `workouts.js`

**Phase 2 Deliverable**: `workouts.js` down to ~1,170 lines, two new focused modules

---

## Phase 3: Extract Form Data Collector (~128 lines)

**Risk**: Low — pure data extraction functions with no UI side effects.

### Task 3.1: Create `frontend/assets/js/dashboard/form-data-collector.js`

**Functions to extract**:
| Function | Lines | Purpose |
|----------|-------|---------|
| `collectExerciseGroups()` | 325–404 | Parse exercise group DOM into data |
| `collectBonusExercises()` | 410–452 | Parse bonus exercise DOM into data |

**Pattern**:
```javascript
const FormDataCollector = {
    collectExerciseGroups() { ... },
    collectBonusExercises() { ... }
};
window.FormDataCollector = FormDataCollector;
```

**Why separate**: These are pure data-extraction utilities. Isolating them makes them testable and reusable (e.g., autosave uses them too).

**Phase 3 Deliverable**: `workouts.js` down to ~1,040 lines

---

## Phase 4: Extract Editor Offcanvas Handlers (~340 lines)

**Risk**: Medium — tightly coupled to UnifiedOffcanvasFactory and DOM callbacks.

### Task 4.1: Create `frontend/assets/js/dashboard/workout-editor-offcanvas.js`

**Functions to extract**:
| Function | Lines | Purpose |
|----------|-------|---------|
| `openExerciseGroupEditor()` | 1576–1710 | Open offcanvas for group editing |
| `openBonusExerciseEditor()` | 1795–1855 | Open offcanvas for bonus editing |
| `saveBonusExerciseFromOffcanvas()` | 1860–1928 | Save bonus from offcanvas |
| `addAlternateExercise()` | 1944–1985 | Add alternate to group |
| `removeAlternateExercise()` | 1987–2005 | Remove alternate from group |
| `loadAlternateExercises()` | 2008–2022 | Load alternates into offcanvas |

**Dependencies to handle**:
- `window.UnifiedOffcanvasFactory` — already a global
- `window.exerciseGroupsData` — from CardRenderer
- `FormDataCollector` — from Phase 3 extraction
- `ExerciseGroupManager.updatePreview()` — from Phase 2 extraction

**Phase 4 Deliverable**: `workouts.js` down to ~700 lines

---

## Phase 5: Final Cleanup of `workouts.js`

### What Remains (~600-700 lines):
- **Autosave wrappers** (~80 lines) — thin delegation layer
- **renderWorkouts / filterWorkouts** (~122 lines) — grid display
- **saveWorkout** (~85 lines) — core CRUD
- **editWorkout / duplicateWorkout / deleteWorkout** (~208 lines) — workout lifecycle
- **clearWorkoutForm / addWorkoutToProgramPrompt** (~118 lines) — form utilities
- **Window exports** (~34 lines) — global function registration
- **Page init** — coordinator that wires modules together

### Task 5.1: Organize remaining code
- Group by concern with clear section comments
- Update window exports to reference new modules
- Add module dependency comments at top of file

### Task 5.2: Update `workout-builder.html` script order
```html
<!-- Exercise group & bonus management -->
<script src="/static/assets/js/dashboard/exercise-group-manager.js"></script>
<script src="/static/assets/js/dashboard/bonus-exercise-manager.js"></script>

<!-- Form data collection -->
<script src="/static/assets/js/dashboard/form-data-collector.js"></script>

<!-- Editor UI -->
<script src="/static/assets/js/dashboard/workout-editor-offcanvas.js"></script>

<!-- Main orchestrator (must be last) -->
<script src="/static/assets/js/dashboard/workouts.js"></script>
```

---

## Verification Checklist (After Each Phase)

- [ ] Workout builder page loads without console errors
- [ ] Can create a new workout with exercise groups
- [ ] Can edit an existing workout
- [ ] Can add/remove/reorder exercise groups
- [ ] Can add/remove bonus exercises
- [ ] Autosave triggers correctly
- [ ] Exercise group previews update on edit
- [ ] Offcanvas editors open and save correctly
- [ ] Drag-drop reordering works
- [ ] Weight unit toggle works
- [ ] Alternate exercises can be added/removed
- [ ] Duplicate and delete workout work
- [ ] Add-to-program prompt works

---

## File Summary

| Phase | Action | Lines Removed | New Files |
|-------|--------|--------------|-----------|
| 1 | Delete deprecated code | ~380 | 0 |
| 2 | Extract group/bonus managers | ~500 | 2 |
| 3 | Extract form collector | ~128 | 1 |
| 4 | Extract editor offcanvas | ~340 | 1 |
| 5 | Clean up orchestrator | — | 0 |
| **Total** | | **~1,350** | **4 new files** |

**Before**: 1 file × 2,047 lines
**After**: 5 files — orchestrator (~700) + 4 focused modules (~250-400 each)

---

## When to Start

- **Phase 1** can be done anytime — it's pure cleanup with no behavior change
- **Phases 2-4** should be done together in a feature branch to avoid partial extraction
- **Do NOT start if** you have pending changes to workout builder — merge those first
