/**
 * Ghost Gym - Reusable DataTable Component
 * Unified table rendering with built-in pagination, sorting, and filtering
 * @version 1.0.0
 */

class GhostGymDataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        
        this.options = {
            // Data
            data: [],
            columns: [],
            
            // Pagination
            pageSize: 50,
            currentPage: 1,
            showPagination: true,
            showPageInfo: true,
            showEntriesSelector: true,
            pageSizeOptions: [25, 50, 100, 250],
            
            // Sorting
            sortable: true,
            defaultSort: null,
            defaultSortDirection: 'asc',
            
            // Display
            emptyMessage: 'No data found',
            loadingMessage: 'Loading...',
            tableClass: 'table table-hover datatable-table mb-0',
            rowHeight: 'normal', // 'normal' or 'compact'
            
            // Callbacks
            onRowClick: null,
            onPageChange: null,
            onSort: null,
            onPageSizeChange: null,
            
            // Custom renderers
            rowRenderer: null,
            
            ...options
        };
        
        // State
        this.currentPage = this.options.currentPage;
        this.pageSize = this.options.pageSize;
        this.sortColumn = this.options.defaultSort;
        this.sortDirection = this.options.defaultSortDirection;
        this.filteredData = [];
        this.displayedData = [];
        
        // DOM elements
        this.elements = {};
        
        this.initialize();
    }
    
    initialize() {
        this.createStructure();
        this.attachEventListeners();
        this.setData(this.options.data);
    }
    
    createStructure() {
        this.container.innerHTML = `
            <div class="datatable-wrapper">
                <!-- Loading State -->
                <div class="datatable-loading" style="display: none;">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">${this.options.loadingMessage}</span>
                        </div>
                        <p class="mt-3 text-muted">${this.options.loadingMessage}</p>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div class="datatable-empty" style="display: none;">
                    <div class="text-center py-5">
                        <i class="bx bx-search-alt display-1 text-muted"></i>
                        <h5 class="mt-3">${this.options.emptyMessage}</h5>
                    </div>
                </div>
                
                <!-- Table Container -->
                <div class="datatable-table-container" style="display: none;">
                    <div class="table-responsive">
                        <table class="${this.options.tableClass} ${this.options.rowHeight === 'compact' ? 'compact' : ''}">
                            <thead class="table-light">
                                <tr class="datatable-header-row"></tr>
                            </thead>
                            <tbody class="datatable-body"></tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Pagination Footer -->
                ${this.options.showPagination ? `
                <div class="datatable-pagination" style="display: none;">
                    <div class="row align-items-center py-3">
                        ${this.options.showPageInfo ? `
                        <div class="col-sm-6">
                            <div class="text-muted small datatable-page-info"></div>
                        </div>
                        ` : ''}
                        <div class="col-sm-6">
                            <nav aria-label="Table pagination">
                                <ul class="pagination pagination-sm justify-content-end mb-0 datatable-pagination-controls"></ul>
                            </nav>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        // Cache DOM elements
        this.elements = {
            loading: this.container.querySelector('.datatable-loading'),
            empty: this.container.querySelector('.datatable-empty'),
            tableContainer: this.container.querySelector('.datatable-table-container'),
            headerRow: this.container.querySelector('.datatable-header-row'),
            tbody: this.container.querySelector('.datatable-body'),
            pagination: this.container.querySelector('.datatable-pagination'),
            pageInfo: this.container.querySelector('.datatable-page-info'),
            paginationControls: this.container.querySelector('.datatable-pagination-controls')
        };
    }
    
    attachEventListeners() {
        // Row click events will be attached when rows are rendered
        // Pagination events will be attached when pagination is rendered
    }
    
    setData(data) {
        this.options.data = data;
        this.filteredData = [...data];
        this.currentPage = 1; // Reset to page 1 when data changes
        this.applySort();
        this.updatePagination();
        this.render();
    }
    
    applySort() {
        if (!this.sortColumn) return;
        
        const column = this.options.columns.find(col => col.key === this.sortColumn);
        if (!column) return;
        
        this.filteredData.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Use custom sort function if provided
            if (column.sortFn) {
                return column.sortFn(a, b, this.sortDirection);
            }
            
            // Default sorting
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            // String comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }
    
    updatePagination() {
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.pageSize);
        
        // Ensure current page is valid
        if (this.currentPage > totalPages) {
            this.currentPage = Math.max(1, totalPages);
        }
        
        // Calculate displayed data
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.displayedData = this.filteredData.slice(startIndex, endIndex);
    }
    
    render() {
        // Show/hide states
        if (this.filteredData.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.showTable();
        this.renderHeader();
        this.renderBody();
        this.renderPagination();
    }
    
    showLoading() {
        this.elements.loading.style.display = 'block';
        this.elements.empty.style.display = 'none';
        this.elements.tableContainer.style.display = 'none';
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'none';
        }
    }
    
    showEmpty() {
        this.elements.loading.style.display = 'none';
        this.elements.empty.style.display = 'block';
        this.elements.tableContainer.style.display = 'none';
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'none';
        }
    }
    
    showTable() {
        this.elements.loading.style.display = 'none';
        this.elements.empty.style.display = 'none';
        this.elements.tableContainer.style.display = 'block';
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'block';
        }
    }
    
    renderHeader() {
        this.elements.headerRow.innerHTML = this.options.columns.map(column => {
            const sortable = this.options.sortable && column.sortable !== false;
            const isSorted = this.sortColumn === column.key;
            const sortIcon = isSorted 
                ? (this.sortDirection === 'asc' ? '↑' : '↓')
                : '';
            
            return `
                <th class="${column.className || ''}" 
                    ${column.width ? `style="width: ${column.width}"` : ''}
                    ${sortable ? `data-sort-key="${column.key}" style="cursor: pointer;"` : ''}>
                    ${column.label}
                    ${sortable ? `<span class="sort-indicator">${sortIcon}</span>` : ''}
                </th>
            `;
        }).join('');
        
        // Attach sort listeners
        if (this.options.sortable) {
            this.elements.headerRow.querySelectorAll('[data-sort-key]').forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.sortKey;
                    this.sort(key);
                });
            });
        }
    }
    
    renderBody() {
        if (this.options.rowRenderer) {
            // Use custom row renderer
            this.elements.tbody.innerHTML = this.displayedData
                .map(row => this.options.rowRenderer(row))
                .join('');
        } else {
            // Use default row renderer
            this.elements.tbody.innerHTML = this.displayedData.map(row => {
                const cells = this.options.columns.map(column => {
                    let value = row[column.key];
                    
                    // Use custom cell renderer if provided
                    if (column.render) {
                        value = column.render(value, row);
                    } else if (value === null || value === undefined) {
                        value = '-';
                    }
                    
                    return `<td class="${column.className || ''}">${value}</td>`;
                }).join('');
                
                return `<tr class="datatable-row" data-row-id="${row.id || ''}">${cells}</tr>`;
            }).join('');
        }
        
        // Attach row click listeners
        if (this.options.onRowClick) {
            this.elements.tbody.querySelectorAll('.datatable-row').forEach((tr, index) => {
                tr.addEventListener('click', (e) => {
                    this.options.onRowClick(this.displayedData[index], e);
                });
            });
        }
    }
    
    renderPagination() {
        if (!this.options.showPagination) return;
        
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.pageSize);
        
        // Update page info
        if (this.elements.pageInfo) {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, totalItems);
            this.elements.pageInfo.textContent =
                `Showing ${startIndex} to ${endIndex} of ${totalItems.toLocaleString()} entries`;
        }
        
        // Clear pagination controls if only 1 page or less
        if (this.elements.paginationControls) {
            if (totalPages <= 1) {
                this.elements.paginationControls.innerHTML = '';
                return;
            }
        }
        
        // Render pagination controls
        if (this.elements.paginationControls && totalPages > 1) {
            const maxVisiblePages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            let html = '';
            
            // Previous button
            html += `
                <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${this.currentPage - 1}">
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
                    <a class="page-link" href="javascript:void(0);" data-page="${this.currentPage + 1}">
                        <i class="bx bx-chevron-right"></i>
                    </a>
                </li>
            `;
            
            this.elements.paginationControls.innerHTML = html;
            
            // Attach pagination listeners
            this.elements.paginationControls.querySelectorAll('[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(link.dataset.page);
                    if (page >= 1 && page <= totalPages && page !== this.currentPage) {
                        this.goToPage(page);
                    }
                });
            });
        }
    }
    
    // Public API
    
    sort(columnKey, direction = null) {
        if (this.sortColumn === columnKey && !direction) {
            // Toggle direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = direction || 'asc';
        }
        
        this.applySort();
        this.updatePagination();
        this.render();
        
        if (this.options.onSort) {
            this.options.onSort(columnKey, this.sortDirection);
        }
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.updatePagination();
        this.render();
        
        // Scroll to top of table
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        if (this.options.onPageChange) {
            this.options.onPageChange(page);
        }
    }
    
    setPageSize(size) {
        this.pageSize = size;
        this.currentPage = 1;
        this.updatePagination();
        this.render();
        
        if (this.options.onPageSizeChange) {
            this.options.onPageSizeChange(size);
        }
    }
    
    filter(filterFn) {
        this.filteredData = this.options.data.filter(filterFn);
        this.currentPage = 1;
        this.applySort();
        this.updatePagination();
        this.render();
    }
    
    refresh() {
        this.updatePagination();
        this.render();
    }
    
    destroy() {
        // Clean up event listeners
        this.container.innerHTML = '';
    }
    
    // Getters
    
    getData() {
        return this.options.data;
    }
    
    getFilteredData() {
        return this.filteredData;
    }
    
    getDisplayedData() {
        return this.displayedData;
    }
    
    getCurrentPage() {
        return this.currentPage;
    }
    
    getPageSize() {
        return this.pageSize;
    }
    
    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.pageSize);
    }
}

// Export for global use
window.GhostGymDataTable = GhostGymDataTable;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GhostGymDataTable;
}

console.log('📦 GhostGymDataTable component loaded');