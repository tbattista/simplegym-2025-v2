/**
 * Ghost Gym Dashboard - Workout Database Module
 * Handles workout library display, filtering, sorting, and actions
 * @version 2.0.0 - Refactored to use common-utils.js
 *
 * NOTE: Core utility functions (escapeHtml, formatDate, truncateText, showLoading)
 * are now loaded from common-utils.js
 */

/**
 * ============================================
 * DATA LOADING
 * ============================================
 */

/**
 * Load all workouts from API
 */
async function loadWorkouts() {
    try {
        showWorkoutLoading();
        
        console.log('📡 Loading workouts from data manager...');
        
        // Always load fresh data from data manager to ensure we have the latest
        if (!window.dataManager || !window.dataManager.getWorkouts) {
            throw new Error('Data manager not available');
        }
        
        // Load workouts directly from data manager
        const workouts = await window.dataManager.getWorkouts();
        console.log(`✅ Loaded ${workouts.length} workouts from data manager`);
        
        // Update both global state and local state
        window.ghostGym = window.ghostGym || {};
        window.ghostGym.workouts = workouts;
        window.ghostGym.workoutDatabase.all = workouts;
        window.ghostGym.workoutDatabase.stats.total = workouts.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ghostGym.workoutDatabase.stats.total;
        }
        
        // Load tag options
        loadTagOptions();
        
        // Apply filters and render
        filterWorkouts();
        
    } catch (error) {
        console.error('❌ Failed to load workouts:', error);
        showWorkoutError('Failed to load workouts: ' + error.message);
    }
}

/**
 * Load available tags and initialize popovers
 */
function loadTagOptions() {
    // Get all unique tags
    const tagSet = new Set();
    window.ghostGym.workoutDatabase.all.forEach(workout => {
        (workout.tags || []).forEach(tag => tagSet.add(tag));
    });
    
    const tags = Array.from(tagSet).sort();
    
    console.log(`✅ Loaded ${tags.length} unique tags`);
    
    // Initialize Sort By popover
    initializeSortByPopover();
    
    // Initialize Tags popover
    initializeTagsPopover(tags);
}

/**
 * Initialize Sort By popover
 */
function initializeSortByPopover() {
    const sortByBtn = document.getElementById('sortByBtn');
    if (!sortByBtn) return;
    
    const sortOptions = [
        { value: 'modified_date', label: 'Recently Modified' },
        { value: 'created_date', label: 'Recently Created' },
        { value: 'name', label: 'Alphabetical (A-Z)' },
        { value: 'exercise_count', label: 'Most Exercises' }
    ];
    
    const popoverContent = `
        <div class="sort-popover-content">
            ${sortOptions.map(opt => `
                <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start sort-option"
                        data-value="${opt.value}">
                    ${opt.label}
                </button>
            `).join('')}
        </div>
    `;
    
    const popover = new bootstrap.Popover(sortByBtn, {
        content: popoverContent,
        html: true,
        sanitize: false
    });
    
    // Handle sort option clicks
    sortByBtn.addEventListener('shown.bs.popover', () => {
        document.querySelectorAll('.sort-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                const label = sortOptions.find(opt => opt.value === value)?.label;
                
                // Update button text
                document.getElementById('sortByText').textContent = label;
                
                // Update filter and apply
                window.ghostGym.workoutDatabase.filters.sortBy = value;
                filterWorkouts();
                
                // Hide popover
                popover.hide();
            });
        });
    });
}

/**
 * Initialize Tags popover
 */
function initializeTagsPopover(tags) {
    const tagsBtn = document.getElementById('tagsBtn');
    if (!tagsBtn) return;
    
    const popoverContent = `
        <div class="tags-popover-content">
            <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start tag-option"
                    data-value="">
                All Tags
            </button>
            ${tags.map(tag => `
                <button class="btn btn-sm btn-outline-secondary w-100 mb-1 text-start tag-option"
                        data-value="${tag}">
                    ${tag}
                </button>
            `).join('')}
        </div>
    `;
    
    const popover = new bootstrap.Popover(tagsBtn, {
        content: popoverContent,
        html: true,
        sanitize: false
    });
    
    // Handle tag option clicks
    tagsBtn.addEventListener('shown.bs.popover', () => {
        document.querySelectorAll('.tag-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                const label = value || 'All Tags';
                
                // Update button text
                document.getElementById('tagsText').textContent = label;
                
                // Update filter and apply
                window.ghostGym.workoutDatabase.filters.tags = value ? [value] : [];
                filterWorkouts();
                
                // Hide popover
                popover.hide();
            });
        });
    });
}

