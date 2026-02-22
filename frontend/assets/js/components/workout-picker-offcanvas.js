/**
 * Ghost Gym - Workout Picker Offcanvas Component
 * Offcanvas for selecting workouts to add to a program
 * @version 1.0.0
 */

class WorkoutPickerOffcanvas {
    constructor(config = {}) {
        this.config = {
            // Callbacks
            onConfirm: null,  // Called with selected workout IDs

            ...config
        };

        this.offcanvasId = 'workoutPickerOffcanvas';
        this.offcanvasElement = null;
        this.bsOffcanvas = null;

        // State
        this.allWorkouts = [];
        this.filteredWorkouts = [];
        this.selectedIds = new Set();
        this.excludeIds = new Set();  // Workouts already in program
        this.searchTerm = '';
        this.currentProgram = null;

        this.initialize();
    }

    /**
     * Initialize the offcanvas
     */
    initialize() {
        this.createOffcanvasHTML();
        this.attachEventListeners();
        console.log('✅ WorkoutPickerOffcanvas component initialized');
    }

    /**
     * Create offcanvas HTML
     */
    createOffcanvasHTML() {
        // Remove existing offcanvas if present
        const existing = document.getElementById(this.offcanvasId);
        if (existing) {
            existing.remove();
        }

        const offcanvasHTML = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-tall offcanvas-desktop-side" tabindex="-1" id="${this.offcanvasId}"
                 aria-labelledby="${this.offcanvasId}Label">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="${this.offcanvasId}Label">
                        <i class="bx bx-plus-circle me-2"></i>
                        Add Workouts
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body p-0" style="display: flex; flex-direction: column;">
                    <!-- Search Bar (Sticky) -->
                    <div class="workout-picker-search p-3 border-bottom bg-body sticky-top">
                        <div class="position-relative">
                            <i class="bx bx-search position-absolute" style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--bs-secondary);"></i>
                            <input type="text"
                                   class="form-control ps-5"
                                   id="workoutPickerSearch"
                                   placeholder="Search workouts..."
                                   autocomplete="off">
                            <button class="btn btn-sm position-absolute"
                                    id="clearPickerSearch"
                                    style="right: 4px; top: 50%; transform: translateY(-50%); display: none;">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                        <div class="mt-2 d-flex justify-content-between align-items-center">
                            <span class="text-muted small" id="workoutPickerCount">0 workouts available</span>
                            <button class="btn btn-sm btn-link p-0" id="selectAllBtn">Select All</button>
                        </div>
                    </div>

                    <!-- Workout List (Scrollable) -->
                    <div class="workout-picker-list flex-grow-1" style="overflow-y: auto;" id="workoutPickerList">
                        <!-- Workouts will be rendered here -->
                    </div>

