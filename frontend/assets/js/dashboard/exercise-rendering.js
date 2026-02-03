/**
 * Exercise Database - Rendering Module
 * Handles exercise card rendering, badges, and modals
 *
 * @module exercise-rendering
 * @version 1.0.0
 */

/**
 * Get difficulty badge with popover
 * @param {string} difficulty - Difficulty level
 * @returns {string} HTML for badge
 */
function getDifficultyBadgeWithPopover(difficulty) {
    if (!difficulty) return '';

    const difficultyInfo = {
        'Beginner': {
            color: 'success',
            icon: 'bx-trending-up',
            description: 'Perfect for those new to training. Focuses on learning proper form and building foundational strength.'
        },
        'Intermediate': {
            color: 'warning',
            icon: 'bx-bar-chart',
            description: 'For those with training experience. Requires good form and moderate strength levels.'
        },
        'Advanced': {
            color: 'danger',
            icon: 'bx-trophy',
            description: 'For experienced lifters. Demands excellent technique, strength, and body control.'
        }
    };

    const info = difficultyInfo[difficulty] || { color: 'secondary', icon: 'bx-info-circle', description: 'Difficulty level' };

    return `
        <span class="badge badge-outline-${info.color} difficulty-badge"
              style="font-size: 0.75rem; padding: 0.3rem 0.6rem; cursor: help; background: transparent;"
              data-bs-toggle="popover"
              data-bs-trigger="click hover focus"
              data-bs-placement="top"
              data-bs-custom-class="difficulty-popover"
              data-bs-html="true"
              data-bs-content="<div class='d-flex align-items-start gap-2'><i class='bx ${info.icon} mt-1'></i><div>${info.description}</div></div>"
              title="${difficulty}">
            ${difficulty}
        </span>
    `;
}


/**
 * Initialize popovers for difficulty badges
 */
function initializePopovers() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach(popoverTriggerEl => {
        // Dispose existing popover if any
        const existingPopover = bootstrap.Popover.getInstance(popoverTriggerEl);
        if (existingPopover) {
            existingPopover.dispose();
        }

        // Create new popover
        new bootstrap.Popover(popoverTriggerEl, {
            container: 'body',
            html: true
        });
    });
}

/**
 * Show exercise details modal
 * @param {string} exerciseId - Exercise ID
 */
