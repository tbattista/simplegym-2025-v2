# Workout Database IA + UX Upgrade Plan (Revised)

> **Status:** Ready for implementation (Codebase Verified)
> **Created:** 2026-01-23
> **Last Verified:** 2026-01-23
> **Based on:** Full codebase analysis + UX requirements discussion

---

## Goal

Transform the Workout List from a flat database list into a **prioritized, mobile-first dashboard** with clear sections:

- **Today** (smart recommendation + starter workout fallback)
- **Favorites** (user-starred workouts)
- **My Workouts** (all templates)

---

## Key Decisions Locked

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Favorites storage | Field on workout document (`is_favorite`, `favorited_at`) | Simpler queries, single read, works with localStorage |
| "Shared With Me" section | **Dropped** | Saved shares become regular workouts; no persistent tracking needed |
| Anonymous favorites | Disabled; prompt to sign up | Reduces complexity; encourages account creation |
| "Today" data source | Pull from WorkoutSession collection | Data already exists; no schema changes needed |
| Empty Today state | Hybrid: CTA + starter workout | Provides "directional energy" for new users |

---

## Codebase Verification Summary

### ✅ Confirmed Existing Infrastructure

| Component | File | Status |
|-----------|------|--------|
| WorkoutTemplate model | `backend/models.py:261-315` | Ready for `is_favorite` field addition |
| WorkoutCard component | `frontend/assets/js/components/workout-card.js` | Has session state support, ready for star toggle |
| WorkoutGrid component | `frontend/assets/js/components/workout-grid.js` | Handles empty states, pagination |
| Session state tracking | `workout-database.js:21-72` | `getWorkoutSessionState()` already works |
| localStorage session | Key: `ghost_gym_active_workout_session` | Used in multiple files |
| Sessions API | `GET /api/v3/workout-sessions?status=completed&page_size=1` | Returns `SessionListResponse` |
| Auth modal | `AuthUI.showAuthModal('signin')` | Available globally via `window.authUI` |
| Data manager update | `dataManager.updateWorkout(id, data)` | Supports partial updates |

### ⚠️ Potential Conflicts to Watch

1. **`modified_date` on favorite toggle**: Currently `updateWorkout` may update `modified_date`. Need to verify backend behavior.
2. **Filter state**: `window.ghostGym.workoutDatabase.filters` is global. New sections should NOT be filtered.
3. **Delete mode**: Only affects My Workouts section. Today/Favorites should remain interactive.

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     WORKOUT DATABASE PAGE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TODAY SECTION                                               │
│  ├─ Check localStorage: ghost_gym_active_workout_session    │
│  │   └─ If exists → Show "Resume" card                      │
│  ├─ Else: GET /api/v3/workout-sessions?status=completed&page_size=1
│  │   └─ If exists → Show "Start Again" card (last completed)│
│  └─ Else: Show empty state + starter workout                │
│                                                              │
│  FAVORITES SECTION                                           │
│  └─ Filter workouts where is_favorite === true              │
│      └─ Sort by favorited_at desc                           │
│                                                              │
│  MY WORKOUTS SECTION                                         │
│  └─ All workouts (existing implementation)                  │
│      └─ Existing sort/filter/search applies                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Files to Modify

| File | Line Range | Changes |
|------|------------|---------|
| `backend/models.py` | 261-315 | Add `is_favorite: bool = False`, `favorited_at: Optional[datetime] = None` |
| `frontend/workout-database.html` | 86-104 | Add section containers for Today, Favorites before existing content |
| `frontend/assets/js/dashboard/workout-database.js` | Throughout | Add section rendering, Today logic, favorites filtering |
| `frontend/assets/js/components/workout-card.js` | 76-143 | Add favorite star button in `_renderDropdownMenu()` area |
| `frontend/assets/js/firebase/data-manager.js` | 656+ | Add `toggleWorkoutFavorite()` method |
| `frontend/assets/css/workout-database.css` | End of file | Section styling, Today card emphasis |

### New Files to Create

| File | Purpose |
|------|---------|
| `frontend/assets/js/components/starter-workout.js` | Default starter workout definition + rendering |

---

## Phase 1: Backend Schema Update

