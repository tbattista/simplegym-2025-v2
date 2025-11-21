# Workout Sharing Testing Checklist

Comprehensive testing guide for Phase 1 workout sharing implementation.

**Version:** 1.0.0  
**Last Updated:** 2025-01-21  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Setup

Before starting tests, ensure:

- [ ] All code files are deployed
- [ ] Firestore indexes are deployed (`firebase deploy --only firestore:indexes`)
- [ ] Security rules are published in Firebase Console
- [ ] Backend server is running
- [ ] You have at least 2 test user accounts
- [ ] You have at least 2 test workouts created

---

## 🧪 Testing Environment

**Backend URL:** `http://localhost:8000` (or your deployed URL)  
**API Base:** `/api/v3/sharing`

**Test Users:**
- User A: Primary test user (creator)
- User B: Secondary test user (recipient)
- Anonymous: Unauthenticated user

---

## 1️⃣ Public Workout Sharing Tests

### 1.1 Share Workout Publicly (With Creator Name)

**Endpoint:** `POST /api/v3/sharing/share-public`

**Test Steps:**
1. [ ] Authenticate as User A
2. [ ] Create a test workout if needed
3. [ ] Send POST request with:
   ```json
   {
     "workout_id": "workout-abc123",
     "show_creator_name": true
   }
   ```
