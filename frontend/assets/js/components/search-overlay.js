/**
 * Ghost Gym - Reusable Search Overlay Component
 * Provides a consistent search experience across all pages
 * @version 1.0.0
 */

class GhostGymSearchOverlay {
    constructor(options = {}) {
        this.options = {
            placeholder: options.placeholder || 'Search...',
            onSearch: options.onSearch || (() => {}),
            onResultsCount: options.onResultsCount || (() => 0),
            ...options
        };
        
        this.overlay = null;
        this.input = null;
        this.closeBtn = null;
        this.resultsCount = null;
        this.searchTimeout = null;
        
        this.init();
    }
    
    /**
     * Initialize the search overlay
     */
    init() {
        // Create overlay HTML
        this.createOverlay();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Search overlay initialized');
    }
    
    /**
     * Create the overlay HTML structure
     */
    createOverlay() {
        // Check if overlay already exists
        let overlay = document.getElementById('searchOverlay');
        
        if (!overlay) {
            // Create new overlay
            const overlayHTML = `
                <div id="searchOverlay" class="search-overlay">
                    <div class="search-overlay-content">
                        <div class="search-input-wrapper">
                            <i class="bx bx-search search-icon"></i>
                            <input
                                type="text"
                                id="searchOverlayInput"
                                class="form-control search-overlay-input"
                                placeholder="${this.options.placeholder}"
                                autocomplete="off"
                                autocapitalize="off"
                                spellcheck="false"
                            />
                            <button class="btn-close search-overlay-close" aria-label="Close search"></button>
                        </div>
                        <div id="searchResultsCount" class="search-results-count"></div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', overlayHTML);
            overlay = document.getElementById('searchOverlay');
        }
        
        this.overlay = overlay;
        this.input = document.getElementById('searchOverlayInput');
        this.closeBtn = overlay.querySelector('.search-overlay-close');
        this.resultsCount = document.getElementById('searchResultsCount');
        
        // Update placeholder if different
        if (this.input) {
            this.input.placeholder = this.options.placeholder;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.overlay || !this.input) return;
        
        // Close button
        this.closeBtn?.addEventListener('click', () => this.hide());
        
        // Search input with debouncing
        this.input.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            
            const searchTerm = e.target.value.trim();
            
            // Update results count immediately
            this.updateResultsCount(searchTerm);
            
            // Debounce actual search
            this.searchTimeout = setTimeout(() => {
                this.performSearch(searchTerm);
            }, 300);
        });
        
        // ESC key to close
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.overlay.classList.contains('active') &&
                !this.overlay.contains(e.target) &&
                !e.target.closest('[data-action="left-1"]') &&
                !e.target.closest('[data-action="fab"]')) {
                this.hide();
            }
        });
    }
    
    /**
     * Show the search overlay
     */
    show() {
        if (!this.overlay) return;
        
        this.overlay.classList.add('active');
        
        // Focus input after animation
        setTimeout(() => {
            this.input?.focus();
        }, 100);
        
        // Update results count
        this.updateResultsCount(this.input?.value.trim() || '');
        
        console.log('🔍 Search overlay shown');
    }
    
    /**
     * Hide the search overlay
     */
    hide() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('active');
        
        // Clear search if empty
        if (this.input && !this.input.value.trim()) {
            this.performSearch('');
        }
        
        console.log('🔍 Search overlay hidden');
    }
    
    /**
     * Toggle the search overlay
     */
    toggle() {
        if (this.overlay?.classList.contains('active')) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Perform search with given term
     */
    performSearch(searchTerm) {
        if (this.options.onSearch) {
            this.options.onSearch(searchTerm);
        }
        
        console.log('🔍 Search performed:', searchTerm);
    }
    
    /**
     * Update results count display
     */
    updateResultsCount(searchTerm) {
        if (!this.resultsCount) return;
        
        if (!searchTerm) {
            this.resultsCount.textContent = '';
            return;
        }
        
        // Get count from callback
        const { count, total } = this.options.onResultsCount(searchTerm);
        
        this.resultsCount.textContent = `${count} of ${total} results`;
        console.log('📊 Count:', count, 'of', total);
    }
    
    /**
     * Get current search term
     */
    getSearchTerm() {
        return this.input?.value.trim() || '';
    }
    
    /**
     * Set search term
     */
    setSearchTerm(term) {
        if (this.input) {
            this.input.value = term;
            this.updateResultsCount(term);
        }
    }
    
    /**
     * Clear search
     */
    clear() {
        this.setSearchTerm('');
        this.performSearch('');
    }
}

// Export for global access
window.GhostGymSearchOverlay = GhostGymSearchOverlay;

console.log('📦 Search Overlay component loaded');