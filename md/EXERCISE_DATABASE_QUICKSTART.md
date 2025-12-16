# Exercise Database Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly set up and use the exercise database in Ghost Gym V2.

## Prerequisites

- Python 3.8+
- Firebase project configured
- `Exercises.csv` file ready

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs pandas for CSV parsing.

## Step 2: Prepare Your CSV File

Ensure your CSV has these required columns:
- `Exercise` - Exercise name (required)
- `Difficulty Level` - Beginner/Intermediate/Advanced
- `Target Muscle Group` - Primary muscle targeted
- `Primary Equipment` - Main equipment needed

Optional columns (30 total available):
- Secondary/Tertiary Muscles
- Movement Patterns
- Planes of Motion
- Body Region, Force Type, Mechanics, etc.

## Step 3: Test Import (Dry Run)

```bash
# Test without uploading to Firestore
python -m backend.scripts.import_exercises Exercises.csv --dry-run
```

Expected output:
```
============================================================
EXERCISE DATABASE IMPORT
============================================================
Reading CSV file: Exercises.csv
Found 150 exercises in CSV
Successfully parsed 150 exercises
DRY RUN MODE - No data will be uploaded
============================================================
IMPORT SUMMARY
Total exercises: 150
Successfully uploaded: 0
Failed: 0
Skipped: 150
============================================================
```

## Step 4: Import to Firestore

```bash
# Actual import
python -m backend.scripts.import_exercises Exercises.csv
```

Expected output:
```
============================================================
EXERCISE DATABASE IMPORT
============================================================
Reading CSV file: Exercises.csv
Found 150 exercises in CSV
Successfully parsed 150 exercises
Starting upload of 150 exercises...
Processing batch 1/1 (150 exercises)
Batch 1 committed successfully
Upload complete: 150 uploaded, 0 failed
============================================================
IMPORT SUMMARY
Total exercises: 150
Successfully uploaded: 150
Failed: 0
Skipped: 0
============================================================
```

## Step 5: Verify Import

### Option A: Using API

```bash
# Get all exercises
curl http://localhost:8000/api/v3/exercises?page=1&page_size=10

# Search for specific exercise
curl "http://localhost:8000/api/v3/exercises/search?q=bench&limit=5"

# Get filter options
curl http://localhost:8000/api/v3/exercises/filters/targetMuscleGroup
```

### Option B: Using Firestore Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `global_exercises` collection
4. Verify exercises are present

## Step 6: Test API Endpoints

### Search Exercises

```javascript
// Basic search
fetch('http://localhost:8000/api/v3/exercises/search?q=press')
  .then(res => res.json())
  .then(data => {
    console.log(`Found ${data.total_results} exercises`);
    console.log(data.exercises);
  });
```

### Get Exercise Details

```javascript
// Get specific exercise
fetch('http://localhost:8000/api/v3/exercises/exercise-abc123')
  .then(res => res.json())
  .then(exercise => {
    console.log('Exercise:', exercise.name);
    console.log('Muscle Group:', exercise.targetMuscleGroup);
    console.log('Equipment:', exercise.primaryEquipment);
  });
```

### Get Filter Options

```javascript
// Get all muscle groups
fetch('http://localhost:8000/api/v3/exercises/filters/targetMuscleGroup')
  .then(res => res.json())
  .then(data => {
    console.log('Available muscle groups:', data.values);
  });
```

## Common Issues & Solutions

### Issue: "Firebase not initialized"

**Solution**: Check your Firebase credentials
```bash
# Verify environment variable
echo $GOOGLE_APPLICATION_CREDENTIALS

# Or check .env file
cat .env | grep FIREBASE
```

### Issue: "CSV parsing failed"

**Solution**: Check CSV encoding
```bash
# Check file encoding
file -I Exercises.csv

# Convert to UTF-8 if needed
iconv -f ISO-8859-1 -t UTF-8 Exercises.csv > Exercises_utf8.csv
```

### Issue: "Permission denied" in Firestore

**Solution**: Update Firestore security rules
```javascript
// In Firebase Console > Firestore > Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /global_exercises/{exerciseId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Next Steps

### 1. Create Firestore Indexes

Go to Firebase Console > Firestore > Indexes and create:

**Single Field Indexes:**
- `nameSearchTokens` (Array)
- `targetMuscleGroup` (Ascending)
- `primaryEquipment` (Ascending)

**Composite Indexes:**
- `nameSearchTokens` (Array) + `targetMuscleGroup` (Ascending)
- `nameSearchTokens` (Array) + `primaryEquipment` (Ascending)

### 2. Test Search Performance

```bash
# Test search speed
time curl "http://localhost:8000/api/v3/exercises/search?q=bench"
```

Should return in < 500ms

### 3. Implement Frontend Autocomplete

See [`EXERCISE_DATABASE_INTEGRATION.md`](./EXERCISE_DATABASE_INTEGRATION.md) for frontend implementation details.

## Usage Examples

### Example 1: Search by Name

```bash
curl "http://localhost:8000/api/v3/exercises/search?q=squat&limit=10"
```

Response:
```json
{
  "exercises": [
    {
      "id": "exercise-abc123",
      "name": "Barbell Back Squat",
      "targetMuscleGroup": "Quadriceps",
      "primaryEquipment": "Barbell",
      "difficultyLevel": "Intermediate"
    }
  ],
  "query": "squat",
  "total_results": 15
}
```

### Example 2: Search with Filters

```bash
curl "http://localhost:8000/api/v3/exercises/search?q=press&muscle_group=Chest&difficulty=Beginner"
```

### Example 3: Get All Exercises

```bash
curl "http://localhost:8000/api/v3/exercises?page=1&page_size=50"
```

### Example 4: Create Custom Exercise (Authenticated)

```bash
curl -X POST http://localhost:8000/api/v3/users/me/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Custom Exercise",
    "difficultyLevel": "Intermediate",
    "targetMuscleGroup": "Chest",
    "primaryEquipment": "Dumbbells"
  }'
```

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Import 1000 exercises | ~10-15 seconds | Batch size 500 |
| Search query | < 200ms | With indexes |
| Get all exercises | < 500ms | Page size 100 |
| Get single exercise | < 100ms | Direct lookup |

## Monitoring

### Check Import Status

```bash
# Count exercises in Firestore
curl "http://localhost:8000/api/v3/exercises?page_size=1" | jq '.total_count'
```

### Monitor Search Performance

```bash
# Test search speed
for i in {1..10}; do
  time curl -s "http://localhost:8000/api/v3/exercises/search?q=bench" > /dev/null
done
```

### Check API Health

```bash
curl http://localhost:8000/api/health
```

## Backup & Restore

### Backup Exercises

```bash
# Export all exercises
curl "http://localhost:8000/api/v3/exercises?page_size=1000" > exercises_backup.json
```

### Restore from Backup

```bash
# Re-import from CSV
python -m backend.scripts.import_exercises Exercises.csv
```

## Support

For detailed documentation, see:
- [`EXERCISE_DATABASE_INTEGRATION.md`](./EXERCISE_DATABASE_INTEGRATION.md) - Complete integration guide
- [`backend/services/exercise_service.py`](./backend/services/exercise_service.py) - Service implementation
- [`backend/scripts/import_exercises.py`](./backend/scripts/import_exercises.py) - Import script

---

**Quick Links:**
- [API Documentation](#step-6-test-api-endpoints)
- [Troubleshooting](#common-issues--solutions)
- [Performance Benchmarks](#performance-benchmarks)

**Status**: ✅ Backend Complete | ⏳ Frontend Pending