4. [ ] Verify response contains:
   - [ ] `id` (public workout ID)
   - [ ] `workout_data` (complete workout snapshot)
   - [ ] `creator_id` (User A's ID)
   - [ ] `creator_name` (User A's display name)
   - [ ] `source_workout_id` (original workout ID)
   - [ ] `stats.view_count` = 0
   - [ ] `stats.save_count` = 0
5. [ ] Verify in Firestore Console:
   - [ ] Document exists in `public_workouts` collection
   - [ ] All fields are correctly populated

**Expected Result:** ✅ Workout shared publicly with creator attribution

---

### 1.2 Share Workout Publicly (Anonymous)

**Test Steps:**
1. [ ] Authenticate as User A
2. [ ] Send POST request with:
   ```json
   {
     "workout_id": "workout-abc123",
     "show_creator_name": false
   }
   ```
3. [ ] Verify response contains:
   - [ ] `creator_name` is `null`
   - [ ] All other fields present

**Expected Result:** ✅ Workout shared anonymously

---

### 1.3 Duplicate Share Prevention

**Test Steps:**
1. [ ] Authenticate as User A
2. [ ] Share the same workout again (same `workout_id`)
3. [ ] Verify response returns the existing public workout
4. [ ] Verify in Firestore: Only ONE document exists for this workout

**Expected Result:** ✅ Returns existing share, no duplicate created

---

### 1.4 Browse Public Workouts (Default Sort)

**Endpoint:** `GET /api/v3/sharing/public-workouts`

**Test Steps:**
1. [ ] Send GET request (no authentication required)
2. [ ] Verify response contains:
   - [ ] `workouts` array
   - [ ] `total_count` (number)
   - [ ] `page` = 1
   - [ ] `page_size` = 20
3. [ ] Verify workouts are sorted by `created_at` (newest first)

**Expected Result:** ✅ Returns paginated list of public workouts

---

### 1.5 Browse Public Workouts (Sort by Views)

**Test Steps:**
1. [ ] Send GET request: `?sort_by=view_count`
2. [ ] Verify workouts are sorted by view count (highest first)

**Expected Result:** ✅ Workouts sorted by popularity

---

### 1.6 Browse Public Workouts (Sort by Saves)

**Test Steps:**
1. [ ] Send GET request: `?sort_by=save_count`
2. [ ] Verify workouts are sorted by save count (highest first)

**Expected Result:** ✅ Workouts sorted by saves

---

### 1.7 Filter Public Workouts by Tags

**Test Steps:**
1. [ ] Send GET request: `?tags=push&tags=hypertrophy`
2. [ ] Verify only workouts with matching tags are returned

**Expected Result:** ✅ Filtered results match tag criteria

---

### 1.8 Pagination

**Test Steps:**
1. [ ] Send GET request: `?page=1&page_size=5`
2. [ ] Verify response contains 5 workouts (or less if fewer exist)
3. [ ] Send GET request: `?page=2&page_size=5`
4. [ ] Verify different workouts are returned

**Expected Result:** ✅ Pagination works correctly

---

### 1.9 View Specific Public Workout

**Endpoint:** `GET /api/v3/sharing/public-workouts/{id}`

**Test Steps:**
1. [ ] Get a public workout ID from browse results
2. [ ] Send GET request (no authentication required)
3. [ ] Verify complete workout data is returned
4. [ ] Check Firestore: `stats.view_count` incremented by 1
5. [ ] Send GET request again
6. [ ] Verify `view_count` incremented again

**Expected Result:** ✅ Workout retrieved, view count incremented

---

### 1.10 Save Public Workout (Default Name)

**Endpoint:** `POST /api/v3/sharing/public-workouts/{id}/save`

**Test Steps:**
1. [ ] Authenticate as User B (different from creator)
2. [ ] Send POST request with empty body: `{}`
3. [ ] Verify response contains saved workout
4. [ ] Verify workout name has " (Shared)" suffix
5. [ ] Check User B's workouts collection in Firestore
6. [ ] Verify workout exists with new ID
7. [ ] Check public workout: `stats.save_count` incremented

**Expected Result:** ✅ Workout saved to User B's library, save count incremented

---

### 1.11 Save Public Workout (Custom Name)

**Test Steps:**
1. [ ] Authenticate as User B
2. [ ] Send POST request:
   ```json
   {
     "custom_name": "My Custom Workout Name"
   }
   ```
3. [ ] Verify saved workout has custom name

**Expected Result:** ✅ Workout saved with custom name

---

## 2️⃣ Private Workout Sharing Tests

### 2.1 Create Private Share (No Expiration)

**Endpoint:** `POST /api/v3/sharing/share-private`

**Test Steps:**
1. [ ] Authenticate as User A
2. [ ] Send POST request:
   ```json
   {
     "workout_id": "workout-xyz789",
     "show_creator_name": true
   }
   ```
3. [ ] Verify response contains:
   - [ ] `token` (secure random string)
   - [ ] `share_url` (formatted URL with token)
   - [ ] `expires_at` is `null`
4. [ ] Verify in Firestore:
   - [ ] Document exists in `private_shares` collection
   - [ ] Document ID matches token

**Expected Result:** ✅ Private share created with permanent access

---

### 2.2 Create Private Share (With Expiration)

**Test Steps:**
1. [ ] Authenticate as User A
2. [ ] Send POST request:
   ```json
   {
     "workout_id": "workout-xyz789",
     "show_creator_name": true,
     "expires_in_days": 7
   }
   ```
3. [ ] Verify `expires_at` is 7 days from now

**Expected Result:** ✅ Private share created with 7-day expiration

---

### 2.3 View Private Share (Valid Token)

**Endpoint:** `GET /api/v3/sharing/share/{token}`

**Test Steps:**
1. [ ] Get token from previous test
2. [ ] Send GET request (no authentication required)
3. [ ] Verify complete workout data is returned
4. [ ] Check Firestore: `view_count` incremented

**Expected Result:** ✅ Private share retrieved, view count incremented

---

### 2.4 View Private Share (Invalid Token)

**Test Steps:**
1. [ ] Send GET request with fake token: `/share/invalid-token-123`
2. [ ] Verify 404 error response

**Expected Result:** ✅ Returns 404 for invalid token

---

### 2.5 View Expired Private Share

**Test Steps:**
1. [ ] Create a share with `expires_in_days: 0` (or manually set past date in Firestore)
2. [ ] Try to view the share
3. [ ] Verify 404 error response

**Expected Result:** ✅ Expired shares are rejected

---

### 2.6 Save Private Share (Default Name)

**Endpoint:** `POST /api/v3/sharing/share/{token}/save`

**Test Steps:**
1. [ ] Authenticate as User B
2. [ ] Send POST request with empty body: `{}`
3. [ ] Verify workout saved to User B's library
4. [ ] Verify name has " (Shared)" suffix

**Expected Result:** ✅ Private share saved to library

---

### 2.7 Save Private Share (Custom Name)

**Test Steps:**
1. [ ] Authenticate as User B
2. [ ] Send POST request:
   ```json
   {
     "custom_name": "Shared Workout from Friend"
   }
   ```
3. [ ] Verify saved workout has custom name

**Expected Result:** ✅ Private share saved with custom name

---

### 2.8 Delete Private Share (Creator)

**Endpoint:** `DELETE /api/v3/sharing/share/{token}`

**Test Steps:**
1. [ ] Authenticate as User A (creator)
2. [ ] Send DELETE request
3. [ ] Verify success response
4. [ ] Try to view the share again
5. [ ] Verify 404 error

**Expected Result:** ✅ Share deleted successfully

---

### 2.9 Delete Private Share (Non-Creator)

**Test Steps:**
1. [ ] Create a share as User A
2. [ ] Authenticate as User B
3. [ ] Try to DELETE the share
4. [ ] Verify 404 or unauthorized error

**Expected Result:** ✅ Non-creator cannot delete share

---

## 3️⃣ Authentication & Authorization Tests

### 3.1 Unauthenticated Access

**Test Cases:**
- [ ] Browse public workouts (should work)
- [ ] View specific public workout (should work)
- [ ] View private share (should work)
- [ ] Create public share (should fail - 401)
- [ ] Create private share (should fail - 401)
- [ ] Save workout (should fail - 401)
- [ ] Delete share (should fail - 401)

**Expected Result:** ✅ Public reads work, writes require authentication

---

### 3.2 Cross-User Authorization

**Test Cases:**
- [ ] User B cannot delete User A's public workout
- [ ] User B cannot delete User A's private share
- [ ] User B CAN save User A's shared workouts

**Expected Result:** ✅ Users can only modify their own shares

---

## 4️⃣ Data Integrity Tests

### 4.1 Workout Data Completeness

**Test Steps:**
1. [ ] Share a workout with:
   - [ ] Multiple exercise groups
   - [ ] Bonus exercises
   - [ ] Tags
   - [ ] Description
2. [ ] Retrieve the shared workout
3. [ ] Verify ALL data is present and unchanged

**Expected Result:** ✅ Complete workout snapshot preserved

---

### 4.2 Tags Preservation

**Test Steps:**
1. [ ] Create workout with tags: `["push", "chest", "beginner"]`
2. [ ] Share workout publicly
3. [ ] Verify tags are in `workout_data.tags`
4. [ ] Filter by tag and verify workout appears

**Expected Result:** ✅ Tags copied and searchable

---

### 4.3 Source Workout Tracking

**Test Steps:**
1. [ ] Share a workout
2. [ ] Verify `source_workout_id` matches original workout ID
3. [ ] Modify original workout
4. [ ] Verify shared workout remains unchanged

**Expected Result:** ✅ Shared workout is independent snapshot

---

## 5️⃣ Edge Cases & Error Handling

### 5.1 Share Non-Existent Workout

**Test Steps:**
1. [ ] Try to share workout with fake ID
2. [ ] Verify 404 error

**Expected Result:** ✅ Returns 404 for non-existent workout

---

### 5.2 Save Non-Existent Public Workout

**Test Steps:**
1. [ ] Try to save workout with fake ID
2. [ ] Verify 500 or 404 error

**Expected Result:** ✅ Returns error for non-existent workout

---

### 5.3 Large Workout Data

**Test Steps:**
1. [ ] Create workout with maximum allowed:
   - [ ] 6 exercise groups
   - [ ] 2 bonus exercises
   - [ ] Long descriptions
2. [ ] Share workout
3. [ ] Verify all data saved correctly

**Expected Result:** ✅ Large workouts handled correctly

---

### 5.4 Special Characters in Names

**Test Steps:**
1. [ ] Create workout with special characters: `"Push Day 💪 (Heavy)"`
2. [ ] Share workout
3. [ ] Save with custom name: `"My Workout™ & More"`
4. [ ] Verify names preserved correctly

**Expected Result:** ✅ Special characters handled properly

---

## 6️⃣ Performance Tests

### 6.1 Browse Performance

**Test Steps:**
1. [ ] Create 100+ public workouts (or use existing)
2. [ ] Browse with pagination
3. [ ] Verify response time < 2 seconds

**Expected Result:** ✅ Acceptable performance with large dataset

---

### 6.2 Search Performance

**Test Steps:**
1. [ ] Filter by tags with large dataset
2. [ ] Verify response time < 2 seconds

**Expected Result:** ✅ Filtered queries perform well

---

## 7️⃣ Firestore Indexes Verification

### 7.1 Index Usage

**Test Steps:**
1. [ ] Run each query type:
   - [ ] Sort by created_at
   - [ ] Sort by view_count
   - [ ] Sort by save_count
   - [ ] Filter by tags
2. [ ] Verify NO index errors in logs
3. [ ] Check Firebase Console for index status

**Expected Result:** ✅ All queries use indexes, no errors

---

## 8️⃣ Security Rules Verification

### 8.1 Public Workouts Security

**Test in Firebase Console Rules Playground:**
- [ ] Unauthenticated read: ALLOW
- [ ] Unauthenticated create: DENY
- [ ] Authenticated create (own creator_id): ALLOW
- [ ] Authenticated create (other creator_id): DENY
- [ ] Creator update/delete: ALLOW
- [ ] Non-creator update/delete: DENY

**Expected Result:** ✅ All security rules enforced correctly

---

### 8.2 Private Shares Security

**Test in Firebase Console Rules Playground:**
- [ ] Unauthenticated read: ALLOW
- [ ] Unauthenticated create: DENY
- [ ] Authenticated create (own creator_id): ALLOW
- [ ] Creator delete: ALLOW
- [ ] Non-creator delete: DENY

**Expected Result:** ✅ All security rules enforced correctly

---

## 📊 Test Summary

After completing all tests, fill out this summary:

**Total Tests:** 50+  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___

**Critical Issues:** ___  
**Minor Issues:** ___

**Ready for Production:** [ ] Yes [ ] No

---

## 🐛 Bug Report Template

If you find issues, document them using this template:

```markdown
### Bug: [Short Description]

**Severity:** Critical / High / Medium / Low

**Test Case:** [Test number and name]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Screenshots/Logs:**


**Environment:**
- Backend URL:
- User Account:
- Timestamp:
```

---

## ✅ Sign-Off

**Tester Name:** _______________  
**Date:** _______________  
**Signature:** _______________

**Approved for Production:** [ ] Yes [ ] No

---

**Next Steps After Testing:**
1. Fix any critical bugs
2. Deploy to staging environment
3. Perform smoke tests in staging
4. Deploy to production
5. Monitor for 24 hours
6. Begin Phase 2 (Frontend UI)