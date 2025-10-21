/**
 * Ghost Gym Dashboard - Exercise Database Module
 * Handles exercise loading, filtering, favorites, and custom exercises
 * @version 1.0.0
 */

/**
 * Load all exercises from API with caching
 */
async function loadExercises() {
    showExerciseLoading(true);
    
    try {
        // Check cache first
        const cached = getExerciseCache();
        if (cached && isExerciseCacheValid(cached)) {
            window.ghostGym.exercises.all = cached.exercises;
            console.log(`✅ Loaded ${window.ghostGym.exercises.all.length} exercises from cache`);
            await loadExerciseFavorites();
            await loadCustomExercises();
            await loadExerciseFilterOptions();
            filterExercises();
            return;
        }
        
        // Load from API
        console.log('📡 Loading exercises from API...');
        const PAGE_SIZE = 500;
        let allExercises = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await fetch(getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`));
            
            if (!response.ok) {
                throw new Error(`Failed to load exercises (page ${page})`);
            }
            
            const data = await response.json();
            const exercises = data.exercises || [];
            
            allExercises = [...allExercises, ...exercises];
            console.log(`📦 Loaded page ${page}: ${exercises.length} exercises (total: ${allExercises.length})`);
            
            hasMore = exercises.length === PAGE_SIZE;
            page++;
        }
        
        window.ghostGym.exercises.all = allExercises;
        
        // Cache the results
        setExerciseCache(allExercises);
        
        // Update total count
        const totalCount = document.getElementById('totalExercisesCount');
        if (totalCount) {
            totalCount.textContent = allExercises.length;
        }
        
        console.log(`✅ Loaded ${allExercises.length} exercises from API`);
        
        // Load user-specific data
        await loadExerciseFavorites();
        await loadCustomExercises();
        await loadExerciseFilterOptions();
        
        // Apply filters and render
        filterExercises();
        
    } catch (error) {
        console.error('❌ Error loading exercises:', error);
        showAlert('Failed to load exercises. Please try again.', 'danger');
    } finally {
        showExerciseLoading(false);
    }
}

/**
 * Load user's favorite exercises
 */
async function loadExerciseFavorites() {
    if (!window.firebaseAuth?.currentUser) {
        console.log('ℹ️ No user authenticated - clearing favorites');
        window.ghostGym.exercises.favorites.clear();
        return;
    }
    
    try {
        console.log('📡 Loading favorites for user:', window.firebaseAuth.currentUser.email);
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const url = getApiUrl('/api/v3/users/me/favorites');
        console.log('🔍 Fetching favorites from:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Favorites API response:', data);
            console.log('📦 Raw favorites array:', data.favorites);
            
            // Map favorites to Set of exercise IDs
            window.ghostGym.exercises.favorites = new Set(data.favorites.map(f => f.exerciseId));
            console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites:`, Array.from(window.ghostGym.exercises.favorites));
            
            // Update stats
            const favCount = document.getElementById('favoritesCount');
            if (favCount) {
                favCount.textContent = window.ghostGym.exercises.favorites.size;
            }
            
            // Force re-render if exercises are already displayed
            if (window.ghostGym.exercises.displayed && window.ghostGym.exercises.displayed.length > 0) {
                console.log('🔄 Re-rendering exercise table with favorites loaded');
                renderExerciseTable();
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Failed to load favorites:', response.status, errorText);
            window.ghostGym.exercises.favorites.clear();
        }
    } catch (error) {
        console.error('❌ Error loading favorites:', error);
        window.ghostGym.exercises.favorites.clear();
    }
}

/**
 * Load user's custom exercises
 */
