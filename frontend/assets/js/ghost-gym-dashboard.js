/**
 * Ghost Gym V0.4.1 - Sneat Dashboard Integration
 * 
 * This file integrates the existing V3 functionality with the new Sneat template
 * while preserving all Firebase authentication, data management, and sync capabilities.
 */

/**
 * Get API URL with proper base path
 * Uses window.GHOST_GYM_API_URL if set, otherwise uses same-origin
 */
function getApiUrl(path) {
    const baseUrl = window.GHOST_GYM_API_URL || '';
    return baseUrl + path;
}

// Global state management
window.ghostGym = {
    currentProgram: null,
    programs: [],
    workouts: [],
    isLoading: false,
    searchFilters: {
        programs: '',
        workouts: ''
    },
    // Exercise Database state
    exercises: {
        all: [],
        favorites: new Set(),
        custom: [],
        filtered: [],
        displayed: [],
        currentPage: 1,
        pageSize: 50,
        filters: {
            search: '',
            muscleGroup: '',
            equipment: '',
            difficulty: '',
            sortBy: 'name',
            favoritesOnly: false,
            customOnly: false
        }
    }
};

// Wait for Firebase to be ready before initializing
document.addEventListener('DOMContentLoaded', function() {
    if (window.firebaseReady) {
        initializeGhostGym();
    } else {
        window.addEventListener('firebaseReady', initializeGhostGym);
    }
});

/**
 * Initialize Ghost Gym Dashboard
 */
function initializeGhostGym() {
    console.log('🚀 Initializing Ghost Gym V0.4.1 Dashboard');
    
    // Initialize Sneat components
    initSneatComponents();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize data management (preserve existing functionality)
    initDataManagement();
    
    // Load initial data
    loadDashboardData();
    
    console.log('✅ Ghost Gym Dashboard initialized successfully');
}

/**
 * Initialize Sneat-specific components
 */
