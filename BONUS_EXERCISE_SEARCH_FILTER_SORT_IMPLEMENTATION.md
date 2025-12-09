# Bonus Exercise Search - Filter & Sort Implementation Plan

## Date: 2025-12-08

## Overview

This document provides step-by-step implementation instructions to fix the broken filters and add sorting functionality to the bonus exercise search offcanvas in workout mode.

## Root Cause Summary

**All filters are broken** due to property name mismatches:
- Code uses: `muscle_group`, `equipment`, `tier`, `exercise_tier`
- Actual properties: `targetMuscleGroup`, `primaryEquipment`, `exerciseTier`

## Implementation Steps

### Step 1: Fix Equipment Dropdown Population

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 801-810

**Current Code**:
```javascript
const uniqueEquipment = [...new Set(
    state.allExercises
        .map(ex => ex.equipment)
        .filter(eq => eq && eq.toLowerCase() !== 'none')
)].sort();
```

**Fixed Code**:
```javascript
const uniqueEquipment = [...new Set(
    state.allExercises
        .map(ex => ex.primaryEquipment)
        .filter(eq => eq && eq.toLowerCase() !== 'none')
)].sort();
```

---

### Step 2: Fix Muscle Group Filter

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 829-835

**Current Code**:
```javascript
// 2. Muscle group chip filter
if (state.activeFilter !== 'all') {
    filtered = filtered.filter(ex => {
        const muscleGroup = (ex.muscle_group || '').toLowerCase();
        return muscleGroup.includes(state.activeFilter);
    });
}
```

**Fixed Code**:
```javascript
// 2. Muscle group chip filter
if (state.activeFilter !== 'all') {
    filtered = filtered.filter(ex => {
        const muscleGroup = (ex.targetMuscleGroup || '').toLowerCase();
        return muscleGroup.includes(state.activeFilter);
    });
}
```

---

### Step 3: Fix Tier Filter

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 844-855

**Current Code**:
```javascript
// 4. Tier filter
if (state.tier) {
    const tierNum = parseInt(state.tier);
    filtered = filtered.filter(ex => {
        const exTier = parseInt(ex.tier || ex.exercise_tier || '1');
        if (tierNum === 3) {
            return exTier === 3;
        } else {
            return exTier === tierNum;
        }
    });
}
```

**Fixed Code**:
```javascript
// 4. Tier filter
if (state.tier) {
    const tierNum = parseInt(state.tier);
    filtered = filtered.filter(ex => {
        const exTier = parseInt(ex.exerciseTier || '1');
        if (tierNum === 3) {
            return exTier === 3;
        } else {
            return exTier === tierNum;
        }
    });
}
```

---

### Step 4: Fix Equipment Multi-Select Filter

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 857-863

**Current Code**:
```javascript
// 5. Equipment filter (multi-select)
if (state.equipment.length > 0) {
    filtered = filtered.filter(ex => {
        const exEquip = (ex.equipment || '').toLowerCase();
        return state.equipment.some(eq => exEquip.includes(eq.toLowerCase()));
    });
}
```

**Fixed Code**:
```javascript
// 5. Equipment filter (multi-select)
if (state.equipment.length > 0) {
    filtered = filtered.filter(ex => {
        const exEquip = (ex.primaryEquipment || '').toLowerCase();
        return state.equipment.some(eq => exEquip.includes(eq.toLowerCase()));
    });
}
```

---

### Step 5: Fix Exercise Card Rendering

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 956-960

**Current Code**:
```javascript
exerciseList.innerHTML = state.paginatedExercises.map(exercise => {
    const tier = exercise.tier || exercise.exercise_tier || '1';
    const difficulty = exercise.difficulty || 'Intermediate';
    const muscle = exercise.muscle_group || '';
    const equipment = exercise.equipment || 'None';
```

**Fixed Code**:
```javascript
exerciseList.innerHTML = state.paginatedExercises.map(exercise => {
    const tier = exercise.exerciseTier || '1';
    const difficulty = exercise.difficulty || 'Intermediate';
    const muscle = exercise.targetMuscleGroup || '';
    const equipment = exercise.primaryEquipment || 'None';
```

---

### Step 6: Fix Search Query Filter (Optional Enhancement)

**File**: `frontend/assets/js/components/unified-offcanvas-factory.js`  
**Location**: Lines 819-827

**Current Code**:
```javascript
// 1. Search query (highest priority)
if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(ex =>
        (ex.name || '').toLowerCase().includes(query) ||
        (ex.muscle_group || '').toLowerCase().includes(query) ||
        (ex.equipment || '').toLowerCase().includes(query)
    );
}
```

**Fixed Code** (for consistency):
```javascript
// 1. Search query (highest priority)
if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(ex =>
        (ex.name || '').toLowerCase().includes(query) ||
        (ex.targetMuscleGroup || '').toLowerCase().includes(query) ||
        (ex.primaryEquipment || '').toLowerCase().includes(query)
    );
}
```

---

## Step 7: Add Sorting Functionality (Enhancement)

### 7A: Update State Object

**Location**: Lines 741-755

**Add to state**:
```javascript
const state = {
    searchQuery: '',
    activeFilter: 'all',
    difficulty: '',
    tier: '',
    equipment: [],
    favoritesOnly: false,
    sortBy: 'name',        // NEW: Add sort option
    sortOrder: 'asc',      // NEW: Add sort direction
    allExercises: [],
    filteredExercises: [],
    paginatedExercises: [],
    currentPage: 1,
    pageSize: window.innerWidth <= 768 ? 20 : 30,
    isLoading: false
};
```

### 7B: Add Sort Dropdown to HTML