### Task 1.1: Add favorite fields to WorkoutTemplate

**File:** `backend/models.py` (after line 315, before `class ProgramWorkout`)

```python
class WorkoutTemplate(BaseModel):
    """Enhanced workout model for the program system"""

    # ... existing fields (id, name, description, exercise_groups, etc.) ...

    modified_date: datetime = Field(
        default_factory=datetime.now,
        description="When the workout was last modified"
    )

    # NEW: Favorites support (add after modified_date)
    is_favorite: bool = Field(
        default=False,
        description="Whether this workout is marked as a favorite"
    )

    favorited_at: Optional[datetime] = Field(
        default=None,
        description="When the workout was marked as favorite"
    )
```

**Risk Assessment:** LOW - Adding optional fields with defaults won't break existing data.

### Task 1.2: Update data-manager.js for favorites

**File:** `frontend/assets/js/firebase/data-manager.js` (after line 715, after `updateLocalStorageWorkout`)

```javascript
/**
 * Toggle workout favorite status
 * @param {string} workoutId - The workout ID
 * @param {boolean} isFavorite - New favorite state
 * @returns {Promise<Object>} Updated workout
 */
async toggleWorkoutFavorite(workoutId, isFavorite) {
    console.log(`⭐ Toggling favorite for ${workoutId}: ${isFavorite}`);

    const update = {
        is_favorite: isFavorite,
        favorited_at: isFavorite ? new Date().toISOString() : null
    };

    return this.updateWorkout(workoutId, update);
}
```

**Risk Assessment:** LOW - Uses existing `updateWorkout` method which handles both Firestore and localStorage.

### Task 1.3: Verify localStorage compatibility

The existing `updateLocalStorageWorkout` (line 717-750) does a merge update:
```javascript
// This already preserves existing fields while adding new ones
workouts[index] = {
    ...workouts[index],
    ...workoutData,
    id: workoutId,
    created_date: workouts[index].created_date,
    modified_date: new Date().toISOString()
};
```

**Note:** `modified_date` WILL be updated when favoriting. This is acceptable behavior - "last modified" can include metadata changes.

### Acceptance Criteria
- [ ] `is_favorite` and `favorited_at` fields added to WorkoutTemplate model
- [ ] Existing workouts default to `is_favorite: false` (Pydantic default handles this)
- [ ] `toggleWorkoutFavorite()` method added to data-manager.js
- [ ] Verify localStorage fallback works for anonymous users (but feature disabled)
- [ ] No breaking changes to existing workout CRUD operations

---

## Phase 2: Today Section

### Existing Code to Leverage

The workout-database.js already has session state tracking (lines 21-72):
```javascript
let activeSessionWorkoutId = null;

function getWorkoutSessionState(workoutId) {
    if (activeSessionWorkoutId === workoutId) return 'in_progress';
    if (completedWorkoutIds.has(workoutId)) return 'completed';
    return 'never_started';
}

async function loadSessionStates() {
    const persistedSession = localStorage.getItem('ghost_gym_active_workout_session');
    if (persistedSession) {
        const session = JSON.parse(persistedSession);
        if (session.workoutId && session.status === 'in_progress') {
            activeSessionWorkoutId = session.workoutId;
        }
    }
}
```

We can extend this existing pattern rather than creating a separate file.

### Task 2.1: Add Today section logic to workout-database.js

**File:** `frontend/assets/js/dashboard/workout-database.js` (add after line 72, after `loadSessionStates`)