function initSneatComponents() {
    // Initialize Perfect Scrollbar for lists
    if (typeof PerfectScrollbar !== 'undefined') {
        new PerfectScrollbar('#programsList', {
            wheelPropagation: false,
            suppressScrollX: true
        });
        
        new PerfectScrollbar('#workoutsList', {
            wheelPropagation: false,
            suppressScrollX: true
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize drag and drop for program workouts (preserve existing logic)
    initSortableWorkouts();
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Program management
    document.getElementById('newProgramBtn')?.addEventListener('click', showProgramModal);
    document.getElementById('createFirstProgramBtn')?.addEventListener('click', showProgramModal);
    document.getElementById('saveProgramBtn')?.addEventListener('click', saveProgram);
    document.getElementById('editProgramBtn')?.addEventListener('click', editCurrentProgram);
    document.getElementById('previewProgramBtn')?.addEventListener('click', previewProgram);
    document.getElementById('generateProgramBtn')?.addEventListener('click', showGenerateModal);
    
    // Workout management
    document.getElementById('newWorkoutBtn')?.addEventListener('click', showWorkoutModal);
    document.getElementById('createFirstWorkoutBtn')?.addEventListener('click', showWorkoutModal);
    document.getElementById('saveWorkoutBtn')?.addEventListener('click', saveWorkout);
    document.getElementById('addExerciseGroupBtn')?.addEventListener('click', addExerciseGroup);
    document.getElementById('addBonusExerciseBtn')?.addEventListener('click', addBonusExercise);
    
    // Search functionality
    document.getElementById('programSearch')?.addEventListener('input', debounce(filterPrograms, 300));
    document.getElementById('workoutSearch')?.addEventListener('input', debounce(filterWorkouts, 300));
    document.getElementById('globalSearch')?.addEventListener('input', debounce(globalSearch, 300));
    
    // Generation and preview
    document.getElementById('confirmGenerateBtn')?.addEventListener('click', generateDocument);
    document.getElementById('generateFromPreviewBtn')?.addEventListener('click', showGenerateModal);
    
    // Authentication (preserve existing auth functionality)
    document.getElementById('headerSignInBtn')?.addEventListener('click', showAuthModal);
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
    
    // Menu navigation
    document.getElementById('menuPrograms')?.addEventListener('click', focusProgramsPanel);
    document.getElementById('menuWorkouts')?.addEventListener('click', focusWorkoutsPanel);
    document.getElementById('menuExercises')?.addEventListener('click', showExerciseDatabasePanel);
    document.getElementById('menuBackup')?.addEventListener('click', showBackupOptions);
    document.getElementById('menuSettings')?.addEventListener('click', showSettings);
    
    // Exercise Database events
    document.getElementById('exerciseSearch')?.addEventListener('input', debounce(filterExercises, 300));
    document.getElementById('sortBySelect')?.addEventListener('change', filterExercises);
    document.getElementById('muscleGroupFilter')?.addEventListener('change', filterExercises);
    document.getElementById('equipmentFilter')?.addEventListener('change', filterExercises);
    document.getElementById('difficultyFilter')?.addEventListener('change', filterExercises);
    document.getElementById('showFavoritesOnly')?.addEventListener('change', filterExercises);
    document.getElementById('showCustomOnly')?.addEventListener('change', filterExercises);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearExerciseFilters);
    document.getElementById('refreshExercisesBtn')?.addEventListener('click', refreshExercises);
    document.getElementById('exerciseLoadMoreBtn')?.addEventListener('click', loadMoreExercises);
    
    // Modal events
    document.getElementById('programModal')?.addEventListener('hidden.bs.modal', clearProgramForm);
    document.getElementById('workoutModal')?.addEventListener('hidden.bs.modal', clearWorkoutForm);
}

/**
 * Initialize data management (preserve existing V3 functionality)
 */
function initDataManagement() {
    // Ensure data manager is available
    if (window.dataManager) {
        console.log('✅ Data Manager available');
        
        // Set up data change listeners
        window.dataManager.onDataChange = function(type, data) {
            if (type === 'programs') {
                window.ghostGym.programs = data;
                renderPrograms();
            } else if (type === 'workouts') {
                window.ghostGym.workouts = data;
                renderWorkouts();
            }
            updateStats();
        };
    } else {
        console.warn('⚠️ Data Manager not available, using fallback');
    }
    
    // Ensure auth service is available
    if (window.authService) {
        console.log('✅ Auth Service available');
        
        // Set up auth state listener
        window.authService.onAuthStateChanged = function(user) {
            console.log('🔍 DEBUG: Auth state changed in dashboard, user:', user ? 'authenticated' : 'not authenticated');
            updateAuthUI(user);
            if (user) {
                // User signed in, reload data from Firestore
                console.log('🔍 DEBUG: User authenticated, reloading dashboard data from Firestore');
                loadDashboardData();
            }
        };
    }
    
    // Also listen for the authStateChanged event from data manager
    window.addEventListener('authStateChanged', (event) => {
        const { user, isAuthenticated } = event.detail;
        console.log('🔍 DEBUG: authStateChanged event received, isAuthenticated:', isAuthenticated);
        if (isAuthenticated && user) {
            // User just authenticated, reload data from Firestore
            console.log('🔍 DEBUG: Reloading data after authentication');
            setTimeout(() => loadDashboardData(), 500); // Small delay to ensure storage mode is updated
        }
    });
    
    // Ensure sync manager is available
    if (window.syncManager) {
        console.log('✅ Sync Manager available');
        
        // Set up sync status listener
        window.syncManager.onSyncStatusChange = function(status) {
            updateSyncStatus(status);
        };
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        console.log('🔍 DEBUG: loadDashboardData called');
        showLoading(true);
        
        // Load programs and workouts using existing data manager
        if (window.dataManager) {
            console.log('🔍 DEBUG: Using dataManager to load data');
            const [programs, workouts] = await Promise.all([
                window.dataManager.getPrograms(),
                window.dataManager.getWorkouts()
            ]);
            
            console.log('🔍 DEBUG: Loaded from dataManager:', { programs: programs?.length, workouts: workouts?.length });
            
            window.ghostGym.programs = programs || [];
            window.ghostGym.workouts = workouts || [];
        } else {
            console.log('🔍 DEBUG: Fallback to localStorage');
            // Fallback to localStorage if data manager not available
            window.ghostGym.programs = JSON.parse(localStorage.getItem('gym_programs') || '[]');
            window.ghostGym.workouts = JSON.parse(localStorage.getItem('gym_workouts') || '[]');
        }
        
        console.log('🔍 DEBUG: Final data counts:', {
            programs: window.ghostGym.programs.length,
            workouts: window.ghostGym.workouts.length
        });
        
        // Render data
        console.log('🔍 DEBUG: Calling renderPrograms()');
        renderPrograms();
        console.log('🔍 DEBUG: Calling renderWorkouts()');
        renderWorkouts();
        console.log('🔍 DEBUG: Calling updateStats()');
        updateStats();
        
        // Show welcome panel if no data
        if (window.ghostGym.programs.length === 0 && window.ghostGym.workouts.length === 0) {
            console.log('🔍 DEBUG: No data, showing welcome panel');
            showWelcomePanel();
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showAlert('Error loading data. Please refresh the page.', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Render programs list
 */
function renderPrograms() {
    console.log('🔍 DEBUG: renderPrograms called with', window.ghostGym.programs.length, 'programs');
    const programsList = document.getElementById('programsList');
    if (!programsList) {
        console.log('❌ DEBUG: programsList element not found!');
        return;
    }
    
    const filteredPrograms = window.ghostGym.programs.filter(program =>
        program.name.toLowerCase().includes(window.ghostGym.searchFilters.programs.toLowerCase())
    );
    console.log('🔍 DEBUG: Filtered to', filteredPrograms.length, 'programs');
    
    if (filteredPrograms.length === 0) {
        programsList.innerHTML = `
            <div class="list-group-item text-center py-4">
                <i class="bx bx-folder-open display-4 text-muted mb-2"></i>
                <p class="text-muted mb-0">No programs found</p>
                <small class="text-muted">Create your first program to get started</small>
            </div>
        `;
        return;
    }
    
    programsList.innerHTML = filteredPrograms.map(program => `
        <div class="list-group-item program-item" data-program-id="${program.id}" onclick="selectProgram('${program.id}')">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${escapeHtml(program.name)}</h6>
                    <p class="mb-1 text-muted small">${escapeHtml(program.description || 'No description')}</p>
                    <div class="program-stats">
                        <span class="program-stat">
                            <i class="bx bx-dumbbell"></i>
                            ${program.workouts?.length || 0} workouts
                        </span>
                        <span class="program-stat">
                            <i class="bx bx-time"></i>
                            ${program.duration_weeks || 0} weeks
                        </span>
                        <span class="program-stat">
                            <i class="bx bx-trending-up"></i>
                            ${program.difficulty_level || 'intermediate'}
                        </span>
                    </div>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-ghost-secondary" type="button" data-bs-toggle="dropdown">
                        <i class="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="editProgram('${program.id}')">
                            <i class="bx bx-edit me-2"></i>Edit
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="duplicateProgram('${program.id}')">
                            <i class="bx bx-copy me-2"></i>Duplicate
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteProgram('${program.id}')">
                            <i class="bx bx-trash me-2"></i>Delete
                        </a></li>
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render workouts list
 */
function renderWorkouts() {
    console.log('🔍 DEBUG: renderWorkouts called with', window.ghostGym.workouts.length, 'workouts');
    const workoutsList = document.getElementById('workoutsList');
    if (!workoutsList) {
        console.log('❌ DEBUG: workoutsList element not found!');
        return;
    }
    
    const filteredWorkouts = window.ghostGym.workouts.filter(workout =>
        workout.name.toLowerCase().includes(window.ghostGym.searchFilters.workouts.toLowerCase())
    );
    console.log('🔍 DEBUG: Filtered to', filteredWorkouts.length, 'workouts');
    
    if (filteredWorkouts.length === 0) {
        workoutsList.innerHTML = `
            <div class="list-group-item text-center py-4">
                <i class="bx bx-dumbbell display-4 text-muted mb-2"></i>
                <p class="text-muted mb-0">No workouts found</p>
                <small class="text-muted">Create your first workout template</small>
            </div>
        `;
        return;
    }
    
    workoutsList.innerHTML = filteredWorkouts.map(workout => `
        <div class="list-group-item workout-item" data-workout-id="${workout.id}" draggable="true">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${escapeHtml(workout.name)}</h6>
                    <p class="mb-1 text-muted small">${escapeHtml(workout.description || 'No description')}</p>
                    <div class="workout-stats">
                        <span class="program-stat">
                            <i class="bx bx-list-ul"></i>
                            ${workout.exercise_groups?.length || 0} groups
                        </span>
                        <span class="program-stat">
                            <i class="bx bx-plus-circle"></i>
                            ${workout.bonus_exercises?.length || 0} bonus
                        </span>
                    </div>
                    ${workout.tags && workout.tags.length > 0 ? `
                        <div class="workout-tags">
                            ${workout.tags.map(tag => `<span class="workout-tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-ghost-secondary" type="button" data-bs-toggle="dropdown">
                        <i class="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="editWorkout('${workout.id}')">
                            <i class="bx bx-edit me-2"></i>Edit
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="duplicateWorkout('${workout.id}')">
                            <i class="bx bx-copy me-2"></i>Duplicate
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteWorkout('${workout.id}')">
                            <i class="bx bx-trash me-2"></i>Delete
                        </a></li>
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add drag and drop event listeners
    addWorkoutDragListeners();
}

/**
 * Select a program and show its details
 */
function selectProgram(programId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    if (!program) return;
    
    window.ghostGym.currentProgram = program;
    
    // Update active state
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-program-id="${programId}"]`)?.classList.add('active');
    
    // Show program details panel
    showProgramDetails(program);
    hideWelcomePanel();
}

/**
 * Show program details
 */
function showProgramDetails(program) {
    const detailsPanel = document.getElementById('programDetailsPanel');
    const welcomePanel = document.getElementById('welcomePanel');
    
    if (!detailsPanel) return;
    
    // Hide welcome panel and show details
    welcomePanel.style.display = 'none';
    detailsPanel.style.display = 'block';
    
    // Update title
    const title = document.getElementById('programDetailsTitle');
    if (title) {
        title.innerHTML = `<i class="bx bx-folder-open me-2"></i>${escapeHtml(program.name)}`;
    }
    
    // Render program info
    const programInfo = document.getElementById('programInfo');
    if (programInfo) {
        programInfo.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-muted mb-2">Description</h6>
                    <p class="mb-3">${escapeHtml(program.description || 'No description provided')}</p>
                </div>
                <div class="col-md-6">
                    <div class="row">
                        <div class="col-6">
                            <h6 class="text-muted mb-2">Duration</h6>
                            <p class="mb-3">${program.duration_weeks || 0} weeks</p>
                        </div>
                        <div class="col-6">
                            <h6 class="text-muted mb-2">Difficulty</h6>
                            <p class="mb-3">${program.difficulty_level || 'intermediate'}</p>
                        </div>
                    </div>
                </div>
            </div>
            ${program.tags && program.tags.length > 0 ? `
                <div class="mb-3">
                    <h6 class="text-muted mb-2">Tags</h6>
                    <div class="workout-tags">
                        ${program.tags.map(tag => `<span class="workout-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    // Render program workouts
    renderProgramWorkouts(program);
}

/**
 * Render program workouts
 */
function renderProgramWorkouts(program) {
    const programWorkouts = document.getElementById('programWorkouts');
    if (!programWorkouts) return;
    
    if (!program.workouts || program.workouts.length === 0) {
        programWorkouts.innerHTML = `
            <div class="text-center py-4">
                <i class="bx bx-dumbbell display-4 text-muted mb-2"></i>
                <p class="text-muted mb-2">No workouts in this program</p>
                <small class="text-muted">Drag workouts from the library to add them</small>
            </div>
        `;
        return;
    }
    
    programWorkouts.innerHTML = program.workouts.map((programWorkout, index) => {
        const workout = window.ghostGym.workouts.find(w => w.id === programWorkout.workout_id);
        if (!workout) return '';
        
        return `
            <div class="workout-item" data-workout-id="${workout.id}" data-order="${index}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <i class="bx bx-menu me-3 text-muted" style="cursor: grab;"></i>
                        <div>
                            <h6 class="mb-1">${escapeHtml(programWorkout.custom_name || workout.name)}</h6>
                            <small class="text-muted">
                                ${workout.exercise_groups?.length || 0} groups, 
                                ${workout.bonus_exercises?.length || 0} bonus exercises
                            </small>
                        </div>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" onclick="editProgramWorkout('${program.id}', '${workout.id}')">
                            <i class="bx bx-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="removeWorkoutFromProgram('${program.id}', '${workout.id}')">
                            <i class="bx bx-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Initialize sortable workouts (preserve existing drag-and-drop functionality)
 */
function initSortableWorkouts() {
    const programWorkouts = document.getElementById('programWorkouts');
    if (programWorkouts && typeof Sortable !== 'undefined') {
        new Sortable(programWorkouts, {
            handle: '.bx-menu',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                if (window.ghostGym.currentProgram) {
                    reorderProgramWorkouts(evt);
                }
            }
        });
    }
}

/**
 * Add workout drag listeners for adding to programs
 */
function addWorkoutDragListeners() {
    const workoutItems = document.querySelectorAll('.workout-item[draggable="true"]');
    
    workoutItems.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.workoutId);
            this.classList.add('dragging');
        });
        
        item.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
    });
    
    // Add drop zone for program workouts
    const programWorkouts = document.getElementById('programWorkouts');
    if (programWorkouts) {
        programWorkouts.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        programWorkouts.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        programWorkouts.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const workoutId = e.dataTransfer.getData('text/plain');
            if (workoutId && window.ghostGym.currentProgram) {
                addWorkoutToProgram(window.ghostGym.currentProgram.id, workoutId);
            }
        });
    }
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    window.ghostGym.isLoading = show;
    
    // Update UI to show loading state
    const loadingElements = document.querySelectorAll('.loading-overlay');
    loadingElements.forEach(el => {
        el.style.display = show ? 'flex' : 'none';
    });
}

/**
 * Show welcome panel
 */
function showWelcomePanel() {
    const welcomePanel = document.getElementById('welcomePanel');
    const detailsPanel = document.getElementById('programDetailsPanel');
    
    if (welcomePanel) welcomePanel.style.display = 'block';
    if (detailsPanel) detailsPanel.style.display = 'none';
}

/**
 * Hide welcome panel
 */
function hideWelcomePanel() {
    const welcomePanel = document.getElementById('welcomePanel');
    if (welcomePanel) welcomePanel.style.display = 'none';
}

/**
 * Update stats display
 */
function updateStats() {
    const statsDisplay = document.getElementById('statsDisplay');
    if (statsDisplay) {
        const programCount = window.ghostGym.programs.length;
        const workoutCount = window.ghostGym.workouts.length;
        
        statsDisplay.innerHTML = `
            <span class="stats-item">
                <i class="bx bx-folder"></i>
                ${programCount} programs
            </span>
            <span class="stats-item">
                <i class="bx bx-dumbbell"></i>
                ${workoutCount} workouts
            </span>
        `;
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertId = 'alert-' + Date.now();
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            <i class="bx bx-${type === 'success' ? 'check-circle' : type === 'danger' ? 'error' : type === 'warning' ? 'error-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Filter programs
 */
function filterPrograms() {
    const searchInput = document.getElementById('programSearch');
    if (searchInput) {
        window.ghostGym.searchFilters.programs = searchInput.value;
        renderPrograms();
    }
}

/**
 * Filter workouts
 */
function filterWorkouts() {
    const searchInput = document.getElementById('workoutSearch');
    if (searchInput) {
        window.ghostGym.searchFilters.workouts = searchInput.value;
        renderWorkouts();
    }
}

/**
 * Global search
 */
function globalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        const query = searchInput.value;
        window.ghostGym.searchFilters.programs = query;
        window.ghostGym.searchFilters.workouts = query;
        renderPrograms();
        renderWorkouts();
    }
}

// Placeholder functions for modal and form management
// These will integrate with your existing V3 modal functionality

function showProgramModal() {
    const modal = new bootstrap.Modal(document.getElementById('programModal'));
    modal.show();
}

function showWorkoutModal() {
    const modal = new bootstrap.Modal(document.getElementById('workoutModal'));
    modal.show();
}

function showAuthModal() {
    if (window.authUI && window.authUI.showAuthModal) {
        window.authUI.showAuthModal();
    } else {
        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        modal.show();
    }
}

function showGenerateModal() {
    const modal = new bootstrap.Modal(document.getElementById('generateModal'));
    modal.show();
}

// Integrated V3 functionality with Sneat UI

/**
 * Save program (integrated with existing V3 functionality)
 */
async function saveProgram() {
    try {
        const form = document.getElementById('programForm');
        if (!form) return;
        
        // Collect form data
        const programData = {
            name: document.getElementById('programName')?.value?.trim(),
            description: document.getElementById('programDescription')?.value?.trim(),
            duration_weeks: parseInt(document.getElementById('programDuration')?.value) || null,
            difficulty_level: document.getElementById('programDifficulty')?.value || 'intermediate',
            tags: document.getElementById('programTags')?.value?.split(',').map(tag => tag.trim()).filter(tag => tag) || []
        };
        
        // Validate required fields
        if (!programData.name) {
            showAlert('Program name is required', 'danger');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveProgramBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
        saveBtn.disabled = true;
        
        // Save using data manager
        const savedProgram = await window.dataManager.createProgram(programData);
        
        // Update local state
        window.ghostGym.programs.unshift(savedProgram);
        renderPrograms();
        updateStats();
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('programModal'));
        modal.hide();
        showAlert(`Program "${savedProgram.name}" created successfully!`, 'success');
        
        // Select the new program
        selectProgram(savedProgram.id);
        
    } catch (error) {
        console.error('❌ Error saving program:', error);
        showAlert('Failed to save program: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveProgramBtn');
        if (saveBtn) {
            saveBtn.innerHTML = 'Save Program';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Save workout (integrated with existing V3 functionality)
 */
async function saveWorkout() {
    try {
        const form = document.getElementById('workoutForm');
        if (!form) return;
        
        // Collect basic workout data
        const workoutData = {
            name: document.getElementById('workoutName')?.value?.trim(),
            description: document.getElementById('workoutDescription')?.value?.trim(),
            tags: document.getElementById('workoutTags')?.value?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            exercise_groups: collectExerciseGroups(),
            bonus_exercises: collectBonusExercises()
        };
        
        // Validate required fields
        if (!workoutData.name) {
            showAlert('Workout name is required', 'danger');
            return;
        }
        
        if (workoutData.exercise_groups.length === 0) {
            showAlert('At least one exercise group is required', 'danger');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveWorkoutBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
        saveBtn.disabled = true;
        
        // Save using data manager
        const savedWorkout = await window.dataManager.createWorkout(workoutData);
        
        // Update local state
        window.ghostGym.workouts.unshift(savedWorkout);
        renderWorkouts();
        updateStats();
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('workoutModal'));
        modal.hide();
        showAlert(`Workout "${savedWorkout.name}" created successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Error saving workout:', error);
        showAlert('Failed to save workout: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveWorkoutBtn');
        if (saveBtn) {
            saveBtn.innerHTML = 'Save Workout';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Collect exercise groups from form
 */
function collectExerciseGroups() {
    const groups = [];
    const groupElements = document.querySelectorAll('#exerciseGroups .exercise-group');
    
    groupElements.forEach(groupEl => {
        const exercises = {};
        const exerciseInputs = groupEl.querySelectorAll('.exercise-input');
        
        exerciseInputs.forEach((input, index) => {
            const value = input.value.trim();
            if (value) {
                const letter = String.fromCharCode(97 + index); // a, b, c, etc.
                exercises[letter] = value;
            }
        });
        
        if (Object.keys(exercises).length > 0) {
            groups.push({
                exercises: exercises,
                sets: groupEl.querySelector('.sets-input')?.value || '3',
                reps: groupEl.querySelector('.reps-input')?.value || '8-12',
                rest: groupEl.querySelector('.rest-input')?.value || '60s'
            });
        }
    });
    
    return groups;
}

/**
 * Collect bonus exercises from form
 */
function collectBonusExercises() {
    const bonusExercises = [];
    const bonusElements = document.querySelectorAll('#bonusExercises .bonus-exercise');
    
    bonusElements.forEach(bonusEl => {
        const name = bonusEl.querySelector('.bonus-name-input')?.value?.trim();
        if (name) {
            bonusExercises.push({
                name: name,
                sets: bonusEl.querySelector('.bonus-sets-input')?.value || '2',
                reps: bonusEl.querySelector('.bonus-reps-input')?.value || '15',
                rest: bonusEl.querySelector('.bonus-rest-input')?.value || '30s'
            });
        }
    });
    
    return bonusExercises;
}

/**
 * Add exercise group to workout form
 */
function addExerciseGroup() {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;
    
    const groupCount = container.children.length + 1;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const groupHtml = `
        <div class="card mb-3 exercise-group" data-group-id="${groupId}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Exercise Group ${groupCount}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeExerciseGroup(this)">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Exercise A</label>
                        <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                               id="exercise-${groupId}-a" placeholder="Search exercises...">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Exercise B (optional)</label>
                        <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                               id="exercise-${groupId}-b" placeholder="Search exercises...">
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Exercise C (optional)</label>
                        <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                               id="exercise-${groupId}-c" placeholder="Search exercises...">
                    </div>
                    <div class="col-md-6">
                        <button type="button" class="btn btn-outline-secondary btn-sm mt-4" onclick="addExerciseToGroup(this)">
                            <i class="bx bx-plus me-1"></i>Add Exercise
                        </button>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <label class="form-label">Sets</label>
                        <input type="text" class="form-control sets-input" value="3" placeholder="e.g., 3">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Reps</label>
                        <input type="text" class="form-control reps-input" value="8-12" placeholder="e.g., 8-12">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control rest-input" value="60s" placeholder="e.g., 60s">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', groupHtml);
    
    // Initialize autocomplete on new exercise inputs
    initializeExerciseAutocompletes();
}

/**
 * Add bonus exercise to workout form
 */
function addBonusExercise() {
    const container = document.getElementById('bonusExercises');
    if (!container) return;
    
    const bonusId = `bonus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const bonusHtml = `
        <div class="card mb-3 bonus-exercise" data-bonus-id="${bonusId}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Bonus Exercise</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeBonusExercise(this)">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-12">
                        <label class="form-label">Exercise Name</label>
                        <input type="text" class="form-control bonus-name-input exercise-autocomplete-input"
                               id="bonus-${bonusId}" placeholder="Search exercises...">
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <label class="form-label">Sets</label>
                        <input type="text" class="form-control bonus-sets-input" value="2" placeholder="e.g., 2">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Reps</label>
                        <input type="text" class="form-control bonus-reps-input" value="15" placeholder="e.g., 15">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control bonus-rest-input" value="30s" placeholder="e.g., 30s">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', bonusHtml);
    
    // Initialize autocomplete on new bonus exercise input
    initializeExerciseAutocompletes();
}

/**
 * Remove exercise group
 */
function removeExerciseGroup(button) {
    const group = button.closest('.exercise-group');
    if (group) {
        group.remove();
        // Renumber remaining groups
        renumberExerciseGroups();
    }
}

/**
 * Remove bonus exercise
 */
function removeBonusExercise(button) {
    const bonus = button.closest('.bonus-exercise');
    if (bonus) {
        bonus.remove();
    }
}

/**
 * Renumber exercise groups
 */
function renumberExerciseGroups() {
    const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
    groups.forEach((group, index) => {
        const header = group.querySelector('.card-header h6');
        if (header) {
            header.textContent = `Exercise Group ${index + 1}`;
        }
    });
}

/**
 * Add exercise to existing group
 */
function addExerciseToGroup(button) {
    const group = button.closest('.exercise-group');
    const exerciseInputs = group.querySelectorAll('.exercise-input');
    const nextLetter = String.fromCharCode(97 + exerciseInputs.length); // d, e, f, etc.
    
    if (exerciseInputs.length >= 6) {
        showAlert('Maximum 6 exercises per group', 'warning');
        return;
    }
    
    const groupId = group.dataset.groupId;
    const exerciseId = `exercise-${groupId}-${nextLetter}`;
    
    const newExerciseHtml = `
        <div class="col-md-6 mb-3">
            <label class="form-label">Exercise ${nextLetter.toUpperCase()} (optional)</label>
            <div class="input-group">
                <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                       id="${exerciseId}" placeholder="Search exercises...">
                <button type="button" class="btn btn-outline-danger" onclick="removeExerciseFromGroup(this)">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    const lastRow = group.querySelector('.row:last-of-type');
    lastRow.insertAdjacentHTML('beforebegin', `<div class="row">${newExerciseHtml}</div>`);
    
    // Initialize autocomplete on new input
    initializeExerciseAutocompletes();
}

/**
 * Remove exercise from group
 */
function removeExerciseFromGroup(button) {
    const exerciseDiv = button.closest('.col-md-6');
    const row = exerciseDiv.parentElement;
    
    exerciseDiv.remove();
    
    // Remove row if empty
    if (row.children.length === 0) {
        row.remove();
    }
}

/**
 * Clear program form
 */
function clearProgramForm() {
    const form = document.getElementById('programForm');
    if (form) {
        form.reset();
        // Reset to default values
        document.getElementById('programDifficulty').value = 'intermediate';
    }
}

/**
 * Clear workout form
 */
function clearWorkoutForm() {
    const form = document.getElementById('workoutForm');
    if (form) {
        form.reset();
        // Clear dynamic content
        document.getElementById('exerciseGroups').innerHTML = '';
        document.getElementById('bonusExercises').innerHTML = '';
        // Add initial exercise group
        addExerciseGroup();
    }
}

/**
 * Edit current program
 */
function editCurrentProgram() {
    if (window.ghostGym.currentProgram) {
        editProgram(window.ghostGym.currentProgram.id);
    }
}

/**
 * Edit program by ID
 */
function editProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    // Populate form with program data
    document.getElementById('programName').value = program.name || '';
    document.getElementById('programDescription').value = program.description || '';
    document.getElementById('programDuration').value = program.duration_weeks || '';
    document.getElementById('programDifficulty').value = program.difficulty_level || 'intermediate';
    document.getElementById('programTags').value = program.tags ? program.tags.join(', ') : '';
    
    // Update modal title
    document.getElementById('programModalTitle').textContent = 'Edit Program';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('programModal'));
    modal.show();
}

/**
 * Preview program
 */
async function previewProgram() {
    if (!window.ghostGym.currentProgram) {
        showAlert('No program selected', 'warning');
        return;
    }
    
    try {
        // Show preview modal
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
        
        // Show loading
        document.getElementById('previewLoading').classList.remove('d-none');
        document.getElementById('previewFrame').classList.add('d-none');
        
        // Generate preview
        const response = await fetch(getApiUrl(`/api/v3/programs/${window.ghostGym.currentProgram.id}/preview-html`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await window.dataManager.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate preview');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Show preview
        document.getElementById('previewLoading').classList.add('d-none');
        const frame = document.getElementById('previewFrame');
        frame.src = url;
        frame.classList.remove('d-none');
        
    } catch (error) {
        console.error('❌ Error generating preview:', error);
        showAlert('Failed to generate preview: ' + error.message, 'danger');
        
        // Hide loading
        document.getElementById('previewLoading').classList.add('d-none');
    }
}

/**
 * Generate document
 */
async function generateDocument() {
    if (!window.ghostGym.currentProgram) {
        showAlert('No program selected', 'warning');
        return;
    }
    
    try {
        // Get generation options
        const format = document.querySelector('input[name="format"]:checked')?.value || 'html';
        const startDate = document.getElementById('startDate')?.value;
        const includeCover = document.getElementById('includeCover')?.checked;
        const includeToc = document.getElementById('includeToc')?.checked;
        const includeProgress = document.getElementById('includeProgress')?.checked;
        
        console.log('🔍 DEBUG: Generation request:', {
            programId: window.ghostGym.currentProgram.id,
            format,
            startDate,
            includeCover,
            includeToc,
            includeProgress
        });
        
        // Show loading state
        const generateBtn = document.getElementById('confirmGenerateBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Generating...';
        generateBtn.disabled = true;
        
        // Prepare request body with proper validation (matching GenerateProgramDocumentRequest model)
        const requestBody = {
            program_id: window.ghostGym.currentProgram.id,
            start_date: startDate || null,
            include_cover_page: includeCover !== false, // Default to true
            include_table_of_contents: includeToc !== false,     // Default to true
            include_progress_tracking: includeProgress !== false // Default to true
        };
        
        console.log('🔍 DEBUG: Request body:', requestBody);
        
        // Get auth token
        let authToken = null;
        try {
            if (window.dataManager && window.dataManager.getAuthToken) {
                authToken = await window.dataManager.getAuthToken();
                console.log('🔍 DEBUG: Auth token obtained:', authToken ? 'Yes' : 'No');
            } else if (window.authService && window.authService.getIdToken) {
                authToken = await window.authService.getIdToken();
                console.log('🔍 DEBUG: Auth token from authService:', authToken ? 'Yes' : 'No');
            }
        } catch (authError) {
            console.warn('⚠️ Could not get auth token:', authError.message);
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        console.log('🔍 DEBUG: Request headers:', headers);
        
        // Generate document
        const endpoint = format === 'pdf' ? 'generate-pdf' : 'generate-html';
        const url = `/api/v3/programs/${window.ghostGym.currentProgram.id}/${endpoint}`;
        
        console.log('🔍 DEBUG: Making request to:', url);
        
        const response = await fetch(getApiUrl(url), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        console.log('🔍 DEBUG: Response status:', response.status);
        console.log('🔍 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            let errorMessage = 'Failed to generate document';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
                console.error('🔍 DEBUG: Error response:', errorData);
            } catch (e) {
                console.error('🔍 DEBUG: Could not parse error response');
            }
            throw new Error(`${errorMessage} (Status: ${response.status})`);
        }
        
        // Download the file
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${window.ghostGym.currentProgram.name.replace(/[^a-z0-9]/gi, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('generateModal'));
        modal.hide();
        showAlert(`${format.toUpperCase()} document generated successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Error generating document:', error);
        showAlert('Failed to generate document: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const generateBtn = document.getElementById('confirmGenerateBtn');
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="bx bx-download me-1"></i>Generate Document';
            generateBtn.disabled = false;
        }
    }
}

/**
 * Sign out user
 */
function signOut() {
    if (window.authService) {
        window.authService.signOut();
    }
}

/**
 * Update authentication UI
 */
function updateAuthUI(user) {
    const signInBtn = document.getElementById('headerSignInBtn');
    const userDropdown = document.querySelector('.auth-sign-out');
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    
    if (user) {
        // User is signed in
        if (signInBtn) signInBtn.style.display = 'none';
        if (userDropdown) userDropdown.classList.remove('d-none');
        
        if (userDisplayName) {
            userDisplayName.textContent = user.displayName || user.email || 'User';
        }
        if (userEmailDisplay) {
            userEmailDisplay.textContent = user.email || '';
        }
    } else {
        // User is signed out
        if (signInBtn) signInBtn.style.display = 'block';
        if (userDropdown) userDropdown.classList.add('d-none');
    }
}

/**
 * Update sync status
 */
function updateSyncStatus(status) {
    // Update sync status indicator if needed
    console.log('Sync status:', status);
}

/**
 * Focus on programs panel
 */
function focusProgramsPanel() {
    document.getElementById('programSearch')?.focus();
}

/**
 * Focus on workouts panel
 */
function focusWorkoutsPanel() {
    document.getElementById('workoutSearch')?.focus();
}

/**
 * Show backup/export options
 */
function showBackupOptions() {
    showAlert('Backup & Export functionality coming soon!', 'info');
}

/**
 * Show settings panel
 */
function showSettings() {
    showAlert('Settings panel coming soon!', 'info');
}

// Additional helper functions for program management

function duplicateProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    // Create duplicate with new name
    const duplicateData = {
        ...program,
        name: `${program.name} (Copy)`,
        id: undefined, // Will be generated
        created_date: undefined,
        modified_date: undefined
    };
    
    // Use the same save logic
    window.dataManager.createProgram(duplicateData).then(savedProgram => {
        window.ghostGym.programs.unshift(savedProgram);
        renderPrograms();
        updateStats();
        showAlert(`Program duplicated as "${savedProgram.name}"`, 'success');
    }).catch(error => {
        showAlert('Failed to duplicate program: ' + error.message, 'danger');
    });
}

function deleteProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    if (confirm(`Are you sure you want to delete "${program.name}"? This action cannot be undone.`)) {
        // Remove from local state (API integration would go here)
        window.ghostGym.programs = window.ghostGym.programs.filter(p => p.id !== id);
        
        // Clear selection if this was the current program
        if (window.ghostGym.currentProgram?.id === id) {
            window.ghostGym.currentProgram = null;
            showWelcomePanel();
        }
        
        renderPrograms();
        updateStats();
        showAlert(`Program "${program.name}" deleted`, 'success');
    }
}

function editWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    // Populate form with workout data
    document.getElementById('workoutName').value = workout.name || '';
    document.getElementById('workoutDescription').value = workout.description || '';
    document.getElementById('workoutTags').value = workout.tags ? workout.tags.join(', ') : '';
    
    // Clear and populate exercise groups
    const exerciseGroupsContainer = document.getElementById('exerciseGroups');
    exerciseGroupsContainer.innerHTML = '';
    
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        workout.exercise_groups.forEach(group => {
            addExerciseGroup();
            const lastGroup = exerciseGroupsContainer.lastElementChild;
            
            // Populate exercises
            const exerciseInputs = lastGroup.querySelectorAll('.exercise-input');
            Object.entries(group.exercises || {}).forEach(([key, value], index) => {
                if (exerciseInputs[index]) {
                    exerciseInputs[index].value = value;
                }
            });
            
            // Populate sets, reps, rest
            lastGroup.querySelector('.sets-input').value = group.sets || '3';
            lastGroup.querySelector('.reps-input').value = group.reps || '8-12';
            lastGroup.querySelector('.rest-input').value = group.rest || '60s';
        });
    } else {
        addExerciseGroup();
    }
    
    // Clear and populate bonus exercises
    const bonusExercisesContainer = document.getElementById('bonusExercises');
    bonusExercisesContainer.innerHTML = '';
    
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        workout.bonus_exercises.forEach(bonus => {
            addBonusExercise();
            const lastBonus = bonusExercisesContainer.lastElementChild;
            
            lastBonus.querySelector('.bonus-name-input').value = bonus.name || '';
            lastBonus.querySelector('.bonus-sets-input').value = bonus.sets || '2';
            lastBonus.querySelector('.bonus-reps-input').value = bonus.reps || '15';
            lastBonus.querySelector('.bonus-rest-input').value = bonus.rest || '30s';
        });
    }
    
    // Update modal title
    document.getElementById('workoutModalTitle').textContent = 'Edit Workout';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('workoutModal'));
    modal.show();
}

function duplicateWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    // Create duplicate with new name
    const duplicateData = {
        ...workout,
        name: `${workout.name} (Copy)`,
        id: undefined, // Will be generated
        created_date: undefined,
        modified_date: undefined
    };
    
    // Use the same save logic
    window.dataManager.createWorkout(duplicateData).then(savedWorkout => {
        window.ghostGym.workouts.unshift(savedWorkout);
        renderWorkouts();
        updateStats();
        showAlert(`Workout duplicated as "${savedWorkout.name}"`, 'success');
    }).catch(error => {
        showAlert('Failed to duplicate workout: ' + error.message, 'danger');
    });
}

function deleteWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    if (confirm(`Are you sure you want to delete "${workout.name}"? This action cannot be undone.`)) {
        // Remove from local state (API integration would go here)
        window.ghostGym.workouts = window.ghostGym.workouts.filter(w => w.id !== id);
        
        renderWorkouts();
        updateStats();
        showAlert(`Workout "${workout.name}" deleted`, 'success');
    }
}

function addWorkoutToProgram(programId, workoutId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    
    if (!program || !workout) return;
    
    // Check if workout is already in program
    if (program.workouts && program.workouts.some(w => w.workout_id === workoutId)) {
        showAlert('Workout is already in this program', 'warning');
        return;
    }
    
    // Add workout to program
    if (!program.workouts) program.workouts = [];
    program.workouts.push({
        workout_id: workoutId,
        order_index: program.workouts.length,
        custom_name: null,
        custom_date: null
    });
    
    // Update UI
    if (window.ghostGym.currentProgram?.id === programId) {
        renderProgramWorkouts(program);
    }
    
    showAlert(`"${workout.name}" added to "${program.name}"`, 'success');
}

