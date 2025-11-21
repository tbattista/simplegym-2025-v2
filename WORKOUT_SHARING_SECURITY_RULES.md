# Firestore Security Rules for Workout Sharing

This document contains the Firestore security rules that must be added to your Firebase Console for the workout sharing feature.

## 📋 How to Apply These Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Add the rules below to your existing rules
5. Click **Publish**

---

## 🔒 Security Rules

Add these rules to your existing Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================================================
    // EXISTING RULES (Keep your current user collection rules)
    // ========================================================================
    
    // Example of existing user rules (adjust to match your current setup)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /workouts/{workoutId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /programs/{programId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Add other existing subcollections here...
    }
    
    // ========================================================================
    // NEW: PUBLIC WORKOUTS - Anyone can read, only creator can write
    // ========================================================================
    
    match /public_workouts/{workoutId} {
      // Anyone can read public workouts (no authentication required)
      allow read: if true;
      
      // Only authenticated users can create public workouts
      // Must set creator_id to their own user ID
      allow create: if request.auth != null 
                    && request.resource.data.creator_id == request.auth.uid;
      
      // Only the creator can update or delete their public workouts
      allow update, delete: if request.auth != null 
                            && resource.data.creator_id == request.auth.uid;
    }
    
    // ========================================================================
    // NEW: PRIVATE SHARES - Anyone with token can read
    // ========================================================================
    
    match /private_shares/{shareToken} {
      // Anyone can read (the token itself acts as authentication)
      // This allows sharing via URL without requiring login
      allow read: if true;
      
      // Only authenticated users can create private shares
      // Must set creator_id to their own user ID
      allow create: if request.auth != null 
                    && request.resource.data.creator_id == request.auth.uid;
      
      // Only the creator can delete their private shares
      // Note: Updates are not allowed - shares are immutable once created
      allow delete: if request.auth != null 
                    && resource.data.creator_id == request.auth.uid;
    }
  }
}
```

---

## 🔍 Rule Explanations

### Public Workouts (`/public_workouts/{workoutId}`)

**Read Access:**
- ✅ Anyone can read (no authentication required)
- This allows browsing public workouts without logging in

**Create Access:**
- ✅ Only authenticated users
- ✅ Must set `creator_id` to their own user ID
- ❌ Cannot create workouts for other users

**Update/Delete Access:**
- ✅ Only the creator (verified by `creator_id`)
- ❌ Other users cannot modify or delete

### Private Shares (`/private_shares/{shareToken}`)

**Read Access:**
- ✅ Anyone can read (token = authentication)
- The share token in the URL acts as the authentication mechanism
- This allows sharing workouts via link without requiring recipients to log in

**Create Access:**
- ✅ Only authenticated users
- ✅ Must set `creator_id` to their own user ID
- ❌ Cannot create shares for other users

**Delete Access:**
- ✅ Only the creator (verified by `creator_id`)
- ❌ Other users cannot delete shares

**Update Access:**
- ❌ Not allowed - shares are immutable once created
- If changes are needed, delete and create a new share

---

## 🛡️ Security Considerations

### 1. Public Workouts
- **Spam Prevention:** Consider adding rate limiting at the application level
- **Content Moderation:** The `is_moderated` flag allows admin review before public display
- **Creator Attribution:** Optional - users can choose to share anonymously

### 2. Private Shares
- **Token Security:** Tokens are generated using `secrets.token_urlsafe(16)` (cryptographically secure)
- **Expiration:** Optional expiration dates are enforced at the application level
- **No Authentication Required:** Anyone with the token can view - this is intentional for easy sharing

### 3. Data Validation
Additional validation should be implemented at the application level:
- Workout data structure validation
- Maximum workout size limits
- Rate limiting for share creation
- Duplicate share prevention

---

## 📊 Testing Security Rules

After deploying the rules, test them with these scenarios:

### Public Workouts
- [ ] Unauthenticated user can browse public workouts
- [ ] Unauthenticated user can view specific public workout
- [ ] Unauthenticated user CANNOT create public workout
- [ ] Authenticated user can create public workout
- [ ] User can only update/delete their own public workouts
- [ ] User CANNOT update/delete other users' public workouts

### Private Shares
- [ ] Anyone with token can view private share
- [ ] Unauthenticated user CANNOT create private share
- [ ] Authenticated user can create private share
- [ ] User can only delete their own private shares
- [ ] User CANNOT delete other users' private shares
- [ ] Expired shares are rejected (application-level check)

---

## 🚀 Deployment Steps

1. **Backup Current Rules**
   - Copy your existing rules before making changes
   - Save them in a safe location

2. **Add New Rules**
   - Add the `public_workouts` and `private_shares` rules to your existing rules
   - Do NOT replace your existing user collection rules

3. **Validate Syntax**
   - Firebase Console will validate syntax before publishing
   - Fix any errors before proceeding

4. **Publish Rules**
   - Click "Publish" in Firebase Console
   - Rules take effect immediately

5. **Test Thoroughly**
   - Use the testing checklist above
   - Test both authenticated and unauthenticated scenarios

---

## ⚠️ Important Notes

1. **Keep Existing Rules:** Do NOT remove your existing user collection rules
2. **Test Before Production:** Test rules in a development environment first
3. **Monitor Usage:** Watch for unusual patterns or abuse
4. **Rate Limiting:** Implement application-level rate limiting for share creation
5. **Content Moderation:** Use the `is_moderated` flag to review content before public display

---

## 📞 Support

If you encounter issues with security rules:
1. Check Firebase Console logs for rule violations
2. Verify user authentication is working correctly
3. Test with Firebase Emulator Suite for local development
4. Review Firebase documentation: https://firebase.google.com/docs/firestore/security/get-started

---

**Last Updated:** 2025-01-21  
**Version:** 1.0.0  
**Feature:** Workout Sharing Phase 1