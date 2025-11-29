# Auto-Create Custom Exercises Architecture

## Overview

This document outlines the architecture for automatically creating custom exercises during workout mode sessions when users enter exercise names that don't exist in the database. The system will also track usage frequency to prioritize frequently-used custom exercises in search results.

## Problem Statement

Currently, when a user enters an exercise name during a workout session that doesn't exist in the database:
- The system doesn't recognize it
- The user must manually create a custom exercise through a modal
- This interrupts the workout flow
- The exercise won't appear in future searches unless manually created

**User Request:** "Whenever the user enters an exercise that is not already in the database, automatically make it a custom workout, without bringing up any boxes to edit info. Later the user can add details etc. but if a user calls something the same thing over and over it should be adopted and displayed first when they search again."

## Goals

1. **Seamless Auto-Creation**: Automatically create custom exercises when unknown names are entered during workout mode
2. **No Interruptions**: Don't show modals or forms - just create with minimal metadata
3. **Usage Tracking**: Track how often each custom exercise is used
4. **Smart Prioritization**: Show frequently-used custom exercises first in search results
5. **Deferred Editing**: Allow users to add details later, but don't require it upfront

## Current System Analysis

### Exercise Selection Flow in Workout Mode

Based on code analysis:

1. **Bonus Exercise Addition** (lines 995-1052 in workout-mode-controller.js):
   - Uses `UnifiedOffcanvasFactory.createBonusExercise()`
   - Shows offcanvas with exercise name input
   - Currently requires manual input but doesn't validate against database

2. **Exercise Autocomplete** (exercise-autocomplete.js):
   - Searches global exercises + custom exercises
   - Uses `ExerciseCacheService` for shared data
   - Ranks results by: exact match > starts with > contains
   - Applies tier boost and popularity boost

3. **Custom Exercise Creation** (backend/services/exercise_service.py):
   - `create_custom_exercise()` method exists (lines 254-304)
   - Requires: name, difficultyLevel, targetMuscleGroup, primaryEquipment, etc.
   - Stores in `users/{userId}/custom_exercises` collection

### Key Insight

The bonus exercise flow in workout mode is the primary place where users enter exercise names that may not exist. This is where auto-creation should happen.

## Architecture Design

### 1. Data Model

#### Custom Exercise (Minimal Auto-Created)
```typescript
{
  id: string,                    // Auto-generated
  name: string,                  // User-entered name
  nameSearchTokens: string[],    // Auto-generated for search
  isGlobal: false,               // Always false for custom
  
  // Auto-populated with defaults
  difficultyLevel: "Intermediate",
  targetMuscleGroup: "Unknown",
  primaryEquipment: "Unknown",
  movementPattern1: "Unknown",
  bodyRegion: "Unknown",
  mechanics: "Unknown",
  
  // Usage tracking (NEW)
  usageCount: number,            // How many times used
  lastUsedAt: timestamp,         // Last time used
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // User can fill these in later
  notes?: string,
  customMetadata?: object
}
```

#### Exercise Usage Tracking (NEW)
```typescript
// Stored in: users/{userId}/data/exercise_usage
{
  exercises: {
    [exerciseName: string]: {
      usageCount: number,
      lastUsedAt: timestamp,
      firstUsedAt: timestamp,
      isCustom: boolean,
      exerciseId: string
    }
  },
  lastUpdated: timestamp
}
```

### 2. Backend Changes

#### A. Update ExerciseService (backend/services/exercise_service.py)

Add new method for auto-creation:

