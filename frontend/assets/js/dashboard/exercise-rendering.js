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

    // Find linked exercise if this is a custom exercise with a link
    let linked = null;
    if (!exercise.isGlobal && exercise.linkedExerciseId) {
        linked = window.ffn.exercises.all.find(e => e.id === exercise.linkedExerciseId);
    }

    // Helper: get value from exercise, falling back to linked exercise
    const getValue = (field) => exercise[field] || (linked && linked[field]) || null;
    const isInherited = (field) => !exercise[field] && linked && linked[field];

    // Helper to render field if value exists, with inherited indicator
    const field = (label, fieldName) => {
        const value = getValue(fieldName);
        if (!value) return '';
        const inherited = isInherited(fieldName);
        return `
        <div class="col-md-6 mb-2">
            <small class="text-muted">${label}</small><br>
            <span>${escapeHtml(String(value))}${inherited ? ' <i class="bx bx-link text-primary" style="font-size: 0.75rem;" title="From linked exercise"></i>' : ''}</span>
        </div>`;
    };

    // Build equipment display with count
    const equipmentDisplay = (equipField, countField) => {
        const equip = getValue(equipField);
        const count = getValue(countField);
        if (!equip) return null;
        return equip + (count ? ` (${count})` : '');
    };

    // Video URLs: use linked if custom has none
    const shortVideoUrl = exercise.shortVideoUrl || (linked && linked.shortVideoUrl);
    const detailedVideoUrl = exercise.detailedVideoUrl || (linked && linked.detailedVideoUrl);
    const hasVideos = shortVideoUrl || detailedVideoUrl;
    const videosInherited = !exercise.shortVideoUrl && !exercise.detailedVideoUrl && linked && (linked.shortVideoUrl || linked.detailedVideoUrl);

    const detailsHtml = `
        <!-- Linked Exercise Badge -->
        ${linked ? `
        <div class="mb-3">
            <span class="badge bg-label-primary d-inline-flex align-items-center gap-1 py-2 px-3">
                <i class="bx bx-link"></i>
                Linked to: ${escapeHtml(linked.name)}
            </span>
            <small class="text-muted d-block mt-1">Fields marked with <i class="bx bx-link text-primary" style="font-size: 0.75rem;"></i> are inherited from the linked exercise</small>
        </div>
        <hr>
        ` : ''}

        <!-- Video Links Section -->
        ${hasVideos ? `
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-video me-1"></i>Video Tutorials${videosInherited ? ' <i class="bx bx-link text-primary" style="font-size: 0.75rem;" title="From linked exercise"></i>' : ''}</h6>
            <div class="d-flex gap-2 flex-wrap">
                ${shortVideoUrl ? `
                <a href="${escapeHtml(shortVideoUrl)}" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bx bx-play-circle me-1"></i>Quick Demo
                </a>` : ''}
                ${detailedVideoUrl ? `
                <a href="${escapeHtml(detailedVideoUrl)}" target="_blank" class="btn btn-outline-secondary btn-sm">
                    <i class="bx bx-video me-1"></i>In-Depth Tutorial
                </a>` : ''}
            </div>
        </div>
        <hr>
        ` : ''}

        <!-- Basic Info Section -->
        <div class="row mb-3">
            ${field('Difficulty', 'difficultyLevel')}
            ${field('Mechanics', 'mechanics')}
            ${field('Body Region', 'bodyRegion')}
            ${field('Force Type', 'forceType')}
            ${field('Classification', 'classification')}
            ${field('Laterality', 'laterality')}
        </div>

        <!-- Muscles Section -->
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-body me-1"></i>Muscles Worked</h6>
            <div class="row">
                ${field('Target Muscle Group', 'targetMuscleGroup')}
                ${field('Prime Mover', 'primeMoverMuscle')}
                ${field('Secondary Muscle', 'secondaryMuscle')}
                ${field('Tertiary Muscle', 'tertiaryMuscle')}
            </div>
        </div>

        <!-- Equipment Section -->
        <div class="mb-3">
            <h6 class="mb-2"><i class="bx bx-dumbbell me-1"></i>Equipment</h6>
            <div class="row">
                ${(() => {
                    const primary = equipmentDisplay('primaryEquipment', 'primaryEquipmentCount');
                    const secondary = equipmentDisplay('secondaryEquipment', 'secondaryEquipmentCount');
                    let html = '';
                    if (primary) {
                        const inh = isInherited('primaryEquipment');
                        html += `<div class="col-md-6 mb-2"><small class="text-muted">Primary Equipment</small><br><span>${escapeHtml(primary)}${inh ? ' <i class="bx bx-link text-primary" style="font-size: 0.75rem;" title="From linked exercise"></i>' : ''}</span></div>`;
                    }
                    if (secondary) {
                        const inh = isInherited('secondaryEquipment');
                        html += `<div class="col-md-6 mb-2"><small class="text-muted">Secondary Equipment</small><br><span>${escapeHtml(secondary)}${inh ? ' <i class="bx bx-link text-primary" style="font-size: 0.75rem;" title="From linked exercise"></i>' : ''}</span></div>`;
                    }
                    return html;
                })()}
            </div>
        </div>

        <!-- Movement Details (Collapsible) -->
        ${(getValue('posture') || getValue('armType') || getValue('grip') || getValue('loadPosition')) ? `
        <div class="mb-3">
            <h6 class="mb-2" data-bs-toggle="collapse" data-bs-target="#movementDetails"
                style="cursor: pointer;">
                <i class="bx bx-move me-1"></i>Movement Details
                <i class="bx bx-chevron-down float-end"></i>
            </h6>
            <div class="collapse show" id="movementDetails">
                <div class="row">
                    ${field('Posture', 'posture')}
                    ${field('Arm Type', 'armType')}
                    ${field('Arm Pattern', 'armPattern')}
                    ${field('Grip', 'grip')}
                    ${field('Load Position', 'loadPosition')}
                    ${field('Foot Elevation', 'footElevation')}
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Movement Patterns (Collapsible) -->
        ${(getValue('movementPattern1') || getValue('planeOfMotion1')) ? `
        <div class="mb-3">
            <h6 class="mb-2" data-bs-toggle="collapse" data-bs-target="#movementPatterns"
                style="cursor: pointer;">
                <i class="bx bx-rotate-right me-1"></i>Movement Patterns
                <i class="bx bx-chevron-down float-end"></i>
            </h6>
            <div class="collapse" id="movementPatterns">
                <div class="row">
                    ${field('Pattern 1', 'movementPattern1')}
                    ${field('Pattern 2', 'movementPattern2')}
                    ${field('Pattern 3', 'movementPattern3')}
                    ${field('Plane 1', 'planeOfMotion1')}
                    ${field('Plane 2', 'planeOfMotion2')}
                    ${field('Plane 3', 'planeOfMotion3')}
                    ${field('Combination', 'combinationExercise')}
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

        if (isFavorited) {
            const url = window.config.api.getUrl(`/api/v3/users/me/favorites/${exerciseId}`);
            const response = await fetch(url, {
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
            const url = window.config.api.getUrl('/api/v3/users/me/favorites');
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

/**
 * Open the custom exercise modal in edit mode
 * @param {string} exerciseId - Exercise ID to edit
 * @param {Object} options - Options (e.g., { focusLink: true })
 */
function openEditExerciseModal(exerciseId, options = {}) {
    const exercise = window.ffn.exercises.custom.find(e => e.id === exerciseId);
    if (!exercise) {
        console.error('Exercise not found:', exerciseId);
        return;
    }

    // Set modal to edit mode
    document.getElementById('editExerciseId').value = exerciseId;
    document.getElementById('customExerciseModalTitleText').textContent = 'Edit Custom Exercise';
    document.getElementById('customExerciseModalIcon').className = 'bx bx-edit me-2';

    // Populate form fields
    document.getElementById('customExerciseName').value = exercise.name || '';
    document.getElementById('customMuscleGroup').value = exercise.targetMuscleGroup || '';
    document.getElementById('customEquipment').value = exercise.primaryEquipment || '';
    document.getElementById('customDifficulty').value = exercise.difficultyLevel || '';
    document.getElementById('customMechanics').value = exercise.mechanics || '';

    // Show link section
    document.getElementById('linkExerciseSection').style.display = '';

    // Set linked exercise if exists
    const linkedId = exercise.linkedExerciseId;
    if (linkedId) {
        const linkedExercise = window.ffn.exercises.all.find(e => e.id === linkedId);
        if (linkedExercise) {
            _showLinkedExercise(linkedId, linkedExercise.name);
        }
    } else {
        _clearLinkedExercise();
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('customExerciseModal'));
    modal.show();

    // Focus on link search if requested
    if (options.focusLink) {
        setTimeout(() => {
            document.getElementById('linkExerciseSearch').focus();
        }, 500);
    }
}

/**
 * Reset modal to create mode
 */
function resetExerciseModal() {
    document.getElementById('editExerciseId').value = '';
    document.getElementById('customExerciseModalTitleText').textContent = 'Add Custom Exercise';
    document.getElementById('customExerciseModalIcon').className = 'bx bx-plus-circle me-2';
    document.getElementById('customExerciseForm').reset();
    // Hide link section for create mode
    document.getElementById('linkExerciseSection').style.display = 'none';
    _clearLinkedExercise();
}

/**
 * Save exercise (create or update)
 */
async function saveExercise() {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        if (window.showAlert) window.showAlert('Please sign in to save exercises.', 'warning');
        return;
    }

    const name = document.getElementById('customExerciseName').value.trim();
    if (!name) {
        if (window.showAlert) window.showAlert('Exercise name is required.', 'warning');
        return;
    }

    const exerciseId = document.getElementById('editExerciseId').value;
    const isEdit = !!exerciseId;

    const body = {
        name,
        difficultyLevel: document.getElementById('customDifficulty').value || null,
        targetMuscleGroup: document.getElementById('customMuscleGroup').value.trim() || null,
        primaryEquipment: document.getElementById('customEquipment').value.trim() || null,
        mechanics: document.getElementById('customMechanics').value || null
    };

    // Include linkedExerciseId for edits
    if (isEdit) {
        body.linkedExerciseId = document.getElementById('linkedExerciseId').value || null;
    }

    try {
        const token = await user.getIdToken();
        const baseUrl = window.exercisePage.getApiUrl('/api/v3/users/me/exercises');
        const url = isEdit ? `${baseUrl}/${exerciseId}` : baseUrl;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to ${isEdit ? 'update' : 'create'} exercise`);
        }

        const savedExercise = await response.json();

        // Update local state
        if (isEdit) {
            const idx = window.ffn.exercises.custom.findIndex(e => e.id === exerciseId);
            if (idx !== -1) window.ffn.exercises.custom[idx] = savedExercise;
        } else {
            window.ffn.exercises.custom.push(savedExercise);
        }

        // Refresh table
        if (window.applyFiltersAndRender && window.currentFilters) {
            window.applyFiltersAndRender(window.currentFilters);
        }

        // Close modal
        const modalEl = document.getElementById('customExerciseModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        if (window.showAlert) {
            window.showAlert(`Exercise "${name}" ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        }

    } catch (error) {
        console.error('Error saving exercise:', error);
        if (window.showAlert) window.showAlert(error.message, 'danger');
    }
}

/**
 * Delete a custom exercise with confirmation
 * @param {string} exerciseId - Exercise ID to delete
 */
async function deleteExercise(exerciseId) {
    const exercise = window.ffn.exercises.custom.find(e => e.id === exerciseId);
    if (!exercise) return;

    const confirmed = confirm(`Are you sure you want to delete "${exercise.name}"? This cannot be undone.`);
    if (!confirmed) return;

    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        if (window.showAlert) window.showAlert('Please sign in to delete exercises.', 'warning');
        return;
    }

    try {
        const token = await user.getIdToken();
        const url = window.exercisePage.getApiUrl(`/api/v3/users/me/exercises/${exerciseId}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to delete exercise');
        }

        // Remove from local state
        window.ffn.exercises.custom = window.ffn.exercises.custom.filter(e => e.id !== exerciseId);

        // Refresh table
        if (window.applyFiltersAndRender && window.currentFilters) {
            window.applyFiltersAndRender(window.currentFilters);
        }

        if (window.showAlert) {
            window.showAlert(`Exercise "${exercise.name}" deleted.`, 'success');
        }

    } catch (error) {
        console.error('Error deleting exercise:', error);
        if (window.showAlert) window.showAlert('Failed to delete exercise. Please try again.', 'danger');
    }
}

