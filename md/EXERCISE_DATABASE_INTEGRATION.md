# Exercise Database Integration - Ghost Gym V2

## Overview

This document describes the exercise database integration for Ghost Gym V2, which provides a searchable library of exercises with autocomplete functionality for quick workout creation.

## Architecture

### Data Structure

The exercise database uses a **two-collection Firestore architecture**:

1. **`global_exercises`** - Shared exercise library (read-only for users)
2. **`users/{userId}/custom_exercises`** - User-specific custom exercises

### Exercise Model

Each exercise contains 30+ fields including:

**Core Information:**
- `name` - Exercise name
- `nameSearchTokens` - Tokenized name for search optimization
- `difficultyLevel` - Beginner, Intermediate, Advanced
- `targetMuscleGroup` - Primary muscle group targeted
- `primeMoverMuscle` - Specific prime mover muscle

**Equipment:**
- `primaryEquipment` - Main equipment needed
- `primaryEquipmentCount` - Number of items
- `secondaryEquipment` - Additional equipment
- `secondaryEquipmentCount` - Number of items

**Movement Details:**
- `posture` - Body position (Supine, Prone, Standing, etc.)
- `armType` - Single or Double Arm
- `armPattern` - Continuous or Alternating
- `grip` - Type of grip used
- `movementPattern1/2/3` - Movement patterns
- `planeOfMotion1/2/3` - Planes of motion

**Classification:**
- `bodyRegion` - Upper Body, Lower Body, Midsection
- `forceType` - Push, Pull, Other
- `mechanics` - Compound or Isolation
- `laterality` - Bilateral, Unilateral, Contralateral
- `classification` - Strength, Cardio, Flexibility, etc.

**Metadata:**
- `isGlobal` - Whether global or user-specific
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Backend Implementation

### Files Created

1. **`backend/models.py`** - Added Exercise models:
   - `Exercise` - Main exercise model
   - `ExerciseReference` - Reference for use in workouts
   - `CreateExerciseRequest` - Request model for custom exercises
   - `ExerciseListResponse` - List response model
   - `ExerciseSearchResponse` - Search response model

2. **`backend/services/exercise_service.py`** - Exercise service:
   - `get_all_exercises()` - Get all exercises with pagination
   - `search_exercises()` - Search with filters
   - `get_exercise_by_id()` - Get specific exercise
   - `create_custom_exercise()` - Create user exercise
   - `get_user_custom_exercises()` - Get user's exercises
   - `get_unique_values()` - Get filter options

3. **`backend/scripts/import_exercises.py`** - CSV import script:
   - Parses CSV with 30 columns
   - Generates search tokens
   - Batch uploads to Firestore (500 per batch)
   - Progress tracking and error handling

4. **`backend/main.py`** - API endpoints added:
   - `GET /api/v3/exercises` - List all exercises
   - `GET /api/v3/exercises/search` - Search exercises
   - `GET /api/v3/exercises/{id}` - Get specific exercise
   - `GET /api/v3/exercises/filters/{field}` - Get filter values
   - `POST /api/v3/users/me/exercises` - Create custom exercise
   - `GET /api/v3/users/me/exercises` - Get user's custom exercises

### Dependencies Added

```txt
pandas>=2.0.0  # For CSV parsing
```

## Data Import Process

### Step 1: Prepare CSV File

Ensure your CSV file has these columns:
- Exercise
- Difficulty Level
- Target Muscle Group
- Prime Mover Muscle
- Primary Equipment
- (and 25+ more fields)

### Step 2: Run Import Script

```bash
# Dry run (test without uploading)
python -m backend.scripts.import_exercises Exercises.csv --dry-run

# Actual import
python -m backend.scripts.import_exercises Exercises.csv

# Custom batch size
python -m backend.scripts.import_exercises Exercises.csv --batch-size 250
```

### Step 3: Verify Import

```bash
# Check Firestore console or use API
curl http://localhost:8000/api/v3/exercises?page=1&page_size=10
```

## API Usage Examples

### Search Exercises

