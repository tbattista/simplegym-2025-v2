# Exercise Database Architecture Documentation
## Ghost Gym V2 - File Structure & Developer Guide

**Last Updated:** October 21, 2024  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [HTML Pages](#html-pages)
4. [JavaScript Modules](#javascript-modules)
5. [CSS Styling](#css-styling)
6. [Data Flow](#data-flow)
7. [Common Tasks Guide](#common-tasks-guide)
8. [Recent Changes](#recent-changes)

---

## 🎯 Overview

The Exercise Database is now a **standalone page** separate from the main dashboard. This architecture document explains where everything is located and how to make common edits.

### Key Principles

- **Single Source of Truth**: Exercise database exists only in `exercise-database.html`
- **Shared Services**: Uses global `ExerciseCacheService` for data management
- **Modular JavaScript**: Code organized by responsibility in `dashboard/exercises.js`
- **Consistent Styling**: Uses shared CSS from `exercise-database.css`

---

## 📁 File Structure

```
frontend/
├── exercise-database.html          # Standalone exercise database page
├── dashboard.html                  # Main dashboard (NO exercise DB here)
│
├── assets/
│   ├── css/
│   │   ├── exercise-database.css   # Exercise DB specific styles
│   │   ├── exercise-autocomplete.css
│   │   └── ghost-gym-custom.css
│   │
│   └── js/
│       ├── dashboard/
│       │   ├── exercises.js        # Main exercise database logic (1,058 lines)
│       │   ├── core.js            # Dashboard initialization
│       │   ├── programs.js
│       │   ├── workouts.js
│       │   ├── ui-helpers.js
│       │   └── views.js
│       │
│       ├── services/
│       │   └── exercise-cache-service.js  # Global exercise data cache
│       │
│       ├── components/
│       │   └── exercise-autocomplete.js   # Reusable autocomplete
│       │
│       └── firebase/
│           ├── auth-service.js
│           ├── data-manager.js
│           └── sync-manager.js
```

---

## 🌐 HTML Pages

### `exercise-database.html` (419 lines)

**Purpose:** Standalone exercise database page with sidebar filters

**Key Sections:**
- **Lines 8-82:** Head section with Firebase initialization
- **Lines 89-155:** Sidebar menu navigation
- **Lines 161-196:** Top navbar with search
- **Lines 204-221:** Page header with action buttons
- **Lines 224-318:** Sidebar filters (Sort, Muscle Group, Equipment, Difficulty, Checkboxes)
- **Lines 320-349:** Exercise grid/list display area
- **Lines 384-404:** Exercise detail modal
- **Lines 406-418:** Script includes

**Filter Controls (Sidebar Layout):**
```html
<!-- Line 238 --> <select id="sortBySelect">
<!-- Line 248 --> <select id="muscleGroupFilter">
<!-- Line 257 --> <select id="equipmentFilter">
<!-- Line 266 --> <select id="difficultyFilter">
<!-- Line 278 --> <input type="checkbox" id="showFavoritesOnly">
<!-- Line 284 --> <input type="checkbox" id="showCustomOnly">
```

**Action Buttons:**
```html
<!-- Line 213 --> <button id="refreshExercisesBtn">
<!-- Line 216 --> <button id="addCustomExerciseBtn">
<!-- Line 292 --> <button id="clearFiltersBtn">
```

### `dashboard.html` (1,152 lines)

**Purpose:** Main dashboard for programs and workouts

**Exercise Database Integration:**
- **Line 172-177:** Menu link to `exercise-database.html` (external page)
- **Lines 915-935:** Exercise Detail Modal (shared modal, still in dashboard)
- **Lines 937-994:** Custom Exercise Modal (shared modal, still in dashboard)
- **Line 1133:** Exercise Cache Service script
- **NO embedded exercise database view** (removed in refactoring)

---

## 💻 JavaScript Modules

### `dashboard/exercises.js` (1,058 lines)

**Purpose:** Complete exercise database functionality

**Main Functions:**

#### Data Loading (Lines 10-163)
```javascript
loadExercises()              // Line 10  - Load all exercises from API
loadExerciseFavorites()      // Line 82  - Load user's favorites
loadCustomExercises()        // Line 135 - Load custom exercises
loadExerciseFilterOptions()  // Line 168 - Populate filter dropdowns
```

#### Filtering & Sorting (Lines 222-361)
```javascript
filterExercises()            // Line 222 - Apply all filters
sortExercises()              // Line 321 - Sort by name/popularity/favorites
clearExerciseFilters()       // Line 743 - Reset all filters
```

#### UI Rendering (Lines 366-490)
```javascript
renderExerciseTable()        // Line 366 - Render table with pagination
createExerciseTableRow()     // Line 413 - Create single table row
showExerciseDetails()        // Line 555 - Show exercise detail modal
showExerciseLoading()        // Line 791 - Show/hide loading state
```

#### Pagination (Lines 617-731)
```javascript
updatePagination()           // Line 617 - Render pagination controls
goToPage()                   // Line 722 - Navigate to specific page
handleEntriesPerPageChange() // Line 806 - Change page size
```

#### Favorites (Lines 495-550)
```javascript
toggleExerciseFavorite()     // Line 495 - Add/remove favorite
```

#### Custom Exercises (Lines 863-954)
```javascript
showCustomExerciseModal()    // Line 863 - Show modal
saveCustomExercise()         // Line 876 - Save to API
```

#### Export (Lines 814-858)
```javascript
exportExercises()            // Line 814 - Export to CSV
```

#### Cache Management (Lines 959-986)
```javascript
getExerciseCache()           // Line 959 - Get from localStorage
setExerciseCache()           // Line 969 - Save to localStorage
isExerciseCacheValid()       // Line 982 - Check cache validity
```

### `services/exercise-cache-service.js` (439 lines)

**Purpose:** Global singleton for exercise data caching

**Key Features:**
- Request deduplication (multiple calls share same promise)
- 7-day cache duration
- Lazy loading
- Performance metrics tracking

**Main Methods:**
```javascript
loadExercises(forceRefresh)  // Line 53  - Load with deduplication
searchExercises(query, opts) // Line 213 - Search with ranking
getExerciseById(id)          // Line 313 - Get single exercise
clearCache()                 // Line 378 - Clear localStorage
getStatus()                  // Line 403 - Get cache status
```

### `components/exercise-autocomplete.js` (473 lines)

**Purpose:** Reusable exercise search autocomplete

**Usage:**
```javascript
const autocomplete = initExerciseAutocomplete(inputElement, {
    minChars: 2,
    maxResults: 20,
    showTier: true,
    preferFoundational: false,
    onSelect: (exercise) => { /* handle selection */ }
});
```

---

## 🎨 CSS Styling

### `exercise-database.css` (489 lines)

**Purpose:** All exercise database specific styles

**Key Sections:**

#### DataTable Styles (Lines 10-58)
```css
.datatable-table              /* Table container */
.datatable-table thead th     /* Table headers */
.datatable-table tbody td     /* Table cells */
.datatable-table tbody tr:hover /* Row hover effect */
```

#### Filter Bar (Lines 64-92)
```css
.form-select-sm               /* Filter dropdowns */
.form-check-inline            /* Filter checkboxes */
```

#### Badges (Lines 124-188)
```css
.badge.bg-label-primary       /* Muscle group badges */
.badge.bg-label-secondary     /* Equipment badges */
.badge.bg-label-info          /* Difficulty badges */
.badge.bg-warning             /* Foundation tier badge */
```

#### Favorite Button (Lines 191-223)
```css
.favorite-btn                 /* Heart icon button */
.favorite-btn.favorited       /* Active favorite state */
```

#### Pagination (Lines 243-282)
```css
.pagination-sm .page-link     /* Pagination buttons */
.pagination .page-item.active /* Active page */
```

#### Loading States (Lines 286-305)
```css
#exerciseLoadingState         /* Loading spinner */
#exerciseEmptyState           /* No results message */
```

#### Responsive Design (Lines 323-404)
- Tablet breakpoint: `@media (max-width: 991.98px)`
- Mobile breakpoint: `@media (max-width: 767.98px)`

---

## 🔄 Data Flow

### Exercise Loading Flow

```
1. Page Load
   └─> exercises.js: loadExercises()
       └─> exercise-cache-service.js: loadExercises()
           ├─> Check localStorage cache (7-day validity)
           ├─> If valid: Return cached data
           └─> If invalid: Fetch from API
               └─> /api/v3/exercises (paginated, 500 per page)
                   └─> Cache results in localStorage
                       └─> Return exercises

2. User Authentication
   └─> exercises.js: loadExerciseFavorites()
       └─> /api/v3/users/me/favorites
           └─> Update favorites Set
   └─> exercises.js: loadCustomExercises()
       └─> /api/v3/users/me/exercises
           └─> Merge with global exercises

3. Filter Application
   └─> exercises.js: filterExercises()
       ├─> Read filter state from UI
       ├─> Apply search filter (fuzzy matching)
       ├─> Apply category filters (muscle, equipment, difficulty)
       ├─> Apply checkbox filters (favorites, custom, foundational)
       └─> Apply sorting
           └─> renderExerciseTable()
               ├─> Get current page from pagination
               ├─> Create table rows
               └─> Update pagination controls
```

### Favorite Toggle Flow

```
User clicks heart icon
└─> exercises.js: toggleExerciseFavorite(exerciseId)
    ├─> Check authentication
    ├─> If favorited: DELETE /api/v3/users/me/favorites/{id}
    └─> If not favorited: POST /api/v3/users/me/favorites
        └─> Update local favorites Set
            └─> Re-render table
                └─> Update stats display
```

---

## 📝 Common Tasks Guide

### How to Add a New Filter

**1. Add HTML control in `exercise-database.html`:**
```html
<!-- Around line 273 -->
<div class="mb-4">
  <label class="form-label fw-semibold">Your Filter</label>
  <select class="form-select" id="yourFilter">
    <option value="">All Options</option>
  </select>
</div>
```

**2. Add to filter state in `exercises.js`:**
```javascript
// Line 234 - Add to filters object
window.ghostGym.exercises.filters = {
    // ... existing filters
    yourFilter: yourFilterSelect?.value || ''
};
```

**3. Apply filter logic in `filterExercises()`:**
```javascript
// Around line 280
if (window.ghostGym.exercises.filters.yourFilter) {
    allExercises = allExercises.filter(e => 
        e.yourProperty === window.ghostGym.exercises.filters.yourFilter
    );
}
```

**4. Add event listener in `exercises.js`:**
```javascript
// Around line 170 (in initEventListeners or similar)
document.getElementById('yourFilter')?.addEventListener('change', filterExercises);
```

### How to Modify Table Columns

**1. Update table header in `exercise-database.html`:**
```html
<!-- Line 615 in dashboard.html or similar in exercise-database.html -->
<thead class="table-light">
  <tr>
    <th>Exercise Name</th>
    <th>Your New Column</th>
    <!-- ... -->
  </tr>
</thead>
```

**2. Update row creation in `exercises.js`:**
```javascript
// Line 439 in createExerciseTableRow()
tr.innerHTML = `
    <td>${exercise.name}</td>
    <td>${exercise.yourNewProperty || '-'}</td>
    <!-- ... -->
`;
```

### How to Change Pagination Size

**1. Update dropdown options in HTML:**
```html
<!-- Line 495 in dashboard.html -->
<select id="entriesPerPageSelect">
  <option value="25">25</option>
  <option value="50" selected>50</option>
  <option value="100">100</option>
  <option value="250">250</option>
  <option value="500">500</option> <!-- Add new option -->
</select>
```

**2. Default page size is set in `exercises.js`:**
```javascript
// Line 377
window.ghostGym.exercises.pageSize = parseInt(entriesSelect.value) || 50;
```

### How to Add a New Sort Option

**1. Add option to dropdown:**
```html
<!-- Line 238 in exercise-database.html -->
<select id="sortBySelect">
  <option value="name">Alphabetical (A-Z)</option>
  <option value="popularity">Most Popular</option>
  <option value="favorites">My Favorites First</option>
  <option value="yourSort">Your Sort Option</option>
</select>
```

**2. Add sort logic in `sortExercises()`:**
```javascript
// Line 324 in exercises.js
switch (window.ghostGym.exercises.filters.sortBy) {
    case 'name':
        // existing code
        break;
    case 'yourSort':
        sorted.sort((a, b) => {
            // Your sorting logic
            return a.yourProperty - b.yourProperty;
        });
        break;
}
```

### How to Customize Exercise Card/Row Display

**Location:** `exercises.js` line 413 - `createExerciseTableRow()`

**Example - Add custom badge:**
```javascript
// Around line 430
let customBadge = '';
if (exercise.yourCondition) {
    customBadge = '<span class="badge bg-success">Your Badge</span>';
}

// Add to innerHTML around line 442
tr.innerHTML = `
    <td>
        ${exercise.name}
        ${customBadge}
    </td>
    <!-- ... -->
`;
```

### How to Add Custom Exercise Fields

**1. Update modal form in `dashboard.html`:**
```html
<!-- Around line 950 -->
<div class="mb-3">
  <label for="customYourField" class="form-label">Your Field</label>
  <input type="text" class="form-control" id="customYourField">
</div>
```

**2. Update save function in `exercises.js`:**
```javascript
// Line 888 in saveCustomExercise()
const exerciseData = {
    name: document.getElementById('customExerciseName')?.value?.trim(),
    // ... existing fields
    yourField: document.getElementById('customYourField')?.value?.trim() || null
};
```

### How to Change Cache Duration

**Location:** `exercise-cache-service.js` line 24

```javascript
// Change from 7 days to your desired duration
this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Examples:
// 1 day:  1 * 24 * 60 * 60 * 1000
// 1 hour: 1 * 60 * 60 * 1000
// 30 min: 30 * 60 * 1000
```

---

## 🔄 Recent Changes

### October 21, 2024 - HTML Consolidation

**Changes Made:**
1. ✅ Removed duplicate exercise database from `dashboard.html` (lines 464-651 deleted)
2. ✅ Updated dashboard menu to link to `exercise-database.html` (line 172-177)
3. ✅ Removed `exercises.js` script reference from dashboard (line 1143 deleted)
4. ✅ Updated `exercise-database.html` to properly include `exercises.js` (line 419)
5. ✅ Added `exercise-cache-service.js` dependency to `exercise-database.html` (line 417)

**Result:**
- Dashboard reduced from 1,340 lines to 1,152 lines (188 lines removed)
- Exercise database now exists only in standalone page
- Cleaner separation of concerns
- Easier to maintain and edit

**Files Modified:**
- `frontend/dashboard.html` - Removed embedded exercise view
- `frontend/exercise-database.html` - Updated script includes

---

## 🚀 Future Refactoring Plan

### Phase 1: JavaScript Modularization (Planned)

Break down `exercises.js` (1,058 lines) into focused modules:

```
frontend/assets/js/exercise-database/
├── api.js           # API calls & data loading (~150 lines)
├── filters.js       # Filter logic & state (~200 lines)
├── pagination.js    # Pagination logic (~150 lines)
├── ui-renderer.js   # DOM manipulation (~250 lines)
├── favorites.js     # Favorites management (~100 lines)
└── main.js          # Orchestrator (~150 lines)
```

**Benefits:**
- Easier to test individual modules
- Better code organization
- Faster to locate and edit specific functionality
- Reduced file size for better performance

### Phase 2: Shared Components (Planned)

Extract reusable components:
- Filter bar component (used in multiple views)
- Exercise table component (reusable across pages)
- Stats card component (favorites, custom, showing counts)

---

## 📞 Quick Reference

### File Locations Cheat Sheet

| What You Want to Edit | File Location | Line Range |
|----------------------|---------------|------------|
| Exercise table HTML | `exercise-database.html` | 320-349 |
| Filter sidebar HTML | `exercise-database.html` | 224-318 |
| Table rendering logic | `exercises.js` | 366-490 |
| Filter logic | `exercises.js` | 222-316 |
| Pagination logic | `exercises.js` | 617-731 |
| Favorites logic | `exercises.js` | 495-550 |
| Custom exercise modal | `dashboard.html` | 937-994 |
| Table styles | `exercise-database.css` | 10-58 |
| Filter styles | `exercise-database.css` | 64-92 |
| Badge styles | `exercise-database.css` | 124-188 |
| Cache service | `exercise-cache-service.js` | 1-439 |
| Autocomplete component | `exercise-autocomplete.js` | 1-473 |

### Element ID Reference

| Element | ID | Purpose |
|---------|----|---------| 
| Sort dropdown | `sortBySelect` | Sort exercises |
| Muscle filter | `muscleGroupFilter` | Filter by muscle |
| Equipment filter | `equipmentFilter` | Filter by equipment |
| Difficulty filter | `difficultyFilter` | Filter by difficulty |
| Tier filter | `tierFilter` | Filter by tier (1/2/3) |
| Search input | `exerciseSearch` | Search exercises |
| Favorites checkbox | `showFavoritesOnly` | Show only favorites |
| Custom checkbox | `showCustomOnly` | Show only custom |
| Foundational checkbox | `showFoundationalOnly` | Show only foundational |
| Clear button | `clearFiltersBtn` | Reset all filters |
| Refresh button | `refreshExercisesBtn` | Reload from API |
| Add custom button | `addCustomExerciseBtn` | Open custom modal |
| Table body | `exerciseTableBody` | Exercise rows container |
| Pagination info | `paginationInfo` | "Showing X to Y of Z" |
| Pagination controls | `paginationControls` | Page number buttons |
| Page size dropdown | `entriesPerPageSelect` | Entries per page |

---

## 📚 Additional Resources

- **API Documentation:** See backend API docs for endpoint details
- **Firebase Setup:** `FIREBASE_SETUP_GUIDE.md`
- **Deployment Guide:** `RAILWAY_DEPLOYMENT.md`
- **Performance Optimization:** `PERFORMANCE_OPTIMIZATION_SUMMARY.md`

---

**Document Maintained By:** Ghost Gym Development Team  
**For Questions:** Refer to code comments or create an issue