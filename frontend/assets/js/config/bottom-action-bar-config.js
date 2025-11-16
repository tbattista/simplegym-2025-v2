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
                        // Toggle search overlay
                        const overlay = document.getElementById('searchOverlay');
                        if (overlay && overlay.classList.contains('active')) {
                            if (window.hideSearchOverlay) {
                                window.hideSearchOverlay();
                            }
                        } else {
                            if (window.showSearchOverlay) {
                                window.showSearchOverlay();
                            }
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
                    title: 'Page information',
                    action: function() {
                        // Show info modal with page explanation
                        const modalHtml = `
                            <div class="modal fade" id="workoutDatabaseInfoModal" tabindex="-1" aria-hidden="true">
                                <div class="modal-dialog modal-dialog-centered">
                                    <div class="modal-content">
                                        <div class="modal-header">
                                            <h5 class="modal-title">
                                                <i class="bx bx-info-circle me-2"></i>
                                                Workout Database
                                            </h5>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body">
                                            <h6 class="mb-3">📚 What is this page?</h6>
                                            <p class="mb-3">This is your personal workout library where you can browse, search, and manage all your workout templates.</p>
                                            
                                            <h6 class="mb-3">🔍 How to use:</h6>
                                            <ul class="mb-3">
                                                <li><strong>Search:</strong> Tap the Search button to find workouts by name, description, or tags</li>
                                                <li><strong>Filter:</strong> Use the Filter button to narrow down by tags</li>
                                                <li><strong>Sort:</strong> Tap Sort to organize by date, name, or exercise count</li>
                                                <li><strong>Create:</strong> Tap the + button to build a new workout</li>
                                            </ul>
                                            
                                            <h6 class="mb-3">💡 Quick Actions:</h6>
                                            <ul class="mb-0">
                                                <li><strong>Start Workout:</strong> Tap the purple button on any workout card</li>
                                                <li><strong>View Details:</strong> Tap "View" to see full workout information</li>
                                                <li><strong>Edit:</strong> Tap "Edit" to modify a workout template</li>
                                            </ul>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Got it!</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Remove existing modal if present
                        const existingModal = document.getElementById('workoutDatabaseInfoModal');
                        if (existingModal) {
                            existingModal.remove();
                        }
                        
                        // Add modal to body
                        document.body.insertAdjacentHTML('beforeend', modalHtml);
                        
                        // Show modal
                        const modal = new bootstrap.Modal(document.getElementById('workoutDatabaseInfoModal'));
                        modal.show();
                        
                        // Clean up after modal is hidden
                        document.getElementById('workoutDatabaseInfoModal').addEventListener('hidden.bs.modal', function() {
                            this.remove();
                        });
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