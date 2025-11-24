# Firestore Security Rules for Feedback System

## Overview
This document contains the Firestore security rules needed for the feedback system. These rules must be added to your `firestore.rules` file.

## Security Rules

Add the following rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Feedback Collection Rules
    match /feedback/{feedbackId} {
      // Allow anyone (authenticated or anonymous) to create feedback
      allow create: if true;
      
      // Only admins can read feedback
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Only admins can update feedback (for status changes, admin notes, etc.)
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Prevent deletion of feedback
      allow delete: if false;
    }
    
    // Existing rules for other collections...
  }
}
```

## Rule Explanation

### Create Permission (`allow create: if true`)
- **Who:** Anyone (authenticated users and anonymous visitors)
- **Why:** We want to collect feedback from all users, regardless of authentication status
- **Security:** The client-side validation and rate limiting prevent abuse

### Read Permission
- **Who:** Only authenticated users with admin role
- **Why:** Feedback may contain sensitive information and should only be visible to admins
- **Implementation:** Requires a `users` collection with a `role` field

### Update Permission
- **Who:** Only authenticated users with admin role
- **Why:** Admins need to update status, add notes, assign feedback, etc.
- **Fields that can be updated:**
  - `status` (new → reviewing → in-progress → resolved → closed)
  - `adminNotes`
  - `assignedTo`
  - `resolvedAt`
  - `updatedAt`

### Delete Permission
- **Who:** No one
- **Why:** Feedback should never be deleted for audit trail purposes
- **Alternative:** Use status field to mark as "closed" instead

## Admin User Setup

To use the admin features, you need to set up admin users in Firestore:

### 1. Create Users Collection (if not exists)

```javascript
// Collection: users
// Document ID: {userId}
{
  email: "admin@example.com",
  role: "admin",  // or "user" for regular users
  createdAt: Timestamp,
  displayName: "Admin User"
}
```

### 2. Set Admin Role for Your Account

You can do this via Firebase Console or using a Cloud Function:

**Via Firebase Console:**
1. Go to Firestore Database
2. Navigate to `users` collection
3. Find your user document (by UID)
4. Add/update field: `role: "admin"`

**Via Cloud Function (one-time setup):**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

exports.makeAdmin = functions.https.onCall(async (data, context) => {
  // Verify the caller is already an admin or use a secret key
  const uid = data.uid;
  
  await admin.firestore().collection('users').doc(uid).set({
    role: 'admin'
  }, { merge: true });
  
  return { success: true };
});
```

## Testing the Rules

### Test Create (Should Succeed)
```javascript
// As anonymous user
await firebase.firestore().collection('feedback').add({
  type: 'bug',
  title: 'Test feedback',
  description: 'This is a test',
  // ... other fields
});
```

### Test Read (Should Fail for Non-Admins)
```javascript
// As regular user (should fail)
await firebase.firestore().collection('feedback').get();
// Error: Missing or insufficient permissions
```

### Test Read (Should Succeed for Admins)
```javascript
// As admin user (should succeed)
await firebase.firestore().collection('feedback').get();
// Returns feedback documents
```

## Deployment

### Deploy Rules to Firebase

1. **Update firestore.rules file:**
   ```bash
   # Edit firestore.rules and add the feedback rules
   ```

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Verify deployment:**
   - Go to Firebase Console
   - Navigate to Firestore Database → Rules
   - Verify the feedback rules are present

## Security Best Practices

### 1. Rate Limiting
- Implemented client-side (5 submissions per hour)
- Consider adding Cloud Functions for server-side rate limiting

### 2. Content Validation
- Client-side validation prevents malformed data
- Consider adding server-side validation via Cloud Functions

### 3. Spam Prevention
- Rate limiting helps prevent spam
- Consider adding CAPTCHA for anonymous submissions
- Monitor for abuse patterns

### 4. Data Privacy
- Feedback may contain personal information
- Only admins can access feedback
- Consider GDPR compliance for EU users

### 5. Audit Trail
- Never delete feedback (use status instead)
- Track all changes with `updatedAt` timestamp
- Consider adding change history

## Future Enhancements

### 1. Email Notifications
Add Cloud Function to notify admins of new feedback:

```javascript
exports.notifyAdminOnFeedback = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    
    // Send email to admins
    await sendEmail({
      to: 'admin@example.com',
      subject: `New ${feedback.type} feedback`,
      body: `Title: ${feedback.title}\n\nDescription: ${feedback.description}`
    });
  });
```

### 2. Status Update Notifications
Notify users when their feedback status changes:

```javascript
exports.notifyUserOnStatusChange = functions.firestore
  .document('feedback/{feedbackId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== after.status && after.contactMe && after.metadata.userEmail) {
      // Send email to user
      await sendEmail({
        to: after.metadata.userEmail,
        subject: `Feedback status updated: ${after.status}`,
        body: `Your feedback "${after.title}" has been updated to: ${after.status}`
      });
    }
  });
```

### 3. Analytics
Track feedback metrics:

```javascript
exports.trackFeedbackMetrics = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    
    // Log to analytics
    await admin.analytics().logEvent('feedback_submitted', {
      type: feedback.type,
      page: feedback.metadata.pageUrl,
      authenticated: !!feedback.metadata.userId
    });
  });
```

## Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution:** 
- Verify user has admin role in users collection
- Check that security rules are deployed
- Ensure user is authenticated

### Issue: Anonymous users can't submit feedback
**Solution:**
- Verify `allow create: if true` rule is present
- Check that Firebase Auth allows anonymous users
- Verify client-side code doesn't require authentication

### Issue: Feedback not appearing in Firestore
**Solution:**
- Check browser console for errors
- Verify Firebase is initialized correctly
- Check network tab for failed requests
- Verify Firestore is enabled in Firebase Console

## Support

For issues or questions:
1. Check Firebase Console → Firestore → Rules tab
2. Review browser console for errors
3. Test rules in Firebase Console Rules Playground
4. Check Firebase documentation: https://firebase.google.com/docs/firestore/security/get-started

---

**Last Updated:** 2024-11-23
**Version:** 1.0.0