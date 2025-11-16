/**
 * Ghost Gym Dashboard - Exercise Database Module (Refactored)
 * Uses new component architecture for cleaner, more maintainable code
 * @version 2.0.0
 */

// Initialize page with BasePage component
const exercisePage = new GhostGymBasePage({
    requireAuth: false,
    autoLoad: true,
    onDataLoad: async (page) => {
        console.log('🚀 Initializing Exercise Database with components');
        await initializeExerciseDatabase(page);
    },
    onAuthStateChange: async (user) => {
        console.log('🔄 Auth state changed, reloading user data');
        if (user) {
            await loadUserExerciseData();
            if (window.exerciseTable) {
                window.exerciseTable.refresh();
            }
        } else {
            // Clear user data
            window.ghostGym.exercises.favorites.clear();
            window.ghostGym.exercises.custom = [];
            if (window.exerciseTable) {
                window.exerciseTable.refresh();
            }
        }
    }
});

// Global state
window.ghostGym = window.ghostGym || {
    exercises: {
        all: [],
        favorites: new Set(),
        custom: [],
        filtered: [],
        displayed: []
    }
};

// Component instances
let exerciseTable = null;
let filterBar = null;

/**
 * Initialize exercise database with components
 */
async function initializeExerciseDatabase(page) {
    try {
        // Load all exercise data
        await loadAllExerciseData(page);
        
        // Initialize FilterBar component (without search in offcanvas)
        // Note: Don't trigger onFilterChange during initialization
        let isInitializing = true;
        filterBar = new GhostGymFilterBar('filterBarContainer', {
            showSearch: false, // Don't show search in offcanvas, use main search instead
            filters: [
                {
                    key: 'sortBy',
                    label: 'Sort By',
                    type: 'select',
                    options: [
                        { value: 'name', label: 'Alphabetical (A-Z)' },
                        { value: 'popularity', label: 'Most Popular' },
                        { value: 'favorites', label: 'My Favorites First' }
                    ],
                    defaultValue: 'name'
                },
                {
                    key: 'exerciseTier',
                    label: 'Exercise Tier',
                    type: 'select',
                    options: [
                        { value: '1', label: '⭐ Standard - Core foundational exercises' },
                        { value: '2', label: '⭐ Standard - Common effective exercises' },
                        { value: '3', label: '◦ Specialized - Advanced variations' }
                    ],
                    placeholder: 'All Tiers',
                    defaultValue: '1',
                    helpText: 'Standard exercises are recommended for most training programs'
                },
                {
                    key: 'muscleGroup',
                    label: 'Muscle Group',
                    type: 'select',
                    options: getUniqueMuscleGroups(),
                    placeholder: 'All Muscle Groups'
                },
                {
                    key: 'equipment',
                    label: 'Equipment',
                    type: 'multiselect',
                    options: getUniqueEquipment(),
                    placeholder: 'All Equipment'
                },
                {
                    key: 'difficulty',
                    label: 'Difficulty',
                    type: 'select',
                    options: ['Beginner', 'Intermediate', 'Advanced'],
                    placeholder: 'All Levels'
                },
                {
                    key: 'favoritesOnly',
                    label: 'My Favorites Only',
                    type: 'checkbox'
                },
                {
                    key: 'customOnly',
                    label: 'Custom Exercises Only',
                    type: 'checkbox'
                }
            ],
            onFilterChange: (filters) => {
                // Skip filter changes during initialization
                if (isInitializing) {
                    console.log('⏭️ Skipping filter change during initialization');
                    return;
                }
                console.log('🔍 Filters changed:', filters);
                applyFiltersAndRender(filters);
            }
        });
        
        // Mark initialization as complete
        isInitializing = false;
        
        // Export filterBar globally immediately after creation
        window.filterBar = filterBar;
        console.log('✅ FilterBar exported globally');
        
        // Connect main search input to FilterBar
        const mainSearchInput = document.getElementById('exerciseSearch');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        
        if (mainSearchInput) {
            let searchTimeout;
            mainSearchInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                
                // Show/hide clear button
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = value ? 'block' : 'none';
                }
                
                // Debounce search
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const currentFilters = filterBar.getFilters();
                    currentFilters.search = value;
                    applyFiltersAndRender(currentFilters);
                }, 300);
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                mainSearchInput.value = '';
                clearSearchBtn.style.display = 'none';
                const currentFilters = filterBar.getFilters();
                currentFilters.search = '';
                applyFiltersAndRender(currentFilters);
            });
        }
        
        // Initialize DataTable component with compact single-line cards
        exerciseTable = new GhostGymDataTable('exerciseTableContainer', {
            columns: [
                {
                    key: 'card',
                    label: '',
                    sortable: false,
                    render: (value, row) => {
                        const isCustom = !row.isGlobal;
                        const tierBadge = getTierBadgeCompact(row);
                        const isFavorited = window.ghostGym.exercises.favorites.has(row.id);
                        const difficultyBadge = row.difficultyLevel ? getDifficultyBadgeWithPopover(row.difficultyLevel) : '';
                        
                        return `
                            <div class="card mb-0" style="margin-bottom: 0.375rem !important;">
                                <div class="card-body p-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="flex-grow-1">
                                            <div class="fw-semibold mb-2">
                                                ${isCustom ? '<i class="bx bx-user text-primary me-1" style="font-size: 0.875rem;"></i>' : ''}
                                                ${exercisePage.escapeHtml(row.name)}
                                            </div>
                                            <div class="d-flex gap-2 flex-wrap align-items-center">
                                                ${tierBadge}
                                                ${difficultyBadge}
                                                ${row.targetMuscleGroup ? `<span class="text-muted small">${exercisePage.escapeHtml(row.targetMuscleGroup)}</span>` : ''}
                                                ${row.primaryEquipment ? `<span class="text-muted small">• ${exercisePage.escapeHtml(row.primaryEquipment)}</span>` : ''}
                                            </div>
                                        </div>
                                        <div class="d-flex gap-2 align-items-center flex-shrink-0 ms-3">
                                            <button class="btn btn-sm btn-icon favorite-btn ${isFavorited ? 'text-danger' : ''}"
                                                    data-exercise-id="${row.id}"
                                                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                                                <i class="bx ${isFavorited ? 'bxs-heart' : 'bx-heart'}"></i>
                                            </button>
                                            <div class="dropdown">
                                                <button type="button" class="btn btn-sm btn-icon dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                                                    <i class="bx bx-dots-vertical-rounded"></i>
                                                </button>
                                                <div class="dropdown-menu dropdown-menu-end">
                                                    <a class="dropdown-item view-details-link" href="javascript:void(0);" data-exercise-id="${row.id}">
                                                        <i class="bx bx-info-circle me-2"></i>View Details
                                                    </a>
                                                    <a class="dropdown-item add-to-workout-link" href="javascript:void(0);"
                                                       data-exercise-id="${row.id}" data-exercise-name="${exercisePage.escapeHtml(row.name)}">
                                                        <i class="bx bx-plus me-2"></i>Add to Workout
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
            ],
            data: [],
            pageSize: 50,
            pageSizeOptions: [25, 50, 100, 250],
            emptyMessage: 'No exercises found. Try adjusting your filters or search query.',
            loadingMessage: 'Loading exercises...',
            onRowClick: null,
            onPageChange: (page, info) => {
                console.log(`📄 Page ${page}: showing ${info.startIndex}-${info.endIndex} of ${info.totalItems}`);
            }
        });
        
        // Initialize popovers after table renders
        setTimeout(() => initializePopovers(), 100);
        
        // Add event delegation for favorite buttons and action links
        document.getElementById('exerciseTableContainer').addEventListener('click', async (e) => {
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const exerciseId = favoriteBtn.dataset.exerciseId;
                await toggleExerciseFavorite(exerciseId);
                return;
            }
            
            const viewDetailsLink = e.target.closest('.view-details-link');
            if (viewDetailsLink) {
                e.preventDefault();
                const exerciseId = viewDetailsLink.dataset.exerciseId;
                showExerciseDetails(exerciseId);
                return;
            }
            
            const addToWorkoutLink = e.target.closest('.add-to-workout-link');
            if (addToWorkoutLink) {
                e.preventDefault();
                const exerciseId = addToWorkoutLink.dataset.exerciseId;
                const exerciseName = addToWorkoutLink.dataset.exerciseName;
                addExerciseToWorkout({ id: exerciseId, name: exerciseName });
                return;
            }
        });
        
        // Set initial data
        applyFiltersAndRender(filterBar.getFilters());
        
        // Update stats
        updateStats();
        
        // Initialize favorites button state
        initializeFavoritesButtonState();
        
        console.log('✅ Exercise Database initialized with components');
        
    } catch (error) {
        console.error('❌ Error initializing exercise database:', error);
        showAlert('Failed to initialize exercise database. Please refresh the page.', 'danger');
    }
}

/**
 * Load all exercise data
 */
async function loadAllExerciseData(page) {
    // Load global exercises with caching
    const cached = getExerciseCache();
    if (cached && isExerciseCacheValid(cached)) {
        window.ghostGym.exercises.all = cached.exercises;
        console.log(`✅ Loaded ${window.ghostGym.exercises.all.length} exercises from cache`);
    } else {
        console.log('📡 Loading exercises from API...');
        const PAGE_SIZE = 500;
        let allExercises = [];
        let pageNum = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await fetch(page.getApiUrl(`/api/v3/exercises?page=${pageNum}&page_size=${PAGE_SIZE}`));
            if (!response.ok) throw new Error(`Failed to load exercises (page ${pageNum})`);
            
            const data = await response.json();
            const exercises = data.exercises || [];
            allExercises = [...allExercises, ...exercises];
            console.log(`📦 Loaded page ${pageNum}: ${exercises.length} exercises (total: ${allExercises.length})`);
            
            hasMore = exercises.length === PAGE_SIZE;
            pageNum++;
        }
        
        window.ghostGym.exercises.all = allExercises;
        setExerciseCache(allExercises);
        
        // Update total count
        const totalCount = document.getElementById('totalExercisesCount');
        if (totalCount) totalCount.textContent = allExercises.length.toLocaleString();
    }
    
    // Load user-specific data
    await loadUserExerciseData();
}

/**
 * Load user-specific exercise data (favorites and custom)
 */
async function loadUserExerciseData() {
    if (!window.firebaseAuth?.currentUser) {
        window.ghostGym.exercises.favorites.clear();
        window.ghostGym.exercises.custom = [];
        return;
    }
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        
        // Load favorites
        const favResponse = await fetch(exercisePage.getApiUrl('/api/v3/users/me/favorites'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (favResponse.ok) {
            const favData = await favResponse.json();
            window.ghostGym.exercises.favorites = new Set(favData.favorites.map(f => f.exerciseId));
            console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites`);
        }
        
        // Load custom exercises
        const customResponse = await fetch(exercisePage.getApiUrl('/api/v3/users/me/exercises'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (customResponse.ok) {
            const customData = await customResponse.json();
            window.ghostGym.exercises.custom = customData.exercises || [];
            console.log(`✅ Loaded ${window.ghostGym.exercises.custom.length} custom exercises`);
        }
        
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading user exercise data:', error);
    }
}

/**
 * Apply filters and render table
 */
function applyFiltersAndRender(filters) {
    // Combine global and custom exercises
    let allExercises = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom];
    
    // Apply search filter
    if (filters.search) {
        const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        allExercises = allExercises.filter(exercise => {
            const searchableText = `${exercise.name} ${exercise.targetMuscleGroup || ''} ${exercise.primaryEquipment || ''}`.toLowerCase();
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    // Apply muscle group filter
    if (filters.muscleGroup) {
        allExercises = allExercises.filter(e => e.targetMuscleGroup === filters.muscleGroup);
    }
    
    // Apply equipment filter (supports multi-select with OR logic)
    if (filters.equipment && filters.equipment.length > 0) {
        console.log('🔧 Equipment filter active:', filters.equipment);
        const beforeCount = allExercises.length;
        
        allExercises = allExercises.filter(e => {
            // Ensure primaryEquipment exists and matches any selected equipment
            const hasEquipment = e.primaryEquipment && filters.equipment.includes(e.primaryEquipment);
            return hasEquipment;
        });
        
        console.log(`📊 Equipment filter: ${beforeCount} → ${allExercises.length} exercises`);
    }
    
    // Apply difficulty filter
    if (filters.difficulty) {
        allExercises = allExercises.filter(e => e.difficultyLevel === filters.difficulty);
    }
    
    // Apply exercise tier filter
    if (filters.exerciseTier) {
        const tierValue = parseInt(filters.exerciseTier);
        allExercises = allExercises.filter(e => {
            const exerciseTier = e.exerciseTier || 2;
            const isFoundational = e.isFoundational || false;
            // Tier 1 includes both exerciseTier === 1 and isFoundational === true
            if (tierValue === 1) {
                return exerciseTier === 1 || isFoundational;
            }
            return exerciseTier === tierValue;
        });
    }
    
    // Apply favorites only filter
    if (filters.favoritesOnly) {
        allExercises = allExercises.filter(e => window.ghostGym.exercises.favorites.has(e.id));
    }
    
    // Apply custom only filter
    if (filters.customOnly) {
        allExercises = allExercises.filter(e => !e.isGlobal);
    }
    
    // Apply sorting
    allExercises = sortExercises(allExercises, filters.sortBy || 'name');
    
    // Update table
    exerciseTable.setData(allExercises);
    
    // Update stats
    updateStats();
    
    // Update filter feedback
    updateFilterFeedback(filters);
    
    // Update favorites button state
    updateFavoritesButtonState(filters.favoritesOnly);
}

/**
 * Update filter feedback display
 */
function updateFilterFeedback(filters) {
    const feedbackContainer = document.getElementById('filterFeedback');
    const feedbackText = document.getElementById('filterFeedbackText');
    
    if (!feedbackContainer || !feedbackText) return;
    
    const activeFilters = [];
    
    // Check each filter and add to active list
    if (filters.search) {
        activeFilters.push(`<strong>Search:</strong> "${filters.search}"`);
    }
    
    if (filters.muscleGroup) {
        activeFilters.push(`<strong>Muscle:</strong> ${filters.muscleGroup}`);
    }
    
    // Show individual equipment selections
    if (filters.equipment && filters.equipment.length > 0) {
        const equipmentItems = filters.equipment.map(eq =>
            `<span class="badge bg-primary me-1 mb-1">${eq}</span>`
        ).join('');
        activeFilters.push(`<strong>Equipment:</strong><br>${equipmentItems}`);
    }
    
    if (filters.difficulty) {
        activeFilters.push(`<strong>Difficulty:</strong> ${filters.difficulty}`);
    }
    
    if (filters.exerciseTier) {
        const tierLabels = {
            '1': 'Standard (Tier 1)',
            '2': 'Standard (Tier 2)',
            '3': 'Specialized'
        };
        activeFilters.push(`<strong>Tier:</strong> ${tierLabels[filters.exerciseTier] || filters.exerciseTier}`);
    }
    
    if (filters.favoritesOnly) {
        activeFilters.push('<strong>Favorites only</strong>');
    }
    
    if (filters.customOnly) {
        activeFilters.push('<strong>Custom only</strong>');
    }
    
    // Show/hide feedback based on active filters
    if (activeFilters.length > 0) {
        feedbackText.innerHTML = `<div style="line-height: 1.8;">Active filters:<br>${activeFilters.join('<br>')}</div>`;
        feedbackContainer.style.display = 'block';
    } else {
        feedbackContainer.style.display = 'none';
    }
}

/**
 * Sort exercises
 */
function sortExercises(exercises, sortBy) {
    const sorted = [...exercises];
    
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'popularity':
            sorted.sort((a, b) => (b.popularityScore || 50) - (a.popularityScore || 50));
            break;
        case 'favorites':
            sorted.sort((a, b) => {
                const aFav = window.ghostGym.exercises.favorites.has(a.id) ? 1 : 0;
                const bFav = window.ghostGym.exercises.favorites.has(b.id) ? 1 : 0;
                if (aFav !== bFav) return bFav - aFav;
                return a.name.localeCompare(b.name);
            });
            break;
    }
    
    return sorted;
}

/**
 * Get difficulty badge with popover
 */
function getDifficultyBadgeWithPopover(difficulty) {
    if (!difficulty) return '';
    
    const difficultyInfo = {
        'Beginner': {
            color: 'success',
            icon: 'bx-trending-up',
            description: 'Perfect for those new to training. Focuses on learning proper form and building foundational strength.'
        },
        'Intermediate': {
            color: 'warning',
            icon: 'bx-bar-chart',
            description: 'For those with training experience. Requires good form and moderate strength levels.'
        },
        'Advanced': {
            color: 'danger',
            icon: 'bx-trophy',
            description: 'For experienced lifters. Demands excellent technique, strength, and body control.'
        }
    };
    
    const info = difficultyInfo[difficulty] || { color: 'secondary', icon: 'bx-info-circle', description: 'Difficulty level' };
    
    return `
        <span class="badge badge-outline-${info.color} difficulty-badge"
              style="font-size: 0.75rem; padding: 0.3rem 0.6rem; cursor: help; background: transparent;"
              data-bs-toggle="popover"
              data-bs-trigger="click hover focus"
              data-bs-placement="top"
              data-bs-custom-class="difficulty-popover"
              data-bs-html="true"
              data-bs-content="<div class='d-flex align-items-start gap-2'><i class='bx ${info.icon} mt-1'></i><div>${info.description}</div></div>"
              title="${difficulty}">
            ${difficulty}
        </span>
    `;
}

/**
 * Get tier badge HTML (compact version)
 */
function getTierBadgeCompact(exercise) {
    const exerciseTier = exercise.exerciseTier || 2;
    const isFoundational = exercise.isFoundational || false;
    
    if (isFoundational || exerciseTier === 1) {
        return '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';
    } else if (exerciseTier === 3) {
        return '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>';
    }
    return '';
}

/**
 * Initialize popovers for difficulty badges
 */
function initializePopovers() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach(popoverTriggerEl => {
        // Dispose existing popover if any
        const existingPopover = bootstrap.Popover.getInstance(popoverTriggerEl);
        if (existingPopover) {
            existingPopover.dispose();
        }
        
        // Create new popover
        new bootstrap.Popover(popoverTriggerEl, {
            container: 'body',
            html: true
        });
    });
}

/**
 * Get tier badge HTML (original for modal)
 */
function getTierBadge(exercise) {
    const exerciseTier = exercise.exerciseTier || 2;
    const isFoundational = exercise.isFoundational || false;
    
    if (isFoundational || exerciseTier === 1) {
        return '<span class="badge bg-warning ms-1"><i class="bx bxs-star"></i> Foundation</span>';
    } else if (exerciseTier === 2) {
        return '<span class="badge bg-info ms-1"><i class="bx bx-star"></i> Standard</span>';
    } else if (exerciseTier === 3) {
        return '<span class="badge bg-secondary ms-1" style="opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded"></i> Specialized</span>';
    }
    return '';
}

/**
 * Get unique muscle groups
 */
function getUniqueMuscleGroups() {
    return [...new Set(window.ghostGym.exercises.all
        .map(e => e.targetMuscleGroup)
        .filter(m => m))]
        .sort();
}

/**
 * Get unique equipment
 */
function getUniqueEquipment() {
    return [...new Set(window.ghostGym.exercises.all
        .map(e => e.primaryEquipment)
        .filter(e => e))]
        .sort();
}

/**
 * Update stats display
 */
function updateStats() {
    // Stats display removed from UI - keeping function for compatibility
    // Can be removed in future refactoring
}

/**
 * Toggle exercise favorite
 */
async function toggleExerciseFavorite(exerciseId) {
    if (!window.firebaseAuth?.currentUser) {
        showAlert('Please sign in to favorite exercises. Use the menu to log in.', 'warning');
        // Auth modal removed - users can sign in via menu
        return;
    }
    
    const isFavorited = window.ghostGym.exercises.favorites.has(exerciseId);
    
    // Find the button that was clicked
    const button = document.querySelector(`.favorite-btn[data-exercise-id="${exerciseId}"]`);
    const icon = button?.querySelector('i');
    
    // Optimistic UI update
    if (button && icon) {
        if (isFavorited) {
            icon.className = 'bx bx-heart';
            button.classList.remove('text-danger');
            button.title = 'Add to favorites';
        } else {
            icon.className = 'bx bxs-heart';
            button.classList.add('text-danger');
            button.title = 'Remove from favorites';
        }
    }
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        
        if (isFavorited) {
            const response = await fetch(exercisePage.getApiUrl(`/api/v3/users/me/favorites/${exerciseId}`), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                window.ghostGym.exercises.favorites.delete(exerciseId);
                console.log('✅ Removed from favorites');
            } else {
                // Revert optimistic update on failure
                if (button && icon) {
                    icon.className = 'bx bxs-heart';
                    button.classList.add('text-danger');
                    button.title = 'Remove from favorites';
                }
            }
        } else {
            const response = await fetch(exercisePage.getApiUrl('/api/v3/users/me/favorites'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exerciseId })
            });
            if (response.ok) {
                window.ghostGym.exercises.favorites.add(exerciseId);
                console.log('✅ Added to favorites');
            } else {
                // Revert optimistic update on failure
                if (button && icon) {
                    icon.className = 'bx bx-heart';
                    button.classList.remove('text-danger');
                    button.title = 'Add to favorites';
                }
            }
        }
        
        // Don't refresh the entire table - just update stats
        updateStats();
        
    } catch (error) {
        console.error('❌ Error toggling favorite:', error);
        showAlert('Failed to update favorite. Please try again.', 'danger');
        
        // Revert optimistic update on error
        if (button && icon) {
            if (isFavorited) {
                icon.className = 'bx bxs-heart';
                button.classList.add('text-danger');
                button.title = 'Remove from favorites';
            } else {
                icon.className = 'bx bx-heart';
                button.classList.remove('text-danger');
                button.title = 'Add to favorites';
            }
        }
    }
}

