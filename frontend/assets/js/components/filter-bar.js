/**
 * Ghost Gym - Reusable FilterBar Component
 * Unified filter management with search, dropdowns, and checkboxes
 * @version 1.0.0
 */

class GhostGymFilterBar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        
        this.options = {
            // Search
            searchPlaceholder: 'Search...',
            searchDebounce: 300,
            showSearch: true,
            showClearSearch: true,
            
            // Filters
            filters: [], // Array of filter definitions
            
            // Display
            layout: 'horizontal', // 'horizontal' or 'vertical'
            showClearAll: true,
            clearAllText: 'Clear All Filters',
            
            // Callbacks
            onFilterChange: null,
            onSearch: null,
            onClear: null,
            
            ...options
        };
        
        // State
        this.state = {
            search: '',
            filters: {}
        };
        
        // Debounce timer
        this.searchTimeout = null;
        
        // DOM elements
        this.elements = {};
        
        this.initialize();
    }
    
    initialize() {
        this.createStructure();
        this.attachEventListeners();
        this.initializeFilters();
        this.initializeTooltips();
    }
    
    createStructure() {
        const layoutClass = this.options.layout === 'vertical' ? 'flex-column' : '';
        
        this.container.innerHTML = `
            <div class="filter-bar ${layoutClass}">
                ${this.options.showSearch ? this.createSearchHTML() : ''}
                ${this.createFiltersHTML()}
                ${this.options.showClearAll ? this.createClearAllHTML() : ''}
            </div>
        `;
        
        // Cache DOM elements
        this.elements = {
            searchInput: this.container.querySelector('.filter-search-input'),
            clearSearchBtn: this.container.querySelector('.filter-clear-search'),
            clearAllBtn: this.container.querySelector('.filter-clear-all'),
            filterElements: {}
        };
        
        // Cache filter elements
        this.options.filters.forEach(filter => {
            const element = this.container.querySelector(`[data-filter-key="${filter.key}"]`);
            if (element) {
                this.elements.filterElements[filter.key] = element;
            }
        });
    }
    
    createSearchHTML() {
        return `
            <div class="filter-search mb-3">
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="bx bx-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control filter-search-input" 
                           placeholder="${this.options.searchPlaceholder}"
                           autocomplete="off">
                    ${this.options.showClearSearch ? `
                    <button class="btn btn-outline-secondary filter-clear-search" 
                            type="button" 
                            style="display: none;">
                        <i class="bx bx-x"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    createFiltersHTML() {
        if (this.options.filters.length === 0) return '';
        
        return `
            <div class="filter-controls mb-3">
                <div class="row g-3">
                    ${this.options.filters.map(filter => this.createFilterHTML(filter)).join('')}
                </div>
            </div>
        `;
    }
    
    createFilterHTML(filter) {
        const colClass = filter.colClass || 'col-md-6 col-lg-4';
        
        switch (filter.type) {
            case 'select':
                return this.createSelectFilterHTML(filter, colClass);
            case 'checkbox':
                return this.createCheckboxFilterHTML(filter, colClass);
            case 'radio':
                return this.createRadioFilterHTML(filter, colClass);
            default:
                return '';
        }
    }
    
    createSelectFilterHTML(filter, colClass) {
        const helpIcon = filter.helpText ? `
            <i class="bx bx-info-circle text-muted ms-1"
               style="font-size: 0.875rem; cursor: help;"
               data-bs-toggle="tooltip"
               data-bs-placement="top"
               data-bs-custom-class="tooltip-mobile-friendly"
               title="${filter.helpText}"></i>
        ` : '';
        
        return `
            <div class="${colClass}">
                <label class="form-label fw-semibold">
                    ${filter.label}
                    ${helpIcon}
                </label>
                <select class="form-select"
                        data-filter-key="${filter.key}"
                        data-filter-type="select">
                    <option value="">${filter.placeholder || 'All'}</option>
                    ${(filter.options || []).map(opt => {
                        const value = typeof opt === 'object' ? opt.value : opt;
                        const label = typeof opt === 'object' ? opt.label : opt;
                        const selected = filter.defaultValue && filter.defaultValue === value ? 'selected' : '';
                        return `<option value="${value}" ${selected}>${label}</option>`;
                    }).join('')}
                </select>
            </div>
        `;
    }
    
    createCheckboxFilterHTML(filter, colClass) {
        return `
            <div class="${colClass}">
                <label class="form-label fw-semibold">${filter.label}</label>
                <div class="form-check">
                    <input class="form-check-input" 
                           type="checkbox" 
                           id="filter-${filter.key}"
                           data-filter-key="${filter.key}"
                           data-filter-type="checkbox">
                    <label class="form-check-label" for="filter-${filter.key}">
                        ${filter.checkboxLabel || filter.label}
                    </label>
                </div>
            </div>
        `;
    }
    
    createRadioFilterHTML(filter, colClass) {
        return `
            <div class="${colClass}">
                <label class="form-label fw-semibold">${filter.label}</label>
                ${(filter.options || []).map((opt, index) => {
                    const value = typeof opt === 'object' ? opt.value : opt;
                    const label = typeof opt === 'object' ? opt.label : opt;
                    const id = `filter-${filter.key}-${index}`;
                    return `
                        <div class="form-check">
                            <input class="form-check-input" 
                                   type="radio" 
                                   name="filter-${filter.key}"
                                   id="${id}"
                                   value="${value}"
                                   data-filter-key="${filter.key}"
                                   data-filter-type="radio">
                            <label class="form-check-label" for="${id}">
                                ${label}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    createClearAllHTML() {
        return `
            <div class="filter-actions">
                <button type="button" 
                        class="btn btn-outline-secondary filter-clear-all">
                    <i class="bx bx-x me-1"></i>
                    ${this.options.clearAllText}
                </button>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
        }
        
        // Clear search button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Filter elements
        Object.entries(this.elements.filterElements).forEach(([key, element]) => {
            const filterType = element.dataset.filterType;
            
            if (filterType === 'select') {
                element.addEventListener('change', () => {
                    this.handleFilterChange(key, element.value);
                });
            } else if (filterType === 'checkbox') {
                element.addEventListener('change', () => {
                    this.handleFilterChange(key, element.checked);
                });
            } else if (filterType === 'radio') {
                element.addEventListener('change', () => {
                    if (element.checked) {
                        this.handleFilterChange(key, element.value);
                    }
                });
            }
        });
        
        // Clear all button
        if (this.elements.clearAllBtn) {
            this.elements.clearAllBtn.addEventListener('click', () => {
                this.clearAll();
            });
        }
    }
    
    initializeFilters() {
        // Initialize filter state with default values
        this.options.filters.forEach(filter => {
            if (filter.type === 'checkbox') {
                this.state.filters[filter.key] = filter.defaultValue || false;
            } else {
                this.state.filters[filter.key] = filter.defaultValue || '';
            }
        });
        
        // Trigger initial filter change if there are default values
        const hasDefaults = this.options.filters.some(f => f.defaultValue);
        if (hasDefaults) {
            this.notifyChange();
        }
    }
    
    initializeTooltips() {
        // Initialize Bootstrap tooltips for help icons
        const tooltipTriggerList = this.container.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl, {
                trigger: 'click hover focus', // Mobile-friendly: works on tap
                html: false,
                container: 'body'
            });
        });
    }
    
    handleSearchInput(value) {
        // Show/hide clear button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = value.trim() ? 'block' : 'none';
        }
        
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.state.search = value.trim();
            this.notifyChange();
            
            if (this.options.onSearch) {
                this.options.onSearch(value.trim());
            }
        }, this.options.searchDebounce);
    }
    
    handleFilterChange(key, value) {
        this.state.filters[key] = value;
        this.notifyChange();
    }
    
    notifyChange() {
        if (this.options.onFilterChange) {
            this.options.onFilterChange(this.getFilters());
        }
    }
    
    clearSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.state.search = '';
            
            if (this.elements.clearSearchBtn) {
                this.elements.clearSearchBtn.style.display = 'none';
            }
            
            this.notifyChange();
            
            if (this.options.onSearch) {
                this.options.onSearch('');
            }
        }
    }
    
    clearAll() {
        // Clear search
        this.clearSearch();
        
        // Clear all filters
        Object.keys(this.state.filters).forEach(key => {
            const element = this.elements.filterElements[key];
            if (!element) return;
            
            const filterType = element.dataset.filterType;
            
            if (filterType === 'select') {
                element.value = '';
                this.state.filters[key] = '';
            } else if (filterType === 'checkbox') {
                element.checked = false;
                this.state.filters[key] = false;
            } else if (filterType === 'radio') {
                element.checked = false;
                this.state.filters[key] = '';
            }
        });
        
        this.notifyChange();
        
        if (this.options.onClear) {
            this.options.onClear();
        }
    }
    
    // Public API
    
    getFilters() {
        return {
            search: this.state.search,
            ...this.state.filters
        };
    }
    
    setFilters(filters) {
        // Set search
        if (filters.search !== undefined && this.elements.searchInput) {
            this.elements.searchInput.value = filters.search;
            this.state.search = filters.search;
            
            if (this.elements.clearSearchBtn) {
                this.elements.clearSearchBtn.style.display = filters.search ? 'block' : 'none';
            }
        }
        
        // Set filter values
        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'search') return;
            
            const element = this.elements.filterElements[key];
            if (!element) return;
            
            const filterType = element.dataset.filterType;
            
            if (filterType === 'select') {
                element.value = value;
                this.state.filters[key] = value;
            } else if (filterType === 'checkbox') {
                element.checked = value;
                this.state.filters[key] = value;
            } else if (filterType === 'radio') {
                if (element.value === value) {
                    element.checked = true;
                    this.state.filters[key] = value;
                }
            }
        });
    }
    
    getFilterValue(key) {
        return this.state.filters[key];
    }
    
    setFilterValue(key, value) {
        const element = this.elements.filterElements[key];
        if (!element) return;
        
        const filterType = element.dataset.filterType;
        
        if (filterType === 'select') {
            element.value = value;
        } else if (filterType === 'checkbox') {
            element.checked = value;
        } else if (filterType === 'radio') {
            if (element.value === value) {
                element.checked = true;
            }
        }
        
        this.state.filters[key] = value;
        this.notifyChange();
    }
    
    updateFilterOptions(key, options) {
        const element = this.elements.filterElements[key];
        if (!element || element.dataset.filterType !== 'select') return;
        
        const currentValue = element.value;
        const filter = this.options.filters.find(f => f.key === key);
        
        element.innerHTML = `
            <option value="">${filter.placeholder || 'All'}</option>
            ${options.map(opt => {
                const value = typeof opt === 'object' ? opt.value : opt;
                const label = typeof opt === 'object' ? opt.label : opt;
                return `<option value="${value}">${label}</option>`;
            }).join('')}
        `;
        
        // Restore previous value if still valid
        if (options.some(opt => {
            const value = typeof opt === 'object' ? opt.value : opt;
            return value === currentValue;
        })) {
            element.value = currentValue;
        }
    }
    
    getSearchValue() {
        return this.state.search;
    }
    
    setSearchValue(value) {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = value;
            this.state.search = value;
            
            if (this.elements.clearSearchBtn) {
                this.elements.clearSearchBtn.style.display = value ? 'block' : 'none';
            }
            
            this.notifyChange();
        }
    }
    
    destroy() {
        // Clear timeout
        clearTimeout(this.searchTimeout);
        
        // Clean up
        this.container.innerHTML = '';
    }
}

// Export for global use
window.GhostGymFilterBar = GhostGymFilterBar;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GhostGymFilterBar;
}

console.log('📦 GhostGymFilterBar component loaded');