```javascript
// Basic search
fetch('/api/v3/exercises/search?q=bench&limit=20')
  .then(res => res.json())
  .then(data => console.log(data.exercises));

// Search with filters
fetch('/api/v3/exercises/search?q=press&muscle_group=Chest&difficulty=Beginner')
  .then(res => res.json())
  .then(data => console.log(data.exercises));
```

### Get All Exercises

```javascript
fetch('/api/v3/exercises?page=1&page_size=100')
  .then(res => res.json())
  .then(data => {
    console.log(`Total: ${data.total_count}`);
    console.log(`Exercises:`, data.exercises);
  });
```

### Get Filter Options

```javascript
// Get all muscle groups
fetch('/api/v3/exercises/filters/targetMuscleGroup')
  .then(res => res.json())
  .then(data => console.log(data.values));

// Get all equipment types
fetch('/api/v3/exercises/filters/primaryEquipment')
  .then(res => res.json())
  .then(data => console.log(data.values));
```

### Create Custom Exercise

```javascript
const customExercise = {
  name: "My Special Exercise",
  difficultyLevel: "Intermediate",
  targetMuscleGroup: "Chest",
  primaryEquipment: "Dumbbells",
  mechanics: "Compound"
};

fetch('/api/v3/users/me/exercises', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(customExercise)
})
.then(res => res.json())
.then(exercise => console.log('Created:', exercise));
```

## Frontend Integration (To Be Implemented)

### Autocomplete Component

The frontend autocomplete component will:

1. **Load exercises** on page load (cached in localStorage)
2. **Search as user types** (debounced 300ms)
3. **Display results** with muscle group, equipment, difficulty
4. **Support keyboard navigation** (↑↓ arrows, Enter, Esc)
5. **Show custom exercises** alongside global exercises
6. **Fallback to "Add Custom"** if no match found

### Component Structure

```javascript
class ExerciseAutocomplete {
  constructor(inputElement, options) {
    this.input = inputElement;
    this.options = options;
    this.exercises = [];
    this.customExercises = [];
  }
  
  async loadExercises() {
    // Load from cache or API
    // Combine global + custom exercises
  }
  
  search(query) {
    // Filter exercises by query
    // Return top 20 matches
  }
  
  render(results) {
    // Show dropdown with results
    // Include muscle group, equipment badges
  }
  
  selectExercise(exercise) {
    // Fill input with exercise name
    // Store exercise reference
    // Close dropdown
  }
}
```

### Integration Points

1. **Workout Creation Form** - Replace exercise name inputs
2. **Exercise Group Builder** - Each exercise gets autocomplete
3. **Bonus Exercise Form** - Autocomplete for bonus exercises

## Search Strategy

### Client-Side Search (Primary)

- Load all exercise names into memory (~1-2MB)
- Use fuzzy matching for instant results
- Cache in localStorage for offline access
- Refresh cache every 7 days

### Firestore Queries (Fallback)

- Use `nameSearchTokens` array for prefix matching
- Query: `where('nameSearchTokens', 'array-contains', searchTerm)`
- Limit results to 20 for performance

### Search Token Generation

```python
def generate_search_tokens(name: str) -> List[str]:
    # Split by spaces and separators
    tokens = name.lower().replace('-', ' ').replace('/', ' ').split()
    
    # Remove stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'with', 'to', 'for'}
    tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
    
    return tokens
```

Example:
- "Barbell Bench Press" → `["barbell", "bench", "press"]`
- "Dumbbell Incline Fly" → `["dumbbell", "incline", "fly"]`

## Firestore Indexes Required

### Single Field Indexes

```
Collection: global_exercises
- nameSearchTokens (Array)
- targetMuscleGroup (Ascending)
- difficultyLevel (Ascending)
- primaryEquipment (Ascending)
- bodyRegion (Ascending)
```

### Composite Indexes

