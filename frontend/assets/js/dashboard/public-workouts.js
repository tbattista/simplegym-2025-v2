/**
 * Ghost Gym - Public Workouts Page
 * Browse and save shared workout templates
 * @version 3.0.0 - Refactored to use shared components
 */

(function() {
    'use strict';

    // Shared component instances
    let workoutGrid = null;
    let workoutDetailOffcanvas = null;

    // Page state
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let currentFilters = {
        search: '',
        tags: [],
        sortBy: 'created_at'
    };

    /**
     * Initialize the public workouts page
     */
    window.initPublicWorkoutsPage = async function() {
        console.log('🚀 Initializing Public Workouts Page');

        // Initialize shared components
        initializeComponents();

        // Set up event listeners
        setupEventListeners();

        // Check for direct workout ID in URL (from share link)
        const urlParams = new URLSearchParams(window.location.search);
        const workoutId = urlParams.get('id');

        if (workoutId) {
            // Open workout detail directly
            console.log('📋 Opening workout from URL:', workoutId);
            await openWorkoutDetail(workoutId);
        }

        // Load workouts
        await loadPublicWorkouts();

        console.log('✅ Public Workouts page initialized');
    };

    /**
     * Initialize shared components
     */
    function initializeComponents() {
        console.log('🔧 Initializing shared components...');
        
        // Initialize WorkoutDetailOffcanvas for public workouts
        workoutDetailOffcanvas = new WorkoutDetailOffcanvas({
            showCreator: true,      // Show who created it
            showStats: true,        // Show view/save counts
            showDates: true,        // Show creation date
            actions: [
                {
                    id: 'save',
                    label: 'Save to My Workouts',
                    icon: 'bx-bookmark',
                    variant: 'primary',
                    onClick: (workout) => saveWorkout(workout)
                }
            ]
        });
        
        // Initialize WorkoutGrid for public workouts
        workoutGrid = new WorkoutGrid('publicWorkoutsContainer', {
            emptyMessage: 'No public workouts found',
            emptySubtext: 'Try adjusting your filters or check back later',
            cardConfig: {
                showCreator: true,      // Show creator name
                showStats: true,        // Show view/save counts
                showDates: true,        // Show creation date
                showTags: true,         // Show tags
                showExercisePreview: true, // Show exercise preview
                dropdownActions: ['view', 'save', 'save-and-edit'],  // View, Save, Copy and Edit
                actions: [],            // No action buttons at bottom
                onCardClick: (workout) => openWorkoutDetail(workout.id),  // Click card to view details
                onViewDetails: (workout) => openWorkoutDetail(workout.id),
                onSave: (workout) => saveWorkout(workout),
                onSaveAndEdit: (workout) => saveAndEditWorkout(workout)
            },
            onPageChange: (page) => {
                currentPage = page;
                loadPublicWorkouts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        console.log('✅ Shared components initialized');
    }

    /**
     * Save workout to user's library
     */
    async function saveWorkout(workout) {
        console.log('💾 Saving workout:', workout);
        
        try {
            // Check if user is authenticated
            if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
                if (window.toastNotifications) {
                    window.toastNotifications.warning('Please sign in to save workouts');
                }
                // Optionally show login modal
                const loginModal = document.getElementById('authModal');
                if (loginModal) {
                    const modal = new bootstrap.Modal(loginModal);
                    modal.show();
                }
                return;
            }
            
            // Show loading state on the save button
            const saveButton = document.querySelector('[data-action="save"]');
            const originalHTML = saveButton ? saveButton.innerHTML : null;
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            }
            
            // Get auth token
            const authToken = await window.dataManager.getAuthToken();
            
            // Call API to save workout
            const url = window.config.api.getUrl(`/api/v3/sharing/public-workouts/${workout.id}/save`);
            console.log('📡 Saving workout to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    custom_name: null // Could add UI for custom name later
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to save workout (${response.status})`);
            }
            
            const savedWorkout = await response.json();
            console.log('✅ Workout saved successfully:', savedWorkout);
            
            // Show success toast
            if (window.toastNotifications) {
                window.toastNotifications.success(
                    `"${savedWorkout.name}" has been added to your workouts!`,
                    'Workout Saved'
                );
            }
            
            // Close the detail offcanvas
            if (workoutDetailOffcanvas) {
                workoutDetailOffcanvas.hide();
            }
            
            // Restore button state
            if (saveButton && originalHTML) {
                saveButton.disabled = false;
                saveButton.innerHTML = originalHTML;
            }
            
        } catch (error) {
            console.error('❌ Error saving workout:', error);
            
            // Show error toast
            if (window.toastNotifications) {
                window.toastNotifications.error(
                    error.message || 'Failed to save workout. Please try again.',
                    'Save Failed'
                );
            }
            
            // Restore button state
            const saveButton = document.querySelector('[data-action="save"]');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="bx bx-bookmark me-1"></i>Save to My Workouts';
            }
        }
    }

    /**
     * Save workout to user's library and open in editor
     */
    async function saveAndEditWorkout(workout) {
        console.log('💾 Saving and editing workout:', workout);

        try {
            // Check if user is authenticated
            if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
                if (window.toastNotifications) {
                    window.toastNotifications.warning('Please sign in to save and edit workouts');
                }
                // Show login modal
                const loginModal = document.getElementById('authModal');
                if (loginModal) {
                    const modal = new bootstrap.Modal(loginModal);
                    modal.show();
                }
                return;
            }

            // Get auth token
            const authToken = await window.dataManager.getAuthToken();

            // Call API to save workout
            const url = window.config.api.getUrl(`/api/v3/sharing/public-workouts/${workout.id}/save`);
            console.log('📡 Saving workout to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    custom_name: null
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to save workout (${response.status})`);
            }

            const savedWorkout = await response.json();
            console.log('✅ Workout saved, opening editor:', savedWorkout);

            // Redirect to workout builder with the saved workout ID
            window.location.href = `/workout-builder.html?id=${savedWorkout.id}`;

        } catch (error) {
            console.error('❌ Error saving workout:', error);

            if (window.toastNotifications) {
                window.toastNotifications.error(
                    error.message || 'Failed to save workout. Please try again.',
                    'Save Failed'
                );
            }
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Sort select
        const sortSelect = document.getElementById('sortBySelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                currentFilters.sortBy = sortSelect.value;
                currentPage = 1;
                loadPublicWorkouts();
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                applyFilters();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                clearFilters();
            });
        }

        // Tags input (apply on Enter)
        const tagsInput = document.getElementById('tagsInput');
        if (tagsInput) {
            tagsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyFilters();
                    // Close offcanvas
                    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('filtersOffcanvas'));
                    if (offcanvas) offcanvas.hide();
                }
            });
        }
    }

    /**
     * Load public workouts from API
     */
    async function loadPublicWorkouts() {
        console.log('📡 Loading public workouts...', { page: currentPage, filters: currentFilters });

        // Show loading state via grid component
        if (workoutGrid) {
            workoutGrid.showLoading();
        }

        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: currentPage,
                page_size: pageSize,
                sort_by: currentFilters.sortBy
            });

            // Add tags if present
            if (currentFilters.tags && currentFilters.tags.length > 0) {
                currentFilters.tags.forEach(tag => {
                    params.append('tags', tag);
                });
            }

            // Call API
            const response = await fetch(`/api/v3/sharing/public-workouts?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to load workouts');
            }

            const data = await response.json();
            console.log('✅ Loaded public workouts:', data);

            // Update state
            window.ffn.publicWorkouts.all = data.workouts;
            window.ffn.publicWorkouts.displayed = data.workouts;
            window.ffn.publicWorkouts.currentPage = data.page;
            window.ffn.publicWorkouts.totalCount = data.total_count;
            totalCount = data.total_count;

            // Update UI
            updateStats(data.total_count, data.workouts.length);
            
            // Use WorkoutGrid component to render
            if (workoutGrid) {
                workoutGrid.setData(data.workouts);
            }

        } catch (error) {
            console.error('❌ Error loading public workouts:', error);
            if (workoutGrid) {
                workoutGrid.setData([]); // Show empty state
            }
            alert('Failed to load workouts: ' + error.message);
        }
    }

    /**
     * Open workout detail using shared component
     */
    window.openWorkoutDetail = async function(workoutId) {
        console.log('📋 Opening workout detail:', workoutId);

        try {
            // Fetch workout details from API
            const response = await fetch(`/api/v3/sharing/public-workouts/${workoutId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load workout details');
            }
            
            const workout = await response.json();
            
            // Show using shared component
            if (workoutDetailOffcanvas) {
                workoutDetailOffcanvas.show(workout);
            }
            
        } catch (error) {
            console.error('❌ Error loading workout details:', error);
            alert('Failed to load workout details: ' + error.message);
        }
    };

    /**
     * Apply filters
     */
    function applyFilters() {
        const tagsInput = document.getElementById('tagsInput');
        const sortSelect = document.getElementById('sortBySelect');

        // Parse tags
        if (tagsInput && tagsInput.value.trim()) {
            currentFilters.tags = tagsInput.value
                .split(',')
                .map(t => t.trim())
                .filter(t => t);
        } else {
            currentFilters.tags = [];
        }

        // Update sort
        if (sortSelect) {
            currentFilters.sortBy = sortSelect.value;
        }

        // Reset to page 1 and reload
        currentPage = 1;
        loadPublicWorkouts();
    }

    /**
     * Clear all filters
     */
    function clearFilters() {
        const tagsInput = document.getElementById('tagsInput');
        const sortSelect = document.getElementById('sortBySelect');

        if (tagsInput) tagsInput.value = '';
        if (sortSelect) sortSelect.value = 'created_at';

        currentFilters = {
            search: '',
            tags: [],
            sortBy: 'created_at'
        };

        currentPage = 1;
        loadPublicWorkouts();
    }

    /**
     * Update stats display
     */
    function updateStats(total, showing) {
        const totalCountEl = document.getElementById('totalCount');
        const showingCountEl = document.getElementById('showingCount');

        if (totalCountEl) totalCountEl.textContent = total;
        if (showingCountEl) showingCountEl.textContent = showing;
    }

    console.log('📦 Public Workouts page script loaded (v3.0 - using shared components)');

})();