/**
 * ============================================
 * FILTERING & SORTING
 * ============================================
 */

/**
 * Apply all filters and sort
 */
function filterWorkouts() {
    let filtered = [...window.ghostGym.workoutDatabase.all];
    
    // Get filter values from state
    const searchTerm = window.ghostGym.workoutDatabase.filters.search || '';
    const selectedTags = window.ghostGym.workoutDatabase.filters.tags || [];
    const sortBy = window.ghostGym.workoutDatabase.filters.sortBy || 'modified_date';
    
    // Apply search filter
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        console.log('🔍 Search term:', searchTerm, '→', searchLower);
        
        filtered = filtered.filter(workout => {
            return workout.name.toLowerCase().includes(searchLower) ||
                   (workout.description || '').toLowerCase().includes(searchLower) ||
                   (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
        });
        
        console.log('📊 Filtered results:', filtered.length, 'of', window.ghostGym.workoutDatabase.all.length);
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
        filtered = filtered.filter(workout => {
            return selectedTags.some(tag => (workout.tags || []).includes(tag));
        });
    }
    
    // Sort workouts
    filtered = sortWorkouts(filtered, sortBy);
    
    // Update filtered array
    window.ghostGym.workoutDatabase.filtered = filtered;
    
    // Reset to page 1
    window.ghostGym.workoutDatabase.currentPage = 1;
    
    // Render table
    renderWorkoutTable();
}

/**
 * Sort workouts by specified criteria
 */
function sortWorkouts(workouts, sortBy) {
    const sorted = [...workouts];
    
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
            
        case 'created_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.created_date);
                const dateB = new Date(b.created_date);
                return dateB - dateA; // Newest first
            });
            break;
            
        case 'modified_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.modified_date);
                const dateB = new Date(b.modified_date);
                return dateB - dateA; // Newest first
            });
            break;
            
        case 'exercise_count':
            sorted.sort((a, b) => {
                const countA = getTotalExerciseCount(a);
                const countB = getTotalExerciseCount(b);
                return countB - countA; // Most exercises first
            });
            break;
    }
    
    return sorted;
}

/**
 * Clear all filters
 */
function clearFilters() {
    // Clear search overlay input (correct element ID)
    const searchOverlayInput = document.getElementById('searchOverlayInput');
    if (searchOverlayInput) {
        searchOverlayInput.value = '';
    }
    
    // Reset filter state (including search)
    window.ghostGym.workoutDatabase.filters.search = '';
    window.ghostGym.workoutDatabase.filters.tags = [];
    window.ghostGym.workoutDatabase.filters.sortBy = 'modified_date';
    
    // Reset button texts (with null checks)
    const sortByText = document.getElementById('sortByText');
    const tagsText = document.getElementById('tagsText');
    if (sortByText) sortByText.textContent = 'Recently Modified';
    if (tagsText) tagsText.textContent = 'All Tags';
    
    console.log('🧹 Filters cleared');
    
    // Re-apply filters
    filterWorkouts();
}

/**
 * ============================================
 * RENDERING
 * ============================================
 */

/**
 * Render workout cards with pagination
 */
