/**
 * Exercise Database - Filters Module
 * Handles filter application, sorting, and filter feedback
 *
 * @module exercise-filters
 * @version 1.0.0
 */

/**
 * Apply filters and render table
 * @param {Object} filters - Filter configuration
 */
function applyFiltersAndRender(filters) {
    // Combine global and custom exercises
    let allExercises = [...window.ffn.exercises.all, ...window.ffn.exercises.custom];

    // Apply search filter
    if (filters.search) {
        const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        allExercises = allExercises.filter(exercise => {
            const searchableText = `${exercise.name} ${exercise.targetMuscleGroup || ''} ${exercise.primaryEquipment || ''}`.toLowerCase();
            return searchTerms.every(term => searchableText.includes(term));
        });
    }

    // Apply muscle group filter
    if (filters.muscleGroup) {
        allExercises = allExercises.filter(e => e.targetMuscleGroup === filters.muscleGroup);
    }

    // Apply equipment filter (supports multi-select with OR logic)
    if (filters.equipment && filters.equipment.length > 0) {
        console.log('🔧 Equipment filter active:', filters.equipment);
        const beforeCount = allExercises.length;

        allExercises = allExercises.filter(e => {
            // Ensure primaryEquipment exists and matches any selected equipment
            const hasEquipment = e.primaryEquipment && filters.equipment.includes(e.primaryEquipment);
            return hasEquipment;
        });

        console.log(`📊 Equipment filter: ${beforeCount} → ${allExercises.length} exercises`);
    }

    // Apply difficulty filter
    if (filters.difficulty) {
        allExercises = allExercises.filter(e => e.difficultyLevel === filters.difficulty);
    }

    // Apply favorites only filter
    if (filters.favoritesOnly) {
        allExercises = allExercises.filter(e => window.ffn.exercises.favorites.has(e.id));
    }

    // Apply custom only filter
    if (filters.customOnly) {
        allExercises = allExercises.filter(e => !e.isGlobal);
    }

    // Apply sorting
    allExercises = sortExercises(allExercises, filters.sortBy || 'name');

    // Update table (use updateData for soft refreshes, setData for filter changes)
    if (window.exerciseTable) {
        if (filters._softRefresh) {
            window.exerciseTable.updateData(allExercises);
        } else {
            window.exerciseTable.setData(allExercises);
        }
    }

    // Update filter feedback
    updateFilterFeedback(filters);

    // Update filter badge in toolbar
    if (window.updateFilterBadge) {
        window.updateFilterBadge();
    }
}

/**
 * Sort exercises
 * @param {Array} exercises - Exercises to sort
 * @param {string} sortBy - Sort key
 * @returns {Array} Sorted exercises
 */
function sortExercises(exercises, sortBy) {
    const sorted = [...exercises];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'popularity':
            sorted.sort((a, b) => (b.popularityScore || 50) - (a.popularityScore || 50));
            break;
        case 'favorites':
            sorted.sort((a, b) => {
                const aFav = window.ffn.exercises.favorites.has(a.id) ? 1 : 0;
                const bFav = window.ffn.exercises.favorites.has(b.id) ? 1 : 0;
                if (aFav !== bFav) return bFav - aFav;
                return a.name.localeCompare(b.name);
            });
            break;
    }

    return sorted;
}

/**
 * Update filter feedback display
 * @param {Object} filters - Current filter state
 */
function updateFilterFeedback(filters) {
    const feedbackContainer = document.getElementById('filterFeedback');
    const feedbackText = document.getElementById('filterFeedbackText');

    if (!feedbackContainer || !feedbackText) return;

    const activeFilters = [];

    // Check each filter and add to active list
    if (filters.search) {
        activeFilters.push(`<strong>Search:</strong> "${filters.search}"`);
    }

    if (filters.muscleGroup) {
        activeFilters.push(`<strong>Muscle:</strong> ${filters.muscleGroup}`);
    }

    // Show individual equipment selections
    if (filters.equipment && filters.equipment.length > 0) {
        const equipmentItems = filters.equipment.map(eq =>
            `<span class="badge bg-primary me-1 mb-1">${eq}</span>`
        ).join('');
        activeFilters.push(`<strong>Equipment:</strong><br>${equipmentItems}`);
    }

    if (filters.difficulty) {
        activeFilters.push(`<strong>Difficulty:</strong> ${filters.difficulty}`);
    }

    if (filters.favoritesOnly) {
        activeFilters.push('<strong>Favorites only</strong>');
    }

    if (filters.customOnly) {
        activeFilters.push('<strong>Custom only</strong>');
    }

    // Show/hide feedback based on active filters
    if (activeFilters.length > 0) {
        feedbackText.innerHTML = `<div style="line-height: 1.8;">Active filters:<br>${activeFilters.join('<br>')}</div>`;
        feedbackContainer.style.display = 'block';
    } else {
        feedbackContainer.style.display = 'none';
    }
}

/**
 * Get unique muscle groups from exercise data
 * @returns {Array} Sorted unique muscle groups
 */
function getUniqueMuscleGroups() {
    return [...new Set(window.ffn.exercises.all
        .map(e => e.targetMuscleGroup)
        .filter(m => m))]
        .sort();
}

/**
 * Get unique equipment from exercise data
 * @returns {Array} Sorted unique equipment
 */
function getUniqueEquipment() {
    return [...new Set(window.ffn.exercises.all
        .map(e => e.primaryEquipment)
        .filter(e => e))]
        .sort();
}

// Export for global access
window.applyFiltersAndRender = applyFiltersAndRender;
window.sortExercises = sortExercises;
window.updateFilterFeedback = updateFilterFeedback;
window.getUniqueMuscleGroups = getUniqueMuscleGroups;
window.getUniqueEquipment = getUniqueEquipment;

console.log('📦 Exercise Filters module loaded');