```javascript
/**
 * ============================================
 * TODAY SECTION LOGIC
 * ============================================
 */

/**
 * Get recommendation for Today section
 * Priority: 1) In-progress session, 2) Most recent completed, 3) Empty + starter
 * @returns {Promise<Object>} { type: 'resume'|'start_again'|'empty', workout?, session?, message? }
 */
async function getTodayRecommendation() {
    // 1. Check for in-progress session (already loaded by loadSessionStates)
    if (activeSessionWorkoutId) {
        const workout = window.ghostGym.workoutDatabase.all.find(w => w.id === activeSessionWorkoutId);
        if (workout) {
            const persistedSession = JSON.parse(localStorage.getItem('ghost_gym_active_workout_session') || '{}');
            return {
                type: 'resume',
                workout,
                session: persistedSession,
                message: 'Workout in progress'
            };
        }
    }

    // 2. Get most recent completed session (authenticated users only)
    if (window.authService?.isUserAuthenticated()) {
        try {
            const user = window.firebaseAuth?.currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/v3/workout-sessions?status=completed&page_size=1', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.sessions && data.sessions.length > 0) {
                        const lastSession = data.sessions[0];
                        // Find the workout template in our loaded data
                        const workout = window.ghostGym.workoutDatabase.all.find(w => w.id === lastSession.workout_id);
                        if (workout) {
                            const daysAgo = getDaysAgo(lastSession.completed_at);
                            return {
                                type: 'start_again',
                                workout,
                                session: lastSession,
                                message: daysAgo === 0 ? 'Completed today' :
                                         daysAgo === 1 ? 'Last done yesterday' :
                                         `Last done ${daysAgo} days ago`
                            };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Failed to fetch recent sessions for Today:', e);
        }
    }

    // 3. No history - show empty state
    return { type: 'empty' };
}

/**
 * Calculate days since a date
 * @param {string} dateString - ISO date string
 * @returns {number} Days ago (0 = today)
 */
function getDaysAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    // Reset to midnight for accurate day comparison
    date.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now - date;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

**Risk Assessment:** LOW - This extends existing session tracking, uses same auth pattern as `recent-workouts.js`.

### Task 2.2: Create starter workout definition

**File:** `frontend/assets/js/components/starter-workout.js`

```javascript
/**
 * Default starter workout for new users
 * Read-only; user can "Add to My Workouts" to get editable copy
 */
window.STARTER_WORKOUT = {
    id: '__starter_full_body__',
    name: 'Full Body Starter',
    description: 'A simple full-body routine to get you started. Add to your workouts to customize.',
    isStarterTemplate: true,  // Flag to identify
    is_template: true,
    tags: ['full-body', 'beginner'],
    exercise_groups: [
        {
            group_id: 'starter-1',
            exercises: { a: 'Goblet Squat' },
            sets: '3',
            reps: '10',
            rest: '60s'
        },
        {
            group_id: 'starter-2',
            exercises: { a: 'Push-ups' },
            sets: '3',
            reps: '10',
            rest: '60s'
        },
        {
            group_id: 'starter-3',
            exercises: { a: 'Dumbbell Row' },
            sets: '3',
            reps: '10 each arm',
            rest: '60s'
        },
        {
            group_id: 'starter-4',
            exercises: { a: 'Plank' },
            sets: '3',
            reps: '30s hold',
            rest: '30s'
        }
    ],
    bonus_exercises: [],
    template_notes: [],
    created_date: '2026-01-01T00:00:00Z',
    modified_date: '2026-01-01T00:00:00Z'
};

/**
 * Creates a copy of starter workout owned by user
 */
async function addStarterToMyWorkouts() {
    const copy = { ...window.STARTER_WORKOUT };
    delete copy.id;
    delete copy.isStarterTemplate;
    copy.name = 'Full Body Starter';  // User can rename

    const saved = await window.dataManager.saveWorkout(copy);
    window.showToast?.('Starter workout added to your library!', 'success');
    return saved;
}
```

### Task 2.3: Render Today section in HTML

**File:** `frontend/workout-database.html`

Add before existing workout list:

```html
<!-- Today Section -->
<div id="todaySection" class="mb-4">
    <h6 class="section-header mb-3">
        <i class="bx bx-sun me-1"></i>
        Today
    </h6>
    <div id="todayContent">
        <!-- Populated by JS: resume card, start-again card, or empty state -->
    </div>
</div>

<!-- Favorites Section -->
<div id="favoritesSection" class="mb-4" style="display: none;">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="section-header mb-0">
            <i class="bx bx-star me-1"></i>
            Favorites
        </h6>
        <a href="#" class="small text-muted" id="viewAllFavorites">View all</a>
    </div>
    <div id="favoritesContent">
        <!-- Populated by JS -->
    </div>
</div>

