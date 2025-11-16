/**
 * Bottom Action Bar Configuration
 * Defines button layouts and actions for each page
 */

(function() {
    'use strict';

    /**
     * Configuration for each page
     * Structure:
     * - leftActions: Array of left-side buttons
     * - fab: Center floating action button
     * - rightActions: Array of right-side buttons
     */
    window.BOTTOM_BAR_CONFIGS = {
        
        // ============================================
        // WORKOUT DATABASE PAGE
        // ============================================
        'workout-database': {
            leftActions: [
                {
                    icon: 'bx-filter-alt',
                    label: 'Filter',
                    title: 'Open filters',
                    action: function() {
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas')
                        );
                        offcanvas.show();
                    }
                },
                {
                    icon: 'bx-search',
                    label: 'Search',
                    title: 'Search workouts',
                    action: function() {
                        // Show search overlay
                        if (window.showSearchOverlay) {
                            window.showSearchOverlay();
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-plus',
                title: 'Create new workout',
                variant: 'primary',
                action: function() {
                    window.location.href = 'workout-builder.html';
                }
            },
            rightActions: [
                {
                    icon: 'bx-sort',
                    label: 'Sort',
                    title: 'Sort workouts',
                    action: function() {
                        const sortSelect = document.getElementById('sortBySelect');
                        if (sortSelect) {
                            const offcanvas = new bootstrap.Offcanvas(
                                document.getElementById('filtersOffcanvas')
                            );
                            offcanvas.show();
                            setTimeout(() => sortSelect.focus(), 300);
                        }
                    }
                },
                {
                    icon: 'bx-info-circle',
                    label: 'Info',
                    title: 'Workout statistics',
                    action: function() {
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas')
                        );
                        offcanvas.show();
                    }
                }
            ]
        },

        // ============================================
        // WORKOUT BUILDER PAGE
        // ============================================
        'workout-builder': {
            leftActions: [
                {
                    icon: 'bx-x',
                    label: 'Cancel',
                    title: 'Cancel editing',
                    action: function() {
                        const cancelBtn = document.getElementById('cancelEditBtn');
                        if (cancelBtn) {
                            cancelBtn.click();
                        }
                    }
                },
                {
                    icon: 'bx-play',
                    label: 'Go',
                    title: 'Start workout',
                    action: function() {
                        // Get current workout ID
                        const workoutId = window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                        if (workoutId) {
                            window.location.href = `workout-mode.html?id=${workoutId}`;
                        } else {
                            alert('Please save the workout first');
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-plus',
                title: 'Add exercise group',
                variant: 'primary',
                action: function() {
                    const addBtn = document.getElementById('addExerciseGroupBtn');
                    if (addBtn) {
                        addBtn.click();
                    }
                }
            },
            rightActions: [
                {
                    icon: 'bx-save',
                    label: 'Save',
                    title: 'Save workout',
                    action: function() {
                        const saveBtn = document.getElementById('saveWorkoutBtn');
                        if (saveBtn) {
                            saveBtn.click();
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        // Show more options menu
                        alert('More options menu - Coming soon!');
                    }
                }
            ]
        },

        // ============================================
        // EXERCISE DATABASE PAGE
        // ============================================
        'exercise-database': {
            leftActions: [
                {
                    icon: 'bx-dumbbell',
                    label: 'Workouts',
                    title: 'Go to workouts',
                    action: function() {
                        window.location.href = 'workout-database.html';
                    }
                },
                {
                    icon: 'bx-star',
                    label: 'Favorites',
                    title: 'Toggle favorites filter',
                    action: function() {
                        // Toggle favorites filter
                        if (window.ghostGym?.exercises?.filters) {
                            window.ghostGym.exercises.filters.favoritesOnly = 
                                !window.ghostGym.exercises.filters.favoritesOnly;
                            
                            // Trigger filter update
                            if (window.filterExercises) {
                                window.filterExercises();
                            }
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-search',
                title: 'Search exercises',
                variant: 'primary',
                action: function() {
                    const offcanvas = new bootstrap.Offcanvas(
                        document.getElementById('filtersOffcanvas')
                    );
                    offcanvas.show();
                    
                    // Focus search input after offcanvas opens
                    setTimeout(() => {
                        const searchInput = document.getElementById('exerciseSearch');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }, 300);
                }
            },
            rightActions: [
                {
                    icon: 'bx-sort',
                    label: 'Sort',
                    title: 'Sort exercises',
                    action: function() {
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas')
                        );
                        offcanvas.show();
                    }
                },
                {
                    icon: 'bx-plus',
                    label: 'Custom',
                    title: 'Add custom exercise',
                    action: function() {
                        const modal = new bootstrap.Modal(
                            document.getElementById('customExerciseModal')
                        );
                        modal.show();
                    }
                }
            ]
        },

        // ============================================
        // WORKOUT MODE PAGE (NOT STARTED)
        // ============================================
        'workout-mode': {
            leftActions: [
                {
                    icon: 'bx-skip-next',
                    label: 'Skip',
                    title: 'Skip current exercise',
                    action: function() {
                        // Skip to next exercise
                        if (window.workoutModeController?.skipExercise) {
                            window.workoutModeController.skipExercise();
                        }
                    }
                },
                {
                    icon: 'bx-plus-circle',
                    label: 'Bonus',
                    title: 'Add bonus exercise',
                    action: function() {
                        alert('Bonus exercise feature - Coming soon!');
                    }
                }
            ],
            fab: {
                icon: 'bx-play',
                title: 'Start workout',
                variant: 'success',
                action: function() {
                    const startBtn = document.getElementById('startWorkoutBtn');
                    if (startBtn) {
                        startBtn.click();
                    }
                }
            },
            rightActions: [
                {
                    icon: 'bx-note',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        alert('Workout notes feature - Coming soon!');
                    }
                },
                {
                    icon: 'bx-stop-circle',
                    label: 'End',
                    title: 'End workout',
                    action: function() {
                        const completeBtn = document.getElementById('completeWorkoutBtn');
                        if (completeBtn && completeBtn.style.display !== 'none') {
                            completeBtn.click();
                        } else {
                            // Not started yet, go back to workout database
                            if (confirm('Exit workout mode?')) {
                                window.location.href = 'workout-database.html';
                            }
                        }
                    }
                }
            ]
        },

        // ============================================
        // WORKOUT MODE PAGE (ACTIVE/STARTED)
        // ============================================
        'workout-mode-active': {
            leftActions: [
                {
                    icon: 'bx-skip-next',
                    label: 'Skip',
                    title: 'Skip current exercise',
                    action: function() {
                        if (window.workoutModeController?.skipExercise) {
                            window.workoutModeController.skipExercise();
                        }
                    }
                },
                {
                    icon: 'bx-plus-circle',
                    label: 'Bonus',
                    title: 'Add bonus exercise',
                    action: function() {
                        alert('Bonus exercise feature - Coming soon!');
                    }
                }
            ],
            fab: {
                icon: 'bx-check',
                title: 'Complete current set',
                variant: 'success',
                action: function() {
                    // Complete current set
                    if (window.workoutModeController?.completeSet) {
                        window.workoutModeController.completeSet();
                    }
                }
            },
            rightActions: [
                {
                    icon: 'bx-note',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        alert('Workout notes feature - Coming soon!');
                    }
                },
                {
                    icon: 'bx-stop-circle',
                    label: 'End',
                    title: 'End workout',
                    action: function() {
                        const completeBtn = document.getElementById('completeWorkoutBtn');
                        if (completeBtn) {
                            completeBtn.click();
                        }
                    }
                }
            ]
        }
    };

    console.log('✅ Bottom Action Bar configurations loaded');
})();