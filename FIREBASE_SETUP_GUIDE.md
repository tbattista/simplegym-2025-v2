# Firebase Setup Guide - Ghost Gym V2

## Overview

Ghost Gym V2 uses Firebase for both frontend (web SDK) and backend (Admin SDK). This guide will help you configure both.

## Your Firebase Project

**Project ID**: `ghost-gym-v3`
**Project Name**: Ghost Gym V3

## Part 1: Frontend Configuration (Already Done ✅)

Your frontend Firebase config is already set up in [`frontend/dashboard.html`](./frontend/dashboard.html):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDpG6XqRY8jkuxtEy-8avAXK510czrLRNs",
  authDomain: "ghost-gym-v3.firebaseapp.com",
  projectId: "ghost-gym-v3",
  storageBucket: "ghost-gym-v3.firebasestorage.app",
  messagingSenderId: "637224617538",
  appId: "1:637224617538:web:ad149e591714a0b9b50fdb",
  measurementId: "G-QLMR8K2QYC"
};
```

## Part 2: Backend Configuration (Service Account)

The backend needs a **Service Account** to access Firestore. Here's how to get it:

### Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ghost-gym-v3**
3. Click the ⚙️ gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** (downloads a JSON file)

### Step 2: Extract Credentials from JSON

The downloaded JSON file looks like this:

```json
{
  "type": "service_account",
  "project_id": "ghost-gym-v3",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@ghost-gym-v3.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Step 3: Create .env File

Create a `.env` file in your project root:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and fill in these values from your service account JSON:

```env
# Firebase Backend Configuration
FIREBASE_PROJECT_ID=ghost-gym-v3
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour full private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id-from-json
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ghost-gym-v3.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id-from-json

# Optional (use defaults if not specified)
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTO_INIT=true

# Application Settings
ENVIRONMENT=development
PORT=8000
```

### Step 4: Verify Configuration

```bash
# Test Firebase connection
python -c "from backend.config.firebase_config import get_firebase_config_status; import json; print(json.dumps(get_firebase_config_status(), indent=2))"
```

Expected output:
```json
{
  "firebase_admin_installed": true,
  "app_initialized": true,
  "project_id_configured": true,
  "private_key_configured": true,
  "client_email_configured": true,
  "environment": "development"
}
```

## Part 3: Firestore Security Rules

### Step 1: Set Up Security Rules

1. Go to Firebase Console → **Firestore Database**
2. Click **Rules** tab
3. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global exercises - read-only for all users, write for admins only
    match /global_exercises/{exerciseId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User data - private to each user
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's programs
      match /programs/{programId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's workouts
      match /workouts/{workoutId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's custom exercises
      match /custom_exercises/{exerciseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

4. Click **Publish**

### Step 2: Create Firestore Indexes

Go to **Firestore Database** → **Indexes** tab and create:

#### Single Field Indexes:
1. Collection: `global_exercises`
   - Field: `nameSearchTokens` (Array)
   - Query scope: Collection

2. Collection: `global_exercises`
   - Field: `targetMuscleGroup` (Ascending)
   - Query scope: Collection

3. Collection: `global_exercises`
   - Field: `primaryEquipment` (Ascending)
   - Query scope: Collection

#### Composite Indexes:
1. Collection: `global_exercises`
   - `nameSearchTokens` (Arrays)
   - `targetMuscleGroup` (Ascending)

2. Collection: `global_exercises`
   - `nameSearchTokens` (Arrays)
   - `primaryEquipment` (Ascending)

**Note**: Firestore will prompt you to create indexes when you run queries that need them. You can also create them on-demand.

## Part 4: Import Exercise Database

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Test Import (Dry Run)

```bash
python -m backend.scripts.import_exercises Exercises.csv --dry-run
```

Expected output:
```
============================================================
EXERCISE DATABASE IMPORT
============================================================
Reading CSV file: Exercises.csv
Found XXX exercises in CSV
Successfully parsed XXX exercises
DRY RUN MODE - No data will be uploaded
...
```

### Step 3: Actual Import

```bash
python -m backend.scripts.import_exercises Exercises.csv
```

This will:
- Parse your CSV file
- Generate search tokens for each exercise
- Upload to Firestore in batches of 500
- Show progress and any errors

### Step 4: Verify Import

```bash
# Start the API server
python run.py

# In another terminal, test the API
curl http://localhost:8000/api/v3/exercises?page=1&page_size=10
```

## Troubleshooting

### Issue: "Firebase not initialized"

**Cause**: Missing or incorrect environment variables

**Solution**:
1. Check your `.env` file exists
2. Verify all required variables are set
3. Ensure private key includes the full key with `\n` characters
4. Restart the application after changing `.env`

### Issue: "Permission denied" in Firestore

**Cause**: Security rules not configured

**Solution**:
1. Go to Firebase Console → Firestore → Rules
2. Copy the rules from Part 3 above
3. Click Publish
4. Wait 1-2 minutes for rules to propagate

### Issue: "Index required" error

**Cause**: Missing Firestore index

**Solution**:
1. Click the link in the error message (it will open Firebase Console)
2. Click "Create Index"
3. Wait for index to build (usually 1-2 minutes)

### Issue: CSV parsing fails

**Cause**: Encoding or format issues

**Solution**:
```bash
# Check file encoding
file -I Exercises.csv

# Convert to UTF-8 if needed
iconv -f ISO-8859-1 -t UTF-8 Exercises.csv > Exercises_utf8.csv

# Try import again
python -m backend.scripts.import_exercises Exercises_utf8.csv
```

## Testing the Setup

### Test 1: Backend API

```bash
# Start server
python run.py

# Test health endpoint
curl http://localhost:8000/api/health

# Should show:
# {
#   "status": "healthy",
#   "firebase_status": "available",
#   "auth_status": "available"
# }
```

### Test 2: Exercise Search

```bash
# Search for exercises
curl "http://localhost:8000/api/v3/exercises/search?q=bench&limit=5"

# Should return exercises matching "bench"
```

### Test 3: Frontend

1. Open http://localhost:8000 in browser
2. Open browser console (F12)
3. Check for Firebase initialization messages
4. Should see: "✅ Firebase initialization service ready"

## Security Best Practices

### 1. Protect Your .env File

```bash
# Add to .gitignore (should already be there)
echo ".env" >> .gitignore

# Never commit .env to git
git rm --cached .env  # If accidentally committed
```

### 2. Use Environment Variables in Production

For Railway/Heroku deployment:
1. Don't use `.env` file in production
2. Set environment variables in hosting platform
3. Use Railway's environment variable UI

### 3. Rotate Keys Regularly

1. Generate new service account key every 90 days
2. Delete old keys from Firebase Console
3. Update `.env` with new credentials

## Quick Reference

### Environment Variables Needed

```env
FIREBASE_PROJECT_ID=ghost-gym-v3
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=abc123...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ghost-gym-v3.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789...
```

### Import Command

```bash
python -m backend.scripts.import_exercises Exercises.csv
```

### Test Commands

```bash
# Health check
curl http://localhost:8000/api/health

# Search exercises
curl "http://localhost:8000/api/v3/exercises/search?q=squat"

# Get all exercises
curl "http://localhost:8000/api/v3/exercises?page_size=10"
```

## Next Steps

After Firebase is configured:

1. ✅ Import exercise database
2. ✅ Test API endpoints
3. ⏳ Implement frontend autocomplete component
4. ⏳ Integrate into workout forms
5. ⏳ Add custom exercise functionality

---

**Need Help?**
- Check [`EXERCISE_DATABASE_QUICKSTART.md`](./EXERCISE_DATABASE_QUICKSTART.md) for usage examples
- See [`EXERCISE_DATABASE_INTEGRATION.md`](./EXERCISE_DATABASE_INTEGRATION.md) for technical details
- Review Firebase Console for data verification

**Status**: Backend Ready | Waiting for Firebase Credentials