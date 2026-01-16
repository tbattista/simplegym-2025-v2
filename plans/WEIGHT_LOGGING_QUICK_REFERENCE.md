# Weight Logging Quick Reference
**Quick guide for implementing weight logging in Ghost Gym**

## 🎯 Core Concept

**Firebase-Only Premium Feature** for authenticated users to:
- Track weights used in workouts
- Auto-populate last used weights
- View progress over time
- Maintain separate history per exercise

## 📊 Data Model Overview

```
WorkoutSession (users/{userId}/workout_sessions/{sessionId})
├── id: "session-20251106-143022-abc123"
├── workout_id: "workout-06fad623"
├── workout_name: "Push Day"
├── started_at: timestamp
├── completed_at: timestamp
├── status: "in_progress" | "completed" | "abandoned"
└── exercises_performed: [
    ├── ExercisePerformance {
    │   ├── exercise_name: "Barbell Bench Press"
    │   ├── weight: 190
    │   ├── weight_unit: "lbs"
    │   ├── sets_completed: 4
    │   ├── previous_weight: 185
    │   └── weight_change: +5
    │   }
    ]

ExerciseHistory (users/{userId}/exercise_history/{workout_id}_{exercise_name})
├── id: "workout-06fad623_Barbell Bench Press"
├── workout_id: "workout-06fad623"
├── exercise_name: "Barbell Bench Press"
├── last_weight: 190
├── last_session_date: timestamp
├── total_sessions: 13
├── best_weight: 205
└── recent_sessions: [last 5 sessions]
```

## 🔄 User Flow

```
1. User clicks "Start Workout" on Push Day
   ↓
2. Backend fetches workout template + exercise history
   ↓
3. Frontend displays workout with last weights pre-filled
   ↓
4. User performs exercises (weights already shown)
   ↓
5. User edits weight if needed → Auto-save to session
   ↓
6. User clicks "Done" → Finalize session + Update history
   ↓
7. Show completion summary
```

## 🛠️ Implementation Steps

### Step 1: Add Models (backend/models.py)
```python
# Add 4 new model classes:
- SetDetail
- ExercisePerformance  
- WorkoutSession
- ExerciseHistory

# Add 5 request/response models:
- CreateSessionRequest
- UpdateSessionRequest
- CompleteSessionRequest
- SessionListResponse
- ExerciseHistoryResponse
```

### Step 2: Extend Firestore Service (backend/services/firestore_data_service.py)
```python
# Add 6 session methods:
- create_workout_session()
- get_workout_session()
- update_workout_session()
- complete_workout_session()
- get_user_sessions()
- delete_workout_session()

# Add 4 history methods:
- get_exercise_history_for_workout()
- get_exercise_history()
- update_exercise_history()
- _update_exercise_histories_batch()
```

### Step 3: Create API Router (backend/api/workout_sessions.py)
```python
# Create 6 session endpoints:
POST   /api/v3/workout-sessions              # Start session
GET    /api/v3/workout-sessions/{id}         # Get session
PUT    /api/v3/workout-sessions/{id}         # Auto-save
POST   /api/v3/workout-sessions/{id}/complete # Finalize
GET    /api/v3/workout-sessions              # List sessions
DELETE /api/v3/workout-sessions/{id}         # Delete

# Create 2 history endpoints:
GET /api/v3/workout-sessions/history/workout/{workout_id}
GET /api/v3/workout-sessions/history/{workout_id}/{exercise_name}
```

### Step 4: Register Router (backend/main.py)
```python
from .api import workout_sessions

app.include_router(workout_sessions.router)
```

### Step 5: Security & Indexes
```javascript
// Firestore Rules
match /users/{userId}/workout_sessions/{sessionId} {
  allow read, write: if request.auth.uid == userId;
}

// Indexes (3 required)
1. workout_sessions: workout_id + completed_at
2. workout_sessions: status + started_at  
3. exercise_history: workout_id + last_session_date
```

## 📝 API Examples

### Start Workout
```bash
curl -X POST https://api.ghostgym.com/api/v3/workout-sessions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "workout_id": "workout-06fad623",
    "workout_name": "Push Day"
  }'
```

### Get Last Weights
```bash
curl https://api.ghostgym.com/api/v3/workout-sessions/history/workout/workout-06fad623 \
  -H "Authorization: Bearer {token}"
```

### Auto-Save Progress
```bash
curl -X PUT https://api.ghostgym.com/api/v3/workout-sessions/session-123 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exercises_performed": [{
      "exercise_name": "Barbell Bench Press",
      "weight": 190,
      "sets_completed": 2
    }]
  }'
```

### Complete Workout
```bash
curl -X POST https://api.ghostgym.com/api/v3/workout-sessions/session-123/complete \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exercises_performed": [{
      "exercise_name": "Barbell Bench Press",
      "weight": 190,
      "sets_completed": 4,
      "previous_weight": 185,
      "weight_change": 5
    }],
    "notes": "Great session!"
  }'
```

## 🎨 Frontend Integration (Future)

### Workout Mode Changes Needed:
1. **On Load**: Fetch exercise history and pre-fill weights
2. **During Workout**: Add weight input fields with edit button
3. **On Edit**: Call auto-save endpoint
4. **On Complete**: Call complete endpoint with all data

### UI Components:
```javascript
// Weight display/edit component
<div class="exercise-weight">
  <span class="weight-display">185 lbs</span>
  <button class="btn-edit-weight">Edit</button>
</div>

// Edit modal
<input type="number" value="185" step="5" />
<select>
  <option>lbs</option>
  <option>kg</option>
</select>
```

## 🔑 Key Design Decisions

1. **Firebase Only**: Premium feature, requires authentication
2. **Auto-save**: Save on every edit + final completion
3. **Simple UX**: No prompts, just edit button
4. **Composite Key**: `{workout_id}_{exercise_name}` for history
5. **Denormalization**: Store workout_name in sessions for quick display
6. **Recent Sessions**: Keep last 5 in exercise history for trends

## 📈 Performance Considerations

- **Reads per workout start**: ~8 (1 template + 7 exercise histories)
- **Writes per workout**: ~8 (1 session + 7 history updates)
- **Monthly cost** (100 users, 12 workouts/month): ~$0.50

## ✅ Testing Checklist

- [ ] Create session returns valid session ID
- [ ] Get history returns last weights correctly
- [ ] Update session saves progress
- [ ] Complete session updates all exercise histories
- [ ] Exercise substitution maintains separate histories
- [ ] List sessions filters by workout_id
- [ ] Delete session removes from Firestore

## 🚀 Deployment Steps

1. Deploy Pydantic models
2. Deploy Firestore service methods
3. Deploy API endpoints
4. Update Firestore security rules
5. Create Firestore indexes
6. Test with Postman/curl
7. Document for frontend team

---

**Status**: Ready for implementation  
**Next**: Add Pydantic models to backend/models.py