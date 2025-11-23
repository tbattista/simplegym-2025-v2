# Weight Logging Deployment Guide
**Quick guide to test and deploy the weight logging feature**

## 🚀 Quick Start

### Step 1: Test Backend Locally

```bash
# Start your backend server
python run.py

# Server should start on http://localhost:8000
# You should see: "✅ All routers included successfully (12 routers total)"
```

### Step 2: Verify API is Running

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Expected response:
# {"status":"healthy","message":"Gym Log API is running"}
```

---

## 🔥 Firestore Setup (3 Options)

### Option 1: Firebase Console (Easiest - Recommended)

#### A. Update Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. **Add these rules** to your existing rules (don't replace everything):

```javascript
// Add inside your existing rules, after your current workout/program rules:

// Workout Sessions - User can only access their own sessions
match /users/{userId}/workout_sessions/{sessionId} {
  allow read, write: if request.auth != null 
                     && request.auth.uid == userId;
}

// Exercise History - User can only access their own history
match /users/{userId}/exercise_history/{historyId} {
  allow read, write: if request.auth != null 
                     && request.auth.uid == userId;
}
```

5. Click **Publish**

#### B. Create Indexes

1. Still in Firebase Console
2. Go to **Firestore Database** → **Indexes** tab
3. Click **Create Index** (do this 4 times for each index below)

**Index 1:**
- Collection ID: `workout_sessions`
- Fields to index:
  - `workout_id` - Ascending
  - `started_at` - Descending
- Query scope: Collection
- Click **Create**

**Index 2:**
- Collection ID: `workout_sessions`
- Fields to index:
  - `status` - Ascending
  - `started_at` - Descending
- Query scope: Collection
- Click **Create**

**Index 3:**
- Collection ID: `exercise_history`
- Fields to index:
  - `workout_id` - Ascending
  - `last_session_date` - Descending
- Query scope: Collection
- Click **Create**

**Index 4:**
- Collection ID: `workout_sessions`
- Fields to index:
  - `workout_id` - Ascending
  - `status` - Ascending
  - `started_at` - Descending
- Query scope: Collection
- Click **Create**

**Note:** Indexes take 1-5 minutes to build. You'll see "Building" status, then "Enabled" when ready.

---

### Option 2: Firebase CLI (If you have it installed)

```bash
# Check if Firebase CLI is installed
firebase --version

# If not installed:
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes (you'll need to create firestore.indexes.json first)
firebase deploy --only firestore:indexes
```

---

### Option 3: Let Firebase Auto-Create Indexes

When you make your first API call that needs an index, Firebase will give you an error with a **direct link** to create the index. Just click the link!

Example error:
```
The query requires an index. You can create it here: 
https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes?create_composite=...
```

---

## 🧪 Testing the API

### Prerequisites

You need:
1. ✅ Backend running (localhost:8000 or production URL)
2. ✅ A valid Firebase auth token
3. ✅ A workout ID from your database

### Get Your Auth Token

**Option A: From Browser Console**
```javascript
// Open your app in browser, open console (F12), run:
firebase.auth().currentUser.getIdToken().then(token => console.log(token));
// Copy the token that appears
```

**Option B: From Your App**
```javascript
// If you're logged in, check localStorage or sessionStorage
localStorage.getItem('firebaseAuthToken')
```

### Test 1: Create a Workout Session

```bash
# Replace YOUR_TOKEN and YOUR_WORKOUT_ID
curl -X POST http://localhost:8000/api/v3/workout-sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workout_id": "YOUR_WORKOUT_ID",
    "workout_name": "Push Day"
  }'
```

**Expected Response:**
```json
{
  "id": "session-20251106-143022-abc123",
  "workout_id": "YOUR_WORKOUT_ID",
  "workout_name": "Push Day",
  "started_at": "2025-11-06T14:30:22Z",
  "status": "in_progress",
  "exercises_performed": [],
  "created_at": "2025-11-06T14:30:22Z"
}
```

**Save the session ID** for next tests!

---

### Test 2: Get Exercise History (Should be empty first time)

```bash
curl http://localhost:8000/api/v3/workout-sessions/history/workout/YOUR_WORKOUT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "workout_id": "YOUR_WORKOUT_ID",
  "workout_name": "Push Day",
  "exercises": {}
}
```

---

### Test 3: Update Session (Auto-save)

```bash
curl -X PUT http://localhost:8000/api/v3/workout-sessions/YOUR_SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercises_performed": [{
      "exercise_name": "Barbell Bench Press",
      "group_id": "group-1",
      "weight": 185,
      "weight_unit": "lbs",
      "sets_completed": 2,
      "target_sets": "4",
      "target_reps": "8-10",
      "order_index": 0,
      "is_bonus": false
    }]
  }'
