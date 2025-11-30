/**
 * Ghost Gym - Workout Grid Component
 * Manages a grid of workout cards with pagination and state management
 * @version 1.0.0
 */

class WorkoutGrid {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        
        this.config = {
            // Card configuration
            cardConfig: {},
            
            // Pagination
            pageSize: 20,
            showPagination: true,
            
            // Empty state
            emptyIcon: 'bx-dumbbell',
            emptyTitle: 'No workouts found',
            emptyMessage: 'Try adjusting your filters or create a new workout',
            emptyAction: null,
            
            // Loading state
            loadingMessage: 'Loading workouts...',
            
            // Callbacks
            onPageChange: null,
            
            ...config
        };
        
        // State
        this.workouts = [];
        this.currentPage = 1;
        this.cards = [];
        
        // DOM elements
        this.elements = {};
        
        this.initialize();
    }
    
    /**
     * Initialize the grid
     */
    initialize() {
        this.createStructure();
    }
    
    /**
     * Create grid structure
     */
    createStructure() {
        this.container.innerHTML = `
            <div class="workout-grid-wrapper">
                <!-- Loading State -->
                <div class="workout-grid-loading" style="display: none;">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">${this.config.loadingMessage}</span>
                        </div>
                        <h5 class="mt-3">${this.config.loadingMessage}</h5>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div class="workout-grid-empty" style="display: none;">
                    <div class="text-center py-5">
                        <i class="bx ${this.config.emptyIcon} display-1 text-muted"></i>
                        <h5 class="mt-3">${this.config.emptyTitle}</h5>
                        <p class="text-muted">${this.config.emptyMessage}</p>
                        ${this.config.emptyAction ? `
                            <button class="btn btn-primary mt-2" id="emptyActionBtn">
                                <i class="bx bx-plus me-1"></i>${this.config.emptyAction.label}
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Grid Container -->
                <div class="workout-grid-content" style="display: none;">
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" id="workoutCardsGrid">
                        <!-- Cards will be inserted here -->
                    </div>
                </div>
                
                <!-- Pagination -->
                ${this.config.showPagination ? `
                <div class="workout-grid-pagination mt-4" style="display: none;">
                    <nav aria-label="Workout pagination">
                        <ul class="pagination pagination-sm justify-content-center" id="paginationList">
                            <!-- Pagination will be inserted here -->
                        </ul>
                    </nav>
                </div>
                ` : ''}
            </div>
        `;
        
        // Cache DOM elements
        this.elements = {
            loading: this.container.querySelector('.workout-grid-loading'),
            empty: this.container.querySelector('.workout-grid-empty'),
            content: this.container.querySelector('.workout-grid-content'),
            grid: this.container.querySelector('#workoutCardsGrid'),
            pagination: this.container.querySelector('.workout-grid-pagination'),
            paginationList: this.container.querySelector('#paginationList')
        };
        
        // Attach empty action listener
        if (this.config.emptyAction) {
            const emptyActionBtn = this.container.querySelector('#emptyActionBtn');
            if (emptyActionBtn) {
                emptyActionBtn.addEventListener('click', () => {
                    this.config.emptyAction.onClick();
                });
            }
        }
    }
    
    /**
     * Set workout data
     * @param {Array} workouts
     */
    setData(workouts) {
        this.workouts = workouts;
        this.currentPage = 1;
        this.render();
    }
    
    /**
     * Set current page
     * @param {number} page
     */
    setPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.render();
        
        // Scroll to top of grid
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        if (this.config.onPageChange) {
            this.config.onPageChange(page);
        }
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.elements.loading.style.display = 'block';
        this.elements.empty.style.display = 'none';
        this.elements.content.style.display = 'none';
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'none';
        }
    }
    
    /**
     * Show empty state
     */
    showEmpty() {
        this.elements.loading.style.display = 'none';
        this.elements.empty.style.display = 'block';
        this.elements.content.style.display = 'none';
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'none';
        }
    }
    
    /**
     * Show content
     */
    showContent() {
        this.elements.loading.style.display = 'none';
        this.elements.empty.style.display = 'none';
        this.elements.content.style.display = 'block';
        if (this.elements.pagination && this.getTotalPages() > 1) {
            this.elements.pagination.style.display = 'block';
        }
    }
    
    /**
     * Render the grid
     */
    render() {
        // Show appropriate state
        if (this.workouts.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.showContent();
        this.renderCards();
        this.renderPagination();
    }
    
    /**
     * Render workout cards
     */
    renderCards() {
        // Clear existing cards
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        this.elements.grid.innerHTML = '';
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.config.pageSize;
        const endIndex = startIndex + this.config.pageSize;
        const pageWorkouts = this.workouts.slice(startIndex, endIndex);
        
        // Create and render cards
        pageWorkouts.forEach(workout => {
            const card = new WorkoutCard(workout, this.config.cardConfig);
            const cardElement = card.render();
            this.elements.grid.appendChild(cardElement);
            this.cards.push(card);
        });
    }
    
    /**
     * Render pagination
     */
    renderPagination() {
        if (!this.config.showPagination || !this.elements.paginationList) return;
        
        const totalPages = this.getTotalPages();
        
        if (totalPages <= 1) {
            if (this.elements.pagination) {
                this.elements.pagination.style.display = 'none';
            }
            return;
        }
        
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'block';
        }
        
        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0);" data-page="${this.currentPage - 1}" aria-label="Previous">
                    <i class="bx bx-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers (show max 5 pages)
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0);" data-page="${this.currentPage + 1}" aria-label="Next">
                    <i class="bx bx-chevron-right"></i>
                </a>
            </li>
        `;
        
        this.elements.paginationList.innerHTML = html;
        
        // Attach pagination listeners
        this.elements.paginationList.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page >= 1 && page <= totalPages && page !== this.currentPage) {
                    this.setPage(page);
                }
            });
        });
    }
    
    /**
     * Refresh the grid (re-render current page)
     */
    refresh() {
        this.render();
    }
    
    /**
     * Update card configuration
     * @param {Object} cardConfig
     */
    updateCardConfig(cardConfig) {
        this.config.cardConfig = { ...this.config.cardConfig, ...cardConfig };
        this.refresh();
    }
    
    /**
     * Set delete mode for all cards
     * @param {boolean} enabled
     */
    setDeleteMode(enabled) {
        this.config.cardConfig.deleteMode = enabled;
        this.cards.forEach(card => card.setDeleteMode(enabled));
    }
    
    /**
     * Get current page
     * @returns {number}
     */
    getCurrentPage() {
        return this.currentPage;
    }
    
    /**
     * Get total pages
     * @returns {number}
     */
    getTotalPages() {
        return Math.ceil(this.workouts.length / this.config.pageSize);
    }
    
    /**
     * Get displayed workouts
     * @returns {Array}
     */
    getDisplayedData() {
        const startIndex = (this.currentPage - 1) * this.config.pageSize;
        const endIndex = startIndex + this.config.pageSize;
        return this.workouts.slice(startIndex, endIndex);
    }
    
    /**
     * Get all workouts
     * @returns {Array}
     */
    getAllData() {
        return this.workouts;
    }
    
    /**
     * Destroy the grid
     */
    destroy() {
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        this.container.innerHTML = '';
    }
}

// Export for global use
window.WorkoutGrid = WorkoutGrid;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutGrid;
}

console.log('📦 WorkoutGrid component loaded');