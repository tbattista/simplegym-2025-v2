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
        
        // Always load fresh data from data manager to ensure we have the latest
        if (!window.dataManager || !window.dataManager.getWorkouts) {
            throw new Error('Data manager not available');
        }
        
        // Load workouts directly from data manager
        const workouts = await window.dataManager.getWorkouts();
        console.log(`✅ Loaded ${workouts.length} workouts from data manager`);
        
        // Update both global state and local state
        window.ghostGym = window.ghostGym || {};
        window.ghostGym.workouts = workouts;
        window.ghostGym.workoutDatabase.all = workouts;
        window.ghostGym.workoutDatabase.stats.total = workouts.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ghostGym.workoutDatabase.stats.total;
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
    window.ghostGym.workoutDatabase.all.forEach(workout => {
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
        const isChecked = window.ghostGym.workoutDatabase.filters.tags.includes(tag);
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
        if (!window.ghostGym.workoutDatabase.filters.tags.includes(tag)) {
            window.ghostGym.workoutDatabase.filters.tags.push(tag);
        }
    } else {
        // Remove tag from filters
        window.ghostGym.workoutDatabase.filters.tags =
            window.ghostGym.workoutDatabase.filters.tags.filter(t => t !== tag);
    }
    
    console.log('🏷️ Tag filters updated:', window.ghostGym.workoutDatabase.filters.tags);
    
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
        totalCountEl.textContent = window.ghostGym.workoutDatabase.stats.total;
    }
    
    if (showingCountEl) {
        const showingCount = window.ghostGym.workoutDatabase.filtered?.length ||
                            window.ghostGym.workoutDatabase.all.length;
        showingCountEl.textContent = showingCount;
        window.ghostGym.workoutDatabase.stats.showing = showingCount;
    }
}

/**
 * Update filter button badge to show active filters
 */
