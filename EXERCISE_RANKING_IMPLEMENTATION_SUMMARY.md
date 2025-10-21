# Exercise Ranking System Implementation

This document summarizes the implementation of the new exercise ranking system in Ghost Gym V2, which organizes search results based on multiple factors including tier classification, favorites, and popularity.

## Overview

The exercise ranking system has been designed to improve search results by prioritizing exercises based on:

1. **Tier Classification**: Foundation (Tier 1) > Standard (Tier 2) > Specialized (Tier 3)
2. **User Favorites**: Exercises favorited by the user get a boost
3. **Exercise Popularity**: More popular exercises rank higher
4. **Search Relevance**: Exact matches and name-starts-with matches get priority

## Tier Classification System

Exercises are classified into three tiers:

| Tier | Name | Score Range | Description | Priority Boost |
|------|------|-------------|-------------|---------------|
| 1 | FOUNDATION | 90-100 | Essential movements every lifter should know | +30 points |
| 2 | STANDARD | 60-89 | Common variations and proven accessory exercises | +15 points |
| 3 | SPECIALIZED | 0-59 | Advanced skills, specialized equipment, niche movements | +0 points |

## Implementation Details

### Backend Changes

1. **API Endpoint Enhancement**:
   - Added tier filter parameter to `/api/v3/exercises/search` endpoint
   - Added optional user authentication for favorites-based ranking

2. **Ranking Algorithm**:
   - Implemented in `ExerciseService._rank_exercises()` method
   - Calculates a score for each exercise based on multiple factors
   - Sorts exercises by score in descending order

3. **Testing Script**:
   - Created `test_exercise_ranking.py` to verify algorithm behavior
   - Tests tier ranking, favorites boost, popularity boost, and combined factors

### Frontend Changes

1. **Exercise Autocomplete Component**:
   - Added tier display with color-coded badges
   - Added visual indicator for foundational exercises
   - Added options for tier filtering and foundational preference

2. **Cache Service Enhancement**:
   - Implemented client-side ranking algorithm
   - Added support for tier filtering
   - Added preference for foundational exercises

3. **CSS Styling**:
   - Added styles for tier badges
   - Added highlighting for foundational exercises

## Ranking Algorithm

The ranking formula is:

```
Rank Score = (Base Relevance Score) + 
             (Tier Boost) + 
             (Favorite Boost) + 
             (Popularity Boost)
```

Where:
- **Base Relevance Score**: How well the exercise matches the search query (0-100)
- **Tier Boost**: 
  - Tier 1: +30 points
  - Tier 2: +15 points
  - Tier 3: +0 points
- **Favorite Boost**: +25 points if the user has favorited the exercise
- **Popularity Boost**: (popularityScore / 4) points (0-25 range)

This gives a maximum score of 180 points.

## Usage Examples

### Backend API

```python
# Filter by tier
response = await client.get("/api/v3/exercises/search?q=squat&tier=1")

# Regular search (ranks by tier, favorites, popularity)
response = await client.get("/api/v3/exercises/search?q=press")
```

### Frontend Component

```javascript
// Initialize with tier filtering
const autocomplete = initExerciseAutocomplete(inputElement, {
    showTier: true,
    preferFoundational: true,
    tierFilter: 1  // Only show Tier 1 exercises
});

// Regular search (ranks by tier, favorites, popularity)
const autocomplete = initExerciseAutocomplete(inputElement, {
    showTier: true
});
```

## Testing

The ranking algorithm has been tested with various scenarios to ensure it behaves as expected:

1. **Tier Ranking**: Verifies that Tier 1 exercises rank higher than Tier 2, which rank higher than Tier 3
2. **Favorites Boost**: Verifies that favorited exercises get a ranking boost
3. **Popularity Boost**: Verifies that more popular exercises rank higher
4. **Exact Match**: Verifies that exact name matches rank highest
5. **Combined Factors**: Verifies the interaction between different ranking factors
6. **Tier Distribution**: Verifies that the tier distribution matches the expected ranges

To run the tests:

```bash
python backend/scripts/test_exercise_ranking.py
```

## Benefits

1. **Improved User Experience**: Beginners will see foundational exercises first, helping them build proper exercise knowledge.

2. **Personalization**: Users will see their favorite exercises ranked higher, creating a more tailored experience.

3. **Community-Driven**: Popular exercises get a boost, leveraging collective wisdom.

4. **Specialized Discovery**: Advanced users can still find specialized exercises when needed through specific searches or filters.

## Future Enhancements

1. **User Preference Settings**: Allow users to adjust ranking weights based on their preferences.

2. **Machine Learning**: Incorporate user behavior data to improve ranking over time.

3. **Context-Aware Ranking**: Adjust ranking based on the context (e.g., workout type, user goals).

4. **Expanded Filters**: Add more filter options based on the rich exercise metadata available.