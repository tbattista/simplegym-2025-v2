# Firebase Deployment Guide for Workout Sharing

Quick guide to deploy Firestore indexes and security rules for the workout sharing feature.

---

## 📋 Prerequisites

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Firebase project initialized

---

## 🚀 Deployment Steps

### Step 1: Initialize Firebase (If Not Already Done)

If this is your first time using Firebase CLI in this project:

```bash
firebase init
```

**Select:**
- ✅ Firestore: Configure security rules and indexes files
- Project: Select your existing Firebase project (ghost-gym-v3)
- Rules file: `firestore.rules` (already created)
- Indexes file: `firestore.indexes.json` (already created)

**Note:** If you've already initialized Firebase, skip this step.

---

### Step 2: Deploy Firestore Indexes

Deploy the composite indexes needed for efficient querying:

```bash
firebase deploy --only firestore:indexes
```

**Expected Output:**
```
✔ Deploy complete!

Indexes are being created. Check status at:
https://console.firebase.google.com/project/ghost-gym-v3/firestore/indexes
```

**⏱️ Wait Time:** 5-10 minutes for indexes to build

**Verify:** Check Firebase Console → Firestore Database → Indexes tab

---

### Step 3: Deploy Firestore Security Rules

Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔ Deploy complete!

Rules have been published.
```

**Verify:** Check Firebase Console → Firestore Database → Rules tab

---

### Step 4: Deploy Both Together (Optional)

You can deploy both at once:

```bash
firebase deploy --only firestore
```

This deploys both indexes and rules in one command.

---

## 🔍 Verify Deployment

### Check Indexes Status

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes**
4. Verify 4 composite indexes are listed:
   - `public_workouts` with `is_moderated` + `created_at`
   - `public_workouts` with `is_moderated` + `stats.view_count`
   - `public_workouts` with `is_moderated` + `stats.save_count`
   - `public_workouts` with `workout_data.tags` + `created_at`

**Status should be:** ✅ Enabled (green)

### Check Security Rules

1. Go to **Firestore Database** → **Rules**
2. Verify rules include:
   - `public_workouts` collection rules
   - `private_shares` collection rules
3. Check "Last published" timestamp is recent

---

## 🐛 Troubleshooting

### Error: "Not in a Firebase app directory"

**Solution:** You need `firebase.json` in your project root (already created).

### Error: "Permission denied"

**Solution:** Run `firebase login` to authenticate.

### Error: "Project not found"

**Solution:** Run `firebase use --add` and select your project.

### Indexes Taking Too Long

**Normal:** Indexes can take 5-10 minutes to build.  
**Check Status:** Firebase Console → Firestore → Indexes tab

### Rules Not Working

**Solution:** 
1. Verify rules are published (check timestamp)
2. Test rules in Firebase Console Rules Playground
3. Check for syntax errors in rules file

---

## 📊 Index Details

The following indexes are created:

### 1. Sort by Created Date (Default)
```
Collection: public_workouts
Fields:
  - is_moderated (Ascending)
  - created_at (Descending)
```

### 2. Sort by View Count (Popularity)
```
Collection: public_workouts
Fields:
  - is_moderated (Ascending)
  - stats.view_count (Descending)
```

### 3. Sort by Save Count (Most Saved)
```
Collection: public_workouts
Fields:
  - is_moderated (Ascending)
  - stats.save_count (Descending)
```

### 4. Filter by Tags + Sort by Date
```
Collection: public_workouts
Fields:
  - workout_data.tags (Array Contains)
  - created_at (Descending)
```

---

## 🔒 Security Rules Summary

### Public Workouts
- **Read:** Anyone (no auth required)
- **Create:** Authenticated users only
- **Update/Delete:** Creator only

### Private Shares
- **Read:** Anyone (token = auth)
- **Create:** Authenticated users only
- **Delete:** Creator only

### User Data
- **Read/Write:** Owner only

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Indexes show "Enabled" status in Firebase Console
- [ ] Security rules show recent "Last published" timestamp
- [ ] Test API endpoints (no index errors in logs)
- [ ] Run smoke tests from testing checklist
- [ ] Monitor Firestore usage in Firebase Console

---

## 🚨 Important Notes

1. **Indexes are required** - Queries will fail without them
2. **Wait for indexes to build** - Don't test immediately after deployment
3. **Rules are live immediately** - Test carefully
4. **Monitor costs** - Check Firestore usage regularly

---

## 📞 Need Help?

If you encounter issues:

1. Check Firebase Console logs
2. Review [`WORKOUT_SHARING_SECURITY_RULES.md`](WORKOUT_SHARING_SECURITY_RULES.md)
3. Test with Firebase Emulator Suite locally
4. Check Firebase documentation: https://firebase.google.com/docs/firestore

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Verify indexes are built
2. ✅ Test security rules
3. ✅ Run API smoke tests
4. ✅ Begin full testing checklist
5. ✅ Monitor for 24 hours
6. ✅ Proceed to Phase 2 (Frontend)

---

**Last Updated:** 2025-01-21  
**Version:** 1.0.0