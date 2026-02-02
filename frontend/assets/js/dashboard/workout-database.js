/**
 * Ghost Gym Dashboard - Workout Database Module
 * Handles workout library display, filtering, sorting, and actions
 * @version 3.0.0 - Refactored to use shared components (WorkoutGrid, WorkoutDetailOffcanvas)
 *
 * NOTE: Core utility functions (escapeHtml, formatDate, truncateText, showLoading)
 * are now loaded from common-utils.js
 */

/**
 * ============================================
 * SHARED COMPONENT INSTANCES
 * ============================================
 */

let workoutGrid = null;
let workoutDetailOffcanvas = null;
let isLoadingWorkouts = false;
let componentsInitialized = false;

// Session state cache for smart button labels
let activeSessionWorkoutId = null;
let completedWorkoutIds = new Set();

/**
 * ============================================
 * TOOLBAR SORT OPTIONS
 * ============================================
 */

const SORT_OPTIONS = [
    { value: 'modified_date', label: 'Newest', icon: 'bx-sort-alt-2' },
    { value: 'created_date', label: 'Created', icon: 'bx-calendar-plus' },
    { value: 'name', label: 'A-Z', icon: 'bx-sort-a-z' },
    { value: 'exercise_count', label: 'Exercises', icon: 'bx-list-ol' }
];

let currentSortIndex = 0;

/**
 * ============================================
 * SESSION STATE MANAGEMENT
 * ============================================
 */

/**
 * Get session state for a workout (for smart button labels)
 * @param {string} workoutId - The workout ID to check
 * @returns {string} 'in_progress', 'completed', or 'never_started'
 */
function getWorkoutSessionState(workoutId) {
    // Check if this workout has an active session
    if (activeSessionWorkoutId === workoutId) {
        return 'in_progress';
    }

    // Check if this workout was recently completed
    if (completedWorkoutIds.has(workoutId)) {
        return 'completed';
    }

    return 'never_started';
}

/**
 * Load session state from localStorage and recent sessions
 */
async function loadSessionStates() {
    try {
        // Check for active session in localStorage
        const persistedSession = localStorage.getItem('ffn_active_workout_session');
        if (persistedSession) {
            const session = JSON.parse(persistedSession);
            if (session.workoutId && session.status === 'in_progress') {
                activeSessionWorkoutId = session.workoutId;
                console.log('📍 Found active session for workout:', activeSessionWorkoutId);
            }
        }

        // Note: For completed workouts, we could query the API, but for now
        // we'll keep it simple and only show in_progress state.
        // The completed state can be added later with an API call to /api/v3/workout-sessions

    } catch (error) {
        console.warn('⚠️ Could not load session states:', error);
    }
}

/**
 * ============================================
 * FAVORITES SECTION LOGIC
 * ============================================
 */

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
    icon.className = newState ? 'bx bxs-heart' : 'bx bx-heart';
    button.classList.toggle('text-danger', newState);
    button.dataset.isFavorite = newState;

    try {
        await window.dataManager.toggleWorkoutFavorite(workoutId, newState);

        // Update local state
        const workout = window.ffn.workoutDatabase.all.find(w => w.id === workoutId);
        if (workout) {
            workout.is_favorite = newState;
            workout.favorited_at = newState ? new Date().toISOString() : null;
        }

        // Re-render favorites section
        renderFavoritesSection();

        // Show feedback
        if (window.showToast) {
            window.showToast(newState ? 'Added to favorites' : 'Removed from favorites', 'success');
        }

    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        // Revert UI
        icon.className = currentState ? 'bx bxs-heart' : 'bx bx-heart';
        button.classList.toggle('text-danger', currentState);
        button.dataset.isFavorite = currentState;
        window.showToast?.('Failed to update favorite', 'error');
    }
}

/**
 * Render the Favorites section
 */
function renderFavoritesSection() {
    const section = document.getElementById('favoritesSection');
    const container = document.getElementById('favoritesContent');

    if (!section || !container) return;

    // Hide section if favorites filter is active (redundant cards)
    if (window.ffn.workoutDatabase.filters.favoritesOnly) {
        section.style.display = 'none';
        return;
    }

    const favorites = window.ffn.workoutDatabase.all
        .filter(w => w.is_favorite)
        .sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));

    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    // Show max 3 in collapsed view
    const displayFavorites = favorites.slice(0, 3);

    container.innerHTML = displayFavorites.map(workout =>
        renderCompactWorkoutCard(workout)
    ).join('');

    // Always show "View all" link when there are favorites
    const viewAllLink = document.getElementById('viewAllFavorites');
    if (viewAllLink) {
        viewAllLink.style.display = 'inline';
        viewAllLink.textContent = `View all (${favorites.length})`;
        viewAllLink.onclick = (e) => {
            e.preventDefault();
            filterFavoritesOnly();
        };
    }
}

/**
 * Render a compact workout card for favorites section
 */
