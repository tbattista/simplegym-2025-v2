/**
 * Bottom Action Bar Configuration
 * Defines button layouts and actions for each page
 * Uses 4-button + right FAB layout for all pages
 */

(function() {
    'use strict';

    /**
     * Open search with morphing animation
     * @param {HTMLElement} searchFab - Search FAB element
     * @param {HTMLElement} searchInput - Search input element
     */
    function openMorphingSearch(searchFab, searchInput) {
        if (window.bottomNavState?.animating) return;
        
        console.log('🔍 Opening morphing search with mobile keyboard optimization');
        window.bottomNavState = window.bottomNavState || {};
        window.bottomNavState.animating = true;
        
        // Get elements
        const bottomNav = document.querySelector('.bottom-action-bar');
        
        // CRITICAL: Focus IMMEDIATELY during user interaction (before any delays)
        // This maintains the user interaction chain required by mobile browsers
        if (searchInput) {
            // Attempt 1: Immediate focus (most important for mobile)
            searchInput.focus();
            
            // iOS Safari workaround: trigger click event as well
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            if (isIOS) {
                searchInput.click();
                console.log('📱 iOS detected - triggered click for keyboard');
            }
        }
        
        // Note: No backdrop needed - search stays above action bar
        
        // Note: Bottom nav stays visible - no need to hide
        
        // Stage 1: Start morphing (add morphing class)
        searchFab.classList.add('morphing');
        
        // Stage 2: Complete expansion after 150ms
        setTimeout(() => {
            searchFab.classList.remove('morphing');
            searchFab.classList.add('expanded');
            
            // Attempt 2: Focus after expansion completes
            if (searchInput) {
                searchInput.focus();
                
                // Additional iOS workaround
                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                if (isIOS) {
                    searchInput.click();
                }
            }
        }, 150);
        
        // Attempt 3: Final focus attempt after all animations
        setTimeout(() => {
            if (searchInput && document.activeElement !== searchInput) {
                console.log('🔄 Final focus attempt for mobile keyboard');
                searchInput.focus();
                
                // Last resort for iOS
                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                if (isIOS) {
                    searchInput.click();
                }
            }
        }, 200);
        
        // Update state
        window.bottomNavState.isHidden = true;
        window.bottomNavState.searchActive = true;
        
        // Animation complete
        setTimeout(() => {
            window.bottomNavState.animating = false;
        }, 300);
    }

    /**
     * Close search with morphing animation
     * @param {HTMLElement} searchFab - Search FAB element
     */
    /**
     * Close search with morphing animation (without clearing)
     * @param {HTMLElement} searchFab - Search FAB element
     */
    function closeMorphingSearch(searchFab) {
        if (window.bottomNavState?.animating) return;
        
        console.log('🔍 Closing morphing search (keeping search term)');
        window.bottomNavState = window.bottomNavState || {};
        window.bottomNavState.animating = true;
        
        // Note: No backdrop to hide
        // Note: Bottom nav stays visible
        
        // Stage 1: Start collapsing (remove expanded, add morphing)
        searchFab.classList.remove('expanded');
        searchFab.classList.add('morphing');
        
        // Stage 2: Complete collapse after 150ms
        setTimeout(() => {
            searchFab.classList.remove('morphing');
        }, 150);
        
        // Update state
        window.bottomNavState.isHidden = false;
        window.bottomNavState.searchActive = false;
        
        // Animation complete
        setTimeout(() => {
            window.bottomNavState.animating = false;
        }, 300);
    }

    /**
     * Clear search and close
     * @param {HTMLElement} searchFab - Search FAB element
     */
    function clearAndCloseSearch(searchFab) {
        console.log('🔍 Clearing search and closing');
        
        const searchInput = document.getElementById('searchFabInput');
        const searchClose = document.getElementById('searchFabClose');
        
        // Clear search input and trigger search with empty term
        if (searchInput) {
            searchInput.value = '';
            // Trigger search to clear results
            if (window.currentFilters && window.applyFiltersAndRender) {
                window.currentFilters.search = '';
                window.applyFiltersAndRender(window.currentFilters);
            } else if (window.ffn?.workoutDatabase && window.filterWorkouts) {
                window.ffn.workoutDatabase.filters.search = '';
                window.filterWorkouts();
            } else if (window.ffn?.programsPage && window.renderProgramsGrid) {
                window.ffn.programsPage.filters.search = '';
                window.renderProgramsGrid();
            }
        }
        
        // Remove has-text class from close button
        if (searchClose) {
            searchClose.classList.remove('has-text');
        }
        
        // Close the search
        closeMorphingSearch(searchFab);
    }

    /**
     * Set up document-level click handler for click-outside detection
     * This replaces the backdrop approach which was unreliable
     */
    let clickOutsideHandlerAttached = false;
    
    function setupClickOutsideHandler() {
        if (clickOutsideHandlerAttached) return;
        clickOutsideHandlerAttached = true;
        
        // Use capture phase to catch clicks before they reach other handlers
        document.addEventListener('click', (e) => {
            const searchFab = document.getElementById('searchFab');
            
            // Only handle if search is expanded
            if (!searchFab || !searchFab.classList.contains('expanded')) {
                return;
            }
            
            // Check if click is inside the search FAB (including all children)
            if (searchFab.contains(e.target)) {
                console.log('🔍 Click inside search FAB - keeping open');
                return;
            }
            
            console.log('🔍 Click outside search FAB - closing');
            closeMorphingSearch(searchFab);
        }, true); // true = capture phase
        
        console.log('✅ Click-outside handler attached to document');
    }
    
    /**
     * Get or create backdrop element (now only for visual dimming, no click handling)
     * @returns {HTMLElement} Backdrop element
     */
    function getOrCreateBackdrop() {
        let backdrop = document.querySelector('.search-backdrop');
        
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'search-backdrop';
            document.body.appendChild(backdrop);
        }
        
        return backdrop;
    }

    /**
     * Initialize morphing search FAB event listeners
     * Called after bottom action bar is rendered
     */
    function initializeMorphingSearch() {
        const searchFab = document.getElementById('searchFab');
        const searchInput = document.getElementById('searchFabInput');
        const searchClose = document.getElementById('searchFabClose');
        const searchIcon = searchFab?.querySelector('.search-icon-expanded');
        
        if (!searchFab || !searchInput || !searchClose) {
            console.warn('⚠️ Morphing search elements not found');
            return;
        }
        
        console.log('🔧 Initializing morphing search');
        
        // Set up document-level click-outside handler (replaces backdrop click handling)
        setupClickOutsideHandler();
        
        // Close button handler - CLEARS search and closes
        searchClose.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Add pulse animation
            searchClose.classList.add('pulse');
            setTimeout(() => searchClose.classList.remove('pulse'), 300);
            
            // Clear search and close
            clearAndCloseSearch(searchFab);
        });
        
        // ESC key handler - just closes without clearing
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMorphingSearch(searchFab);
            }
        });
        
        // Search input handler with debouncing
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            
            // Update close button visibility based on input
            const hasText = e.target.value.trim().length > 0;
            if (hasText) {
                searchClose.classList.add('has-text');
            } else {
                searchClose.classList.remove('has-text');
            }
            
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.trim();
                console.log('🔍 Search term:', searchTerm);
                
                // Update the appropriate filter based on current page
                if (window.currentFilters && window.applyFiltersAndRender) {
                    // Exercise database page
                    window.currentFilters.search = searchTerm;
                    window.applyFiltersAndRender(window.currentFilters);
                } else if (window.ffn?.workoutDatabase && window.filterWorkouts) {
                    // Workout database page
                    window.ffn.workoutDatabase.filters.search = searchTerm;
                    window.filterWorkouts();
                } else if (window.ffn?.programsPage && window.renderProgramsGrid) {
                    // Programs page
                    window.ffn.programsPage.filters.search = searchTerm;
                    window.renderProgramsGrid();
                }
            }, 300);
        });
        
        console.log('✅ Morphing search initialized');
    }

    /**
     * DEPRECATED: Old dropdown function - kept for compatibility
     * @deprecated Use morphing search FAB instead
     */
    function createSearchDropdown(type) {
        const dropdownId = `${type}SearchDropdown`;
        const inputId = `${type}SearchInput`;
        
        // Check if dropdown already exists
        let existingDropdown = document.getElementById(dropdownId);
        if (existingDropdown) {
            return bootstrap.Dropdown.getInstance(existingDropdown) || new bootstrap.Dropdown(existingDropdown);
        }
        
        // Create dropdown HTML with search-dropdown class
        const dropdownHTML = `
            <div class="dropdown search-dropdown" id="${dropdownId}">
                <div class="dropdown-menu show w-100 p-3" style="position: static;">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bx bx-search"></i>
                        </span>
                        <input type="text"
                               class="form-control"
                               id="${inputId}"
                               placeholder="Search ${type}s..."
                               autocomplete="off">
                        <button class="btn btn-outline-secondary search-close-btn" type="button">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.insertAdjacentHTML('beforeend', dropdownHTML);
        
        // Get the dropdown element
        const dropdownElement = document.getElementById(dropdownId);
        const searchInput = document.getElementById(inputId);
        const closeBtn = dropdownElement.querySelector('.search-close-btn');
        
        // Set up search input handler
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.trim();
                console.log(`🔍 ${type} search:`, searchTerm);
                
                // Update the appropriate filter
                if (type === 'exercise' && window.currentFilters) {
                    window.currentFilters.search = searchTerm;
                    if (window.applyFiltersAndRender) {
                        window.applyFiltersAndRender(window.currentFilters);
                    }
                } else if (type === 'workout' && window.ffn?.workoutDatabase) {
                    window.ffn.workoutDatabase.filters.search = searchTerm;
                    if (window.filterWorkouts) {
                        window.filterWorkouts();
                    }
                }
            }, 300);
        });
        
        // Create custom dropdown object with show/hide/toggle methods
        const dropdown = {
            element: dropdownElement,
            input: searchInput,
            show: function() {
                this.element.querySelector('.dropdown-menu').classList.add('show');
                setTimeout(() => this.input.focus(), 100);
                console.log(`🔍 ${type} search dropdown shown`);
            },
            hide: function() {
                this.element.querySelector('.dropdown-menu').classList.remove('show');
                console.log(`🔍 ${type} search dropdown hidden`);
            },
            toggle: function() {
                const menu = this.element.querySelector('.dropdown-menu');
                if (menu.classList.contains('show')) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        };
        
        // Close button handler - closes search AND restores nav
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSearchWithNav(dropdown);
        });
        
        // ESC key handler - closes search AND restores nav
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSearchWithNav(dropdown);
            }
        });
        
        return dropdown;
    }

    /**
     * Configuration for each page
     * Structure:
     * - leftActions: Array of left-side buttons
     * - fab: Center floating action button
     * - rightActions: Array of right-side buttons
     */
    window.BOTTOM_BAR_CONFIGS = {

        // ============================================
        // DASHBOARD PAGE
        // ============================================
        'dashboard': {
            buttons: [
                {
                    icon: 'bx-plus-circle',
                    label: 'Create',
                    title: 'Create new workout',
                    action: function() {
                        window.location.href = 'workout-builder.html';
                    }
                },
                {
                    icon: 'bx-search',
                    label: 'Find',
                    title: 'Find workouts',
                    action: function() {
                        window.location.href = 'workout-database.html';
                    }
                },
                {
                    icon: 'bx-history',
                    label: 'History',
                    title: 'View workout history',
                    action: function() {
                        window.location.href = 'workout-history.html';
                    }
                },
                {
                    icon: 'bx-cog',
                    label: 'Settings',
                    title: 'Settings',
                    action: function() {
                        // Open settings if available, or navigate to settings page
                        console.log('Settings clicked');
                    }
                }
            ],
            fab: {
                icon: 'bx-play',
                title: 'Start Workout',
                variant: 'success',
                action: function() {
                    // Navigate to workout mode with most recent workout
                    const workouts = window.dashboardDemo?.data?.workouts || [];
                    if (workouts.length > 0) {
                        window.location.href = `workout-mode.html?id=${workouts[0].id}`;
                    } else {
                        window.location.href = 'workout-database.html';
                    }
                }
            }
        },

        // ============================================
        // WORKOUT DATABASE PAGE
        // ============================================
        'workout-database': {
            buttons: [
                {
                    icon: 'bx-filter',
                    label: 'Filter',
                    title: 'Open filters',
                    action: function() {
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas'),
                            { scroll: false }
                        );
                        offcanvas.show();

                        // Activate the Filters tab
                        const filtersTab = document.getElementById('filters-tab');
                        if (filtersTab) {
                            const tab = new bootstrap.Tab(filtersTab);
                            tab.show();
                        }
                    }
                },
                {
                    icon: 'bx-sort',
                    label: 'Sort',
                    title: 'Sort workouts',
                    action: function() {
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas'),
                            { scroll: false }
                        );
                        offcanvas.show();

                        // Activate the Sort tab
                        const sortTab = document.getElementById('sort-tab');
                        if (sortTab) {
                            const tab = new bootstrap.Tab(sortTab);
                            tab.show();
                        }
                    }
                },
                {
                    icon: 'bx-search',
                    label: 'Search',
                    title: 'Search workouts',
                    action: function() {
                        const searchFab = document.getElementById('searchFab');
                        const searchInput = document.getElementById('searchFabInput');
                        
                        if (!searchFab || !searchInput) {
                            console.error('❌ Search FAB elements not found');
                            return;
                        }
                        
                        // Only open if collapsed
                        if (!searchFab.classList.contains('expanded')) {
                            // Open search - morph FAB to search box
                            openMorphingSearch(searchFab, searchInput);
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
                                        icon: 'bx-trash',
                                        title: 'Delete Workouts',
                                        description: 'Toggle delete mode to remove workouts',
                                        onClick: () => {
                                            const toggle = document.getElementById('deleteModeToggle');
                                            if (toggle) {
                                                toggle.checked = !toggle.checked;
                                                toggle.dispatchEvent(new Event('change'));
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-info-circle',
                                        title: 'Page Information',
                                        description: 'Learn how to use this page',
                                        onClick: () => {
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
                            });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory not loaded');
                            alert('More options is loading. Please try again in a moment.');
                        }
                    }
                }
            ],
            fab: {
                icon: 'bx-plus',
                title: 'Create new workout',
                variant: 'primary',
                action: function() {
                    console.log('➕ Create new workout FAB clicked');
                    // Navigate with URL parameter (sessionStorage no longer used)
                    window.location.href = 'workout-builder.html?new=true';
                }
            },
            // Hidden search FAB config (renders the morphing search elements but triggered by button)
            searchFab: {
                icon: 'bx-search',
                title: 'Search workouts',
                variant: 'primary'
            }
        },

        // ============================================
        // WORKOUT BUILDER PAGE
        // ============================================
        'workout-builder': {
            buttons: [
                {
                    icon: 'bx-comment',
                    label: 'Note',
                    title: 'Add note to workout',
                    action: function() {
                        console.log('📝 Add template note clicked');
                        if (window.handleAddTemplateNote) {
                            window.handleAddTemplateNote();
                        } else {
                            console.warn('⚠️ Template note handler not ready');
                            alert('Note feature is loading. Please try again.');
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
                },
                {
                    icon: 'bx-play',
                    label: 'Go',
                    title: 'Start workout',
                    action: function() {
                        // Get current workout ID - check selectedWorkoutId first (more reliable)
                        const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                                        window.ffn?.workoutBuilder?.currentWorkout?.id;
                        
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
                                        icon: 'bx-plus-circle',
                                        title: 'New Workout',
                                        description: 'Start editing a new workout template',
                                        onClick: () => {
                                            // Clear localStorage to ensure a fresh workout is created
                                            try {
                                                localStorage.removeItem('currentEditingWorkoutId');
                                                console.log('🗑️ Cleared workout ID from localStorage (creating new workout)');
                                            } catch (error) {
                                                console.warn('⚠️ Could not clear localStorage:', error);
                                            }
                                            
                                            // Create new workout using existing function
                                            if (window.createNewWorkoutInEditor) {
                                                window.createNewWorkoutInEditor();
                                            } else {
                                                console.error('❌ createNewWorkoutInEditor function not found');
                                                alert('New workout feature is loading. Please try again in a moment.');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-x',
                                        title: 'Cancel Edit',
                                        description: 'Discard changes and exit',
                                        onClick: () => {
                                            window.location.href = 'workout-database.html';
                                        }
                                    },
                                    {
                                        icon: 'bx-share-alt',
                                        title: 'Share Workout',
                                        description: 'Share publicly or create private link',
                                        onClick: () => {
                                            // Get current workout ID
                                            const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                                                            window.ffn?.workoutBuilder?.currentWorkout?.id;

                                            if (workoutId && window.shareModal) {
                                                window.shareModal.open(workoutId);
                                            } else if (!workoutId) {
                                                alert('Please save the workout first before sharing');
                                            } else {
                                                alert('Share feature is loading. Please try again.');
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
            ],
            fab: {
                icon: 'bx-plus',
                title: 'Add exercise',
                variant: 'primary',
                action: function() {
                    if (window.addExerciseGroup) {
                        window.addExerciseGroup();
                        if (window.markEditorDirty) window.markEditorDirty();
                    }
                }
            }
        },

        // ============================================
        // EXERCISE DATABASE PAGE (NEW 4-BUTTON LAYOUT)
        // ============================================
        'exercise-database': {
            buttons: [
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
                            const btn = document.querySelector('[data-action="btn-0"]');
                            
                            // Add pulse animation
                            if (btn) {
                                btn.classList.add('pulse-animation');
                                setTimeout(() => btn.classList.remove('pulse-animation'), 300);
                            }
                            
                            // Update icon and title
                            window.bottomActionBar.updateButton('btn-0', {
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
                                
                                window.filterBar = new window.FFNFilterBar('offcanvasFilterBarContainer', filterBarConfig);
                                
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
                },
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
                                
                                window.sortBar = new window.FFNFilterBar('offcanvasSortBarContainer', sortBarConfig);
                                
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
            ],
            fab: {
                icon: 'bx-search',
                title: 'Search exercises',
                variant: 'primary',
                action: function() {
                    const searchFab = document.getElementById('searchFab');
                    const searchInput = document.getElementById('searchFabInput');
                    
                    if (!searchFab || !searchInput) {
                        console.error('❌ Search FAB elements not found');
                        return;
                    }
                    
                    // Only open if collapsed - when expanded, do nothing (let clicks pass through)
                    if (!searchFab.classList.contains('expanded')) {
                        // Open search - morph FAB to search box
                        openMorphingSearch(searchFab, searchInput);
                    } else {
                        console.log('🔍 Search already expanded, ignoring click');
                    }
                }
            }
        },

        // ============================================
        // WORKOUT MODE PAGE (NOT STARTED) - NEW 4-BUTTON LAYOUT
        // ============================================
        'workout-mode': {
            buttons: [
                {
                    icon: 'bx-plus-circle',
                    label: 'Add',
                    title: 'Add exercise',
                    action: function() {
                        if (window.workoutModeController?.showAddExerciseForm) {
                            window.workoutModeController.showAddExerciseForm();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-comment',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        if (window.workoutModeController?.handleAddNote) {
                            window.workoutModeController.handleAddNote();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready for notes');
                        }
                    }
                },
                {
                    icon: 'bx-sort',
                    label: 'Reorder',
                    title: 'Reorder exercises',
                    action: function() {
                        if (window.workoutModeController?.showReorderOffcanvas) {
                            window.workoutModeController.showReorderOffcanvas();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        if (window.UnifiedOffcanvasFactory) {
                            // Get current states from localStorage
                            const restTimerEnabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
                            const soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
                            
                            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                                id: 'workoutModeSettingsOffcanvas',
                                title: 'Workout Settings',
                                icon: 'bx-cog',
                                menuItems: [
                                    {
                                        type: 'toggle',
                                        icon: 'bx-time-five',
                                        title: 'Rest Timer',
                                        description: 'Show rest timer between sets',
                                        checked: restTimerEnabled,
                                        storageKey: 'workoutRestTimerEnabled',
                                        onChange: (enabled) => {
                                            console.log('🕐 Rest timer toggled:', enabled);
                                            // Update global rest timer
                                            if (window.globalRestTimer) {
                                                window.globalRestTimer.setEnabled(enabled);
                                            }
                                        }
                                    },
                                    {
                                        type: 'toggle',
                                        icon: soundEnabled ? 'bx-volume-full' : 'bx-volume-mute',
                                        title: 'Sound',
                                        description: 'Play sounds for timer alerts',
                                        checked: soundEnabled,
                                        storageKey: 'workoutSoundEnabled',
                                        onChange: (enabled) => {
                                            console.log('🔊 Sound toggled:', enabled);
                                            // Update controller sound state
                                            if (window.workoutModeController) {
                                                window.workoutModeController.soundEnabled = enabled;
                                            }
                                        }
                                    },
                                    { type: 'divider' },
                                    {
                                        icon: 'bx-share-alt',
                                        title: 'Share Workout',
                                        description: 'Share publicly or create private link',
                                        onClick: () => {
                                            if (window.workoutModeController?.initializeShareButton) {
                                                window.workoutModeController.initializeShareButton();
                                            } else {
                                                console.warn('⚠️ Share feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-edit',
                                        title: 'Edit Workout',
                                        description: 'Modify workout template',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleEditWorkout) {
                                                window.workoutModeController.handleEditWorkout();
                                            } else {
                                                console.warn('⚠️ Edit feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-refresh',
                                        title: 'Change Workout',
                                        description: 'Switch to different workout',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleChangeWorkout) {
                                                window.workoutModeController.handleChangeWorkout();
                                            } else {
                                                console.warn('⚠️ Change workout feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-x-circle',
                                        title: 'Cancel Workout',
                                        description: 'Discard session and exit',
                                        variant: 'danger',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleCancelWorkout) {
                                                window.workoutModeController.handleCancelWorkout();
                                            } else {
                                                console.warn('⚠️ Cancel workout feature not available');
                                            }
                                        }
                                    }
                                ]
                            });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory not loaded');
                            alert('Settings loading. Please try again.');
                        }
                    }
                }
            ],
            // Dual floating buttons: Quick Log + Timed Session
            dualFab: {
                secondary: {
                    icon: 'bx-edit-alt',
                    label: 'Quick Log',
                    title: 'Log a completed workout (no timer)',
                    variant: 'secondary',
                    action: function() {
                        console.log('📝 Quick Log button clicked');
                        if (window.workoutModeController?.handleStartQuickLog) {
                            window.workoutModeController.handleStartQuickLog();
                        } else {
                            console.error('❌ Workout mode controller not available');
                            alert('Workout mode is still loading. Please wait a moment and try again.');
                        }
                    }
                },
                primary: {
                    icon: 'bx-play',
                    label: 'Timed',
                    title: 'Start timed workout session',
                    variant: 'success',
                    action: function() {
                        console.log('▶️ Timed session button clicked');
                        if (window.workoutModeController?.handleStartWorkout) {
                            window.workoutModeController.handleStartWorkout();
                        } else {
                            console.error('❌ Workout mode controller not available');
                            alert('Workout mode is still loading. Please wait a moment and try again.');
                        }
                    }
                }
            }
        },

        // ============================================
        // WORKOUT MODE PAGE (ACTIVE/STARTED - TIMED) - 4-BUTTON LAYOUT
        // ============================================
        'workout-mode-active': {
            buttons: [
                {
                    icon: 'bx-plus-circle',
                    label: 'Add',
                    title: 'Add exercise',
                    action: function() {
                        if (window.workoutModeController?.showAddExerciseForm) {
                            window.workoutModeController.showAddExerciseForm();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-comment',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        if (window.workoutModeController?.handleAddNote) {
                            window.workoutModeController.handleAddNote();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready for notes');
                        }
                    }
                },
                {
                    icon: 'bx-sort',
                    label: 'Reorder',
                    title: 'Reorder exercises',
                    action: function() {
                        if (window.workoutModeController?.showReorderOffcanvas) {
                            window.workoutModeController.showReorderOffcanvas();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        if (window.UnifiedOffcanvasFactory) {
                            // Get current states from localStorage
                            const restTimerEnabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
                            const soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
                            
                            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                                id: 'workoutModeSettingsOffcanvas',
                                title: 'Workout Settings',
                                icon: 'bx-cog',
                                menuItems: [
                                    {
                                        type: 'toggle',
                                        icon: 'bx-time-five',
                                        title: 'Rest Timer',
                                        description: 'Show rest timer between sets',
                                        checked: restTimerEnabled,
                                        storageKey: 'workoutRestTimerEnabled',
                                        onChange: (enabled) => {
                                            console.log('🕐 Rest timer toggled:', enabled);
                                            // Update global rest timer
                                            if (window.globalRestTimer) {
                                                window.globalRestTimer.setEnabled(enabled);
                                            }
                                        }
                                    },
                                    {
                                        type: 'toggle',
                                        icon: soundEnabled ? 'bx-volume-full' : 'bx-volume-mute',
                                        title: 'Sound',
                                        description: 'Play sounds for timer alerts',
                                        checked: soundEnabled,
                                        storageKey: 'workoutSoundEnabled',
                                        onChange: (enabled) => {
                                            console.log('🔊 Sound toggled:', enabled);
                                            // Update controller sound state
                                            if (window.workoutModeController) {
                                                window.workoutModeController.soundEnabled = enabled;
                                            }
                                        }
                                    },
                                    { type: 'divider' },
                                    {
                                        icon: 'bx-share-alt',
                                        title: 'Share Workout',
                                        description: 'Share publicly or create private link',
                                        onClick: () => {
                                            if (window.workoutModeController?.initializeShareButton) {
                                                window.workoutModeController.initializeShareButton();
                                            } else {
                                                console.warn('⚠️ Share feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-edit',
                                        title: 'Edit Workout',
                                        description: 'Modify workout template',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleEditWorkout) {
                                                window.workoutModeController.handleEditWorkout();
                                            } else {
                                                console.warn('⚠️ Edit feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-refresh',
                                        title: 'Change Workout',
                                        description: 'Switch to different workout',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleChangeWorkout) {
                                                window.workoutModeController.handleChangeWorkout();
                                            } else {
                                                console.warn('⚠️ Change workout feature not available');
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-x-circle',
                                        title: 'Cancel Workout',
                                        description: 'Discard session and exit',
                                        variant: 'danger',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleCancelWorkout) {
                                                window.workoutModeController.handleCancelWorkout();
                                            } else {
                                                console.warn('⚠️ Cancel workout feature not available');
                                            }
                                        }
                                    }
                                ]
                            });
                        } else {
                            console.error('❌ UnifiedOffcanvasFactory not loaded');
                            alert('Settings loading. Please try again.');
                        }
                    }
                }
            ],
            // Floating timer + end button combo (replaces FAB for active workout)
            floatingCombo: true,
            // Handle end workout action (debounced to prevent multiple offcanvas instances)
            endWorkoutAction: (() => {
                let debounceTimer = null;
                return function() {
                    console.log('⏹️ End workout button clicked from floating combo');

                    // Debounce: Ignore clicks within 500ms of last click
                    if (debounceTimer) {
                        console.log('🚫 End workout click debounced');
                        return;
                    }

                    // Set debounce timer
                    debounceTimer = setTimeout(() => {
                        debounceTimer = null;
                    }, 500);

                    if (window.workoutModeController && window.workoutModeController.handleCompleteWorkout) {
                        window.workoutModeController.handleCompleteWorkout();
                    } else {
                        console.error('❌ Workout mode controller not available');
                        alert('Unable to end workout. Please try again.');
                    }
                };
            })()
        },

        // ============================================
        // WORKOUT MODE PAGE (ACTIVE/STARTED - QUICK LOG) - 4-BUTTON LAYOUT
        // ============================================
        'workout-mode-quick-log-active': {
            buttons: [
                {
                    icon: 'bx-plus-circle',
                    label: 'Add',
                    title: 'Add exercise',
                    action: function() {
                        if (window.workoutModeController?.showAddExerciseForm) {
                            window.workoutModeController.showAddExerciseForm();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-comment',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        if (window.workoutModeController?.handleAddNote) {
                            window.workoutModeController.handleAddNote();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready for notes');
                        }
                    }
                },
                {
                    icon: 'bx-sort',
                    label: 'Reorder',
                    title: 'Reorder exercises',
                    action: function() {
                        if (window.workoutModeController?.showReorderOffcanvas) {
                            window.workoutModeController.showReorderOffcanvas();
                        } else {
                            console.warn('⚠️ Workout mode controller not ready');
                        }
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        if (window.UnifiedOffcanvasFactory) {
                            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                                id: 'quickLogSettingsOffcanvas',
                                title: 'Quick Log Settings',
                                icon: 'bx-cog',
                                menuItems: [
                                    {
                                        icon: 'bx-edit',
                                        title: 'Edit Workout',
                                        description: 'Modify workout template',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleEditWorkout) {
                                                window.workoutModeController.handleEditWorkout();
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-refresh',
                                        title: 'Change Workout',
                                        description: 'Switch to different workout',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleChangeWorkout) {
                                                window.workoutModeController.handleChangeWorkout();
                                            }
                                        }
                                    },
                                    { type: 'divider' },
                                    {
                                        icon: 'bx-x-circle',
                                        title: 'Cancel Quick Log',
                                        description: 'Discard and exit',
                                        variant: 'danger',
                                        onClick: () => {
                                            if (window.workoutModeController?.handleCancelWorkout) {
                                                window.workoutModeController.handleCancelWorkout();
                                            }
                                        }
                                    }
                                ]
                            });
                        }
                    }
                }
            ],
            // Quick Log badge + save button combo (replaces timer for Quick Log mode)
            quickLogCombo: true,
            // Handle save quick log action (debounced to prevent multiple offcanvas instances)
            saveQuickLogAction: (() => {
                let debounceTimer = null;
                return function() {
                    console.log('💾 Save Quick Log button clicked');

                    // Debounce: Ignore clicks within 500ms of last click
                    if (debounceTimer) {
                        console.log('🚫 Save Quick Log click debounced');
                        return;
                    }

                    // Set debounce timer
                    debounceTimer = setTimeout(() => {
                        debounceTimer = null;
                    }, 500);

                    if (window.workoutModeController?.handleSaveQuickLog) {
                        window.workoutModeController.handleSaveQuickLog();
                    } else {
                        console.error('❌ Workout mode controller not available');
                        alert('Unable to save Quick Log. Please try again.');
                    }
                };
            })(),
            // Handle cancel quick log action
            cancelQuickLogAction: function() {
                console.log('❌ Cancel Quick Log button clicked');
                if (window.workoutModeController?.handleCancelWorkout) {
                    window.workoutModeController.handleCancelWorkout();
                } else {
                    console.error('❌ Workout mode controller not available');
                    alert('Unable to cancel Quick Log. Please try again.');
                }
            }
        },

        // ============================================
        // PROGRAMS PAGE
        // ============================================
        'programs': {
            buttons: [
                {
                    icon: 'bx-filter',
                    label: 'Filter',
                    title: 'Open filters',
                    action: function() {
                        // Open the filters offcanvas
                        const offcanvas = new bootstrap.Offcanvas(
                            document.getElementById('filtersOffcanvas'),
                            { scroll: false }
                        );
                        offcanvas.show();
                    }
                },
                {
                    icon: 'bx-sort',
                    label: 'Sort',
                    title: 'Sort programs',
                    action: function() {
                        // Cycle through sort options using programs-page.js function
                        if (window.cycleProgramSort) {
                            window.cycleProgramSort();
                        } else {
                            console.error('❌ cycleProgramSort not available');
                        }
                    }
                },
                {
                    icon: 'bx-search',
                    label: 'Search',
                    title: 'Search programs',
                    action: function() {
                        const searchFab = document.getElementById('searchFab');
                        const searchInput = document.getElementById('searchFabInput');

                        if (!searchFab || !searchInput) {
                            console.error('❌ Search FAB elements not found');
                            return;
                        }

                        // Only open if collapsed
                        if (!searchFab.classList.contains('expanded')) {
                            openMorphingSearch(searchFab, searchInput);
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
                                        icon: 'bx-trash',
                                        title: 'Delete Programs',
                                        description: 'Toggle delete mode to remove programs',
                                        onClick: () => {
                                            const toggle = document.getElementById('deleteModeToggle');
                                            if (toggle) {
                                                toggle.checked = !toggle.checked;
                                                toggle.dispatchEvent(new Event('change'));
                                            }
                                        }
                                    },
                                    {
                                        icon: 'bx-info-circle',
                                        title: 'Page Information',
                                        description: 'Learn how to use this page',
                                        onClick: () => {
                                            // Show info modal with page explanation
                                            const modalHtml = `
                                                <div class="modal fade" id="programsInfoModal" tabindex="-1" aria-hidden="true">
                                                    <div class="modal-dialog modal-dialog-centered">
                                                        <div class="modal-content">
                                                            <div class="modal-header">
                                                                <h5 class="modal-title">
                                                                    <i class="bx bx-info-circle me-2"></i>
                                                                    Programs
                                                                </h5>
                                                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                            </div>
                                                            <div class="modal-body">
                                                                <h6 class="mb-3">📚 What is this page?</h6>
                                                                <p class="mb-3">This is your program library where you can organize workouts into structured training programs.</p>

                                                                <h6 class="mb-3">🔍 How to use:</h6>
                                                                <ul class="mb-3">
                                                                    <li><strong>Search:</strong> Tap the Search button to find programs by name, description, or tags</li>
                                                                    <li><strong>Filter:</strong> Use the Filter button to filter by difficulty or tags</li>
                                                                    <li><strong>Sort:</strong> Tap Sort to organize by date, name, or workout count</li>
                                                                    <li><strong>Create:</strong> Tap the + button to create a new program</li>
                                                                </ul>

                                                                <h6 class="mb-3">💡 Quick Actions:</h6>
                                                                <ul class="mb-0">
                                                                    <li><strong>View Details:</strong> Tap a program card to see workouts and details</li>
                                                                    <li><strong>Add Workouts:</strong> Use the "Add Workouts" button in the detail view</li>
                                                                    <li><strong>Reorder:</strong> Drag and drop workouts to reorder them</li>
                                                                    <li><strong>Delete Mode:</strong> Use More menu to toggle delete mode</li>
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
                                            const existingModal = document.getElementById('programsInfoModal');
                                            if (existingModal) {
                                                existingModal.remove();
                                            }

                                            // Add modal to body
                                            document.body.insertAdjacentHTML('beforeend', modalHtml);

                                            // Show modal
                                            const modal = new bootstrap.Modal(document.getElementById('programsInfoModal'));
                                            modal.show();

                                            // Clean up after modal is hidden
                                            document.getElementById('programsInfoModal').addEventListener('hidden.bs.modal', function() {
                                                this.remove();
                                            });
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
            ],
            fab: {
                icon: 'bx-plus',
                title: 'Create new program',
                variant: 'primary',
                action: function() {
                    // Open program modal
                    if (window.showProgramModal) {
                        window.showProgramModal();
                    } else {
                        console.error('❌ showProgramModal not available');
                    }
                }
            },
            // Hidden search FAB config (renders the morphing search elements but triggered by button)
            searchFab: {
                icon: 'bx-search',
                title: 'Search programs',
                variant: 'primary'
            }
        },

        // ============================================
        // WORKOUT MODE DEMO PAGE
        // ============================================
        'workout-mode-demo': {
            buttons: [
                {
                    icon: 'bx-plus-circle',
                    label: 'Add Exercise',
                    title: 'Add exercise',
                    action: function() {
                        alert('🏋️ Add Exercise\n\nIn the real app, this would open an offcanvas to add an exercise to your workout.');
                    }
                },
                {
                    icon: 'bx-comment',
                    label: 'Note',
                    title: 'Add workout note',
                    action: function() {
                        alert('📝 Add Note\n\nIn the real app, this would open a dialog to add notes about your workout session.');
                    }
                },
                {
                    icon: 'bx-skip-next',
                    label: 'Skip',
                    title: 'Skip current exercise',
                    action: function() {
                        alert('⏭️ Skip Exercise\n\nIn the real app, this would mark the current exercise as skipped and move to the next one.');
                    }
                },
                {
                    icon: 'bx-dots-vertical-rounded',
                    label: 'More',
                    title: 'More options',
                    action: function() {
                        alert('⚙️ More Options\n\nIn the real app, this would show additional options like:\n• End Workout\n• Workout Settings\n• View History\n• Share Workout');
                    }
                }
            ]
        }
    };

    // Initialize morphing search when bottom action bar is ready
    window.addEventListener('bottomActionBarReady', () => {
        console.log('🎯 Bottom Action Bar ready, initializing morphing search');
        initializeMorphingSearch();
    });

    // Also try to initialize if bottom action bar is already ready
    if (document.getElementById('searchFab')) {
        console.log('🎯 Search FAB already exists, initializing morphing search');
        initializeMorphingSearch();
    }

    console.log('✅ Bottom Action Bar configurations loaded');
})();