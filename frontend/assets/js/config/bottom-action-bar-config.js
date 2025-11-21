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
                }
            ],
            fab: {
                icon: 'bx-search',
                title: 'Search workouts',
                variant: 'primary',
                action: function() {
                    // On mobile, expand navbar search
                    if (window.innerWidth < 768) {
                        const searchToggle = document.getElementById('navbarSearchToggle');
                        if (searchToggle) {
                            searchToggle.click();
                        }
                    } else {
                        // On desktop, focus navbar search input
                        const searchInput = document.getElementById('navbarSearchInput');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }
                }
            },
            rightActions: [
                {
                    icon: 'bx-plus',
                    label: 'Add',
                    title: 'Create new workout',
                    action: function() {
                        // Clear localStorage to ensure a fresh workout is created
                        try {
                            localStorage.removeItem('currentEditingWorkoutId');
                            console.log('🗑️ Cleared workout ID from localStorage (creating new workout)');
                        } catch (error) {
                            console.warn('⚠️ Could not clear localStorage:', error);
                        }
                        window.location.href = 'workout-builder.html';
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
                    icon: 'bx-share-alt',
                    label: 'Share',
                    title: 'Share workout',
                    action: function() {
                        // Get current workout ID
                        const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                                        window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                        
                        if (workoutId) {
                            console.log('🔗 Opening share modal for workout:', workoutId);
                            if (window.openShareModal) {
                                window.openShareModal(workoutId);
                            } else {
                                console.error('❌ Share modal not available');
                                alert('Share feature is loading. Please try again in a moment.');
                            }
                        } else {
                            console.warn('⚠️ No workout ID available');
                            alert('Please save the workout first before sharing');
                        }
                    }
                },
                {
                    icon: 'bx-play',
                    label: 'Go',
                    title: 'Start workout',
                    action: function() {
                        // Get current workout ID - check selectedWorkoutId first (more reliable)
                        const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                                        window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                        
                        if (workoutId) {
                            console.log('🏃 Starting workout mode with ID:', workoutId);
                            window.location.href = `workout-mode.html?id=${workoutId}`;
                        } else {
                            console.warn('⚠️ No workout ID available');
                            alert('Please save the workout first before starting workout mode');
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
                        console.log('💾 Save action triggered from bottom action bar');
                        const saveBtn = document.getElementById('saveWorkoutBtn');
                        console.log('🔍 Looking for save button:', saveBtn);
                        if (saveBtn) {
                            console.log('✅ Save button found, clicking it');
                            saveBtn.click();
                        } else {
                            console.error('❌ Save button not found in DOM!');
                            console.log('📋 Available buttons:',
                                Array.from(document.querySelectorAll('button[id]')).map(b => b.id)
                            );
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        // Show more options offcanvas
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('moreMenuOffcanvas')
                        );
                        offcanvas.show();
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
                    icon: 'bx-heart',
                    label: 'Favorites',
                    title: 'Show only favorites',
                    action: function() {
                        console.log('❤️ Favorites button clicked');
                        
                        // Get current filter state from FilterBar
                        if (!window.filterBar) {
                            console.warn('⚠️ FilterBar not available');
                            return;
                        }
                        
                        const currentFilters = window.filterBar.getFilters();
                        // Toggle the favoritesOnly state (stored separately since it's not in FilterBar)
                        const isActive = !currentFilters.favoritesOnly;
                        
                        console.log('🔄 Toggling favorites filter:', isActive ? 'ON' : 'OFF');
                        
                        // Manually add favoritesOnly to filters and apply
                        currentFilters.favoritesOnly = isActive;
                        
                        // Apply filters with the updated favoritesOnly state
                        if (window.applyFiltersAndRender) {
                            window.applyFiltersAndRender(currentFilters);
                        }
                        
                        // Update button visual state with animation
                        if (window.bottomActionBar) {
                            const btn = document.querySelector('[data-action="left-1"]');
                            
                            // Add pulse animation
                            if (btn) {
                                btn.classList.add('pulse-animation');
                                setTimeout(() => btn.classList.remove('pulse-animation'), 300);
                            }
                            
                            // Update icon and title
                            window.bottomActionBar.updateButton('left-1', {
                                icon: isActive ? 'bxs-heart' : 'bx-heart',
                                title: isActive ? 'Show all exercises' : 'Show only favorites'
                            });
                            
                            // Add/remove active class for color change
                            if (btn) {
                                btn.classList.toggle('active', isActive);
                            }
                        }
                        
                        console.log('✅ Favorites filter updated');
                    }
                }
            ],
            fab: {
                icon: 'bx-search',
                title: 'Search exercises',
                variant: 'primary',
                action: function() {
                    // On mobile, expand navbar search
                    if (window.innerWidth < 768) {
                        const searchToggle = document.getElementById('navbarSearchToggle');
                        if (searchToggle) {
                            searchToggle.click();
                        }
                    } else {
                        // On desktop, focus navbar search input
                        const searchInput = document.getElementById('navbarSearchInput');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }
                }
            },
            rightActions: [
                {
                    icon: 'bx-filter-alt',
                    label: 'Filters',
                    title: 'Open filters',
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
                        if (window.workoutModeController && window.workoutModeController.handleBonusExercises) {
                            window.workoutModeController.handleBonusExercises();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                            alert('Please start your workout session first');
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-play',
                title: 'Start workout',
                variant: 'success',
                action: function() {
                    console.log('▶️ Start workout button clicked');
                    // Call controller method directly since #startWorkoutBtn doesn't exist in HTML
                    if (window.workoutModeController && window.workoutModeController.handleStartWorkout) {
                        window.workoutModeController.handleStartWorkout();
                    } else {
                        console.error('❌ Workout mode controller not available');
                        alert('Workout mode is still loading. Please wait a moment and try again.');
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
                        console.log('⏹️ End workout button clicked');
                        // Call controller method directly since #completeWorkoutBtn doesn't exist in HTML
                        if (window.workoutModeController && window.workoutModeController.handleCompleteWorkout) {
                            window.workoutModeController.handleCompleteWorkout();
                        } else {
                            // Not started yet or controller not ready, go back to workout database
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
                        if (window.workoutModeController && window.workoutModeController.handleBonusExercises) {
                            window.workoutModeController.handleBonusExercises();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                            alert('Please start your workout session first');
                        }
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
                        console.log('⏹️ End workout button clicked (active mode)');
                        // Call controller method directly since #completeWorkoutBtn doesn't exist in HTML
                        if (window.workoutModeController && window.workoutModeController.handleCompleteWorkout) {
                            window.workoutModeController.handleCompleteWorkout();
                        } else {
                            console.error('❌ Workout mode controller not available');
                            alert('Unable to complete workout. Please try again.');
                        }
                    }
                }
            ]
        }
    };

    console.log('✅ Bottom Action Bar configurations loaded');
})();