/**
 * Initialize link exercise search autocomplete
 */
function initExerciseLinkSearch() {
    const searchInput = document.getElementById('linkExerciseSearch');
    const resultsContainer = document.getElementById('linkSearchResults');
    if (!searchInput || !resultsContainer) return;

    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim().toLowerCase();

        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(() => {
            // Search global exercises only
            const results = window.ffn.exercises.all
                .filter(e => e.isGlobal !== false && e.name.toLowerCase().includes(query))
                .slice(0, 8);

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="list-group-item text-muted small">No matching exercises found</div>';
                resultsContainer.style.display = '';
                return;
            }

            resultsContainer.innerHTML = results.map(e => `
                <button type="button" class="list-group-item list-group-item-action small link-search-result"
                        data-exercise-id="${e.id}" data-exercise-name="${e.name}">
                    <span class="fw-semibold">${e.name}</span>
                    ${e.targetMuscleGroup ? `<span class="text-muted ms-2">${e.targetMuscleGroup}</span>` : ''}
                </button>
            `).join('');
            resultsContainer.style.display = '';
        }, 300);
    });

    // Handle result selection
    resultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.link-search-result');
        if (!item) return;

        const id = item.dataset.exerciseId;
        const name = item.dataset.exerciseName;
        _showLinkedExercise(id, name);
        searchInput.value = '';
        resultsContainer.style.display = 'none';
    });

    // Hide results on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#linkExerciseSearch') && !e.target.closest('#linkSearchResults')) {
            resultsContainer.style.display = 'none';
        }
    });

    // Unlink button
    const unlinkBtn = document.getElementById('unlinkExerciseBtn');
    if (unlinkBtn) {
        unlinkBtn.addEventListener('click', () => {
            _clearLinkedExercise();
        });
    }
}

