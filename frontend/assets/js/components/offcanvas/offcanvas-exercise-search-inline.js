/**
 * Ghost Gym - Inline Exercise Search (Push/Pop within Editor)
 * Shows exercise search UI inside the exercise group editor offcanvas,
 * hiding the editor content and restoring it on back/select.
 * Same push/pop pattern as offcanvas-exercise-detail-view.js
 *
 * @module offcanvas-exercise-search-inline
 * @version 1.0.0
 */

import { escapeHtml } from './offcanvas-helpers.js';
import { createExerciseFilterOffcanvas } from './offcanvas-exercise-filter.js';
import { showExerciseDetailInSearch } from './offcanvas-exercise-detail-view.js';

const SEARCH_PANEL_ID = 'exerciseSearchInlinePanel';

/**
 * Show exercise search inside the editor offcanvas (push/pop pattern)
 * @param {Object} config
 * @param {HTMLElement} config.offcanvasElement - The editor offcanvas DOM element
 * @param {string} config.title - Search title (e.g. 'Select Primary Exercise')
 * @param {string} config.initialQuery - Pre-fill search input
 * @param {string} config.buttonText - Selection button text
 * @param {string} config.buttonIcon - Selection button icon class
 * @param {Function} onSelectExercise - Callback when exercise is selected
 */
