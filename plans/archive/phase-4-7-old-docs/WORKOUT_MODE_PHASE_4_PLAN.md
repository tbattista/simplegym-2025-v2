# Workout Mode Refactoring - Phase 4: Exercise Data Management

**Date:** 2026-01-05  
**Status:** 📋 Planning  
**Priority:** High (Foundation for Phases 5-7)  
**Risk Level:** Medium

---

## Overview

Extract exercise data collection and template update logic into a dedicated service. This provides a clean foundation for session management and workout completion flows.

---

## Goals

1. **Extract data collection logic** from controller
2. **Create reusable data transformation service**
3. **Centralize exercise data operations**
4. **Maintain backward compatibility**

---

## Module to Create

### WorkoutDataManager

**File:** `frontend/assets/js/services/workout-data-manager.js`  
**Lines:** ~250 lines  
**Purpose:** Manage exercise data collection, transformation, and template updates

---

## Methods to Extract

### From Controller

| Method | Line | Lines | Purpose |
|--------|------|-------|---------|
| `collectExerciseData()` | 1061 | ~120 | Collect all exercise data for session |
| `updateWorkoutTemplateWeights()` | 1186 | ~60 | Update template with final weights |
| `_getCurrentExerciseData()` | 2167 | ~30 | Get exercise data from appropriate source |
| `_findExerciseGroupByName()` | 999 | ~25 | Find exercise group by name |

**Total:** ~235 lines to extract

---

## Interface Design

```javascript
/**
 * Manages workout data collection and transformation
 */
class WorkoutDataManager {
    constructor(options) {
        this.sessionService = options.sessionService;
        this.dataManager = options.dataManager;
    }
    
    /**
     * Collect all exercise data for the current session
     * Respects custom order, includes regular + bonus exercises
     * @param {Object} workout - Current workout object
     * @returns {Array} Array of exercise data objects
     */
    collectExerciseData(workout) {
        // Build exercise list in display order
        // Apply custom order if exists
        // Collect data for each exercise
        // Return formatted array
    }
    
    /**
     * Get current exercise data from appropriate source
     * Priority: Active Session > Pre-Session Edits > Template
     * @param {string} exerciseName - Exercise name
     * @param {Object} workout - Current workout object
     * @returns {Object} Exercise data
     */
    getCurrentExerciseData(exerciseName, workout) {
        // Check if session is active
        // Get from session data OR pre-session edits OR template
        // Return formatted data
    }
    
    /**
     * Find exercise group by name
     * Searches both regular and bonus exercises
     * @param {string} exerciseName - Exercise name
     * @param {Object} workout - Current workout object
     * @returns {Object|null} Exercise group or null
     */
    findExerciseByName(exerciseName, workout) {
        // Search regular exercises
        // Search bonus exercises
        // Return found exercise or null
    }
    
    /**
     * Update workout template with final weights from session
     * Ensures builder shows most recent weights
     * @param {Object} workout - Current workout object
     * @param {Array} exercisesPerformed - Completed exercise data
     * @returns {Promise<boolean>} Success status
     */
    async updateWorkoutTemplate(workout, exercisesPerformed) {
        // Create weight map
        // Update exercise groups
        // Update bonus exercises
        // Save to database
        // Return success
    }
    
    /**
     * Build combined exercise list (regular + bonus)
     * @param {Object} workout - Current workout object
     * @returns {Array} Combined exercise list
     */
    buildExerciseList(workout) {
        // Add regular exercises
        // Add bonus exercises
        // Return combined list
    }
    
    /**
     * Apply custom order to exercise list
     * @param {Array} exercises - Exercise list
     * @returns {Array} Ordered exercise list
     */
    applyCustomOrder(exercises) {
        // Get custom order from session
        // Reorder exercises
        // Add missing exercises
        // Return ordered list
    }
}
```

---

## Implementation Steps

### Step 1: Create WorkoutDataManager Module
- [ ] Create file structure
- [ ] Implement constructor
- [ ] Add basic methods

### Step 2: Extract Data Collection
- [ ] Move `collectExerciseData()` logic
- [ ] Move `buildExerciseList()` logic
- [ ] Move `applyCustomOrder()` logic
- [ ] Add comprehensive logging

### Step 3: Extract Data Access
- [ ] Move `getCurrentExerciseData()` logic
- [ ] Move `findExerciseByName()` logic
- [ ] Add error handling

### Step 4: Extract Template Updates
- [ ] Move `updateWorkoutTemplateWeights()` logic
- [ ] Add transaction support
- [ ] Add rollback on failure

### Step 5: Controller Integration
- [ ] Initialize dataManager in constructor
- [ ] Update `collectExerciseData()` to delegate
- [ ] Update `updateWorkoutTemplateWeights()` to delegate
- [ ] Update helper methods to delegate
- [ ] Add facade methods for backward compatibility

