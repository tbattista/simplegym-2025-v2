/**
 * Ghost Gym - Workout List Component
 * Reusable component for displaying workout lists with search and filtering
 * @version 1.0.0
 * @date 2025-11-09
 */

class WorkoutListComponent {
    constructor(options = {}) {
        // Configuration
        this.containerId = options.containerId || 'workoutListContainer';
        this.searchInputId = options.searchInputId || null;
        this.clearSearchBtnId = options.clearSearchBtnId || null;
        this.onWorkoutSelect = options.onWorkoutSelect || null;
        this.showActions = options.showActions || ['view', 'edit', 'start'];
        this.pageSize = options.pageSize || 50;
        this.enableSearch = options.enableSearch !== false;
        this.enablePagination = options.enablePagination !== false;
        this.cardLayout = options.cardLayout || 'grid'; // 'grid' or 'list'
        this.emptyMessage = options.emptyMessage || 'No workouts found';
        
        // State
        this.workouts = [];
        this.filtered = [];
        this.currentPage = 1;
        this.filters = {
            search: '',
            tags: [],
            sortBy: 'modified_date'
        };
        
        // Search debounce timer
        this.searchTimeout = null;
        
        console.log('📦 Workout List Component initialized');
    }
    
    /**
     * Initialize component
     */
    async initialize() {
        try {
            await this.loadWorkouts();
            this.setupEventListeners();
            this.render();
            console.log('✅ Workout List Component ready');
        } catch (error) {
            console.error('❌ Failed to initialize workout list:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * Load workouts from data manager
     */
    async loadWorkouts() {
        try {
            console.log('📡 Loading workouts...');
            
            if (!window.dataManager || !window.dataManager.getWorkouts) {
                throw new Error('Data manager not available');
            }
            
            this.workouts = await window.dataManager.getWorkouts();
            this.filtered = [...this.workouts];
            
            console.log(`✅ Loaded ${this.workouts.length} workouts`);
            
        } catch (error) {
            console.error('❌ Failed to load workouts:', error);
            throw error;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        if (this.searchInputId && this.enableSearch) {
            const searchInput = document.getElementById(this.searchInputId);
            const clearBtn = this.clearSearchBtnId ? document.getElementById(this.clearSearchBtnId) : null;
            
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    // Show/hide clear button
                    if (clearBtn) {
                        clearBtn.style.display = e.target.value.trim() ? 'block' : 'none';
                    }
                    
                    // Debounce search
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value.toLowerCase();
                        this.applyFilters();
                    }, 300);
                });
            }
            
            // Clear search button
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (searchInput) {
                        searchInput.value = '';
                        clearBtn.style.display = 'none';
                        searchInput.focus();
                    }
                    this.filters.search = '';
                    this.applyFilters();
                });
            }
        }
    }
    
    /**
     * Apply filters and re-render
     */
    applyFilters() {
        let filtered = [...this.workouts];
        
        // Apply search filter
        if (this.filters.search) {
            filtered = filtered.filter(workout => {
                return workout.name.toLowerCase().includes(this.filters.search) ||
                       (workout.description || '').toLowerCase().includes(this.filters.search) ||
                       (workout.tags || []).some(tag => tag.toLowerCase().includes(this.filters.search));
            });
        }
        
        // Apply tag filter
        if (this.filters.tags.length > 0) {
            filtered = filtered.filter(workout => {
                return this.filters.tags.some(tag => (workout.tags || []).includes(tag));
            });
        }
        
        // Sort workouts
        filtered = this.sortWorkouts(filtered, this.filters.sortBy);
        
        this.filtered = filtered;
        this.currentPage = 1;
        this.render();
    }
    
    /**
     * Sort workouts
     */
    sortWorkouts(workouts, sortBy) {
        const sorted = [...workouts];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'created_date':
                sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                break;
            case 'modified_date':
                sorted.sort((a, b) => new Date(b.modified_date) - new Date(a.modified_date));
                break;
            case 'exercise_count':
                sorted.sort((a, b) => this.getTotalExerciseCount(b) - this.getTotalExerciseCount(a));
                break;
        }
        
        return sorted;
    }
    
    /**
     * Render component
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('❌ Container not found:', this.containerId);
            return;
        }
        
        // Show empty state if no workouts
        if (this.filtered.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageWorkouts = this.filtered.slice(startIndex, endIndex);
        
        // Render cards
        const cardsHTML = pageWorkouts.map(workout => this.renderWorkoutCard(workout)).join('');
        
        // Render pagination
        const paginationHTML = this.enablePagination ? this.renderPagination() : '';
        
        container.innerHTML = `
            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                ${cardsHTML}
            </div>
            ${paginationHTML}
        `;
        
        // Attach event listeners to cards
        this.attachCardListeners();
    }
    
    /**
     * Render workout card
     */
    renderWorkoutCard(workout) {
        const exercises = this.getWorkoutExercisesList(workout);
        const exercisesPreview = exercises.slice(0, 6).map(e => this.truncateText(e, 15)).join(', ');
        const tags = workout.tags || [];
        const groupCount = workout.exercise_groups?.length || 0;
        const totalExercises = this.getTotalExerciseCount(workout);
        
        // Determine which action buttons to show
        const showView = this.showActions.includes('view');
        const showEdit = this.showActions.includes('edit');
        const showStart = this.showActions.includes('start');
        
        return `
            <div class="col">
                <div class="card h-100 workout-list-card" data-workout-id="${workout.id}">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0 me-2">${this.escapeHtml(workout.name)}</h6>
                            <div class="d-flex gap-1 flex-shrink-0">
                                <span class="badge bg-label-primary">${groupCount} groups</span>
                                <span class="badge bg-label-info">${totalExercises} exercises</span>
                            </div>
                        </div>
                        
                        <div class="mb-2 small text-muted" style="line-height: 1.4; max-height: 2.8em; overflow: hidden;">
                            ${exercisesPreview || 'No exercises yet'}
                        </div>
                        
                        ${tags.length > 0 ? `
                            <div class="mb-2">
                                ${tags.slice(0, 2).map(tag => `<span class="badge bg-label-secondary me-1 small">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="btn-group btn-group-sm w-100 mt-2" role="group">
                            ${showView ? `
                                <button class="btn btn-outline-secondary workout-action-btn" 
                                        data-action="view" data-workout-id="${workout.id}">
                                    <i class="bx bx-show me-1"></i>View
                                </button>
                            ` : ''}
                            ${showEdit ? `
                                <button class="btn btn-outline-primary workout-action-btn" 
                                        data-action="edit" data-workout-id="${workout.id}">
                                    <i class="bx bx-edit me-1"></i>Edit
                                </button>
                            ` : ''}
                            ${showStart ? `
                                <button class="btn btn-primary workout-action-btn" 
                                        data-action="start" data-workout-id="${workout.id}">
                                    <i class="bx bx-play me-1"></i>Start
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="text-center py-5">
                <i class="bx bx-dumbbell display-1 text-muted"></i>
                <h5 class="mt-3">${this.emptyMessage}</h5>
                <p class="text-muted">Try adjusting your search or filters</p>
            </div>
        `;
    }
    
    /**
     * Render pagination
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filtered.length / this.pageSize);
        
        if (totalPages <= 1) return '';
        
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.filtered.length);
        
        let html = '<div class="d-flex justify-content-between align-items-center mt-4">';
        html += `<div class="text-muted small">Showing ${startIndex} to ${endIndex} of ${this.filtered.length} workouts</div>`;
        html += '<nav><ul class="pagination pagination-sm mb-0">';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link workout-page-link" href="javascript:void(0);" data-page="${this.currentPage - 1}">
                    <i class="bx bx-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        const maxPages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link workout-page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link workout-page-link" href="javascript:void(0);" data-page="${this.currentPage + 1}">
                    <i class="bx bx-chevron-right"></i>
                </a>
            </li>
        `;
        
        html += '</ul></nav></div>';
        return html;
    }
    
    /**
     * Attach event listeners to cards
     */
    attachCardListeners() {
        // Action buttons
        document.querySelectorAll('.workout-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutId = btn.getAttribute('data-workout-id');
                const action = btn.getAttribute('data-action');
                this.handleWorkoutAction(workoutId, action);
            });
        });
        
        // Pagination links
        document.querySelectorAll('.workout-page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                this.goToPage(page);
            });
        });
    }
    
    /**
     * Handle workout action
     */
    handleWorkoutAction(workoutId, action) {
        console.log(`🎯 Workout action: ${action} on ${workoutId}`);
        
        if (this.onWorkoutSelect) {
            this.onWorkoutSelect(workoutId, action);
        } else {
            // Default actions
            switch (action) {
                case 'view':
                    if (window.viewWorkoutDetails) {
                        window.viewWorkoutDetails(workoutId);
                    }
                    break;
                case 'edit':
                    if (window.editWorkout) {
                        window.editWorkout(workoutId);
                    }
                    break;
                case 'start':
                    if (window.doWorkout) {
                        window.doWorkout(workoutId);
                    }
                    break;
            }
        }
    }
    
    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filtered.length / this.pageSize);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.render();
        
        // Scroll to top of container
        const container = document.getElementById(this.containerId);
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    /**
     * Show error state
     */
    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bx bx-error-circle display-1 text-danger"></i>
                    <h5 class="mt-3">Error Loading Workouts</h5>
                    <p class="text-muted">${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary mt-2" onclick="location.reload()">
                        <i class="bx bx-refresh me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Get workout exercises list
     */
    getWorkoutExercisesList(workout) {
        const exercises = [];
        
        if (workout.exercise_groups) {
            workout.exercise_groups.forEach(group => {
                if (group.exercises) {
                    Object.values(group.exercises).forEach(name => {
                        if (name) exercises.push(name);
                    });
                }
            });
        }
        
        if (workout.bonus_exercises) {
            workout.bonus_exercises.forEach(bonus => {
                if (bonus.name) exercises.push(bonus.name);
            });
        }
        
        return exercises;
    }
    
    /**
     * Get total exercise count
     */
    getTotalExerciseCount(workout) {
        let count = 0;
        
        if (workout.exercise_groups) {
            workout.exercise_groups.forEach(group => {
                count += Object.keys(group.exercises || {}).length;
            });
        }
        
        count += (workout.bonus_exercises || []).length;
        
        return count;
    }
    
    /**
     * Truncate text
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Refresh workout list
     */
    async refresh() {
        await this.loadWorkouts();
        this.applyFilters();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutListComponent;
}

// Make globally available
window.WorkoutListComponent = WorkoutListComponent;

console.log('📦 Workout List Component loaded');