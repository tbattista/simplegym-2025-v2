# Exercise Popularity & Favorites Feature - Architecture Plan

## 📋 Overview

This document outlines the architecture for adding **Popular** (global) and **Favorite** (user-specific) tags to the exercise database, along with an Exercise Database Editor page for users to browse and favorite exercises.

---

## 🎯 Goals

1. **Popular Exercises**: Global ranking system to prioritize common exercises (e.g., "Barbell Back Squat" appears first when searching "Squat")
2. **User Favorites**: Allow authenticated users to mark exercises as favorites for quick access
3. **Exercise Browser**: New page for users to search, filter, and favorite exercises before building workouts
4. **Enhanced Search**: Improve autocomplete to prioritize popular and favorited exercises

---

## 🗄️ Database Schema Design

### 1. Global Exercises Collection (`global_exercises`)

**Add New Fields:**

```typescript
{
  // Existing fields...
  id: string,
  name: string,
  nameSearchTokens: string[],
  targetMuscleGroup: string,
  // ... other existing fields
  
  // NEW FIELDS
  popularityScore: number,        // 0-100, higher = more popular
  popularityRank: number,          // 1-2583, lower = more popular
  usageCount: number,              // How many times used in workouts (optional)
  lastUpdatedPopularity: timestamp // When popularity was last calculated
}
```

**Firestore Indexes Required:**
```
Collection: global_exercises
- name (ASC) + popularityScore (DESC)
- targetMuscleGroup (ASC) + popularityScore (DESC)
- nameSearchTokens (ARRAY) + popularityScore (DESC)
```

### 2. User Favorites Collection (`users/{userId}/favorite_exercises`)

**New Subcollection Structure:**

```typescript
Document ID: {exerciseId}
{
  exerciseId: string,              // Reference to global exercise
  exerciseName: string,            // Denormalized for quick display
  targetMuscleGroup: string,       // Denormalized for filtering
  isGlobal: boolean,               // true for global, false for custom
  favoritedAt: timestamp,          // When user favorited it
  notes: string,                   // Optional user notes
  tags: string[]                   // Optional user tags
}
```

**Firestore Indexes Required:**
```
Collection: users/{userId}/favorite_exercises
- favoritedAt (DESC)
- targetMuscleGroup (ASC) + favoritedAt (DESC)
```

---

## 🔢 Popularity Scoring System

### Initial Popularity Assignment

**Tier 1 - Essential Compound Movements (Score: 90-100)**
- Barbell Back Squat, Front Squat
- Barbell Bench Press, Incline Bench Press
- Conventional Deadlift, Romanian Deadlift
- Barbell Row, Pull-ups
- Overhead Press, Push Press

**Tier 2 - Common Compound Exercises (Score: 70-89)**
- Dumbbell variations of Tier 1
- Leg Press, Hack Squat
- Dips, Chin-ups
- Lunges, Bulgarian Split Squats

**Tier 3 - Popular Isolation Exercises (Score: 50-69)**
- Bicep Curls, Tricep Extensions
- Lateral Raises, Face Pulls
- Leg Curls, Leg Extensions
- Calf Raises

**Tier 4 - Specialized/Advanced (Score: 30-49)**
- Olympic lifts (Clean, Snatch)
- Specialty bar exercises
- Advanced variations

**Tier 5 - Niche/Uncommon (Score: 0-29)**
- Highly specialized exercises
- Rehabilitation exercises
- Rare equipment exercises

### Dynamic Popularity Updates (Future Enhancement)

```python
# Pseudocode for future usage tracking
def update_popularity_score(exercise_id):
    usage_count = count_workouts_using_exercise(exercise_id)
    recency_factor = calculate_recent_usage_weight()
    
    # Weighted formula
    popularity_score = (
        base_score * 0.6 +           # Initial tier score
        usage_count * 0.3 +           # Actual usage
        recency_factor * 0.1          # Recent popularity
    )
    
    return min(100, popularity_score)
```

---

## 🔌 Backend API Endpoints

### Exercise Management Endpoints

#### 1. Get Exercises with Popularity
```http
GET /api/v3/exercises?page=1&page_size=500&sort_by=popularity
```

**Query Parameters:**
- `sort_by`: `popularity` | `name` | `recent` (default: `name`)
- `muscle_group`: Filter by muscle group
- `min_popularity`: Minimum popularity score (0-100)

**Response:**
```json
{
  "exercises": [
    {
      "id": "exercise-abc123",
      "name": "Barbell Back Squat",
      "popularityScore": 95,
      "popularityRank": 1,
      "targetMuscleGroup": "Quadriceps",
      "isFavorited": true  // If user is authenticated
    }
  ],
  "total_count": 2583,
  "page": 1,
  "page_size": 500
}
```

#### 2. Search with Popularity Boost
```http
GET /api/v3/exercises/search?q=squat&boost_popular=true
```

