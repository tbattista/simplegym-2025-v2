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
                showExercisePreview: false, // Don't show exercise preview for public
                actions: [
                    {
                        id: 'view',
                        label: 'View Details',
                        icon: 'bx-show',
                        variant: 'primary',
                        onClick: (workout) => openWorkoutDetail(workout.id)
                    }
                ]
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
            if (!window.dataManager || !window.dataManager.isAuthenticated()) {
                alert('Please sign in to save workouts');
                return;
            }
            
            // TODO: Implement save workout API call
            // For now, just show a message
            alert('Save workout feature coming soon!');
            
        } catch (error) {
            console.error('❌ Error saving workout:', error);
            alert('Failed to save workout: ' + error.message);
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
            window.ghostGym.publicWorkouts.all = data.workouts;
            window.ghostGym.publicWorkouts.displayed = data.workouts;
            window.ghostGym.publicWorkouts.currentPage = data.page;
            window.ghostGym.publicWorkouts.totalCount = data.total_count;
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