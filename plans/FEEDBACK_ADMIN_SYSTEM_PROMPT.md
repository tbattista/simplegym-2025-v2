# Feedback Admin System - Implementation Prompt

## Overview
Create an admin dashboard page that allows only the authorized admin (tbattista@gmail.com) to view and manage user feedback submissions from the Ghost Gym feedback system.

## Requirements

### 1. Authentication & Authorization
- **Admin Email:** tbattista@gmail.com (Google Sign-In)
- Only this email address should have access to the admin dashboard
- Redirect unauthorized users to the home page with an error message
- Check authorization on page load and continuously monitor auth state

### 2. Admin Dashboard Page (`frontend/feedback-admin.html`)

#### Page Structure
- Create a new page: `frontend/feedback-admin.html`
- Use the existing Ghost Gym layout (navbar, theme support, etc.)
- Page title: "Feedback Admin Dashboard"
- Include authentication check before rendering content

#### Dashboard Features

**A. Feedback List View**
- Display all feedback submissions in a sortable, filterable table
- Columns to display:
  - Status badge (new/reviewing/in-progress/resolved/closed)
  - Type badge (bug/feature/general)
  - Title (clickable to view details)
  - Priority (for bugs: low/medium/high/critical)
  - Submitted by (email or "Anonymous")
  - Page URL (where feedback was submitted)
  - Date submitted (formatted: "2 hours ago", "3 days ago", etc.)
  - Actions (View Details, Update Status, Delete)

**B. Filtering & Sorting**
- Filter by:
  - Status (all/new/reviewing/in-progress/resolved/closed)
  - Type (all/bug/feature/general)
  - Priority (all/low/medium/high/critical)
  - Date range (last 7 days, last 30 days, all time)
- Sort by:
  - Date (newest/oldest)
  - Priority (highest/lowest)
  - Status
- Search by title or description keywords

**C. Feedback Detail Modal**
- Click on any feedback to open a detailed view modal
- Display all information:
  - **User Input:**
    - Type, Title, Description, Priority
    - Contact preference (Yes/No)
  - **Metadata:**
    - Page URL (clickable link)
    - Page Title
    - Timestamp (full date/time)
    - User ID & Email (if authenticated)
    - Browser info (userAgent)
    - Screen resolution & viewport type
    - Session duration
    - Theme preference
  - **Admin Fields:**
    - Status dropdown (editable)
    - Admin notes textarea (editable)
    - Assigned to field (future feature - leave empty for now)
    - Resolved date (auto-set when status changes to "resolved")

**D. Status Management**
- Update feedback status with dropdown:
  - New (default)
  - Reviewing
  - In Progress
  - Resolved
  - Closed
- Add admin notes (rich text area)
- Save changes button
- Show last updated timestamp

**E. Statistics Dashboard**
- Display summary cards at the top:
  - Total feedback count
  - New feedback count (status: new)
  - Bug reports count
  - Feature requests count
  - Average response time (future feature)
- Charts (optional, nice-to-have):
  - Feedback by type (pie chart)
  - Feedback over time (line chart)
  - Status distribution (bar chart)

### 3. Security Implementation

#### Firestore Rules (Already Added)
The rules in `firestore.rules` already restrict feedback access to admins with `role: 'admin'` in their user document.

#### Client-Side Authorization
```javascript
// Check if user is admin
async function checkAdminAccess() {
    const user = window.firebaseAuth.currentUser;
    
    if (!user) {
        // Not signed in - redirect to home
        window.location.href = '/';
        return false;
    }
    
    // Check if email matches admin email
    if (user.email !== 'tbattista@gmail.com') {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/';
        return false;
    }
    
    return true;
}
```

#### Set Admin Role in Firestore
After first sign-in, manually set admin role in Firebase Console:
1. Go to Firestore Database
2. Navigate to `users/{your-uid}` document
3. Add field: `role` = `"admin"` (string type)

### 4. Technical Implementation

#### Required Files
1. **HTML:** `frontend/feedback-admin.html`
2. **JavaScript:** `frontend/assets/js/feedback-admin.js`
3. **CSS:** `frontend/assets/css/feedback-admin.css` (optional, can use existing styles)

#### Dependencies
- Firebase Auth (already loaded)
- Firebase Firestore (already loaded)
- Bootstrap 5 (already loaded)
- Existing Ghost Gym components (navbar, theme manager, etc.)

