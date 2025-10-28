/**
 * Ghost Gym Dashboard - Workout Database Module
 * Handles workout library display, filtering, sorting, and actions
 * @version 1.0.0
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
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedTags = window.ghostGym.workoutDatabase.filters.tags || [];
    const sortBy = window.ghostGym.workoutDatabase.filters.sortBy || 'modified_date';
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(workout => {
            return workout.name.toLowerCase().includes(searchTerm) ||
                   (workout.description || '').toLowerCase().includes(searchTerm) ||
                   (workout.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
        });
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
    // Clear search input
    document.getElementById('searchInput').value = '';
    
    // Reset filter state
    window.ghostGym.workoutDatabase.filters.tags = [];
    window.ghostGym.workoutDatabase.filters.sortBy = 'modified_date';
    
    // Reset button texts
    document.getElementById('sortByText').textContent = 'Recently Modified';
    document.getElementById('tagsText').textContent = 'All Tags';
    
    // Re-apply filters
    filterWorkouts();
}

/**
 * ============================================
 * RENDERING
 * ============================================
 */

/**
 * Render workout table with pagination
 */
function renderWorkoutTable() {
    const tableBody = document.getElementById('workoutTableBody');
    const tableContainer = document.getElementById('workoutTableContainer');
    const emptyState = document.getElementById('workoutEmptyState');
    const loadingState = document.getElementById('workoutLoadingState');
    const paginationFooter = document.getElementById('workoutPaginationFooter');
    
    if (!tableBody) return;
    
    // Hide loading
    loadingState.style.display = 'none';
    
    const filtered = window.ghostGym.workoutDatabase.filtered;
    
    // Show empty state if no workouts
    if (filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        paginationFooter.style.display = 'none';
        updateStats(0);
        return;
    }
    
    // Show table
    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    paginationFooter.style.display = 'block';
    
    // Calculate pagination
    const pageSize = window.ghostGym.workoutDatabase.pageSize;
    const currentPage = window.ghostGym.workoutDatabase.currentPage;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageWorkouts = filtered.slice(startIndex, endIndex);
    
    // Store displayed workouts
    window.ghostGym.workoutDatabase.displayed = pageWorkouts;
    
    // Render rows
    tableBody.innerHTML = pageWorkouts.map(workout => createWorkoutTableRow(workout)).join('');
    
    // Update pagination
    updatePagination();
    
    // Update stats
    updateStats(filtered.length);
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
                    <button class="btn btn-outline-secondary" onclick="doWorkout('${workout.id}')" title="Do Workout" disabled>
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
    
    // Navigate to workouts.html (editor page)
    window.location.href = 'workouts.html';
}

/**
 * Do workout - Coming soon
 */
function doWorkout(workoutId) {
    if (window.showAlert) {
        window.showAlert('Workout execution feature coming soon!', 'info');
    } else {
        alert('Workout execution feature coming soon!');
    }
    
    console.log('🏋️ Do workout (coming soon):', workoutId);
    // Future: Navigate to workout-do.html?id=${workoutId}
}

/**
 * View workout details - Open modal
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
        
        // Populate modal
        populateWorkoutDetailModal(workout);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('workoutDetailModal'));
        modal.show();
        
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
 * Populate workout detail modal
 */
function populateWorkoutDetailModal(workout) {
    // Set title
    document.getElementById('workoutDetailName').textContent = workout.name;
    
    // Build modal body HTML
    let bodyHTML = '';
    
    // Metadata section
    bodyHTML += `
        <div class="workout-detail-meta mb-4">
            ${workout.description ? `<p class="text-muted">${escapeHtml(workout.description)}</p>` : ''}
            <div class="d-flex gap-3 mb-2">
                <span class="text-muted"><i class="bx bx-calendar me-1"></i> Created: ${formatDate(workout.created_date)}</span>
                <span class="text-muted"><i class="bx bx-time me-1"></i> Modified: ${formatDate(workout.modified_date)}</span>
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
        bodyHTML += '<h6 class="mb-3">Exercise Groups</h6>';
        
        workout.exercise_groups.forEach((group, index) => {
            bodyHTML += `
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
                        <div class="d-flex gap-2">
                            <span class="badge bg-label-primary">Sets: ${group.sets || '3'}</span>
                            <span class="badge bg-label-info">Reps: ${group.reps || '8-12'}</span>
                            <span class="badge bg-label-secondary">Rest: ${group.rest || '60s'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    // Bonus Exercises
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        bodyHTML += '<h6 class="mb-3 mt-4">Bonus Exercises</h6>';
        
        workout.bonus_exercises.forEach((bonus, index) => {
            bodyHTML += `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${escapeHtml(bonus.name)}</strong>
                            <div class="d-flex gap-2">
                                <span class="badge bg-label-primary">${bonus.sets || '2'} sets</span>
                                <span class="badge bg-label-info">${bonus.reps || '15'} reps</span>
                                <span class="badge bg-label-secondary">${bonus.rest || '30s'} rest</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    // Set modal body
    document.getElementById('workoutDetailBody').innerHTML = bodyHTML;
    
    // Set up modal action buttons
    document.getElementById('editWorkoutFromModal').onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('workoutDetailModal')).hide();
        editWorkout(workout.id);
    };
    
    document.getElementById('doWorkoutFromModal').onclick = () => {
        doWorkout(workout.id);
    };
}

/**
 * Create new workout - Navigate to editor
 */
function createNewWorkout() {
    console.log('➕ Creating new workout');
    
    // Clear any existing workout ID
    sessionStorage.removeItem('editWorkoutId');
    
    // Navigate to workouts.html (editor page)
    window.location.href = 'workouts.html';
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

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    } catch (error) {
        return dateString;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    document.getElementById('workoutLoadingState').style.display = 'block';
    document.getElementById('workoutEmptyState').style.display = 'none';
    document.getElementById('workoutTableContainer').style.display = 'none';
    document.getElementById('workoutPaginationFooter').style.display = 'none';
}

/**
 * Show error state
 */
function showWorkoutError(message) {
    const emptyState = document.getElementById('workoutEmptyState');
    emptyState.innerHTML = `
        <i class="bx bx-error-circle display-1 text-danger"></i>
        <h5 class="mt-3">Error Loading Workouts</h5>
        <p class="text-muted">${escapeHtml(message)}</p>
        <button class="btn btn-primary mt-2" onclick="loadWorkouts()">
            <i class="bx bx-refresh me-1"></i>Retry
        </button>
    `;
    
    document.getElementById('workoutLoadingState').style.display = 'none';
    emptyState.style.display = 'block';
    document.getElementById('workoutTableContainer').style.display = 'none';
    document.getElementById('workoutPaginationFooter').style.display = 'none';
}

/**
 * ============================================
 * GLOBAL EXPORTS
 * ============================================
 */

// Make functions globally available
window.loadWorkouts = loadWorkouts;
window.filterWorkouts = filterWorkouts;
window.clearFilters = clearFilters;
window.goToPage = goToPage;
window.handleEntriesPerPageChange = handleEntriesPerPageChange;
window.editWorkout = editWorkout;
window.doWorkout = doWorkout;
window.viewWorkoutDetails = viewWorkoutDetails;
window.createNewWorkout = createNewWorkout;

console.log('📦 Workout Database module loaded');