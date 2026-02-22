/**
 * Desktop Sidebar Module
 * Always-visible exercise library sidebar for desktop workout builder.
 * Features full toolbar (search, sort, filter, custom toggle),
 * rich exercise cards matching exercise-database.html, and favorites support.
 * @version 2.0.0
 */

class DesktopSidebar {
    constructor() {
        this.searchCore = null;
        this.initialized = false;
        this.sidebarEl = null;
        this.listEl = null;

        // Sort state (mirrors exercise-toolbar.js SORT_OPTIONS)
        this.sortIndex = 0;
        this.SORT_OPTIONS = [
            { value: 'name', label: 'A-Z', icon: 'bx-sort-a-z' },
            { value: 'popularity', label: 'Popular', icon: 'bx-trending-up' },
            { value: 'favorites', label: 'Favorites', icon: 'bx-heart' }
        ];

        // Filter state
        this.filters = {
            search: '',
            sortBy: 'name',
            muscleGroup: '',
            equipment: [],
            difficulty: '',
            customOnly: false,
            favoritesOnly: false
        };
    }

    /**
     * Initialize: load exercises, setup toolbar, render list
     */
    async init() {
        this.sidebarEl = document.getElementById('desktopSidebar');
        this.listEl = document.getElementById('sidebarExerciseList');
        if (!this.listEl) return;

        // Show loading state
        this.listEl.innerHTML = '<div class="sidebar-loading"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><p class="mt-2 mb-0 small">Loading exercises...</p></div>';

        // Initialize ExerciseSearchCore
        this.searchCore = new ExerciseSearchCore({
            pageSize: 50,
            showFavorites: true
        });

        // Listen for search events
        this.searchCore.addListener((event, data) => {
            if (event === 'filtered' || event === 'paginated') {
                this.renderExercises();
            }
        });

        // Load exercises
        await this.searchCore.loadExercises();

        // Ensure ffn.exercises structures exist for favorites
        if (!window.ffn) window.ffn = {};
        if (!window.ffn.exercises) window.ffn.exercises = {};
        if (!window.ffn.exercises.all) window.ffn.exercises.all = [];
        if (!window.ffn.exercises.favorites) window.ffn.exercises.favorites = new Set();
        if (!window.ffn.exercises.custom) window.ffn.exercises.custom = [];
        // Copy loaded exercises into ffn.exercises.all if empty (for showExerciseDetails)
        if (window.ffn.exercises.all.length === 0 && this.searchCore.state.allExercises.length > 0) {
            window.ffn.exercises.all = this.searchCore.state.allExercises;
        }

        // Setup toolbar event listeners
        this.setupToolbar();

        // Setup click delegation on exercise list
        this.setupListClickHandler();

        // Setup native drag from sidebar to editor
        this.initNativeDrag();

        this.initialized = true;
        console.log('✅ Desktop sidebar initialized with', this.searchCore.state.allExercises.length, 'exercises');
    }

