# Ghost Gym User Profile Page Architecture

## Executive Summary

This document outlines the architecture for a user profile page for Ghost Gym, following the Sneat template design patterns while integrating with Firebase Authentication. The page will provide essential account management features: profile information display/editing, password change, and account deletion.

## Design Philosophy

**Based on Sneat Template**: Using [`pages-account-settings-account.html`](sneat-bootstrap-template/html/pages-account-settings-account.html:1) as the foundation
**Essential Features Only**: Focus on core functionality without unnecessary complexity
**Firebase Integration**: Seamless integration with existing Firebase Auth system
**Mobile-First**: Responsive design that works on all devices
**Security-First**: Proper authentication checks and confirmation dialogs for sensitive operations

---

## Current System Analysis

### Authentication System
- **Frontend**: [`auth-service.js`](frontend/assets/js/firebase/auth-service.js:1) handles Firebase Authentication
- **Backend**: [`auth_service.py`](backend/services/auth_service.py:1) verifies tokens
- **User Data**: Firebase Auth provides:
  - `uid` (User ID)
  - `email` (Email address)
  - `displayName` (Display name)
  - `emailVerified` (Email verification status)
  - `photoURL` (Profile picture URL - optional)
  - Provider information (email/password, Google, etc.)

### Existing UI Components
- **Navbar**: [`navbar-template.js`](frontend/assets/js/components/navbar-template.js:164) has "My Profile" link (currently non-functional)
- **Menu**: [`menu-template.js`](frontend/assets/js/components/menu-template.js:1) for sidebar navigation
- **Modals**: [`auth-modals-template.js`](frontend/assets/js/components/auth-modals-template.js:1) for authentication flows

---

## Page Architecture

### File Structure

```
frontend/
├── profile.html                          # Main profile page (NEW)
└── assets/
    ├── js/
    │   ├── profile/
    │   │   ├── profile-manager.js        # Main profile logic (NEW)
    │   │   ├── password-manager.js       # Password change logic (NEW)
    │   │   └── account-deletion.js       # Account deletion logic (NEW)
    │   └── firebase/
    │       └── auth-service.js           # Existing - will extend
    └── css/
        └── profile-custom.css            # Profile-specific styles (NEW)

backend/
└── api/
    └── user_profile.py                   # Profile API endpoints (NEW)
```

---

## Page Layout (Sneat-Based)

### Structure Overview

```
┌─────────────────────────────────────────────────────────┐
│ Navbar (with "My Profile" active)                      │
├─────────────────────────────────────────────────────────┤
│ Sidebar Menu                                            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Profile Header                                   │  │
│  │ ┌────────┐                                       │  │
│  │ │ Avatar │  User Name                           │  │
│  │ │  Icon  │  user@email.com                      │  │
│  │ └────────┘                                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Account Information Card                         │  │
│  │                                                  │  │
│  │ Display Name: [_______________]                  │  │
│  │ Email: user@email.com (read-only)               │  │
│  │ Email Verified: ✓ Yes / ✗ No                    │  │
│  │ Account Created: Jan 1, 2024                    │  │
│  │ Sign-in Method: Email/Password or Google        │  │
│  │                                                  │  │
│  │ [Save Changes] [Cancel]                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Change Password Card                             │  │
│  │ (Only shown for email/password accounts)         │  │
│  │                                                  │  │
│  │ Current Password: [_______________]              │  │
│  │ New Password: [_______________]                  │  │
│  │ Confirm Password: [_______________]              │  │
│  │                                                  │  │
│  │ [Change Password]                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Delete Account Card                              │  │
│  │                                                  │  │
│  │ ⚠️ Warning: This action cannot be undone        │  │
│  │                                                  │  │
│  │ ☐ I confirm account deletion                    │  │
│  │                                                  │  │
│  │ [Delete Account]                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. Profile Information Display & Edit

**Fields:**
- **Display Name** (editable)
  - Text input
  - Max 50 characters
  - Updates Firebase Auth profile
  
- **Email** (read-only)
  - Display only
  - Cannot be changed (Firebase limitation)
  
- **Email Verified** (read-only)
  - Badge display: ✓ Verified / ✗ Not Verified
  - Link to resend verification email if not verified
  
- **Account Created** (read-only)
  - Formatted date display
  
- **Sign-in Method** (read-only)
  - Display: "Email/Password", "Google", etc.

**Functionality:**
```javascript
// Update display name
async function updateDisplayName(newName) {
    const user = window.authService.getCurrentUser();
    await updateProfile(user, { displayName: newName });
    // Update navbar display
    window.updateNavbarAuthUI(user);
}
```

### 2. Change Password

**Visibility:**
- Only shown for email/password accounts
- Hidden for Google/social sign-ins

**Fields:**
- Current Password (required)
- New Password (required, min 6 chars)
- Confirm Password (required, must match)

**Validation:**
- Current password must be correct
- New password must meet requirements
- Passwords must match
- Cannot reuse current password

**Functionality:**
```javascript
async function changePassword(currentPassword, newPassword) {
    const user = window.authService.getCurrentUser();
    
    // Re-authenticate first (Firebase requirement)
    const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
}
```

### 3. Delete Account

**Security Measures:**
- Confirmation checkbox required
- Confirmation modal with warning
- Re-authentication required
- Deletes all user data from Firestore

**Workflow:**
1. User checks "I confirm account deletion"
2. User clicks "Delete Account" button
3. Modal appears with final warning
4. User must re-enter password (or re-auth with Google)
5. Backend deletes Firestore data
6. Firebase Auth deletes account
7. User redirected to landing page

**Functionality:**
```javascript
async function deleteAccount() {
    // Show confirmation modal
    const confirmed = await showDeleteConfirmationModal();
    if (!confirmed) return;
    
    // Re-authenticate
    await reauthenticateUser();
    
    // Delete Firestore data
    await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
        }
    });
    
    // Delete Firebase Auth account
    await user.delete();
    
    // Redirect to home
    window.location.href = '/';
}
```

---

## Backend API Endpoints

### 1. Get User Profile
```python
GET /api/user/profile
Authorization: Bearer <firebase_token>