**Enhanced Search Algorithm:**
```python
def search_with_popularity(query, boost_popular=True):
    results = basic_search(query)
    
    if boost_popular:
        # Sort by: exact match > popularity > alphabetical
        results.sort(key=lambda x: (
            -1 if x.name.lower() == query.lower() else 0,  # Exact match first
            -x.popularityScore,                             # Then by popularity
            x.name.lower()                                  # Then alphabetically
        ))
    
    return results
```

#### 3. User Favorites Management

**Add to Favorites:**
```http
POST /api/v3/users/me/favorites
Content-Type: application/json
Authorization: Bearer {token}

{
  "exerciseId": "exercise-abc123",
  "notes": "Great for building strength",
  "tags": ["compound", "legs"]
}
```

**Get User Favorites:**
```http
GET /api/v3/users/me/favorites?muscle_group=Chest
```

**Remove from Favorites:**
```http
DELETE /api/v3/users/me/favorites/{exerciseId}
```

**Bulk Favorite Check:**
```http
POST /api/v3/users/me/favorites/check
Content-Type: application/json

{
  "exerciseIds": ["exercise-abc123", "exercise-def456"]
}

Response:
{
  "favorites": {
    "exercise-abc123": true,
    "exercise-def456": false
  }
}
```

---

## 🎨 Exercise Database Editor - UI Design

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Ghost Gym - Exercise Database                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │  FILTERS        │  │  EXERCISE LIST                    │ │
│  │                 │  │                                    │ │
│  │  Search: [____] │  │  ⭐ Barbell Back Squat    ❤️ 95  │ │
│  │                 │  │     Quadriceps • Barbell          │ │
│  │  Muscle Group:  │  │                                    │ │
│  │  [ All ▼ ]      │  │  ⭐ Barbell Bench Press   ❤️ 94  │ │
│  │                 │  │     Chest • Barbell               │ │
│  │  Equipment:     │  │                                    │ │
│  │  [ All ▼ ]      │  │  ⭐ Conventional Deadlift ❤️ 93  │ │
│  │                 │  │     Hamstrings • Barbell          │ │
│  │  Difficulty:    │  │                                    │ │
│  │  [ All ▼ ]      │  │  ⭐ Pull-ups              ❤️ 92  │ │
│  │                 │  │     Lats • Bodyweight             │ │
│  │  Show:          │  │                                    │ │
│  │  ☑ Popular      │  │  [Load More...]                   │ │
│  │  ☑ My Favorites │  │                                    │ │
│  │  ☐ Custom Only  │  │                                    │ │
│  │                 │  │                                    │ │
│  └─────────────────┘  └──────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Exercise Card Design

```html
<div class="exercise-card">
  <div class="exercise-header">
    <div class="exercise-info">
      <span class="popularity-badge">⭐ 95</span>
      <h5 class="exercise-name">Barbell Back Squat</h5>
      <button class="favorite-btn" data-favorited="true">
        <i class="bx bxs-heart"></i>
      </button>
    </div>
  </div>
  
  <div class="exercise-meta">
    <span class="badge bg-label-primary">Quadriceps</span>
    <span class="badge bg-label-secondary">Barbell</span>
    <span class="badge bg-label-info">Compound</span>
  </div>
  
  <div class="exercise-actions">
    <button class="btn btn-sm btn-outline-primary">
      <i class="bx bx-info-circle"></i> Details
    </button>
    <button class="btn btn-sm btn-primary">
      <i class="bx bx-plus"></i> Add to Workout
    </button>
  </div>
</div>
```

### Key UI Features

1. **Real-time Search**: Debounced search with instant results
2. **Filter Sidebar**: Multi-select filters for muscle groups, equipment, difficulty
3. **Sort Options**: 
   - Most Popular
   - Alphabetical
   - Recently Added
   - My Favorites First
4. **Favorite Toggle**: One-click heart icon to favorite/unfavorite
5. **Infinite Scroll**: Load more exercises as user scrolls
6. **Quick Actions**: View details, add to workout, create custom variation

---

## 🔍 Enhanced Autocomplete Search

### Updated Search Logic

```javascript
class ExerciseAutocomplete {
  async search(query) {
    const queryLower = query.toLowerCase();
    
    // Combine global and custom exercises
    const allExercises = [...this.exercises, ...this.customExercises];
    
    // Filter and score results
    const scoredResults = allExercises
      .filter(exercise => this.matchesQuery(exercise, queryLower))
      .map(exercise => ({
        exercise,
        score: this.calculateRelevanceScore(exercise, queryLower)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxResults)
      .map(item => item.exercise);
    
    this.filteredResults = scoredResults;
    this.render();
  }
  
  calculateRelevanceScore(exercise, query) {
    let score = 0;
    
    // Exact match bonus
    if (exercise.name.toLowerCase() === query) {
      score += 1000;
    }
    
    // Starts with query bonus
    if (exercise.name.toLowerCase().startsWith(query)) {
      score += 500;
    }
    
    // User favorite bonus
    if (exercise.isFavorited) {
      score += 300;
    }
    
    // Popularity score (0-100)
    score += exercise.popularityScore || 0;
    
    // Custom exercise bonus (user's own exercises)
    if (!exercise.isGlobal) {
      score += 200;
    }
    
    return score;
  }
}
```

