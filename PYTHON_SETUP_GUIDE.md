# Python Setup Guide for Weight Logging
**What you can and cannot do with Python**

## ⚠️ Important: Security Rules & Indexes

**Cannot be done with Python:**
- ❌ Deploying Firestore security rules
- ❌ Creating Firestore indexes

**Why?** These are Firebase infrastructure configurations that require:
- Firebase CLI (`firebase deploy`)
- Firebase Console (manual creation)
- Firebase REST API (complex, not recommended)

**You must use:** Firebase Console (easiest) or Firebase CLI

---

## ✅ What Python CAN Do

The Python script I created ([`backend/scripts/setup_weight_logging.py`](backend/scripts/setup_weight_logging.py:1)) can:

1. ✅ **Verify Firestore connection**
2. ✅ **Test your backend code**
3. ✅ **Create test workout sessions**
4. ✅ **Create test exercise history**
5. ✅ **Verify everything works**

---

## 🚀 Complete Setup Process

### Step 1: Update Firestore (Firebase Console - 10 minutes)

**You MUST do this first via Firebase Console:**

1. **Add Security Rules** (2 minutes)
   - Go to https://console.firebase.google.com/
   - Select your project → Firestore Database → Rules tab
   - Add the 2 new rules (see [FIRESTORE_CONSOLE_SETUP.md](FIRESTORE_CONSOLE_SETUP.md:1))
   - Click Publish

2. **Create Indexes** (5 minutes + build time)
   - Go to Indexes tab
   - Create 4 indexes (see [FIRESTORE_CONSOLE_SETUP.md](FIRESTORE_CONSOLE_SETUP.md:1))
   - Wait for "Enabled" status

**Why this can't be automated:**
- Security rules protect your data - Firebase requires manual deployment
- Indexes are infrastructure - must be created through Firebase tools

---

### Step 2: Test with Python Script (5 minutes)

**After Step 1 is complete**, run the Python test script:

```bash
# Get your user ID and workout ID first (see below)
python backend/scripts/setup_weight_logging.py <user_id> <workout_id> "Push Day"
```

**Example:**
```bash
python backend/scripts/setup_weight_logging.py user123 workout-abc123 "Push Day"
```

**What the script does:**
1. ✅ Checks Firestore connection
2. ✅ Creates a test workout session
3. ✅ Completes the session with sample data
4. ✅ Verifies exercise history was created
5. ✅ Shows you where to find the data in Firebase Console

---

## 📋 Getting Required Information

### Get Your User ID

**Option 1: Browser Console**
```javascript
// Log into your app, open console (F12), run:
firebase.auth().currentUser.uid
// Copy the result
```

**Option 2: Firebase Console**
1. Go to Firebase Console → Authentication
2. Click on Users tab
3. Copy the User UID

### Get a Workout ID

**Option 1: Firebase Console**
1. Go to Firebase Console → Firestore Database
2. Navigate to: `users/{your_user_id}/workouts`
3. Click on any workout document
4. Copy the document ID (e.g., `workout-06fad623`)

**Option 2: Your App**
```javascript
// In browser console while logged in:
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

## 🧪 Running the Python Test Script

### Full Command

```bash
python backend/scripts/setup_weight_logging.py <user_id> <workout_id> <workout_name>
```

### Example Output (Success)

```
============================================================
🚀 Weight Logging Setup & Verification
============================================================

🔍 Checking Firestore connection...
✅ Firestore connection successful!

🔍 Verifying collections for user: user123
✅ workout_sessions collection accessible (found 0 sessions)
✅ exercise_history collection accessible

🏋️ Creating test workout session...
   User ID: user123
   Workout ID: workout-abc123
   Workout Name: Push Day
✅ Session created: session-20251106-143022-abc123
   Status: in_progress
   Started at: 2025-11-06 14:30:22

✅ Completing test session: session-20251106-143022-abc123
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

### Example Output (Failure - Rules Not Set)

```
============================================================
🚀 Weight Logging Setup & Verification
============================================================

🔍 Checking Firestore connection...
✅ Firestore connection successful!

🏋️ Creating test workout session...
❌ Error creating session: Missing or insufficient permissions

❌ Setup verification failed!
   Check the errors above and try again
```

**Solution:** Go back to Step 1 and add the security rules in Firebase Console

---

## 🔧 Alternative: Firebase CLI (For Advanced Users)

If you prefer command-line tools:

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login

```bash
firebase login
```

### Initialize Firebase (if not done)

```bash
firebase init
# Select Firestore
# Choose your project
```

### Create firestore.rules File

Create `firestore.rules` in your project root:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Your existing rules...
    
    // Workout Sessions
    match /users/{userId}/workout_sessions/{sessionId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
    
    // Exercise History
    match /users/{userId}/exercise_history/{historyId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### Create firestore.indexes.json File

Create `firestore.indexes.json` in your project root:

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
  ]
}
```

### Deploy

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Or deploy both
firebase deploy --only firestore
```

---

## 📊 Summary: What to Use When

| Task | Tool | Time |
|------|------|------|
| Add security rules | Firebase Console OR Firebase CLI | 2 min |
| Create indexes | Firebase Console OR Firebase CLI | 5 min |
| Test backend | Python script | 5 min |
| Verify setup | Python script | 1 min |
| Deploy to production | Git push (Railway/Heroku) | 5 min |

---

## 🎯 Recommended Workflow

### For Beginners (Easiest)

1. ✅ **Firebase Console** - Add rules & indexes (10 min)
2. ✅ **Python Script** - Test everything works (5 min)
3. ✅ **Git Push** - Deploy to production (5 min)

### For Advanced Users

1. ✅ **Firebase CLI** - Deploy rules & indexes (5 min)
2. ✅ **Python Script** - Test everything works (5 min)
3. ✅ **Git Push** - Deploy to production (5 min)

---

## 🐛 Troubleshooting

### "Firebase CLI not found"

```bash
# Install Node.js first, then:
npm install -g firebase-tools
```

### "Permission denied" when deploying

```bash
# Re-login to Firebase
firebase login --reauth
```

### "Python script fails with connection error"

- Check your `.env` file has Firebase credentials
- Verify Firebase Admin SDK is initialized
- Check backend logs for errors

### "Rules deployed but still getting permission errors"

- Wait 1-2 minutes for rules to propagate
- Clear browser cache
- Get a fresh auth token

---

## ✅ Final Checklist

- [ ] Security rules added (Firebase Console or CLI)
- [ ] 4 indexes created (Firebase Console or CLI)
- [ ] All indexes show "Enabled" status
- [ ] Python test script runs successfully
- [ ] Can see test data in Firebase Console
- [ ] Backend deployed to production
- [ ] API endpoints working

---

**Next:** Once Python script passes, you're ready to integrate the frontend! 🎨