function removeWorkoutFromProgram(programId, workoutId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    if (!program || !program.workouts) return;
    
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    const workoutName = workout ? workout.name : 'Workout';
    
    if (confirm(`Remove "${workoutName}" from this program?`)) {
        program.workouts = program.workouts.filter(w => w.workout_id !== workoutId);
        
        // Update UI
        if (window.ghostGym.currentProgram?.id === programId) {
            renderProgramWorkouts(program);
        }
        
        showAlert(`"${workoutName}" removed from program`, 'success');
    }
}

function reorderProgramWorkouts(evt) {
    if (!window.ghostGym.currentProgram) return;
    
    const program = window.ghostGym.currentProgram;
    if (!program.workouts) return;
    
    // Update order based on new positions
    const workoutElements = document.querySelectorAll('#programWorkouts .workout-item');
    const newOrder = [];
    
    workoutElements.forEach((element, index) => {
        const workoutId = element.dataset.workoutId;
        const programWorkout = program.workouts.find(w => w.workout_id === workoutId);
        if (programWorkout) {
            programWorkout.order_index = index;
            newOrder.push(programWorkout);
        }
    });
    
    program.workouts = newOrder;
    showAlert('Workout order updated', 'success');
}

function editProgramWorkout(programId, workoutId) {
    // This would open a modal to edit custom name/date for the workout in the program
    showAlert('Edit program workout functionality coming soon!', 'info');
}