---

## 📊 Implementation Roadmap

### Phase 1: Database Schema & Popularity Scoring (Week 1)

**Tasks:**
1. ✅ Update [`Exercise`](backend/models.py:435) model with new fields
2. ✅ Create popularity scoring script
3. ✅ Run initial popularity assignment on all 2,583 exercises
4. ✅ Update Firestore indexes
5. ✅ Test data migration

**Files to Modify:**
- [`backend/models.py`](backend/models.py:435) - Add `popularityScore`, `popularityRank`
- `backend/scripts/assign_popularity.py` - New script
- [`backend/scripts/import_exercises.py`](backend/scripts/import_exercises.py:1) - Update to include popularity

### Phase 2: Backend API Endpoints (Week 1-2)

**Tasks:**
1. ✅ Update [`exercise_service.py`](backend/services/exercise_service.py:1) with popularity sorting
2. ✅ Create favorites service methods
3. ✅ Add API endpoints in [`main.py`](backend/main.py:1)
4. ✅ Add authentication middleware for favorites
5. ✅ Write API tests

**New Files:**
- `backend/services/favorites_service.py`

**Files to Modify:**
- [`backend/services/exercise_service.py`](backend/services/exercise_service.py:45) - Add popularity sorting
- [`backend/main.py`](backend/main.py:1186) - Add favorites endpoints

### Phase 3: Exercise Database Editor Page (Week 2)

**Tasks:**
1. ✅ Create HTML page structure
2. ✅ Implement filter sidebar
3. ✅ Build exercise card component
4. ✅ Add infinite scroll
5. ✅ Implement favorite toggle
6. ✅ Add to menu navigation

**New Files:**
- `frontend/exercise-database.html`
- `frontend/js/exercise-database.js`
- `frontend/assets/css/exercise-database.css`

**Files to Modify:**
- [`frontend/dashboard.html`](frontend/dashboard.html:1) - Add menu link

### Phase 4: Enhanced Autocomplete (Week 2-3)

**Tasks:**
1. ✅ Update [`exercise-autocomplete.js`](frontend/js/components/exercise-autocomplete.js:1) with scoring
2. ✅ Add favorite indicator in dropdown
3. ✅ Implement popularity badges
4. ✅ Test search relevance

**Files to Modify:**
- [`frontend/js/components/exercise-autocomplete.js`](frontend/js/components/exercise-autocomplete.js:213) - Update search logic
- [`frontend/assets/css/exercise-autocomplete.css`](frontend/assets/css/exercise-autocomplete.css:1) - Add styles

### Phase 5: Testing & Polish (Week 3)

**Tasks:**
1. ✅ End-to-end testing
2. ✅ Performance optimization
3. ✅ Mobile responsiveness
4. ✅ Documentation updates
5. ✅ User feedback collection

---

## 🔐 Security Considerations

1. **Favorites Access Control**:
   - Only authenticated users can favorite exercises
   - Users can only access their own favorites
   - Firestore security rules enforce user isolation

2. **Popularity Manipulation Prevention**:
   - Popularity scores are admin-managed
   - No user-facing API to modify popularity
   - Usage tracking (future) will be rate-limited

3. **Data Validation**:
   - Validate exercise IDs before favoriting
   - Sanitize user notes and tags
   - Limit favorites per user (e.g., 500 max)

---

## 📈 Performance Optimization

1. **Caching Strategy**:
   - Cache popular exercises list (top 100) for 24 hours
   - Cache user favorites in localStorage
   - Invalidate cache on favorite add/remove

2. **Lazy Loading**:
   - Load exercises in batches of 50
   - Implement virtual scrolling for large lists
   - Prefetch next page on scroll

3. **Index Optimization**:
   - Composite indexes for filtered + sorted queries
   - Denormalize frequently accessed fields
   - Use Firestore query cursors for pagination

---

## 🎯 Success Metrics

1. **User Engagement**:
   - % of users who favorite at least one exercise
   - Average favorites per user
   - Time spent on Exercise Database page

2. **Search Quality**:
   - Click-through rate on first result
   - Average position of selected exercise
   - Search abandonment rate

3. **Performance**:
   - Page load time < 2 seconds
   - Search response time < 300ms
   - Favorite toggle response < 100ms

---

## 🚀 Future Enhancements

1. **Social Features**:
   - Share favorite exercise lists
   - Community-voted popularity
   - Exercise recommendations

2. **Advanced Filtering**:
   - Multi-select muscle groups
   - Equipment availability profiles
   - Difficulty progression paths

3. **Analytics**:
   - Personal exercise usage tracking
   - Workout pattern analysis
   - Progress tracking per exercise

4. **AI Features**:
   - Exercise recommendations based on favorites
   - Automatic workout generation
   - Form check video analysis

---

## 📝 Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** based on user needs
3. **Create detailed tickets** for each phase
4. **Set up development environment** for testing
5. **Begin Phase 1** implementation

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-17  
**Author**: Ghost Gym Development Team