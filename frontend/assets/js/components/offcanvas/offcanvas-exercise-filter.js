/**
 * Ghost Gym - Exercise Filter Offcanvas
 * List-style filter panel with checkmarks, collapsible sections, and live preview count
 *
 * @module offcanvas-exercise-filter
 * @version 4.0.0
 * @date 2026-02-21
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Create exercise filter offcanvas with list-style selections
 * @param {Object} config - Filter configuration
 * @param {Array} config.muscleGroups - Available muscle groups
 * @param {Array} config.equipment - Available equipment
 * @param {Object} config.currentFilters - Current filter state
 * @param {Function} onApply - Callback when filters are applied
 * @returns {Object} Offcanvas instance
 */
export function createExerciseFilterOffcanvas(config, onApply) {
    const {
        muscleGroups = [],
        equipment = [],
        currentFilters = {
            muscleGroup: '',
            difficulty: '',
            equipment: [],
            favoritesOnly: false,
            sortBy: 'name',
            sortOrder: 'asc'
        },
        searchCore = null,  // Accept search core for preview count
        triggerEl = null    // Trigger button for popover positioning on desktop
    } = config;

    // Track filter state
    const filterState = { ...currentFilters };

    const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
    const sortOptions = [
        { value: 'name-asc', label: 'Name (A-Z)' },
        { value: 'name-desc', label: 'Name (Z-A)' },
        { value: 'muscle', label: 'Muscle Group' },
        { value: 'tier', label: 'Standard First' }
    ];

    const renderCheckmark = (isSelected) => {
        return isSelected
            ? '<i class="bx bx-check text-primary fw-bold" style="font-size: 1.25rem;"></i>'
            : '<span style="width: 20px; display: inline-block;"></span>';
    };

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-popover" tabindex="-1"
             id="exerciseFilterOffcanvas" data-bs-scroll="false" style="height: 85vh;">

            <!-- Header with Clear/Cancel (smaller buttons, right-aligned) -->
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title">
                    <i class="bx bx-filter-alt me-2"></i>Filters
                </h5>
                <div class="d-flex gap-1 ms-auto">
                    <button type="button" class="btn btn-xs btn-outline-secondary px-2 py-1" id="clearAllFiltersBtn" style="font-size: 0.75rem;">
                        Clear
                    </button>
                    <button type="button" class="btn btn-xs btn-outline-secondary px-2 py-1" id="cancelFiltersBtn" style="font-size: 0.75rem;">
                        Cancel
                    </button>
                </div>
            </div>

            <!-- Body - Scrollable list of filters -->
            <div class="offcanvas-body p-0 pb-0" style="overflow-y: auto;">
                <!-- Muscle Group Section (Multi-select) -->
                <div class="filter-category border-bottom">
                    <div class="filter-category-header p-3 bg-light d-flex align-items-center"
                         role="button" data-bs-toggle="collapse"
                         data-bs-target="#filterCollapse_muscleGroup"
                         aria-expanded="false" aria-controls="filterCollapse_muscleGroup">
                        <h6 class="mb-0 fw-semibold flex-grow-1">Muscle Group</h6>
                        <span class="filter-active-badge badge bg-primary rounded-pill ms-2"
                              style="display:none" id="filterBadge_muscleGroup"></span>
                        <i class="bx bx-chevron-down filter-chevron ms-1" style="font-size:1.25rem;"></i>
                    </div>
                    <div class="collapse" id="filterCollapse_muscleGroup">
                        <div class="filter-options">
                            <div class="filter-option p-3 border-bottom" data-filter="muscleGroup" data-value="">
                                <div class="d-flex align-items-center">
                                    <span class="checkmark me-3">${renderCheckmark(!Array.isArray(filterState.muscleGroup) || filterState.muscleGroup.length === 0)}</span>
                                    <span class="flex-grow-1 fw-semibold">All Muscle Groups</span>
                                </div>
                            </div>
                            ${muscleGroups.map(mg => `
                                <div class="filter-option p-3 border-bottom" data-filter="muscleGroup" data-value="${escapeHtml(mg)}">
                                    <div class="d-flex align-items-center">
                                        <span class="checkmark me-3">${renderCheckmark(Array.isArray(filterState.muscleGroup) ? filterState.muscleGroup.includes(mg) : filterState.muscleGroup === mg)}</span>
                                        <span class="flex-grow-1">${escapeHtml(mg)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Difficulty Section -->
                <div class="filter-category border-bottom">
                    <div class="filter-category-header p-3 bg-light d-flex align-items-center"
                         role="button" data-bs-toggle="collapse"
                         data-bs-target="#filterCollapse_difficulty"
                         aria-expanded="false" aria-controls="filterCollapse_difficulty">
                        <h6 class="mb-0 fw-semibold flex-grow-1">Difficulty</h6>
                        <span class="filter-active-badge badge bg-primary rounded-pill ms-2"
                              style="display:none" id="filterBadge_difficulty"></span>
                        <i class="bx bx-chevron-down filter-chevron ms-1" style="font-size:1.25rem;"></i>
                    </div>
                    <div class="collapse" id="filterCollapse_difficulty">
                        <div class="filter-options">
                            <div class="filter-option p-3 border-bottom" data-filter="difficulty" data-value="">
                                <div class="d-flex align-items-center">
                                    <span class="checkmark me-3">${renderCheckmark(!filterState.difficulty)}</span>
                                    <span class="flex-grow-1">All Levels</span>
                                </div>
                            </div>
                            ${difficulties.map(diff => `
                                <div class="filter-option p-3 border-bottom" data-filter="difficulty" data-value="${diff}">
                                    <div class="d-flex align-items-center">
                                        <span class="checkmark me-3">${renderCheckmark(filterState.difficulty === diff)}</span>
                                        <span class="flex-grow-1">${diff}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Equipment Section (Multi-select) -->
                <div class="filter-category border-bottom">
                    <div class="filter-category-header p-3 bg-light d-flex align-items-center"
                         role="button" data-bs-toggle="collapse"
                         data-bs-target="#filterCollapse_equipment"
                         aria-expanded="false" aria-controls="filterCollapse_equipment">
                        <h6 class="mb-0 fw-semibold flex-grow-1">Equipment</h6>
                        <span class="filter-active-badge badge bg-primary rounded-pill ms-2"
                              style="display:none" id="filterBadge_equipment"></span>
                        <i class="bx bx-chevron-down filter-chevron ms-1" style="font-size:1.25rem;"></i>
                    </div>
                    <div class="collapse" id="filterCollapse_equipment">
                        <div class="filter-options">
                            ${equipment.map(eq => `
                                <div class="filter-option p-3 border-bottom" data-filter="equipment" data-value="${escapeHtml(eq)}">
                                    <div class="d-flex align-items-center">
                                        <span class="checkmark me-3">${renderCheckmark(filterState.equipment.includes(eq))}</span>
                                        <span class="flex-grow-1">${escapeHtml(eq)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Sort By Section -->
                <div class="filter-category border-bottom">
                    <div class="filter-category-header p-3 bg-light d-flex align-items-center"
                         role="button" data-bs-toggle="collapse"
                         data-bs-target="#filterCollapse_sort"
                         aria-expanded="false" aria-controls="filterCollapse_sort">
                        <h6 class="mb-0 fw-semibold flex-grow-1">Sort By</h6>
                        <span class="filter-active-badge badge bg-primary rounded-pill ms-2"
                              style="display:none" id="filterBadge_sort"></span>
                        <i class="bx bx-chevron-down filter-chevron ms-1" style="font-size:1.25rem;"></i>
                    </div>
                    <div class="collapse" id="filterCollapse_sort">
                        <div class="filter-options">
                            ${sortOptions.map(opt => {
                                const currentSort = `${filterState.sortBy}-${filterState.sortOrder}`;
                                return `
                                    <div class="filter-option p-3 border-bottom" data-filter="sort" data-value="${opt.value}">
                                        <div class="d-flex align-items-center">
                                            <span class="checkmark me-3">${renderCheckmark(currentSort === opt.value)}</span>
                                            <span class="flex-grow-1">${opt.label}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Favorites Toggle -->
                <div class="filter-category">
                    <div class="filter-option p-3" data-filter="favorites" data-value="toggle">
                        <div class="d-flex align-items-center">
                            <span class="checkmark me-3">${renderCheckmark(filterState.favoritesOnly)}</span>
                            <span class="flex-grow-1">Favorites Only</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer - Apply Button -->
            <div class="offcanvas-footer border-top p-3">
                <button type="button" class="btn btn-primary w-100" id="applyFiltersBtn">
                    <span id="applyBtnText">Apply</span>
                </button>
            </div>
        </div>
    `;

    return createOffcanvas('exerciseFilterOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Position as popover near trigger button on desktop
        if (triggerEl && document.documentElement.classList.contains('desktop-view')) {
            const rect = triggerEl.getBoundingClientRect();
            let top = rect.bottom + 8;
            let left = rect.left;

            // Keep within viewport bounds
            const popoverWidth = 360;
            const popoverMaxHeight = window.innerHeight * 0.7;
            if (left + popoverWidth > window.innerWidth - 16) {
                left = window.innerWidth - popoverWidth - 16;
            }
            if (top + popoverMaxHeight > window.innerHeight - 16) {
                top = Math.max(16, window.innerHeight - popoverMaxHeight - 16);
            }

            element.style.setProperty('--popover-top', `${top}px`);
            element.style.setProperty('--popover-left', `${left}px`);
        }

        // Function to update preview count
        const updatePreviewCount = () => {
            if (!searchCore) return;

            const count = searchCore.previewFilterCount(filterState);
            const applyBtnText = element.querySelector('#applyBtnText');

            if (applyBtnText) {
                applyBtnText.textContent = count > 0 ? `Show ${count} exercises` : 'No exercises';
            }
        };

        // Update active filter badges on section headers
        const updateFilterBadges = () => {
            const mgBadge = element.querySelector('#filterBadge_muscleGroup');
            if (mgBadge) {
                const mgCount = Array.isArray(filterState.muscleGroup) ? filterState.muscleGroup.length : (filterState.muscleGroup ? 1 : 0);
                if (mgCount > 0) {
                    mgBadge.textContent = mgCount;
                    mgBadge.style.display = '';
                } else {
                    mgBadge.style.display = 'none';
                }
            }
            const diffBadge = element.querySelector('#filterBadge_difficulty');
            if (diffBadge) {
                if (filterState.difficulty) {
                    diffBadge.textContent = filterState.difficulty;
                    diffBadge.style.display = '';
                } else {
                    diffBadge.style.display = 'none';
                }
            }
            const eqBadge = element.querySelector('#filterBadge_equipment');
            if (eqBadge) {
                if (filterState.equipment.length > 0) {
                    eqBadge.textContent = filterState.equipment.length;
                    eqBadge.style.display = '';
                } else {
                    eqBadge.style.display = 'none';
                }
            }
            const sortBadge = element.querySelector('#filterBadge_sort');
            if (sortBadge) {
                const currentSort = `${filterState.sortBy}-${filterState.sortOrder}`;
                if (currentSort !== 'name-asc') {
                    const sortOpt = sortOptions.find(o => o.value === currentSort);
                    sortBadge.textContent = sortOpt ? sortOpt.label : 'Custom';
                    sortBadge.style.display = '';
                } else {
                    sortBadge.style.display = 'none';
                }
            }
        };

        // Get all filter options
        const filterOptions = element.querySelectorAll('.filter-option');

        // Update checkmark display
        const updateCheckmark = (option, isSelected) => {
            const checkmark = option.querySelector('.checkmark');
            if (checkmark) {
                checkmark.innerHTML = isSelected
                    ? '<i class="bx bx-check text-primary fw-bold" style="font-size: 1.25rem;"></i>'
                    : '<span style="width: 20px; display: inline-block;"></span>';
            }
        };

        // Handle filter option clicks
        filterOptions.forEach(option => {
            option.addEventListener('click', () => {
                const filterType = option.dataset.filter;
                const value = option.dataset.value;

                if (filterType === 'muscleGroup') {
                    // Handle "All" option (value is empty string)
                    if (value === '') {
                        // Clear all muscle group selections
                        filterState.muscleGroup = [];
                        // Update all checkmarks
                        element.querySelectorAll('[data-filter="muscleGroup"]').forEach(opt => {
                            updateCheckmark(opt, opt.dataset.value === '');
                        });
                    } else {
                        // Multi-select - toggle individual muscle group
                        if (!Array.isArray(filterState.muscleGroup)) {
                            filterState.muscleGroup = filterState.muscleGroup ? [filterState.muscleGroup] : [];
                        }
                        const isSelected = filterState.muscleGroup.includes(value);
                        if (isSelected) {
                            filterState.muscleGroup = filterState.muscleGroup.filter(mg => mg !== value);
                        } else {
                            filterState.muscleGroup.push(value);
                        }

                        // Update checkmarks for this option and "All"
                        updateCheckmark(option, !isSelected);
                        const allOption = element.querySelector('[data-filter="muscleGroup"][data-value=""]');
                        if (allOption) {
                            updateCheckmark(allOption, filterState.muscleGroup.length === 0);
                        }
                    }

                } else if (filterType === 'difficulty') {
                    // Single select - clear others
                    element.querySelectorAll('[data-filter="difficulty"]').forEach(opt => {
                        updateCheckmark(opt, opt === option);
                    });
                    filterState.difficulty = value;

                } else if (filterType === 'equipment') {
                    // Multi-select - toggle
                    const isSelected = filterState.equipment.includes(value);
                    if (isSelected) {
                        filterState.equipment = filterState.equipment.filter(eq => eq !== value);
                    } else {
                        filterState.equipment.push(value);
                    }
                    updateCheckmark(option, !isSelected);

                } else if (filterType === 'sort') {
                    // Single select - clear others
                    element.querySelectorAll('[data-filter="sort"]').forEach(opt => {
                        updateCheckmark(opt, opt === option);
                    });
                    const [sortBy, sortOrder] = value.split('-');
                    filterState.sortBy = sortBy;
                    filterState.sortOrder = sortOrder || 'asc';

                } else if (filterType === 'favorites') {
                    // Toggle
                    filterState.favoritesOnly = !filterState.favoritesOnly;
                    updateCheckmark(option, filterState.favoritesOnly);
                }

                // Update preview count and badges after any filter change
                updatePreviewCount();
                updateFilterBadges();
            });
        });

        // Initialize preview count and badges
        updatePreviewCount();
        updateFilterBadges();

        // Apply button
        element.querySelector('#applyFiltersBtn')?.addEventListener('click', () => {
            onApply(filterState);
            offcanvas.hide();
        });

        // Clear all filters button - immediately apply and close
        element.querySelector('#clearAllFiltersBtn')?.addEventListener('click', () => {
            // Reset all filters to default
            filterState.muscleGroup = [];
            filterState.difficulty = '';
            filterState.equipment = [];
            filterState.favoritesOnly = false;
            filterState.sortBy = 'name';
            filterState.sortOrder = 'asc';

            // Apply the cleared filters immediately
            onApply(filterState);

            // Close the offcanvas
            offcanvas.hide();
        });

        // Cancel button
        element.querySelector('#cancelFiltersBtn')?.addEventListener('click', () => {
            offcanvas.hide();
        });

        // Initialize preview count
        updatePreviewCount();
    });
}

console.log('📦 Offcanvas exercise filter loaded');
