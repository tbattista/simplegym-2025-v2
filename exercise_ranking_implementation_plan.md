# Exercise Ranking Implementation Plan

This document outlines the implementation plan for enhancing the exercise search functionality with tier-based filtering and algorithmic ranking based on multiple factors including tier classification, favorites, and popularity.

## Overview

The current exercise search system performs basic filtering based on query text and optional filters (muscle group, equipment, difficulty), but lacks sophisticated ranking. We'll enhance it to incorporate the new tier classification system and create an algorithmic ranking that considers multiple factors.

## 1. Backend Changes

### 1.1 Add Tier-Based Filter Parameter to Search API Endpoint

Modify the search endpoint in `backend/api/exercises.py`:

```python
@router.get("/exercises/search", response_model=ExerciseSearchResponse)
async def search_exercises(
    q: str = Query(..., min_length=1, description="Search query"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    tier: Optional[int] = Query(None, ge=1, le=3, description="Filter by exercise tier (1=Foundation, 2=Standard, 3=Specialized)"),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Depends(get_optional_user_id),
    exercise_service = Depends(get_exercise_service),
    favorites_service = Depends(get_favorites_service)
):
    """Search exercises by name and optional filters with smart ranking"""
    try:
        filters = {}
        if muscle_group:
            filters['muscle_group'] = muscle_group
        if equipment:
            filters['equipment'] = equipment
        if difficulty:
            filters['difficulty'] = difficulty
        if tier:
            filters['tier'] = tier
        
        result = exercise_service.search_exercises(
            query=q,
            filters=filters if filters else None,
            limit=limit,
            user_id=user_id
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching exercises: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching exercises: {str(e)}")
```

Add a new dependency to get the optional user ID:

```python
def get_optional_user_id(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """Get user ID from token if available, but don't require auth"""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    
    try:
        token = authorization.replace('Bearer ', '')
        user_id = verify_token(token)
        return user_id
    except:
        return None
```

### 1.2 Implement Ranking Algorithm in Exercise Service

Modify the `search_exercises` method in `backend/services/exercise_service.py`:

```python
def search_exercises(
    self,
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 20,
    user_id: Optional[str] = None
) -> ExerciseSearchResponse:
    """
    Search exercises by name and optional filters with smart ranking
    
    Args:
        query: Search query string
        filters: Optional filters (muscle_group, equipment, difficulty, tier)
        limit: Maximum number of results
        user_id: Optional user ID for favorites-based ranking
        
    Returns:
        ExerciseSearchResponse with ranked matching exercises
    """
    if not self.is_available():
        return ExerciseSearchResponse(
            exercises=[],
            query=query,
            total_results=0
        )
    
    try:
        query_lower = query.lower()
        
        # Start with base query
        exercises_ref = self.db.collection('global_exercises')
        
        # Apply filters if provided
        if filters:
            if 'muscle_group' in filters and filters['muscle_group']:
                exercises_ref = exercises_ref.where('targetMuscleGroup', '==', filters['muscle_group'])
            if 'equipment' in filters and filters['equipment']:
                exercises_ref = exercises_ref.where('primaryEquipment', '==', filters['equipment'])
            if 'difficulty' in filters and filters['difficulty']:
                exercises_ref = exercises_ref.where('difficultyLevel', '==', filters['difficulty'])
            if 'tier' in filters and filters['tier']:
                exercises_ref = exercises_ref.where('exerciseTier', '==', filters['tier'])
        
        # Use array-contains for token-based search
        if query_lower:
            exercises_ref = exercises_ref.where('nameSearchTokens', 'array_contains', query_lower)
        
        # Increase limit to allow for ranking
        fetch_limit = min(limit * 3, 100)  # Fetch more to allow for ranking
        exercises_ref = exercises_ref.limit(fetch_limit)
        
        docs = exercises_ref.stream()
        exercises = []
        
        for doc in docs:
            try:
                exercise_data = doc.to_dict()
                exercise = Exercise(**exercise_data)
                exercises.append(exercise)
            except Exception as e:
                logger.warning(f"Failed to parse exercise {doc.id}: {str(e)}")
                continue
        
        # Get user favorites if user_id is provided
        user_favorites = set()
        if user_id and len(exercises) > 0:
            from ..services.favorites_service import favorites_service
            if favorites_service.is_available():
                exercise_ids = [ex.id for ex in exercises]
                favorites_dict = favorites_service.bulk_check_favorites(user_id, exercise_ids)
                user_favorites = {ex_id for ex_id, is_fav in favorites_dict.items() if is_fav}
        
        # Apply ranking algorithm
        ranked_exercises = self._rank_exercises(exercises, query_lower, user_favorites)
        
        # Limit results after ranking
        ranked_exercises = ranked_exercises[:limit]
        
        logger.info(f"Search '{query}' returned {len(ranked_exercises)} ranked results")
        
        return ExerciseSearchResponse(
            exercises=ranked_exercises,
            query=query,
            total_results=len(ranked_exercises)
        )
        
    except Exception as e:
        logger.error(f"Failed to search exercises: {str(e)}")
        return ExerciseSearchResponse(
            exercises=[],
            query=query,
            total_results=0
        )

def _rank_exercises(
    self, 
    exercises: List[Exercise], 
    query: str, 
    user_favorites: Set[str]
) -> List[Exercise]:
    """
    Rank exercises based on multiple factors
    
    Args:
        exercises: List of exercises to rank
        query: Search query (lowercase)
        user_favorites: Set of exercise IDs favorited by the user
        
    Returns:
        Ranked list of exercises
    """
    # Calculate scores for each exercise
    scored_exercises = []
    
    for exercise in exercises:
        # Base relevance score (exact name match gets highest score)
        base_score = 100
        if exercise.name and query in exercise.name.lower():
            # Exact match gets higher score
            name_lower = exercise.name.lower()
            if name_lower == query:
                base_score = 100
            elif name_lower.startswith(query):
                base_score = 90
            else:
                base_score = 80
        else:
            # Matched on tokens or other fields
            base_score = 70
        
        # Tier boost
        tier_boost = 0
        if exercise.exerciseTier == 1:  # Foundation
            tier_boost = 30
        elif exercise.exerciseTier == 2:  # Standard
            tier_boost = 15
        # Tier 3 gets no boost
        
        # Favorite boost
        favorite_boost = 25 if exercise.id in user_favorites else 0
        
        # Popularity boost (0-25 points)
        popularity_boost = min(25, (exercise.popularityScore or 0) / 4)
        
        # Calculate total score
        total_score = base_score + tier_boost + favorite_boost + popularity_boost
        
        scored_exercises.append((exercise, total_score))
    
    # Sort by score (descending)
    scored_exercises.sort(key=lambda x: x[1], reverse=True)
    
    # Return sorted exercises
    return [ex for ex, score in scored_exercises]
```

