/**
 * Ghost Gym - Programs Page Controller
 * Manages the programs library page with grid, filtering, and CRUD operations
 * @version 1.0.0
 */

(function() {
    'use strict';

    // ============================================
    // STATE
    // ============================================

    const state = {
        all: [],           // All programs from database
        filtered: [],      // After search/filter
        workouts: [],      // All workouts (for program stats)
        deleteMode: false,
        currentSortIndex: 0,
        filters: {
            search: '',
            tags: [],
            difficulty: null,
            sortBy: 'modified_date',
            sortOrder: 'desc'
        }
    };

    // Sort options
    const SORT_OPTIONS = [
        { value: 'modified_date', label: 'Newest', icon: 'bx-sort-alt-2' },
        { value: 'created_date', label: 'Created', icon: 'bx-calendar-plus' },
        { value: 'name', label: 'A-Z', icon: 'bx-sort-a-z' }
    ];

    // Component instances
    let programGrid = null;
    let programDetailOffcanvas = null;
    let workoutPickerOffcanvas = null;
    let searchDebounceTimer = null;

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the programs page
     */
    async function initProgramsPage() {
        // Prevent double initialization
        if (window._programsPageInitialized) {
            console.log('⚠️ Programs Page already initialized, skipping');
            return;
        }
        window._programsPageInitialized = true;

        console.log('🚀 Initializing Programs Page Controller');

        // Debug: Check if required dependencies are available
        console.log('🔍 Dependencies check:', {
            ProgramGrid: typeof ProgramGrid !== 'undefined',
            ProgramCard: typeof ProgramCard !== 'undefined',
            ProgramDetailOffcanvas: typeof ProgramDetailOffcanvas !== 'undefined',
            WorkoutPickerOffcanvas: typeof WorkoutPickerOffcanvas !== 'undefined',
            dataManager: !!window.dataManager,
            authService: !!window.authService,
            isAuthenticated: window.authService?.isUserAuthenticated?.()
        });

        try {
            // Initialize components
            initProgramGrid();
            initProgramDetailOffcanvas();
            initWorkoutPickerOffcanvas();
            initToolbar();
            initFiltersOffcanvas();
            initDeleteModeToggle();

            // Load data
            await loadData();

            console.log('✅ Programs Page Controller initialized');
        } catch (error) {
            console.error('❌ Error initializing programs page:', error);
            showError('Failed to initialize page');
        }
    }

    /**
     * Initialize the program grid component
     */
    function initProgramGrid() {
        programGrid = new ProgramGrid('programsGridContainer', {
            pageSize: 50,
            showPagination: true,
            emptyIcon: 'bx-folder-open',
            emptyTitle: 'No Programs Yet',
            emptyMessage: 'Create your first program to organize your workouts',
            emptyAction: {
                label: 'Create Your First Program',
                icon: 'bx-plus',
                onClick: () => showProgramModal()
            },
            cardConfig: {
                showStats: true,
                showTags: true,
                showDescription: true,
                showDifficulty: true,
                showDuration: true,
                deleteMode: false,
                // Primary action button (shown at bottom of card)
                primaryAction: {
                    label: 'Open',
                    icon: 'bx-folder-open',
                    variant: 'primary',
                    onClick: (program) => openProgramDetail(program)
                },
                // Dropdown menu actions (3-dot menu)
                dropdownActions: ['edit', 'generate', 'delete'],
                // Callbacks
                onCardClick: (program) => openProgramDetail(program),
                onEdit: (program) => editProgram(program.id),
                onGenerate: (program) => showGenerateModal(program),
                onDelete: (programId, programName) => handleDeleteProgram(programId, programName)
            },
            onPageChange: (page) => {
                console.log('📄 Page changed to:', page);
            },
            onBatchDelete: (programIds) => handleBatchDelete(programIds)
        });

        // Make grid accessible globally for selection action bar
        window.programGrid = programGrid;
    }

    /**
     * Initialize the program detail offcanvas
     */
    function initProgramDetailOffcanvas() {
        programDetailOffcanvas = new ProgramDetailOffcanvas({
            showStats: true,
            showDates: true,
            showDescription: true,
            workouts: state.workouts,
            actions: [
                {
                    id: 'edit',
                    label: 'Edit Details',
                    icon: 'bx-edit',
                    variant: 'outline-secondary',
                    onClick: (program) => {
                        programDetailOffcanvas.hide();
                        editProgram(program.id);
                    }
                },
                {
                    id: 'save',
                    label: 'Save & Close',
                    icon: 'bx-check',
                    variant: 'primary',
                    primary: true,
                    onClick: async (program) => {
                        await saveProgram(program);
                        programDetailOffcanvas.hide();
                    }
                }
            ],
            onAddWorkouts: (program) => {
                workoutPickerOffcanvas.show(program, state.workouts);
            },
            onRemoveWorkout: async (programId, workoutId) => {
                await removeWorkoutFromProgram(programId, workoutId);
            },
            onReorderWorkouts: async (programId, newOrder) => {
                await reorderProgramWorkouts(programId, newOrder);
            }
        });
    }

    /**
     * Initialize the workout picker offcanvas
     */
    function initWorkoutPickerOffcanvas() {
        workoutPickerOffcanvas = new WorkoutPickerOffcanvas({
            onConfirm: async (workoutIds, program) => {
                await addWorkoutsToProgram(program.id, workoutIds);

                // Refresh program detail
                const updatedProgram = state.all.find(p => p.id === program.id);
                if (updatedProgram && programDetailOffcanvas) {
                    programDetailOffcanvas.update(updatedProgram);
                }
            }
        });
    }

    /**
     * Initialize toolbar event handlers
     */
    function initToolbar() {
        // Search input
        const searchInput = document.getElementById('programSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    state.filters.search = e.target.value;
                    filterPrograms();
                }, 300);
                updateClearButton();
            });
        }

        // Clear search button
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('programSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    state.filters.search = '';
                    filterPrograms();
                    updateClearButton();
                }
            });
        }

        // Sort cycle button
        const sortBtn = document.getElementById('sortCycleBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => cycleSort());
        }

        // Create button
        const createBtn = document.getElementById('createProgramBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => showProgramModal());
        }

        // Delete mode button
        const deleteModeBtn = document.getElementById('deleteModeBtn');
        if (deleteModeBtn) {
            deleteModeBtn.addEventListener('click', () => toggleDeleteMode());
        }
    }

    /**
     * Toggle delete mode on/off
     */
    function toggleDeleteMode() {
        const toggle = document.getElementById('deleteModeToggle');
        if (toggle) {
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Initialize filters offcanvas
     */
    function initFiltersOffcanvas() {
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                clearFilters();
            });
        }

        // Difficulty filter
        document.querySelectorAll('[data-filter-difficulty]').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.filterDifficulty;
                state.filters.difficulty = difficulty === 'all' ? null : difficulty;
                filterPrograms();
                updateFilterBadge();
            });
        });
    }

    /**
     * Initialize delete mode toggle
     */
    function initDeleteModeToggle() {
        const toggle = document.getElementById('deleteModeToggle');
        if (!toggle) return;

        toggle.addEventListener('change', function() {
            state.deleteMode = this.checked;
            document.body.classList.toggle('delete-mode-active', this.checked);

            if (programGrid) {
                programGrid.setDeleteMode(this.checked);
            }

            // Sync delete mode button appearance
            updateDeleteModeButton();
        });
    }

    /**
     * Update delete mode button appearance based on current state
     */
    function updateDeleteModeButton() {
        const deleteModeBtn = document.getElementById('deleteModeBtn');
        if (!deleteModeBtn) return;

        if (state.deleteMode) {
            deleteModeBtn.classList.remove('btn-outline-secondary');
            deleteModeBtn.classList.add('btn-danger');
            deleteModeBtn.querySelector('.delete-label').textContent = 'Cancel';
            deleteModeBtn.title = 'Exit delete mode';
        } else {
            deleteModeBtn.classList.remove('btn-danger');
            deleteModeBtn.classList.add('btn-outline-secondary');
            deleteModeBtn.querySelector('.delete-label').textContent = 'Delete';
            deleteModeBtn.title = 'Toggle delete mode';
        }
    }

    // ============================================
    // DATA LOADING
    // ============================================

    /**
     * Load all data (programs and workouts)
     */
    async function loadData() {
        console.log('📦 Loading programs data...');
        console.log('🔍 dataManager state:', {
            exists: !!window.dataManager,
            storageMode: window.dataManager?.storageMode,
            isOnline: window.dataManager?.isOnline,
            isAuthenticated: window.dataManager?.isAuthenticated
        });

        showLoading();

        try {
            // Check if dataManager exists
            if (!window.dataManager) {
                console.error('❌ dataManager is not available!');
                showError('Data manager not initialized');
                return;
            }

            // Load programs and workouts in parallel
            console.log('📡 Fetching programs and workouts...');
            const [programs, workouts] = await Promise.all([
                window.dataManager.getPrograms(),
                window.dataManager.getWorkouts()
            ]);

            console.log('📦 Raw API response - programs:', programs);
            console.log('📦 Raw API response - workouts:', workouts);

            state.all = programs || [];
            state.workouts = workouts || [];

            // Update offcanvas workouts reference
            if (programDetailOffcanvas) {
                programDetailOffcanvas.config.workouts = state.workouts;
            }

            console.log(`✅ Loaded ${state.all.length} programs, ${state.workouts.length} workouts`);

            // Update UI
            filterPrograms();
            updateStats();
            renderTagFilters();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            console.error('Stack trace:', error.stack);
            showError('Failed to load programs');
        }
    }

    // ============================================
    // FILTERING & SORTING
    // ============================================

    /**
     * Filter programs based on current filter state
     */
    function filterPrograms() {
        let filtered = [...state.all];

        // Apply search filter
        const searchTerm = state.filters.search.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(program => {
                const nameMatch = (program.name || '').toLowerCase().includes(searchTerm);
                const descMatch = (program.description || '').toLowerCase().includes(searchTerm);
                const tagMatch = (program.tags || []).some(t => t.toLowerCase().includes(searchTerm));
                return nameMatch || descMatch || tagMatch;
            });
        }

        // Apply difficulty filter
        if (state.filters.difficulty) {
            filtered = filtered.filter(p => p.difficulty_level === state.filters.difficulty);
        }

        // Apply tag filters
        if (state.filters.tags.length > 0) {
            filtered = filtered.filter(program =>
                state.filters.tags.some(tag => (program.tags || []).includes(tag))
            );
        }

        // Apply sorting
        filtered = sortPrograms(filtered, state.filters.sortBy, state.filters.sortOrder);

        state.filtered = filtered;

        // Update grid
        if (programGrid) {
            programGrid.setWorkouts(state.workouts);
            programGrid.setData(filtered);
        }

        updateStats();
    }

    /**
     * Sort programs
     */
    function sortPrograms(programs, sortBy, sortOrder = 'desc') {
        return programs.sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    return sortOrder === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                case 'created_date':
                    aVal = new Date(a.created_date || 0).getTime();
                    bVal = new Date(b.created_date || 0).getTime();
                    break;
                case 'modified_date':
                default:
                    aVal = new Date(a.modified_date || 0).getTime();
                    bVal = new Date(b.modified_date || 0).getTime();
                    break;
            }

            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });
    }

    /**
     * Cycle through sort options
     */
    function cycleSort() {
        state.currentSortIndex = (state.currentSortIndex + 1) % SORT_OPTIONS.length;
        const option = SORT_OPTIONS[state.currentSortIndex];

        state.filters.sortBy = option.value;
        state.filters.sortOrder = option.value === 'name' ? 'asc' : 'desc';

        // Update button label
        const sortLabel = document.querySelector('#sortCycleBtn .sort-label');
        if (sortLabel) {
            sortLabel.textContent = option.label;
        }

        filterPrograms();
    }

    /**
     * Clear all filters
     */
    function clearFilters() {
        state.filters = {
            search: '',
            tags: [],
            difficulty: null,
            sortBy: 'modified_date',
            sortOrder: 'desc'
        };
        state.currentSortIndex = 0;

        // Clear UI
        const searchInput = document.getElementById('programSearchInput');
        if (searchInput) searchInput.value = '';

        const sortLabel = document.querySelector('#sortCycleBtn .sort-label');
        if (sortLabel) sortLabel.textContent = 'Newest';

        updateClearButton();
        updateFilterBadge();
        filterPrograms();
    }

    // ============================================
    // PROGRAM OPERATIONS
    // ============================================

    /**
     * Open program detail offcanvas
     */
    function openProgramDetail(program) {
        if (state.deleteMode) return;  // Don't open detail in delete mode

        if (programDetailOffcanvas) {
            programDetailOffcanvas.config.workouts = state.workouts;
            programDetailOffcanvas.show(program);
        }
    }

    /**
     * Handle delete single program
     */
    async function handleDeleteProgram(programId, programName) {
        if (!confirm(`Are you sure you want to delete "${programName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            if (window.dataManager?.deleteProgram) {
                await window.dataManager.deleteProgram(programId);
            }

            // Remove from state
            state.all = state.all.filter(p => p.id !== programId);
            filterPrograms();

            showSuccess(`Program "${programName}" deleted`);
        } catch (error) {
            console.error('❌ Error deleting program:', error);
            showError('Failed to delete program');
        }
    }

    /**
     * Handle batch delete programs
     */
    async function handleBatchDelete(programIds) {
        const count = programIds.length;
        if (!confirm(`Delete ${count} program${count !== 1 ? 's' : ''}?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            // Delete each program
            for (const id of programIds) {
                if (window.dataManager?.deleteProgram) {
                    await window.dataManager.deleteProgram(id);
                }
            }

            // Remove from state
            const idsToRemove = new Set(programIds);
            state.all = state.all.filter(p => !idsToRemove.has(p.id));

            // Exit delete mode
            const toggle = document.getElementById('deleteModeToggle');
            if (toggle) {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
            }

            filterPrograms();
            showSuccess(`${count} program${count !== 1 ? 's' : ''} deleted`);
        } catch (error) {
            console.error('❌ Error deleting programs:', error);
            showError('Failed to delete programs');
        }
    }

    /**
     * Add workouts to a program
     */
    async function addWorkoutsToProgram(programId, workoutIds) {
        try {
            const program = state.all.find(p => p.id === programId);
            if (!program) return;

            // Add workouts locally
            const currentOrder = program.workouts?.length || 0;
            program.workouts = program.workouts || [];

            workoutIds.forEach((workoutId, index) => {
                const exists = program.workouts.some(pw => pw.workout_id === workoutId);
                if (!exists) {
                    program.workouts.push({
                        workout_id: workoutId,
                        order_index: currentOrder + index
                    });
                }
            });

            // Save to backend
            if (window.dataManager?.updateProgram) {
                await window.dataManager.updateProgram(programId, program);
            }

            showSuccess(`Added ${workoutIds.length} workout${workoutIds.length !== 1 ? 's' : ''} to program`);
        } catch (error) {
            console.error('❌ Error adding workouts:', error);
            showError('Failed to add workouts');
        }
    }

    /**
     * Remove workout from a program
     */
    async function removeWorkoutFromProgram(programId, workoutId) {
        try {
            const program = state.all.find(p => p.id === programId);
            if (!program) return;

            program.workouts = (program.workouts || []).filter(pw => pw.workout_id !== workoutId);

            // Reindex order
            program.workouts.forEach((pw, index) => {
                pw.order_index = index;
            });

            // Save to backend
            if (window.dataManager?.updateProgram) {
                await window.dataManager.updateProgram(programId, program);
            }

            showSuccess('Workout removed from program');
        } catch (error) {
            console.error('❌ Error removing workout:', error);
            showError('Failed to remove workout');
        }
    }

    /**
     * Reorder workouts in a program
     */
    async function reorderProgramWorkouts(programId, newOrder) {
        try {
            const program = state.all.find(p => p.id === programId);
            if (!program) return;

            // Update order
            program.workouts = program.workouts.map(pw => {
                const orderInfo = newOrder.find(o => o.workout_id === pw.workout_id);
                return {
                    ...pw,
                    order_index: orderInfo?.order_index ?? pw.order_index
                };
            }).sort((a, b) => a.order_index - b.order_index);

            // Save to backend
            if (window.dataManager?.updateProgram) {
                await window.dataManager.updateProgram(programId, program);
            }

            console.log('✅ Workout order saved');
        } catch (error) {
            console.error('❌ Error reordering workouts:', error);
            showError('Failed to save workout order');
        }
    }

    /**
     * Save program to Firestore (explicit save action)
     */
    async function saveProgram(program) {
        try {
            console.log('💾 Saving program:', program.id);

            // Get the program from the offcanvas (it may have been modified)
            const currentProgram = programDetailOffcanvas?.getCurrentProgram() || program;

            // Update modified date
            currentProgram.modified_date = new Date().toISOString();

            // Save to backend
            if (window.dataManager?.updateProgram) {
                await window.dataManager.updateProgram(currentProgram.id, currentProgram);
            }

            // Update local state
            const index = state.all.findIndex(p => p.id === currentProgram.id);
            if (index >= 0) {
                state.all[index] = { ...currentProgram };
            }

            // Refresh grid to show updated program
            filterPrograms();

            showSuccess('Program saved successfully');
            console.log('✅ Program saved:', currentProgram.id);
        } catch (error) {
            console.error('❌ Error saving program:', error);
            showError('Failed to save program');
        }
    }

    /**
     * Start first workout in program
     */
    function startFirstWorkout(program) {
        const firstWorkout = program.workouts?.[0];
        if (!firstWorkout) {
            showError('No workouts in this program');
            return;
        }

        window.location.href = `/workout-mode.html?workoutId=${firstWorkout.workout_id}`;
    }

    // ============================================
    // UI HELPERS
    // ============================================

    /**
     * Show loading state
     */
    function showLoading() {
        if (programGrid) {
            programGrid.showLoading();
        }
    }

    /**
     * Update stats display
     */
    function updateStats() {
        const countEl = document.getElementById('totalProgramsCount');
        if (countEl) {
            countEl.textContent = state.all.length;
        }

        const showingEl = document.getElementById('showingCount');
        if (showingEl) {
            showingEl.textContent = state.filtered.length;
        }

        const totalEl = document.getElementById('totalCount');
        if (totalEl) {
            totalEl.textContent = state.all.length;
        }
    }

    /**
     * Update clear button visibility
     */
    function updateClearButton() {
        const clearBtn = document.getElementById('clearSearchBtn');
        const searchInput = document.getElementById('programSearchInput');
        if (clearBtn && searchInput) {
            clearBtn.style.display = searchInput.value ? 'block' : 'none';
        }
    }

    /**
     * Update filter badge
     */
    function updateFilterBadge() {
        const badge = document.getElementById('filterBadge');
        if (!badge) return;

        let count = 0;
        if (state.filters.difficulty) count++;
        if (state.filters.tags.length > 0) count += state.filters.tags.length;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Render tag filters
     */
    function renderTagFilters() {
        const container = document.getElementById('tagsFilterContainer');
        if (!container) return;

        // Collect all tags
        const tagCounts = {};
        state.all.forEach(program => {
            (program.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const tags = Object.keys(tagCounts).sort();

        if (tags.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">No tags available</p>';
            return;
        }

        container.innerHTML = tags.map(tag => `
            <label class="tag-filter-chip ${state.filters.tags.includes(tag) ? 'active' : ''}"
                   data-tag="${tag}">
                ${tag} (${tagCounts[tag]})
            </label>
        `).join('');

        // Attach listeners
        container.querySelectorAll('.tag-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const tag = chip.dataset.tag;
                const index = state.filters.tags.indexOf(tag);

                if (index >= 0) {
                    state.filters.tags.splice(index, 1);
                    chip.classList.remove('active');
                } else {
                    state.filters.tags.push(tag);
                    chip.classList.add('active');
                }

                filterPrograms();
                updateFilterBadge();
            });
        });
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        if (window.showAlert) {
            window.showAlert(message, 'success');
        } else {
            console.log('✅', message);
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        if (window.showAlert) {
            window.showAlert(message, 'danger');
        } else {
            console.error('❌', message);
        }
    }

    // ============================================
    // MODAL FUNCTIONS (kept for compatibility)
    // ============================================

    /**
     * Show program modal (create or edit)
     */
    function showProgramModal(programId = null) {
        // Use existing modal from programs.html
        if (window.showProgramModal) {
            window.showProgramModal(programId);
        } else {
            // Fallback: trigger modal directly
            clearProgramForm();
            const modal = new bootstrap.Modal(document.getElementById('programModal'));
            modal.show();
        }
    }

    /**
     * Edit program
     */
    function editProgram(programId) {
        if (window.editProgram) {
            window.editProgram(programId);
        } else {
            showProgramModal(programId);
        }
    }

    /**
     * Show generate modal
     */
    function showGenerateModal(program) {
        if (window.previewProgram) {
            window.previewProgram(program.id);
        }
    }

    /**
     * Clear program form
     */
    function clearProgramForm() {
        document.getElementById('programName').value = '';
        document.getElementById('programDescription').value = '';
        document.getElementById('programDuration').value = '';
        document.getElementById('programDifficulty').value = 'intermediate';
        document.getElementById('programTags').value = '';
        document.getElementById('programModalTitle').textContent = 'Create Program';
    }

    // ============================================
    // EXPORTS
    // ============================================

    // Expose functions globally
    window.initProgramsPage = initProgramsPage;
    window.loadProgramsData = loadData;
    window.filterPrograms = filterPrograms;
    window.cycleProgramSort = cycleSort;
    window.clearProgramFilters = clearFilters;
    window.toggleProgramDeleteMode = function(enabled) {
        state.deleteMode = enabled;
        if (programGrid) programGrid.setDeleteMode(enabled);
    };

    // Initialize on DOMContentLoaded if not already handled
    document.addEventListener('DOMContentLoaded', function() {
        // Check if already initialized (programs.html inline script may call initProgramsPage)
        if (!window._programsPageInitialized) {
            // Wait for Firebase
            if (window.firebaseReady) {
                initProgramsPage();
            } else {
                window.addEventListener('firebaseReady', initProgramsPage);
            }
        }
    });

    // Listen for auth state changes to reload data (e.g., after login)
    window.addEventListener('authStateChanged', function(event) {
        console.log('🔄 Auth state changed, reloading programs data...', event.detail);
        if (window._programsPageInitialized && event.detail?.isAuthenticated) {
            // User just signed in, reload from Firestore
            loadData();
        }
    });

    console.log('📦 Programs Page Controller loaded');

})();