async function loadCustomExercises() {
    if (!window.firebaseAuth?.currentUser) {
        window.ghostGym.exercises.custom = [];
        return;
    }
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const response = await fetch(getApiUrl('/api/v3/users/me/exercises'), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.ghostGym.exercises.custom = data.exercises || [];
            console.log(`✅ Loaded ${window.ghostGym.exercises.custom.length} custom exercises`);
            
            // Update stats
            const customCount = document.getElementById('customCount');
            if (customCount) {
                customCount.textContent = window.ghostGym.exercises.custom.length;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load custom exercises:', error.message);
    }
}

/**
 * Load filter options dynamically from exercise data
 */
async function loadExerciseFilterOptions() {
    try {
        // Get unique muscle groups
        const muscleGroups = [...new Set(window.ghostGym.exercises.all
            .map(e => e.targetMuscleGroup)
            .filter(m => m))]
            .sort();
        
        const muscleGroupSelect = document.getElementById('muscleGroupFilter');
        if (muscleGroupSelect) {
            // Clear existing options except first
            while (muscleGroupSelect.options.length > 1) {
                muscleGroupSelect.remove(1);
            }
            
            muscleGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                muscleGroupSelect.appendChild(option);
            });
        }
        
        // Get unique equipment
        const equipment = [...new Set(window.ghostGym.exercises.all
            .map(e => e.primaryEquipment)
            .filter(e => e))]
            .sort();
        
        const equipmentSelect = document.getElementById('equipmentFilter');
        if (equipmentSelect) {
            // Clear existing options except first
            while (equipmentSelect.options.length > 1) {
                equipmentSelect.remove(1);
            }
            
            equipment.forEach(equip => {
                const option = document.createElement('option');
                option.value = equip;
                option.textContent = equip;
                equipmentSelect.appendChild(option);
            });
        }
        
        console.log('✅ Filter options loaded');
        
    } catch (error) {
        console.error('❌ Error loading filter options:', error);
    }
}

/**
 * Filter exercises based on current filters
 */