<!-- My Workouts Section (existing, renamed) -->
<div id="myWorkoutsSection" class="mb-3">
    <h6 class="section-header mb-2">
        <i class="bx bx-dumbbell me-1"></i>
        My Workouts
    </h6>
    <p class="text-muted small mb-3">
        Browse and manage your <span id="totalWorkoutsCount">0</span> workout templates
    </p>
    <!-- Existing DataTable Container -->
    <div id="workoutTableContainer"></div>
</div>
```

### Task 2.4: Implement Today rendering

**File:** `frontend/assets/js/dashboard/workout-database.js`

```javascript
async function renderTodaySection() {
    const container = document.getElementById('todayContent');
    const recommendation = await getTodayRecommendation();

    switch (recommendation.type) {
        case 'resume':
            container.innerHTML = renderTodayCard(recommendation.workout, {
                state: 'resume',
                message: recommendation.message,
                sessionId: recommendation.session.id
            });
            break;

        case 'start_again':
            container.innerHTML = renderTodayCard(recommendation.workout, {
                state: 'start',
                message: recommendation.message
            });
            break;

        case 'empty':
            container.innerHTML = renderTodayEmptyState();
            break;
    }
}

function renderTodayCard(workout, options) {
    const buttonText = options.state === 'resume' ? 'Resume Workout' : 'Start Workout';
    const buttonClass = options.state === 'resume' ? 'btn-warning' : 'btn-primary';
    const buttonIcon = options.state === 'resume' ? 'bx-play-circle' : 'bx-play';

    return `
        <div class="card today-card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="card-title mb-1">${workout.name}</h6>
                        <p class="text-muted small mb-0">${options.message}</p>
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn ${buttonClass} flex-grow-1"
                            onclick="startWorkout('${workout.id}')">
                        <i class="bx ${buttonIcon} me-1"></i>
                        ${buttonText}
                    </button>
                    <button class="btn btn-outline-secondary"
                            onclick="openWorkoutDetail('${workout.id}')">
                        <i class="bx bx-show"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderTodayEmptyState() {
    return `
        <div class="today-empty-state">
            <p class="text-muted mb-3">Ready to start your fitness journey?</p>
            <button class="btn btn-primary w-100 mb-3" onclick="window.location.href='/workout-builder.html'">
                <i class="bx bx-plus me-1"></i>
                Create Your First Workout
            </button>

            <div class="text-muted small mb-2">or try our starter template:</div>

            <div class="card starter-workout-card">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${window.STARTER_WORKOUT.name}</h6>
                            <small class="text-muted">
                                ${window.STARTER_WORKOUT.exercise_groups.length} exercises · ~20 min
                            </small>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary"
                                    onclick="previewStarterWorkout()">
                                Preview
                            </button>
                            <button class="btn btn-sm btn-primary"
                                    onclick="startStarterWorkout()">
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

### Acceptance Criteria
- [ ] Today section shows "Resume" for in-progress workouts
- [ ] Today section shows "Start Again" with days-ago for recent completions
- [ ] Today section shows empty state + starter workout for new users
- [ ] Starter workout can be previewed and started
- [ ] Starter workout "Add to My Workouts" creates user-owned copy

---

## Phase 3: Favorites Section

### Existing Code Reference

The workout-card.js `_renderDropdownMenu()` method (lines 76-143) renders a dropdown positioned at `top: 8px; right: 8px`. The favorite star should be positioned to the left of this menu.

### Task 3.1: Add favorite toggle to workout cards

**File:** `frontend/assets/js/components/workout-card.js`

**Step 1:** Add new method `_renderFavoriteButton()` (add after `_renderDropdownMenu`, around line 145):

```javascript
/**
 * Render favorite star toggle button
 * Positioned to the left of the dropdown menu
 */
_renderFavoriteButton() {
    // Don't show for starter template or in delete mode
    if (this.workout.isStarterTemplate || this.config.deleteMode) return '';

    const workoutData = this.workout.workout_data || this.workout;
    const isFavorite = workoutData.is_favorite || false;
    const iconClass = isFavorite ? 'bxs-star' : 'bx-star';
    const colorClass = isFavorite ? 'text-warning' : 'text-muted';

    return `
        <button class="btn btn-sm btn-icon favorite-toggle ${colorClass}"
                data-workout-id="${this.workout.id}"
                data-is-favorite="${isFavorite}"
                title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                style="position: absolute; top: 8px; right: 44px; z-index: 1050;">
            <i class="bx ${iconClass}"></i>
        </button>
    `;
}
```

**Step 2:** Update `render()` method (around line 52) to include the star:

```javascript
// Change this line:
card.innerHTML = `
    <div class="card-body position-relative">
        ${this._renderDropdownMenu()}
        ${this._renderFavoriteButton()}  <!-- ADD THIS LINE -->
        ${this._renderHeader()}
        ...
```

**Step 3:** Add click handler in `_attachEventListeners()` (around line 408):

```javascript
// Add after existing event listeners:
// Favorite toggle handler
const favoriteToggle = this.element.querySelector('.favorite-toggle');
if (favoriteToggle) {
    favoriteToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const workoutId = favoriteToggle.dataset.workoutId;
        const currentState = favoriteToggle.dataset.isFavorite === 'true';
        // Call global handler
        if (window.toggleWorkoutFavorite) {
            window.toggleWorkoutFavorite(e, workoutId, currentState);
        }
    });
}
```

**Risk Assessment:** MEDIUM - Modifying workout-card.js affects all pages using cards. Test on workout-database.html, index.html (dashboard), and any other page with workout cards.

### Task 3.2: Implement toggle handler

**File:** `frontend/assets/js/dashboard/workout-database.js`

```javascript
/**
 * Toggle workout favorite status with optimistic UI
 * @param {Event} event - Click event
 * @param {string} workoutId - Workout ID
 * @param {boolean} currentState - Current favorite state
 */
