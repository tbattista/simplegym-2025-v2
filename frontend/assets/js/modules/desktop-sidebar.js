/**
 * Desktop Sidebar Module
 * Togglable exercise library sidebar for desktop workout builder
 * Reuses ExerciseSearchCore for search/filter functionality
 * @version 1.0.0
 */

class DesktopSidebar {
    constructor() {
        this.isOpen = false;
        this.searchCore = null;
        this.initialized = false;
        this.sidebarEl = null;
        this.listEl = null;
    }

    /**
     * Toggle sidebar open/close
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open sidebar
     */
    async open() {
        this.sidebarEl = document.getElementById('desktopSidebar');
        if (!this.sidebarEl) return;

        this.sidebarEl.style.display = '';
        this.isOpen = true;

        // Update toggle button state
        const toggleBtn = document.getElementById('desktopToggleSidebarBtn');
        if (toggleBtn) {
            toggleBtn.classList.remove('btn-outline-secondary');
            toggleBtn.classList.add('btn-primary');
        }

        // Lazy initialize search on first open
        if (!this.initialized) {
            await this.init();
        }

        // Focus search input
        const searchInput = document.getElementById('sidebarSearch');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    /**
     * Close sidebar
     */
    close() {
        if (this.sidebarEl) {
            this.sidebarEl.style.display = 'none';
        }
        this.isOpen = false;

        // Update toggle button state
        const toggleBtn = document.getElementById('desktopToggleSidebarBtn');
        if (toggleBtn) {
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-outline-secondary');
        }
    }

    /**
     * Initialize search core and render UI
     */
    async init() {
        this.listEl = document.getElementById('sidebarExerciseList');
        if (!this.listEl) return;

        // Show loading state
        this.listEl.innerHTML = '<div class="sidebar-loading"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><p class="mt-2 mb-0 small">Loading exercises...</p></div>';

        // Initialize ExerciseSearchCore
        this.searchCore = new ExerciseSearchCore({
            pageSize: 50,
            showFavorites: false
        });

        // Listen for search events
        this.searchCore.addListener((event, data) => {
            if (event === 'filtered' || event === 'paginated') {
                this.renderExercises();
            }
            if (event === 'loadingEnd') {
                this.populateMuscleFilter();
            }
        });

        // Load exercises
        await this.searchCore.loadExercises();

        // Set up event listeners
        this.setupEventListeners();

        this.initialized = true;
    }

    /**
     * Set up search and filter event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('sidebarSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchCore.setSearchQuery(searchInput.value.trim());
                }, 250);
            });
        }

        // Muscle group filter
        const muscleFilter = document.getElementById('sidebarMuscleFilter');
        if (muscleFilter) {
            muscleFilter.addEventListener('change', () => {
                this.searchCore.setMuscleGroup(muscleFilter.value);
            });
        }

        // Close sidebar button
        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Exercise list click handler (delegated)
        if (this.listEl) {
            this.listEl.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-exercise-btn');
                const item = e.target.closest('.sidebar-exercise-item');
                if (addBtn || item) {
                    e.preventDefault();
                    const exerciseName = (addBtn || item).dataset.exerciseName;
                    if (exerciseName) {
                        this.addExerciseToWorkout(exerciseName);
                    }
                }
            });
        }
    }

    /**
     * Populate muscle group filter dropdown
     */
    populateMuscleFilter() {
        const muscleFilter = document.getElementById('sidebarMuscleFilter');
        if (!muscleFilter || !this.searchCore) return;

        const muscleGroups = this.searchCore.getUniqueMuscleGroups();
        muscleFilter.innerHTML = '<option value="">All Muscle Groups</option>';
        muscleGroups.forEach(mg => {
            muscleFilter.insertAdjacentHTML('beforeend',
                `<option value="${this.escapeHtml(mg)}">${this.escapeHtml(mg)}</option>`
            );
        });
    }

    /**
     * Render exercises in the sidebar list
     */
    renderExercises() {
        if (!this.listEl || !this.searchCore) return;

        const exercises = this.searchCore.state.paginatedExercises;
        const total = this.searchCore.state.filteredExercises.length;

        if (exercises.length === 0) {
            this.listEl.innerHTML = '<div class="sidebar-empty"><i class="bx bx-search" style="font-size:1.5rem"></i><p class="mt-2 mb-0 small">No exercises found</p></div>';
            return;
        }

        let html = '';
        exercises.forEach(ex => {
            const name = ex.name || ex.exerciseName || '';
            const muscle = ex.targetMuscleGroup || '';
            html += `
                <div class="sidebar-exercise-item" data-exercise-name="${this.escapeAttr(name)}" title="${this.escapeAttr(name)}">
                    <div class="exercise-info">
                        <div class="exercise-name">${this.escapeHtml(name)}</div>
                        ${muscle ? `<div class="exercise-muscle">${this.escapeHtml(muscle)}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-sm btn-ghost-primary add-exercise-btn p-1"
                            data-exercise-name="${this.escapeAttr(name)}" title="Add to workout">
                        <i class="bx bx-plus"></i>
                    </button>
                </div>`;
        });

        // Show count indicator
        if (total > exercises.length) {
            html += `<div class="sidebar-loading small text-center py-2">Showing ${exercises.length} of ${total}</div>`;
        }

        this.listEl.innerHTML = html;
    }

    /**
     * Add exercise to the workout as a new exercise group
     * @param {string} exerciseName - Name of the exercise to add
     */
    addExerciseToWorkout(exerciseName) {
        if (!exerciseName) return;

        // Generate a unique group ID
        const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create group data
        const groupData = {
            exercises: { a: exerciseName, b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        // Store in data
        window.exerciseGroupsData[groupId] = groupData;

        // Get current count for index
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const existingCards = container.querySelectorAll('.exercise-group-card');
        const index = existingCards.length;

        // Create and append card using the current renderer (desktop or mobile)
        const cardHtml = window.createExerciseGroupCard(groupId, groupData, index + 1, index, index + 1);
        container.insertAdjacentHTML('beforeend', cardHtml);

        // Mark as dirty for autosave
        if (window.markEditorDirty) {
            window.markEditorDirty();
        }

        // Update muscle summary
        if (window.updateMuscleSummary) {
            window.updateMuscleSummary();
        }

        // Show feedback
        if (window.showToast) {
            window.showToast({
                message: `Added "${exerciseName}" to workout`,
                type: 'success',
                delay: 2000
            });
        }

        console.log('✅ Added exercise from sidebar:', exerciseName);
    }

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        if (typeof window.escapeHtml === 'function') {
            return window.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Escape for HTML attributes
     */
    escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// Initialize global instance
window.desktopSidebar = new DesktopSidebar();

console.log('📦 Desktop Sidebar module loaded');
