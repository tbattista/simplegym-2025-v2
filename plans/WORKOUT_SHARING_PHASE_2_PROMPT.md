# 🎨 Workout Sharing Phase 2 - Frontend UI Implementation

**Status:** Ready to Start  
**Prerequisites:** Phase 1 Backend Complete ✅  
**Estimated Timeline:** 2-3 weeks  
**Mode:** Code Mode

---

## 📋 Quick Context

Phase 1 (Backend) is complete with:
- ✅ 9 API endpoints functional
- ✅ Firebase indexes deployed
- ✅ Security rules deployed
- ✅ Copy-on-share architecture working

**Now we need:** Frontend UI to let users share and browse workouts.

---

## 🎯 Phase 2 Goals

Build the complete frontend user interface for workout sharing:

1. **Share Button & Modal** - Let users share their workouts
2. **Public Workout Browse Page** - Discover and save shared workouts
3. **Share Link Handler** - View and save workouts from share links
4. **User Experience** - Smooth, intuitive sharing flow

---

## 📁 Key Files to Review

Before starting, familiarize yourself with:

### Backend API Documentation
- [`backend/api/sharing.py`](backend/api/sharing.py) - All 9 API endpoints
- [`backend/models.py`](backend/models.py) - Data models (lines 947-1004)

### Implementation Guides
- [`WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md`](WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md) - Phase 1 summary
- [`WORKOUT_SHARING_TESTING_CHECKLIST.md`](WORKOUT_SHARING_TESTING_CHECKLIST.md) - API testing examples

### Existing Frontend Architecture
- [`frontend/workout-builder.html`](frontend/workout-builder.html) - Where to add share button
- [`frontend/assets/js/workout-builder.js`](frontend/assets/js/workout-builder.js) - Workout builder logic
- [`frontend/assets/js/components/modal-manager.js`](frontend/assets/js/components/modal-manager.js) - Modal system

---

## 🎨 What to Build

### 1. Share Button in Workout Builder

**Location:** [`frontend/workout-builder.html`](frontend/workout-builder.html)

**Requirements:**
- Add "Share" button next to Save/Delete buttons
- Only show for saved workouts (has workout ID)
- Opens share modal on click

**Design:** Match existing Sneat button styles

---

### 2. Share Modal Component

**Create:** `frontend/assets/js/components/share-modal.js`

**Features:**
- **Public Share Tab:**
  - Toggle: Show my name / Share anonymously
  - Button: "Share Publicly"
  - Success: Show shareable link + copy button
  - Display: View count and save count

- **Private Share Tab:**
  - Toggle: Show my name / Share anonymously
  - Optional: Expiration (7 days, 30 days, never)
  - Button: "Create Private Link"
  - Success: Show private link + copy button
  - Button: "Delete Link" (if already shared)

**API Calls:**
- `POST /api/v3/sharing/share-public`
- `POST /api/v3/sharing/share-private`
- `DELETE /api/v3/sharing/share/{token}`

---

### 3. Public Workouts Browse Page

**Create:** `frontend/public-workouts.html`

**Features:**
- **Header:** "Discover Shared Workouts"
- **Filters:**
  - Search by name
  - Filter by tags (multi-select)
  - Sort by: Newest, Most Viewed, Most Saved
- **Workout Cards:**
  - Workout name
  - Creator name (or "Anonymous")
  - Tags
  - View count, Save count
  - "View Details" button
- **Pagination:** 20 workouts per page

**API Calls:**
- `GET /api/v3/sharing/public-workouts?page=1&page_size=20&sort_by=created_at&tags=push`

---

### 4. Workout Detail Modal

**Create:** `frontend/assets/js/components/workout-detail-modal.js`

**Features:**
- Display full workout details:
  - Exercise groups with sets/reps/rest
  - Bonus exercises
  - Tags
  - Creator info
  - Stats (views, saves)
- **Actions:**
  - "Save to My Library" button
  - Optional: Custom name input
  - Close button

**API Calls:**
- `GET /api/v3/sharing/public-workouts/{id}` (increments view count)
- `POST /api/v3/sharing/public-workouts/{id}/save`

