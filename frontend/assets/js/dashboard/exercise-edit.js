/**
 * Exercise Edit Page Controller
 * Handles loading, editing, linking, and deleting custom exercises
 *
 * @module exercise-edit
 * @version 1.0.0
 */

// Page state
const editState = {
    exerciseId: null,
    exercise: null,
    linkedExerciseId: null,
    linkedExerciseName: null,
    isDirty: false,
    initialized: false
};

let authTimeoutId = null;

const editPage = new FFNBasePage({
    requireAuth: false,
    autoLoad: false,
    onAuthStateChange: async (user) => {
        if (user && !editState.initialized) {
            editState.initialized = true;
            if (authTimeoutId) {
                clearTimeout(authTimeoutId);
                authTimeoutId = null;
            }
            await initExerciseEdit(editPage);
        } else if (!user && !editState.initialized) {
            // Delay error - auth may still be resolving from Firebase
            if (!authTimeoutId) {
                authTimeoutId = setTimeout(() => {
                    if (!editState.initialized) {
                        showError('Please sign in to edit exercises. Use the menu to log in.');
                    }
                }, 2000);
            }
        }
    }
});

/**
 * Initialize the exercise edit page
 */
async function initExerciseEdit(page) {
    // Reset UI state in case error was shown while waiting for auth
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('loadingState').style.display = '';

    const urlParams = new URLSearchParams(window.location.search);
    const exerciseId = urlParams.get('id');
    const focusLink = urlParams.get('focus') === 'link';

    if (!exerciseId) {
        showError('No exercise ID provided.');
        return;
    }

    editState.exerciseId = exerciseId;

    try {
        // Load the exercise from API
        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            showError('Please sign in to edit exercises.');
            return;
        }

        const token = await user.getIdToken();
        const url = page.getApiUrl('/api/v3/users/me/exercises');
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load exercises');
        }

        const data = await response.json();
        const exercise = (data.exercises || []).find(e => e.id === exerciseId);

        if (!exercise) {
            showError('Exercise not found. It may have been deleted.');
            return;
        }

        editState.exercise = exercise;

        // Populate the form
        populateForm(exercise);

        // Setup event listeners
        setupEventListeners(page);

        // Show form, hide loading
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('editFormContainer').style.display = '';

        // Focus on link section if requested
        if (focusLink) {
            setTimeout(() => {
                document.getElementById('searchExercisesBtn').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('searchExercisesBtn').click();
            }, 500);
        }

    } catch (error) {
        console.error('Error loading exercise:', error);
        showError('Failed to load exercise. Please try again.');
    }
}

/**
 * Populate form fields with exercise data
 */
function populateForm(exercise) {
    document.getElementById('editExerciseName').value = exercise.name || '';
    document.getElementById('editMuscleGroup').value = exercise.targetMuscleGroup || '';
    document.getElementById('editEquipment').value = exercise.primaryEquipment || '';
    document.getElementById('editDifficulty').value = exercise.difficultyLevel || '';
    document.getElementById('editMechanics').value = exercise.mechanics || '';

    // Update page subtitle
    document.getElementById('pageSubtitle').textContent = exercise.name;

    // Set linked exercise display
    if (exercise.linkedExerciseId) {
        editState.linkedExerciseId = exercise.linkedExerciseId;
        // Try to find the linked exercise name from cache or use the ID
        const cachedExercises = window.getExerciseCache?.();
        if (cachedExercises?.exercises) {
            const linked = cachedExercises.exercises.find(e => e.id === exercise.linkedExerciseId);
            if (linked) {
                editState.linkedExerciseName = linked.name;
                showLinkedExercise(linked.name, linked.targetMuscleGroup);
                return;
            }
        }
        // Fallback: show ID if we can't find the name yet
        showLinkedExercise(exercise.linkedExerciseId, '');
        // Try to load the name asynchronously
        loadLinkedExerciseName(exercise.linkedExerciseId);
    } else {
        clearLinkedExercise();
    }
}

/**
 * Load linked exercise name from API if not in cache
 */