/**
 * Show exercise details modal
 */
function showExerciseDetails(exerciseId) {
    const exercise = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom]
        .find(e => e.id === exerciseId);
    
    if (!exercise) return;
    
    const modal = new bootstrap.Modal(document.getElementById('exerciseDetailModal'));
    document.getElementById('exerciseDetailTitle').textContent = exercise.name;
    
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <strong>Muscle Group:</strong><br>
                ${exercise.targetMuscleGroup || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Equipment:</strong><br>
                ${exercise.primaryEquipment || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Difficulty:</strong><br>
                ${exercise.difficultyLevel || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Mechanics:</strong><br>
                ${exercise.mechanics || 'N/A'}
            </div>
            ${exercise.popularityScore ? `
            <div class="col-md-6 mb-3">
                <strong>Popularity Score:</strong><br>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar" role="progressbar" style="width: ${exercise.popularityScore}%"
                         aria-valuenow="${exercise.popularityScore}" aria-valuemin="0" aria-valuemax="100">
                        ${exercise.popularityScore}/100
                    </div>
                </div>
            </div>
            ` : ''}
            ${!exercise.isGlobal ? `
            <div class="col-12">
                <span class="badge bg-label-primary">
                    <i class="bx bx-user me-1"></i>Custom Exercise
                </span>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('exerciseDetailBody').innerHTML = detailsHtml;
    modal.show();
}

/**
 * Add exercise to workout
 */
function addExerciseToWorkout(exercise) {
    showAlert(`Adding "${exercise.name}" to workout - This feature will be integrated with the workout builder!`, 'info');
}

/**
 * Exercise cache management
 */
function getExerciseCache() {
    try {
        const cached = localStorage.getItem('exercise_cache');
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error reading exercise cache:', error);
        return null;
    }
}

function setExerciseCache(exercises) {
    try {
        const cacheData = {
            exercises: exercises,
            timestamp: Date.now(),
            version: '1.1'
        };
        localStorage.setItem('exercise_cache', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting exercise cache:', error);
    }
}

function isExerciseCacheValid(cached) {
    if (cached.version !== '1.1') return false;
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
    return (Date.now() - cached.timestamp) < CACHE_DURATION;
}

/**
 * Initialize favorites button state on page load
 */
function initializeFavoritesButtonState() {
    // Wait for both bottom action bar and filter bar to be ready
    const checkComponents = setInterval(() => {
        if (window.bottomActionBar && window.filterBar) {
            clearInterval(checkComponents);
            
            // Get current filter state from FilterBar
            const currentFilters = window.filterBar.getFilters();
            const isActive = currentFilters.favoritesOnly || false;
            updateFavoritesButtonState(isActive);
            
            console.log('✅ Favorites button state initialized:', isActive ? 'active' : 'inactive');
        }
    }, 100);
    
    // Clear interval after 5 seconds if not found
    setTimeout(() => clearInterval(checkComponents), 5000);
}

/**
 * Update favorites button visual state
 * @param {boolean} isActive - Whether favorites filter is active
 */
function updateFavoritesButtonState(isActive) {
    if (!window.bottomActionBar) {
        console.warn('⚠️ Bottom action bar not available for state update');
        return;
    }
    
    console.log('🔄 Updating favorites button state:', isActive ? 'active' : 'inactive');
    
    // Update button icon and title
    window.bottomActionBar.updateButton('left-1', {
        icon: isActive ? 'bxs-heart' : 'bx-heart',
        title: isActive ? 'Show all exercises' : 'Show only favorites'
    });
    
    // Add/remove active class for color change
    const btn = document.querySelector('[data-action="left-1"]');
    if (btn) {
        btn.classList.toggle('active', isActive);
        console.log('✅ Button class updated:', btn.classList.contains('active') ? 'active' : 'inactive');
    }
}

// Export for global access
window.exerciseTable = exerciseTable;
window.filterBar = filterBar;
window.toggleExerciseFavorite = toggleExerciseFavorite;
window.showExerciseDetails = showExerciseDetails;
window.initSearchOverlay = initSearchOverlay;
window.showSearchOverlay = showSearchOverlay;
window.hideSearchOverlay = hideSearchOverlay;
window.addExerciseToWorkout = addExerciseToWorkout;
window.initializeFavoritesButtonState = initializeFavoritesButtonState;
window.updateFavoritesButtonState = updateFavoritesButtonState;

// Make filterBar available globally after initialization
window.addEventListener('DOMContentLoaded', () => {
    // Re-export after a short delay to ensure it's initialized
    setTimeout(() => {
        if (filterBar) {
            window.filterBar = filterBar;
            console.log('✅ FilterBar exported globally');
        }
    }, 500);
});

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
        placeholder: 'Search exercises by name, muscle group, or equipment...',
        onSearch: (searchTerm) => {
            // Update filter bar with search term
            if (filterBar) {
                const currentFilters = filterBar.getFilters();
                currentFilters.search = searchTerm;
                applyFiltersAndRender(currentFilters);
            }
            
            console.log('🔍 Search performed:', searchTerm);
        },
        onResultsCount: (searchTerm) => {
            if (!searchTerm) {
                return { count: 0, total: 0 };
            }
            
            // Calculate matching exercises
            let allExercises = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom];
            
            const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
            const filtered = allExercises.filter(exercise => {
                const searchableText = `${exercise.name} ${exercise.targetMuscleGroup || ''} ${exercise.primaryEquipment || ''}`.toLowerCase();
                return searchTerms.every(term => searchableText.includes(term));
            });
            
            return {
                count: filtered.length,
                total: allExercises.length
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

console.log('📦 Exercise Database module (refactored) loaded');

// Initialize search overlay when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchOverlay);
} else {
    // DOM already loaded
    setTimeout(initSearchOverlay, 100);
}