#### Key Functions to Implement

```javascript
// Load all feedback from Firestore
async function loadFeedback(filters = {}) {
    const feedbackCollection = window.firestoreFunctions.collection(window.firebaseDb, 'feedback');
    let query = feedbackCollection;
    
    // Apply filters
    if (filters.status) {
        query = window.firestoreFunctions.query(query, 
            window.firestoreFunctions.where('status', '==', filters.status));
    }
    
    // Get documents
    const snapshot = await window.firestoreFunctions.getDocs(query);
    const feedbackList = [];
    
    snapshot.forEach(doc => {
        feedbackList.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return feedbackList;
}

// Update feedback status
async function updateFeedbackStatus(feedbackId, newStatus, adminNotes) {
    const feedbackDoc = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
    
    await window.firestoreFunctions.updateDoc(feedbackDoc, {
        status: newStatus,
        adminNotes: adminNotes,
        updatedAt: window.firestoreFunctions.serverTimestamp(),
        resolvedAt: newStatus === 'resolved' ? window.firestoreFunctions.serverTimestamp() : null
    });
}

// Delete feedback
async function deleteFeedback(feedbackId) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    const feedbackDoc = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
    await window.firestoreFunctions.deleteDoc(feedbackDoc);
}
```

### 5. UI/UX Guidelines

#### Design Consistency
- Use existing Ghost Gym Sneat theme colors and components
- Match the style of other admin pages (if any exist)
- Responsive design (mobile, tablet, desktop)
- Dark mode support

#### User Experience
- Loading states while fetching data
- Empty state message when no feedback exists
- Confirmation dialogs for destructive actions (delete)
- Success/error toast notifications
- Real-time updates (optional: use Firestore listeners)

#### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Focus management in modals
- Color contrast compliance

### 6. Additional Features (Optional)

#### Export Functionality
- Export feedback to CSV
- Export filtered results
- Include all metadata in export

#### Bulk Actions
- Select multiple feedback items
- Bulk status update
- Bulk delete

#### Email Notifications
- Notify admin when new feedback is submitted
- Send response to users who opted for contact

#### Analytics
- Track response times
- Identify common issues
- Trend analysis

## Implementation Steps

1. **Create the HTML page** (`frontend/feedback-admin.html`)
   - Copy structure from existing pages
   - Add admin-specific content area
   - Include necessary scripts

2. **Implement authentication check** (in page or separate JS file)
   - Check if user is signed in
   - Verify email matches tbattista@gmail.com
   - Redirect if unauthorized

3. **Create the admin JavaScript** (`frontend/assets/js/feedback-admin.js`)
   - Load feedback from Firestore
   - Render feedback table
   - Implement filtering and sorting
   - Handle status updates
   - Implement delete functionality

4. **Style the dashboard** (use existing CSS or create new)
   - Match Ghost Gym theme
   - Responsive layout
   - Status badges with colors
   - Priority indicators

5. **Test thoroughly**
   - Test with admin account (tbattista@gmail.com)
   - Test with non-admin account (should be blocked)
   - Test all CRUD operations
   - Test filters and sorting
   - Test on mobile devices

6. **Deploy Firestore rules** (if not already done)
   ```bash
   firebase deploy --only firestore:rules
   ```

7. **Set admin role in Firestore**
   - Sign in with tbattista@gmail.com
   - Get your user ID from Firebase Console
   - Add `role: 'admin'` to your user document

## Security Checklist

- [ ] Only tbattista@gmail.com can access the admin page
- [ ] Firestore rules prevent non-admins from reading feedback
- [ ] Client-side checks redirect unauthorized users
- [ ] Admin role is set in Firestore user document
- [ ] No sensitive data exposed in client-side code
- [ ] HTTPS enforced in production

## Testing Checklist

- [ ] Admin can view all feedback
- [ ] Admin can filter and sort feedback
- [ ] Admin can update feedback status
- [ ] Admin can add admin notes
- [ ] Admin can delete feedback
- [ ] Non-admin users are blocked from access
- [ ] Page works on mobile devices
- [ ] Dark mode works correctly
- [ ] All modals open and close properly
- [ ] Data refreshes after updates

## Notes

- The feedback system is already implemented and working
- Users can submit feedback from any page via the navbar button
- Feedback is stored in Firestore `feedback` collection
- This admin system is for viewing and managing that feedback
- Keep the UI simple and functional - focus on usability over fancy features