```

---

### Test 4: Complete Session

```bash
curl -X POST http://localhost:8000/api/v3/workout-sessions/YOUR_SESSION_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercises_performed": [{
      "exercise_name": "Barbell Bench Press",
      "group_id": "group-1",
      "weight": 185,
      "weight_unit": "lbs",
      "sets_completed": 4,
      "target_sets": "4",
      "target_reps": "8-10",
      "previous_weight": null,
      "weight_change": null,
      "order_index": 0,
      "is_bonus": false
    }],
    "notes": "Great first session!"
  }'
```

**Expected Response:**
```json
{
  "id": "YOUR_SESSION_ID",
  "status": "completed",
  "completed_at": "2025-11-06T15:00:00Z",
  "duration_minutes": 30,
  ...
}
```

---

### Test 5: Get Exercise History (Now populated!)

```bash
curl http://localhost:8000/api/v3/workout-sessions/history/workout/YOUR_WORKOUT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "workout_id": "YOUR_WORKOUT_ID",
  "workout_name": "Push Day",
  "exercises": {
    "Barbell Bench Press": {
      "id": "YOUR_WORKOUT_ID_Barbell Bench Press",
      "last_weight": 185,
      "last_weight_unit": "lbs",
      "total_sessions": 1,
      "best_weight": 185,
      "recent_sessions": [...]
    }
  }
}
```

---

### Test 6: List Sessions

```bash
curl "http://localhost:8000/api/v3/workout-sessions?workout_id=YOUR_WORKOUT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Verification Checklist

After testing, verify in Firebase Console:

1. **Firestore Database** → **Data** tab
2. Navigate to: `users/{your_user_id}/workout_sessions`
3. You should see your session document
4. Navigate to: `users/{your_user_id}/exercise_history`
5. You should see exercise history documents

---

## 🚀 Deploy to Production

### If using Railway/Heroku/similar:

```bash
# Commit your changes
git add .
git commit -m "feat: Add weight logging backend"

# Push to production
git push origin main

# Railway/Heroku will auto-deploy
```

### If using manual deployment:

```bash
# SSH into your server
ssh user@your-server.com

# Pull latest code
cd /path/to/your/app
git pull origin main

# Install dependencies
pip install -r requirements.txt

# Restart your service
sudo systemctl restart your-app-service
```

---

## 🐛 Troubleshooting

### "Authentication required" error
- Make sure you're passing a valid Firebase auth token
- Token format: `Authorization: Bearer YOUR_TOKEN`
- Token expires after 1 hour - get a fresh one

### "The query requires an index" error
- Click the link in the error message to create the index
- Or create indexes manually in Firebase Console (see above)
- Wait 1-5 minutes for index to build

### "Workout session not found" error
- Make sure you're using the correct session ID
- Check that the session belongs to the authenticated user

### "Firestore not available" error
- Check your Firebase credentials in `.env` file
- Verify Firebase Admin SDK is initialized
- Check backend logs for Firebase connection errors

---

## 📊 Monitor After Deployment

### Check Firestore Usage

1. Firebase Console → **Firestore Database** → **Usage** tab
2. Monitor:
   - Read operations
   - Write operations
   - Storage size

### Check Backend Logs

```bash
# If using Railway
railway logs

# If using Heroku
heroku logs --tail

# If using systemd
sudo journalctl -u your-app-service -f
```

---

## 🎉 Success Criteria

You've successfully deployed when:

✅ Backend starts without errors (12 routers loaded)
✅ Can create a workout session via API
✅ Can complete a session and see exercise history
✅ Firestore rules are active (users can't access other users' data)
✅ Indexes are built and enabled
✅ No errors in production logs

---

## 📞 Need Help?

Common issues and solutions:

1. **Can't get auth token**: Log into your app, open browser console, run the JavaScript command above
2. **Don't have a workout ID**: Check Firestore console under `users/{your_id}/workouts`
3. **Indexes taking too long**: They can take up to 30 minutes for large datasets
4. **Rules not working**: Make sure you clicked "Publish" in Firebase Console

---

**Next Step:** Once testing is successful, you can start integrating the frontend! 🎨