async function loadLinkedExerciseName(exerciseId) {
    try {
        const url = editPage.getApiUrl(`/api/v3/exercises/${exerciseId}`);
        const response = await fetch(url);
        if (response.ok) {
            const exercise = await response.json();
            editState.linkedExerciseName = exercise.name;
            showLinkedExercise(exercise.name, exercise.targetMuscleGroup);
        }
    } catch (error) {
        console.error('Failed to load linked exercise name:', error);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners(page) {
    // Save button
    document.getElementById('saveExerciseBtn').addEventListener('click', () => saveExercise(page));

    // Delete button
    document.getElementById('deleteExerciseBtn').addEventListener('click', () => deleteExercise(page));

    // Unlink button
    document.getElementById('unlinkBtn').addEventListener('click', clearLinkedExercise);

    // Search exercises button (opens offcanvas)
    document.getElementById('searchExercisesBtn').addEventListener('click', openLinkSearch);

    // Track dirty state
    const formInputs = document.querySelectorAll('#exerciseEditForm input, #exerciseEditForm select');
    formInputs.forEach(input => {
        input.addEventListener('input', () => { editState.isDirty = true; });
        input.addEventListener('change', () => { editState.isDirty = true; });
    });
}

/**
 * Open the exercise search offcanvas for linking
 */
function openLinkSearch() {
    // Use the existing createExerciseSearchOffcanvas from UnifiedOffcanvasFactory
    if (window.UnifiedOffcanvasFactory) {
        window.UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
            {
                title: 'Link to Exercise',
                buttonText: 'Link',
                buttonIcon: 'bx-link'
            },
            (selectedExercise) => {
                editState.linkedExerciseId = selectedExercise.id || selectedExercise.name;
                editState.linkedExerciseName = selectedExercise.name;
                editState.isDirty = true;
                showLinkedExercise(
                    selectedExercise.name,
                    selectedExercise.targetMuscleGroup || ''
                );
            }
        );
    } else {
        console.error('UnifiedOffcanvasFactory not available');
        if (window.showAlert) {
            window.showAlert('Search component is still loading. Please try again.', 'warning');
        }
    }
}

/**
 * Show linked exercise in the display area
 */
function showLinkedExercise(name, meta) {
    document.getElementById('linkedExerciseName').textContent = name;
    document.getElementById('linkedExerciseMeta').textContent = meta || '';
    document.getElementById('linkedExerciseDisplay').style.display = '';
    document.getElementById('notLinkedDisplay').style.display = 'none';
}

/**
 * Clear linked exercise
 */
function clearLinkedExercise() {
    editState.linkedExerciseId = null;
    editState.linkedExerciseName = null;
    editState.isDirty = true;
    document.getElementById('linkedExerciseName').textContent = '';
    document.getElementById('linkedExerciseMeta').textContent = '';
    document.getElementById('linkedExerciseDisplay').style.display = 'none';
    document.getElementById('notLinkedDisplay').style.display = '';
}

/**
 * Save exercise changes
 */
async function saveExercise(page) {
    const name = document.getElementById('editExerciseName').value.trim();
    if (!name) {
        if (window.showAlert) window.showAlert('Exercise name is required.', 'warning');
        return;
    }

    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        if (window.showAlert) window.showAlert('Please sign in to save.', 'warning');
        return;
    }

    const saveBtn = document.getElementById('saveExerciseBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const token = await user.getIdToken();
        const url = page.getApiUrl(`/api/v3/users/me/exercises/${editState.exerciseId}`);

        const body = {
            name,
            difficultyLevel: document.getElementById('editDifficulty').value || null,
            targetMuscleGroup: document.getElementById('editMuscleGroup').value.trim() || null,
            primaryEquipment: document.getElementById('editEquipment').value.trim() || null,
            mechanics: document.getElementById('editMechanics').value || null,
            linkedExerciseId: editState.linkedExerciseId || null
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to update exercise');
        }

        editState.isDirty = false;

        if (window.showAlert) {
            window.showAlert(`Exercise "${name}" updated successfully!`, 'success');
        }

        // Navigate back after brief delay
        setTimeout(() => {
            window.location.href = 'exercise-database.html';
        }, 1000);

    } catch (error) {
        console.error('Error saving exercise:', error);
        if (window.showAlert) window.showAlert(error.message, 'danger');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Changes';
    }
}

/**
 * Delete exercise with confirmation
 */
async function deleteExercise(page) {
    if (!editState.exercise) return;

    const confirmed = confirm(`Are you sure you want to delete "${editState.exercise.name}"? This cannot be undone.`);
    if (!confirmed) return;

    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        if (window.showAlert) window.showAlert('Please sign in to delete.', 'warning');
        return;
    }

    const deleteBtn = document.getElementById('deleteExerciseBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

    try {
        const token = await user.getIdToken();
        const url = page.getApiUrl(`/api/v3/users/me/exercises/${editState.exerciseId}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to delete exercise');
        }

        if (window.showAlert) {
            window.showAlert(`Exercise "${editState.exercise.name}" deleted.`, 'success');
        }

        // Navigate back
        setTimeout(() => {
            window.location.href = 'exercise-database.html';
        }, 1000);

    } catch (error) {
        console.error('Error deleting exercise:', error);
        if (window.showAlert) window.showAlert('Failed to delete exercise. Please try again.', 'danger');
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bx bx-trash me-1"></i>Delete Exercise';
    }
}

/**
 * Show error state
 */
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('editFormContainer').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = '';
}

console.log('📦 Exercise Edit controller loaded');
