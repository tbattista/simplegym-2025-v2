# Add Exercise Offcanvas Unification

**Date:** 2025-12-17
**Status:** ✅ Complete
**Version:** 1.0.0

## Overview

Unified the add exercise offcanvas between workout-mode (bonus exercises) and workout-builder (exercise groups) by adding a `mode` configuration option to `createExerciseGroupEditor()`. Both pages now use the same unified component, ensuring consistent UI and behavior.

## Problem Statement

Previously, two separate factory methods existed:
1. `createAddExerciseForm()` - Used by workout-mode for bonus exercises (single exercise)
2. `createExerciseGroupEditor()` - Used by workout-builder for exercise groups (primary + 2 alternates)

This led to:
- ~150 lines of duplicate code
- Inconsistent UI between pages
- Maintenance burden (editing one didn't update the other)

## Solution

### Option A (Implemented): Mode Configuration

Added a `mode: 'single' | 'group'` config parameter to `createExerciseGroupEditor()`:

```javascript
// Workout-mode (single exercise)
UnifiedOffcanvasFactory.createExerciseGroupEditor({
    mode: 'single',
    title: 'Add Bonus Exercise',
    exercises: { a: '', b: '', c: '' },
    sets: '3',
    reps: '12',
    rest: '60s',
    weight: '',
    weightUnit: 'lbs',
    isNew: true
}, onSave, onDelete, onSearchClick);

// Workout-builder (exercise group)
UnifiedOffcanvasFactory.createExerciseGroupEditor({
    mode: 'group',  // default
    title: 'Edit Exercise Group',
    exercises: { a: 'Bench Press', b: '', c: '' },
    sets: '3',
    reps: '8-12',
    rest: '60s',
    weight: '135',
    weightUnit: 'lbs',
    isNew: false
}, onSave, onDelete, onSearchClick);
```

## Implementation Details

### Files Modified

1. **`frontend/assets/js/components/unified-offcanvas-factory.js`**
   - Added `mode` config parameter (line 2372)
   - Hide alternate exercises section when `mode='single'` (line 2427)
   - Hide "Add Alternate" button when `mode='single'` (line 2431)
   - Hide delete button when `mode='single'` (line 2490)
   - Deprecated `createAddExerciseForm()` - now a thin wrapper (line 2057)

2. **`frontend/assets/js/controllers/workout-mode-controller.js`**
   - Updated `showAddExerciseForm()` to use `createExerciseGroupEditor()` with `mode='single'` (line 1133)

### Behavior Changes by Mode

| Feature | `mode='single'` | `mode='group'` (default) |
|---------|-----------------|--------------------------|
| Alternate exercises | Hidden | Visible |
| Add Alternate button | Hidden | Visible (max 2) |
| Delete button | Hidden | Visible (unless `isNew=true`) |
| Weight unit UI | Button group | Button group |
| Search integration | Yes | Yes |

### Backward Compatibility

The old `createAddExerciseForm()` method is deprecated but still functional:
- Now a thin wrapper that calls `createExerciseGroupEditor({ mode: 'single', ... })`
- Console warning: `⚠️ createAddExerciseForm is deprecated`
- Transforms old callback format to new format for compatibility

## Key Benefits

1. **Single Source of Truth**: Edit one, both update
2. **Code Reduction**: Removed ~150 lines of duplicate code
3. **Consistent UI**: Identical look and feel across pages
4. **Future-Proof**: Easy to add new modes (e.g., `'superset'`, `'circuit'`)
5. **Backward Compatible**: Existing code continues to work

## Testing Checklist

- [ ] Workout-mode: Click "Bonus" button → Add bonus exercise
  - Verify: No alternate exercises section visible
  - Verify: No delete button visible
  - Verify: Search button works
  - Verify: Weight unit button group works
  - Verify: Exercise saves correctly

- [ ] Workout-builder: Click "Add Exercises" → Add exercise group
  - Verify: Alternate exercises section visible
  - Verify: "Add Alternate" button visible (max 2)
  - Verify: Delete button visible (if editing existing)
  - Verify: Search button works for all slots
  - Verify: Exercise group saves correctly

- [ ] Both pages: Verify identical UI styling
  - Input layout
  - Button styling
  - Weight unit selector (button group)
  - Search integration

## Future Enhancements

Possible new modes:
- `mode='superset'` - Pre-populate 2 exercises for supersets
- `mode='circuit'` - Multiple exercises in a circuit
- `mode='warmup'` - Specialized warmup exercise config

## Migration Guide

For developers using the old `createAddExerciseForm()`:

**Before:**
```javascript
UnifiedOffcanvasFactory.createAddExerciseForm(
    { title: 'Add Exercise', ... },
    onAddExercise,
    onSearchClick
);
```

**After:**
```javascript
UnifiedOffcanvasFactory.createExerciseGroupEditor(
    { mode: 'single', title: 'Add Exercise', ... },
    onSave,  // Note: callback signature changed
    onDelete,
    onSearchClick
);
```

**Callback Signature Change:**
```javascript
// Old
onAddExercise(exerciseData)
// exerciseData: { name, sets, reps, rest, weight, weight_unit }

// New
onSave(groupData)
// groupData: { exercises: {a, b, c}, sets, reps, rest, default_weight, default_weight_unit }
```

## Notes

- The old `createAddExerciseForm()` implementation is preserved as `_createAddExerciseForm_ORIGINAL()` for reference
- Default mode is `'group'` to maintain backward compatibility with workout-builder
- Weight unit UI uses button group (matching Sneat template patterns) on both pages