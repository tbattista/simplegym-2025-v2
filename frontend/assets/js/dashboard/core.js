/**
 * Ghost Gym Dashboard - Core Module
 * Handles initialization, state management, and data loading
 * @version 1.0.0
 */

console.log('📦 Dashboard Core Version: 20251020-03-MODULAR');

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

/**
 * Initialize Ghost Gym Dashboard
 */
function initializeGhostGym() {
    console.log('🚀 Initializing Ghost Gym V0.4.1 Dashboard');
    
    // Initialize Sneat components
    initSneatComponents();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize data management
    initDataManagement();
    
    // Load initial data
    loadDashboardData();
    
    // Show initial view (Builder) - only if no hash in URL
    // menu-navigation.js will handle navigation if there's a hash
    setTimeout(() => {
        if (!window.location.hash || window.location.hash === '#') {
            showView('builder');
        }
    }, 100);
    
    console.log('✅ Ghost Gym Dashboard initialized successfully');
}

/**
 * Initialize Sneat-specific components
 */
function initSneatComponents() {
    // Initialize Perfect Scrollbar for workout grid (if needed)
    if (typeof PerfectScrollbar !== 'undefined') {
        const workoutsGrid = document.querySelector('.card-body:has(#workoutsGrid)');
        if (workoutsGrid) {
            new PerfectScrollbar(workoutsGrid, {
                wheelPropagation: false,
                suppressScrollX: true
            });
        }
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize drag and drop for program workouts
    initSortableWorkouts();
}

/**
 * Initialize sortable workouts (drag-and-drop)
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
 * Initialize all event listeners
 */
function initEventListeners() {
    // Program management
    document.getElementById('newProgramBtn')?.addEventListener('click', showProgramModal);
    document.getElementById('bannerCreateProgramBtn')?.addEventListener('click', showProgramModal);
    document.getElementById('programSelector')?.addEventListener('change', handleProgramSelection);
    document.getElementById('saveProgramBtn')?.addEventListener('click', saveProgram);
    document.getElementById('editProgramBtn')?.addEventListener('click', editCurrentProgram);
    document.getElementById('previewProgramBtn')?.addEventListener('click', previewProgram);
    document.getElementById('generateProgramBtn')?.addEventListener('click', showGenerateModal);
    
    // Workout management
    document.getElementById('newWorkoutBtn')?.addEventListener('click', showWorkoutModal);
    document.getElementById('bannerCreateWorkoutBtn')?.addEventListener('click', showWorkoutModal);
    document.getElementById('saveWorkoutBtn')?.addEventListener('click', saveWorkout);
    document.getElementById('addExerciseGroupBtn')?.addEventListener('click', addExerciseGroup);
    document.getElementById('addBonusExerciseBtn')?.addEventListener('click', addBonusExercise);
    
    // Search functionality
    document.getElementById('workoutSearch')?.addEventListener('input', debounce(filterWorkouts, 300));
    
    // Generation and preview
    document.getElementById('confirmGenerateBtn')?.addEventListener('click', generateDocument);
    document.getElementById('generateFromPreviewBtn')?.addEventListener('click', showGenerateModal);
    
    // Authentication
    document.getElementById('menuSignInBtn')?.addEventListener('click', showAuthModal);
    document.getElementById('menuSignOutBtn')?.addEventListener('click', signOut);
    
    // View-specific buttons
    document.getElementById('programsViewNewBtn')?.addEventListener('click', showProgramModal);
    document.getElementById('workoutsViewNewBtn')?.addEventListener('click', showWorkoutModal);
    
    // View-specific search
    const programsViewSearch = document.getElementById('programsViewSearch');
    const workoutsViewSearch = document.getElementById('workoutsViewSearch');
    if (programsViewSearch) {
        programsViewSearch.addEventListener('input', debounce(() => renderProgramsView(), 300));
    }
    if (workoutsViewSearch) {
        workoutsViewSearch.addEventListener('input', debounce(() => renderWorkoutsView(), 300));
    }
    
    // Menu navigation fallbacks
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
    document.getElementById('entriesPerPageSelect')?.addEventListener('change', handleEntriesPerPageChange);
    document.getElementById('exportExercisesBtn')?.addEventListener('click', exportExercises);
    document.getElementById('exerciseLoadMoreBtn')?.addEventListener('click', loadMoreExercises);
    
    // Modal events
    document.getElementById('programModal')?.addEventListener('hidden.bs.modal', clearProgramForm);
    document.getElementById('workoutModal')?.addEventListener('hidden.bs.modal', clearWorkoutForm);
    
    // Workout modal shown event - initialize autocompletes
    document.getElementById('workoutModal')?.addEventListener('shown.bs.modal', function() {
        const exerciseGroups = document.getElementById('exerciseGroups');
        if (exerciseGroups && exerciseGroups.children.length === 0) {
            addExerciseGroup();
        }
        setTimeout(() => {
            initializeExerciseAutocompletes();
        }, 100);
    });
    
    // Custom exercise save button
    document.getElementById('saveCustomExerciseBtn')?.addEventListener('click', saveCustomExercise);
    
    // Add custom exercise button
    document.getElementById('addCustomExerciseBtn')?.addEventListener('click', () => showCustomExerciseModal());
}

/**
 * Initialize data management
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
                renderProgramsView();
            } else if (type === 'workouts') {
                window.ghostGym.workouts = data;
                renderWorkouts();
                renderWorkoutsView();
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
                console.log('🔍 DEBUG: User authenticated, reloading dashboard data from Firestore');
                loadDashboardData();
            }
        };
    }
    
    // Listen for authStateChanged event from data manager
    window.addEventListener('authStateChanged', (event) => {
        const { user, isAuthenticated } = event.detail;
        console.log('🔍 DEBUG: authStateChanged event received, isAuthenticated:', isAuthenticated);
        if (isAuthenticated && user) {
            console.log('🔍 DEBUG: Reloading data after authentication');
            setTimeout(() => loadDashboardData(), 500);
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
        
        // Load programs and workouts using data manager
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
            window.ghostGym.programs = JSON.parse(localStorage.getItem('gym_programs') || '[]');
            window.ghostGym.workouts = JSON.parse(localStorage.getItem('gym_workouts') || '[]');
        }
        
        console.log('🔍 DEBUG: Final data counts:', {
            programs: window.ghostGym.programs.length,
            workouts: window.ghostGym.workouts.length
        });
        
        // Render data for all views
        console.log('🔍 DEBUG: Calling renderPrograms()');
        renderPrograms();
        
        console.log('🔍 DEBUG: Calling renderWorkouts()');
        renderWorkouts();
        
        // Render view-specific content if functions exist
        if (typeof renderProgramsView === 'function') {
            renderProgramsView();
        }
        if (typeof renderWorkoutsView === 'function') {
            renderWorkoutsView();
        }
        
        console.log('🔍 DEBUG: Calling updateStats()');
        updateStats();
        
        // Show empty state if no programs
        if (window.ghostGym.programs.length === 0) {
            console.log('🔍 DEBUG: No programs, showing empty state');
            showEmptyStatePanel();
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showAlert('Error loading data. Please refresh the page.', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Update authentication UI
 */
function updateAuthUI(user) {
    const menuSignIn = document.getElementById('menuAuthSignIn');
    const menuAuthProfile = document.getElementById('menuAuthProfile');
    const menuSignOutItems = document.querySelectorAll('.auth-sign-out');
    const menuUserDisplayName = document.getElementById('menuUserDisplayName');
    const menuUserEmailDisplay = document.getElementById('menuUserEmailDisplay');
    
    if (user) {
        // User is signed in
        if (menuSignIn) menuSignIn.style.display = 'none';
        menuSignOutItems.forEach(item => item.classList.remove('d-none'));
        
        if (menuUserDisplayName) {
            menuUserDisplayName.textContent = user.displayName || user.email || 'User';
        }
        if (menuUserEmailDisplay) {
            menuUserEmailDisplay.textContent = user.email || '';
        }
    } else {
        // User is signed out
        if (menuSignIn) menuSignIn.style.display = 'block';
        menuSignOutItems.forEach(item => item.classList.add('d-none'));
    }
}

/**
 * Update sync status
 */
function updateSyncStatus(status) {
    console.log('Sync status:', status);
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
 * Global search (placeholder)
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

// Wait for Firebase to be ready before initializing
document.addEventListener('DOMContentLoaded', function() {
    if (window.firebaseReady) {
        initializeGhostGym();
    } else {
        window.addEventListener('firebaseReady', initializeGhostGym);
    }
});

// Make functions globally available
window.initializeGhostGym = initializeGhostGym;
window.initSneatComponents = initSneatComponents;
window.initSortableWorkouts = initSortableWorkouts;
window.initEventListeners = initEventListeners;
window.initDataManagement = initDataManagement;
window.loadDashboardData = loadDashboardData;
window.updateAuthUI = updateAuthUI;
window.updateSyncStatus = updateSyncStatus;
window.signOut = signOut;
window.globalSearch = globalSearch;

console.log('📦 Core module loaded');