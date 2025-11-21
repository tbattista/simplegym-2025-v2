/**
 * Ghost Gym - Public Workouts Page
 * Browse and save shared workout templates
 * @version 1.0.0
 */

(function() {
    'use strict';

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

        // Set up event listeners
        setupEventListeners();

        // Check for direct workout ID in URL (from share link)
        const urlParams = new URLSearchParams(window.location.search);
        const workoutId = urlParams.get('id');

        if (workoutId) {
            // Open workout detail modal directly
            console.log('📋 Opening workout from URL:', workoutId);
            await openWorkoutDetail(workoutId);
        }

        // Load workouts
        await loadPublicWorkouts();

        console.log('✅ Public Workouts page initialized');
    };

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

        showLoadingState();

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
            renderWorkouts(data.workouts);
            renderPagination(data.page, data.page_size, data.total_count);

            // Show appropriate state
            if (data.workouts.length === 0) {
                showEmptyState();
            } else {
                showWorkoutsGrid();
            }

        } catch (error) {
            console.error('❌ Error loading public workouts:', error);
            showEmptyState();
            alert('Failed to load workouts: ' + error.message);
        }
    }

    /**
     * Render workout cards
     */
    function renderWorkouts(workouts) {
        const grid = document.getElementById('workoutsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        workouts.forEach(workout => {
            const card = createWorkoutCard(workout);
            grid.appendChild(card);
        });
    }

    /**
     * Create a workout card element
     */
    function createWorkoutCard(workout) {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';

        const workoutData = workout.workout_data || {};
        const exerciseCount = (workoutData.exercise_groups || []).length;
        const bonusCount = (workoutData.bonus_exercises || []).length;
        const tags = workoutData.tags || [];
        const creatorName = workout.creator_name || 'Anonymous';
        const viewCount = workout.stats?.view_count || 0;
        const saveCount = workout.stats?.save_count || 0;

        col.innerHTML = `
            <div class="card h-100 cursor-pointer workout-card" data-workout-id="${workout.id}">
                <div class="card-body">
                    <h5 class="card-title mb-2">${escapeHtml(workoutData.name || 'Untitled Workout')}</h5>
                    
                    <!-- Creator -->
                    <p class="text-muted small mb-2">
                        <i class="bx bx-user me-1"></i>
                        ${escapeHtml(creatorName)}
                    </p>

                    <!-- Description -->
                    ${workoutData.description ? `
                        <p class="card-text text-muted small mb-3">${escapeHtml(workoutData.description).substring(0, 100)}${workoutData.description.length > 100 ? '...' : ''}</p>
                    ` : ''}

                    <!-- Tags -->
                    ${tags.length > 0 ? `
                        <div class="mb-3">
                            ${tags.slice(0, 3).map(tag => `
                                <span class="badge bg-label-primary me-1">${escapeHtml(tag)}</span>
                            `).join('')}
                            ${tags.length > 3 ? `<span class="badge bg-label-secondary">+${tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}

                    <!-- Stats -->
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <small class="text-muted">
                            <i class="bx bx-dumbbell me-1"></i>
                            ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}
                            ${bonusCount > 0 ? ` + ${bonusCount} bonus` : ''}
                        </small>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex gap-3">
                            <small class="text-muted">
                                <i class="bx bx-show me-1"></i>
                                ${viewCount}
                            </small>
                            <small class="text-muted">
                                <i class="bx bx-bookmark me-1"></i>
                                ${saveCount}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="openWorkoutDetail('${workout.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add click handler to card (except button)
        const card = col.querySelector('.workout-card');
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openWorkoutDetail(workout.id);
            }
        });

        return col;
    }

    /**
     * Open workout detail modal
     */
    window.openWorkoutDetail = async function(workoutId) {
        console.log('📋 Opening workout detail:', workoutId);

        if (window.workoutDetailModal) {
            await window.workoutDetailModal.open(workoutId);
        } else {
            console.error('❌ Workout detail modal not available');
            alert('Workout detail modal is loading. Please try again in a moment.');
        }
    };

    /**
     * Render pagination
     */
    function renderPagination(page, pageSize, totalCount) {
        const container = document.getElementById('paginationContainer');
        const list = document.getElementById('paginationList');
        
        if (!container || !list) return;

        const totalPages = Math.ceil(totalCount / pageSize);

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = '';

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" aria-label="Previous">
                <i class="bx bx-chevron-left"></i>
            </a>
        `;
        if (page > 1) {
            prevLi.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(page - 1);
            });
        }
        list.appendChild(prevLi);

        // Page numbers (show max 5 pages)
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === page ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            
            if (i !== page) {
                pageLi.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    goToPage(i);
                });
            }
            
            list.appendChild(pageLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" aria-label="Next">
                <i class="bx bx-chevron-right"></i>
            </a>
        `;
        if (page < totalPages) {
            nextLi.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(page + 1);
            });
        }
        list.appendChild(nextLi);
    }

    /**
     * Go to specific page
     */
    function goToPage(page) {
        currentPage = page;
        loadPublicWorkouts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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

    /**
     * Show loading state
     */
    function showLoadingState() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('workoutsGrid').style.display = 'none';
        document.getElementById('paginationContainer').style.display = 'none';
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('workoutsGrid').style.display = 'none';
        document.getElementById('paginationContainer').style.display = 'none';
    }

    /**
     * Show workouts grid
     */
    function showWorkoutsGrid() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('workoutsGrid').style.display = 'flex';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    console.log('📦 Public Workouts page script loaded');

})();