function renderCompactWorkoutCard(workout) {
    const exerciseCount = workout.exercise_groups?.length || 0;

    return `
        <div class="card mb-2 workout-card-compact" onclick="viewWorkoutDetails('${workout.id}')">
            <div class="card-body py-3 px-3">
                <div class="d-flex align-items-center gap-2">
                    <i class="bx bxs-heart text-danger"></i>
                    <div>
                        <span class="fw-medium">${workout.name}</span>
                        <small class="text-muted d-block">${exerciseCount} exercises</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Filter to show only favorites in the main grid
 * @param {boolean} enabled - Whether to enable or disable favorites filter
 */
function filterFavoritesOnly(enabled = true) {
    console.log('⭐ Favorites filter:', enabled ? 'enabled' : 'disabled');

    // Update filter state
    window.ffn.workoutDatabase.filters.favoritesOnly = enabled;

    // Sync the toggle in offcanvas
    const toggle = document.getElementById('favoritesFilterToggle');
    if (toggle) {
        toggle.checked = enabled;
    }

    // Apply filters (will hide favorites section when enabled)
    filterWorkouts();

    // Re-render favorites section
    renderFavoritesSection();

    // Update filter badge
    updateFilterBadge();
}

/**
 * Handle favorites filter toggle change from offcanvas
 */
function handleFavoritesFilterToggle(e) {
    const enabled = e.target.checked;
    filterFavoritesOnly(enabled);
}

/**
 * ============================================
 * DATA LOADING
 * ============================================
 */

/**
 * Load all workouts from API
 */
async function loadWorkouts() {
    // Prevent multiple simultaneous loads
    if (isLoadingWorkouts) {
        console.log('⏳ Already loading workouts, skipping...');
        return;
    }
    
    isLoadingWorkouts = true;
    
    try {
        console.log('📡 Loading workouts from data manager...');

        // Initialize components first if not already done
        if (!componentsInitialized) {
            initializeComponents();
        }

        // Show loading state via grid component
        if (workoutGrid) {
            workoutGrid.showLoading();
        }

        // Load session states for smart button labels
        await loadSessionStates();

        // Always load fresh data from data manager to ensure we have the latest
        if (!window.dataManager || !window.dataManager.getWorkouts) {
            throw new Error('Data manager not available');
        }

        // Load workouts directly from data manager
        const workouts = await window.dataManager.getWorkouts();
        console.log(`✅ Loaded ${workouts.length} workouts from data manager`);
        
        // Update both global state and local state
        window.ffn = window.ffn || {};
        window.ffn.workouts = workouts;
        window.ffn.workoutDatabase.all = workouts;
        window.ffn.workoutDatabase.stats.total = workouts.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
        }
        
        // Load tag options
        loadTagOptions();
        
        // Apply filters and render
        filterWorkouts();
        
    } catch (error) {
        console.error('❌ Failed to load workouts:', error);
        
        // Use grid's empty state instead of destroying HTML
        if (workoutGrid) {
            workoutGrid.setData([]); // Shows empty state
        }
        
        // Show alert for user feedback
        if (window.showAlert) {
            window.showAlert('Failed to load workouts: ' + error.message, 'danger');
        }
    } finally {
        isLoadingWorkouts = false;
    }
}

/**
 * Load available tags and render filter UI
 */
function loadTagOptions() {
    // Get all unique tags
    const tagSet = new Set();
    window.ffn.workoutDatabase.all.forEach(workout => {
        (workout.tags || []).forEach(tag => tagSet.add(tag));
    });
    
    const tags = Array.from(tagSet).sort();
    
    console.log(`✅ Loaded ${tags.length} unique tags`);
    
    // Render tags in offcanvas
    renderTagFilterCheckboxes(tags);
    
    // Update stats display
    updateStatsDisplay();
}

/**
 * Render tag filter checkboxes in offcanvas
 */
function renderTagFilterCheckboxes(tags) {
    const container = document.getElementById('tagsFilterContainer');
    if (!container) return;
    
    if (tags.length === 0) {
        container.innerHTML = '<p class="text-muted small">No tags available</p>';
        return;
    }
    
    // Build checkbox HTML
    let html = '<div class="tags-list" style="max-height: 200px; overflow-y: auto;">';
    
    tags.forEach(tag => {
        const isChecked = window.ffn.workoutDatabase.filters.tags.includes(tag);
        html += `
            <div class="form-check mb-2">
                <input class="form-check-input tag-filter-checkbox"
                       type="checkbox"
                       value="${tag}"
                       id="tag_${tag.replace(/\s+/g, '_')}"
                       ${isChecked ? 'checked' : ''}>
                <label class="form-check-label" for="tag_${tag.replace(/\s+/g, '_')}">
                    <span class="badge bg-label-primary">${tag}</span>
                </label>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Attach event listeners to checkboxes
    container.querySelectorAll('.tag-filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleTagFilterChange);
    });
    
    console.log('✅ Tag filter checkboxes rendered');
}

/**
 * Handle tag filter checkbox change
 */
