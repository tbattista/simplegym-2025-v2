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
            updateAuthUI(user);
            if (user) {
                // User signed in, reload data
                loadDashboardData();
            }
        };
    }
    
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
        showLoading(true);
        
        // Load programs and workouts using existing data manager
        if (window.dataManager) {
            const [programs, workouts] = await Promise.all([
                window.dataManager.getPrograms(),
                window.dataManager.getWorkouts()
            ]);
            
            window.ghostGym.programs = programs || [];
            window.ghostGym.workouts = workouts || [];
        } else {
            // Fallback to localStorage if data manager not available
            window.ghostGym.programs = JSON.parse(localStorage.getItem('ghost_gym_programs') || '[]');
            window.ghostGym.workouts = JSON.parse(localStorage.getItem('ghost_gym_workouts') || '[]');
        }
        
        // Render data
        renderPrograms();
        renderWorkouts();
        updateStats();
        
        // Show welcome panel if no data
        if (window.ghostGym.programs.length === 0 && window.ghostGym.workouts.length === 0) {
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
    const programsList = document.getElementById('programsList');
    if (!programsList) return;
    
    const filteredPrograms = window.ghostGym.programs.filter(program => 
        program.name.toLowerCase().includes(window.ghostGym.searchFilters.programs.toLowerCase())
    );
    
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
    const workoutsList = document.getElementById('workoutsList');
    if (!workoutsList) return;
    
    const filteredWorkouts = window.ghostGym.workouts.filter(workout => 
        workout.name.toLowerCase().includes(window.ghostGym.searchFilters.workouts.toLowerCase())
    );
    
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

// Placeholder functions that will integrate with existing V3 functionality
function saveProgram() { /* Integrate with existing saveProgram */ }
function saveWorkout() { /* Integrate with existing saveWorkout */ }
function editCurrentProgram() { /* Integrate with existing editProgram */ }
function previewProgram() { /* Integrate with existing previewProgram */ }
function generateDocument() { /* Integrate with existing generateDocument */ }
function addExerciseGroup() { /* Integrate with existing addExerciseGroup */ }
function addBonusExercise() { /* Integrate with existing addBonusExercise */ }
function clearProgramForm() { /* Integrate with existing clearProgramForm */ }
function clearWorkoutForm() { /* Integrate with existing clearWorkoutForm */ }
function editProgram(id) { /* Integrate with existing editProgram */ }
function duplicateProgram(id) { /* Integrate with existing duplicateProgram */ }
function deleteProgram(id) { /* Integrate with existing deleteProgram */ }
function editWorkout(id) { /* Integrate with existing editWorkout */ }
function duplicateWorkout(id) { /* Integrate with existing duplicateWorkout */ }
function deleteWorkout(id) { /* Integrate with existing deleteWorkout */ }
function addWorkoutToProgram(programId, workoutId) { /* Integrate with existing addWorkoutToProgram */ }
function removeWorkoutFromProgram(programId, workoutId) { /* Integrate with existing removeWorkoutFromProgram */ }
function reorderProgramWorkouts(evt) { /* Integrate with existing reorderProgramWorkouts */ }
function editProgramWorkout(programId, workoutId) { /* Integrate with existing editProgramWorkout */ }
function signOut() { if (window.authService) window.authService.signOut(); }
function updateAuthUI(user) { /* Integrate with existing updateAuthUI */ }
function updateSyncStatus(status) { /* Integrate with existing updateSyncStatus */ }
function focusProgramsPanel() { /* Focus on programs panel */ }
function focusWorkoutsPanel() { /* Focus on workouts panel */ }
function showBackupOptions() { /* Show backup/export options */ }
function showSettings() { /* Show settings panel */ }

console.log('📦 Ghost Gym Dashboard JavaScript loaded');