function filterExercises() {
    // Update filter state from UI
    const searchInput = document.getElementById('exerciseSearch');
    const sortSelect = document.getElementById('sortBySelect');
    const muscleGroupSelect = document.getElementById('muscleGroupFilter');
    const equipmentSelect = document.getElementById('equipmentFilter');
    const difficultySelect = document.getElementById('difficultyFilter');
    const tierSelect = document.getElementById('tierFilter');
    const favoritesCheckbox = document.getElementById('showFavoritesOnly');
    const customCheckbox = document.getElementById('showCustomOnly');
    const foundationalCheckbox = document.getElementById('showFoundationalOnly');
    
    window.ghostGym.exercises.filters = {
        search: searchInput?.value?.trim() || '',
        muscleGroup: muscleGroupSelect?.value || '',
        equipment: equipmentSelect?.value || '',
        difficulty: difficultySelect?.value || '',
        tier: tierSelect?.value || '',
        sortBy: sortSelect?.value || 'name',
        favoritesOnly: favoritesCheckbox?.checked || false,
        customOnly: customCheckbox?.checked || false,
        foundationalOnly: foundationalCheckbox?.checked || false
    };
    
    // Combine global and custom exercises
    let allExercises = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom];
    
    // Apply search filter with fuzzy matching
    if (window.ghostGym.exercises.filters.search) {
        const searchTerms = window.ghostGym.exercises.filters.search
            .toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 0);
        
        allExercises = allExercises.filter(exercise => {
            const exerciseName = exercise.name.toLowerCase();
            const muscleGroup = (exercise.targetMuscleGroup || '').toLowerCase();
            const equipment = (exercise.primaryEquipment || '').toLowerCase();
            const searchableText = `${exerciseName} ${muscleGroup} ${equipment}`;
            
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    // Apply muscle group filter
    if (window.ghostGym.exercises.filters.muscleGroup) {
        allExercises = allExercises.filter(e => e.targetMuscleGroup === window.ghostGym.exercises.filters.muscleGroup);
    }
    
    // Apply equipment filter
    if (window.ghostGym.exercises.filters.equipment) {
        allExercises = allExercises.filter(e => e.primaryEquipment === window.ghostGym.exercises.filters.equipment);
    }
    
    // Apply difficulty filter
    if (window.ghostGym.exercises.filters.difficulty) {
        allExercises = allExercises.filter(e => e.difficultyLevel === window.ghostGym.exercises.filters.difficulty);
    }
    
    // Apply tier filter
    if (window.ghostGym.exercises.filters.tier) {
        const tierValue = parseInt(window.ghostGym.exercises.filters.tier);
        allExercises = allExercises.filter(e => e.exerciseTier === tierValue);
    }
    
    // Apply foundational only filter
    if (window.ghostGym.exercises.filters.foundationalOnly) {
        allExercises = allExercises.filter(e => e.isFoundational === true || e.exerciseTier === 1);
    }
    
    // Apply favorites only filter
    if (window.ghostGym.exercises.filters.favoritesOnly) {
        allExercises = allExercises.filter(e => window.ghostGym.exercises.favorites.has(e.id));
    }
    
    // Apply custom only filter
    if (window.ghostGym.exercises.filters.customOnly) {
        allExercises = allExercises.filter(e => !e.isGlobal);
    }
    
    // Apply sorting
    allExercises = sortExercises(allExercises);
    
    window.ghostGym.exercises.filtered = allExercises;
    window.ghostGym.exercises.currentPage = 1;
    
    // Update stats
    const showingCount = document.getElementById('showingCount');
    if (showingCount) {
        showingCount.textContent = window.ghostGym.exercises.filtered.length;
    }
    
    // Render first page
    renderExerciseTable();
}

/**
 * Sort exercises based on current sort option
 */
function sortExercises(exercises) {
    const sorted = [...exercises];
    
    switch (window.ghostGym.exercises.filters.sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        
        case 'popularity':
            sorted.sort((a, b) => {
                const scoreA = a.popularityScore || 50;
                const scoreB = b.popularityScore || 50;
                return scoreB - scoreA; // Descending
            });
            break;
        
        case 'foundational':
            sorted.sort((a, b) => {
                // Sort by tier first (1, 2, 3), then by foundational score
                const tierA = a.exerciseTier || 2;
                const tierB = b.exerciseTier || 2;
                if (tierA !== tierB) return tierA - tierB;
                
                const scoreA = a.foundationalScore || 50;
                const scoreB = b.foundationalScore || 50;
                return scoreB - scoreA; // Descending within tier
            });
            break;
        
        case 'favorites':
            sorted.sort((a, b) => {
                const aFav = window.ghostGym.exercises.favorites.has(a.id) ? 1 : 0;
                const bFav = window.ghostGym.exercises.favorites.has(b.id) ? 1 : 0;
                if (aFav !== bFav) return bFav - aFav;
                return a.name.localeCompare(b.name);
            });
            break;
    }
    
    return sorted;
}

/**
 * Render exercise table with pagination
 */
function renderExerciseTable() {
    const tableBody = document.getElementById('exerciseTableBody');
    const tableContainer = document.getElementById('exerciseTableContainer');
    const emptyState = document.getElementById('exerciseEmptyState');
    const paginationFooter = document.getElementById('exercisePaginationFooter');
    
    if (!tableBody) return;
    
    // Get page size from dropdown
    const entriesSelect = document.getElementById('entriesPerPageSelect');
    if (entriesSelect) {
        window.ghostGym.exercises.pageSize = parseInt(entriesSelect.value) || 50;
    }
    
    // Calculate which exercises to display
    const startIndex = (window.ghostGym.exercises.currentPage - 1) * window.ghostGym.exercises.pageSize;
    const endIndex = startIndex + window.ghostGym.exercises.pageSize;
    window.ghostGym.exercises.displayed = window.ghostGym.exercises.filtered.slice(startIndex, endIndex);
    
    // Show/hide empty state
    if (window.ghostGym.exercises.filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        paginationFooter.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    paginationFooter.style.display = 'block';
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Render exercise rows
    window.ghostGym.exercises.displayed.forEach(exercise => {
        const row = createExerciseTableRow(exercise);
        tableBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
}

/**
 * Create an exercise table row
 */
function createExerciseTableRow(exercise) {
    const tr = document.createElement('tr');
    
    const isFavorited = window.ghostGym.exercises.favorites.has(exercise.id);
    const isCustom = !exercise.isGlobal;
    const foundationalScore = exercise.foundationalScore || exercise.popularityScore || 50;
    const exerciseTier = exercise.exerciseTier || 2;
    const isFoundational = exercise.isFoundational || false;
    
    // Debug logging for first few exercises
    if (window.ghostGym.exercises.displayed.indexOf(exercise) < 3) {
        console.log(`🔍 Rendering exercise: "${exercise.name}" (ID: ${exercise.id})`);
        console.log(`   - Tier: ${exerciseTier}, Foundational: ${isFoundational}, Score: ${foundationalScore}`);
        console.log(`   - isFavorited: ${isFavorited}`);
    }
    
    // Determine tier badge
    let tierBadge = '';
    if (isFoundational || exerciseTier === 1) {
        tierBadge = '<span class="badge bg-warning ms-1"><i class="bx bxs-star"></i> Foundation</span>';
    } else if (exerciseTier === 2) {
        tierBadge = '<span class="badge bg-info ms-1"><i class="bx bx-star"></i> Standard</span>';
    } else if (exerciseTier === 3) {
        tierBadge = '<span class="badge bg-secondary ms-1" style="opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded"></i> Specialized</span>';
    }
    
    tr.innerHTML = `
        <td>
            ${isCustom ? '<i class="bx bx-user text-primary me-2"></i>' : ''}
            <span class="fw-medium">${escapeHtml(exercise.name)}</span>
            ${tierBadge}
        </td>
        <td>
            ${exercise.targetMuscleGroup ? `<span class="badge bg-label-primary">${escapeHtml(exercise.targetMuscleGroup)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td>
            ${exercise.primaryEquipment ? `<span class="badge bg-label-secondary">${escapeHtml(exercise.primaryEquipment)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td>
            ${exercise.difficultyLevel ? `<span class="badge bg-label-info">${escapeHtml(exercise.difficultyLevel)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-icon favorite-btn ${isFavorited ? 'favorited' : ''}" 
                    data-exercise-id="${exercise.id}"
                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="bx ${isFavorited ? 'bxs-heart text-danger' : 'bx-heart'}"></i>
            </button>
        </td>
        <td class="text-center">
            <div class="dropdown">
                <button type="button" class="btn btn-sm p-0 dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                    <i class="bx bx-dots-vertical-rounded"></i>
                </button>
                <div class="dropdown-menu dropdown-menu-end">
                    <a class="dropdown-item view-details-link" href="javascript:void(0);" data-exercise-id="${exercise.id}">
                        <i class="bx bx-info-circle me-2"></i>View Details
                    </a>
                    <a class="dropdown-item add-to-workout-link" href="javascript:void(0);" 
                       data-exercise-id="${exercise.id}" data-exercise-name="${escapeHtml(exercise.name)}">
                        <i class="bx bx-plus me-2"></i>Add to Workout
                    </a>
                </div>
            </div>
        </td>
    `;
    
    // Add event listeners
    const favoriteBtn = tr.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', () => toggleExerciseFavorite(exercise.id));
    
    const viewDetailsLink = tr.querySelector('.view-details-link');
    viewDetailsLink.addEventListener('click', () => showExerciseDetails(exercise.id));
    
    const addToWorkoutLink = tr.querySelector('.add-to-workout-link');
    addToWorkoutLink.addEventListener('click', () => addExerciseToWorkout(exercise));
    
    return tr;
}

/**
 * Toggle exercise favorite status
 */
async function toggleExerciseFavorite(exerciseId) {
    if (!window.firebaseAuth?.currentUser) {
        showAlert('Please sign in to favorite exercises', 'warning');
        showAuthModal();
        return;
    }
    
    const isFavorited = window.ghostGym.exercises.favorites.has(exerciseId);
    
    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        
        if (isFavorited) {
            // Remove favorite
            const response = await fetch(getApiUrl(`/api/v3/users/me/favorites/${exerciseId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                window.ghostGym.exercises.favorites.delete(exerciseId);
                console.log('✅ Removed from favorites');
            }
        } else {
            // Add favorite
            const response = await fetch(getApiUrl('/api/v3/users/me/favorites'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exerciseId })
            });
            
            if (response.ok) {
                window.ghostGym.exercises.favorites.add(exerciseId);
                console.log('✅ Added to favorites');
            }
        }
        
        // Update stats
        const favCount = document.getElementById('favoritesCount');
        if (favCount) {
            favCount.textContent = window.ghostGym.exercises.favorites.size;
        }
        
        // Re-render to update UI
        renderExerciseTable();
        
    } catch (error) {
        console.error('❌ Error toggling favorite:', error);
        showAlert('Failed to update favorite. Please try again.', 'danger');
    }
}

/**
 * Show exercise details modal
 */
function showExerciseDetails(exerciseId) {
    const exercise = [...window.ghostGym.exercises.all, ...window.ghostGym.exercises.custom]
        .find(e => e.id === exerciseId);
    
    if (!exercise) return;
    
    const modal = new bootstrap.Modal(document.getElementById('exerciseDetailModal'));
    document.getElementById('exerciseDetailTitle').textContent = exercise.name;
    
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <strong>Muscle Group:</strong><br>
                ${exercise.targetMuscleGroup || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Equipment:</strong><br>
                ${exercise.primaryEquipment || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Difficulty:</strong><br>
                ${exercise.difficultyLevel || 'N/A'}
            </div>
            <div class="col-md-6 mb-3">
                <strong>Mechanics:</strong><br>
                ${exercise.mechanics || 'N/A'}
            </div>
            ${exercise.popularityScore ? `
            <div class="col-md-6 mb-3">
                <strong>Popularity Score:</strong><br>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar" role="progressbar" style="width: ${exercise.popularityScore}%"
                         aria-valuenow="${exercise.popularityScore}" aria-valuemin="0" aria-valuemax="100">
                        ${exercise.popularityScore}/100
                    </div>
                </div>
            </div>
            ` : ''}
            ${!exercise.isGlobal ? `
            <div class="col-12">
                <span class="badge bg-label-primary">
                    <i class="bx bx-user me-1"></i>Custom Exercise
                </span>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('exerciseDetailBody').innerHTML = detailsHtml;
    modal.show();
}

/**
 * Add exercise to workout (placeholder)
 */
function addExerciseToWorkout(exercise) {
    showAlert(`Adding "${exercise.name}" to workout - This feature will be integrated with the workout builder!`, 'info');
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationControls = document.getElementById('paginationControls');
    
    if (!paginationInfo || !paginationControls) return;
    
    const totalExercises = window.ghostGym.exercises.filtered.length;
    const pageSize = window.ghostGym.exercises.pageSize;
    const currentPage = window.ghostGym.exercises.currentPage;
    const totalPages = Math.ceil(totalExercises / pageSize);
    
    // Update info text
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalExercises);
    paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${totalExercises.toLocaleString()} entries`;
    
    // Clear pagination controls
    paginationControls.innerHTML = '';
    
    if (totalPages <= 1) {
        return; // No pagination needed
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="javascript:void(0);" aria-label="Previous">
            <i class="bx bx-chevron-left"></i>
        </a>
    `;
    if (currentPage > 1) {
        prevLi.querySelector('.page-link').addEventListener('click', () => goToPage(currentPage - 1));
    }
    paginationControls.appendChild(prevLi);
    
    // Page numbers with ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="javascript:void(0);">1</a>`;
        firstLi.querySelector('.page-link').addEventListener('click', () => goToPage(1));
        paginationControls.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationControls.appendChild(ellipsisLi);
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="javascript:void(0);">${i}</a>`;
        if (i !== currentPage) {
            pageLi.querySelector('.page-link').addEventListener('click', () => goToPage(i));
        }
        paginationControls.appendChild(pageLi);
    }
    
    // Ellipsis + last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationControls.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="javascript:void(0);">${totalPages}</a>`;
        lastLi.querySelector('.page-link').addEventListener('click', () => goToPage(totalPages));
        paginationControls.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="javascript:void(0);" aria-label="Next">
            <i class="bx bx-chevron-right"></i>
        </a>
    `;
    if (currentPage < totalPages) {
        nextLi.querySelector('.page-link').addEventListener('click', () => goToPage(currentPage + 1));
    }
    paginationControls.appendChild(nextLi);
}

/**
 * Go to specific page
 */
function goToPage(page) {
    window.ghostGym.exercises.currentPage = page;
    renderExerciseTable();
    
    // Scroll to top of table
    const tableContainer = document.getElementById('exerciseTableContainer');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Load more exercises (legacy - now handled by pagination)
 */
function loadMoreExercises() {
    goToPage(window.ghostGym.exercises.currentPage + 1);
}

/**
 * Clear all exercise filters
 */
function clearExerciseFilters() {
    window.ghostGym.exercises.filters = {
        search: '',
        muscleGroup: '',
        equipment: '',
        difficulty: '',
        tier: '',
        sortBy: 'name',
        favoritesOnly: false,
        customOnly: false,
        foundationalOnly: false
    };
    
    // Reset UI
    const searchInput = document.getElementById('exerciseSearch');
    const sortSelect = document.getElementById('sortBySelect');
    const muscleGroupSelect = document.getElementById('muscleGroupFilter');
    const equipmentSelect = document.getElementById('equipmentFilter');
    const difficultySelect = document.getElementById('difficultyFilter');
    const tierSelect = document.getElementById('tierFilter');
    const favoritesCheckbox = document.getElementById('showFavoritesOnly');
    const customCheckbox = document.getElementById('showCustomOnly');
    const foundationalCheckbox = document.getElementById('showFoundationalOnly');
    
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'name';
    if (muscleGroupSelect) muscleGroupSelect.value = '';
    if (equipmentSelect) equipmentSelect.value = '';
    if (difficultySelect) difficultySelect.value = '';
    if (tierSelect) tierSelect.value = '';
    if (favoritesCheckbox) favoritesCheckbox.checked = false;
    if (customCheckbox) customCheckbox.checked = false;
    if (foundationalCheckbox) foundationalCheckbox.checked = false;
    
    filterExercises();
}

/**
 * Refresh exercises from API
 */
async function refreshExercises() {
    localStorage.removeItem('exercise_cache');
    await loadExercises();
}

/**
 * Show/hide exercise loading state
 */
function showExerciseLoading(show) {
    const loadingState = document.getElementById('exerciseLoadingState');
    const tableContainer = document.getElementById('exerciseTableContainer');
    
    if (show) {
        if (loadingState) loadingState.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
    } else {
        if (loadingState) loadingState.style.display = 'none';
    }
}

/**
 * Handle entries per page change
 */
function handleEntriesPerPageChange() {
    window.ghostGym.exercises.currentPage = 1;
    renderExerciseTable();
}

/**
 * Export exercises to CSV
 */
function exportExercises() {
    try {
        const exercises = window.ghostGym.exercises.filtered;
        
        if (exercises.length === 0) {
            showAlert('No exercises to export', 'warning');
            return;
        }
        
        // Create CSV header
        const headers = ['Exercise Name', 'Muscle Group', 'Equipment', 'Difficulty', 'Mechanics', 'Popularity Score', 'Is Custom'];
        let csv = headers.join(',') + '\n';
        
        // Add exercise data
        exercises.forEach(exercise => {
            const row = [
                `"${(exercise.name || '').replace(/"/g, '""')}"`,
                `"${(exercise.targetMuscleGroup || '').replace(/"/g, '""')}"`,
                `"${(exercise.primaryEquipment || '').replace(/"/g, '""')}"`,
                `"${(exercise.difficultyLevel || '').replace(/"/g, '""')}"`,
                `"${(exercise.mechanics || '').replace(/"/g, '""')}"`,
                exercise.popularityScore || '',
                exercise.isGlobal ? 'No' : 'Yes'
            ];
            csv += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ghost_gym_exercises_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert(`Exported ${exercises.length} exercises to CSV`, 'success');
        
    } catch (error) {
        console.error('❌ Error exporting exercises:', error);
        showAlert('Failed to export exercises: ' + error.message, 'danger');
    }
}

/**
 * Show custom exercise modal
 */
function showCustomExerciseModal(initialName = '') {
    const modal = new bootstrap.Modal(document.getElementById('customExerciseModal'));
    
    if (initialName) {
        document.getElementById('customExerciseName').value = initialName;
    }
    
    modal.show();
}

/**
 * Save custom exercise
 */
async function saveCustomExercise() {
    try {
        // Check if user is authenticated
        if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
            showAlert('Please sign in to create custom exercises', 'warning');
            const modal = bootstrap.Modal.getInstance(document.getElementById('customExerciseModal'));
            modal.hide();
            showAuthModal();
            return;
        }
        
        // Collect form data
        const exerciseData = {
            name: document.getElementById('customExerciseName')?.value?.trim(),
            targetMuscleGroup: document.getElementById('customMuscleGroup')?.value?.trim() || null,
            primaryEquipment: document.getElementById('customEquipment')?.value?.trim() || null,
            difficultyLevel: document.getElementById('customDifficulty')?.value || null,
            mechanics: document.getElementById('customMechanics')?.value || null
        };
        
        // Validate required fields
        if (!exerciseData.name) {
            showAlert('Exercise name is required', 'danger');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveCustomExerciseBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
        saveBtn.disabled = true;
        
        // Get auth token
        const token = await window.dataManager.getAuthToken();
        
        // Create custom exercise via API
        const response = await fetch(getApiUrl('/api/v3/users/me/exercises'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(exerciseData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create custom exercise');
        }
        
        const savedExercise = await response.json();
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('customExerciseModal'));
        modal.hide();
        showAlert(`Custom exercise "${savedExercise.name}" created successfully!`, 'success');
        
        // Clear form
        document.getElementById('customExerciseForm').reset();
        
        // Reload autocomplete data
        Object.values(window.exerciseAutocompleteInstances || {}).forEach(instance => {
            if (instance.loadExercises) {
                instance.loadExercises();
            }
        });
        
    } catch (error) {
        console.error('❌ Error saving custom exercise:', error);
        showAlert('Failed to save custom exercise: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveCustomExerciseBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Exercise';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Exercise cache management
 */
function getExerciseCache() {
    try {
        const cached = localStorage.getItem('exercise_cache');
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error reading exercise cache:', error);
        return null;
    }
}

function setExerciseCache(exercises) {
    try {
        const cacheData = {
            exercises: exercises,
            timestamp: Date.now(),
            version: '1.1'
        };
        localStorage.setItem('exercise_cache', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting exercise cache:', error);
    }
}

function isExerciseCacheValid(cached) {
    if (cached.version !== '1.1') return false;
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
    return (Date.now() - cached.timestamp) < CACHE_DURATION;
}

/**
 * Deprecated functions - kept for backward compatibility
 */
function showExerciseDatabasePanel() {
    console.warn('⚠️ showExerciseDatabasePanel is deprecated, use showView("exercises") instead');
    showView('exercises');
}

function hideExerciseDatabasePanel() {
    console.warn('⚠️ hideExerciseDatabasePanel is deprecated, use showView("builder") instead');
    showView('builder');
}

// Make functions globally available
window.loadExercises = loadExercises;
window.loadExerciseFavorites = loadExerciseFavorites;
window.loadCustomExercises = loadCustomExercises;
window.loadExerciseFilterOptions = loadExerciseFilterOptions;
window.filterExercises = filterExercises;
window.sortExercises = sortExercises;
window.renderExerciseTable = renderExerciseTable;
window.createExerciseTableRow = createExerciseTableRow;
window.toggleExerciseFavorite = toggleExerciseFavorite;
window.showExerciseDetails = showExerciseDetails;
window.addExerciseToWorkout = addExerciseToWorkout;
window.updatePagination = updatePagination;
window.goToPage = goToPage;
window.loadMoreExercises = loadMoreExercises;
window.clearExerciseFilters = clearExerciseFilters;
window.refreshExercises = refreshExercises;
window.showExerciseLoading = showExerciseLoading;
window.handleEntriesPerPageChange = handleEntriesPerPageChange;
window.exportExercises = exportExercises;
window.showCustomExerciseModal = showCustomExerciseModal;
window.saveCustomExercise = saveCustomExercise;
window.getExerciseCache = getExerciseCache;
window.setExerciseCache = setExerciseCache;
window.isExerciseCacheValid = isExerciseCacheValid;
window.showExerciseDatabasePanel = showExerciseDatabasePanel;
window.hideExerciseDatabasePanel = hideExerciseDatabasePanel;

// Listen for authentication state changes to reload favorites
window.addEventListener('authStateChanged', async (event) => {
    const { user, isAuthenticated } = event.detail;
    
    if (isAuthenticated && user) {
        console.log('🔄 Auth state changed - reloading favorites and custom exercises');
        
        // Reload favorites and custom exercises
        await loadExerciseFavorites();
        await loadCustomExercises();
        
        // Re-render if we're on the exercises view
        const exercisesView = document.getElementById('exercisesView');
        if (exercisesView && exercisesView.style.display !== 'none') {
            filterExercises();
        }
    } else {
        // User signed out - clear favorites and custom exercises
        window.ghostGym.exercises.favorites.clear();
        window.ghostGym.exercises.custom = [];
        
        // Re-render if we're on the exercises view
        const exercisesView = document.getElementById('exercisesView');
        if (exercisesView && exercisesView.style.display !== 'none') {
            filterExercises();
        }
    }
});

console.log('📦 Exercise Database module loaded');