async function toggleWorkoutFavorite(event, workoutId, currentState) {
    event.stopPropagation();  // Don't trigger card click

    // Check auth using the correct method
    if (!window.authService?.isUserAuthenticated()) {
        // Show auth modal using AuthUI service
        if (window.authUI) {
            window.authUI.showAuthModal('signin');
        }
        if (window.showToast) {
            window.showToast('Sign in to save favorites', 'info');
        }
        return;
    }

    const newState = !currentState;
    const button = event.currentTarget;

    // Optimistic UI update
    const icon = button.querySelector('i');
    icon.className = newState ? 'bx bxs-star' : 'bx bx-star';
    button.classList.toggle('text-warning', newState);
    button.classList.toggle('text-muted', !newState);
    button.dataset.isFavorite = newState;

    try {
        await window.dataManager.toggleWorkoutFavorite(workoutId, newState);

        // Update local state
        const workout = window.ghostGym.workoutDatabase.all.find(w => w.id === workoutId);
        if (workout) {
            workout.is_favorite = newState;
            workout.favorited_at = newState ? new Date().toISOString() : null;
        }

        // Re-render favorites section
        renderFavoritesSection();

    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        // Revert UI
        icon.className = currentState ? 'bx bxs-star' : 'bx bx-star';
        button.classList.toggle('text-warning', currentState);
        button.classList.toggle('text-muted', !currentState);
        button.dataset.isFavorite = currentState;
        window.showToast?.('Failed to update favorite', 'error');
    }
}
```

### Task 3.3: Render Favorites section

**File:** `frontend/assets/js/dashboard/workout-database.js`

```javascript
function renderFavoritesSection() {
    const section = document.getElementById('favoritesSection');
    const container = document.getElementById('favoritesContent');

    const favorites = window.ghostGym.workoutDatabase.all
        .filter(w => w.is_favorite)
        .sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));

    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    // Show max 3 in collapsed view
    const displayFavorites = favorites.slice(0, 3);
    const hasMore = favorites.length > 3;

    container.innerHTML = displayFavorites.map(workout =>
        renderCompactWorkoutCard(workout)
    ).join('');

    // Update "View all" link
    const viewAllLink = document.getElementById('viewAllFavorites');
    if (hasMore) {
        viewAllLink.style.display = 'inline';
        viewAllLink.textContent = `View all (${favorites.length})`;
        viewAllLink.onclick = () => scrollToFavoritesInMainList();
    } else {
        viewAllLink.style.display = 'none';
    }
}

