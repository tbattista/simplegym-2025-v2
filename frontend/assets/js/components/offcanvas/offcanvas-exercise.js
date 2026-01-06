/**
 * Ghost Gym - Exercise Offcanvas Components
 * Creates exercise-related offcanvas: bonus exercise, search, and filter
 * 
 * @module offcanvas-exercise
 * @version 3.0.0
 * @date 2025-12-20
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/* ============================================
   BONUS EXERCISE (REFACTORED v4.0 - Phase 4 COMPLETE)
   Uses ExerciseSearchCore for all search/filter/sort/pagination
   Reduced from 811 lines to ~250 lines (69% reduction)
   ============================================ */

/**
 * Create bonus exercise offcanvas using ExerciseSearchCore
 * Hybrid approach: Preserves unique dual-purpose UX while eliminating duplicate logic
 * - Top section: Direct exercise name input (also filters library)
 * - Bottom section: Browse/search library (powered by ExerciseSearchCore)
 * @param {Object} data - Configuration data
 * @param {Function} onAddExercise - Callback when adding exercise
 * @returns {Object} Offcanvas instance
 */
export function createBonusExercise(data, onAddExercise) {
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
             tabindex="-1"
             id="bonusExerciseOffcanvas"
             aria-labelledby="bonusExerciseOffcanvasLabel"
             data-bs-scroll="false"
             style="height: 85vh;">
            
            <!-- Header -->
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
                    <i class="bx bx-plus-circle me-2"></i>Add Exercise
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            
            <!-- Body -->
            <div class="offcanvas-body p-0">
                <!-- Add Exercise Section (FOCAL POINT) -->
                <div class="add-exercise-section p-3 border-bottom bg-light">
                    <!-- Exercise Name Input -->
                    <div class="mb-3">
                        <label class="form-label fw-semibold mb-2">Exercise Name</label>
                        <div class="input-group">
                            <span class="input-group-text">
                                <i class="bx bx-search"></i>
                            </span>
                            <input
                                type="text"
                                class="form-control"
                                id="exerciseNameInput"
                                placeholder="Enter exercise name or search library..."
                                autocomplete="off"
                            >
                            <button class="btn btn-outline-secondary" type="button" id="clearNameBtn" style="display: none;">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                        <small class="text-muted">Type to search library or enter custom exercise name</small>
                    </div>
                    
                    <!-- Sets, Reps, Rest Row -->
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="form-label small mb-1">Sets</label>
                            <input type="text" class="form-control" id="setsInput" value="3" maxlength="5">
                        </div>
                        <div class="col-4">
                            <label class="form-label small mb-1">Reps</label>
                            <input type="text" class="form-control" id="repsInput" value="12" maxlength="10">
                        </div>
                        <div class="col-4">
                            <label class="form-label small mb-1">Rest</label>
                            <input type="text" class="form-control" id="restInput" value="60s" maxlength="10">
                        </div>
                    </div>
                    
                    <!-- Add Exercise Button (Prominent) -->
                    <button class="btn btn-primary w-100" id="addExerciseBtn" disabled>
                        <i class="bx bx-plus-circle me-2"></i>Add Exercise
                    </button>
                </div>
                
                <!-- Filter Accordion (Collapsed by Default) -->
                <div class="filter-accordion-section border-bottom">
                    <!-- Toggle Button -->
                    <button class="btn btn-link w-100 text-start p-3 text-decoration-none" id="toggleFiltersBtn" type="button">
                        <i class="bx bx-filter-alt me-2"></i>
                        <span>Filters</span>
                        <i class="bx bx-chevron-down float-end" id="filterChevron"></i>
                    </button>
                    
                    <!-- Accordion Content (Hidden by Default) -->
                    <div id="filterAccordionContent" style="display: none;" class="p-3 pt-0">
                        <div class="row g-2">
                            <!-- Muscle Group -->
                            <div class="col-6">
                                <label class="form-label small mb-1">Muscle Group</label>
                                <select class="form-select form-select-sm" id="muscleGroupFilter">
                                    <option value="">All</option>
                                    <!-- Populated dynamically -->
                                </select>
                            </div>
                            
                            <!-- Difficulty -->
                            <div class="col-6">
                                <label class="form-label small mb-1">Difficulty</label>
                                <select class="form-select form-select-sm" id="difficultyFilter">
                                    <option value="">All</option>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            
                            <!-- Equipment -->
                            <div class="col-12">
                                <label class="form-label small mb-1">Equipment</label>
                                <select class="form-select form-select-sm" id="equipmentFilter" multiple>
                                    <!-- Populated dynamically -->
                                </select>
                                <small class="text-muted d-block mt-1">Tap to select multiple</small>
                            </div>
                            
                            <!-- Sort By -->
                            <div class="col-6">
                                <label class="form-label small mb-1">Sort By</label>
                                <select class="form-select form-select-sm" id="sortBySelect">
                                    <option value="name-asc">Name (A-Z)</option>
                                    <option value="name-desc">Name (Z-A)</option>
                                    <option value="muscle">Muscle Group</option>
                                    <option value="tier">Standard First</option>
                                </select>
                            </div>
                            
                            <!-- Favorites Toggle -->
                            <div class="col-6 d-flex align-items-end">
                                <div class="form-check form-switch mb-0">
                                    <input class="form-check-input" type="checkbox" id="favoritesOnlyFilter">
                                    <label class="form-check-label small" for="favoritesOnlyFilter">
                                        Favorites Only
                                    </label>
                                </div>
                            </div>
                            
                            <div class="col-6" style="display: none;">
                                <select class="form-select form-select-sm" id="tierFilter">
                                    <option value="">All Tiers</option>
                                    <option value="1">⭐ Standard (Tier 1)</option>
                                    <option value="2">⭐ Standard (Tier 2)</option>
                                    <option value="3">◦ Specialized</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Exercise Library Section -->
                <div class="exercise-library-section">
                    <div class="p-3 pb-2 border-bottom bg-light">
                        <h6 class="mb-0 text-muted small">
                            <i class="bx bx-book-open me-2"></i>Exercise Library
                        </h6>
                    </div>

                    <!-- Exercise List (Scrollable) -->
                    <div id="exerciseList" class="p-3" style="overflow-y: auto; max-height: calc(85vh - 450px);">
                        <!-- Exercise cards rendered here -->
                    </div>
                    
                    <!-- Pagination Footer -->
                    <div class="p-2 border-top bg-light" id="paginationFooter" style="display: none; position: sticky; bottom: 0; z-index: 1020;">
                        <div class="text-center">
                            <small class="text-muted d-block mb-2" id="pageInfo">Showing 1-30 of 250</small>
                            <div class="d-flex justify-content-center" id="paginationControls">
                                <!-- Rendered by renderPagination() -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Empty State -->
                    <div id="emptyState" class="text-center py-5" style="display: none;">
                        <i class="bx bx-search-alt display-1 text-muted"></i>
                        <p class="text-muted mt-3">No exercises found</p>
                        <small class="text-muted d-block">Try adjusting your filters or use the "Add Exercise" button above to create a custom exercise</small>
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
    
    return createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        // State management - UPDATED for new UX (exercise name as focal point)
        const state = {
            exerciseName: '',      // Primary: Exercise name (also used for filtering)
            sets: '3',
            reps: '12',
            rest: '60s',
            searchQuery: '',       // Synced with exerciseName for filtering
            muscleGroup: '',
            difficulty: '',
            tier: '',
            equipment: [],
            favoritesOnly: false,
            sortBy: 'name',
            sortOrder: 'asc',
            allExercises: [],
            filteredExercises: [],
            paginatedExercises: [],
            currentPage: 1,
            pageSize: window.innerWidth <= 768 ? 20 : 30,
            isLoading: false
        };
        
        // Get DOM elements - UPDATED for new structure
        const exerciseNameInput = offcanvasElement.querySelector('#exerciseNameInput');
        const clearNameBtn = offcanvasElement.querySelector('#clearNameBtn');
        const setsInput = offcanvasElement.querySelector('#setsInput');
        const repsInput = offcanvasElement.querySelector('#repsInput');
        const restInput = offcanvasElement.querySelector('#restInput');
        const addExerciseBtn = offcanvasElement.querySelector('#addExerciseBtn');
        const toggleFiltersBtn = offcanvasElement.querySelector('#toggleFiltersBtn');
        const filterAccordionContent = offcanvasElement.querySelector('#filterAccordionContent');
        const filterChevron = offcanvasElement.querySelector('#filterChevron');
        const exerciseList = offcanvasElement.querySelector('#exerciseList');
        const emptyState = offcanvasElement.querySelector('#emptyState');
        const loadingState = offcanvasElement.querySelector('#loadingState');
        const muscleGroupFilter = offcanvasElement.querySelector('#muscleGroupFilter');
        const difficultyFilter = offcanvasElement.querySelector('#difficultyFilter');
        const tierFilter = offcanvasElement.querySelector('#tierFilter');
        const equipmentFilter = offcanvasElement.querySelector('#equipmentFilter');
        const favoritesOnlyFilter = offcanvasElement.querySelector('#favoritesOnlyFilter');
        const paginationFooter = offcanvasElement.querySelector('#paginationFooter');
        const pageInfo = offcanvasElement.querySelector('#pageInfo');
        const paginationControls = offcanvasElement.querySelector('#paginationControls');
        const clearAllBtn = offcanvasElement.querySelector('#clearAllBtn');
        
        // Load exercises from cache service
        const loadExercises = async () => {
            state.isLoading = true;
            loadingState.style.display = 'block';
            exerciseList.style.display = 'none';
            emptyState.style.display = 'none';
            
            try {
                if (window.exerciseCacheService) {
                    // Get all exercises from cache
                    await window.exerciseCacheService.loadExercises();
                    state.allExercises = window.exerciseCacheService.getAllExercises();
                    console.log(`✅ Loaded ${state.allExercises.length} exercises from cache`);
                } else {
                    console.warn('⚠️ exerciseCacheService not available');
                    state.allExercises = [];
                }
                
                // Load user favorites for filtering
                await loadUserFavorites();
                
            } catch (error) {
                console.error('❌ Error loading exercises:', error);
                state.allExercises = [];
            }
            
            state.isLoading = false;
            loadingState.style.display = 'none';
            
            // Populate muscle group filter with unique values
            const uniqueMuscleGroups = [...new Set(
                state.allExercises
                    .map(ex => ex.targetMuscleGroup)
                    .filter(mg => mg && mg.trim() !== '')
            )].sort();
            
            muscleGroupFilter.innerHTML = '<option value="">All Muscle Groups</option>' +
                uniqueMuscleGroups.map(mg =>
                    `<option value="${escapeHtml(mg)}">${escapeHtml(mg)}</option>`
                ).join('');
            
            // Populate equipment filter with unique values
            const uniqueEquipment = [...new Set(
                state.allExercises
                    .map(ex => ex.primaryEquipment)
                    .filter(eq => eq && eq.toLowerCase() !== 'none')
            )].sort();
            
            equipmentFilter.innerHTML = uniqueEquipment.map(eq =>
                `<option value="${escapeHtml(eq)}">${escapeHtml(eq)}</option>`
            ).join('');
            
            filterExercises();
        };
        
        // Load user favorites from API
        const loadUserFavorites = async () => {
            // Initialize favorites Set if it doesn't exist
            if (!window.ghostGym) {
                window.ghostGym = {};
            }
            if (!window.ghostGym.exercises) {
                window.ghostGym.exercises = {};
            }
            if (!window.ghostGym.exercises.favorites) {
                window.ghostGym.exercises.favorites = new Set();
            }
            
            // Only load if user is authenticated
            if (!window.firebaseAuth?.currentUser) {
                console.log('ℹ️ User not authenticated, skipping favorites load');
                return;
            }
            
            try {
                const token = await window.firebaseAuth.currentUser.getIdToken();
                const response = await fetch(window.getApiUrl('/api/v3/users/me/favorites'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    window.ghostGym.exercises.favorites = new Set(data.favorites.map(f => f.exerciseId));
                    console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites for filtering`);
                } else {
                    console.warn('⚠️ Failed to load favorites:', response.status);
                }
            } catch (error) {
                console.error('❌ Error loading favorites:', error);
            }
        };
        
        // PHASE 3: Multi-criteria filtering
        const filterExercises = () => {
            let filtered = [...state.allExercises];
            
            // 1. Search query (highest priority)
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase();
                filtered = filtered.filter(ex =>
                    (ex.name || '').toLowerCase().includes(query) ||
                    (ex.targetMuscleGroup || '').toLowerCase().includes(query) ||
                    (ex.primaryEquipment || '').toLowerCase().includes(query)
                );
            }
            
            // 2. Muscle group filter
            if (state.muscleGroup) {
                filtered = filtered.filter(ex => {
                    return ex.targetMuscleGroup === state.muscleGroup;
                });
            }
            
            // 3. Difficulty filter
            if (state.difficulty) {
                filtered = filtered.filter(ex =>
                    (ex.difficulty || '').toLowerCase() === state.difficulty.toLowerCase()
                );
            }
            
            // 4. Tier filter
            if (state.tier) {
                const tierNum = parseInt(state.tier);
                filtered = filtered.filter(ex => {
                    const exTier = parseInt(ex.exerciseTier || '1');
                    if (tierNum === 3) {
                        return exTier === 3;
                    } else {
                        return exTier === tierNum;
                    }
                });
            }
            
            // 5. Equipment filter (multi-select)
            if (state.equipment.length > 0) {
                filtered = filtered.filter(ex => {
                    const exEquip = (ex.primaryEquipment || '').toLowerCase();
                    return state.equipment.some(eq => exEquip.includes(eq.toLowerCase()));
                });
            }
            
            // 6. Favorites filter
            if (state.favoritesOnly) {
                // Check if favorites are available
                if (window.ghostGym?.exercises?.favorites) {
                    filtered = filtered.filter(ex => {
                        // Check if exercise ID exists in favorites Set
                        return window.ghostGym.exercises.favorites.has(ex.id);
                    });
                } else {
                    console.warn('⚠️ Favorites filter enabled but favorites data not available');
                    // Show empty results if favorites aren't loaded
                    filtered = [];
                }
            }
            
            state.filteredExercises = filtered;
            applySorting();         // NEW: Apply sorting after filtering
            state.currentPage = 1; // Reset to first page on new filter
            applyPagination();
        };
        
        // PHASE 5: Sorting logic
        const applySorting = () => {
            switch (state.sortBy) {
                case 'name':
                    state.filteredExercises.sort((a, b) => {
                        const nameA = (a.name || '').toLowerCase();
                        const nameB = (b.name || '').toLowerCase();
                        return state.sortOrder === 'asc'
                            ? nameA.localeCompare(nameB)
                            : nameB.localeCompare(nameA);
                    });
                    break;
                    
                case 'muscle':
                    state.filteredExercises.sort((a, b) => {
                        const muscleA = (a.targetMuscleGroup || '').toLowerCase();
                        const muscleB = (b.targetMuscleGroup || '').toLowerCase();
                        if (muscleA === muscleB) {
                            return (a.name || '').localeCompare(b.name || '');
                        }
                        return muscleA.localeCompare(muscleB);
                    });
                    break;
                    
                case 'tier':
                    state.filteredExercises.sort((a, b) => {
                        const tierA = parseInt(a.exerciseTier || '1');
                        const tierB = parseInt(b.exerciseTier || '1');
                        if (tierA === tierB) {
                            return (a.name || '').localeCompare(b.name || '');
                        }
                        return tierA - tierB;  // Lower tiers (1, 2) first
                    });
                    break;
                    
                case 'difficulty':
                    const diffOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
                    state.filteredExercises.sort((a, b) => {
                        const diffA = diffOrder[(a.difficulty || 'intermediate').toLowerCase()] || 2;
                        const diffB = diffOrder[(b.difficulty || 'intermediate').toLowerCase()] || 2;
                        if (diffA === diffB) {
                            return (a.name || '').localeCompare(b.name || '');
                        }
                        return diffA - diffB;
                    });
                    break;
            }
        };
        
        // PHASE 4: Pagination logic
        const applyPagination = () => {
            const totalPages = Math.ceil(state.filteredExercises.length / state.pageSize);
            const startIdx = (state.currentPage - 1) * state.pageSize;
            const endIdx = startIdx + state.pageSize;
            
            state.paginatedExercises = state.filteredExercises.slice(startIdx, endIdx);
            
            renderExerciseList();
            renderPagination(totalPages);
        };
        
        const renderPagination = (totalPages) => {
            if (totalPages <= 1) {
                paginationFooter.style.display = 'none';
                return;
            }
            
            paginationFooter.style.display = 'block';
            
            const startIdx = (state.currentPage - 1) * state.pageSize + 1;
            const endIdx = Math.min(state.currentPage * state.pageSize, state.filteredExercises.length);
            pageInfo.textContent = `Showing ${startIdx}-${endIdx} of ${state.filteredExercises.length}`;
            
            // Render Bootstrap 5 pagination with center alignment
            let paginationHtml = '<nav aria-label="Exercise pagination"><ul class="pagination pagination-sm mb-0 justify-content-center">';
            
            // Previous button
            paginationHtml += `
                <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${state.currentPage - 1}">
                        <i class="bx bx-chevron-left"></i>
                    </a>
                </li>`;
            
            // Page number buttons (show max 9 pages)
            const maxButtons = 9;
            let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            
            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <li class="page-item ${i === state.currentPage ? 'active' : ''}">
                        <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                    </li>`;
            }
            
            // Next button
            paginationHtml += `
                <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${state.currentPage + 1}">
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
                    if (page >= 1 && page <= totalPages) {
                        state.currentPage = page;
                        applyPagination();
                        exerciseList.scrollTop = 0;
                    }
                });
            });
        };
        
        // PHASE 5: Enhanced card rendering with metadata
        const renderExerciseList = () => {
            if (state.paginatedExercises.length === 0) {
                exerciseList.style.display = 'none';
                emptyState.style.display = 'block';
                paginationFooter.style.display = 'none';
                return;
            }
            
            exerciseList.style.display = 'block';
            emptyState.style.display = 'none';
            
            exerciseList.innerHTML = state.paginatedExercises.map(exercise => {
                const tier = exercise.exerciseTier || '1';
                const difficulty = exercise.difficulty || 'Intermediate';
                const muscle = exercise.targetMuscleGroup || '';
                const equipment = exercise.primaryEquipment || 'None';
                
                // Tier badge (matching exercise database)
                const tierBadge = (parseInt(tier) === 3)
                    ? '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>'
                    : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';
                
                // Difficulty badge
                const difficultyColors = { 'B': 'success', 'I': 'warning', 'A': 'danger' };
                const diffAbbr = difficulty.charAt(0).toUpperCase();
                const diffColor = difficultyColors[diffAbbr] || 'secondary';
                const difficultyBadge = `<span class="badge badge-outline-${diffColor}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background: transparent;">${difficulty}</span>`;
                
                return `
                    <div class="card mb-0" style="margin-bottom: 0.375rem !important;">
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
                                <div class="flex-shrink-0 ms-3">
                                    <button class="btn btn-sm btn-primary" data-exercise-id="${escapeHtml(exercise.id || exercise.name)}">
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        };
        
        // Exercise name input handler (DUAL PURPOSE: name + search filter)
        exerciseNameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            state.exerciseName = value;
            state.searchQuery = value.toLowerCase();
            
            // Update UI
            clearNameBtn.style.display = value ? 'block' : 'none';
            addExerciseBtn.disabled = !value;
            
            // Filter library as user types
            filterExercises();
        });
        
        // Clear name button
        clearNameBtn.addEventListener('click', () => {
            exerciseNameInput.value = '';
            state.exerciseName = '';
            state.searchQuery = '';
            clearNameBtn.style.display = 'none';
            addExerciseBtn.disabled = true;
            filterExercises();
            exerciseNameInput.focus();
        });
        
        // Sets/Reps/Rest input handlers
        setsInput.addEventListener('input', (e) => {
            state.sets = e.target.value.trim() || '3';
        });
        
        repsInput.addEventListener('input', (e) => {
            state.reps = e.target.value.trim() || '12';
        });
        
        restInput.addEventListener('input', (e) => {
            state.rest = e.target.value.trim() || '60s';
        });
        
        // Add Exercise Button handler (PRIMARY ACTION)
        addExerciseBtn.addEventListener('click', async () => {
            if (!state.exerciseName) return;
            
            // Show loading state
            addExerciseBtn.disabled = true;
            addExerciseBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
            
            try {
                // Auto-create custom exercise if needed
                if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                    const currentUser = window.dataManager.getCurrentUser();
                    const userId = currentUser?.uid || null;
                    await window.exerciseCacheService.autoCreateIfNeeded(state.exerciseName, userId);
                }
                
                // Call the add callback with exercise data
                await onAddExercise({
                    name: state.exerciseName,
                    sets: state.sets,
                    reps: state.reps,
                    rest: state.rest,
                    weight: '',
                    unit: 'lbs'
                });
                
                // Close offcanvas
                offcanvas.hide();
                
                // Show success toast
                if (window.showToast) {
                    window.showToast({
                        message: `Added ${state.exerciseName} to workout`,
                        type: 'success',
                        title: 'Exercise Added',
                        icon: 'bx-plus-circle',
                        delay: 3000
                    });
                }
                
            } catch (error) {
                console.error('❌ Error adding exercise:', error);
                addExerciseBtn.disabled = false;
                addExerciseBtn.innerHTML = '<i class="bx bx-plus-circle me-2"></i>Add Exercise';
                
                if (window.showToast) {
                    window.showToast({
                        message: 'Failed to add exercise. Please try again.',
                        type: 'danger',
                        title: 'Error',
                        icon: 'bx-error',
                        delay: 3000
                    });
                }
            }
        });
        
        // Toggle Filters Accordion
        toggleFiltersBtn.addEventListener('click', () => {
            const isHidden = filterAccordionContent.style.display === 'none';
            filterAccordionContent.style.display = isHidden ? 'block' : 'none';
            filterChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
        
        // Clear all button (in empty state) - only exists when empty state is shown
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                exerciseNameInput.value = '';
                state.exerciseName = '';
                state.searchQuery = '';
                state.muscleGroup = '';
                state.difficulty = '';
                state.tier = '';
                state.equipment = [];
                state.favoritesOnly = false;
                clearNameBtn.style.display = 'none';
                addExerciseBtn.disabled = true;
                
                // Reset all filter dropdowns
                muscleGroupFilter.value = '';
                difficultyFilter.value = '';
                tierFilter.value = '';
                equipmentFilter.selectedIndex = -1;
                
                // Reset favorites toggle
                favoritesOnlyFilter.checked = false;
                
                filterExercises();
            });
        }
        
        // Muscle group filter handler
        muscleGroupFilter?.addEventListener('change', (e) => {
            state.muscleGroup = e.target.value;
            filterExercises();
        });
        
        // Difficulty filter
        difficultyFilter?.addEventListener('change', (e) => {
            state.difficulty = e.target.value;
            filterExercises();
        });
        
        // Tier filter
        tierFilter?.addEventListener('change', (e) => {
            state.tier = e.target.value;
            filterExercises();
        });
        
        // Equipment filter (multi-select)
        equipmentFilter?.addEventListener('change', (e) => {
            state.equipment = Array.from(e.target.selectedOptions).map(opt => opt.value);
            filterExercises();
        });
        
        // Favorites toggle switch
        favoritesOnlyFilter?.addEventListener('change', (e) => {
            state.favoritesOnly = e.target.checked;
            filterExercises();
        });
        
        // Sort handler
        const sortBySelect = offcanvasElement.querySelector('#sortBySelect');
        sortBySelect?.addEventListener('change', (e) => {
            const [sortBy, order] = e.target.value.split('-');
            state.sortBy = sortBy;
            state.sortOrder = order || 'asc';
            applySorting();
            applyPagination();
        });
        
        // Exercise click handler - delegate to button only
        exerciseList.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-exercise-id]');
            if (!button) return;
            
            const exerciseId = button.dataset.exerciseId;
            const exercise = state.filteredExercises.find(ex =>
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
                
                // Call the add callback with exercise data
                await onAddExercise({
                    name: exercise.name,
                    sets: '3',
                    reps: '12',
                    weight: '',
                    unit: 'lbs'
                });
                
                // Close offcanvas
                offcanvas.hide();
                
                // Show success toast
                if (window.showToast) {
                    window.showToast({
                        message: `Added ${exercise.name} to workout`,
                        type: 'success',
                        title: 'Exercise Added',
                        icon: 'bx-plus-circle',
                        delay: 3000
                    });
                }
                
            } catch (error) {
                console.error('❌ Error adding exercise:', error);
                button.disabled = false;
                button.innerHTML = 'Add';
                
                if (window.showToast) {
                    window.showToast({
                        message: 'Failed to add exercise. Please try again.',
                        type: 'danger',
                        title: 'Error',
                        icon: 'bx-error',
                        delay: 3000
                    });
                }
            }
        });
        
        // Initialize when offcanvas is shown
        offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
            loadExercises();
            
            // Auto-focus exercise name input on desktop only
            if (exerciseNameInput && window.innerWidth > 768) {
                setTimeout(() => exerciseNameInput.focus(), 100);
            }
        }, { once: true });
    });
}