function renderWorkoutTable() {
    const container = document.getElementById('workoutTableContainer');
    if (!container) return;
    
    const filtered = window.ghostGym.workoutDatabase.filtered;
    
    // Update stats
    updateStats(filtered.length);
    
    // Show empty state if no workouts
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bx bx-dumbbell display-1 text-muted"></i>
                <h5 class="mt-3">No workouts found</h5>
                <p class="text-muted">Try adjusting your filters or create a new workout</p>
                <button class="btn btn-primary mt-2" onclick="createNewWorkout()">
                    <i class="bx bx-plus me-1"></i>Create Your First Workout
                </button>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const pageSize = window.ghostGym.workoutDatabase.pageSize;
    const currentPage = window.ghostGym.workoutDatabase.currentPage;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageWorkouts = filtered.slice(startIndex, endIndex);
    
    // Render workout cards
    const cardsHTML = pageWorkouts.map(workout => createWorkoutCard(workout)).join('');
    
    // Render pagination
    const paginationHTML = renderPaginationControls(filtered.length, currentPage, pageSize);
    
    container.innerHTML = `
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            ${cardsHTML}
        </div>
        ${paginationHTML}
    `;
}

/**
 * Create a single workout card
 */
function createWorkoutCard(workout) {
    // Get exercise list
    const exercises = getWorkoutExercisesList(workout);
    const exercisesPreview = exercises.slice(0, 3).map(e => escapeHtml(e)).join(' • ');
    
    // Get metadata
    const tags = workout.tags || [];
    const groupCount = workout.exercise_groups?.length || 0;
    const totalExercises = getTotalExerciseCount(workout);
    
    // Check if delete mode is active
    const isDeleteMode = window.ghostGym.workoutDatabase.deleteMode;
    const cardClass = isDeleteMode ? 'card h-100 delete-mode' : 'card h-100';
    
    return `
        <div class="col">
            <div class="${cardClass}">
                <div class="card-body">
                    <!-- Card Title -->
                    <h5 class="card-title mb-2">${escapeHtml(workout.name)}</h5>
                    
                    <!-- Metadata Badges -->
                    <div class="mb-2">
                        <span class="badge bg-label-primary me-1">${groupCount} ${groupCount === 1 ? 'group' : 'groups'}</span>
                        <span class="badge bg-label-info">${totalExercises} ${totalExercises === 1 ? 'exercise' : 'exercises'}</span>
                    </div>
                    
                    <!-- Exercise Preview -->
                    <p class="card-text text-muted small mb-2" style="min-height: 2.2em; line-height: 1.3;">
                        ${exercisesPreview || 'No exercises added yet'}
                    </p>
                    
                    <!-- Tags (if any) -->
                    ${tags.length > 0 ? `
                    <div class="mb-2">
                        ${tags.slice(0, 3).map(tag => `<span class="badge bg-label-secondary me-1 small">${escapeHtml(tag)}</span>`).join('')}
                        ${tags.length > 3 ? `<span class="badge bg-label-secondary small">+${tags.length - 3}</span>` : ''}
                    </div>
                    ` : ''}
                    
                    <!-- Action Buttons -->
                    ${isDeleteMode ? `
                    <button class="btn btn-delete-workout w-100 mt-auto" onclick="deleteWorkoutFromDatabase('${workout.id}', '${escapeHtml(workout.name).replace(/'/g, "\\'")}')">
                        <i class="bx bx-trash me-1"></i>Delete Workout
                    </button>
                    ` : `
                    <div class="btn-group btn-group-sm w-100 mt-auto" role="group">
                        <button class="btn btn-primary" onclick="doWorkout('${workout.id}')">
                            <i class="bx bx-play me-1"></i>Start
                        </button>
                        <button class="btn btn-outline-secondary" onclick="viewWorkoutDetails('${workout.id}')">
                            <i class="bx bx-show me-1"></i>View
                        </button>
                        <button class="btn btn-outline-info" onclick="viewWorkoutHistory('${workout.id}')">
                            <i class="bx bx-history me-1"></i>History
                        </button>
                        <button class="btn btn-outline-secondary" onclick="editWorkout('${workout.id}')">
                            <i class="bx bx-edit me-1"></i>Edit
                        </button>
                    </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Get list of exercise names from workout
 */