function showExerciseDetails(exerciseId) {
    const exercise = [...window.ffn.exercises.all, ...window.ffn.exercises.custom]
        .find(e => e.id === exerciseId);

    if (!exercise) return;

    const modal = new bootstrap.Modal(document.getElementById('exerciseDetailModal'));
    document.getElementById('exerciseDetailTitle').textContent = exercise.name;

    // Helper to escape HTML
    const escapeHtml = (text) => {
        if (!text) return '';
        return text.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    };

    // Helper to render field if value exists
    const field = (label, value) => value ? `
        <div class="col-md-6 mb-2">
            <small class="text-muted">${label}</small><br>
            <span>${escapeHtml(value)}</span>
        </div>` : '';

    // Build equipment display with count
    const equipmentDisplay = (equipment, count) => {
        if (!equipment) return null;
        return equipment + (count ? ` (${count})` : '');
    };

    const detailsHtml = `
        <!-- Video Links Section -->
        ${(exercise.shortVideoUrl || exercise.detailedVideoUrl) ? `
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-video me-1"></i>Video Tutorials</h6>
            <div class="d-flex gap-2 flex-wrap">
                ${exercise.shortVideoUrl ? `
                <a href="${escapeHtml(exercise.shortVideoUrl)}" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bx bx-play-circle me-1"></i>Quick Demo
                </a>` : ''}
                ${exercise.detailedVideoUrl ? `
                <a href="${escapeHtml(exercise.detailedVideoUrl)}" target="_blank" class="btn btn-outline-secondary btn-sm">
                    <i class="bx bx-video me-1"></i>In-Depth Tutorial
                </a>` : ''}
            </div>
        </div>
        <hr>
        ` : ''}

        <!-- Basic Info Section -->
        <div class="row mb-3">
            ${field('Difficulty', exercise.difficultyLevel)}
            ${field('Mechanics', exercise.mechanics)}
            ${field('Body Region', exercise.bodyRegion)}
            ${field('Force Type', exercise.forceType)}
            ${field('Classification', exercise.classification)}
            ${field('Laterality', exercise.laterality)}
        </div>

        <!-- Muscles Section -->
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-body me-1"></i>Muscles Worked</h6>
            <div class="row">
                ${field('Target Muscle Group', exercise.targetMuscleGroup)}
                ${field('Prime Mover', exercise.primeMoverMuscle)}
                ${field('Secondary Muscle', exercise.secondaryMuscle)}
                ${field('Tertiary Muscle', exercise.tertiaryMuscle)}
            </div>
        </div>

        <!-- Equipment Section -->
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-dumbbell me-1"></i>Equipment</h6>
            <div class="row">
                ${field('Primary Equipment', equipmentDisplay(exercise.primaryEquipment, exercise.primaryEquipmentCount))}
                ${field('Secondary Equipment', equipmentDisplay(exercise.secondaryEquipment, exercise.secondaryEquipmentCount))}
            </div>
        </div>

        <!-- Movement Details (Collapsible) -->
        ${(exercise.posture || exercise.armType || exercise.grip || exercise.loadPosition) ? `
        <div class="mb-3">
            <h6 class="mb-2" data-bs-toggle="collapse" data-bs-target="#movementDetails"
                style="cursor: pointer;">
                <i class="bx bx-move me-1"></i>Movement Details
                <i class="bx bx-chevron-down float-end"></i>
            </h6>
            <div class="collapse show" id="movementDetails">
                <div class="row">
                    ${field('Posture', exercise.posture)}
                    ${field('Arm Type', exercise.armType)}
                    ${field('Arm Pattern', exercise.armPattern)}
                    ${field('Grip', exercise.grip)}
                    ${field('Load Position', exercise.loadPosition)}
                    ${field('Foot Elevation', exercise.footElevation)}
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Movement Patterns (Collapsible) -->
        ${(exercise.movementPattern1 || exercise.planeOfMotion1) ? `
        <div class="mb-3">
            <h6 class="mb-2" data-bs-toggle="collapse" data-bs-target="#movementPatterns"
                style="cursor: pointer;">
                <i class="bx bx-rotate-right me-1"></i>Movement Patterns
                <i class="bx bx-chevron-down float-end"></i>
            </h6>
            <div class="collapse" id="movementPatterns">
                <div class="row">
                    ${field('Pattern 1', exercise.movementPattern1)}
                    ${field('Pattern 2', exercise.movementPattern2)}
                    ${field('Pattern 3', exercise.movementPattern3)}
                    ${field('Plane 1', exercise.planeOfMotion1)}
                    ${field('Plane 2', exercise.planeOfMotion2)}
                    ${field('Plane 3', exercise.planeOfMotion3)}
                    ${field('Combination', exercise.combinationExercise)}
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Custom Exercise Badge -->
        ${!exercise.isGlobal ? `
        <div class="mt-3">
            <span class="badge bg-label-primary">
                <i class="bx bx-user me-1"></i>Custom Exercise
            </span>
        </div>
        ` : ''}
    `;

    document.getElementById('exerciseDetailBody').innerHTML = detailsHtml;
    modal.show();
}

/**
 * Toggle exercise favorite
 * @param {string} exerciseId - Exercise ID
 */
async function toggleExerciseFavorite(exerciseId) {
    if (!window.firebaseAuth?.currentUser) {
        if (window.showAlert) {
            window.showAlert('Please sign in to favorite exercises. Use the menu to log in.', 'warning');
        }
        return;
    }

    const isFavorited = window.ffn.exercises.favorites.has(exerciseId);

    // Find the button that was clicked
    const button = document.querySelector(`.favorite-btn[data-exercise-id="${exerciseId}"]`);
    const icon = button?.querySelector('i');

    // Optimistic UI update
    if (button && icon) {
        if (isFavorited) {
            icon.className = 'bx bx-heart';
            button.classList.remove('text-danger');
            button.title = 'Add to favorites';
        } else {
            icon.className = 'bx bxs-heart';
            button.classList.add('text-danger');
            button.title = 'Remove from favorites';
        }
    }

    try {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        const baseUrl = window.exercisePage?.getApiUrl ? window.exercisePage.getApiUrl('') : '';

        if (isFavorited) {
            const response = await fetch(`${baseUrl}/api/v3/users/me/favorites/${exerciseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                window.ffn.exercises.favorites.delete(exerciseId);
                console.log('✅ Removed from favorites');

                // If favorites filter is active, refresh the table
                if (window.currentFilters?.favoritesOnly && window.applyFiltersAndRender) {
                    console.log('🔄 Favorites filter active, refreshing table');
                    window.applyFiltersAndRender(window.currentFilters);
                }
            } else {
                console.error('❌ Failed to remove favorite:', response.status);
                revertFavoriteUI(button, icon, true);
            }
        } else {
            const url = `${baseUrl}/api/v3/users/me/favorites`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exerciseId })
            });
            if (response.ok) {
                window.ffn.exercises.favorites.add(exerciseId);
                console.log('✅ Added to favorites');
            } else {
                console.error('❌ Failed to add favorite:', response.status);
                revertFavoriteUI(button, icon, false);
            }
        }
    } catch (error) {
        console.error('❌ Error toggling favorite:', error);
        revertFavoriteUI(button, icon, isFavorited);
    }
}

/**
 * Revert favorite button UI on error
 */
function revertFavoriteUI(button, icon, wasFavorited) {
    if (button && icon) {
        if (wasFavorited) {
            icon.className = 'bx bxs-heart';
            button.classList.add('text-danger');
            button.title = 'Remove from favorites';
        } else {
            icon.className = 'bx bx-heart';
            button.classList.remove('text-danger');
            button.title = 'Add to favorites';
        }
    }
}

/**
 * Add exercise to workout
 * @param {Object} exercise - Exercise object with id and name
 */
function addExerciseToWorkout(exercise) {
    if (window.showAlert) {
        window.showAlert(`Adding "${exercise.name}" to workout - This feature will be integrated with the workout builder!`, 'info');
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

// Export for global access
window.getDifficultyBadgeWithPopover = getDifficultyBadgeWithPopover;
window.initializePopovers = initializePopovers;
window.showExerciseDetails = showExerciseDetails;
window.toggleExerciseFavorite = toggleExerciseFavorite;
window.addExerciseToWorkout = addExerciseToWorkout;
window.getExerciseCache = getExerciseCache;
window.setExerciseCache = setExerciseCache;
window.isExerciseCacheValid = isExerciseCacheValid;

console.log('📦 Exercise Rendering module loaded');
