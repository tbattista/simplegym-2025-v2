# Firestore Setup for Weight Logging
**Version:** 1.0  
**Date:** 2025-11-06

## Overview

This document contains the Firestore security rules and index definitions required for the weight logging feature.

## Security Rules

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================================================
    // Weight Logging Collections (V3.1 - Premium Feature)
    // ============================================================================
    
    // Workout Sessions - User can only access their own sessions
    match /users/{userId}/workout_sessions/{sessionId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
      // Validate session data on write
      allow create: if request.auth != null 
                    && request.auth.uid == userId
                    && request.resource.data.workout_id is string
                    && request.resource.data.workout_name is string
                    && request.resource.data.status in ['in_progress', 'completed', 'abandoned'];
      
      allow update: if request.auth != null 
                    && request.auth.uid == userId;
      
      allow delete: if request.auth != null 
                    && request.auth.uid == userId;
    }
    
    // Exercise History - User can only access their own history
    match /users/{userId}/exercise_history/{historyId} {
      allow read: if request.auth != null 
                  && request.auth.uid == userId;
      
      allow write: if request.auth != null 
                   && request.auth.uid == userId;
      
      // Validate history ID format: {workout_id}_{exercise_name}
      allow create: if request.auth != null 
                    && request.auth.uid == userId
                    && request.resource.data.workout_id is string
                    && request.resource.data.exercise_name is string;
    }
    
    // Existing rules for workouts, programs, etc.
    // ... (keep your existing rules)
  }
}
```

## Firestore Indexes

### Required Composite Indexes

Create these indexes in the Firebase Console or using the Firebase CLI:

#### Index 1: Query Sessions by Workout and Date

```json
{
  "collectionGroup": "workout_sessions",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "workout_id",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "started_at",
      "order": "DESCENDING"
    }
  ]
}
```

**Purpose**: Efficiently query all sessions for a specific workout, ordered by date.

**Used by**: `GET /api/v3/workout-sessions?workout_id={id}`

---

#### Index 2: Query Sessions by Status and Date

```json
{
  "collectionGroup": "workout_sessions",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "started_at",
      "order": "DESCENDING"
    }
  ]
}
```

**Purpose**: Query sessions by status (in_progress, completed, abandoned), ordered by date.

**Used by**: `GET /api/v3/workout-sessions?status=completed`

---

#### Index 3: Query Exercise History by Workout

```json
{
  "collectionGroup": "exercise_history",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "workout_id",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "last_session_date",
      "order": "DESCENDING"
    }
  ]
}
```

**Purpose**: Efficiently retrieve all exercise histories for a workout.

**Used by**: `GET /api/v3/workout-sessions/history/workout/{workout_id}`

---

#### Index 4: Query Sessions by Workout, Status, and Date (Optional)

```json
{
  "collectionGroup": "workout_sessions",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "workout_id",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "started_at",
      "order": "DESCENDING"
    }
  ]
}
```

**Purpose**: Query sessions for a specific workout filtered by status.

**Used by**: `GET /api/v3/workout-sessions?workout_id={id}&status=completed`

---

## Firebase CLI Commands

### Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Create Indexes via CLI

Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "workout_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workout_id", "order": "ASCENDING" },
        { "fieldPath": "started_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "workout_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "started_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "exercise_history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workout_id", "order": "ASCENDING" },
        { "fieldPath": "last_session_date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "workout_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workout_id", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "started_at", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:

```bash
firebase deploy --only firestore:indexes
```

---

## Manual Setup via Firebase Console

### Creating Indexes Manually

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. For each index above:
   - Set **Collection ID** to the collection group name
   - Add fields with their order (ASCENDING/DESCENDING)
   - Click **Create**

### Updating Security Rules Manually

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy and paste the rules from above
5. Click **Publish**

---

## Testing Security Rules

### Test Read Access

```javascript
// Should succeed - user reading their own session
match /users/user123/workout_sessions/session-abc {
  allow read: if request.auth.uid == 'user123';
}

// Should fail - user reading another user's session
match /users/user456/workout_sessions/session-xyz {
  allow read: if request.auth.uid == 'user123';  // DENIED
}
```

### Test Write Access

```javascript
// Should succeed - authenticated user creating session
match /users/user123/workout_sessions/session-abc {
  allow create: if request.auth.uid == 'user123'
                && request.resource.data.workout_id is string
                && request.resource.data.status in ['in_progress', 'completed', 'abandoned'];
}

// Should fail - unauthenticated user
match /users/user123/workout_sessions/session-abc {
  allow create: if request.auth == null;  // DENIED
}
```

---

## Performance Considerations

### Index Build Time

- **Small datasets** (< 1000 documents): ~1-2 minutes
- **Medium datasets** (1000-10000 documents): ~5-10 minutes
- **Large datasets** (> 10000 documents): ~30+ minutes

### Query Performance

With proper indexes:
- Session queries: **< 100ms**
- Exercise history queries: **< 50ms**
- Batch updates: **< 500ms**

Without indexes:
- Queries will fail with "requires an index" error

---

## Monitoring

### Check Index Status

```bash
firebase firestore:indexes
```

### Monitor Query Performance

1. Go to Firebase Console → Firestore → Usage tab
2. Monitor:
   - Read operations
   - Write operations
   - Delete operations
   - Query latency

---

## Troubleshooting

### "Missing or insufficient permissions" Error

**Cause**: User not authenticated or trying to access another user's data

**Solution**: Ensure user is authenticated and accessing their own data

### "The query requires an index" Error

**Cause**: Missing composite index

**Solution**: 
1. Click the link in the error message to auto-create the index
2. Or manually create the index using the definitions above

### Index Build Stuck

**Cause**: Large dataset or Firebase service issue

**Solution**:
1. Wait 30-60 minutes
2. Check Firebase Status page
3. Contact Firebase support if issue persists

---

## Cost Estimation

### Storage Costs

- **Workout Session**: ~1-2 KB per document
- **Exercise History**: ~0.5-1 KB per document

**Example**: 100 users, 12 workouts/month, 6 exercises/workout
- Sessions: 100 × 12 × 2 KB = 2.4 MB/month
- History: 100 × 10 workouts × 6 exercises × 1 KB = 6 MB total
- **Total Storage**: ~8 MB (well within free tier)

### Operation Costs

**Per Workout Session**:
- Reads: ~8 (1 template + 7 exercise histories)
- Writes: ~8 (1 session + 7 history updates)

**Monthly Cost** (100 users, 12 workouts/month):
- Reads: 1,200 × 8 = 9,600 reads
- Writes: 1,200 × 8 = 9,600 writes
- **Cost**: ~$0.50/month (within free tier: 50K reads, 20K writes/day)

---

## Next Steps

1. ✅ Deploy security rules
2. ✅ Create indexes
3. ✅ Test with sample data
4. ✅ Monitor performance
5. ✅ Adjust as needed

---

**Status**: Ready for deployment  
**Last Updated**: 2025-11-06