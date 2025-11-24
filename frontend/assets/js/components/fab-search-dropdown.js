/**
 * FAB Search Dropdown Component
 * Creates a compact search dropdown that appears from the FAB button
 * @version 1.0.0
 */

class FabSearchDropdown {
    constructor(options = {}) {
        this.options = {
            placeholder: options.placeholder || 'Search...',
            onSearch: options.onSearch || (() => {}),
            ...options
        };
        
        this.dropdown = null;
        this.input = null;
        this.searchTimeout = null;
        this.isOpen = false;
        
        this.init();
    }
    
    /**
     * Initialize the search dropdown
     */
    init() {
        this.createDropdown();
        this.setupEventListeners();
        console.log('✅ FAB Search Dropdown initialized');
    }
    
    /**
     * Create the dropdown HTML structure
     */
    createDropdown() {
        // Check if dropdown already exists
        let dropdown = document.getElementById('fabSearchDropdown');
        
        if (!dropdown) {
            const dropdownHTML = `
                <div id="fabSearchDropdown" class="fab-search-dropdown">
                    <div class="fab-search-content">
                        <div class="fab-search-input-wrapper">
                            <i class="bx bx-search fab-search-icon"></i>
                            <input
                                type="text"
                                id="fabSearchInput"
                                class="form-control fab-search-input"
                                placeholder="${this.options.placeholder}"
                                autocomplete="off"
                                autocapitalize="off"
                                spellcheck="false"
                            />
                            <button class="fab-search-close" id="fabSearchClose" aria-label="Close search">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', dropdownHTML);
            dropdown = document.getElementById('fabSearchDropdown');
        }
        
        this.dropdown = dropdown;
        this.input = document.getElementById('fabSearchInput');
        this.closeBtn = document.getElementById('fabSearchClose');
        
        // Update placeholder if different
        if (this.input) {
            this.input.placeholder = this.options.placeholder;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.dropdown || !this.input) return;
        
        // Close button
        this.closeBtn?.addEventListener('click', () => this.hide());
        
        // Search input with debouncing
        this.input.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            
            const searchTerm = e.target.value.trim();
            
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
            if (this.isOpen &&
                !this.dropdown.contains(e.target) &&
                !e.target.closest('[data-action="fab"]')) {
                this.hide();
            }
        });
    }
    
    /**
     * Show the search dropdown
     */
    show() {
        if (!this.dropdown) return;
        
        this.dropdown.classList.add('active');
        this.isOpen = true;
        document.body.classList.add('fab-search-active');
        
        // Focus input immediately to trigger mobile keyboard
        // Use requestAnimationFrame for better mobile compatibility
        requestAnimationFrame(() => {
            if (this.input) {
                this.input.focus();
                // Force click on mobile to ensure keyboard appears
                this.input.click();
            }
        });
        
        console.log('🔍 FAB Search dropdown shown');
    }
    
    /**
     * Hide the search dropdown
     */
    hide() {
        if (!this.dropdown) return;
        
        this.dropdown.classList.remove('active');
        this.isOpen = false;
        document.body.classList.remove('fab-search-active');
        
        // Clear search if empty
        if (this.input && !this.input.value.trim()) {
            this.performSearch('');
        }
        
        console.log('🔍 FAB Search dropdown hidden');
    }
    
    /**
     * Toggle the search dropdown
     */
    toggle() {
        if (this.isOpen) {
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
window.FabSearchDropdown = FabSearchDropdown;

console.log('📦 FAB Search Dropdown component loaded');