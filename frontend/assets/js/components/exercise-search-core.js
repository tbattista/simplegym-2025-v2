/**
 * Ghost Gym - Exercise Search Core
 * Reusable exercise search, filter, and pagination logic
 * Can be used by any component that needs exercise search functionality
 * @version 1.0.0
 * @date 2025-12-09
 */

class ExerciseSearchCore {
    constructor(config = {}) {
        this.config = {
            pageSize: config.pageSize || (window.innerWidth <= 768 ? 20 : 30),
            showFavorites: config.showFavorites !== false,
            ...config
        };
        
        this.state = {
            searchQuery: '',
            muscleGroup: '',
            difficulty: '',
            equipment: [],
            favoritesOnly: false,
            sortBy: 'name',
            sortOrder: 'asc',
            allExercises: [],
            filteredExercises: [],
            paginatedExercises: [],
            currentPage: 1,
            pageSize: this.config.pageSize,
            isLoading: false
        };
        
        this.listeners = new Set();
    }
    
    /**
     * Load exercises from cache service
     */
    async loadExercises() {
        this.state.isLoading = true;
        this.notifyListeners('loadingStart');
        
        try {
            if (window.exerciseCacheService) {
                await window.exerciseCacheService.loadExercises();
                this.state.allExercises = window.exerciseCacheService.getAllExercises();
                console.log(`✅ ExerciseSearchCore: Loaded ${this.state.allExercises.length} exercises`);
            } else {
                console.warn('⚠️ exerciseCacheService not available');
                this.state.allExercises = [];
            }
            
            // Load user favorites if enabled
            if (this.config.showFavorites) {
                await this.loadUserFavorites();
            }
            
        } catch (error) {
            console.error('❌ Error loading exercises:', error);
            this.state.allExercises = [];
        }
        
        this.state.isLoading = false;
        this.notifyListeners('loadingEnd');
        
        // Initial filter
        this.filterExercises();
        
        return this.state.allExercises;
    }
    
