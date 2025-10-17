/**
 * Exercise Database Page - Ghost Gym V0.4.1
 * Comprehensive exercise browser with favorites, filters, and search
 */

class ExerciseDatabase {
    constructor() {
        this.exercises = [];
        this.favorites = new Set();
        this.customExercises = [];
        this.filteredExercises = [];
        this.displayedExercises = [];
        this.currentPage = 1;
        this.pageSize = 24; // 24 exercises per page (4 rows of 6)
        this.isLoading = false;
        this.currentUser = null;
        
        // Filter state
        this.filters = {
            search: '',
            muscleGroup: '',
            equipment: '',
            difficulty: '',
            sortBy: 'name',
            favoritesOnly: false,
            customOnly: false
        };
        
        this.init();
    }
    
    /**
     * Initialize the exercise database
     */
    async init() {
        console.log('🚀 Initializing Exercise Database...');
        
        // Wait for Firebase to be ready
        if (!window.firebaseReady) {
            await new Promise(resolve => {
                window.addEventListener('firebaseReady', resolve, { once: true });
            });
        }
        
        // Check authentication status
        this.setupAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load exercises
        await this.loadExercises();
        
        // Load filter options
        await this.loadFilterOptions();
        
        console.log('✅ Exercise Database initialized');
    }
    
