/**
 * Exercise Database - Toolbar Module
 * Handles search, sort, and filter badge functionality
 *
 * @module exercise-toolbar
 * @version 1.0.0
 */

// Toolbar state
let currentSortIndex = 0;
const SORT_OPTIONS = [
    { value: 'name', label: 'A-Z', icon: 'bx-sort-a-z' },
    { value: 'popularity', label: 'Popular', icon: 'bx-trending-up' },
    { value: 'favorites', label: 'Favorites', icon: 'bx-heart' }
];

/**
 * Initialize toolbar search functionality
 */
function initToolbarSearch() {
    const searchInput = document.getElementById('exerciseSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (!searchInput) {
        console.warn('⚠️ Search input not found');
        return;
    }

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }

        // Debounce search
        searchTimeout = setTimeout(() => {
            window.currentFilters.search = query;
            if (window.applyFiltersAndRender) {
                window.applyFiltersAndRender(window.currentFilters);
            }
        }, 300);
    });

    // Clear button click handler
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            window.currentFilters.search = '';
            if (window.applyFiltersAndRender) {
                window.applyFiltersAndRender(window.currentFilters);
            }
            searchInput.focus();
        });
    }

    console.log('✅ Toolbar search initialized');
}

/**
 * Cycle through sort options
 */
function cycleExerciseSort() {
    currentSortIndex = (currentSortIndex + 1) % SORT_OPTIONS.length;
    const option = SORT_OPTIONS[currentSortIndex];

    // Update filter state
    window.currentFilters.sortBy = option.value;

    // Update button UI
    const btn = document.getElementById('sortCycleBtn');
    if (btn) {
        const label = btn.querySelector('.sort-label');
        const icon = btn.querySelector('i');
        if (label) label.textContent = option.label;
        if (icon) icon.className = `bx ${option.icon}`;
    }

    // Apply filters with new sort
    if (window.applyFiltersAndRender) {
        window.applyFiltersAndRender(window.currentFilters);
    }

    console.log('🔄 Sort changed to:', option.label);
}

/**
 * Update filter badge count
 */
function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    // Count active filters (excluding search and default sort)
    let filterCount = 0;
    const filters = window.currentFilters;

    if (filters.muscleGroup) filterCount++;
    if (filters.equipment && filters.equipment.length > 0) filterCount++;
    if (filters.difficulty) filterCount++;
    if (filters.exerciseTier && filters.exerciseTier !== '1') filterCount++; // '1' is default
    if (filters.favoritesOnly) filterCount++;
    if (filters.customOnly) filterCount++;

    // Show/hide badge
    if (filterCount > 0) {
        badge.textContent = filterCount;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Initialize filter button to open offcanvas
 */
function initFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    if (!filterBtn) return;

    filterBtn.addEventListener('click', () => {
        // Check if UnifiedOffcanvasFactory is available
        if (window.UnifiedOffcanvasFactory) {
            window.UnifiedOffcanvasFactory.createExerciseFilterOffcanvas({
                muscleGroups: window.getUniqueMuscleGroups ? window.getUniqueMuscleGroups() : [],
                equipment: window.getUniqueEquipment ? window.getUniqueEquipment() : [],
                currentFilters: window.currentFilters
            }, (filters) => {
                // Merge new filters with current state
                Object.assign(window.currentFilters, filters);
                if (window.applyFiltersAndRender) {
                    window.applyFiltersAndRender(window.currentFilters);
                }
            });
        } else {
            console.warn('⚠️ UnifiedOffcanvasFactory not available');
        }
    });

    console.log('✅ Filter button initialized');
}

/**
 * Initialize sort button click handler
 */
function initSortButton() {
    const sortBtn = document.getElementById('sortCycleBtn');
    if (!sortBtn) return;

    sortBtn.addEventListener('click', cycleExerciseSort);
    console.log('✅ Sort button initialized');
}

/**
 * Initialize custom filter toggle button
 */
function initCustomToggle() {
    const btn = document.getElementById('customToggleBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Toggle custom only filter
        window.currentFilters.customOnly = !window.currentFilters.customOnly;

        // Update button visual state
        btn.classList.toggle('active', window.currentFilters.customOnly);

        // Update icon (filled when active)
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = window.currentFilters.customOnly ? 'bx bxs-user' : 'bx bx-user';
        }

        // Apply filters
        if (window.applyFiltersAndRender) {
            window.applyFiltersAndRender(window.currentFilters);
        }

        console.log('🔄 Custom filter toggled:', window.currentFilters.customOnly ? 'ON' : 'OFF');
    });

    console.log('✅ Custom toggle initialized');
}

/**
 * Initialize all toolbar components
 */
function initExerciseToolbar() {
    initToolbarSearch();
    initSortButton();
    initFilterButton();
    initCustomToggle();
    console.log('✅ Exercise toolbar initialized');
}

// Export for global access
window.initToolbarSearch = initToolbarSearch;
window.cycleExerciseSort = cycleExerciseSort;
window.updateFilterBadge = updateFilterBadge;
window.initFilterButton = initFilterButton;
window.initSortButton = initSortButton;
window.initCustomToggle = initCustomToggle;
window.initExerciseToolbar = initExerciseToolbar;
window.SORT_OPTIONS = SORT_OPTIONS;

console.log('📦 Exercise Toolbar module loaded');