### Step 6: Update HTML
- [ ] Add script tag for new module
- [ ] Update version number

---

## Controller Integration

### Constructor Update
```javascript
constructor() {
    // ...existing code...
    
    // Phase 4: Initialize Data Manager
    this.dataManager = new WorkoutDataManager({
        sessionService: this.sessionService,
        dataManager: this.dataManager
    });
}
```

### Method Delegation
```javascript
// Controller delegates to dataManager
collectExerciseData() {
    return this.workoutDataManager.collectExerciseData(this.currentWorkout);
}

async updateWorkoutTemplateWeights(exercisesPerformed) {
    return await this.workoutDataManager.updateWorkoutTemplate(
        this.currentWorkout,
        exercisesPerformed
    );
}

_getCurrentExerciseData(exerciseName, index) {
    return this.workoutDataManager.getCurrentExerciseData(
        exerciseName,
        this.currentWorkout
    );
}

_findExerciseGroupByName(exerciseName) {
    return this.workoutDataManager.findExerciseByName(
        exerciseName,
        this.currentWorkout
    );
}
```

---

## Benefits

### 1. **Clear Separation**
- Data logic isolated from UI logic
- Easier to test data transformations
- Reusable across different contexts

### 2. **Better Error Handling**
- Centralized validation
- Consistent error messages
- Transaction support for updates

### 3. **Improved Maintainability**
- Single source of truth for data operations
- Easier to add new data transformations
- Clear data flow

### 4. **Foundation for Future Phases**
- Session completion uses data collection
- Weight management uses data access
- Template sync uses update logic

---

## Testing Strategy

### Unit Tests
```javascript
describe('WorkoutDataManager', () => {
    describe('collectExerciseData', () => {
        it('should collect data in display order', () => {
            const data = dataManager.collectExerciseData(mockWorkout);
            expect(data[0].exercise_name).toBe('First Exercise');
        });
        
        it('should respect custom order', () => {
            sessionService.setExerciseOrder(['Second', 'First']);
            const data = dataManager.collectExerciseData(mockWorkout);
            expect(data[0].exercise_name).toBe('Second');
        });
        
        it('should include bonus exercises', () => {
            const data = dataManager.collectExerciseData(mockWorkout);
            const bonusCount = data.filter(e => e.is_bonus).length;
            expect(bonusCount).toBeGreaterThan(0);
        });
    });
    
    describe('getCurrentExerciseData', () => {
        it('should prioritize session data when active', () => {
            sessionService.isSessionActive.mockReturnValue(true);
            const data = dataManager.getCurrentExerciseData('Bench Press', mockWorkout);
            expect(data.weight).toBe(sessionData.weight);
        });
        
        it('should use template data when session inactive', () => {
            sessionService.isSessionActive.mockReturnValue(false);
            const data = dataManager.getCurrentExerciseData('Bench Press', mockWorkout);
            expect(data.weight).toBe(template.default_weight);
        });
    });
});
```

### Integration Tests
```javascript
describe('Data Collection Integration', () => {
    it('should collect and update template in one flow', async () => {
        const collected = dataManager.collectExerciseData(workout);
        const updated = await dataManager.updateWorkoutTemplate(workout, collected);
        expect(updated).toBe(true);
    });
});
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during collection | High | Add comprehensive validation |
| Template update failures | Medium | Add transaction support + rollback |
| Order calculation bugs | Medium | Extensive testing of custom order |
| Backward compatibility breaks | High | Maintain all facade methods |

---

## Dependencies

### Required Services
- `WorkoutSessionService` - Session state and data
- `DataManager` - Database operations
- Current `WorkoutModeController.currentWorkout` - Workout object

### No Breaking Changes
- All existing methods remain as facades
- Data format unchanged
- API contracts maintained

---

## Success Criteria

- [ ] ~235 lines extracted from controller
- [ ] Controller reduced to ~1,765 lines
- [ ] All data collection tests pass
- [ ] Template updates work correctly
- [ ] Custom order respected
- [ ] Bonus exercises included
- [ ] Zero breaking changes
- [ ] Performance maintained or improved

---

## Next Steps After Phase 4

With data management extracted, we can proceed to:

### Phase 5: Session Lifecycle Management
- Start workout flow
- Complete workout flow
- Resume session flow
- Uses the data manager we created

### Phase 6: Weight Management
- Weight editing
- Direction indicators
- Plate calculator
- Uses data manager for access

---

## Estimated Effort

- **Module Creation:** 2-3 hours
- **Controller Integration:** 1-2 hours
- **Testing:** 2-3 hours
- **Documentation:** 1 hour
- **Total:** 6-9 hours

---

*Plan created: 2026-01-05*
