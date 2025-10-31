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
        
        // Initialize FilterBar component
        filterBar = new GhostGymFilterBar('filtersOffcanvas', {
            searchInputId: 'exerciseSearch',
            searchPlaceholder: 'Search exercises by name, muscle group, or equipment...',
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
                    key: 'muscleGroup',
                    label: 'Muscle Group',
                    type: 'select',
                    options: getUniqueMuscleGroups(),
                    placeholder: 'All Muscle Groups'
                },
                {
                    key: 'equipment',
                    label: 'Equipment',
                    type: 'select',
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
                console.log('🔍 Filters changed:', filters);
                applyFiltersAndRender(filters);
            }
        });
        
        // Initialize DataTable component
        exerciseTable = new GhostGymDataTable('exerciseTableContainer', {
            columns: [
                {
                    key: 'name',
                    label: 'Exercise Name',
                    sortable: true,
                    render: (value, row) => {
                        const isCustom = !row.isGlobal;
                        const tierBadge = getTierBadge(row);
                        return `
                            ${isCustom ? '<i class="bx bx-user text-primary me-2"></i>' : ''}
                            <span class="fw-medium">${exercisePage.escapeHtml(value)}</span>
                            ${tierBadge}
                        `;
                    }
                },
                {
                    key: 'targetMuscleGroup',
                    label: 'Muscle Group',
                    render: (value) => value 
                        ? `<span class="badge bg-label-primary">${exercisePage.escapeHtml(value)}</span>`
                        : '<span class="text-muted">-</span>'
                },
                {
                    key: 'primaryEquipment',
                    label: 'Equipment',
                    render: (value) => value
                        ? `<span class="badge bg-label-secondary">${exercisePage.escapeHtml(value)}</span>`
                        : '<span class="text-muted">-</span>'
                },
                {
                    key: 'difficultyLevel',
                    label: 'Difficulty',
                    render: (value) => value
                        ? `<span class="badge bg-label-info">${exercisePage.escapeHtml(value)}</span>`
                        : '<span class="text-muted">-</span>'
                },
                {
                    key: 'favorite',
                    label: 'Favorite',
                    className: 'text-center',
                    width: '80px',
                    render: (value, row) => {
                        const isFavorited = window.ghostGym.exercises.favorites.has(row.id);
                        return `
                            <button class="btn btn-sm btn-icon favorite-btn ${isFavorited ? 'favorited' : ''}" 
                                    data-exercise-id="${row.id}"
                                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                                <i class="bx ${isFavorited ? 'bxs-heart text-danger' : 'bx-heart'}"></i>
                            </button>
                        `;
                    }
                },
                {
                    key: 'actions',
                    label: 'Actions',
                    className: 'text-center',
                    width: '80px',
                    render: (value, row) => `
                        <div class="dropdown">
                            <button type="button" class="btn btn-sm p-0 dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
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
                    `
                }
            ],
            data: [],
            pageSize: 50,
            pageSizeOptions: [25, 50, 100, 250],
            emptyMessage: 'No exercises found. Try adjusting your filters or search query.',
            loadingMessage: 'Loading exercises...',
            onRowClick: null, // Disable row click, use action buttons instead
            onPageChange: (page, info) => {
                console.log(`📄 Page ${page}: showing ${info.startIndex}-${info.endIndex} of ${info.totalItems}`);
            }
        });
        
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
    
    // Apply equipment filter
    if (filters.equipment) {
        allExercises = allExercises.filter(e => e.primaryEquipment === filters.equipment);
    }
    
    // Apply difficulty filter
    if (filters.difficulty) {
        allExercises = allExercises.filter(e => e.difficultyLevel === filters.difficulty);
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
 * Get tier badge HTML
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
    const favCount = document.getElementById('favoritesCount');
    const customCount = document.getElementById('customCount');
    const showingCount = document.getElementById('showingCount');
    
    if (favCount) favCount.textContent = window.ghostGym.exercises.favorites.size;
    if (customCount) customCount.textContent = window.ghostGym.exercises.custom.length;
    if (showingCount && exerciseTable) {
        showingCount.textContent = exerciseTable.getFilteredData().length;
    }
}

/**
 * Toggle exercise favorite
 */
async function toggleExerciseFavorite(exerciseId) {
    if (!window.firebaseAuth?.currentUser) {
        showAlert('Please sign in to favorite exercises', 'warning');
        showAuthModal();
        return;
    }
    
    const isFavorited = window.ghostGym.exercises.favorites.has(exerciseId);
    
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
            }
        }
        
        // Refresh table to update favorite icons
        exerciseTable.refresh();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error toggling favorite:', error);
        showAlert('Failed to update favorite. Please try again.', 'danger');
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

// Export for global access
window.exerciseTable = exerciseTable;
window.filterBar = filterBar;
window.toggleExerciseFavorite = toggleExerciseFavorite;
window.showExerciseDetails = showExerciseDetails;
window.addExerciseToWorkout = addExerciseToWorkout;

console.log('📦 Exercise Database module (refactored) loaded');