function handleTagFilterChange(e) {
    const tag = e.target.value;
    const isChecked = e.target.checked;
    
    if (isChecked) {
        // Add tag to filters
        if (!window.ffn.workoutDatabase.filters.tags.includes(tag)) {
            window.ffn.workoutDatabase.filters.tags.push(tag);
        }
    } else {
        // Remove tag from filters
        window.ffn.workoutDatabase.filters.tags =
            window.ffn.workoutDatabase.filters.tags.filter(t => t !== tag);
    }
    
    console.log('🏷️ Tag filters updated:', window.ffn.workoutDatabase.filters.tags);
    
    // Apply filters in real-time
    filterWorkouts();
    
    // Update visual feedback
    updateFilterBadge();
}

/**
 * Update stats display in offcanvas
 */
function updateStatsDisplay() {
    const totalCountEl = document.getElementById('totalCount');
    const showingCountEl = document.getElementById('showingCount');
    
    if (totalCountEl) {
        totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
    }
    
    if (showingCountEl) {
        const showingCount = window.ffn.workoutDatabase.filtered?.length ||
                            window.ffn.workoutDatabase.all.length;
        showingCountEl.textContent = showingCount;
        window.ffn.workoutDatabase.stats.showing = showingCount;
    }
}

/**
 * Update filter button badge to show active filters
 */
function updateFilterBadge() {
    const selectedTags = window.ffn.workoutDatabase.filters.tags || [];
    const activeFilterCount = selectedTags.length;
    
    // Update filter button in bottom action bar if it exists
    const filterBtn = document.querySelector('[data-action="btn-0"]');
    if (filterBtn && window.bottomActionBar) {
        if (activeFilterCount > 0) {
            window.bottomActionBar.updateButton('btn-0', {
                badge: activeFilterCount
            });
        } else {
            window.bottomActionBar.updateButton('btn-0', {
                badge: null
            });
        }
    }
}

/**
 * Initialize Sort By popover
 */
function initializeSortByPopover() {
    const sortByBtn = document.getElementById('sortByBtn');
    if (!sortByBtn) return;
    
    const sortOptions = [
        { value: 'modified_date', label: 'Recently Modified' },
        { value: 'created_date', label: 'Recently Created' },
        { value: 'name', label: 'Alphabetical (A-Z)' },
        { value: 'exercise_count', label: 'Most Exercises' }
    ];
    
    const popoverContent = `
        <div class="sort-popover-content">
            ${sortOptions.map(opt => `
                <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start sort-option"
                        data-value="${opt.value}">
                    ${opt.label}
                </button>
            `).join('')}
        </div>
    `;
    
    const popover = new bootstrap.Popover(sortByBtn, {
        content: popoverContent,
        html: true,
        sanitize: false
    });
    
    // Handle sort option clicks
    sortByBtn.addEventListener('shown.bs.popover', () => {
        document.querySelectorAll('.sort-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                const label = sortOptions.find(opt => opt.value === value)?.label;
                
                // Update button text
                document.getElementById('sortByText').textContent = label;
                
                // Update filter and apply
                window.ffn.workoutDatabase.filters.sortBy = value;
                filterWorkouts();
                
                // Hide popover
                popover.hide();
            });
        });
    });
}

/**
 * Initialize Tags popover
 */
function initializeTagsPopover(tags) {
    const tagsBtn = document.getElementById('tagsBtn');
    if (!tagsBtn) return;
    
    const popoverContent = `
        <div class="tags-popover-content">
            <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start tag-option"
                    data-value="">
                All Tags
            </button>
            ${tags.map(tag => `
                <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start tag-option"
                        data-value="${tag}">
                    ${tag}
                </button>
            `).join('')}
        </div>
    `;
    
    const popover = new bootstrap.Popover(tagsBtn, {
        content: popoverContent,
        html: true,
        sanitize: false
    });
    
    // Handle tag option clicks
    tagsBtn.addEventListener('shown.bs.popover', () => {
        document.querySelectorAll('.tag-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                const label = value || 'All Tags';
                
                // Update button text
                document.getElementById('tagsText').textContent = label;
                
                // Update filter and apply
                window.ffn.workoutDatabase.filters.tags = value ? [value] : [];
                filterWorkouts();
                
                // Hide popover
                popover.hide();
            });
        });
    });
}

/**
 * ============================================
 * FILTERING & SORTING
 * ============================================
 */

/**
 * Apply all filters and sort
 */
function filterWorkouts() {
    let filtered = [...window.ffn.workoutDatabase.all];

    // Get filter values from state
    const searchTerm = window.ffn.workoutDatabase.filters.search || '';
    const selectedTags = window.ffn.workoutDatabase.filters.tags || [];
    const sortBy = window.ffn.workoutDatabase.filters.sortBy || 'modified_date';
    const favoritesOnly = window.ffn.workoutDatabase.filters.favoritesOnly || false;

    console.log('🔍 Applying filters:', { searchTerm, selectedTags, sortBy, favoritesOnly });

    // Apply favorites filter
    if (favoritesOnly) {
        filtered = filtered.filter(workout => workout.is_favorite);
    }

    // Apply search filter
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();

        filtered = filtered.filter(workout => {
            return workout.name.toLowerCase().includes(searchLower) ||
                   (workout.description || '').toLowerCase().includes(searchLower) ||
                   (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
        });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
        filtered = filtered.filter(workout => {
            return selectedTags.some(tag => (workout.tags || []).includes(tag));
        });
    }

    // Sort workouts
    filtered = sortWorkouts(filtered, sortBy);

    // Update filtered array
    window.ffn.workoutDatabase.filtered = filtered;

    // Reset to page 1
    window.ffn.workoutDatabase.currentPage = 1;

    // Update grid with filtered data
    if (workoutGrid) {
        workoutGrid.setData(filtered);
    }

    // Update stats display
    updateStatsDisplay();

    // Update filter badge
    updateFilterBadge();

    console.log('📊 Filter results:', filtered.length, 'of', window.ffn.workoutDatabase.all.length);
}