Response:
{
    "uid": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastSignIn": "2024-01-15T10:30:00Z",
    "providerData": [
        {
            "providerId": "password",
            "email": "user@example.com"
        }
    ]
}
```

### 2. Update Display Name
```python
PUT /api/user/profile
Authorization: Bearer <firebase_token>
Content-Type: application/json

Request:
{
    "displayName": "New Name"
}

Response:
{
    "success": true,
    "displayName": "New Name"
}
```

### 3. Delete User Account
```python
DELETE /api/user/delete
Authorization: Bearer <firebase_token>

Response:
{
    "success": true,
    "message": "Account deleted successfully"
}
```

**Backend Logic:**
```python
async def delete_user_account(user_id: str):
    """Delete all user data from Firestore"""
    # Delete user's workouts
    await firestore_service.delete_collection(f'users/{user_id}/workouts')
    
    # Delete user's programs
    await firestore_service.delete_collection(f'users/{user_id}/programs')
    
    # Delete user's workout sessions
    await firestore_service.delete_collection(f'users/{user_id}/workout_sessions')
    
    # Delete user's favorites
    await firestore_service.delete_collection(f'users/{user_id}/favorites')
    
    # Delete user document
    await firestore_service.delete_document(f'users/{user_id}')
    
    # Note: Firebase Auth account deletion happens on frontend
```

---

## Security Considerations

### 1. Authentication Requirements
- All profile operations require valid Firebase token
- Token verified on every backend request
- Re-authentication required for sensitive operations

### 2. Password Change Security
- Must provide current password
- Re-authentication before password change
- Password strength validation
- Rate limiting on password change attempts

### 3. Account Deletion Security
- Double confirmation required
- Re-authentication required
- Irreversible warning displayed
- All user data deleted from Firestore
- Firestore security rules prevent orphaned data

### 4. Data Privacy
- User can only access/modify their own data
- Email cannot be changed (prevents account hijacking)
- Firestore rules enforce user isolation

---

## UI/UX Considerations

### 1. Responsive Design
- Mobile-first approach
- Cards stack vertically on mobile
- Form fields full-width on mobile
- Touch-friendly buttons (min 44px height)

### 2. Loading States
- Show spinner during save operations
- Disable buttons during processing
- Clear success/error messages

### 3. Error Handling
- Friendly error messages
- Field-level validation
- Toast notifications for success/error

### 4. Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

---

## Integration Points

### 1. Navbar Integration
Update [`navbar-template.js`](frontend/assets/js/components/navbar-template.js:164):
```javascript
// Change "My Profile" link from javascript:void(0) to actual page
<a class="dropdown-item" href="/profile.html">
    <i class="bx bx-user me-2"></i>
    <span>My Profile</span>