function getWorkoutExercisesList(workout) {
    const exercises = [];
    
    // Get exercises from groups
    if (workout.exercise_groups) {
        workout.exercise_groups.forEach(group => {
            if (group.exercises) {
                Object.values(group.exercises).forEach(name => {
                    if (name) exercises.push(name);
                });
            }
        });
    }
    
    // Add bonus exercises
    if (workout.bonus_exercises) {
        workout.bonus_exercises.forEach(bonus => {
            if (bonus.name) exercises.push(bonus.name);
        });
    }
    
    return exercises;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Render pagination controls
 */
function renderPaginationControls(totalItems, currentPage, pageSize) {
    const totalPages = Math.ceil(totalItems / pageSize);
    
    if (totalPages <= 1) return '';
    
    let html = '<div class="d-flex justify-content-between align-items-center p-4 border-top">';
    
    // Info text
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);
    html += `<div class="text-muted small">Showing ${startIndex} to ${endIndex} of ${totalItems} workouts</div>`;
    
    // Pagination buttons
    html += '<nav><ul class="pagination pagination-sm mb-0">';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" onclick="goToPage(${currentPage - 1})">
                <i class="bx bx-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers (show max 5 pages)
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0);" onclick="goToPage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" onclick="goToPage(${currentPage + 1})">
                <i class="bx bx-chevron-right"></i>
            </a>
        </li>
    `;
    
    html += '</ul></nav></div>';
    
    return html;
}

/**
 * Create a single workout table row
 */
function createWorkoutTableRow(workout) {
    const totalExercises = getTotalExerciseCount(workout);
    const groupCount = workout.exercise_groups?.length || 0;
    const tags = workout.tags || [];
    const modifiedDate = formatDate(workout.modified_date);
    
    return `
        <tr class="workout-row" data-workout-id="${workout.id}">
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <i class="bx bx-dumbbell me-2 text-primary"></i>
                    <div>
                        <strong>${escapeHtml(workout.name)}</strong>
                        ${workout.description ? `<br><small class="text-muted">${escapeHtml(workout.description.substring(0, 60))}${workout.description.length > 60 ? '...' : ''}</small>` : ''}
                    </div>
                </div>
            </td>
            <td class="text-center">
                <span class="badge bg-label-primary">${groupCount}</span>
            </td>
            <td class="text-center">
                <span class="badge bg-label-info">${totalExercises}</span>
            </td>
            <td>
                ${tags.slice(0, 2).map(tag => `<span class="badge bg-label-secondary me-1">${escapeHtml(tag)}</span>`).join('')}
                ${tags.length > 2 ? `<span class="badge bg-label-secondary">+${tags.length - 2}</span>` : ''}
            </td>
            <td>
                <small class="text-muted">${modifiedDate}</small>
            </td>
            <td class="text-center pe-4">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="editWorkout('${workout.id}')" title="Edit Workout">
                        <i class="bx bx-edit"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="doWorkout('${workout.id}')" title="Start Workout">
                        <i class="bx bx-play"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewWorkoutDetails('${workout.id}')" title="View Details">
                        <i class="bx bx-show"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const paginationControls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (!paginationControls || !paginationInfo) return;
    
    const filtered = window.ghostGym.workoutDatabase.filtered;
    const pageSize = window.ghostGym.workoutDatabase.pageSize;
    const currentPage = window.ghostGym.workoutDatabase.currentPage;
    const totalPages = Math.ceil(filtered.length / pageSize);
    
    // Update info text
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filtered.length);
    paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${filtered.length} entries`;
    
    // Generate pagination buttons
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" onclick="goToPage(${currentPage - 1})">
                <i class="bx bx-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers (show max 5 pages)
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0);" onclick="goToPage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0);" onclick="goToPage(${currentPage + 1})">
                <i class="bx bx-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationControls.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(window.ghostGym.workoutDatabase.filtered.length / window.ghostGym.workoutDatabase.pageSize);
    
    if (page < 1 || page > totalPages) return;
    
    window.ghostGym.workoutDatabase.currentPage = page;
    renderWorkoutTable();
    
    // Scroll to top of table
    document.getElementById('workoutTableContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Handle entries per page change
 */
function handleEntriesPerPageChange() {
    const select = document.getElementById('entriesPerPageSelect');
    if (!select) return;
    
    window.ghostGym.workoutDatabase.pageSize = parseInt(select.value) || 50;
    window.ghostGym.workoutDatabase.currentPage = 1;
    
    renderWorkoutTable();
}

/**
 * Update stats display
 */
function updateStats(showingCount) {
    document.getElementById('totalCount').textContent = window.ghostGym.workoutDatabase.stats.total;
    document.getElementById('showingCount').textContent = showingCount;
}

/**
 * ============================================
 * ACTIONS
 * ============================================
 */

/**
 * Edit workout - Navigate to workout editor
 */
function editWorkout(workoutId) {
    console.log('📝 Editing workout:', workoutId);
    
    // Store workout ID in sessionStorage
    sessionStorage.setItem('editWorkoutId', workoutId);
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
}

/**
 * Do workout - Navigate to workout mode
 */
function doWorkout(workoutId) {
    console.log('🏋️ Starting workout:', workoutId);
    window.location.href = `workout-mode.html?id=${workoutId}`;
}

/**
 * View workout details - Open modal or offcanvas depending on page
 */
async function viewWorkoutDetails(workoutId) {
    try {
        console.log('👁️ Viewing workout details:', workoutId);
        
        // Find workout in local data first
        let workout = window.ghostGym.workoutDatabase.all.find(w => w.id === workoutId);
        
        // If not found locally, fetch from API
        if (!workout) {
            const response = await fetch(`/api/v3/firebase/workouts/${workoutId}`, {
                headers: {
                    'Authorization': window.dataManager?.getAuthToken ?
                        `Bearer ${window.dataManager.getAuthToken()}` : ''
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load workout details');
            }
            
            workout = await response.json();
        }
        
        // Always use offcanvas for workout details
        showWorkoutDetailOffcanvas(workout);
        
    } catch (error) {
        console.error('❌ Failed to load workout details:', error);
        if (window.showAlert) {
            window.showAlert('Failed to load workout details: ' + error.message, 'danger');
        } else {
            alert('Failed to load workout details');
        }
    }
}

/**
 * Show workout details in offcanvas
 */
function showWorkoutDetailOffcanvas(workout) {
    // Get the offcanvas element
    const offcanvasElement = document.getElementById('workoutDetailOffcanvas');
    if (!offcanvasElement) {
        console.error('❌ Offcanvas element not found');
        return;
    }
    
    // Set title
    document.getElementById('workoutDetailName').textContent = workout.name;
    
    // Use shared HTML generator
    const bodyHTML = generateWorkoutDetailHTML(workout);
    
    // Set offcanvas body
    document.getElementById('workoutDetailBody').innerHTML = bodyHTML;
    
    // Set up action buttons
    document.getElementById('editWorkoutFromOffcanvas').onclick = () => {
        bootstrap.Offcanvas.getInstance(offcanvasElement).hide();
        editWorkout(workout.id);
    };
    
    document.getElementById('doWorkoutFromOffcanvas').onclick = () => {
        bootstrap.Offcanvas.getInstance(offcanvasElement).hide();
        doWorkout(workout.id);
    };
    
    // Initialize and show offcanvas
    const offcanvas = new bootstrap.Offcanvas(offcanvasElement);
    offcanvas.show();
}

/**
 * Generate workout detail HTML (reusable for both modal and offcanvas)
 */
function generateWorkoutDetailHTML(workout) {
    let html = '';
    
    // Metadata section
    html += `
        <div class="workout-detail-meta mb-4">
            ${workout.description ? `<p class="text-muted">${escapeHtml(workout.description)}</p>` : ''}
            <div class="d-flex gap-3 mb-2 flex-wrap">
                <span class="text-muted small"><i class="bx bx-calendar me-1"></i> Created: ${formatDate(workout.created_date)}</span>
                <span class="text-muted small"><i class="bx bx-time me-1"></i> Modified: ${formatDate(workout.modified_date)}</span>
            </div>
            ${workout.tags && workout.tags.length > 0 ? `
                <div class="mt-2">
                    ${workout.tags.map(tag => `<span class="badge bg-label-secondary me-1">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // Exercise Groups
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        html += '<h6 class="mb-3">Exercise Groups</h6>';
        
        workout.exercise_groups.forEach((group, index) => {
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">Group ${index + 1}</h6>
                        <div class="exercise-list mb-3">
                            ${Object.entries(group.exercises || {}).map(([key, name]) => `
                                <div class="d-flex align-items-center mb-2">
                                    <span class="badge bg-primary me-2">${key.toUpperCase()}</span>
                                    <span>${escapeHtml(name)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <span class="badge bg-label-primary">Sets: ${group.sets || '3'}</span>
                            <span class="badge bg-label-info">Reps: ${group.reps || '8-12'}</span>
                            <span class="badge bg-label-secondary">Rest: ${group.rest || '60s'}</span>
                        </div>
                        ${group.notes ? `<div class="mt-2 small text-muted">${escapeHtml(group.notes)}</div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    // Bonus Exercises
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        html += '<h6 class="mb-3 mt-4">Bonus Exercises</h6>';
        
        workout.bonus_exercises.forEach((bonus, index) => {
            html += `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <strong>${escapeHtml(bonus.name)}</strong>
                            <div class="d-flex gap-2 flex-wrap">
                                <span class="badge bg-label-primary">${bonus.sets || '2'} sets</span>
                                <span class="badge bg-label-info">${bonus.reps || '15'} reps</span>
                                <span class="badge bg-label-secondary">${bonus.rest || '30s'} rest</span>
                            </div>
                        </div>
                        ${bonus.notes ? `<div class="mt-2 small text-muted">${escapeHtml(bonus.notes)}</div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    return html;
}


/**
 * Create new workout - Navigate to editor
 */
function createNewWorkout() {
    console.log('➕ Creating new workout');
    
    // Clear any existing workout ID
    sessionStorage.removeItem('editWorkoutId');
    
    // Navigate to workout-builder.html (editor page)
    window.location.href = 'workout-builder.html';
}

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Get total exercise count for a workout
 */
function getTotalExerciseCount(workout) {
    let count = 0;
    
    // Count exercises in groups
    if (workout.exercise_groups) {
        workout.exercise_groups.forEach(group => {
            count += Object.keys(group.exercises || {}).length;
        });
    }
    
    // Add bonus exercises
    count += (workout.bonus_exercises || []).length;
    
    return count;
}

// formatDate, escapeHtml, truncateText are now in common-utils.js

/**
 * ============================================
 * SEARCH OVERLAY MANAGEMENT (Using Shared Component)
 * ============================================
 */

let searchOverlay = null;

/**
 * Initialize search overlay using shared component
 */
function initSearchOverlay() {
    searchOverlay = new GhostGymSearchOverlay({
        placeholder: 'Search workouts by name, description, or tags...',
        onSearch: (searchTerm) => {
            console.log('🔍 Search callback triggered with term:', searchTerm);
            
            // Update global state
            window.ghostGym.workoutDatabase.filters.search = searchTerm;
            console.log('📊 Updated filter state:', window.ghostGym.workoutDatabase.filters);
            
            // Use existing filter function
            filterWorkouts();
            
            console.log('✅ Search performed and filtered');
        },
        onResultsCount: (searchTerm) => {
            if (!searchTerm) {
                return { count: 0, total: 0 };
            }
            
            // Calculate matching workouts
            const searchLower = searchTerm.toLowerCase();
            const filtered = window.ghostGym.workoutDatabase.all.filter(workout => {
                return workout.name.toLowerCase().includes(searchLower) ||
                       (workout.description || '').toLowerCase().includes(searchLower) ||
                       (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
            });
            
            return {
                count: filtered.length,
                total: window.ghostGym.workoutDatabase.all.length
            };
        }
    });
    
    console.log('✅ Search overlay initialized with shared component');
}

/**
 * Show search overlay
 */
function showSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.show();
    }
}

/**
 * Hide search overlay
 */
function hideSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.hide();
    }
}

/**
 * ============================================
 * UI STATE MANAGEMENT
 * ============================================
 */

/**
 * Show loading state
 */
function showWorkoutLoading() {
    const container = document.getElementById('workoutTableContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading workouts...</span>
                </div>
                <p class="mt-3 text-muted">Loading workouts...</p>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showWorkoutError(message) {
    const container = document.getElementById('workoutTableContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bx bx-error-circle display-1 text-danger"></i>
                <h5 class="mt-3">Error Loading Workouts</h5>
                <p class="text-muted">${window.escapeHtml(message)}</p>
                <button class="btn btn-primary mt-2" onclick="loadWorkouts()">
                    <i class="bx bx-refresh me-1"></i>Retry
                </button>
            </div>
        `;
    }
}

/**
 * ============================================
 * GLOBAL EXPORTS
 * ============================================
 */

/**
 * ============================================
 * DELETE MODE MANAGEMENT
 * ============================================
 */

/**
 * Toggle delete mode on/off
 */
function toggleDeleteMode() {
    const isActive = document.getElementById('deleteModeToggle').checked;
    window.ghostGym.workoutDatabase.deleteMode = isActive;
    
    console.log(`🗑️ Delete mode ${isActive ? 'activated' : 'deactivated'}`);
    
    // Re-render cards with new button state
    renderWorkoutTable();
    
    // Optional: Add body class for global styling
    if (isActive) {
        document.body.classList.add('delete-mode-active');
    } else {
        document.body.classList.remove('delete-mode-active');
    }
}

/**
 * Delete workout from database with confirmation
 */
async function deleteWorkoutFromDatabase(workoutId, workoutName) {
    console.log('🗑️ Delete requested for workout:', workoutId, workoutName);
    
    // Show confirmation dialog
    const confirmed = confirm(`⚠️ Are you sure you want to delete "${workoutName}"?\n\nThis action cannot be undone.`);
    
    if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        console.log('🔄 Deleting workout from database...');
        
        // Delete from database using data manager
        await window.dataManager.deleteWorkout(workoutId);
        
        // Remove from local state
        window.ghostGym.workoutDatabase.all = window.ghostGym.workoutDatabase.all.filter(w => w.id !== workoutId);
        window.ghostGym.workouts = window.ghostGym.workouts.filter(w => w.id !== workoutId);
        
        // Update stats
        window.ghostGym.workoutDatabase.stats.total = window.ghostGym.workoutDatabase.all.length;
        
        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ghostGym.workoutDatabase.stats.total;
        }
        
        // Re-apply filters and render
        filterWorkouts();
        
        console.log('✅ Workout deleted successfully');
        
        // Show success message if available
        if (window.showAlert) {
            window.showAlert(`Workout "${workoutName}" deleted successfully`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Failed to delete workout:', error);
        
        // Show error message
        if (window.showAlert) {
            window.showAlert('Failed to delete workout: ' + error.message, 'danger');
        } else {
            alert('Failed to delete workout: ' + error.message);
        }
    }
}

/**
 * Initialize delete mode toggle
 */
function initDeleteModeToggle() {
    const toggle = document.getElementById('deleteModeToggle');
    if (toggle) {
        toggle.addEventListener('change', toggleDeleteMode);
        console.log('✅ Delete mode toggle initialized');
    } else {
        console.warn('⚠️ Delete mode toggle not found');
    }
}

/**
 * View workout history - Navigate to history page
 */
function viewWorkoutHistory(workoutId) {
    console.log('📊 Viewing workout history:', workoutId);
    window.location.href = `workout-history.html?id=${workoutId}`;
}

// Make functions globally available
window.loadWorkouts = loadWorkouts;
window.filterWorkouts = filterWorkouts;
window.clearFilters = clearFilters;
window.goToPage = goToPage;
window.handleEntriesPerPageChange = handleEntriesPerPageChange;
window.editWorkout = editWorkout;
window.doWorkout = doWorkout;
window.viewWorkoutDetails = viewWorkoutDetails;
window.viewWorkoutHistory = viewWorkoutHistory;
window.createNewWorkout = createNewWorkout;
window.initSearchOverlay = initSearchOverlay;
window.showSearchOverlay = showSearchOverlay;
window.hideSearchOverlay = hideSearchOverlay;
window.toggleDeleteMode = toggleDeleteMode;
window.deleteWorkoutFromDatabase = deleteWorkoutFromDatabase;
window.initDeleteModeToggle = initDeleteModeToggle;

console.log('📦 Workout Database module loaded (v2.0 - using common-utils)');