```python
def auto_create_custom_exercise(
    self,
    user_id: str,
    exercise_name: str
) -> Optional[Exercise]:
    """
    Auto-create a custom exercise with minimal metadata.
    Used during workout sessions for seamless exercise creation.
    
    Args:
        user_id: ID of the user
        exercise_name: Name of the exercise to create
        
    Returns:
        Created Exercise object or None on failure
    """
    if not self.is_available():
        logger.warning("Firestore not available - cannot auto-create custom exercise")
        return None
    
    try:
        # Check if exercise already exists (global or custom)
        existing = self._check_exercise_exists(user_id, exercise_name)
        if existing:
            logger.info(f"Exercise '{exercise_name}' already exists, returning existing")
            return existing
        
        # Create exercise with minimal defaults
        exercise = Exercise(
            name=exercise_name,
            nameSearchTokens=self._generate_search_tokens(exercise_name),
            difficultyLevel="Intermediate",  # Safe default
            targetMuscleGroup="Unknown",
            primaryEquipment="Unknown",
            movementPattern1="Unknown",
            bodyRegion="Unknown",
            mechanics="Unknown",
            isGlobal=False,
            usageCount=1,  # NEW: Initialize usage tracking
            lastUsedAt=firestore.SERVER_TIMESTAMP
        )
        
        # Save to Firestore
        exercise_ref = (self.db.collection('users')
                      .document(user_id)
                      .collection('custom_exercises')
                      .document(exercise.id))
        
        exercise_data = exercise.model_dump()
        exercise_data['createdAt'] = firestore.SERVER_TIMESTAMP
        exercise_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        exercise_ref.set(exercise_data)
        
        logger.info(f"Auto-created custom exercise '{exercise.name}' for user {user_id}")
        return exercise
        
    except Exception as e:
        logger.error(f"Failed to auto-create custom exercise: {str(e)}")
        return None

def _check_exercise_exists(self, user_id: str, exercise_name: str) -> Optional[Exercise]:
    """Check if exercise exists in global or custom exercises"""
    # Check global exercises
    global_query = self.db.collection('global_exercises').where('name', '==', exercise_name).limit(1)
    global_docs = list(global_query.stream())
    if global_docs:
        return Exercise(**global_docs[0].to_dict())
    
    # Check custom exercises
    custom_query = (self.db.collection('users')
                   .document(user_id)
                   .collection('custom_exercises')
                   .where('name', '==', exercise_name)
                   .limit(1))
    custom_docs = list(custom_query.stream())
    if custom_docs:
        return Exercise(**custom_docs[0].to_dict())
    
    return None
```

#### B. Add Usage Tracking Service (NEW)

Create `backend/services/exercise_usage_service.py`:

```python
"""
Exercise Usage Tracking Service
Tracks how often users use each exercise for smart prioritization
"""

class ExerciseUsageService:
    def __init__(self):
        # Initialize similar to other services
        pass
    
    def increment_usage(self, user_id: str, exercise_name: str, exercise_id: str, is_custom: bool):
        """Increment usage count for an exercise"""
        pass
    
    def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get usage statistics for all exercises"""
        pass
    
    def get_frequently_used(self, user_id: str, limit: int = 20) -> List[str]:
        """Get list of frequently used exercise names"""
        pass
```

#### C. Add API Endpoints (backend/api/exercises.py)

```python
@router.post("/users/me/exercises/auto-create", response_model=Exercise)
async def auto_create_custom_exercise(
    exercise_name: str,
    user_id: str = Depends(require_auth),
    exercise_service = Depends(get_exercise_service)
):
    """
    Auto-create a custom exercise with minimal metadata.
    Used during workout sessions for seamless creation.
    """
    try:
        exercise = exercise_service.auto_create_custom_exercise(user_id, exercise_name)
        if not exercise:
            raise HTTPException(status_code=500, detail="Failed to auto-create exercise")
        
        return exercise
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-creating exercise: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/me/exercises/{exercise_name}/track-usage")
async def track_exercise_usage(
    exercise_name: str,
    user_id: str = Depends(require_auth),
    usage_service = Depends(get_usage_service)
):
    """Track usage of an exercise"""
    # Implementation
    pass
```

### 3. Frontend Changes

#### A. Create Exercise Usage Tracker Service (NEW)

Create `frontend/assets/js/services/exercise-usage-tracker.js`:

```javascript
/**
 * Exercise Usage Tracker Service
 * Tracks exercise usage frequency for smart prioritization
 */
class ExerciseUsageTracker {
    constructor() {
        this.usageData = this.loadFromLocalStorage();
    }
    
    /**
     * Track exercise usage
     */
    trackUsage(exerciseName, exerciseId, isCustom) {
        if (!this.usageData[exerciseName]) {
            this.usageData[exerciseName] = {
                count: 0,
                lastUsed: null,
                firstUsed: Date.now(),
                isCustom: isCustom,
                exerciseId: exerciseId
            };
        }
        
        this.usageData[exerciseName].count++;
        this.usageData[exerciseName].lastUsed = Date.now();
        
        this.saveToLocalStorage();
        this.syncToBackend(exerciseName, exerciseId, isCustom);
    }
    
    /**
     * Get frequently used exercises
     */
    getFrequentlyUsed(limit = 20) {
        return Object.entries(this.usageData)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([name, data]) => ({ name, ...data }));
    }
    
    /**
     * Get usage boost for ranking
     */
    getUsageBoost(exerciseName) {
        const usage = this.usageData[exerciseName];
        if (!usage) return 0;
        
        // More usage = higher boost (max 50 points)
        return Math.min(50, usage.count * 5);
    }
    
    async syncToBackend(exerciseName, exerciseId, isCustom) {
        // Sync to backend for cross-device consistency
    }
    
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('exercise_usage_data');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading usage data:', error);
            return {};
        }
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('exercise_usage_data', JSON.stringify(this.usageData));
        } catch (error) {
            console.error('Error saving usage data:', error);
        }
    }
}

// Global instance
window.exerciseUsageTracker = new ExerciseUsageTracker();
```

#### B. Update Exercise Cache Service

Modify `frontend/assets/js/services/exercise-cache-service.js`:

```javascript
// Add usage tracking to ranking
_rankExercises(exercises, query, preferFoundational) {
    const scoredExercises = exercises.map(exercise => {
        let baseScore = 100;
        // ... existing scoring logic ...
        
        // NEW: Usage boost (0-50 points)
        const usageBoost = window.exerciseUsageTracker?.getUsageBoost(exercise.name) || 0;
        
        // Calculate total score
        const totalScore = baseScore + tierBoost + popularityBoost + foundationalBoost + usageBoost;
        
        return { exercise, score: totalScore };
    });
    
    // Sort by score
    scoredExercises.sort((a, b) => b.score - a.score);
    
    return scoredExercises.map(item => item.exercise);
}

// Add method to auto-create custom exercise
async autoCreateCustomExercise(exerciseName) {
    try {
        if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
            console.warn('Cannot auto-create exercise - not authenticated');
            return null;
        }
        
        const token = await window.dataManager.getAuthToken();
        const response = await fetch(
            window.getApiUrl(`/api/v3/users/me/exercises/auto-create?exercise_name=${encodeURIComponent(exerciseName)}`),
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to auto-create exercise: ${response.statusText}`);
        }
        
        const exercise = await response.json();
        
        // Add to custom exercises cache
        this.customExercises.push(exercise);
        this.notifyListeners('customExerciseCreated', { exercise });
        
        console.log(`✅ Auto-created custom exercise: ${exerciseName}`);
        return exercise;
        
    } catch (error) {
        console.error('❌ Error auto-creating exercise:', error);
        return null;
    }
}
```

#### C. Update Unified Offcanvas Factory

Modify `frontend/assets/js/components/unified-offcanvas-factory.js`:

```javascript
// Update createBonusExercise to support auto-creation
static createBonusExercise(options, onAdd, onAddPrevious) {
    // ... existing code ...
    
    // Modify the add button handler
    addBtn.addEventListener('click', async () => {
        const exerciseName = exerciseInput.value.trim();
        
        if (!exerciseName) {
            alert('Please enter an exercise name');
            return;
        }
        
        // NEW: Auto-create if exercise doesn't exist
        const exercise = await this._ensureExerciseExists(exerciseName);
        
        // Track usage
        if (window.exerciseUsageTracker && exercise) {
            window.exerciseUsageTracker.trackUsage(
                exercise.name,
                exercise.id,
                !exercise.isGlobal
            );
        }
        
        // Continue with existing flow
        const data = {
            name: exerciseName,
            sets: setsInput.value || '3',
            reps: repsInput.value || '12',
            weight: weightInput.value || '',
            unit: unitBtns.find(btn => btn.classList.contains('active'))?.dataset.unit || 'lbs'
        };
        
        onAdd(data);
        offcanvas.hide();
    });
}