function renderCompactWorkoutCard(workout) {
    const exerciseCount = workout.exercise_groups?.length || 0;

    return `
        <div class="card mb-2 workout-card-compact" onclick="openWorkoutDetail('${workout.id}')">
            <div class="card-body py-2 px-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bx bxs-star text-warning"></i>
                        <span class="fw-medium">${workout.name}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <small class="text-muted">${exerciseCount} exercises</small>
                        <button class="btn btn-sm btn-primary"
                                onclick="event.stopPropagation(); startWorkout('${workout.id}')">
                            Start
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

### Acceptance Criteria
- [ ] Star icon appears on all workout cards (except starter)
- [ ] Tapping star toggles favorite with optimistic UI
- [ ] Anonymous users see auth prompt when tapping star
- [ ] Favorites section appears when user has favorites
- [ ] Favorites section hides when empty
- [ ] "View all" link shows when >3 favorites

---

## Phase 4: Section Styling & Polish

### Task 4.1: Add section CSS

**File:** `frontend/assets/css/workout-database.css`

```css
/* Section Headers */
.section-header {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--bs-secondary);
}

/* Today Section */
#todaySection {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.today-card {
    border-left: 4px solid var(--bs-primary);
}

.today-card.resume {
    border-left-color: var(--bs-warning);
}

.today-empty-state {
    text-align: center;
    padding: 1.5rem 1rem;
}

.starter-workout-card {
    background: var(--bs-light);
    border: 1px dashed var(--bs-border-color);
}

/* Favorites Section */
#favoritesSection {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.workout-card-compact {
    cursor: pointer;
    transition: background-color 0.15s;
}

.workout-card-compact:hover {
    background-color: var(--bs-light);
}

/* Favorite Toggle Button */
.favorite-toggle {
    padding: 0.25rem;
    line-height: 1;
    border: none;
    background: transparent;
}

.favorite-toggle:hover {
    transform: scale(1.1);
}

.favorite-toggle.text-warning {
    color: #ffc107 !important;
}