    /**
     * Load user favorites from API
     */
    async loadUserFavorites() {
        if (!window.ghostGym) window.ghostGym = {};
        if (!window.ghostGym.exercises) window.ghostGym.exercises = {};
        if (!window.ghostGym.exercises.favorites) {
            window.ghostGym.exercises.favorites = new Set();
        }
        
        if (!window.firebaseAuth?.currentUser) {
            console.log('ℹ️ User not authenticated, skipping favorites load');
            return;
        }
        
        try {
            const token = await window.firebaseAuth.currentUser.getIdToken();
            const response = await fetch(window.getApiUrl('/api/v3/users/me/favorites'), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                window.ghostGym.exercises.favorites = new Set(data.favorites.map(f => f.exerciseId));
                console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites`);
            }
        } catch (error) {
            console.error('❌ Error loading favorites:', error);
        }
    }
    
    /**
     * Filter exercises based on current state
     */
    filterExercises() {
        let filtered = [...this.state.allExercises];
        
        // Search query
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(ex =>
                (ex.name || '').toLowerCase().includes(query) ||
                (ex.targetMuscleGroup || '').toLowerCase().includes(query) ||
                (ex.primaryEquipment || '').toLowerCase().includes(query)
            );
        }
        
        // Muscle group filter
        if (this.state.muscleGroup) {
            filtered = filtered.filter(ex => ex.targetMuscleGroup === this.state.muscleGroup);
        }
        
        // Difficulty filter
        if (this.state.difficulty) {
            filtered = filtered.filter(ex =>
                (ex.difficulty || '').toLowerCase() === this.state.difficulty.toLowerCase()
            );
        }
        
        // Equipment filter (multi-select)
        if (this.state.equipment.length > 0) {
            filtered = filtered.filter(ex => {
                const exEquip = (ex.primaryEquipment || '').toLowerCase();
                return this.state.equipment.some(eq => exEquip.includes(eq.toLowerCase()));
            });
        }
        
        // Favorites filter
        if (this.state.favoritesOnly) {
            if (window.ghostGym?.exercises?.favorites) {
                filtered = filtered.filter(ex => window.ghostGym.exercises.favorites.has(ex.id));
            } else {
                filtered = [];
            }
        }
        
        this.state.filteredExercises = filtered;
        this.applySorting();
        this.state.currentPage = 1; // Reset to first page
        this.applyPagination();
        
        this.notifyListeners('filtered', { count: filtered.length });
    }
    
    /**
     * Apply sorting to filtered exercises
     */
    applySorting() {
        switch (this.state.sortBy) {
            case 'name':
                this.state.filteredExercises.sort((a, b) => {
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return this.state.sortOrder === 'asc'
                        ? nameA.localeCompare(nameB)
                        : nameB.localeCompare(nameA);
                });
                break;
                
            case 'muscle':
                this.state.filteredExercises.sort((a, b) => {
                    const muscleA = (a.targetMuscleGroup || '').toLowerCase();
                    const muscleB = (b.targetMuscleGroup || '').toLowerCase();
                    if (muscleA === muscleB) {
                        return (a.name || '').localeCompare(b.name || '');
                    }
                    return muscleA.localeCompare(muscleB);
                });
                break;
                
            case 'tier':
                this.state.filteredExercises.sort((a, b) => {
                    const tierA = parseInt(a.exerciseTier || '1');
                    const tierB = parseInt(b.exerciseTier || '1');
                    if (tierA === tierB) {
                        return (a.name || '').localeCompare(b.name || '');
                    }
                    return tierA - tierB;
                });
                break;
        }
    }
    
    /**
     * Apply pagination to filtered exercises
     */
    applyPagination() {
        const totalPages = Math.ceil(this.state.filteredExercises.length / this.state.pageSize);
        const startIdx = (this.state.currentPage - 1) * this.state.pageSize;
        const endIdx = startIdx + this.state.pageSize;
        
        this.state.paginatedExercises = this.state.filteredExercises.slice(startIdx, endIdx);
        
        this.notifyListeners('paginated', {
            currentPage: this.state.currentPage,
            totalPages,
            startIdx: startIdx + 1,
            endIdx: Math.min(endIdx, this.state.filteredExercises.length),
            total: this.state.filteredExercises.length
        });
    }
    
    /**
     * Get unique muscle groups from all exercises
     */
    getUniqueMuscleGroups() {
        return [...new Set(
            this.state.allExercises
                .map(ex => ex.targetMuscleGroup)
                .filter(mg => mg && mg.trim() !== '')
        )].sort();
    }
    
    /**
     * Get unique equipment from all exercises
     */
    getUniqueEquipment() {
        return [...new Set(
            this.state.allExercises
                .map(ex => ex.primaryEquipment)
                .filter(eq => eq && eq.toLowerCase() !== 'none')
        )].sort();
    }
    
    /**
     * Update search query
     */
    setSearchQuery(query) {
        this.state.searchQuery = query;
        this.filterExercises();
    }
    
    /**
     * Update muscle group filter
     */
    setMuscleGroup(muscleGroup) {
        this.state.muscleGroup = muscleGroup;
        this.filterExercises();
    }
    
    /**
     * Update difficulty filter
     */
    setDifficulty(difficulty) {
        this.state.difficulty = difficulty;
        this.filterExercises();
    }
    
    /**
     * Update equipment filter
     */
    setEquipment(equipment) {
        this.state.equipment = Array.isArray(equipment) ? equipment : [equipment];
        this.filterExercises();
    }
    
    /**
     * Update favorites filter
     */
    setFavoritesOnly(favoritesOnly) {
        this.state.favoritesOnly = favoritesOnly;
        this.filterExercises();
    }
    
    /**
     * Update sort settings
     */
    setSort(sortBy, sortOrder = 'asc') {
        this.state.sortBy = sortBy;
        this.state.sortOrder = sortOrder;
        this.applySorting();
        this.applyPagination();
    }
    
    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.state.filteredExercises.length / this.state.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.state.currentPage = page;
            this.applyPagination();
        }
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.state.searchQuery = '';
        this.state.muscleGroup = '';
        this.state.difficulty = '';
        this.state.equipment = [];
        this.state.favoritesOnly = false;
        this.filterExercises();
        this.notifyListeners('filtersCleared');
    }
    
    /**
     * Add event listener
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners
     */
    notifyListeners(event, data = {}) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in ExerciseSearchCore listener:', error);
            }
        });
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
}

// Export globally
window.ExerciseSearchCore = ExerciseSearchCore;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseSearchCore;
}

console.log('📦 ExerciseSearchCore component loaded');