    /**
     * Wire up toolbar: search, clear, sort, filter, custom toggle
     */
    setupToolbar() {
        // Search input with debounce
        const searchInput = document.getElementById('sidebarSearch');
        const clearBtn = document.getElementById('sidebarClearSearchBtn');

        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                const query = searchInput.value.trim();
                if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
                debounceTimer = setTimeout(() => {
                    this.filters.search = query;
                    this.searchCore.setSearchQuery(query);
                }, 250);
            });
        }

        // Clear search button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearBtn.style.display = 'none';
                this.filters.search = '';
                this.searchCore.setSearchQuery('');
                if (searchInput) searchInput.focus();
            });
        }

        // Sort cycle button
        const sortBtn = document.getElementById('sidebarSortBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => this.cycleSortOption());
        }

        // Filter button (opens offcanvas)
        const filterBtn = document.getElementById('sidebarFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.openFilterOffcanvas());
        }

        // Custom toggle button
        const customBtn = document.getElementById('sidebarCustomToggleBtn');
        if (customBtn) {
            customBtn.addEventListener('click', () => this.toggleCustomFilter());
        }
    }

    /**
     * Set up click delegation on the exercise list
     */
    setupListClickHandler() {
        if (!this.listEl) return;

        this.listEl.addEventListener('click', (e) => {
            // Add to workout button
            const addBtn = e.target.closest('.sidebar-add-btn');
            if (addBtn) {
                e.preventDefault();
                e.stopPropagation();
                const name = addBtn.dataset.exerciseName;
                if (name) this.addExerciseToWorkout(name);
                return;
            }

            // Favorite button
            const favBtn = e.target.closest('.sidebar-fav-btn');
            if (favBtn) {
                e.preventDefault();
                e.stopPropagation();
                const exerciseId = favBtn.dataset.exerciseId;
                if (exerciseId && window.toggleExerciseFavorite) {
                    window.toggleExerciseFavorite(exerciseId);
                }
                return;
            }

            // View details (click on exercise name/card area)
            const card = e.target.closest('.sidebar-exercise-card');
            if (card && !e.target.closest('button')) {
                e.preventDefault();
                const exerciseId = card.dataset.exerciseId;
                if (exerciseId && window.showExerciseDetails) {
                    window.showExerciseDetails(exerciseId);
                }
            }

            // Load more button
            const loadMore = e.target.closest('.sidebar-load-more');
            if (loadMore) {
                e.preventDefault();
                const nextPage = this.searchCore.state.currentPage + 1;
                this.searchCore.goToPage(nextPage);
                // Append rather than replace
                this.renderExercises(true);
            }
        });
    }

    /**
     * Cycle sort: A-Z → Popular → Favorites
     */
    cycleSortOption() {
        this.sortIndex = (this.sortIndex + 1) % this.SORT_OPTIONS.length;
        const option = this.SORT_OPTIONS[this.sortIndex];

        // Update button UI
        const btn = document.getElementById('sidebarSortBtn');
        if (btn) {
            const label = btn.querySelector('.sort-label');
            const icon = btn.querySelector('i');
            if (label) label.textContent = option.label;
            if (icon) icon.className = `bx ${option.icon}`;
        }

        // Apply sort via ExerciseSearchCore
        this.filters.sortBy = option.value;

        if (option.value === 'popularity') {
            // ExerciseSearchCore doesn't have 'popularity' sort, do manual sort
            this.searchCore.setSort('name', 'asc');
            // Re-sort by popularity after filtering
            this.searchCore.state.filteredExercises.sort((a, b) =>
                (b.popularityScore || 50) - (a.popularityScore || 50)
            );
            this.searchCore.applyPagination();
        } else if (option.value === 'favorites') {
            // Sort favorites first, then by name
            this.searchCore.setSort('name', 'asc');
            const favs = window.ffn?.exercises?.favorites || new Set();
            this.searchCore.state.filteredExercises.sort((a, b) => {
                const aFav = favs.has(a.id) ? 0 : 1;
                const bFav = favs.has(b.id) ? 0 : 1;
                if (aFav !== bFav) return aFav - bFav;
                return (a.name || '').localeCompare(b.name || '');
            });
            this.searchCore.applyPagination();
        } else {
            this.searchCore.setSort('name', 'asc');
        }
    }

    /**
     * Open filter offcanvas via UnifiedOffcanvasFactory
     */
    openFilterOffcanvas() {
        if (!window.UnifiedOffcanvasFactory) {
            console.warn('⚠️ UnifiedOffcanvasFactory not available');
            return;
        }

        const muscleGroups = this.searchCore ? this.searchCore.getUniqueMuscleGroups() : [];
        const equipment = this.searchCore ? this.searchCore.getUniqueEquipment() : [];

        window.UnifiedOffcanvasFactory.createExerciseFilterOffcanvas({
            muscleGroups,
            equipment,
            currentFilters: { ...this.filters }
        }, (newFilters) => {
            // Apply returned filters
            if (newFilters.muscleGroup !== undefined) {
                this.filters.muscleGroup = newFilters.muscleGroup;
                this.searchCore.setMuscleGroup(newFilters.muscleGroup);
            }
            if (newFilters.equipment !== undefined) {
                this.filters.equipment = newFilters.equipment;
                this.searchCore.setEquipment(newFilters.equipment);
            }
            if (newFilters.difficulty !== undefined) {
                this.filters.difficulty = newFilters.difficulty;
                this.searchCore.setDifficulty(newFilters.difficulty);
            }
            if (newFilters.favoritesOnly !== undefined) {
                this.filters.favoritesOnly = newFilters.favoritesOnly;
                this.searchCore.setFavoritesOnly(newFilters.favoritesOnly);
            }
            if (newFilters.customOnly !== undefined) {
                this.filters.customOnly = newFilters.customOnly;
                // customOnly needs manual filtering — refilter
                this.applyCustomFilter();
            }
            this.updateFilterBadge();
        });
    }

    /**
     * Toggle custom-only filter
     */
    toggleCustomFilter() {
        this.filters.customOnly = !this.filters.customOnly;

        const btn = document.getElementById('sidebarCustomToggleBtn');
        if (btn) {
            btn.classList.toggle('active', this.filters.customOnly);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = this.filters.customOnly ? 'bx bxs-user' : 'bx bx-user';
            }
        }

        this.applyCustomFilter();
        this.updateFilterBadge();
    }

    /**
     * Apply custom-only filter by refiltering
     */
    applyCustomFilter() {
        // ExerciseSearchCore doesn't have customOnly, so we refilter manually
        this.searchCore.filterExercises();
        if (this.filters.customOnly) {
            this.searchCore.state.filteredExercises = this.searchCore.state.filteredExercises.filter(
                ex => !ex.isGlobal
            );
            this.searchCore.applyPagination();
        }
    }

    /**
     * Update filter badge count
     */
    updateFilterBadge() {
        const badge = document.getElementById('sidebarFilterBadge');
        if (!badge) return;

        let count = 0;
        if (this.filters.muscleGroup) count++;
        if (this.filters.equipment && this.filters.equipment.length > 0) count++;
        if (this.filters.difficulty) count++;
        if (this.filters.favoritesOnly) count++;
        if (this.filters.customOnly) count++;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Render exercises as rich cards matching exercise-database.html
     */
    renderExercises(append = false) {
        if (!this.listEl || !this.searchCore) return;

        const exercises = this.searchCore.state.paginatedExercises;
        const total = this.searchCore.state.filteredExercises.length;
        const shown = this.searchCore.state.currentPage * this.searchCore.state.pageSize;

        if (exercises.length === 0 && !append) {
            this.listEl.innerHTML = '<div class="sidebar-empty"><i class="bx bx-search" style="font-size:1.5rem"></i><p class="mt-2 mb-0 small">No exercises found</p></div>';
            return;
        }

        const favs = window.ffn?.exercises?.favorites || new Set();

        let html = '';
        exercises.forEach(ex => {
            const name = ex.name || ex.exerciseName || '';
            const muscle = ex.targetMuscleGroup || '';
            const equipment = ex.primaryEquipment || '';
            const difficulty = ex.difficultyLevel || ex.difficulty || '';
            const isCustom = !ex.isGlobal;
            const isFavorited = favs.has(ex.id);
            const exerciseId = ex.id || '';

            const diffBadge = difficulty && window.getDifficultyBadgeWithPopover
                ? window.getDifficultyBadgeWithPopover(difficulty)
                : '';

            html += `
                <div class="sidebar-exercise-card" draggable="true" data-exercise-id="${this.escapeAttr(exerciseId)}" data-exercise-name="${this.escapeAttr(name)}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1" style="min-width:0">
                            <div class="exercise-card-name">
                                ${isCustom ? '<i class="bx bx-user text-primary me-1" style="font-size: 0.8rem;"></i>' : ''}${this.escapeHtml(name)}
                            </div>
                            <div class="exercise-card-meta">
                                ${diffBadge}
                                ${muscle ? `<span class="text-muted">${this.escapeHtml(muscle)}</span>` : ''}
                                ${equipment ? `<span class="text-muted">&bull; ${this.escapeHtml(equipment)}</span>` : ''}
                            </div>
                        </div>
                        <div class="d-flex gap-1 align-items-center flex-shrink-0 sidebar-card-actions">
                            <button type="button" class="btn btn-sm btn-icon sidebar-fav-btn favorite-btn ${isFavorited ? 'text-danger' : ''}"
                                    data-exercise-id="${this.escapeAttr(exerciseId)}"
                                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                                <i class="bx ${isFavorited ? 'bxs-heart' : 'bx-heart'}"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-ghost-primary sidebar-add-btn"
                                    data-exercise-name="${this.escapeAttr(name)}" title="Add to workout">
                                <i class="bx bx-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        });

        // Show count + load more if needed
        if (total > shown) {
            html += `<div class="sidebar-load-more-container">
                <button type="button" class="btn btn-sm btn-outline-secondary w-100 sidebar-load-more">
                    Show more (${shown} of ${total})
                </button>
            </div>`;
        } else if (total > 0) {
            html += `<div class="sidebar-count text-center py-2 small text-muted">${total} exercise${total !== 1 ? 's' : ''}</div>`;
        }

        if (append) {
            // Remove existing load-more button before appending
            const existing = this.listEl.querySelector('.sidebar-load-more-container');
            if (existing) existing.remove();
            const existingCount = this.listEl.querySelector('.sidebar-count');
            if (existingCount) existingCount.remove();
            this.listEl.insertAdjacentHTML('beforeend', html);
        } else {
            this.listEl.innerHTML = html;
        }

        // Initialize popovers for difficulty badges
        setTimeout(() => {
            if (window.initializePopovers) {
                window.initializePopovers();
            }
        }, 50);
    }

    /**
     * Initialize native HTML5 drag on sidebar cards for drag-to-editor
     */
    initNativeDrag() {
        if (!this.listEl) return;

        // Delegated dragstart on list container
        this.listEl.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.sidebar-exercise-card');
            if (!card) return;

            const name = card.dataset.exerciseName;
            if (!name) { e.preventDefault(); return; }

            e.dataTransfer.setData('text/exercise-name', name);
            e.dataTransfer.effectAllowed = 'copy';

            card.classList.add('sidebar-dragging');

            // Highlight editor drop zone after a frame
            setTimeout(() => {
                const editor = document.getElementById('exerciseGroups');
                if (editor) editor.classList.add('sidebar-drop-target');
            }, 0);
        });

        this.listEl.addEventListener('dragend', (e) => {
            const card = e.target.closest('.sidebar-exercise-card');
            if (card) card.classList.remove('sidebar-dragging');

            const editor = document.getElementById('exerciseGroups');
            if (editor) editor.classList.remove('sidebar-drop-target');
        });

        console.log('✅ Sidebar native drag initialized');
    }

    /**
     * Add exercise to the workout as a new exercise group
     */
    addExerciseToWorkout(exerciseName) {
        if (!exerciseName) return;

        const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const groupData = {
            exercises: { a: exerciseName, b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        window.exerciseGroupsData[groupId] = groupData;

        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const existingCards = container.querySelectorAll('.exercise-group-card');
        const index = existingCards.length;

        const cardHtml = window.createExerciseGroupCard(groupId, groupData, index + 1, index, index + 1);
        container.insertAdjacentHTML('beforeend', cardHtml);

        if (window.markEditorDirty) window.markEditorDirty();
        if (window.updateMuscleSummary) window.updateMuscleSummary();

        if (window.showToast) {
            window.showToast({
                message: `Added "${exerciseName}" to workout`,
                type: 'success',
                delay: 2000
            });
        }

        console.log('✅ Added exercise from sidebar:', exerciseName);
    }

    /** Escape HTML for safe rendering */
    escapeHtml(text) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /** Escape for HTML attributes */
    escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// Initialize global instance
window.desktopSidebar = new DesktopSidebar();

console.log('📦 Desktop Sidebar module loaded (v2.0.0)');
