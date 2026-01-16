# Firestore Console Setup - Visual Guide
**Step-by-step guide with screenshots descriptions**

## 🎯 Goal

Add security rules and indexes for weight logging feature to your existing Firestore database.

---

## Part 1: Update Security Rules (5 minutes)

### Step 1: Open Firebase Console

1. Go to https://console.firebase.google.com/
2. Click on your **Ghost Gym** project
3. In the left sidebar, click **Firestore Database**

### Step 2: Navigate to Rules Tab

1. You'll see tabs at the top: **Data**, **Rules**, **Indexes**, **Usage**
2. Click the **Rules** tab

### Step 3: Add New Rules

You'll see your existing rules. **Don't delete them!** Just add these new rules at the end, before the final closing braces:

```javascript
    // ADD THESE LINES BEFORE THE FINAL }}
    
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

**Your rules should look like this:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Your existing rules for workouts, programs, etc.
    match /users/{userId}/workouts/{workoutId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // ... other existing rules ...
    
    // NEW: Workout Sessions
    match /users/{userId}/workout_sessions/{sessionId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
    
    // NEW: Exercise History
    match /users/{userId}/exercise_history/{historyId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
    
  }
}
```

### Step 4: Publish Rules

1. Click the blue **Publish** button at the top right
2. Wait for "Rules published successfully" message
3. ✅ Done!

---

## Part 2: Create Indexes (10 minutes)

### Why Indexes?

Indexes make queries fast. Without them, your API calls will fail with "requires an index" errors.

### Step 1: Navigate to Indexes Tab

1. Still in **Firestore Database**
2. Click the **Indexes** tab (next to Rules)
3. You'll see two sections:
   - **Composite** (this is what we need)
   - **Single field** (ignore this)

### Step 2: Create Index 1 - Sessions by Workout

1. Click **Create Index** button
2. Fill in the form:

```
Collection ID: workout_sessions
```

3. Click **Add field** twice to add 2 fields:

**Field 1:**
```
Field path: workout_id
Query scope: Collection
Order: Ascending
```

**Field 2:**
```
Field path: started_at
Query scope: Collection  
Order: Descending
```

4. Click **Create**
5. Status will show "Building..." (wait 1-5 minutes)

### Step 3: Create Index 2 - Sessions by Status

1. Click **Create Index** again
2. Fill in:

```
Collection ID: workout_sessions
```

**Field 1:**
```
Field path: status
Order: Ascending
```

**Field 2:**
```
Field path: started_at
Order: Descending
```

3. Click **Create**

### Step 4: Create Index 3 - Exercise History

1. Click **Create Index** again
2. Fill in:

```
Collection ID: exercise_history
```

**Field 1:**
```
Field path: workout_id
Order: Ascending
```

**Field 2:**
```
Field path: last_session_date
Order: Descending
```

3. Click **Create**

### Step 5: Create Index 4 - Sessions by Workout + Status

1. Click **Create Index** again
2. Fill in:

```
Collection ID: workout_sessions
```

**Field 1:**
```
Field path: workout_id
Order: Ascending
```

**Field 2:**
```
Field path: status
Order: Ascending
```

**Field 3:**
```
Field path: started_at
Order: Descending
```

3. Click **Create**

### Step 6: Wait for Indexes to Build

1. All 4 indexes will show "Building..." status
2. This takes 1-5 minutes (sometimes up to 30 minutes for large databases)
3. When ready, status changes to "Enabled" with a green checkmark ✅
4. You can use the API once all indexes show "Enabled"

---

## Part 3: Verify Setup

### Check Rules

1. Go to **Rules** tab
2. You should see your new rules for `workout_sessions` and `exercise_history`
3. Status should show "Published" with timestamp

### Check Indexes

1. Go to **Indexes** tab
2. You should see 4 new indexes:
   - `workout_sessions` (workout_id, started_at)
   - `workout_sessions` (status, started_at)
   - `exercise_history` (workout_id, last_session_date)
   - `workout_sessions` (workout_id, status, started_at)
3. All should show "Enabled" status

---

## 🎉 You're Done!

Your Firestore is now configured for weight logging. You can:

1. ✅ Start your backend server
2. ✅ Test the API endpoints (see DEPLOYMENT_GUIDE.md)
3. ✅ Deploy to production

---

## 🐛 Troubleshooting

### "Rules not working"
- Make sure you clicked **Publish** button
- Check that rules are inside the correct `match /databases/{database}/documents` block
- Refresh your browser

### "Index still building after 30 minutes"
- Check Firebase Status page: https://status.firebase.google.com/
- If no issues, contact Firebase support
- You can still test with small amounts of data

### "Can't find Create Index button"
- Make sure you're in the **Indexes** tab
- Look for the blue button at the top right
- You might need to scroll up

### "Index creation failed"
- Check that collection ID is exactly: `workout_sessions` or `exercise_history`
- Check field names are exactly: `workout_id`, `started_at`, `status`, `last_session_date`
- Field names are case-sensitive!

---

## 📸 Visual Reference

### Rules Tab Should Look Like:
```
┌─────────────────────────────────────────┐
│ Firestore Database                      │
├─────────────────────────────────────────┤
│ [Data] [Rules] [Indexes] [Usage]        │
│                                          │
│ rules_version = '2';                    │
│ service cloud.firestore {               │
│   match /databases/{database}/documents {│
│     // Your existing rules...           │
│     match /users/{userId}/workout_...   │
│                                          │
│     // NEW RULES HERE                   │
│     match /users/{userId}/workout_se... │
│     match /users/{userId}/exercise_h... │
│   }                                      │
│ }                                        │
│                                          │
│ [Publish] button ← Click this!          │
└─────────────────────────────────────────┘
```

### Indexes Tab Should Look Like:
```
┌─────────────────────────────────────────┐
│ Firestore Database                      │
├─────────────────────────────────────────┤
│ [Data] [Rules] [Indexes] [Usage]        │
│                                          │
│ Composite Indexes                        │
│ [Create Index] button ← Click 4 times   │
│                                          │
│ Collection ID    Fields           Status│
│ workout_sessions workout_id↑      ✅     │
│                  started_at↓             │
│                                          │
│ workout_sessions status↑          ✅     │
│                  started_at↓             │
│                                          │
│ exercise_history workout_id↑      ✅     │
│                  last_session_date↓      │
│                                          │
│ workout_sessions workout_id↑      ✅     │
│                  status↑                 │
│                  started_at↓             │
└─────────────────────────────────────────┘
```

---

## ⏱️ Time Estimate

- **Rules:** 2 minutes
- **Indexes:** 5 minutes to create + 1-5 minutes to build
- **Total:** ~10 minutes

---

## ✅ Success Checklist

- [ ] Opened Firebase Console
- [ ] Found Firestore Database section
- [ ] Added 2 new security rules
- [ ] Clicked Publish button
- [ ] Created 4 composite indexes
- [ ] All indexes show "Enabled" status
- [ ] Ready to test API!

---

**Next:** Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md:1) to test your API endpoints!