# Testing Weight Logging - Step by Step

## ✅ You've Completed
- Firebase CLI installed and logged in
- Security rules configured
- Indexes created

## 🧪 Let's Test!

### Step 1: Verify Indexes Are Ready

```bash
# Check index status
firebase firestore:indexes

# You should see 4 indexes with status "READY" or "ENABLED"
```

**Expected output:**
```
┌─────────────────┬──────────────────────────────────┬────────┐
│ Collection      │ Fields                           │ Status │
├─────────────────┼──────────────────────────────────┼────────┤
│ workout_sessions│ workout_id ASC, started_at DESC  │ READY  │
│ workout_sessions│ status ASC, started_at DESC      │ READY  │
│ exercise_history│ workout_id ASC, last_session_... │ READY  │
│ workout_sessions│ workout_id ASC, status ASC, ...  │ READY  │
└─────────────────┴──────────────────────────────────┴────────┘
```

If any show "CREATING", wait a few minutes and check again.

---

### Step 2: Get Your User ID and Workout ID

**Get User ID:**

Option A - From your app (browser console):
```javascript
firebase.auth().currentUser.uid
```

Option B - From Firebase Console:
1. Go to Firebase Console → Authentication → Users
2. Copy any User UID

**Get Workout ID:**

Option A - From Firebase Console:
1. Go to Firestore Database → Data
2. Navigate to: `users/{your_user_id}/workouts`
3. Copy any workout document ID (e.g., `workout-06fad623`)

Option B - From your app (browser console):
```javascript
firebase.firestore()
  .collection('users')
  .doc(firebase.auth().currentUser.uid)
  .collection('workouts')
  .limit(1)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => console.log('Workout ID:', doc.id));
  });
```

---

### Step 3: Start Your Backend

```bash
# Make sure you're in the project root
python run.py

# You should see:
# ✅ All routers included successfully (12 routers total)
# INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!**

---

### Step 4: Run Python Test Script

Open a **new terminal** and run:

```bash
# Replace with your actual values
python backend/scripts/setup_weight_logging.py YOUR_USER_ID YOUR_WORKOUT_ID "Push Day"
```

**Example:**
```bash
python backend/scripts/setup_weight_logging.py abc123xyz workout-06fad623 "Push Day"
```

---

### Step 5: Expected Test Results

**✅ Success looks like:**

```
============================================================
🚀 Weight Logging Setup & Verification
============================================================

🔍 Checking Firestore connection...
✅ Firestore connection successful!

🔍 Verifying collections for user: abc123xyz
✅ workout_sessions collection accessible (found 0 sessions)
✅ exercise_history collection accessible

🏋️ Creating test workout session...
   User ID: abc123xyz
   Workout ID: workout-06fad623
   Workout Name: Push Day
✅ Session created: session-20251107-082230-abc123
   Status: in_progress
   Started at: 2025-11-07 08:22:30

✅ Completing test session: session-20251107-082230-abc123
✅ Session completed!
   Duration: 0 minutes
   Exercises: 1

🔍 Verifying exercise history...
✅ Exercise history created!
   Barbell Bench Press:
      Last weight: 185.0 lbs
      Total sessions: 1
      Best weight: 185.0

============================================================
✅ All tests passed!
============================================================

📝 Next steps:
   1. Check Firebase Console → Firestore → Data
   2. Navigate to users/{user_id}/workout_sessions
   3. You should see your test session
   4. Navigate to users/{user_id}/exercise_history
   5. You should see exercise history

🎉 Weight logging is working correctly!
```

---

### Step 6: Verify in Firebase Console

1. Go to Firebase Console → Firestore Database → Data
2. Navigate to: `users/{your_user_id}/workout_sessions`
3. You should see a document like: `session-20251107-082230-abc123`
4. Click on it to see the data:
   - `workout_id`: your workout ID
   - `workout_name`: "Push Day"
   - `status`: "completed"
   - `exercises_performed`: array with 1 exercise
   - `duration_minutes`: 0

5. Navigate to: `users/{your_user_id}/exercise_history`
6. You should see a document like: `workout-06fad623_Barbell Bench Press`
7. Click on it to see:
   - `last_weight`: 185
   - `last_weight_unit`: "lbs"
   - `total_sessions`: 1
   - `best_weight`: 185

---

## 🐛 Troubleshooting

### Error: "Firestore is not available"

**Cause:** Backend can't connect to Firebase

**Solution:**
1. Check your `.env` file has Firebase credentials
2. Make sure you have `GOOGLE_APPLICATION_CREDENTIALS` or Firebase config
3. Restart your backend server

---

### Error: "Missing or insufficient permissions"

**Cause:** Security rules not deployed or incorrect

**Solution:**
```bash
# Re-deploy rules
firebase deploy --only firestore:rules

# Wait 1-2 minutes, then try again
```

---

### Error: "The query requires an index"

**Cause:** Indexes not ready yet

**Solution:**
```bash
# Check index status
firebase firestore:indexes

# If showing "CREATING", wait a few more minutes
# If showing "ERROR", re-deploy:
firebase deploy --only firestore:indexes
```

---

### Error: "Workout not found"

**Cause:** Invalid workout ID

**Solution:**
1. Go to Firebase Console → Firestore
2. Navigate to `users/{your_user_id}/workouts`
3. Make sure you have at least one workout
4. Copy the exact document ID

---

### Error: "User not found"

**Cause:** Invalid user ID

**Solution:**
1. Make sure you're using the correct user ID
2. Check Firebase Console → Authentication → Users
3. The user must exist in Authentication

---

## 🎯 Quick Test Commands

### Test 1: Check Backend is Running
```bash
curl http://localhost:8000/api/health
# Should return: {"status":"healthy","message":"Gym Log API is running"}
```

### Test 2: Check Firestore Rules
```bash
firebase firestore:rules
# Should show your rules including workout_sessions and exercise_history
```

### Test 3: Check Indexes
```bash
firebase firestore:indexes
# Should show 4 indexes with READY status
```

---

## ✅ Success Checklist

After running the Python script successfully:

- [ ] Backend server is running (port 8000)
- [ ] Python script completed without errors
- [ ] Can see test session in Firebase Console
- [ ] Can see exercise history in Firebase Console
- [ ] All 4 indexes show "READY" status
- [ ] Security rules are deployed

---

## 🚀 Next Steps After Success

1. **Test API Endpoints** (optional but recommended)
   - See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md:1) for curl commands
   - Test create, update, complete, list sessions

2. **Deploy to Production**
   ```bash
   git add .
   git commit -m "feat: Add weight logging backend"
   git push origin main
   ```

3. **Start Frontend Integration**
   - Update workout-mode.js to call new APIs
   - Add weight input UI
   - Implement auto-save

---

## 📞 Need Help?

**If Python script fails:**
1. Check the error message carefully
2. Look for the specific error in troubleshooting section above
3. Verify all prerequisites are met (backend running, rules deployed, indexes ready)

**If you see partial success:**
- Session created but history not created → Check indexes
- Connection works but can't create session → Check security rules
- Everything works but can't see in console → Refresh Firebase Console

---

**Ready to test?** Run the commands above and let me know what you see! 🚀