export function showExerciseSearchInEditor(config, onSelectExercise) {
    const {
        offcanvasElement,
        title = 'Search Exercises',
        initialQuery = '',
        buttonText = 'Select',
        buttonIcon = 'bx-check'
    } = config;

    if (!offcanvasElement) {
        console.error('showExerciseSearchInEditor: offcanvasElement required');
        return;
    }

    const header = offcanvasElement.querySelector('.offcanvas-header');
    const body = offcanvasElement.querySelector('.offcanvas-body');

    // --- PUSH: Hide editor content, show search ---

    // Save original header children (preserve DOM nodes + listeners)
    const savedHeaderNodes = Array.from(header.childNodes);

    // Hide all body children with d-none
    Array.from(body.children).forEach(child => {
        child.dataset.searchHidden = 'true';
        child.classList.add('d-none');
    });

    // Replace header
    header.innerHTML = '';
    header.insertAdjacentHTML('beforeend', `
        <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="searchInlineBackBtn">
            <i class="bx bx-arrow-back"></i>
        </button>
        <h5 class="offcanvas-title text-truncate mb-0">
            <i class="bx bx-search me-2"></i>${escapeHtml(title)}
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    `);

    // Create search panel
    const searchPanel = document.createElement('div');
    searchPanel.id = SEARCH_PANEL_ID;
    searchPanel.className = 'd-flex flex-column';
    searchPanel.style.flexGrow = '1';
    searchPanel.style.overflow = 'hidden';
    searchPanel.innerHTML = `
        <!-- Search Box -->
        <div class="search-section p-3 border-bottom">
            <label class="form-label fw-semibold mb-2">Exercise Name</label>
            <div class="input-group" style="gap: 0.25rem;">
                <input type="text" class="form-control" id="inlineSearchInput"
                       placeholder="Enter exercise name" autocomplete="off" style="padding-right: 0.75rem;"
                       value="${escapeHtml(initialQuery)}">
                <button class="btn btn-outline-secondary" type="button" id="inlineFilterBtn" title="Filters">
                    <i class="bx bx-filter-alt"></i>
                </button>
                <button class="btn btn-outline-secondary" type="button" id="inlineClearSearchBtn" title="Clear"
                        style="display: ${initialQuery ? 'block' : 'none'};">
                    <i class="bx bx-x"></i>
                </button>
            </div>
        </div>

        <!-- Exercise List -->
        <div class="exercise-list-section flex-grow-1 d-flex flex-column" style="overflow: hidden;">
            <div class="p-3 pb-2 border-bottom bg-light">
                <h6 class="mb-0 text-muted small">
                    <i class="bx bx-book-open me-2"></i>Exercise Library
                </h6>
            </div>

            <div id="inlineExerciseList" class="p-3 flex-grow-1" style="overflow-y: auto;"></div>

            <!-- Pagination -->
            <div class="p-2 border-top bg-light" id="inlinePaginationFooter" style="display: none; position: sticky; bottom: 0; z-index: 1020;">
                <div class="text-center">
                    <small class="text-muted d-block mb-2" id="inlinePageInfo"></small>
                    <div class="d-flex justify-content-center" id="inlinePaginationControls"></div>
                </div>
            </div>

            <!-- Empty State -->
            <div id="inlineEmptyState" class="text-center py-5" style="display: none;">
                <i class="bx bx-search-alt display-1 text-muted"></i>
                <p class="text-muted mt-3">No exercises found</p>
                <small class="text-muted d-block">Try adjusting your filters</small>
            </div>

            <!-- Loading State -->
            <div id="inlineLoadingState" class="text-center py-5" style="display: none;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3">Loading exercises...</p>
            </div>
        </div>
    `;
    body.appendChild(searchPanel);

    // --- Wire up search functionality ---

    const searchCore = new window.ExerciseSearchCore(config);
    const searchInput = searchPanel.querySelector('#inlineSearchInput');
    const filterBtn = searchPanel.querySelector('#inlineFilterBtn');
    const clearBtn = searchPanel.querySelector('#inlineClearSearchBtn');
    const exerciseListContainer = searchPanel.querySelector('#inlineExerciseList');
    const paginationFooter = searchPanel.querySelector('#inlinePaginationFooter');
    const pageInfo = searchPanel.querySelector('#inlinePageInfo');
    const paginationControls = searchPanel.querySelector('#inlinePaginationControls');
    const emptyState = searchPanel.querySelector('#inlineEmptyState');
    const loadingState = searchPanel.querySelector('#inlineLoadingState');

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
                                    ${equipment ? `<span class="text-muted small">&bull; ${escapeHtml(equipment)}</span>` : ''}
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

        let html = '<nav aria-label="Exercise pagination"><ul class="pagination pagination-sm mb-0 justify-content-center">';

        html += `<li class="page-item ${paginationData.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" data-page="${paginationData.currentPage - 1}">
                <i class="bx bx-chevron-left"></i></a></li>`;

        const maxButtons = 5;
        let startPage = Math.max(1, paginationData.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(paginationData.totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === paginationData.currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a></li>`;
        }

        html += `<li class="page-item ${paginationData.currentPage === paginationData.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" data-page="${paginationData.currentPage + 1}">
                <i class="bx bx-chevron-right"></i></a></li>`;

        html += '</ul></nav>';
        paginationControls.innerHTML = html;

        paginationControls.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                searchCore.goToPage(parseInt(link.dataset.page));
            });
        });
    };

    // Search core events
    searchCore.addListener((event, data) => {
        if (event === 'loadingStart') {
            loadingState.style.display = 'block';
            exerciseListContainer.style.display = 'none';
            emptyState.style.display = 'none';
        } else if (event === 'loadingEnd') {
            loadingState.style.display = 'none';
        } else if (event === 'filtered' || event === 'paginated') {
            renderExerciseList();
            if (event === 'paginated') renderPagination(data);
        }
    });

    // Load exercises
    searchCore.loadExercises().then(() => {
        if (initialQuery) {
            searchCore.setSearchQuery(initialQuery);
        }
    });

    // --- POP: Restore editor content ---
    const restoreEditor = () => {
        searchPanel.remove();

        Array.from(body.children).forEach(child => {
            if (child.dataset.searchHidden === 'true') {
                child.classList.remove('d-none');
                delete child.dataset.searchHidden;
            }
        });

        header.innerHTML = '';
        savedHeaderNodes.forEach(node => header.appendChild(node));
    };

    // Back button
    header.querySelector('#searchInlineBackBtn')?.addEventListener('click', restoreEditor);

    // Input handlers
    searchInput?.addEventListener('input', (e) => {
        const value = e.target.value;
        searchCore.setSearchQuery(value);
        if (clearBtn) clearBtn.style.display = value.trim() ? 'block' : 'none';
    });

    clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        searchCore.setSearchQuery('');
        clearBtn.style.display = 'none';
        searchInput.focus();
    });

    // Filter button
    filterBtn?.addEventListener('click', () => {
        const muscleGroups = searchCore.getUniqueMuscleGroups();
        const equipment = searchCore.getUniqueEquipment();
        const currentState = searchCore.getState();

        createExerciseFilterOffcanvas({
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
            searchCore
        }, (filters) => {
            searchCore.setMuscleGroup(filters.muscleGroup);
            searchCore.setDifficulty(filters.difficulty);
            searchCore.setEquipment(filters.equipment);
            searchCore.setFavoritesOnly(filters.favoritesOnly);
            searchCore.setSort(filters.sortBy, filters.sortOrder);
        });
    });

    // Exercise detail view (push another level)
    exerciseListContainer.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('button[data-detail-id]');
        if (!detailBtn) return;

        const exerciseId = detailBtn.dataset.detailId;
        const exercise = searchCore.state.filteredExercises.find(ex =>
            (ex.id || ex.name) === exerciseId
        );
        if (!exercise) return;

        showExerciseDetailInSearch(exercise, {
            offcanvasElement: offcanvasElement,
            showAddButton: true,
            onAdd: async (ex) => {
                if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                    const currentUser = window.dataManager.getCurrentUser();
                    const userId = currentUser?.uid || null;
                    await window.exerciseCacheService.autoCreateIfNeeded(ex.name, userId);
                }
                onSelectExercise(ex);
                restoreEditor();
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

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                const currentUser = window.dataManager.getCurrentUser();
                const userId = currentUser?.uid || null;
                await window.exerciseCacheService.autoCreateIfNeeded(exercise.name, userId);
            }

            onSelectExercise(exercise);
            restoreEditor();
        } catch (error) {
            console.error('Error selecting exercise:', error);
            button.disabled = false;
            button.innerHTML = `<i class="bx ${buttonIcon} me-1"></i>${buttonText}`;
        }
    });

    // Focus search input
    setTimeout(() => searchInput?.focus(), 100);
}

console.log('offcanvas-exercise-search-inline loaded');