// NEW: Helper method to ensure exercise exists
static async _ensureExerciseExists(exerciseName) {
    // Check if exercise exists in cache
    const cacheService = window.exerciseCacheService;
    const allExercises = cacheService.getAllExercises();
    const existing = allExercises.find(ex => 
        ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    
    if (existing) {
        console.log(`✅ Exercise "${exerciseName}" already exists`);
        return existing;
    }
    
    // Auto-create custom exercise
    console.log(`🔄 Auto-creating custom exercise: ${exerciseName}`);
    const newExercise = await cacheService.autoCreateCustomExercise(exerciseName);
    
    if (newExercise) {
        console.log(`✅ Auto-created: ${exerciseName}`);
        return newExercise;
    }
    
    // Fallback: return minimal object
    console.warn(`⚠️ Could not auto-create, using fallback`);
    return {
        name: exerciseName,
        id: `temp-${Date.now()}`,
        isGlobal: false
    };
}
```

#### D. Update Workout Session Service

Modify `frontend/assets/js/services/workout-session-service.js`:

```javascript
// Add method to handle bonus exercise with auto-creation
async addBonusExerciseWithAutoCreate(exerciseName, sets, reps, weight, weightUnit) {
    // Ensure exercise exists (auto-create if needed)
    const exercise = await window.exerciseCacheService.autoCreateCustomExercise(exerciseName);
    
    // Track usage
    if (window.exerciseUsageTracker && exercise) {
        window.exerciseUsageTracker.trackUsage(
            exercise.name,
            exercise.id,
            !exercise.isGlobal
        );
    }
    
    // Add to session
    this.addBonusExercise({
        name: exerciseName,
        sets: sets,
        reps: reps,
        weight: weight,
        weight_unit: weightUnit,
        rest: '60s'
    });
}
```

## Implementation Flow

### Scenario: User Adds "Cable Flyes" During Workout

1. **User enters "Cable Flyes" in bonus exercise input**
2. **Frontend checks cache**: Is "Cable Flyes" in global or custom exercises?
3. **Not found**: Auto-create API call to backend
4. **Backend**:
   - Checks if exercise exists (double-check)
   - Creates custom exercise with minimal metadata
   - Returns exercise object
5. **Frontend**:
   - Adds to custom exercises cache
   - Tracks usage (count = 1)
   - Adds to workout session
   - No modal shown - seamless!
6. **Next time user searches "cable"**:
   - "Cable Flyes" appears in results (it's now in custom exercises)
   - Gets usage boost in ranking
   - Appears higher in search results

### Scenario: User Uses "Cable Flyes" Again

1. **User searches "cable"**
2. **"Cable Flyes" appears first** (usage boost + custom exercise)
3. **User selects it**
4. **Usage count increments** (count = 2)
5. **Next search**: Even higher priority

## Benefits

1. **Zero Friction**: No modals, no forms, just type and go
2. **Smart Learning**: System learns user's exercise vocabulary
3. **Progressive Enhancement**: Users can add details later if desired
4. **Cross-Session Persistence**: Custom exercises persist across workouts
5. **Usage-Based Ranking**: Frequently-used exercises bubble to the top

## Migration Strategy

1. **Phase 1**: Add backend auto-create endpoint
2. **Phase 2**: Add usage tracking service
3. **Phase 3**: Update frontend to use auto-create
4. **Phase 4**: Update search ranking to include usage boost
5. **Phase 5**: Test and refine

## Testing Checklist

- [ ] Auto-create works during workout session
- [ ] No duplicate exercises created
- [ ] Usage tracking increments correctly
- [ ] Custom exercises appear in search results
- [ ] Frequently-used exercises rank higher
- [ ] Works offline (localStorage fallback)
- [ ] Syncs across devices (when online)
- [ ] Handles special characters in exercise names
- [ ] Handles very long exercise names
- [ ] Performance: No lag when creating exercises

## Future Enhancements

1. **Smart Defaults**: Use ML to suggest muscle groups based on exercise name
2. **Bulk Import**: Import exercises from workout history
3. **Exercise Merging**: Detect similar names and suggest merging
4. **Community Sharing**: Share custom exercises with other users
5. **Exercise Templates**: Pre-fill common exercise patterns

## Security Considerations

1. **Rate Limiting**: Prevent abuse of auto-create endpoint
2. **Name Validation**: Sanitize exercise names
3. **User Isolation**: Ensure users can only create their own custom exercises
4. **Storage Limits**: Limit number of custom exercises per user

## Performance Considerations

1. **Caching**: Cache custom exercises in ExerciseCacheService
2. **Lazy Loading**: Load usage data on demand
3. **Debouncing**: Debounce usage tracking API calls
4. **Batch Updates**: Batch multiple usage updates
5. **IndexedDB**: Consider IndexedDB for large usage datasets

---

**Status**: Architecture Complete - Ready for Implementation
**Next Step**: Begin Phase 1 - Backend Auto-Create Endpoint