function updateFilterBadge() {
    const selectedTags = window.ghostGym.workoutDatabase.filters.tags || [];
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
                window.ghostGym.workoutDatabase.filters.sortBy = value;
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
                window.ghostGym.workoutDatabase.filters.tags = value ? [value] : [];
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
    let filtered = [...window.ghostGym.workoutDatabase.all];
    
    // Get filter values from state
    const searchTerm = window.ghostGym.workoutDatabase.filters.search || '';
    const selectedTags = window.ghostGym.workoutDatabase.filters.tags || [];
    const sortBy = window.ghostGym.workoutDatabase.filters.sortBy || 'modified_date';
    
    console.log('🔍 Applying filters:', { searchTerm, selectedTags, sortBy });
    
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
    window.ghostGym.workoutDatabase.filtered = filtered;
    
    // Reset to page 1
    window.ghostGym.workoutDatabase.currentPage = 1;
    
    // Update grid with filtered data
    if (workoutGrid) {
        workoutGrid.setData(filtered);
    }
    
    // Update stats display
    updateStatsDisplay();
    
    // Update filter badge
    updateFilterBadge();
    
    console.log('📊 Filter results:', filtered.length, 'of', window.ghostGym.workoutDatabase.all.length);
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
    
    // Clear search in morphing FAB
    const searchFabInput = document.getElementById('searchFabInput');
    if (searchFabInput) {
        searchFabInput.value = '';
    }
    
    // Reset filter state (including search)
    window.ghostGym.workoutDatabase.filters.search = '';
    window.ghostGym.workoutDatabase.filters.tags = [];
    window.ghostGym.workoutDatabase.filters.sortBy = 'modified_date';
    
    // Reset sort dropdown in offcanvas
    const sortBySelect = document.getElementById('sortBySelect');
    if (sortBySelect) {
        sortBySelect.value = 'modified_date';
    }
    
    // Uncheck all tag checkboxes
    document.querySelectorAll('.tag-filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Re-apply filters (will show all workouts)
    filterWorkouts();
    
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
            {
                id: 'edit',
                label: 'Edit',
                icon: 'bx-edit',
                variant: 'outline-primary',
                onClick: (workout) => editWorkout(workout.id)
            },
            {
                id: 'start',
                label: 'Start',
                icon: 'bx-play',
                variant: 'primary',
                onClick: (workout) => doWorkout(workout.id)
            }
        ]
    });
    
    // Initialize WorkoutGrid
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
            showTags: true,
            showExercisePreview: true,
            actions: [
                {
                    id: 'start',
                    label: 'Start',
                    icon: 'bx-play',
                    variant: 'primary',
                    onClick: (workout) => doWorkout(workout.id)
                },
                {
                    id: 'view',
                    label: 'View',
                    icon: 'bx-show',
                    variant: 'outline-secondary',
                    onClick: (workout) => viewWorkoutDetails(workout.id)
                },
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
                }
            ],
            onDelete: (workoutId, workoutName) => deleteWorkoutFromDatabase(workoutId, workoutName)
        },
        onPageChange: (page) => {
            window.ghostGym.workoutDatabase.currentPage = page;
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
    document.getElementById('totalCount').textContent = window.ghostGym.workoutDatabase.stats.total;
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
    
    // Store workout ID in sessionStorage
    sessionStorage.setItem('editWorkoutId', workoutId);
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
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
        let workout = window.ghostGym.workoutDatabase.all.find(w => w.id === workoutId);
        
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
    
    // Clear any existing workout ID
    sessionStorage.removeItem('editWorkoutId');
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
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
    searchOverlay = new GhostGymSearchOverlay({
        placeholder: 'Search workouts by name, description, or tags...',
        onSearch: (searchTerm) => {
            console.log('🔍 Search callback triggered with term:', searchTerm);
            
            // Update global state
            window.ghostGym.workoutDatabase.filters.search = searchTerm;
            console.log('📊 Updated filter state:', window.ghostGym.workoutDatabase.filters);
            
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
            const filtered = window.ghostGym.workoutDatabase.all.filter(workout => {
                return workout.name.toLowerCase().includes(searchLower) ||
                       (workout.description || '').toLowerCase().includes(searchLower) ||
                       (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
            });
            
            return {
                count: filtered.length,
                total: window.ghostGym.workoutDatabase.all.length
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
 * DELETE MODE MANAGEMENT
 * ============================================
 */

/**
 * Toggle delete mode on/off
 */
function toggleDeleteMode() {
    const isActive = document.getElementById('deleteModeToggle').checked;
    window.ghostGym.workoutDatabase.deleteMode = isActive;
    
    console.log(`🗑️ Delete mode ${isActive ? 'activated' : 'deactivated'}`);
    
    // Update grid delete mode
    if (workoutGrid) {
        workoutGrid.setDeleteMode(isActive);
    }
    
    // Show/hide end delete mode button and search FAB
    const searchFab = document.getElementById('searchFab');
    if (window.bottomActionBar) {
        if (isActive) {
            window.bottomActionBar.showEndDeleteModeButton();
            // Hide search FAB when delete mode is active
            if (searchFab) {
                searchFab.style.display = 'none';
            }
        } else {
            window.bottomActionBar.hideEndDeleteModeButton();
            // Show search FAB when delete mode is inactive
            if (searchFab) {
                searchFab.style.display = 'flex';
            }
        }
    }
    
    // Optional: Add body class for global styling
    if (isActive) {
        document.body.classList.add('delete-mode-active');
    } else {
        document.body.classList.remove('delete-mode-active');
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
        window.ghostGym.workoutDatabase.all = window.ghostGym.workoutDatabase.all.filter(w => w.id !== workoutId);
        window.ghostGym.workouts = window.ghostGym.workouts.filter(w => w.id !== workoutId);
        
        // Update stats
        window.ghostGym.workoutDatabase.stats.total = window.ghostGym.workoutDatabase.all.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ghostGym.workoutDatabase.stats.total;
        }
        
        // Re-apply filters and render
        filterWorkouts();
        
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

// Make functions globally available
window.loadWorkouts = loadWorkouts;
window.filterWorkouts = filterWorkouts;
window.clearFilters = clearFilters;
window.editWorkout = editWorkout;
window.doWorkout = doWorkout;
window.viewWorkoutDetails = viewWorkoutDetails;
window.viewWorkoutHistory = viewWorkoutHistory;
window.createNewWorkout = createNewWorkout;
window.initSearchOverlay = initSearchOverlay;
window.showSearchOverlay = showSearchOverlay;
window.hideSearchOverlay = hideSearchOverlay;
window.toggleDeleteMode = toggleDeleteMode;
window.deleteWorkoutFromDatabase = deleteWorkoutFromDatabase;
window.initDeleteModeToggle = initDeleteModeToggle;

console.log('📦 Workout Database module loaded (v3.0 - using shared components)');