/**
 * Ghost Gym V0.4.1 - Sneat Dashboard Integration
 * 
 * This file integrates the existing V3 functionality with the new Sneat template
 * while preserving all Firebase authentication, data management, and sync capabilities.
 */

// Global state management
window.ghostGym = {
    currentProgram: null,
    programs: [],
    workouts: [],
    isLoading: false,
    searchFilters: {
        programs: '',
        workouts: ''
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
    document.getElementById('menuBackup')?.addEventListener('click', showBackupOptions);
    document.getElementById('menuSettings')?.addEventListener('click', showSettings);
    
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
    const groupHtml = `
        <div class="card mb-3 exercise-group">
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
                        <input type="text" class="form-control exercise-input" placeholder="e.g., Bench Press">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Exercise B (optional)</label>
                        <input type="text" class="form-control exercise-input" placeholder="e.g., Incline Dumbbell Press">
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Exercise C (optional)</label>
                        <input type="text" class="form-control exercise-input" placeholder="e.g., Dumbbell Flyes">
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
}

/**
 * Add bonus exercise to workout form
 */
function addBonusExercise() {
    const container = document.getElementById('bonusExercises');
    if (!container) return;
    
    const bonusHtml = `
        <div class="card mb-3 bonus-exercise">
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
                        <input type="text" class="form-control bonus-name-input" placeholder="e.g., Plank">
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
    
    const newExerciseHtml = `
        <div class="col-md-6 mb-3">
            <label class="form-label">Exercise ${nextLetter.toUpperCase()} (optional)</label>
            <div class="input-group">
                <input type="text" class="form-control exercise-input" placeholder="e.g., Exercise name">
                <button type="button" class="btn btn-outline-danger" onclick="removeExerciseFromGroup(this)">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    const lastRow = group.querySelector('.row:last-of-type');
    lastRow.insertAdjacentHTML('beforebegin', `<div class="row">${newExerciseHtml}</div>`);
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
        const response = await fetch(`/api/v3/programs/${window.ghostGym.currentProgram.id}/preview-html`, {
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
        
        const response = await fetch(url, {
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

console.log('📦 Ghost Gym Dashboard JavaScript loaded');