function _showLinkedExercise(id, name) {
    document.getElementById('linkedExerciseId').value = id;
    document.getElementById('linkedExerciseName').textContent = name;
    document.getElementById('linkedExerciseDisplay').style.display = '';
    document.getElementById('linkExerciseSearch').value = '';
}

function _clearLinkedExercise() {
    document.getElementById('linkedExerciseId').value = '';
    document.getElementById('linkedExerciseName').textContent = '';
    document.getElementById('linkedExerciseDisplay').style.display = 'none';
    document.getElementById('linkExerciseSearch').value = '';
}

/**
 * Initialize exercise modal event handlers
 */
function initExerciseModalHandlers() {
    // Save button handler
    const saveBtn = document.getElementById('saveCustomExerciseBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveExercise);
    }

    // Reset modal when closed
    const modalEl = document.getElementById('customExerciseModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', resetExerciseModal);
    }

    // Initialize link search
    initExerciseLinkSearch();

    // Hide link section initially (only shown in edit mode)
    const linkSection = document.getElementById('linkExerciseSection');
    if (linkSection) linkSection.style.display = 'none';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExerciseModalHandlers);
} else {
    initExerciseModalHandlers();
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
window.openEditExerciseModal = openEditExerciseModal;
window.deleteExercise = deleteExercise;
window.saveExercise = saveExercise;

console.log('📦 Exercise Rendering module loaded');
