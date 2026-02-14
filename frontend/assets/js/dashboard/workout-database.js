/**
 * Ghost Gym Dashboard - Workout Database Orchestrator
 * Handles data loading, component initialization, navigation actions, and session state
 * @version 4.0.0 - Refactored: favorites, delete, and filter/search extracted to sub-modules
 *
 * Sub-modules (load before this file):
 *   workout-database-favorites.js      - Favorite toggling, section rendering
 *   workout-database-delete-manager.js  - Batch selection and delete operations
 *   workout-database-filter-manager.js  - Filtering, sorting, tags, search, toolbar
 *
 * NOTE: Core utility functions (escapeHtml, formatDate, truncateText, showLoading)
 * are now loaded from common-utils.js
 */

/**
 * ============================================
 * STATE
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
 * SESSION STATE MANAGEMENT
 * ============================================
 */

/**
 * Get session state for a workout (for smart button labels)
 * @param {string} workoutId - The workout ID to check
 * @returns {string} 'in_progress', 'completed', or 'never_started'
 */
function getWorkoutSessionState(workoutId) {
    if (activeSessionWorkoutId === workoutId) {
        return 'in_progress';
    }
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
        const persistedSession = localStorage.getItem('ffn_active_workout_session');
        if (persistedSession) {
            const session = JSON.parse(persistedSession);
            if (session.workoutId && session.status === 'in_progress') {
                activeSessionWorkoutId = session.workoutId;
                console.log('📍 Found active session for workout:', activeSessionWorkoutId);
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load session states:', error);
    }
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

        // Load tag options (in filter manager)
        window.loadTagOptions();

        // Apply filters and render (in filter manager)
        window.filterWorkouts();

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
                id: 'history',
                label: 'History',
                icon: 'bx-history',
                variant: 'outline-secondary',
                onClick: (workout) => viewWorkoutHistory(workout.id)
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
                }
            ],
            // Configure which actions appear in dropdown menu
            dropdownActions: ['start', 'history', 'edit', 'duplicate', 'share', 'delete'],
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

    // Expose workoutGrid on window so sub-modules can access it at runtime
    window.workoutGrid = workoutGrid;

    console.log('✅ Shared components initialized');
}

/**
 * ============================================
 * ACTIONS / NAVIGATION
 * ============================================
 */

/**
 * Edit workout - Navigate to workout editor
 */
function editWorkout(workoutId) {
    console.log('📝 Editing workout:', workoutId);
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
    window.location.href = 'workout-builder.html?new=true';
}

/**
 * Duplicate workout - Create a copy with "(Copy)" suffix
 */
async function duplicateWorkout(workoutId) {
    console.log('📋 Duplicating workout:', workoutId);

    try {
        const originalWorkout = window.ffn.workoutDatabase.all.find(w => w.id === workoutId);
        if (!originalWorkout) {
            throw new Error('Workout not found');
        }

        const duplicatedWorkout = {
            ...originalWorkout,
            id: undefined, // Will be generated by backend
            name: `${originalWorkout.name} (Copy)`,
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString()
        };

        const savedWorkout = await window.dataManager.saveWorkout(duplicatedWorkout);

        console.log('✅ Workout duplicated successfully:', savedWorkout.id);

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

    // Close the workout detail offcanvas first to prevent backdrop stacking
    if (workoutDetailOffcanvas) {
        workoutDetailOffcanvas.hide();
    }

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
 * View workout history - Navigate to history page
 */
function viewWorkoutHistory(workoutId) {
    console.log('📊 Viewing workout history:', workoutId);
    window.location.href = `workout-history.html?id=${workoutId}`;
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
 * GLOBAL EXPORTS
 * ============================================
 */

// Orchestrator functions
window.loadWorkouts = loadWorkouts;
window.editWorkout = editWorkout;
window.doWorkout = doWorkout;
window.viewWorkoutDetails = viewWorkoutDetails;
window.viewWorkoutHistory = viewWorkoutHistory;
window.createNewWorkout = createNewWorkout;
window.duplicateWorkout = duplicateWorkout;
window.shareWorkout = shareWorkout;
window.getTotalExerciseCount = getTotalExerciseCount;

console.log('📦 Workout Database orchestrator loaded (v4.0 - modular)');
