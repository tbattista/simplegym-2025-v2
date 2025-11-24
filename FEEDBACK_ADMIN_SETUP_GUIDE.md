# Feedback Admin System - Setup & User Guide

## Overview
The Feedback Admin System allows the authorized admin (tbattista@gmail.com) to view and manage user feedback submissions through a dedicated dashboard.

## Quick Start

### 1. Set Admin Role in Firestore

**IMPORTANT**: You must set the admin role in Firestore before you can access the admin dashboard.

1. Sign in to Ghost Gym with **tbattista@gmail.com**
2. Go to [Firebase Console](https://console.firebase.google.com/)
3. Select your project
4. Navigate to **Firestore Database**
5. Find the `users` collection
6. Locate your user document (it will have your user ID as the document name)
7. Click on the document to edit it
8. Add a new field:
   - **Field name**: `role`
   - **Type**: `string`
   - **Value**: `admin`
9. Click **Update**

**Screenshot of what to add:**
```
users/{your-user-id}
├── email: "tbattista@gmail.com"
├── displayName: "Your Name"
├── role: "admin"  ← ADD THIS FIELD
└── createdAt: Timestamp
```

### 2. Access the Admin Dashboard

Once the admin role is set:

1. Sign in to Ghost Gym with **tbattista@gmail.com**
2. Look for the **Admin** button in the top navbar (between Feedback and Dark Mode toggle)
3. Click the **Admin** button to open the dashboard
4. Or navigate directly to: `https://your-domain.com/feedback-admin.html`

**Note**: The Admin button is only visible when signed in with the admin email.

## Features

### 📊 Statistics Dashboard

At the top of the page, you'll see four summary cards:

- **Total**: Total number of feedback submissions
- **New**: Feedback items with "new" status
- **Done**: Feedback items marked as "resolved"
- **Bugs**: Total bug reports submitted

### 🔍 Filtering System

Filter feedback by:

- **Status**: All / New / Done
- **Type**: All / Bug Report / Feature Request / General Feedback
- **Date Range**: All Time / Last 7 Days / Last 30 Days

**Default filter**: Shows "New" feedback items

### 📋 Feedback List Table

The table displays:

- **Status Badge**: 🟢 New or ✅ Done
- **Type Badge**: 🐛 Bug / ✨ Feature / 💡 General
- **Title**: Clickable to view details (truncated if long)
- **From**: User email or "Anonymous"
- **Date**: Relative time (e.g., "2 hours ago")
- **Actions**: View and Mark as Done buttons

### 👁️ View Details

Click **View** or the title to see complete feedback information:

**User Feedback:**
- Type, Title, Description
- Priority (for bug reports)
- Contact preference

**Metadata:**
- Page URL where feedback was submitted
- Page title
- Submission date/time
- User email (if authenticated)
- Browser information
- Screen resolution and viewport type
- Theme preference (dark/light)
- Current status

### ✅ Mark as Done

To mark feedback as resolved:

1. Click the **Done** button in the table row, OR
2. Open the detail modal and click **Mark as Done**
3. Confirm the action
4. The feedback status will update to "resolved"
5. The list will refresh automatically

**Note**: Once marked as done, the "Done" button disappears.

### 🔄 Manual Refresh

Click the **Refresh** button in the top-right corner to reload:
- Statistics
- Feedback list (with current filters applied)

## User Interface

### Desktop View
- Full table with all columns visible
- Statistics cards in a row
- Filters in a single row
- Action buttons side-by-side

### Mobile View
- Statistics cards stack vertically
- Filters stack vertically
- Some table columns hidden for space
- Action buttons stack vertically

### Dark Mode
- Fully supports dark mode
- Automatically matches your theme preference
- All colors and contrasts optimized

## Security

### Access Control

**Client-Side:**
- Admin button only visible to tbattista@gmail.com
- Admin page redirects non-admin users to home
- Email check on page load

**Server-Side (Firestore Rules):**
```javascript
match /feedback/{feedbackId} {
  // Anyone can create feedback
  allow create: if true;
  
  // Only admins can read/update
  allow read, update: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  
  // Only admins can delete
  allow delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### What Happens if Non-Admin Tries to Access?

1. **Not signed in**: Redirected to home with "Please sign in" message
2. **Signed in but not admin**: Redirected to home with "Access denied" message
3. **Admin button**: Not visible to non-admin users

## Keyboard Shortcuts

- **Ctrl/Cmd + Shift + F**: Open feedback modal (from any page)
- **ESC**: Close modals

## Tips & Best Practices

### Managing Feedback

1. **Check regularly**: Review new feedback at least once a week
2. **Filter by type**: Focus on bugs first, then features
3. **Use date filters**: Check "Last 7 Days" for recent submissions
4. **Mark as done**: Update status after addressing feedback
5. **Contact users**: If they opted in, follow up via email

### Understanding Metadata

- **Page URL**: Shows where the issue occurred
- **Browser info**: Helps debug browser-specific issues
- **Screen resolution**: Useful for responsive design issues
- **Theme**: Dark mode issues can be theme-specific
- **Viewport type**: Mobile/tablet/desktop context

### Workflow Suggestions

**Daily:**
- Check for new critical bugs
- Review feedback from last 24 hours

**Weekly:**
- Review all new feedback
- Mark resolved items as done
- Respond to users who requested contact

**Monthly:**
- Analyze trends (common issues, feature requests)
- Archive or export old feedback
- Review statistics

## Troubleshooting

### Admin Button Not Showing

**Problem**: Signed in with tbattista@gmail.com but no Admin button

**Solutions**:
1. Check if `role: 'admin'` is set in Firestore user document
2. Sign out and sign back in
3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
4. Clear browser cache

### Can't Access Admin Page

**Problem**: Redirected to home when accessing `/feedback-admin.html`

**Solutions**:
1. Verify you're signed in with tbattista@gmail.com
2. Check Firestore user document has `role: 'admin'`
3. Check browser console for errors
4. Verify Firestore rules are deployed

### Feedback Not Loading

**Problem**: Loading spinner doesn't stop or shows error

**Solutions**:
1. Check browser console for errors
2. Verify Firestore rules are deployed correctly
3. Check Firebase project is active
4. Try manual refresh button
5. Check internet connection

### Can't Mark as Done

**Problem**: "Mark as Done" button doesn't work

**Solutions**:
1. Check browser console for errors
2. Verify admin role is set correctly
3. Check Firestore rules allow updates
4. Try refreshing the page

## Technical Details

### Files Created

```
frontend/
├── feedback-admin.html                    # Admin dashboard page
├── assets/
│   ├── js/
│   │   └── services/
│   │       └── feedback-admin-service.js  # Admin operations
│   └── css/
│       └── feedback-admin.css             # Admin page styles
```

### Files Modified

```
frontend/assets/js/components/
└── navbar-template.js                     # Added admin button
```

### Firestore Collections

```
feedback/
├── {feedbackId}/
│   ├── type: "bug" | "feature" | "general"
│   ├── title: string
│   ├── description: string
│   ├── priority: "low" | "medium" | "high" | "critical" | null
│   ├── contactMe: boolean
│   ├── metadata: { ... }
│   ├── status: "new" | "resolved"
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   └── resolvedAt: Timestamp | null
```

## Future Enhancements

Potential features for future versions:

- [ ] Email notifications for new feedback
- [ ] Admin notes field
- [ ] Assign feedback to team members
- [ ] Export feedback to CSV
- [ ] Search by keywords
- [ ] Charts and analytics
- [ ] Real-time updates with Firestore listeners
- [ ] Bulk status updates
- [ ] Response templates
- [ ] Integration with issue trackers (GitHub, Jira)

## Support

For issues or questions:

1. Check browser console for errors
2. Review this guide
3. Check Firebase Console for data
4. Verify Firestore rules are correct
5. Test in different browsers

## Version History

- **v1.0.0** (2024-11-23)
  - Initial release
  - Admin dashboard with filtering
  - Mark as done functionality
  - Statistics cards
  - Detail modal
  - Mobile responsive design
  - Dark mode support

---

**Last Updated**: 2024-11-23
**Admin Email**: tbattista@gmail.com
**Status**: Production Ready