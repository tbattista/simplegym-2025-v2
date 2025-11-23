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
                    icon: 'bx-filter',
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
                    // Toggle navbar search (open if closed, close if open)
                    const searchToggle = document.getElementById('navbarSearchToggle');
                    const searchMobile = document.getElementById('navbarSearchMobile');
                    const searchInputDesktop = document.getElementById('navbarSearchInput');
                    
                    // On mobile, toggle the dropdown
                    if (window.innerWidth < 768) {
                        if (searchMobile && searchMobile.classList.contains('active')) {
                            // Search is open, close it
                            const searchClose = document.getElementById('navbarSearchClose');
                            if (searchClose) {
                                searchClose.click();
                            }
                        } else {
                            // Search is closed, open it
                            if (searchToggle) {
                                searchToggle.click();
                            }
                        }
                    } else {
                        // On desktop, focus the search input
                        if (searchInputDesktop) {
                            searchInputDesktop.focus();
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
                    icon: 'bx-share-alt',
                    label: 'Share',
                    title: 'Share workout',
                    action: function() {
                        console.log('🔗 Share button clicked from bottom action bar');
                        
                        // Get current workout ID
                        const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                                        window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                        
                        if (workoutId && window.shareModal) {
                            // Open share offcanvas directly with tabs
                            window.shareModal.open(workoutId);
                        } else if (!workoutId) {
                            console.warn('⚠️ No workout ID available for sharing');
                            alert('Please save the workout first before sharing');
                        } else {
                            console.error('❌ Share modal not available');
                            alert('Share feature is loading. Please try again.');
                        }
                    }
                },
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
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        // Use UnifiedOffcanvasFactory to create more menu
                        if (window.UnifiedOffcanvasFactory) {
                            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                                id: 'moreMenuOffcanvas',
                                title: 'More Options',
                                icon: 'bx-dots-vertical-rounded',
                                menuItems: [
                                    {
                                        icon: 'bx-x',
                                        title: 'Cancel Edit',
                                        description: 'Discard changes and exit',
                                        onClick: () => {
                                            const cancelBtn = document.getElementById('cancelEditBtn');
                                            if (cancelBtn) {
                                                cancelBtn.click();
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-share-alt',
                                        title: 'Share Workout',
                                        description: 'Share publicly or create private link',
                                        onClick: () => {
                                            // Trigger share button
                                            const shareAction = window.BOTTOM_BAR_CONFIGS['workout-builder'].leftActions.find(a => a.icon === 'bx-share-alt');
                                            if (shareAction && shareAction.action) {
                                                shareAction.action();
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-trash',
                                        title: 'Delete Workout',
                                        description: 'This action cannot be undone',
                                        variant: 'danger',
                                        onClick: () => {
                                            const deleteBtn = document.getElementById('deleteWorkoutBtn');
                                            if (deleteBtn) {
                                                deleteBtn.click();
                                            }
                                        }
                                    }
                                ]
                            });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory not loaded');
                            alert('More options is loading. Please try again in a moment.');
                        }
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
                    icon: 'bx-heart',
                    label: 'Favorites',
                    title: 'Show only favorites',
                    action: function() {
                        console.log('❤️ Favorites button clicked');
                        
                        // Work directly with global filter state (no dependency on FilterBar)
                        if (!window.currentFilters) {
                            console.warn('⚠️ Filter state not initialized');
                            return;
                        }
                        
                        // Toggle the favoritesOnly state
                        const isActive = !window.currentFilters.favoritesOnly;
                        window.currentFilters.favoritesOnly = isActive;
                        
                        console.log('🔄 Toggling favorites filter:', isActive ? 'ON' : 'OFF');
                        
                        // Apply filters with the updated favoritesOnly state
                        if (window.applyFiltersAndRender) {
                            window.applyFiltersAndRender(window.currentFilters);
                        }
                        
                        // Update button visual state with animation
                        if (window.bottomActionBar) {
                            const btn = document.querySelector('[data-action="left-0"]');
                            
                            // Add pulse animation
                            if (btn) {
                                btn.classList.add('pulse-animation');
                                setTimeout(() => btn.classList.remove('pulse-animation'), 300);
                            }
                            
                            // Update icon and title
                            window.bottomActionBar.updateButton('left-0', {
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
                },
                {
                    icon: 'bx-filter',
                    label: 'Filters',
                    title: 'Open filters',
                    action: function() {
                        // Use UnifiedOffcanvasFactory to create filters offcanvas (muscle group, equipment, custom only)
                        if (window.UnifiedOffcanvasFactory && window.filterBarConfig) {
                            // Create filter config with only muscle group, equipment, and custom only
                            const filtersOnly = window.filterBarConfig.filters.filter(f =>
                                f.key === 'muscleGroup' || f.key === 'equipment' || f.key === 'customOnly'
                            );
                            
                            const { offcanvas, offcanvasElement } = window.UnifiedOffcanvasFactory.createFilterOffcanvas({
                                id: 'filtersOffcanvas',
                                title: 'Filters',
                                icon: 'bx-filter',
                                filterBarContainerId: 'offcanvasFilterBarContainer',
                                clearButtonId: 'clearFiltersBtn',
                                onApply: function() {
                                    console.log('✅ Filters applied');
                                    // Sync FilterBar state to global state
                                    if (window.filterBar) {
                                        const filterBarState = window.filterBar.getFilters();
                                        // Merge with current filters (preserve favoritesOnly)
                                        window.currentFilters = {
                                            ...window.currentFilters,
                                            ...filterBarState
                                        };
                                    }
                                },
                                onClear: function() {
                                    // Clear all filters in FilterBar
                                    if (window.filterBar) {
                                        window.filterBar.clearAll();
                                    }
                                }
                            });
                            
                            // Initialize FilterBar inside the offcanvas after it's shown
                            offcanvasElement.addEventListener('shown.bs.offcanvas', function initFilterBar() {
                                console.log('🔧 Initializing FilterBar in offcanvas');
                                
                                // Always recreate FilterBar to ensure fresh state
                                const container = document.getElementById('offcanvasFilterBarContainer');
                                if (!container) {
                                    console.error('❌ FilterBar container not found');
                                    return;
                                }
                                
                                // Clear container
                                container.innerHTML = '';
                                
                                // Create new FilterBar instance with filters only (no sort)
                                const filterBarConfig = {
                                    ...window.filterBarConfig,
                                    filters: filtersOnly,
                                    onFilterChange: (filters) => {
                                        console.log('🔍 Filters changed in offcanvas:', filters);
                                        // Update global state
                                        window.currentFilters = {
                                            ...window.currentFilters,
                                            ...filters
                                        };
                                        // Apply filters immediately
                                        if (window.applyFiltersAndRender) {
                                            window.applyFiltersAndRender(window.currentFilters);
                                        }
                                    }
                                };
                                
                                window.filterBar = new window.GhostGymFilterBar('offcanvasFilterBarContainer', filterBarConfig);
                                
                                // Set current filter values (excluding favoritesOnly which isn't in FilterBar)
                                if (window.currentFilters) {
                                    const filterBarState = { ...window.currentFilters };
                                    delete filterBarState.favoritesOnly; // This is handled separately
                                    window.filterBar.setFilters(filterBarState);
                                }
                                
                                console.log('✅ FilterBar initialized in offcanvas');
                            }, { once: true });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory or filterBarConfig not loaded');
                            alert('Filter feature is loading. Please try again in a moment.');
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-search',
                title: 'Search exercises',
                variant: 'primary',
                action: function() {
                    // On mobile, toggle navbar search (open if closed, close if open)
                    if (window.innerWidth < 768) {
                        const searchMobile = document.getElementById('navbarSearchMobile');
                        const searchClose = document.getElementById('navbarSearchClose');
                        
                        if (searchMobile && searchMobile.classList.contains('active')) {
                            // Search is open, close it
                            if (searchClose) {
                                searchClose.click();
                            }
                        } else {
                            // Search is closed, open it
                            const searchToggle = document.getElementById('navbarSearchToggle');
                            if (searchToggle) {
                                searchToggle.click();
                            }
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
                    icon: 'bx-sort-alt-2',
                    label: 'Sort',
                    title: 'Sort and filter',
                    action: function() {
                        // Create sort offcanvas with sortBy, difficulty, and tier
                        if (window.UnifiedOffcanvasFactory && window.filterBarConfig) {
                            // Get sortBy, difficulty, and exerciseTier filters
                            const sortFilters = window.filterBarConfig.filters.filter(f =>
                                f.key === 'sortBy' || f.key === 'difficulty' || f.key === 'exerciseTier'
                            );
                            
                            if (sortFilters.length === 0) {
                                console.error('❌ Sort filters not found');
                                return;
                            }
                            
                            const { offcanvas, offcanvasElement } = window.UnifiedOffcanvasFactory.createFilterOffcanvas({
                                id: 'sortOffcanvas',
                                title: 'Sort & Filter',
                                icon: 'bx-sort-alt-2',
                                filterBarContainerId: 'offcanvasSortBarContainer',
                                clearButtonId: 'clearSortBtn',
                                onApply: function() {
                                    console.log('✅ Sort applied');
                                    if (window.sortBar) {
                                        const sortState = window.sortBar.getFilters();
                                        window.currentFilters = {
                                            ...window.currentFilters,
                                            ...sortState
                                        };
                                    }
                                },
                                onClear: function() {
                                    if (window.sortBar) {
                                        window.sortBar.clearAll();
                                    }
                                }
                            });
                            
                            // Initialize sort bar
                            offcanvasElement.addEventListener('shown.bs.offcanvas', function initSortBar() {
                                console.log('🔧 Initializing Sort Bar in offcanvas');
                                
                                const container = document.getElementById('offcanvasSortBarContainer');
                                if (!container) {
                                    console.error('❌ Sort Bar container not found');
                                    return;
                                }
                                
                                container.innerHTML = '';
                                
                                const sortBarConfig = {
                                    showSearch: false,
                                    showClearAll: false,
                                    filters: sortFilters,
                                    onFilterChange: (filters) => {
                                        console.log('🔄 Sort/Filter changed:', filters);
                                        window.currentFilters = {
                                            ...window.currentFilters,
                                            ...filters
                                        };
                                        if (window.applyFiltersAndRender) {
                                            window.applyFiltersAndRender(window.currentFilters);
                                        }
                                    }
                                };
                                
                                window.sortBar = new window.GhostGymFilterBar('offcanvasSortBarContainer', sortBarConfig);
                                
                                // Set current values for all sort filters
                                if (window.currentFilters) {
                                    const currentSortState = {};
                                    if (window.currentFilters.sortBy) currentSortState.sortBy = window.currentFilters.sortBy;
                                    if (window.currentFilters.difficulty) currentSortState.difficulty = window.currentFilters.difficulty;
                                    if (window.currentFilters.exerciseTier) currentSortState.exerciseTier = window.currentFilters.exerciseTier;
                                    window.sortBar.setFilters(currentSortState);
                                }
                                
                                console.log('✅ Sort Bar initialized');
                            }, { once: true });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory or filterBarConfig not loaded');
                            alert('Sort feature is loading. Please try again in a moment.');
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        // Use UnifiedOffcanvasFactory to create more menu
                        if (window.UnifiedOffcanvasFactory) {
                            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                                id: 'moreMenuOffcanvas',
                                title: 'More Options',
                                icon: 'bx-dots-vertical-rounded',
                                menuItems: [
                                    {
                                        icon: 'bx-plus',
                                        title: 'Add Custom Exercise',
                                        description: 'Create your own exercise',
                                        onClick: () => {
                                            const modal = new bootstrap.Modal(
                                                document.getElementById('customExerciseModal')
                                            );
                                            modal.show();
                                        }
                                    },
                                    {
                                        icon: 'bx-dumbbell',
                                        title: 'Go to Workouts',
                                        description: 'View your workout templates',
                                        onClick: () => {
                                            window.location.href = 'workout-database.html';
                                        }
                                    }
                                ]
                            });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory not loaded');
                            alert('More options is loading. Please try again in a moment.');
                        }
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