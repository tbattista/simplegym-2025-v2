/**
 * Ghost Gym - Standalone Pagination Component
 * Reusable pagination controls with page info display
 * @version 1.0.0
 */

class GhostGymPagination {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        
        this.options = {
            // Data
            totalItems: 0,
            pageSize: 50,
            currentPage: 1,
            
            // Display
            maxVisiblePages: 5,
            showPageInfo: true,
            showEntriesSelector: true,
            pageSizeOptions: [25, 50, 100, 250],
            
            // Text
            pageInfoTemplate: 'Showing {start} to {end} of {total} entries',
            entriesLabel: 'Show',
            entriesText: 'entries',
            
            // Callbacks
            onPageChange: null,
            onPageSizeChange: null,
            
            ...options
        };
        
        // State
        this.currentPage = this.options.currentPage;
        this.pageSize = this.options.pageSize;
        this.totalItems = this.options.totalItems;
        
        // DOM elements
        this.elements = {};
        
        this.initialize();
    }
    
    initialize() {
        this.createStructure();
        this.attachEventListeners();
        this.render();
    }
    
    createStructure() {
        this.container.innerHTML = `
            <div class="pagination-wrapper">
                ${this.options.showEntriesSelector ? this.createEntriesSelectorHtml() : ''}
                
                <div class="pagination-controls-wrapper">
                    <div class="row align-items-center">
                        ${this.options.showPageInfo ? `
                        <div class="col-sm-6">
                            <div class="pagination-info text-muted small"></div>
                        </div>
                        ` : ''}
                        <div class="${this.options.showPageInfo ? 'col-sm-6' : 'col-12'}">
                            <nav aria-label="Pagination">
                                <ul class="pagination pagination-sm justify-content-end mb-0 pagination-controls"></ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.elements = {
            entriesSelector: this.container.querySelector('.pagination-entries-selector'),
            pageInfo: this.container.querySelector('.pagination-info'),
            paginationControls: this.container.querySelector('.pagination-controls')
        };
    }
    
    createEntriesSelectorHtml() {
        return `
            <div class="pagination-entries mb-3">
                <div class="d-flex align-items-center gap-2">
                    <label class="form-label mb-0 small">${this.options.entriesLabel}</label>
                    <select class="form-select form-select-sm pagination-entries-selector" style="width: auto;">
                        ${this.options.pageSizeOptions.map(size => `
                            <option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>
                        `).join('')}
                    </select>
                    <span class="small text-muted">${this.options.entriesText}</span>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Entries selector
        if (this.elements.entriesSelector) {
            this.elements.entriesSelector.addEventListener('change', (e) => {
                this.setPageSize(parseInt(e.target.value));
            });
        }
    }
    
    render() {
        this.renderPageInfo();
        this.renderPaginationControls();
    }
    
    renderPageInfo() {
        if (!this.elements.pageInfo) return;
        
        const totalPages = this.getTotalPages();
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.totalItems);
        
        const info = this.options.pageInfoTemplate
            .replace('{start}', startIndex.toLocaleString())
            .replace('{end}', endIndex.toLocaleString())
            .replace('{total}', this.totalItems.toLocaleString());
        
        this.elements.pageInfo.textContent = info;
    }
    
    renderPaginationControls() {
        if (!this.elements.paginationControls) return;
        
        const totalPages = this.getTotalPages();
        
        if (totalPages <= 1) {
            this.elements.paginationControls.innerHTML = '';
            return;
        }
        
        const maxVisiblePages = this.options.maxVisiblePages;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
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
        
        // First page + ellipsis
        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="javascript:void(0);" data-page="1">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Ellipsis + last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="javascript:void(0);" data-page="${totalPages}">${totalPages}</a>
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
        
        this.elements.paginationControls.innerHTML = html;
        
        // Attach click listeners
        this.elements.paginationControls.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                const totalPages = this.getTotalPages();
                
                if (page >= 1 && page <= totalPages && page !== this.currentPage) {
                    this.goToPage(page);
                }
            });
        });
    }
    
    // Public API
    
    goToPage(page) {
        const totalPages = this.getTotalPages();
        
        if (page < 1 || page > totalPages) {
            console.warn(`⚠️ Invalid page number: ${page}`);
            return;
        }
        
        this.currentPage = page;
        this.render();
        
        if (this.options.onPageChange) {
            this.options.onPageChange(page, this.getPageInfo());
        }
    }
    
    setPageSize(size) {
        if (!this.options.pageSizeOptions.includes(size)) {
            console.warn(`⚠️ Invalid page size: ${size}`);
            return;
        }
        
        this.pageSize = size;
        this.currentPage = 1; // Reset to first page
        this.render();
        
        if (this.options.onPageSizeChange) {
            this.options.onPageSizeChange(size, this.getPageInfo());
        }
    }
    
    setTotalItems(total) {
        this.totalItems = total;
        
        // Ensure current page is valid
        const totalPages = this.getTotalPages();
        if (this.currentPage > totalPages) {
            this.currentPage = Math.max(1, totalPages);
        }
        
        this.render();
    }
    
    update(options = {}) {
        if (options.totalItems !== undefined) {
            this.totalItems = options.totalItems;
        }
        
        if (options.currentPage !== undefined) {
            this.currentPage = options.currentPage;
        }
        
        if (options.pageSize !== undefined) {
            this.pageSize = options.pageSize;
        }
        
        // Ensure current page is valid
        const totalPages = this.getTotalPages();
        if (this.currentPage > totalPages) {
            this.currentPage = Math.max(1, totalPages);
        }
        
        this.render();
    }
    
    reset() {
        this.currentPage = 1;
        this.render();
    }
    
    // Getters
    
    getTotalPages() {
        return Math.ceil(this.totalItems / this.pageSize);
    }
    
    getCurrentPage() {
        return this.currentPage;
    }
    
    getPageSize() {
        return this.pageSize;
    }
    
    getTotalItems() {
        return this.totalItems;
    }
    
    getPageInfo() {
        const totalPages = this.getTotalPages();
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.totalItems);
        
        return {
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            totalItems: this.totalItems,
            totalPages: totalPages,
            startIndex: startIndex,
            endIndex: endIndex,
            hasNextPage: this.currentPage < totalPages,
            hasPreviousPage: this.currentPage > 1
        };
    }
    
    // Navigation helpers
    
    nextPage() {
        if (this.currentPage < this.getTotalPages()) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    firstPage() {
        this.goToPage(1);
    }
    
    lastPage() {
        this.goToPage(this.getTotalPages());
    }
    
    // Cleanup
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// Export for global use
window.GhostGymPagination = GhostGymPagination;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GhostGymPagination;
}

console.log('📦 GhostGymPagination component loaded');