    /**
     * Set up Firebase authentication
     */
    setupAuth() {
        const { onAuthStateChanged } = window.firebaseAuthFunctions;
        const auth = window.firebaseAuth;
        
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            
            if (user) {
                console.log('✅ User authenticated:', user.email);
                // Load user favorites
                await this.loadFavorites();
                // Load custom exercises
                await this.loadCustomExercises();
            } else {
                console.log('ℹ️ User not authenticated');
                this.favorites.clear();
                this.customExercises = [];
            }
            
            // Re-render with updated favorite status
            this.applyFilters();
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.trim();
                    this.applyFilters();
                }, 300);
            });
        }
        
        // Sort
        const sortSelect = document.getElementById('sortBySelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.applyFilters();
            });
        }
        
        // Filters
        const muscleGroupFilter = document.getElementById('muscleGroupFilter');
        if (muscleGroupFilter) {
            muscleGroupFilter.addEventListener('change', (e) => {
                this.filters.muscleGroup = e.target.value;
                this.applyFilters();
            });
        }
        
        const equipmentFilter = document.getElementById('equipmentFilter');
        if (equipmentFilter) {
            equipmentFilter.addEventListener('change', (e) => {
                this.filters.equipment = e.target.value;
                this.applyFilters();
            });
        }
        
        const difficultyFilter = document.getElementById('difficultyFilter');
        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', (e) => {
                this.filters.difficulty = e.target.value;
                this.applyFilters();
            });
        }
        
        // Show options
        const showFavoritesOnly = document.getElementById('showFavoritesOnly');
        if (showFavoritesOnly) {
            showFavoritesOnly.addEventListener('change', (e) => {
                this.filters.favoritesOnly = e.target.checked;
                this.applyFilters();
            });
        }
        
        const showCustomOnly = document.getElementById('showCustomOnly');
        if (showCustomOnly) {
            showCustomOnly.addEventListener('change', (e) => {
                this.filters.customOnly = e.target.checked;
                this.applyFilters();
            });
        }
        
        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Refresh exercises
        const refreshBtn = document.getElementById('refreshExercisesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshExercises());
        }
        
        // Add custom exercise
        const addCustomBtn = document.getElementById('addCustomExerciseBtn');
        if (addCustomBtn) {
            addCustomBtn.addEventListener('click', () => this.showAddCustomExerciseModal());
        }
        
        // Load more
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMore());
        }
    }
    
    /**
     * Load all exercises from API
     */
    async loadExercises() {
        this.showLoading(true);
        
        try {
            // Check cache first
            const cached = this.getCache();
            if (cached && this.isCacheValid(cached)) {
                this.exercises = cached.exercises;
                console.log(`✅ Loaded ${this.exercises.length} exercises from cache`);
                this.applyFilters();
                return;
            }
            
            // Load from API
            console.log('📡 Loading exercises from API...');
            const PAGE_SIZE = 500;
            let allExercises = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load exercises (page ${page})`);
                }
                
                const data = await response.json();
                const exercises = data.exercises || [];
                
                allExercises = [...allExercises, ...exercises];
                console.log(`📦 Loaded page ${page}: ${exercises.length} exercises (total: ${allExercises.length})`);
                
                hasMore = exercises.length === PAGE_SIZE;
                page++;
            }
            
            this.exercises = allExercises;
            
            // Cache the results
            this.setCache(this.exercises);
            
            // Update total count
            document.getElementById('totalExercisesCount').textContent = this.exercises.length;
            
            console.log(`✅ Loaded ${this.exercises.length} exercises from API`);
            
            // Apply filters and render
            this.applyFilters();
            
        } catch (error) {
            console.error('❌ Error loading exercises:', error);
            this.showError('Failed to load exercises. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Load user's favorite exercises
     */
    async loadFavorites() {
        if (!this.currentUser) {
            this.favorites.clear();
            return;
        }
        
        try {
            const token = await this.currentUser.getIdToken();
            const response = await fetch('/api/v3/users/me/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.favorites = new Set(data.favorites.map(f => f.exerciseId));
                console.log(`✅ Loaded ${this.favorites.size} favorites`);
                
                // Update stats
                document.getElementById('favoritesCount').textContent = this.favorites.size;
            }
        } catch (error) {
            console.warn('⚠️ Could not load favorites:', error.message);
        }
    }
    
    /**
     * Load user's custom exercises
     */
    async loadCustomExercises() {
        if (!this.currentUser) {
            this.customExercises = [];
            return;
        }
        
        try {
            const token = await this.currentUser.getIdToken();
            const response = await fetch('/api/v3/users/me/exercises', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.customExercises = data.exercises || [];
                console.log(`✅ Loaded ${this.customExercises.length} custom exercises`);
                
                // Update stats
                document.getElementById('customCount').textContent = this.customExercises.length;
            }
        } catch (error) {
            console.warn('⚠️ Could not load custom exercises:', error.message);
        }
    }
    
    /**
     * Load filter options dynamically
     */
    async loadFilterOptions() {
        try {
            // Get unique muscle groups
            const muscleGroups = [...new Set(this.exercises
                .map(e => e.targetMuscleGroup)
                .filter(m => m))]
                .sort();
            
            const muscleGroupSelect = document.getElementById('muscleGroupFilter');
            muscleGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                muscleGroupSelect.appendChild(option);
            });
            
            // Get unique equipment
            const equipment = [...new Set(this.exercises
                .map(e => e.primaryEquipment)
                .filter(e => e))]
                .sort();
            
            const equipmentSelect = document.getElementById('equipmentFilter');
            equipment.forEach(equip => {
                const option = document.createElement('option');
                option.value = equip;
                option.textContent = equip;
                equipmentSelect.appendChild(option);
            });
            
            console.log('✅ Filter options loaded');
            
        } catch (error) {
            console.error('❌ Error loading filter options:', error);
        }
    }
    
    /**
     * Apply filters and sort
     */
    applyFilters() {
        // Combine global and custom exercises
        let allExercises = [...this.exercises, ...this.customExercises];
        
        // Apply search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            allExercises = allExercises.filter(exercise => {
                return exercise.name.toLowerCase().includes(searchLower) ||
                       (exercise.targetMuscleGroup && exercise.targetMuscleGroup.toLowerCase().includes(searchLower)) ||
                       (exercise.primaryEquipment && exercise.primaryEquipment.toLowerCase().includes(searchLower));
            });
        }
        
        // Apply muscle group filter
        if (this.filters.muscleGroup) {
            allExercises = allExercises.filter(e => e.targetMuscleGroup === this.filters.muscleGroup);
        }
        
        // Apply equipment filter
        if (this.filters.equipment) {
            allExercises = allExercises.filter(e => e.primaryEquipment === this.filters.equipment);
        }
        
        // Apply difficulty filter
        if (this.filters.difficulty) {
            allExercises = allExercises.filter(e => e.difficultyLevel === this.filters.difficulty);
        }
        
        // Apply favorites only filter
        if (this.filters.favoritesOnly) {
            allExercises = allExercises.filter(e => this.favorites.has(e.id));
        }
        
        // Apply custom only filter
        if (this.filters.customOnly) {
            allExercises = allExercises.filter(e => !e.isGlobal);
        }
        
        // Apply sorting
        allExercises = this.sortExercises(allExercises);
        
        this.filteredExercises = allExercises;
        this.currentPage = 1;
        
        // Update stats
        document.getElementById('showingCount').textContent = this.filteredExercises.length;
        
        // Render first page
        this.renderExercises();
    }
    
    /**
     * Sort exercises based on current sort option
     */
    sortExercises(exercises) {
        const sorted = [...exercises];
        
        switch (this.filters.sortBy) {
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            
            case 'popularity':
                sorted.sort((a, b) => {
                    const scoreA = a.popularityScore || 50;
                    const scoreB = b.popularityScore || 50;
                    return scoreB - scoreA; // Descending
                });
                break;
            
            case 'favorites':
                sorted.sort((a, b) => {
                    const aFav = this.favorites.has(a.id) ? 1 : 0;
                    const bFav = this.favorites.has(b.id) ? 1 : 0;
                    if (aFav !== bFav) return bFav - aFav;
                    return a.name.localeCompare(b.name);
                });
                break;
        }
        
        return sorted;
    }
    
    /**
     * Render exercises to the grid
     */
    renderExercises() {
        const grid = document.getElementById('exerciseGrid');
        const emptyState = document.getElementById('emptyState');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        
        // Calculate which exercises to display
        const startIndex = 0;
        const endIndex = this.currentPage * this.pageSize;
        this.displayedExercises = this.filteredExercises.slice(startIndex, endIndex);
        
        // Show/hide empty state
        if (this.filteredExercises.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            loadMoreContainer.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        grid.style.display = 'flex';
        
        // Clear grid
        grid.innerHTML = '';
        
        // Render exercise cards
        this.displayedExercises.forEach(exercise => {
            const card = this.createExerciseCard(exercise);
            grid.appendChild(card);
        });
        
        // Show/hide load more button
        if (this.displayedExercises.length < this.filteredExercises.length) {
            loadMoreContainer.style.display = 'block';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
    
    /**
     * Create an exercise card element
     */
    createExerciseCard(exercise) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const isFavorited = this.favorites.has(exercise.id);
        const isCustom = !exercise.isGlobal;
        const popularityScore = exercise.popularityScore || 50;
        
        // Determine popularity badge
        let popularityBadge = '';
        if (popularityScore >= 90) {
            popularityBadge = '<span class="badge bg-warning"><i class="bx bxs-star"></i> Essential</span>';
        } else if (popularityScore >= 70) {
            popularityBadge = '<span class="badge bg-info"><i class="bx bx-star"></i> Popular</span>';
        }
        
        col.innerHTML = `
            <div class="card exercise-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                ${isCustom ? '<i class="bx bx-user text-primary me-1"></i>' : ''}
                                ${this.escapeHtml(exercise.name)}
                            </h6>
                        </div>
                        <button class="btn btn-sm btn-icon favorite-btn ${isFavorited ? 'favorited' : ''}" 
                                data-exercise-id="${exercise.id}"
                                title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="bx ${isFavorited ? 'bxs-heart' : 'bx-heart'}"></i>
                        </button>
                    </div>
                    
                    <div class="exercise-meta mb-3">
                        ${exercise.targetMuscleGroup ? `<span class="badge bg-label-primary">${this.escapeHtml(exercise.targetMuscleGroup)}</span>` : ''}
                        ${exercise.primaryEquipment ? `<span class="badge bg-label-secondary">${this.escapeHtml(exercise.primaryEquipment)}</span>` : ''}
                        ${exercise.difficultyLevel ? `<span class="badge bg-label-info">${this.escapeHtml(exercise.difficultyLevel)}</span>` : ''}
                        ${popularityBadge}
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-grow-1 view-details-btn" 
                                data-exercise-id="${exercise.id}">
                            <i class="bx bx-info-circle me-1"></i>
                            Details
                        </button>
                        <button class="btn btn-sm btn-primary add-to-workout-btn" 
                                data-exercise-id="${exercise.id}"
                                data-exercise-name="${this.escapeHtml(exercise.name)}">
                            <i class="bx bx-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const favoriteBtn = col.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', () => this.toggleFavorite(exercise.id));
        
        const viewDetailsBtn = col.querySelector('.view-details-btn');
        viewDetailsBtn.addEventListener('click', () => this.showExerciseDetails(exercise.id));
        
        const addToWorkoutBtn = col.querySelector('.add-to-workout-btn');
        addToWorkoutBtn.addEventListener('click', () => this.addToWorkout(exercise));
        
        return col;
    }
    
    /**
     * Toggle favorite status
     */
    async toggleFavorite(exerciseId) {
        if (!this.currentUser) {
            alert('Please sign in to favorite exercises');
            return;
        }
        
        const isFavorited = this.favorites.has(exerciseId);
        
        try {
            const token = await this.currentUser.getIdToken();
            
            if (isFavorited) {
                // Remove favorite
                const response = await fetch(`/api/v3/users/me/favorites/${exerciseId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    this.favorites.delete(exerciseId);
                    console.log('✅ Removed from favorites');
                }
            } else {
                // Add favorite
                const response = await fetch('/api/v3/users/me/favorites', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ exerciseId })
                });
                
                if (response.ok) {
                    this.favorites.add(exerciseId);
                    console.log('✅ Added to favorites');
                }
            }
            
            // Update stats
            document.getElementById('favoritesCount').textContent = this.favorites.size;
            
            // Re-render to update UI
            this.renderExercises();
            
        } catch (error) {
            console.error('❌ Error toggling favorite:', error);
            alert('Failed to update favorite. Please try again.');
        }
    }
    
    /**
     * Show exercise details modal
     */
    showExerciseDetails(exerciseId) {
        const exercise = [...this.exercises, ...this.customExercises]
            .find(e => e.id === exerciseId);
        
        if (!exercise) return;
        
        const modal = new bootstrap.Modal(document.getElementById('exerciseDetailModal'));
        document.getElementById('exerciseDetailTitle').textContent = exercise.name;
        
        const detailsHtml = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <strong>Muscle Group:</strong><br>
                    ${exercise.targetMuscleGroup || 'N/A'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Equipment:</strong><br>
                    ${exercise.primaryEquipment || 'N/A'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Difficulty:</strong><br>
                    ${exercise.difficultyLevel || 'N/A'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Mechanics:</strong><br>
                    ${exercise.mechanics || 'N/A'}
                </div>
                ${exercise.popularityScore ? `
                <div class="col-md-6 mb-3">
                    <strong>Popularity Score:</strong><br>
                    ${exercise.popularityScore}/100
                </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('exerciseDetailBody').innerHTML = detailsHtml;
        modal.show();
    }
    
    /**
     * Add exercise to workout (placeholder)
     */
    addToWorkout(exercise) {
        alert(`Adding "${exercise.name}" to workout - This feature will be integrated with the workout builder!`);
    }
    
    /**
     * Load more exercises
     */
    loadMore() {
        this.currentPage++;
        this.renderExercises();
        
        // Scroll to new content
        window.scrollTo({
            top: document.getElementById('exerciseGrid').offsetTop,
            behavior: 'smooth'
        });
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            search: '',
            muscleGroup: '',
            equipment: '',
            difficulty: '',
            sortBy: 'name',
            favoritesOnly: false,
            customOnly: false
        };
        
        // Reset UI
        document.getElementById('globalSearch').value = '';
        document.getElementById('sortBySelect').value = 'name';
        document.getElementById('muscleGroupFilter').value = '';
        document.getElementById('equipmentFilter').value = '';
        document.getElementById('difficultyFilter').value = '';
        document.getElementById('showFavoritesOnly').checked = false;
        document.getElementById('showCustomOnly').checked = false;
        
        this.applyFilters();
    }
    
    /**
     * Refresh exercises from API
     */
    async refreshExercises() {
        localStorage.removeItem('exercise_cache');
        await this.loadExercises();
        await this.loadFavorites();
        await this.loadCustomExercises();
    }
    
    /**
     * Show add custom exercise modal (placeholder)
     */
    showAddCustomExerciseModal() {
        alert('Add Custom Exercise feature coming soon!');
    }
    
    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const exerciseGrid = document.getElementById('exerciseGrid');
        
        if (show) {
            loadingState.style.display = 'block';
            exerciseGrid.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        alert(message); // TODO: Replace with better error UI
    }
    
    /**
     * Cache management
     */
    getCache() {
        try {
            const cached = localStorage.getItem('exercise_cache');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }
    
    setCache(exercises) {
        try {
            const cacheData = {
                exercises: exercises,
                timestamp: Date.now(),
                version: '1.1'
            };
            localStorage.setItem('exercise_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }
    
    isCacheValid(cached) {
        if (cached.version !== '1.1') return false;
        const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        return (Date.now() - cached.timestamp) < CACHE_DURATION;
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.exerciseDatabase = new ExerciseDatabase();
});

console.log('📦 Exercise Database script loaded');