---

### 5. Share Link Handler

**Create:** `frontend/share.html` (route: `/share/{token}`)

**Features:**
- Fetch workout from private share token
- Display workout preview (same as detail modal)
- "Save to My Library" button
- Handle expired/invalid tokens gracefully

**API Calls:**
- `GET /api/v3/sharing/share/{token}`
- `POST /api/v3/sharing/share/{token}/save`

---

### 6. Navigation Integration

**Modify:** Top navigation bar

**Add:**
- "Discover Workouts" link → `/public-workouts.html`
- Icon: 🌐 or similar

---

## 🎨 Design Guidelines

### Use Existing Sneat Components
- Buttons: `.btn .btn-primary`, `.btn-outline-secondary`
- Cards: `.card .card-body`
- Modals: Bootstrap modal structure
- Forms: `.form-control`, `.form-label`
- Badges: `.badge .bg-primary` for tags

### Color Scheme
- Primary: Blue (#696cff)
- Success: Green (for save actions)
- Secondary: Gray (for cancel/close)
- Danger: Red (for delete)

### Icons
Use existing icon library (likely Bootstrap Icons or similar)

### Responsive Design
- Mobile-first approach
- Cards stack on mobile
- Modals are full-screen on mobile

---

## 🔌 API Integration

### Authentication
All write operations require Firebase auth token:

```javascript
const token = await firebase.auth().currentUser.getIdToken();

fetch('/api/v3/sharing/share-public', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workout_id: 'workout-abc123',
    show_creator_name: true
  })
});
```

### Error Handling
- 401: Redirect to login
- 404: Show "Not found" message
- 500: Show "Something went wrong" message

---

## 📊 API Endpoints Reference

### Public Sharing
```javascript
// Share workout publicly
POST /api/v3/sharing/share-public
Body: { workout_id: string, show_creator_name: boolean }
Returns: PublicWorkout

// Browse public workouts
GET /api/v3/sharing/public-workouts?page=1&page_size=20&sort_by=created_at&tags=push,chest
Returns: { workouts: [], total_count: number, page: number, page_size: number }

// Get specific public workout (increments view count)
GET /api/v3/sharing/public-workouts/{id}
Returns: PublicWorkout

// Save public workout to library
POST /api/v3/sharing/public-workouts/{id}/save
Body: { custom_name?: string }
Returns: WorkoutTemplate
```

### Private Sharing
```javascript
// Create private share
POST /api/v3/sharing/share-private
Body: { workout_id: string, show_creator_name: boolean, expires_in_days?: number }
Returns: { token: string, share_url: string, expires_at?: datetime }

// Get private share
GET /api/v3/sharing/share/{token}
Returns: PrivateShare

// Save private share to library
POST /api/v3/sharing/share/{token}/save
Body: { custom_name?: string }
Returns: WorkoutTemplate

// Delete private share
DELETE /api/v3/sharing/share/{token}
Returns: { message: string }
```

---

## 🧪 Testing Checklist

After implementation, test:

### Share Modal
- [ ] Opens from workout builder
- [ ] Public share creates shareable link
- [ ] Private share creates private link
- [ ] Copy to clipboard works
- [ ] Anonymous toggle works
- [ ] Expiration options work

### Public Workouts Page
- [ ] Loads and displays workouts
- [ ] Filtering by tags works
- [ ] Sorting works (newest, most viewed, most saved)
- [ ] Pagination works
- [ ] Search works
- [ ] Cards display correctly

### Workout Detail Modal
- [ ] Opens from workout card
- [ ] Displays all workout data
- [ ] Save to library works
- [ ] Custom name works
- [ ] View count increments

### Share Link Handler
- [ ] Valid token loads workout
- [ ] Invalid token shows error
- [ ] Expired token shows error
- [ ] Save to library works

### Mobile Responsiveness
- [ ] All pages work on mobile
- [ ] Modals are usable on mobile
- [ ] Cards stack properly

---

## 🎯 Implementation Order

Recommended order for building:

1. **Share Button** (30 min)
   - Add button to workout builder
   - Wire up click handler

2. **Share Modal** (2-3 hours)
   - Create modal component
   - Implement public share tab
   - Implement private share tab
   - Add copy to clipboard

3. **Public Workouts Page** (3-4 hours)
   - Create HTML page
   - Implement workout cards
   - Add filtering and sorting
   - Add pagination

4. **Workout Detail Modal** (2 hours)
   - Create modal component
   - Display workout data
   - Implement save functionality

5. **Share Link Handler** (1-2 hours)
   - Create share.html page
   - Implement token handling
   - Add save functionality

6. **Navigation** (30 min)
   - Add "Discover Workouts" link
   - Update routing if needed

7. **Testing & Polish** (2-3 hours)
   - Test all features
   - Fix bugs
   - Polish UI/UX

**Total Estimated Time:** 12-16 hours

---

## 🚀 Getting Started

### Step 1: Review Backend
Read these files to understand the API:
- [`backend/api/sharing.py`](backend/api/sharing.py)
- [`WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md`](WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md)

### Step 2: Test API Endpoints
Use Postman or curl to test the API endpoints and understand the data structure.

### Step 3: Start with Share Button
Begin by adding the share button to the workout builder - this is the entry point for users.

### Step 4: Build Incrementally
Build one component at a time, test it, then move to the next.

---

## 📚 Reference Files

### Frontend Architecture
- [`frontend/workout-builder.html`](frontend/workout-builder.html) - Main workout builder
- [`frontend/assets/js/workout-builder.js`](frontend/assets/js/workout-builder.js) - Builder logic
- [`frontend/assets/js/components/modal-manager.js`](frontend/assets/js/components/modal-manager.js) - Modal system
- [`frontend/assets/js/utils/api-client.js`](frontend/assets/js/utils/api-client.js) - API utilities (if exists)

### Backend Reference
- [`backend/api/sharing.py`](backend/api/sharing.py) - API endpoints
- [`backend/models.py`](backend/models.py) - Data models (lines 947-1004)
- [`backend/services/sharing_service.py`](backend/services/sharing_service.py) - Service logic

### Documentation
- [`WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md`](WORKOUT_SHARING_IMPLEMENTATION_COMPLETE.md) - Phase 1 summary
- [`WORKOUT_SHARING_TESTING_CHECKLIST.md`](WORKOUT_SHARING_TESTING_CHECKLIST.md) - Testing guide
- [`WORKOUT_SHARING_SECURITY_RULES.md`](WORKOUT_SHARING_SECURITY_RULES.md) - Security details

---

## 💡 Tips & Best Practices

### Code Organization
- Create reusable components (modals, cards)
- Keep API calls in separate utility functions
- Use async/await for cleaner code

### Error Handling
- Always handle API errors gracefully
- Show user-friendly error messages
- Log errors to console for debugging

### User Experience
- Show loading states during API calls
- Provide feedback for all actions (success/error)
- Make copy-to-clipboard obvious and easy

### Performance
- Implement pagination (don't load all workouts at once)
- Cache workout data when appropriate
- Debounce search input

### Accessibility
- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works

---

## 🎊 Success Criteria

Phase 2 is complete when:

- [ ] Users can share workouts (public and private)
- [ ] Users can browse public workouts
- [ ] Users can save shared workouts to their library
- [ ] Share links work correctly
- [ ] All features work on mobile
- [ ] No console errors
- [ ] UI matches existing design system
- [ ] All test cases pass

---

## 📞 Need Help?

If you get stuck:

1. Review the backend API documentation
2. Check existing frontend components for patterns
3. Test API endpoints with Postman first
4. Look at similar features in the app (e.g., workout builder modals)

---

## 🚀 Ready to Start?

Copy this prompt into a new chat in **Code mode** and begin with Step 1: Add the share button to the workout builder!

**Good luck! 🎉**

---

**Last Updated:** 2025-01-21  
**Version:** 1.0.0  
**Phase:** 2 - Frontend UI