/* My Workouts Section */
#myWorkoutsSection .section-header {
    margin-bottom: 0.5rem;
}
```

### Task 4.2: Standardize card CTA hierarchy

**Current behavior (keep):**
- Today card: Large primary CTA
- Favorites section: Compact cards with small "Start" button
- My Workouts: Full cards with existing button states

**Ensure consistency:**
- Delete mode continues to work in My Workouts section
- Dropdown menu (⋯) only appears on full cards, not compact favorites cards

### Acceptance Criteria
- [ ] Sections have clear visual hierarchy
- [ ] Today section stands out with left border accent
- [ ] Favorites section is compact but scannable
- [ ] My Workouts section maintains existing functionality
- [ ] Dark mode compatibility (use CSS variables)

---

## Phase 5: Integration & Edge Cases

### Task 5.1: Page load orchestration

**File:** `frontend/assets/js/dashboard/workout-database.js`

Update `initWorkoutDatabase()`:

```javascript
async function initWorkoutDatabase() {
    console.log('🚀 Initializing Workout Database Page');

    // Load workouts first
    await loadWorkouts();

    // Render sections in order
    await renderTodaySection();
    renderFavoritesSection();
    // My Workouts renders via existing loadWorkouts() flow

    // Set up event listeners
    setupEventListeners();

    console.log('✅ Workout Database initialized');
}
```

### Task 5.2: Handle workout deletion

When a workout is deleted:
1. Remove from `all` array
2. Re-render Today section (in case deleted workout was shown there)
3. Re-render Favorites section (in case deleted workout was favorited)
4. Existing My Workouts re-render handles itself

### Task 5.3: Handle session completion

When user completes a workout and returns to database:
1. Today section should update to show next recommendation
2. Listen for `workoutCompleted` event or check on page focus

### Task 5.4: Search/Filter behavior

When user applies filters or search:
- Today section: **Always visible** (not filtered)
- Favorites section: **Always visible** (not filtered)
- My Workouts: Filtered as currently implemented

This maintains "dashboard" feel while allowing deep search.

### Acceptance Criteria
- [ ] Page loads with all sections in correct order
- [ ] Deleting a workout updates all sections
- [ ] Completing a workout updates Today on return
- [ ] Filters only affect My Workouts section
- [ ] No console errors on any state transition

---

## Testing Checklist

### New User Flow
- [ ] Today shows empty state + starter workout
- [ ] Starter workout preview works
- [ ] Starter workout start works (creates session)
- [ ] "Add to My Workouts" creates user-owned copy
- [ ] Favorites section hidden (no favorites)

### Returning User Flow
- [ ] Today shows most recent workout with "days ago" message
- [ ] Tapping "Start Workout" navigates to workout mode
- [ ] Favorites show if user has any
- [ ] Star toggle works with optimistic UI

### In-Progress Session Flow
- [ ] Today shows "Resume" for active session
- [ ] "Resume Workout" returns to correct session state
- [ ] After completing, Today updates on page return

### Anonymous User Flow
- [ ] Star toggle prompts sign-in
- [ ] Toast message explains why
- [ ] Rest of page functions normally

### Delete Mode Flow
- [ ] Delete mode only affects My Workouts section
- [ ] Today and Favorites sections remain interactive
- [ ] Deleting favorited workout removes from Favorites section

---

## Files Changed Summary (Verified)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `backend/models.py` | Modify | 315 | Add `is_favorite`, `favorited_at` fields after `modified_date` |
| `frontend/workout-database.html` | Modify | 86-104 | Add section containers before existing content |
| `frontend/assets/js/dashboard/workout-database.js` | Modify | Multiple | Add section logic, Today, favorites (~200 new lines) |
| `frontend/assets/js/components/workout-card.js` | Modify | 52, 145, 408 | Add `_renderFavoriteButton()` method and handler |
| `frontend/assets/js/firebase/data-manager.js` | Modify | 715+ | Add `toggleWorkoutFavorite()` method |
| `frontend/assets/css/workout-database.css` | Modify | End | Add section styling (~70 new lines) |
| `frontend/assets/js/components/starter-workout.js` | **Create** | New | Starter workout definition + helper functions |

**Note:** `workout-sections.js` was removed from scope - all logic consolidated into `workout-database.js`.

---

## Implementation Order (Critical Path)

```
1. backend/models.py              ← No dependencies, do first
   └─ Add is_favorite, favorited_at fields

2. data-manager.js                ← Depends on #1
   └─ Add toggleWorkoutFavorite() method

3. workout-database.html          ← No JS dependencies
   └─ Add section HTML containers

4. starter-workout.js             ← No dependencies
   └─ Create file with STARTER_WORKOUT constant

5. workout-database.js            ← Depends on #2, #3, #4
   └─ Add Today logic
   └─ Add Favorites logic
   └─ Update initWorkoutDatabase()

6. workout-card.js                ← Depends on #5 (needs toggleWorkoutFavorite)
   └─ Add _renderFavoriteButton()
   └─ Add event handler

7. workout-database.css           ← No dependencies, can do anytime
   └─ Add section styling
```

---

## Potential Breaking Changes

| Change | Risk | Mitigation |
|--------|------|------------|
| WorkoutTemplate model change | LOW | Pydantic defaults handle existing data |
| workout-card.js modification | MEDIUM | Card used on multiple pages - test thoroughly |
| localStorage session format | NONE | No changes to existing format |
| API endpoints | NONE | Using existing endpoints only |

---

## Out of Scope (Future Phases)

1. **"Most used" sorting** - Requires usage tracking on WorkoutTemplate
2. **Shared workout provenance** - Track `source_workout_id` for imported workouts
3. **Today scheduling** - Let users "plan" workouts for specific days
4. **Section collapse/expand** - Let users minimize sections they don't use
5. **Onboarding flow** - Guided tutorial for new users

---

## Success Metrics

After implementation, the Workout List should feel like:

> **A training dashboard with momentum**

Not:

> **A database list of templates**

Qualitative signals:
- User immediately sees what to do next (Today section)
- Favorite workouts are one tap away
- New users have a clear starting point
- Page feels organized, not overwhelming