```
Collection: global_exercises
- nameSearchTokens (Array) + targetMuscleGroup (Ascending)
- nameSearchTokens (Array) + primaryEquipment (Ascending)
- targetMuscleGroup (Ascending) + difficultyLevel (Ascending)
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global exercises - read-only for all users
    match /global_exercises/{exerciseId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User custom exercises - private to user
    match /users/{userId}/custom_exercises/{exerciseId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading** - Load names first, details on demand
2. **Debouncing** - Wait 300ms after typing stops
3. **Result Limiting** - Max 20 results in dropdown
4. **Caching** - Cache all exercise names in memory
5. **Indexing** - Proper Firestore composite indexes

### Expected Performance

- **Initial Load**: ~500ms (first time)
- **Cached Load**: ~50ms (subsequent)
- **Search Query**: ~100ms (client-side)
- **Firestore Query**: ~200-500ms (fallback)

## Testing

### Unit Tests

```python
# Test CSV parsing
def test_csv_parsing():
    importer = ExerciseImporter('test.csv')
    exercises = importer.parse_csv()
    assert len(exercises) > 0
    assert exercises[0]['name'] is not None

# Test search token generation
def test_search_tokens():
    tokens = generate_search_tokens("Barbell Bench Press")
    assert "barbell" in tokens
    assert "bench" in tokens
    assert "press" in tokens
```

### Integration Tests

```python
# Test API endpoints
async def test_search_endpoint():
    response = await client.get("/api/v3/exercises/search?q=bench")
    assert response.status_code == 200
    data = response.json()
    assert len(data['exercises']) > 0
```

### E2E Tests

```javascript
// Test autocomplete workflow
test('Exercise autocomplete selects exercise', async () => {
  const input = document.querySelector('#exercise-input');
  const autocomplete = new ExerciseAutocomplete(input);
  
  await autocomplete.loadExercises();
  input.value = 'bench';
  input.dispatchEvent(new Event('input'));
  
  await waitFor(() => {
    expect(document.querySelector('.autocomplete-dropdown')).toBeVisible();
  });
  
  const firstResult = document.querySelector('.autocomplete-item');
  firstResult.click();
  
  expect(input.value).toContain('Bench Press');
});
```

## Troubleshooting

### Import Issues

**Problem**: CSV parsing fails
```bash
# Check CSV encoding
file -I Exercises.csv

# Convert if needed
iconv -f ISO-8859-1 -t UTF-8 Exercises.csv > Exercises_utf8.csv
```

**Problem**: Firestore permission denied
```bash
# Check Firebase credentials
echo $GOOGLE_APPLICATION_CREDENTIALS

# Verify service account has Firestore permissions
```

### Search Issues

**Problem**: No search results
- Check Firestore indexes are created
- Verify search tokens are generated correctly
- Check query syntax in Firestore console

**Problem**: Slow search performance
- Ensure client-side caching is working
- Check network tab for repeated API calls
- Verify debouncing is implemented

## Future Enhancements

### Phase 2 Features

1. **Exercise Details Modal** - Show full exercise information
2. **Video Integration** - Link to demonstration videos
3. **Favorites System** - Save frequently used exercises
4. **Recent Exercises** - Show recently used exercises first
5. **Advanced Filters** - Filter by multiple criteria simultaneously

### Phase 3 Features

1. **Algolia Integration** - Full-text search with typo tolerance
2. **Exercise Images** - Add exercise demonstration images
3. **Exercise Variations** - Link related exercises
4. **User Ratings** - Allow users to rate exercises
5. **Exercise History** - Track which exercises user has done

## Maintenance

### Updating Exercise Database

```bash
# Export current data
curl http://localhost:8000/api/v3/exercises?page_size=1000 > exercises_backup.json

# Import updated CSV
python -m backend.scripts.import_exercises Exercises_updated.csv

# Verify changes
curl http://localhost:8000/api/v3/exercises/search?q=new_exercise
```

### Monitoring

- Track search query performance
- Monitor Firestore read/write operations
- Log failed searches for database improvements
- Track most searched exercises

## Support

For issues or questions:
1. Check this documentation
2. Review Firestore console for data
3. Check API logs for errors
4. Test with dry-run mode first

---

**Last Updated**: 2025-01-17
**Version**: 0.5.0
**Status**: Backend Complete, Frontend Pending