                    <!-- Empty State -->
                    <div class="workout-picker-empty text-center py-5" id="workoutPickerEmpty" style="display: none;">
                        <i class="bx bx-dumbbell display-4 text-muted mb-2"></i>
                        <p class="text-muted mb-0">No workouts found</p>
                    </div>
                </div>
                <div class="offcanvas-footer">
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary flex-fill" id="confirmAddWorkoutsBtn" disabled>
                            <i class="bx bx-plus me-1"></i>
                            <span id="addWorkoutsBtnText">Add Workouts</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', offcanvasHTML);
        this.offcanvasElement = document.getElementById(this.offcanvasId);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        const searchInput = document.getElementById('workoutPickerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterWorkouts();
                this.updateClearButton();
            });
        }

        // Clear search button
        const clearBtn = document.getElementById('clearPickerSearch');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                document.getElementById('workoutPickerSearch').value = '';
                this.searchTerm = '';
                this.filterWorkouts();
                this.updateClearButton();
            });
        }

        // Select all button
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.toggleSelectAll();
            });
        }

        // Confirm button
        const confirmBtn = document.getElementById('confirmAddWorkoutsBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.handleConfirm();
            });
        }

        // Listen for offcanvas hidden event
        if (this.offcanvasElement) {
            this.offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
                this.reset();
            });
        }
    }

    /**
     * Show offcanvas for a program
     * @param {Object} program - The program to add workouts to
     * @param {Array} workouts - All available workouts
     */
    show(program, workouts) {
        console.log('📋 Opening workout picker for program:', program.id);

        this.currentProgram = program;
        this.allWorkouts = workouts;
        this.selectedIds.clear();
        this.searchTerm = '';

        // Set excluded IDs (workouts already in program)
        this.excludeIds = new Set(
            (program.workouts || []).map(pw => pw.workout_id)
        );

        // Clear search input
        const searchInput = document.getElementById('workoutPickerSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        // Filter and render
        this.filterWorkouts();
        this.updateConfirmButton();
        this.updateClearButton();

        // Show offcanvas
        if (!this.bsOffcanvas) {
            this.bsOffcanvas = new bootstrap.Offcanvas(this.offcanvasElement, { scroll: false });
        }
        this.bsOffcanvas.show();
    }

    /**
     * Hide offcanvas
     */
    hide() {
        if (this.bsOffcanvas) {
            this.bsOffcanvas.hide();
        }
    }

    /**
     * Filter workouts based on search and exclusions
     */
    filterWorkouts() {
        const searchLower = this.searchTerm.toLowerCase();

        this.filteredWorkouts = this.allWorkouts.filter(workout => {
            // Exclude workouts already in program
            if (this.excludeIds.has(workout.id)) {
                return false;
            }

            // Apply search filter
            if (searchLower) {
                const nameMatch = (workout.name || '').toLowerCase().includes(searchLower);
                const descMatch = (workout.description || '').toLowerCase().includes(searchLower);
                const tagMatch = (workout.tags || []).some(t => t.toLowerCase().includes(searchLower));
                return nameMatch || descMatch || tagMatch;
            }

            return true;
        });

        this.renderWorkoutList();
        this.updateCount();
    }

    /**
     * Render the workout list
     */
    renderWorkoutList() {
        const listEl = document.getElementById('workoutPickerList');
        const emptyEl = document.getElementById('workoutPickerEmpty');

        if (this.filteredWorkouts.length === 0) {
            listEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }

        listEl.style.display = 'block';
        emptyEl.style.display = 'none';

        listEl.innerHTML = this.filteredWorkouts.map(workout => {
            const isSelected = this.selectedIds.has(workout.id);
            const exerciseCount = window.ExerciseDataUtils ? ExerciseDataUtils.getGroupCount(workout) : (workout.exercise_groups?.length || 0);
            const tags = workout.tags || [];

            return `
                <div class="workout-picker-item ${isSelected ? 'selected' : ''}"
                     data-workout-id="${workout.id}">
                    <div class="form-check">
                        <input class="form-check-input workout-picker-checkbox"
                               type="checkbox"
                               id="picker-${workout.id}"
                               ${isSelected ? 'checked' : ''}>
                        <label class="form-check-label" for="picker-${workout.id}">
                            <span class="workout-picker-name">${this._escapeHtml(workout.name)}</span>
                            <span class="workout-picker-meta text-muted small">
                                ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}
                                ${tags.length > 0 ? ` • ${tags.slice(0, 2).join(', ')}${tags.length > 2 ? '...' : ''}` : ''}
                            </span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');

        // Attach click listeners - make entire row clickable
        listEl.querySelectorAll('.workout-picker-item').forEach(item => {
            const checkbox = item.querySelector('.workout-picker-checkbox');

            // Handle clicks anywhere on the item (except checkbox itself)
            item.addEventListener('click', (e) => {
                // If clicking the checkbox, let native behavior handle it
                // then sync our state in the checkbox's change event
                if (e.target === checkbox) {
                    return;
                }

                // For clicks elsewhere, toggle manually
                e.preventDefault();
                this.toggleWorkout(item.dataset.workoutId);
                if (checkbox) {
                    checkbox.checked = this.selectedIds.has(item.dataset.workoutId);
                }
            });

            // Handle checkbox changes (for direct checkbox clicks and keyboard)
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    const workoutId = item.dataset.workoutId;

                    // Sync selectedIds with checkbox state
                    if (checkbox.checked) {
                        this.selectedIds.add(workoutId);
                    } else {
                        this.selectedIds.delete(workoutId);
                    }

                    // Update UI
                    item.classList.toggle('selected', checkbox.checked);
                    this.updateConfirmButton();
                    this.updateSelectAllButton();
                });
            }
        });
    }

    /**
     * Toggle workout selection
     */
    toggleWorkout(workoutId) {
        if (this.selectedIds.has(workoutId)) {
            this.selectedIds.delete(workoutId);
        } else {
            this.selectedIds.add(workoutId);
        }

        // Update UI
        const item = document.querySelector(`[data-workout-id="${workoutId}"]`);
        if (item) {
            item.classList.toggle('selected', this.selectedIds.has(workoutId));
        }

        this.updateConfirmButton();
        this.updateSelectAllButton();
    }

    /**
     * Toggle select all/none
     */
    toggleSelectAll() {
        const allSelected = this.filteredWorkouts.every(w => this.selectedIds.has(w.id));

        if (allSelected) {
            // Deselect all
            this.filteredWorkouts.forEach(w => this.selectedIds.delete(w.id));
        } else {
            // Select all
            this.filteredWorkouts.forEach(w => this.selectedIds.add(w.id));
        }

        this.renderWorkoutList();
        this.updateConfirmButton();
        this.updateSelectAllButton();
    }

    /**
     * Update confirm button state
     */
    updateConfirmButton() {
        const btn = document.getElementById('confirmAddWorkoutsBtn');
        const btnText = document.getElementById('addWorkoutsBtnText');

        if (btn) {
            const count = this.selectedIds.size;
            btn.disabled = count === 0;

            if (btnText) {
                btnText.textContent = count === 0
                    ? 'Add Workouts'
                    : `Add ${count} Workout${count !== 1 ? 's' : ''}`;
            }
        }
    }

    /**
     * Update select all button text
     */
    updateSelectAllButton() {
        const btn = document.getElementById('selectAllBtn');
        if (!btn) return;

        const allSelected = this.filteredWorkouts.length > 0 &&
                            this.filteredWorkouts.every(w => this.selectedIds.has(w.id));

        btn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }

    /**
     * Update count display
     */
    updateCount() {
        const countEl = document.getElementById('workoutPickerCount');
        if (countEl) {
            const count = this.filteredWorkouts.length;
            countEl.textContent = `${count} workout${count !== 1 ? 's' : ''} available`;
        }
    }

    /**
     * Update clear button visibility
     */
    updateClearButton() {
        const clearBtn = document.getElementById('clearPickerSearch');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }

    /**
     * Handle confirm button click
     */
    handleConfirm() {
        const selectedIds = Array.from(this.selectedIds);

        if (selectedIds.length === 0) return;

        // Call callback
        if (this.config.onConfirm) {
            this.config.onConfirm(selectedIds, this.currentProgram);
        }

        // Hide offcanvas
        this.hide();
    }

    /**
     * Reset state
     */
    reset() {
        this.selectedIds.clear();
        this.searchTerm = '';
        this.currentProgram = null;
    }

    /**
     * Destroy the offcanvas
     */
    destroy() {
        if (this.bsOffcanvas) {
            this.bsOffcanvas.dispose();
            this.bsOffcanvas = null;
        }

        if (this.offcanvasElement) {
            this.offcanvasElement.remove();
            this.offcanvasElement = null;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for global use
window.WorkoutPickerOffcanvas = WorkoutPickerOffcanvas;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutPickerOffcanvas;
}

console.log('📦 WorkoutPickerOffcanvas component loaded');