</a>
```

### 2. Menu Integration
Add profile link to [`menu-template.js`](frontend/assets/js/components/menu-template.js:1) if needed

### 3. Auth Service Extension
Extend [`auth-service.js`](frontend/assets/js/firebase/auth-service.js:1) with:
- `updateDisplayName(name)`
- `changePassword(currentPassword, newPassword)`
- `deleteAccount()`
- `reauthenticateUser(password)`
- `sendEmailVerification()`

---

## Implementation Phases

### Phase 1: Basic Profile Display ✅
- [ ] Create `profile.html` based on Sneat template
- [ ] Implement profile data loading
- [ ] Display read-only information
- [ ] Update navbar link

### Phase 2: Profile Editing ✅
- [ ] Implement display name editing
- [ ] Add save/cancel functionality
- [ ] Show success/error messages
- [ ] Update backend API endpoint

### Phase 3: Password Change ✅
- [ ] Add password change card
- [ ] Implement validation
- [ ] Add re-authentication
- [ ] Test with email/password accounts

### Phase 4: Account Deletion ✅
- [ ] Add deletion card with warnings
- [ ] Implement confirmation flow
- [ ] Add re-authentication
- [ ] Implement backend data deletion
- [ ] Test complete deletion flow

### Phase 5: Polish & Testing ✅
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Test on mobile devices
- [ ] Test all edge cases
- [ ] Security audit

---

## Testing Checklist

### Functional Testing
- [ ] Profile loads correctly for authenticated users
- [ ] Display name can be updated
- [ ] Password can be changed (email/password accounts)
- [ ] Password change requires re-authentication
- [ ] Account can be deleted with confirmation
- [ ] All user data deleted from Firestore
- [ ] Redirects work correctly

### Security Testing
- [ ] Unauthenticated users redirected to login
- [ ] Users can only access their own profile
- [ ] Re-authentication works correctly
- [ ] Token validation on all API calls
- [ ] Rate limiting on sensitive operations

### UI/UX Testing
- [ ] Responsive on mobile devices
- [ ] Loading states display correctly
- [ ] Error messages are clear
- [ ] Success messages display
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

---

## Future Enhancements (Not in Scope)

These features are intentionally excluded from the initial version but could be added later:

1. **Profile Picture Upload**
   - Firebase Storage integration
   - Image cropping/resizing
   - Avatar management

2. **Email Change**
   - Requires Firebase Admin SDK
   - Email verification flow
   - Security considerations

3. **Account Statistics**
   - Total workouts completed
   - Total programs created
   - Account age/milestones

4. **Privacy Settings**
   - Profile visibility
   - Data sharing preferences
   - Newsletter subscriptions

5. **Connected Accounts**
   - Link/unlink Google account
   - Multiple sign-in methods
   - Account merging

6. **Data Export**
   - Export workouts as JSON/CSV
   - Export programs
   - GDPR compliance

---

## Technical Notes

### Firebase Auth Limitations
- Email cannot be changed via client SDK (requires Admin SDK)
- Re-authentication required for sensitive operations
- Password reset must use email link (cannot be done in-app)

### Firestore Data Structure
```
users/{userId}/
├── workouts/{workoutId}
├── programs/{programId}
├── workout_sessions/{sessionId}
├── favorites/{favoriteId}
└── exercise_history/{historyId}
```

### Error Codes to Handle
- `auth/wrong-password`: Incorrect current password
- `auth/weak-password`: New password too weak
- `auth/requires-recent-login`: Re-authentication needed
- `auth/user-not-found`: User account doesn't exist
- `auth/too-many-requests`: Rate limit exceeded

---

## Conclusion

This architecture provides a solid foundation for a user profile page that:
- ✅ Follows Sneat template design patterns
- ✅ Integrates seamlessly with Firebase Authentication
- ✅ Provides essential account management features
- ✅ Maintains security best practices
- ✅ Offers excellent user experience
- ✅ Is maintainable and extensible

The implementation focuses on core functionality while leaving room for future enhancements as the application grows.