/**
 * Sort workouts by specified criteria
 */
function sortWorkouts(workouts, sortBy) {
    const sorted = [...workouts];
    
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
            
        case 'created_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.created_date);
                const dateB = new Date(b.created_date);
                return dateB - dateA; // Newest first
            });
            break;
            
        case 'modified_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.modified_date);
                const dateB = new Date(b.modified_date);
                return dateB - dateA; // Newest first
            });
            break;
            
        case 'exercise_count':
            sorted.sort((a, b) => {
                const countA = getTotalExerciseCount(a);
                const countB = getTotalExerciseCount(b);
                return countB - countA; // Most exercises first
            });
            break;
    }
    
    return sorted;
}

/**
 * Clear all filters
 */
function clearFilters() {
    console.log('🧹 Clearing all filters');

    // Clear search in toolbar
    const workoutSearchInput = document.getElementById('workoutSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (workoutSearchInput) {
        workoutSearchInput.value = '';
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }

    // Reset filter state (including search and favorites)
    window.ffn.workoutDatabase.filters.search = '';
    window.ffn.workoutDatabase.filters.tags = [];
    window.ffn.workoutDatabase.filters.sortBy = 'modified_date';
    window.ffn.workoutDatabase.filters.favoritesOnly = false;

    // Reset favorites filter toggle immediately after state change
    const favoritesToggle = document.getElementById('favoritesFilterToggle');
    console.log('🔄 Resetting favorites toggle:', favoritesToggle, favoritesToggle?.checked);
    if (favoritesToggle) {
        favoritesToggle.checked = false;
        console.log('✅ Favorites toggle set to:', favoritesToggle.checked);
    }

    // Reset sort cycle button to default
    currentSortIndex = 0;
    const sortCycleBtn = document.getElementById('sortCycleBtn');
    if (sortCycleBtn) {
        sortCycleBtn.querySelector('.sort-label').textContent = SORT_OPTIONS[0].label;
        sortCycleBtn.querySelector('i').className = `bx ${SORT_OPTIONS[0].icon}`;
    }

    // Uncheck all tag checkboxes
    document.querySelectorAll('.tag-filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Re-apply filters (will show all workouts)
    filterWorkouts();

    // Re-render favorites section (will be shown again)
    renderFavoritesSection();

    // Update filter badge
    updateFilterBadge();

    console.log('✅ Filters cleared');
}

/**
 * ============================================
 * COMPONENT INITIALIZATION
 * ============================================
 */

/**
 * Initialize shared components
 */
function initializeComponents() {
    if (componentsInitialized) {
        console.log('⏭️ Components already initialized, skipping...');
        return;
    }
    
    console.log('🔧 Initializing shared components...');
    componentsInitialized = true;
    
    // Initialize WorkoutDetailOffcanvas
    workoutDetailOffcanvas = new WorkoutDetailOffcanvas({
        showCreator: false,
        showStats: false,
        showDates: true,
        actions: [
            // Secondary actions (top row)
            {
                id: 'edit',
                label: 'Edit',
                icon: 'bx-edit',
                variant: 'outline-primary',
                onClick: (workout) => editWorkout(workout.id)
            },
            {
                id: 'share',
                label: 'Share',
                icon: 'bx-share-alt',
                variant: 'outline-secondary',
                onClick: (workout) => shareWorkout(workout.id)
            },
            // Primary action (bottom row, full width)
            {
                id: 'start',
                label: 'Start',
                icon: 'bx-play',
                variant: 'primary',
                primary: true,
                onClick: (workout) => doWorkout(workout.id)
            }
        ]
    });
    
    // Initialize WorkoutGrid with simplified card configuration
    // Primary CTA: Start Workout button
    // Secondary actions: View Details, History, Edit, Delete (in dropdown menu)
    workoutGrid = new WorkoutGrid('workoutTableContainer', {
        emptyMessage: 'No workouts found',
        emptySubtext: 'Try adjusting your filters or create a new workout',
        emptyAction: {
            label: 'Create Your First Workout',
            icon: 'bx-plus',
            onClick: createNewWorkout
        },
        cardConfig: {
            showCreator: false,
            showStats: false,
            showDates: false,
            showTags: false, // Tags moved to detail view for cleaner card
            showExercisePreview: true,
            // Session state callback for smart button labels
            getSessionState: getWorkoutSessionState,
            // Primary action - shown as button
            actions: [
                {
                    id: 'start',
                    label: 'Start Workout',
                    icon: 'bx-play',
                    variant: 'primary',
                    onClick: (workout) => doWorkout(workout.id)
                },
                // These go to dropdown menu
                {
                    id: 'history',
                    label: 'History',
                    icon: 'bx-history',
                    variant: 'outline-info',
                    onClick: (workout) => viewWorkoutHistory(workout.id)
                },
                {
                    id: 'edit',
                    label: 'Edit',
                    icon: 'bx-edit',
                    variant: 'outline-secondary',
                    onClick: (workout) => editWorkout(workout.id)
                },
                {
                    id: 'duplicate',
                    label: 'Duplicate',
                    icon: 'bx-copy',
                    variant: 'outline-secondary',
                    onClick: (workout) => duplicateWorkout(workout.id)
                },
                {
                    id: 'share',
                    label: 'Share',
                    icon: 'bx-share-alt',
                    variant: 'outline-secondary',
                    onClick: (workout) => shareWorkout(workout.id)
                },
                {
                    id: 'multi-delete',
                    label: 'Multi Delete',
                    icon: 'bx-select-multiple',
                    variant: 'outline-danger',
                    onClick: () => {
                        // Toggle checkbox to activate delete mode
                        const toggle = document.getElementById('deleteModeToggle');
                        if (toggle) {
                            toggle.checked = true;
                            toggle.dispatchEvent(new Event('change'));
                        }
                    }
                }
            ],
            // Configure which actions appear in dropdown menu
            // Only 'start' remains as the primary button
            dropdownActions: ['history', 'edit', 'duplicate', 'share', 'delete', 'multi-delete'],
            // View details callback for dropdown
            onViewDetails: (workout) => viewWorkoutDetails(workout.id),
            // Card tap also opens detail view
            onCardClick: (workout) => viewWorkoutDetails(workout.id),
            // Delete callbacks
            onDelete: (workoutId, workoutName) => deleteWorkoutFromDatabase(workoutId, workoutName),
            // Selection change callback for batch delete
            onSelectionChange: handleSelectionChange
        },
        onPageChange: (page) => {
            window.ffn.workoutDatabase.currentPage = page;
            // Scroll to top of container
            document.getElementById('workoutTableContainer')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
    
    console.log('✅ Shared components initialized');
}

/**
 * Get list of exercise names from workout
 */
function getWorkoutExercisesList(workout) {
    const exercises = [];
    
    // Get exercises from groups
    if (workout.exercise_groups) {
        workout.exercise_groups.forEach(group => {
            if (group.exercises) {
                Object.values(group.exercises).forEach(name => {
                    if (name) exercises.push(name);
                });
            }
        });
    }
    
    // Add bonus exercises
    if (workout.bonus_exercises) {
        workout.bonus_exercises.forEach(bonus => {
            if (bonus.name) exercises.push(bonus.name);
        });
    }
    
    return exercises;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}



/**
 * Update stats display
 */
function updateStats(showingCount) {
    document.getElementById('totalCount').textContent = window.ffn.workoutDatabase.stats.total;
    document.getElementById('showingCount').textContent = showingCount;
}

/**
 * ============================================
 * ACTIONS
 * ============================================
 */

/**
 * Edit workout - Navigate to workout editor
 */
function editWorkout(workoutId) {
    console.log('📝 Editing workout:', workoutId);
    
    // Navigate to workout-builder.html with URL parameter
    window.location.href = `workout-builder.html?id=${workoutId}`;
}

/**
 * Do workout - Navigate to workout mode
 */
function doWorkout(workoutId) {
    console.log('🏋️ Starting workout:', workoutId);
    window.location.href = `workout-mode.html?id=${workoutId}`;
}

/**
 * View workout details - Use shared component
 */
async function viewWorkoutDetails(workoutId) {
    try {
        console.log('👁️ Viewing workout details:', workoutId);
        
        // Find workout in local data first
        let workout = window.ffn.workoutDatabase.all.find(w => w.id === workoutId);
        
        // If not found locally, fetch from API
        if (!workout) {
            const response = await fetch(`/api/v3/firebase/workouts/${workoutId}`, {
                headers: {
                    'Authorization': window.dataManager?.getAuthToken ?
                        `Bearer ${window.dataManager.getAuthToken()}` : ''
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load workout details');
            }
            
            workout = await response.json();
        }
        
        // Use shared component to show details
        if (workoutDetailOffcanvas) {
            workoutDetailOffcanvas.show(workout);
        }
        
    } catch (error) {
        console.error('❌ Failed to load workout details:', error);
        if (window.showAlert) {
            window.showAlert('Failed to load workout details: ' + error.message, 'danger');
        } else {
            alert('Failed to load workout details');
        }
    }
}


/**
 * Create new workout - Navigate to editor
 */
function createNewWorkout() {
    console.log('➕ Creating new workout');

    // Navigate to workout-builder.html with new=true parameter
    window.location.href = 'workout-builder.html?new=true';
}

/**
 * Duplicate workout - Create a copy with "(Copy)" suffix
 */
async function duplicateWorkout(workoutId) {
    console.log('📋 Duplicating workout:', workoutId);

    try {
        // Find the original workout
        const originalWorkout = window.ffn.workoutDatabase.all.find(w => w.id === workoutId);
        if (!originalWorkout) {
            throw new Error('Workout not found');
        }

        // Create a copy with "(Copy)" suffix
        const duplicatedWorkout = {
            ...originalWorkout,
            id: undefined, // Will be generated by backend
            name: `${originalWorkout.name} (Copy)`,
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString()
        };

        // Save the duplicate
        const savedWorkout = await window.dataManager.saveWorkout(duplicatedWorkout);

        console.log('✅ Workout duplicated successfully:', savedWorkout.id);

        // Show success message
        if (window.showAlert) {
            window.showAlert(`Workout "${duplicatedWorkout.name}" created`, 'success');
        }

        // Reload workouts to show the new copy
        await loadWorkouts();

    } catch (error) {
        console.error('❌ Failed to duplicate workout:', error);
        if (window.showAlert) {
            window.showAlert('Failed to duplicate workout: ' + error.message, 'danger');
        }
    }
}

/**
 * Share workout - Opens share offcanvas
 */
function shareWorkout(workoutId) {
    console.log('🔗 Sharing workout:', workoutId);

    if (window.openShareModal) {
        window.openShareModal(workoutId);
    } else {
        console.error('❌ Share modal not available');
        if (window.showAlert) {
            window.showAlert('Share functionality not available', 'danger');
        }
    }
}

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Get total exercise count for a workout
 */
function getTotalExerciseCount(workout) {
    let count = 0;
    
    // Count exercises in groups
    if (workout.exercise_groups) {
        workout.exercise_groups.forEach(group => {
            count += Object.keys(group.exercises || {}).length;
        });
    }
    
    // Add bonus exercises
    count += (workout.bonus_exercises || []).length;
    
    return count;
}

// formatDate, escapeHtml, truncateText are now in common-utils.js

/**
 * ============================================
 * SEARCH OVERLAY MANAGEMENT (Using Shared Component)
 * ============================================
 */

let searchOverlay = null;

/**
 * Initialize search overlay using shared component
 */
function initSearchOverlay() {
    searchOverlay = new FFNSearchOverlay({
        placeholder: 'Search workouts by name, description, or tags...',
        onSearch: (searchTerm) => {
            console.log('🔍 Search callback triggered with term:', searchTerm);
            
            // Update global state
            window.ffn.workoutDatabase.filters.search = searchTerm;
            console.log('📊 Updated filter state:', window.ffn.workoutDatabase.filters);
            
            // Use existing filter function
            filterWorkouts();
            
            console.log('✅ Search performed and filtered');
        },
        onResultsCount: (searchTerm) => {
            if (!searchTerm) {
                return { count: 0, total: 0 };
            }
            
            // Calculate matching workouts
            const searchLower = searchTerm.toLowerCase();
            const filtered = window.ffn.workoutDatabase.all.filter(workout => {
                return workout.name.toLowerCase().includes(searchLower) ||
                       (workout.description || '').toLowerCase().includes(searchLower) ||
                       (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
            });
            
            return {
                count: filtered.length,
                total: window.ffn.workoutDatabase.all.length
            };
        }
    });
    
    console.log('✅ Search overlay initialized with shared component');
}

/**
 * Show search overlay
 */
function showSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.show();
    }
}

/**
 * Hide search overlay
 */
function hideSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.hide();
    }
}

/**
 * ============================================
 * UI STATE MANAGEMENT
 * ============================================
 */

/**
 * DEPRECATED: showWorkoutLoading() - Removed to prevent HTML destruction
 * The WorkoutGrid component now handles loading state internally via showLoading()
 */

/**
 * DEPRECATED: showWorkoutError() - Removed to prevent HTML destruction
 * Error handling now uses WorkoutGrid's empty state + alert notifications
 */

/**
 * ============================================
 * GLOBAL EXPORTS
 * ============================================
 */

/**
 * ============================================
 * DELETE MODE MANAGEMENT (Gmail-style batch selection)
 * ============================================
 */

/**
 * Toggle delete mode on/off
 */
function toggleDeleteMode() {
    const toggle = document.getElementById('deleteModeToggle');
    const isActive = toggle ? toggle.checked : !window.ffn.workoutDatabase.deleteMode;

    // Sync toggle state
    if (toggle) toggle.checked = isActive;
    window.ffn.workoutDatabase.deleteMode = isActive;

    // Clear selection when entering/exiting
    window.ffn.workoutDatabase.selectedWorkoutIds.clear();

    console.log(`🗑️ Delete mode ${isActive ? 'activated' : 'deactivated'}`);

    // Update grid delete mode
    if (workoutGrid) {
        workoutGrid.setDeleteMode(isActive);
        workoutGrid.clearSelection();
    }

    // Show/hide selection action bar
    if (isActive) {
        showSelectionActionBar();
    } else {
        hideSelectionActionBar();
    }

    // Body class for global styling
    document.body.classList.toggle('delete-mode-active', isActive);
}

/**
 * Handle selection change from card checkbox
 * @param {string} workoutId - The workout ID
 * @param {boolean} isSelected - Whether it's selected
 */
function handleSelectionChange(workoutId, isSelected) {
    const selected = window.ffn.workoutDatabase.selectedWorkoutIds;
    if (isSelected) {
        selected.add(workoutId);
    } else {
        selected.delete(workoutId);
    }
    updateSelectionCount();
}

/**
 * Show selection action bar (contextual action bar)
 */
function showSelectionActionBar() {
    let bar = document.getElementById('selectionActionBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'selectionActionBar';
        bar.className = 'selection-action-bar';
        bar.innerHTML = `
            <div class="selection-info">
                <button class="btn-close-selection" onclick="exitDeleteMode()" type="button">
                    <i class="bx bx-x"></i>
                </button>
                <span class="selection-count">0 selected</span>
            </div>
            <button class="btn-batch-delete" onclick="confirmBatchDelete()" type="button" disabled>
                <i class="bx bx-trash"></i>
                Delete
            </button>
        `;
        document.body.appendChild(bar);
    }
    bar.style.display = 'flex';
    updateSelectionCount();
}

/**
 * Hide selection action bar
 */
function hideSelectionActionBar() {
    const bar = document.getElementById('selectionActionBar');
    if (bar) {
        bar.style.display = 'none';
    }
}

/**
 * Update the selection count display
 */
function updateSelectionCount() {
    const count = window.ffn.workoutDatabase.selectedWorkoutIds.size;
    const countEl = document.querySelector('.selection-count');
    const deleteBtn = document.querySelector('.btn-batch-delete');

    if (countEl) countEl.textContent = `${count} selected`;
    if (deleteBtn) deleteBtn.disabled = count === 0;
}

/**
 * Exit delete mode - called from action bar button
 */
function exitDeleteMode() {
    const toggle = document.getElementById('deleteModeToggle');
    if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
    } else {
        // Direct toggle if checkbox not available
        window.ffn.workoutDatabase.deleteMode = false;
        window.ffn.workoutDatabase.selectedWorkoutIds.clear();
        if (workoutGrid) {
            workoutGrid.setDeleteMode(false);
            workoutGrid.clearSelection();
        }
        hideSelectionActionBar();
        document.body.classList.remove('delete-mode-active');
    }
}

/**
 * Confirm batch delete of selected workouts
 */
async function confirmBatchDelete() {
    const selected = window.ffn.workoutDatabase.selectedWorkoutIds;
    const count = selected.size;
    if (count === 0) return;

    // Get workout names for confirmation
    const workoutNames = [...selected].map(id => {
        const workout = window.ffn.workoutDatabase.all.find(w => w.id === id);
        return workout?.name || 'Unknown workout';
    }).slice(0, 3); // Show max 3 names

    let message = `Are you sure you want to delete ${count} workout${count > 1 ? 's' : ''}?\n\n`;
    message += workoutNames.join('\n');
    if (count > 3) {
        message += `\n...and ${count - 3} more`;
    }
    message += '\n\nThis action cannot be undone.';

    const confirmed = confirm(message);

    if (confirmed) {
        await batchDeleteWorkouts([...selected]);
    }
}

/**
 * Batch delete multiple workouts
 * @param {Array<string>} workoutIds - Array of workout IDs to delete
 */
async function batchDeleteWorkouts(workoutIds) {
    console.log('🗑️ Batch deleting workouts:', workoutIds);

    // Show loading state
    const deleteBtn = document.querySelector('.btn-batch-delete');
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        deleteBtn.disabled = true;
    }

    try {
        // Delete each workout
        let deletedCount = 0;
        for (const id of workoutIds) {
            try {
                await window.dataManager.deleteWorkout(id);
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete workout ${id}:`, error);
            }
        }

        // Update local state
        window.ffn.workoutDatabase.all = window.ffn.workoutDatabase.all.filter(
            w => !workoutIds.includes(w.id)
        );
        window.ffn.workouts = window.ffn.workouts.filter(
            w => !workoutIds.includes(w.id)
        );

        // Update stats
        window.ffn.workoutDatabase.stats.total = window.ffn.workoutDatabase.all.length;

        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
        }

        // Show success message
        if (window.showToast) {
            window.showToast(`Deleted ${deletedCount} workout${deletedCount > 1 ? 's' : ''}`, 'success');
        }

        // Exit delete mode and refresh
        exitDeleteMode();
        filterWorkouts();

        // Re-render favorites section
        if (window.renderFavoritesSection) {
            window.renderFavoritesSection();
        }

    } catch (error) {
        console.error('Batch delete failed:', error);
        if (window.showToast) {
            window.showToast('Failed to delete some workouts', 'error');
        }
    } finally {
        // Reset button state
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bx bx-trash"></i> Delete';
            deleteBtn.disabled = false;
        }
    }
}

/**
 * Delete workout from database with confirmation
 */
async function deleteWorkoutFromDatabase(workoutId, workoutName) {
    console.log('🗑️ Delete requested for workout:', workoutId, workoutName);
    
    // Show confirmation dialog
    const confirmed = confirm(`⚠️ Are you sure you want to delete "${workoutName}"?\n\nThis action cannot be undone.`);
    
    if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        console.log('🔄 Deleting workout from database...');
        
        // Delete from database using data manager
        await window.dataManager.deleteWorkout(workoutId);
        
        // Remove from local state
        window.ffn.workoutDatabase.all = window.ffn.workoutDatabase.all.filter(w => w.id !== workoutId);
        window.ffn.workouts = window.ffn.workouts.filter(w => w.id !== workoutId);
        
        // Update stats
        window.ffn.workoutDatabase.stats.total = window.ffn.workoutDatabase.all.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
        }
        
        // Re-apply filters and render
        filterWorkouts();

        // Re-render Favorites section (in case deleted workout was favorited)
        if (window.renderFavoritesSection) {
            renderFavoritesSection();
        }

        console.log('✅ Workout deleted successfully');

        // Show success message if available
        if (window.showAlert) {
            window.showAlert(`Workout "${workoutName}" deleted successfully`, 'success');
        }

    } catch (error) {
        console.error('❌ Failed to delete workout:', error);
        
        // Show error message
        if (window.showAlert) {
            window.showAlert('Failed to delete workout: ' + error.message, 'danger');
        } else {
            alert('Failed to delete workout: ' + error.message);
        }
    }
}

/**
 * Initialize delete mode toggle
 */
function initDeleteModeToggle() {
    const toggle = document.getElementById('deleteModeToggle');
    if (toggle) {
        toggle.addEventListener('change', toggleDeleteMode);
        console.log('✅ Delete mode toggle initialized');
    } else {
        console.warn('⚠️ Delete mode toggle not found');
    }
}

/**
 * View workout history - Navigate to history page
 */
function viewWorkoutHistory(workoutId) {
    console.log('📊 Viewing workout history:', workoutId);
    window.location.href = `workout-history.html?id=${workoutId}`;
}

/**
 * ============================================
 * TOOLBAR FUNCTIONS
 * ============================================
 */

/**
 * Cycle through sort options
 */
function cycleWorkoutSort() {
    currentSortIndex = (currentSortIndex + 1) % SORT_OPTIONS.length;
    const sortOption = SORT_OPTIONS[currentSortIndex];

    // Update filter state (reuse existing)
    window.ffn.workoutDatabase.filters.sortBy = sortOption.value;

    // Update button UI
    const btn = document.getElementById('sortCycleBtn');
    if (btn) {
        btn.querySelector('.sort-label').textContent = sortOption.label;
        btn.querySelector('i').className = `bx ${sortOption.icon}`;
    }

    console.log('📊 Sort changed to:', sortOption.label);

    // Reuse existing filter function
    filterWorkouts();
}

/**
 * Initialize toolbar search input
 */
function initToolbarSearch() {
    const searchInput = document.getElementById('workoutSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        clearBtn.style.display = query ? 'block' : 'none';

        searchTimeout = setTimeout(() => {
            // Reuse existing filter state & function
            window.ffn.workoutDatabase.filters.search = query;
            filterWorkouts();
        }, 300);
    });

    clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        window.ffn.workoutDatabase.filters.search = '';
        filterWorkouts();
    });

    console.log('✅ Toolbar search initialized');
}

/**
 * Update filter badge with active filter count
 */
function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    let count = window.ffn.workoutDatabase.filters.tags.length;

    // Include favorites filter in count
    if (window.ffn.workoutDatabase.filters.favoritesOnly) {
        count += 1;
    }

    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// Make functions globally available
window.loadWorkouts = loadWorkouts;
window.filterWorkouts = filterWorkouts;
window.clearFilters = clearFilters;
window.editWorkout = editWorkout;
window.doWorkout = doWorkout;
window.viewWorkoutDetails = viewWorkoutDetails;
window.viewWorkoutHistory = viewWorkoutHistory;
window.createNewWorkout = createNewWorkout;
window.duplicateWorkout = duplicateWorkout;
window.initSearchOverlay = initSearchOverlay;
window.showSearchOverlay = showSearchOverlay;
window.hideSearchOverlay = hideSearchOverlay;
window.toggleDeleteMode = toggleDeleteMode;
window.deleteWorkoutFromDatabase = deleteWorkoutFromDatabase;
window.initDeleteModeToggle = initDeleteModeToggle;
window.exitDeleteMode = exitDeleteMode;
window.handleSelectionChange = handleSelectionChange;
window.showSelectionActionBar = showSelectionActionBar;
window.hideSelectionActionBar = hideSelectionActionBar;
window.updateSelectionCount = updateSelectionCount;
window.confirmBatchDelete = confirmBatchDelete;
window.batchDeleteWorkouts = batchDeleteWorkouts;

// Favorites section functions
window.toggleWorkoutFavorite = toggleWorkoutFavorite;
window.renderFavoritesSection = renderFavoritesSection;
window.filterFavoritesOnly = filterFavoritesOnly;

// Toolbar functions
window.cycleWorkoutSort = cycleWorkoutSort;
window.initToolbarSearch = initToolbarSearch;
window.updateFilterBadge = updateFilterBadge;

console.log('📦 Workout Database module loaded (v3.0 - using shared components)');