### 1.3 Add Dependencies for Favorites Service

Add a dependency to get the favorites service in `backend/api/dependencies.py`:

```python
def get_favorites_service():
    """Get favorites service instance"""
    from ..services.favorites_service import favorites_service
    return favorites_service
```

## 2. Frontend Changes

### 2.1 Update Frontend Search Component to Support Tier Filtering

Modify the `ExerciseAutocomplete` class in `frontend/assets/js/components/exercise-autocomplete.js`:

```javascript
constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
        minChars: 2,
        maxResults: 20,
        debounceMs: 300,
        placeholder: 'Search exercises...',
        showMuscleGroup: true,
        showEquipment: true,
        showDifficulty: true,
        showTier: true,  // New option to show tier
        preferFoundational: false,  // New option to prefer foundational exercises
        allowCustom: true,
        onSelect: null,
        ...options
    };
    
    // Rest of the constructor remains the same
}
```

Update the `render` method to display tier information:

```javascript
render() {
    // Existing code...
    
    this.filteredResults.forEach((exercise, index) => {
        const isSelected = index === this.selectedIndex;
        const isCustom = !exercise.isGlobal;
        const isFoundational = exercise.isFoundational;
        const tier = exercise.exerciseTier || 2;
        
        let tierBadge = '';
        if (this.options.showTier) {
            if (tier === 1) {
                tierBadge = '<span class="badge bg-label-success">Foundation</span>';
            } else if (tier === 2) {
                tierBadge = '<span class="badge bg-label-primary">Standard</span>';
            } else if (tier === 3) {
                tierBadge = '<span class="badge bg-label-warning">Specialized</span>';
            }
        }
        
        html += `
            <div class="exercise-autocomplete-item ${isSelected ? 'selected' : ''} ${isFoundational ? 'is-foundational' : ''}" 
                 data-index="${index}"
                 onclick="window.exerciseAutocompleteInstances['${this.input.id}'].selectExercise(${JSON.stringify(exercise).replace(/"/g, '&quot;')})">
                <div class="exercise-name">
                    ${isCustom ? '<i class="bx bx-star text-warning me-1"></i>' : ''}
                    ${isFoundational ? '<i class="bx bx-badge-check text-success me-1"></i>' : ''}
                    ${this.escapeHtml(exercise.name)}
                </div>
                <div class="exercise-meta">
                    ${tierBadge}
                    ${this.options.showMuscleGroup && exercise.targetMuscleGroup ? 
                        `<span class="badge bg-label-primary">${this.escapeHtml(exercise.targetMuscleGroup)}</span>` : ''}
                    ${this.options.showEquipment && exercise.primaryEquipment ? 
                        `<span class="badge bg-label-secondary">${this.escapeHtml(exercise.primaryEquipment)}</span>` : ''}
                    ${this.options.showDifficulty && exercise.difficultyLevel ? 
                        `<span class="badge bg-label-info">${this.escapeHtml(exercise.difficultyLevel)}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    // Rest of the method remains the same
}
```

### 2.2 Update Frontend Cache Service to Handle Ranked Results

Modify the `searchExercises` method in `frontend/assets/js/services/exercise-cache-service.js`:

```javascript
searchExercises(query, options = {}) {
    const {
        maxResults = 20,
        includeCustom = true,
        preferFoundational = false,
        tierFilter = null
    } = options;
    
    if (!query || query.length < 2) {
        return [];
    }
    
    const queryLower = query.toLowerCase();
    const allExercises = includeCustom ? this.getAllExercises() : this.exercises;
    
    // Filter exercises
    const filtered = allExercises.filter(exercise => {
        // Apply tier filter if specified
        if (tierFilter && exercise.exerciseTier !== tierFilter) {
            return false;
        }
        
        // Search in name
        if (exercise.name && exercise.name.toLowerCase().includes(queryLower)) {
            return true;
        }
        
        // Search in muscle group
        if (exercise.targetMuscleGroup &&
            exercise.targetMuscleGroup.toLowerCase().includes(queryLower)) {
            return true;
        }
        
        // Search in equipment
        if (exercise.primaryEquipment &&
            exercise.primaryEquipment.toLowerCase().includes(queryLower)) {
            return true;
        }
        
        return false;
    });
    
    // Rank exercises
    const ranked = this._rankExercises(filtered, queryLower, preferFoundational);
    
    // Limit results
    return ranked.slice(0, maxResults);
}

_rankExercises(exercises, query, preferFoundational) {
    // Calculate scores for each exercise
    const scoredExercises = exercises.map(exercise => {
        // Base relevance score (exact name match gets highest score)
        let baseScore = 100;
        if (exercise.name && exercise.name.toLowerCase().includes(query)) {
            // Exact match gets higher score
            const nameLower = exercise.name.toLowerCase();
            if (nameLower === query) {
                baseScore = 100;
            } else if (nameLower.startsWith(query)) {
                baseScore = 90;
            } else {
                baseScore = 80;
            }
        } else {
            // Matched on other fields
            baseScore = 70;
        }
        
        // Tier boost
        let tierBoost = 0;
        if (exercise.exerciseTier === 1) {  // Foundation
            tierBoost = 30;
        } else if (exercise.exerciseTier === 2) {  // Standard
            tierBoost = 15;
        }
        // Tier 3 gets no boost
        
        // Favorite boost - client-side doesn't have access to favorites
        // We'll rely on the backend for this
        
        // Popularity boost (0-25 points)
        const popularityBoost = Math.min(25, (exercise.popularityScore || 0) / 4);
        
        // Foundational preference boost
        const foundationalBoost = (preferFoundational && exercise.isFoundational) ? 20 : 0;
        
        // Calculate total score
        const totalScore = baseScore + tierBoost + popularityBoost + foundationalBoost;
        
        return { exercise, score: totalScore };
    });
    
    // Sort by score (descending)
    scoredExercises.sort((a, b) => b.score - a.score);
    
    // Return sorted exercises
    return scoredExercises.map(item => item.exercise);
}
```

### 2.3 Add CSS Styling for Tier Badges

Add the following CSS to `frontend/assets/css/exercise-database.css`:

```css
/* Tier badges and foundational exercise styling */
.exercise-autocomplete-item.is-foundational {
    background-color: rgba(40, 167, 69, 0.05);
}

.exercise-autocomplete-item .badge {
    margin-right: 4px;
}

.badge.bg-label-success {
    background-color: rgba(40, 167, 69, 0.1) !important;
    color: #28a745 !important;
}

.badge.bg-label-warning {
    background-color: rgba(255, 193, 7, 0.1) !important;
    color: #ffc107 !important;
}
```

## 3. Testing Plan

### 3.1 Test Ranking Algorithm with Various Scenarios

1. Search with exact name match
2. Search with partial name match
3. Search with muscle group
4. Search with equipment
5. Test tier filtering (Foundation, Standard, Specialized)
6. Test with user favorites (logged in vs. not logged in)
7. Test with exercises of varying popularity scores

### 3.2 Verify Tier Distribution and Scoring Accuracy

1. Verify that Foundation (Tier 1) exercises appear at the top of results
2. Verify that user favorites get appropriate boost
3. Verify that popular exercises rank higher than unpopular ones
4. Verify that exact name matches rank highest

## 4. Implementation Steps

1. Update backend API endpoint to add tier filter parameter
2. Implement ranking algorithm in exercise service
3. Add dependencies for favorites service
4. Update frontend search component to support tier filtering
5. Update frontend cache service to handle ranked results
6. Add CSS styling for tier badges
7. Test with various scenarios
8. Verify tier distribution and scoring accuracy

## 5. Conclusion

This implementation will significantly improve the exercise search experience by:

1. Prioritizing Foundation (Tier 1) exercises that are essential for every lifter
2. Considering user favorites to personalize results
3. Taking popularity into account to show commonly used exercises
4. Maintaining relevance to the search query
5. Providing visual indicators for exercise tiers

The algorithmic ranking will create a more intuitive and user-friendly search experience that guides users toward the most appropriate exercises for their needs.