**Location**: Line 652 (after filter chips, before "More Filters" toggle)

**Add**:
```html
<!-- Sort Dropdown -->
<div class="mt-2 d-flex align-items-center gap-2">
    <label class="small text-muted mb-0">Sort by:</label>
    <select class="form-select form-select-sm" id="sortBySelect" style="width: auto;">
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="muscle">Muscle Group</option>
        <option value="tier">Standard First</option>
        <option value="difficulty">Difficulty</option>
    </select>
</div>
```

### 7C: Add Sort Handler

**Location**: After line 1083 (after favorites toggle handler)

**Add**:
```javascript
// Sort handler
const sortBySelect = offcanvasElement.querySelector('#sortBySelect');
sortBySelect?.addEventListener('change', (e) => {
    const [sortBy, order] = e.target.value.split('-');
    state.sortBy = sortBy;
    state.sortOrder = order || 'asc';
    applySorting();
    applyPagination();
});
```

### 7D: Add Sort Function

**Location**: After line 877 (after `applyPagination` function)

**Add**:
```javascript
// PHASE 5: Sorting logic
const applySorting = () => {
    switch (state.sortBy) {
        case 'name':
            state.filteredExercises.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return state.sortOrder === 'asc' 
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            });
            break;
            
        case 'muscle':
            state.filteredExercises.sort((a, b) => {
                const muscleA = (a.targetMuscleGroup || '').toLowerCase();
                const muscleB = (b.targetMuscleGroup || '').toLowerCase();
                if (muscleA === muscleB) {
                    return (a.name || '').localeCompare(b.name || '');
                }
                return muscleA.localeCompare(muscleB);
            });
            break;
            
        case 'tier':
            state.filteredExercises.sort((a, b) => {
                const tierA = parseInt(a.exerciseTier || '1');
                const tierB = parseInt(b.exerciseTier || '1');
                if (tierA === tierB) {
                    return (a.name || '').localeCompare(b.name || '');
                }
                return tierA - tierB;  // Lower tiers (1, 2) first
            });
            break;
            
        case 'difficulty':
            const diffOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
            state.filteredExercises.sort((a, b) => {
                const diffA = diffOrder[(a.difficulty || 'intermediate').toLowerCase()] || 2;
                const diffB = diffOrder[(b.difficulty || 'intermediate').toLowerCase()] || 2;
                if (diffA === diffB) {
                    return (a.name || '').localeCompare(b.name || '');
                }
                return diffA - diffB;
            });
            break;
    }
};
```

### 7E: Call Sort After Filtering

**Location**: Line 876 (in `filterExercises` function)

**Change**:
```javascript
state.filteredExercises = filtered;
applySorting();              // NEW: Add this line
state.currentPage = 1;
applyPagination();
```

---

## Testing Checklist

After implementing all changes:

### Basic Filters
- [ ] Click "Chest" chip → only chest exercises show
- [ ] Click "Back" chip → only back exercises show
- [ ] Click "All" chip → all exercises show
- [ ] Select "Beginner" difficulty → only beginner exercises show
- [ ] Select "Advanced" difficulty → only advanced exercises show
- [ ] Select "Tier 1" → only standard tier 1 exercises show
- [ ] Select "Tier 3" → only specialized exercises show

### Equipment Filter
- [ ] Equipment dropdown shows options (Barbell, Dumbbell, Cable, etc.)
- [ ] Select one equipment → exercises filtered correctly
- [ ] Select multiple equipment → exercises match ANY selected equipment
- [ ] Clear equipment selection → all exercises show again

### Combined Filters
- [ ] Select Chest + Intermediate → only intermediate chest exercises
- [ ] Select Legs + Tier 1 + Barbell → correct subset shows
- [ ] Enable "Favorites Only" (if authenticated) → only favorites show
- [ ] Type search text + select filters → both work together

### Sorting (if implemented)
- [ ] Sort by Name A-Z → alphabetical order
- [ ] Sort by Name Z-A → reverse alphabetical order
- [ ] Sort by Muscle Group → grouped by muscle, alphabetical within
- [ ] Sort by Tier → Standard exercises first, specialized last
- [ ] Sort by Difficulty → Beginner → Intermediate → Advanced

### Edge Cases
- [ ] No filters applied → all exercises show
- [ ] Filters result in 0 exercises → empty state shows correctly
- [ ] Pagination works with filtered results
- [ ] Clear button resets all filters
- [ ] Closing and reopening offcanvas resets state

---

## File Summary

**Only 1 file needs to be modified**:
- `frontend/assets/js/components/unified-offcanvas-factory.js`

**Changes**:
- 7 property name fixes (lines 808, 832, 848, 860, 824, 826, 957, 959, 960)
- Optional: Add sorting UI and logic (new HTML + 4 new functions)

---

## Verification Commands

Open browser console and test:

```javascript
// Check exercise structure
console.log(window.exerciseCacheService.getAllExercises()[0]);

// Expected output:
{
  name: "Exercise Name",
  targetMuscleGroup: "Chest",      // ✅ Should exist
  primaryEquipment: "Barbell",      // ✅ Should exist
  exerciseTier: 1,                  // ✅ Should exist
  difficulty: "Intermediate"        // ✅ Should exist
}
```

---

## Implementation Priority

### Critical (Do First)
1. Fix all 7 property name mismatches
2. Test all filters work correctly
3. Verify equipment dropdown populates

### Enhancement (Do Second)
4. Add sorting UI and functionality
5. Test sorting with filters

---

## Next Steps

Switch to **Code mode** and execute the changes in `unified-offcanvas-factory.js`.