/**
 * Show custom exercise modal
 */
function showCustomExerciseModal(initialName = '') {
    const modal = new bootstrap.Modal(document.getElementById('customExerciseModal'));
    
    // Pre-fill name if provided
    if (initialName) {
        document.getElementById('customExerciseName').value = initialName;
    }
    
    modal.show();
}

/**
 * Save custom exercise
 */
async function saveCustomExercise() {
    try {
        // Check if user is authenticated
        if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
            showAlert('Please sign in to create custom exercises', 'warning');
            const modal = bootstrap.Modal.getInstance(document.getElementById('customExerciseModal'));
            modal.hide();
            showAuthModal();
            return;
        }
        
        // Collect form data
        const exerciseData = {
            name: document.getElementById('customExerciseName')?.value?.trim(),
            targetMuscleGroup: document.getElementById('customMuscleGroup')?.value?.trim() || null,
            primaryEquipment: document.getElementById('customEquipment')?.value?.trim() || null,
            difficultyLevel: document.getElementById('customDifficulty')?.value || null,
            mechanics: document.getElementById('customMechanics')?.value || null
        };
        
        // Validate required fields
        if (!exerciseData.name) {
            showAlert('Exercise name is required', 'danger');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveCustomExerciseBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
        saveBtn.disabled = true;
        
        // Get auth token
        const token = await window.dataManager.getAuthToken();
        
        // Create custom exercise via API
        const response = await fetch(getApiUrl('/api/v3/users/me/exercises'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(exerciseData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create custom exercise');
        }
        
        const savedExercise = await response.json();
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('customExerciseModal'));
        modal.hide();
        showAlert(`Custom exercise "${savedExercise.name}" created successfully!`, 'success');
        
        // Clear form
        document.getElementById('customExerciseForm').reset();
        
        // Reload autocomplete data to include new custom exercise
        Object.values(window.exerciseAutocompleteInstances || {}).forEach(instance => {
            if (instance.loadExercises) {
                instance.loadExercises();
            }
        });
        
    } catch (error) {
        console.error('❌ Error saving custom exercise:', error);
        showAlert('Failed to save custom exercise: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveCustomExerciseBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Exercise';
            saveBtn.disabled = false;
        }
    }
}

// Make function globally available for autocomplete component
window.showCustomExerciseModal = showCustomExerciseModal;

/**
 * Initialize exercise autocompletes on all exercise inputs
 */
function initializeExerciseAutocompletes() {
    // Find all exercise inputs that don't have autocomplete yet
    const inputs = document.querySelectorAll('.exercise-autocomplete-input');
    
    inputs.forEach(input => {
        // Skip if already initialized
        if (window.exerciseAutocompleteInstances && window.exerciseAutocompleteInstances[input.id]) {
            return;
        }
        
        // Initialize autocomplete
        if (typeof initExerciseAutocomplete === 'function') {
            initExerciseAutocomplete(input, {
                minChars: 2,
                maxResults: 20,
                debounceMs: 300,
                showMuscleGroup: true,
                showEquipment: true,
                showDifficulty: true,
                allowCustom: true,
                onSelect: (exercise) => {
                    console.log('Exercise selected:', exercise.name);
                }
            });
        }
    });
}

// ============================================================================
// EXERCISE DATABASE FUNCTIONALITY
// ============================================================================

/**
 * Show Exercise Database Panel
 */
function showExerciseDatabasePanel() {
    // Hide other panels
    document.querySelector('.row.g-6:not(#exerciseDatabasePanel)')?.style.setProperty('display', 'none');
    
    // Show exercise database panel
    const exercisePanel = document.getElementById('exerciseDatabasePanel');
    if (exercisePanel) {
        exercisePanel.style.display = 'flex';
        
        // Load exercises if not already loaded
        if (window.ghostGym.exercises.all.length === 0) {
            loadExercises();
        }
    }
}

/**
 * Hide Exercise Database Panel and show main dashboard
 */
function hideExerciseDatabasePanel() {
    const exercisePanel = document.getElementById('exerciseDatabasePanel');
    if (exercisePanel) {
        exercisePanel.style.display = 'none';
    }
    
    // Show main dashboard panels
    document.querySelector('.row.g-6:not(#exerciseDatabasePanel)')?.style.setProperty('display', 'flex');
}

/**
 * Load all exercises from API
 */
async function loadExercises() {
    showExerciseLoading(true);
    
    try {
        // Check cache first
        const cached = getExerciseCache();
        if (cached && isExerciseCacheValid(cached)) {
            window.ghostGym.exercises.all = cached.exercises;
            console.log(`✅ Loaded ${window.ghostGym.exercises.all.length} exercises from cache`);
            await loadExerciseFavorites();
            await loadCustomExercises();
            await loadExerciseFilterOptions();
            filterExercises();
            return;
        }
        
        // Load from API
        console.log('📡 Loading exercises from API...');
        const PAGE_SIZE = 500;
        let allExercises = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await fetch(getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`));
            
            if (!response.ok) {
                throw new Error(`Failed to load exercises (page ${page})`);
            }
            
            const data = await response.json();
            const exercises = data.exercises || [];
            
            allExercises = [...allExercises, ...exercises];
            console.log(`📦 Loaded page ${page}: ${exercises.length} exercises (total: ${allExercises.length})`);
            
            hasMore = exercises.length === PAGE_SIZE;
            page++;
        }
        
        window.ghostGym.exercises.all = allExercises;
        
        // Cache the results
        setExerciseCache(allExercises);
        
        // Update total count
        const totalCount = document.getElementById('totalExercisesCount');
        if (totalCount) {
            totalCount.textContent = allExercises.length;
        }
        
        console.log(`✅ Loaded ${allExercises.length} exercises from API`);
        
        // Load user-specific data
        await loadExerciseFavorites();
        await loadCustomExercises();
        await loadExerciseFilterOptions();
        
        // Apply filters and render
        filterExercises();
        
    } catch (error) {
        console.error('❌ Error loading exercises:', error);
        showAlert('Failed to load exercises. Please try again.', 'danger');
    } finally {
        showExerciseLoading(false);
    }
}

/**
 * Load user's favorite exercises
 */
async function loadExerciseFavorites() {
    if (!window.firebaseAuth?.currentUser) {
        window.ghostGym.exercises.favorites.clear();
        return;
    }
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const response = await fetch(getApiUrl('/api/v3/users/me/favorites'), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.ghostGym.exercises.favorites = new Set(data.favorites.map(f => f.exerciseId));
            console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites`);
            
            // Update stats
            const favCount = document.getElementById('favoritesCount');
            if (favCount) {
                favCount.textContent = window.ghostGym.exercises.favorites.size;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load favorites:', error.message);
    }
}

/**
 * Load user's custom exercises
 */
async function loadCustomExercises() {
    if (!window.firebaseAuth?.currentUser) {
        window.ghostGym.exercises.custom = [];
        return;
    }
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const response = await fetch(getApiUrl('/api/v3/users/me/exercises'), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.ghostGym.exercises.custom = data.exercises || [];
            console.log(`✅ Loaded ${window.ghostGym.exercises.custom.length} custom exercises`);
            
            // Update stats
            const customCount = document.getElementById('customCount');
            if (customCount) {
                customCount.textContent = window.ghostGym.exercises.custom.length;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load custom exercises:', error.message);
    }
}

/**
 * Load filter options dynamically
 */
async function loadExerciseFilterOptions() {
    try {
        // Get unique muscle groups
        const muscleGroups = [...new Set(window.ghostGym.exercises.all
            .map(e => e.targetMuscleGroup)
            .filter(m => m))]
            .sort();
        
        const muscleGroupSelect = document.getElementById('muscleGroupFilter');
        if (muscleGroupSelect) {
            // Clear existing options except first
            while (muscleGroupSelect.options.length > 1) {
                muscleGroupSelect.remove(1);
            }
            
            muscleGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                muscleGroupSelect.appendChild(option);
            });
        }
        
        // Get unique equipment
        const equipment = [...new Set(window.ghostGym.exercises.all
            .map(e => e.primaryEquipment)
            .filter(e => e))]
            .sort();
        
        const equipmentSelect = document.getElementById('equipmentFilter');
        if (equipmentSelect) {
            // Clear existing options except first
            while (equipmentSelect.options.length > 1) {
                equipmentSelect.remove(1);
            }
            
            equipment.forEach(equip => {
                const option = document.createElement('option');
                option.value = equip;
                option.textContent = equip;
                equipmentSelect.appendChild(option);
            });
        }
        
        console.log('✅ Filter options loaded');
        
    } catch (error) {
        console.error('❌ Error loading filter options:', error);
    }
}

/**
 * Filter exercises based on current filters
 */
function filterExercises() {
    // Update filter state from UI
    const searchInput = document.getElementById('exerciseSearch');
    const sortSelect = document.getElementById('sortBySelect');
    const muscleGroupSelect = document.getElementById('muscleGroupFilter');
    const equipmentSelect = document.getElementById('equipmentFilter');
    const difficultySelect = document.getElementById('difficultyFilter');
    const favoritesCheckbox = document.getElementById('showFavoritesOnly');
    const customCheckbox = document.getElementById('showCustomOnly');
    
    window.ghostGym.exercises.filters = {
        search: searchInput?.value?.trim() || '',
        muscleGroup: muscleGroupSelect?.value || '',
        equipment: equipmentSelect?.value || '',
        difficulty: difficultySelect?.value || '',
        sortBy: sortSelect?.value || 'name',
        favoritesOnly: favoritesCheckbox?.checked || false,
        customOnly: customCheckbox?.checked || false
    };
    
    // Combine global and custom exercises
    let allExercises = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom];
    
    // Apply search filter with fuzzy matching
    if (window.ghostGym.exercises.filters.search) {
        const searchTerms = window.ghostGym.exercises.filters.search
            .toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 0);
        
        allExercises = allExercises.filter(exercise => {
            const exerciseName = exercise.name.toLowerCase();
            const muscleGroup = (exercise.targetMuscleGroup || '').toLowerCase();
            const equipment = (exercise.primaryEquipment || '').toLowerCase();
            const searchableText = `${exerciseName} ${muscleGroup} ${equipment}`;
            
            // Check if all search terms are found in the searchable text
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    // Apply muscle group filter
    if (window.ghostGym.exercises.filters.muscleGroup) {
        allExercises = allExercises.filter(e => e.targetMuscleGroup === window.ghostGym.exercises.filters.muscleGroup);
    }
    
    // Apply equipment filter
    if (window.ghostGym.exercises.filters.equipment) {
        allExercises = allExercises.filter(e => e.primaryEquipment === window.ghostGym.exercises.filters.equipment);
    }
    
    // Apply difficulty filter
    if (window.ghostGym.exercises.filters.difficulty) {
        allExercises = allExercises.filter(e => e.difficultyLevel === window.ghostGym.exercises.filters.difficulty);
    }
    
    // Apply favorites only filter
    if (window.ghostGym.exercises.filters.favoritesOnly) {
        allExercises = allExercises.filter(e => window.ghostGym.exercises.favorites.has(e.id));
    }
    
    // Apply custom only filter
    if (window.ghostGym.exercises.filters.customOnly) {
        allExercises = allExercises.filter(e => !e.isGlobal);
    }
    
    // Apply sorting
    allExercises = sortExercises(allExercises);
    
    window.ghostGym.exercises.filtered = allExercises;
    window.ghostGym.exercises.currentPage = 1;
    
    // Update stats
    const showingCount = document.getElementById('showingCount');
    if (showingCount) {
        showingCount.textContent = window.ghostGym.exercises.filtered.length;
    }
    
    // Render first page
    renderExerciseTable();
}

/**
 * Sort exercises based on current sort option
 */
function sortExercises(exercises) {
    const sorted = [...exercises];
    
    switch (window.ghostGym.exercises.filters.sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        
        case 'popularity':
            sorted.sort((a, b) => {
                const scoreA = a.popularityScore || 50;
                const scoreB = b.popularityScore || 50;
                return scoreB - scoreA; // Descending
            });
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
 * Render exercise table
 */
function renderExerciseTable() {
    const tableBody = document.getElementById('exerciseTableBody');
    const tableContainer = document.getElementById('exerciseTableContainer');
    const emptyState = document.getElementById('exerciseEmptyState');
    const loadMoreContainer = document.getElementById('exerciseLoadMoreContainer');
    
    if (!tableBody) return;
    
    // Calculate which exercises to display
    const startIndex = 0;
    const endIndex = window.ghostGym.exercises.currentPage * window.ghostGym.exercises.pageSize;
    window.ghostGym.exercises.displayed = window.ghostGym.exercises.filtered.slice(startIndex, endIndex);
    
    // Show/hide empty state
    if (window.ghostGym.exercises.filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Render exercise rows
    window.ghostGym.exercises.displayed.forEach(exercise => {
        const row = createExerciseTableRow(exercise);
        tableBody.appendChild(row);
    });
    
    // Show/hide load more button
    if (window.ghostGym.exercises.displayed.length < window.ghostGym.exercises.filtered.length) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

/**
 * Create an exercise table row
 */
function createExerciseTableRow(exercise) {
    const tr = document.createElement('tr');
    
    const isFavorited = window.ghostGym.exercises.favorites.has(exercise.id);
    const isCustom = !exercise.isGlobal;
    const popularityScore = exercise.popularityScore || 50;
    
    // Determine popularity badge
    let popularityBadge = '';
    if (popularityScore >= 90) {
        popularityBadge = '<span class="badge bg-warning ms-1"><i class="bx bxs-star"></i> Essential</span>';
    } else if (popularityScore >= 70) {
        popularityBadge = '<span class="badge bg-info ms-1"><i class="bx bx-star"></i> Popular</span>';
    }
    
    tr.innerHTML = `
        <td>
            ${isCustom ? '<i class="bx bx-user text-primary me-2"></i>' : ''}
            <span class="fw-medium">${escapeHtml(exercise.name)}</span>
            ${popularityBadge}
        </td>
        <td>
            ${exercise.targetMuscleGroup ? `<span class="badge bg-label-primary">${escapeHtml(exercise.targetMuscleGroup)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td>
            ${exercise.primaryEquipment ? `<span class="badge bg-label-secondary">${escapeHtml(exercise.primaryEquipment)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td>
            ${exercise.difficultyLevel ? `<span class="badge bg-label-info">${escapeHtml(exercise.difficultyLevel)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-icon favorite-btn ${isFavorited ? 'favorited' : ''}" 
                    data-exercise-id="${exercise.id}"
                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="bx ${isFavorited ? 'bxs-heart text-danger' : 'bx-heart'}"></i>
            </button>
        </td>
        <td class="text-center">
            <div class="dropdown">
                <button type="button" class="btn btn-sm p-0 dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                    <i class="bx bx-dots-vertical-rounded"></i>
                </button>
                <div class="dropdown-menu dropdown-menu-end">
                    <a class="dropdown-item view-details-link" href="javascript:void(0);" data-exercise-id="${exercise.id}">
                        <i class="bx bx-info-circle me-2"></i>View Details
                    </a>
                    <a class="dropdown-item add-to-workout-link" href="javascript:void(0);" 
                       data-exercise-id="${exercise.id}" data-exercise-name="${escapeHtml(exercise.name)}">
                        <i class="bx bx-plus me-2"></i>Add to Workout
                    </a>
                </div>
            </div>
        </td>
    `;
    
    // Add event listeners
    const favoriteBtn = tr.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', () => toggleExerciseFavorite(exercise.id));
    
    const viewDetailsLink = tr.querySelector('.view-details-link');
    viewDetailsLink.addEventListener('click', () => showExerciseDetails(exercise.id));
    
    const addToWorkoutLink = tr.querySelector('.add-to-workout-link');
    addToWorkoutLink.addEventListener('click', () => addExerciseToWorkout(exercise));
    
    return tr;
}

/**
 * Toggle exercise favorite status
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
            // Remove favorite
            const response = await fetch(getApiUrl(`/api/v3/users/me/favorites/${exerciseId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                window.ghostGym.exercises.favorites.delete(exerciseId);
                console.log('✅ Removed from favorites');
            }
        } else {
            // Add favorite
            const response = await fetch(getApiUrl('/api/v3/users/me/favorites'), {
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
        
        // Update stats
        const favCount = document.getElementById('favoritesCount');
        if (favCount) {
            favCount.textContent = window.ghostGym.exercises.favorites.size;
        }
        
        // Re-render to update UI
        renderExerciseTable();
        
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
 * Add exercise to workout (placeholder)
 */
function addExerciseToWorkout(exercise) {
    showAlert(`Adding "${exercise.name}" to workout - This feature will be integrated with the workout builder!`, 'info');
}

/**
 * Load more exercises
 */
function loadMoreExercises() {
    window.ghostGym.exercises.currentPage++;
    renderExerciseTable();
}

/**
 * Clear all exercise filters
 */
function clearExerciseFilters() {
    window.ghostGym.exercises.filters = {
        search: '',
        muscleGroup: '',
        equipment: '',
        difficulty: '',
        sortBy: 'name',
        favoritesOnly: false,
        customOnly: false
    };
    
    // Reset UI
    const searchInput = document.getElementById('exerciseSearch');
    const sortSelect = document.getElementById('sortBySelect');
    const muscleGroupSelect = document.getElementById('muscleGroupFilter');
    const equipmentSelect = document.getElementById('equipmentFilter');
    const difficultySelect = document.getElementById('difficultyFilter');
    const favoritesCheckbox = document.getElementById('showFavoritesOnly');
    const customCheckbox = document.getElementById('showCustomOnly');
    
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'name';
    if (muscleGroupSelect) muscleGroupSelect.value = '';
    if (equipmentSelect) equipmentSelect.value = '';
    if (difficultySelect) difficultySelect.value = '';
    if (favoritesCheckbox) favoritesCheckbox.checked = false;
    if (customCheckbox) customCheckbox.checked = false;
    
    filterExercises();
}

/**
 * Refresh exercises from API
 */
async function refreshExercises() {
    localStorage.removeItem('exercise_cache');
    await loadExercises();
}

/**
 * Show/hide exercise loading state
 */
function showExerciseLoading(show) {
    const loadingState = document.getElementById('exerciseLoadingState');
    const tableContainer = document.getElementById('exerciseTableContainer');
    
    if (show) {
        if (loadingState) loadingState.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
    } else {
        if (loadingState) loadingState.style.display = 'none';
    }
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
 * Initialize autocompletes when workout modal is shown
 */
document.getElementById('workoutModal')?.addEventListener('shown.bs.modal', function() {
    // Add initial exercise group if none exist
    const exerciseGroups = document.getElementById('exerciseGroups');
    if (exerciseGroups && exerciseGroups.children.length === 0) {
        addExerciseGroup();
    }
    
    // Initialize autocompletes
    setTimeout(() => {
        initializeExerciseAutocompletes();
    }, 100);
});

// Set up custom exercise save button
document.getElementById('saveCustomExerciseBtn')?.addEventListener('click', saveCustomExercise);

console.log('📦 Ghost Gym Dashboard JavaScript loaded');