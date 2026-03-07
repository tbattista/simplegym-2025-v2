/**
 * Ghost Gym - Exercise Search Offcanvas
 * Standalone exercise search with filters, powered by ExerciseSearchCore
 *
 * @module offcanvas-exercise-search
 * @version 4.0.0
 * @date 2026-02-21
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';
import { createExerciseFilterOffcanvas } from './offcanvas-exercise-filter.js';
import { showExerciseDetailInSearch } from './offcanvas-exercise-detail-view.js';

/**
 * Create standalone exercise search offcanvas
 * REUSABLE across entire app - can be used anywhere that needs exercise selection
 * @param {Object} config - Configuration options
 * @param {string} config.title - Offcanvas title (default: 'Search Exercises')
 * @param {boolean} config.showFilters - Show filter section (default: true)
 * @param {string} config.buttonText - Selection button text (default: 'Select')
 * @param {string} config.buttonIcon - Selection button icon (default: 'bx-check')
 * @param {Function} onSelectExercise - Callback when exercise is selected
 * @returns {Object} Offcanvas instance
 */
export function createExerciseSearchOffcanvas(config = {}, onSelectExercise) {
    const {
        title = 'Search Exercises',
        showFilters = true,
        buttonText = 'Select',
        buttonIcon = 'bx-check',
        initialQuery = ''
    } = config;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-side"
             tabindex="-1" id="exerciseSearchOffcanvas"
             data-bs-scroll="false" style="height: 85vh;">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="exerciseSearchOffcanvasLabel">
                    <i class="bx bx-search me-2"></i>${escapeHtml(title)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body p-0 d-flex flex-column">
                <!-- Search Box -->
                <div class="search-section p-3 border-bottom">
                    <label class="form-label fw-semibold mb-2">Exercise Name</label>
                    <div class="input-group" style="gap: 0.25rem;">
                        <input type="text" class="form-control" id="exerciseSearchInput"
                               placeholder="Enter exercise name" autocomplete="off" style="padding-right: 0.75rem;">
                        <button class="btn btn-outline-secondary" type="button" id="filterExercisesBtn" title="Filters">
                            <i class="bx bx-filter-alt"></i>
                        </button>
                        <button class="btn btn-outline-secondary" type="button" id="searchExercisesBtn" title="Search library">
                            <i class="bx bx-search"></i>
                        </button>
                        <button class="btn btn-outline-secondary" type="button" id="clearSearchBtn" title="Clear" style="display: none;">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                </div>

                <!-- Exercise List -->
                <div class="exercise-list-section flex-grow-1 d-flex flex-column">
                    <div class="p-3 pb-2 border-bottom bg-light">
                        <h6 class="mb-0 text-muted small">
                            <i class="bx bx-book-open me-2"></i>Exercise Library
                        </h6>
                    </div>

                    <div id="exerciseListContainer" class="p-3 flex-grow-1" style="overflow-y: auto;">
                        <!-- Rendered by search core -->
                    </div>

                    <!-- Pagination -->
                    <div class="p-2 border-top bg-light" id="paginationFooter" style="display: none; position: sticky; bottom: 0; z-index: 1020;">
                        <div class="text-center">
                            <small class="text-muted d-block mb-2" id="pageInfo"></small>
                            <div class="d-flex justify-content-center" id="paginationControls"></div>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" class="text-center py-5" style="display: none;">
                        <i class="bx bx-search-alt display-1 text-muted"></i>
                        <p class="text-muted mt-3">No exercises found</p>
                        <small class="text-muted d-block">Try adjusting your filters</small>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted mt-3">Loading exercises...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    return createOffcanvas('exerciseSearchOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Initialize search core
        const searchCore = new window.ExerciseSearchCore(config);

        // Get DOM elements
        const searchInput = element.querySelector('#exerciseSearchInput');
        const filterBtn = element.querySelector('#filterExercisesBtn');
        const searchBtn = element.querySelector('#searchExercisesBtn');
        const clearBtn = element.querySelector('#clearSearchBtn');
        const exerciseListContainer = element.querySelector('#exerciseListContainer');
        const paginationFooter = element.querySelector('#paginationFooter');
        const pageInfo = element.querySelector('#pageInfo');
        const paginationControls = element.querySelector('#paginationControls');
        const emptyState = element.querySelector('#emptyState');
        const loadingState = element.querySelector('#loadingState');

        // Render exercise list
        const renderExerciseList = () => {
            const exercises = searchCore.state.paginatedExercises;

            if (exercises.length === 0) {
                exerciseListContainer.style.display = 'none';
                emptyState.style.display = 'block';
                paginationFooter.style.display = 'none';
                return;
            }

            exerciseListContainer.style.display = 'block';
            emptyState.style.display = 'none';

            exerciseListContainer.innerHTML = exercises.map(exercise => {
                const tier = exercise.exerciseTier || '1';
                const difficulty = exercise.difficulty || 'Intermediate';
                const muscle = exercise.targetMuscleGroup || '';
                const equipment = exercise.primaryEquipment || 'None';

                const tierBadge = (parseInt(tier) === 3)
                    ? '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>'
                    : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(100, 116, 139, 0.1); color: #64748B; border: 1px solid rgba(100, 116, 139, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';

                const difficultyColors = { 'B': 'success', 'I': 'warning', 'A': 'danger' };
                const diffAbbr = difficulty.charAt(0).toUpperCase();
                const diffColor = difficultyColors[diffAbbr] || 'secondary';
                const difficultyBadge = `<span class="badge badge-outline-${diffColor}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background: transparent;">${difficulty}</span>`;

                return `
                    <div class="card mb-2">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="flex-grow-1">
                                    <div class="fw-semibold mb-2">${escapeHtml(exercise.name)}</div>
                                    <div class="d-flex gap-2 flex-wrap align-items-center">
                                        ${tierBadge}
                                        ${difficultyBadge}
                                        ${muscle ? `<span class="text-muted small">${escapeHtml(muscle)}</span>` : ''}
                                        ${equipment ? `<span class="text-muted small">• ${escapeHtml(equipment)}</span>` : ''}
                                    </div>
                                </div>
                                <div class="flex-shrink-0 ms-3 d-flex gap-1">
                                    <button class="btn btn-sm btn-outline-secondary" data-detail-id="${escapeHtml(exercise.id || exercise.name)}" title="View details">
                                        <i class="bx bx-info-circle"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" data-exercise-id="${escapeHtml(exercise.id || exercise.name)}">
                                        <i class="bx ${buttonIcon} me-1"></i>${buttonText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Render pagination
        const renderPagination = (paginationData) => {
            if (paginationData.totalPages <= 1) {
                paginationFooter.style.display = 'none';
                return;
            }

            paginationFooter.style.display = 'block';
            pageInfo.textContent = `Showing ${paginationData.startIdx}-${paginationData.endIdx} of ${paginationData.total}`;

            // Render Bootstrap 5 pagination with center alignment
            let paginationHtml = '<nav aria-label="Exercise pagination"><ul class="pagination pagination-sm mb-0 justify-content-center">';

            // Previous button
            paginationHtml += `
                <li class="page-item ${paginationData.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${paginationData.currentPage - 1}">
                        <i class="bx bx-chevron-left"></i>
                    </a>
                </li>`;

            // Page buttons (show max 9 pages)
            const maxButtons = 9;
            let startPage = Math.max(1, paginationData.currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(paginationData.totalPages, startPage + maxButtons - 1);

            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <li class="page-item ${i === paginationData.currentPage ? 'active' : ''}">
                        <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                    </li>`;
            }

            // Next button
            paginationHtml += `
                <li class="page-item ${paginationData.currentPage === paginationData.totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${paginationData.currentPage + 1}">
                        <i class="bx bx-chevron-right"></i>
                    </a>
                </li>`;

            paginationHtml += '</ul></nav>';

            paginationControls.innerHTML = paginationHtml;

            // Attach click handlers
            paginationControls.querySelectorAll('[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(link.dataset.page);
                    searchCore.goToPage(page);
                });
            });
        };

        // Listen to search core events
        searchCore.addListener((event, data) => {
            if (event === 'loadingStart') {
                loadingState.style.display = 'block';
                exerciseListContainer.style.display = 'none';
                emptyState.style.display = 'none';
            } else if (event === 'loadingEnd') {
                loadingState.style.display = 'none';
            } else if (event === 'paginated') {
                renderExerciseList();
                renderPagination(data);
            }
        });

        // Create filter offcanvas
        let filterOffcanvas = null;

        const openFiltersOffcanvas = () => {
            // Get current filter state
            const muscleGroups = searchCore.getUniqueMuscleGroups();
            const equipment = searchCore.getUniqueEquipment();
            const currentState = searchCore.getState();

            // Create filter offcanvas with search core instance for live count
            filterOffcanvas = createExerciseFilterOffcanvas({
                muscleGroups,
                equipment,
                currentFilters: {
                    muscleGroup: currentState.muscleGroup,
                    difficulty: currentState.difficulty,
                    equipment: currentState.equipment,
                    favoritesOnly: currentState.favoritesOnly,
                    sortBy: currentState.sortBy,
                    sortOrder: currentState.sortOrder
                },
                searchCore: searchCore  // Pass search core for preview count
            }, (filters) => {
                // Apply filters callback
                searchCore.setMuscleGroup(filters.muscleGroup);
                searchCore.setDifficulty(filters.difficulty);
                searchCore.setEquipment(filters.equipment);
                searchCore.setFavoritesOnly(filters.favoritesOnly);
                searchCore.setSort(filters.sortBy, filters.sortOrder);
            });
        };

        // Load exercises
        searchCore.loadExercises().then(() => {
            // Apply initial search query if provided
            if (initialQuery) {
                searchInput.value = initialQuery;
                searchCore.setSearchQuery(initialQuery);
            }
        });

        // Event handlers
        searchInput?.addEventListener('input', (e) => {
            const value = e.target.value;
            searchCore.setSearchQuery(value);

            // Show/hide clear button based on input
            if (clearBtn) {
                clearBtn.style.display = value.trim() ? 'block' : 'none';
            }
        });

        // Clear button handler
        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            searchCore.setSearchQuery('');
            clearBtn.style.display = 'none';
            searchInput.focus();
        });

        // Search button handler (optional - just focuses the input)
        searchBtn?.addEventListener('click', () => {
            searchInput.focus();
        });

        // Filter button handler
        filterBtn?.addEventListener('click', () => {
            openFiltersOffcanvas();
        });

        // Exercise detail view handler (inline push/pop within this offcanvas)
        exerciseListContainer.addEventListener('click', (e) => {
            const detailBtn = e.target.closest('button[data-detail-id]');
            if (!detailBtn) return;

            const exerciseId = detailBtn.dataset.detailId;
            const exercise = searchCore.state.filteredExercises.find(ex =>
                (ex.id || ex.name) === exerciseId
            );
            if (!exercise) return;

            showExerciseDetailInSearch(exercise, {
                offcanvasElement: element,
                showAddButton: true,
                onAdd: async (ex) => {
                    // Auto-create custom exercise if needed
                    if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                        const currentUser = window.dataManager.getCurrentUser();
                        const userId = currentUser?.uid || null;
                        await window.exerciseCacheService.autoCreateIfNeeded(ex.name, userId);
                    }
                    onSelectExercise(ex);
                    offcanvas.hide();
                }
            });
        });

        // Exercise selection handler
        exerciseListContainer.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-exercise-id]');
            if (!button) return;

            const exerciseId = button.dataset.exerciseId;
            const exercise = searchCore.state.filteredExercises.find(ex =>
                (ex.id || ex.name) === exerciseId
            );

            if (!exercise) return;

            // Show loading state
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                // Auto-create custom exercise if needed
                if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                    const currentUser = window.dataManager.getCurrentUser();
                    const userId = currentUser?.uid || null;
                    await window.exerciseCacheService.autoCreateIfNeeded(exercise.name, userId);
                }

                // Call selection callback
                onSelectExercise(exercise);

                // Close offcanvas
                offcanvas.hide();

            } catch (error) {
                console.error('Error selecting exercise:', error);
                button.disabled = false;
                button.innerHTML = `<i class="bx ${buttonIcon} me-1"></i>${buttonText}`;
            }
        });
    });
}

console.log('📦 Offcanvas exercise search loaded');