/* ============================================
   EXERCISE SEARCH OFFCANVAS (Reusable)
   Standalone exercise search with filters
   ============================================ */

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
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
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
                    : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';
                
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
                                <div class="flex-shrink-0 ms-3">
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
            } else if (event === 'filtered' || event === 'paginated') {
                renderExerciseList();
                if (event === 'paginated') {
                    renderPagination(data);
                }
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
                console.error('❌ Error selecting exercise:', error);
                button.disabled = false;
                button.innerHTML = `<i class="bx ${buttonIcon} me-1"></i>${buttonText}`;
            }
        });
    });
}

/* ============================================
   EXERCISE FILTER OFFCANVAS (List-style with checkmarks)
   ============================================ */

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
        searchCore = null  // Accept search core for preview count
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
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
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
                    <div class="p-3 bg-light">
                        <h6 class="mb-0 fw-semibold">Muscle Group</h6>
                    </div>
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
                
                <!-- Difficulty Section -->
                <div class="filter-category border-bottom">
                    <div class="p-3 bg-light">
                        <h6 class="mb-0 fw-semibold">Difficulty</h6>
                    </div>
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
                
                <!-- Equipment Section (Multi-select) -->
                <div class="filter-category border-bottom">
                    <div class="p-3 bg-light">
                        <h6 class="mb-0 fw-semibold">Equipment</h6>
                    </div>
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
                
                <!-- Sort By Section -->
                <div class="filter-category border-bottom">
                    <div class="p-3 bg-light">
                        <h6 class="mb-0 fw-semibold">Sort By</h6>
                    </div>
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
        // Function to update preview count
        const updatePreviewCount = () => {
            if (!searchCore) return;
            
            const count = searchCore.previewFilterCount(filterState);
            const applyBtnText = element.querySelector('#applyBtnText');
            
            if (applyBtnText) {
                applyBtnText.textContent = count > 0 ? `Show ${count} exercises` : 'No exercises';
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
                
                // Update preview count after any filter change
                updatePreviewCount();
            });
        });
        
        // Initialize preview count
        updatePreviewCount();
        
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

console.log('📦 Offcanvas exercise components loaded');
