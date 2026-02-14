/**
 * Ghost Gym Dashboard - Workout Database Delete Manager
 * Handles batch selection, deletion mode, action bar, and single/batch delete operations
 * @version 1.0.0 - Extracted from workout-database.js
 */

/**
 * Toggle delete mode on/off
 */
function toggleDeleteMode() {
    const toggle = document.getElementById('deleteModeToggle');
    const isActive = toggle ? toggle.checked : !window.ffn.workoutDatabase.deleteMode;

    // Sync toggle state
    if (toggle) toggle.checked = isActive;
    window.ffn.workoutDatabase.deleteMode = isActive;

    // Clear selection when entering/exiting
    window.ffn.workoutDatabase.selectedWorkoutIds.clear();

    console.log(`🗑️ Delete mode ${isActive ? 'activated' : 'deactivated'}`);

    // Update grid delete mode
    if (window.workoutGrid) {
        window.workoutGrid.setDeleteMode(isActive);
        window.workoutGrid.clearSelection();
    }

    // Show/hide selection action bar
    if (isActive) {
        showSelectionActionBar();
    } else {
        hideSelectionActionBar();
    }

    // Body class for global styling
    document.body.classList.toggle('delete-mode-active', isActive);
}

/**
 * Enter delete mode with a workout pre-selected
 * Called from the 3-dot menu on workout cards
 * @param {string} workoutId - Workout ID to pre-select
 */
function enterDeleteModeWithSelection(workoutId) {
    const toggle = document.getElementById('deleteModeToggle');

    // Enter delete mode
    if (toggle) toggle.checked = true;
    window.ffn.workoutDatabase.deleteMode = true;
    window.ffn.workoutDatabase.selectedWorkoutIds.clear();
    window.ffn.workoutDatabase.selectedWorkoutIds.add(workoutId);

    console.log(`🗑️ Delete mode activated with workout pre-selected: ${workoutId}`);

    // Update grid delete mode and set selection
    if (window.workoutGrid) {
        // Set isSelected BEFORE re-render so checkbox renders as checked
        const card = window.workoutGrid.cards.find(c => c.workout.id === workoutId);
        if (card) {
            card.config.isSelected = true;
        }
        window.workoutGrid.setDeleteMode(true);
    }

    // Show action bar with 1 selected
    showSelectionActionBar();
    document.body.classList.add('delete-mode-active');
}

/**
 * Handle selection change from card checkbox
 * @param {string} workoutId - The workout ID
 * @param {boolean} isSelected - Whether it's selected
 */
function handleSelectionChange(workoutId, isSelected) {
    const selected = window.ffn.workoutDatabase.selectedWorkoutIds;
    if (isSelected) {
        selected.add(workoutId);
    } else {
        selected.delete(workoutId);
    }
    updateSelectionCount();
}

/**
 * Show selection action bar (contextual action bar)
 */
function showSelectionActionBar() {
    let bar = document.getElementById('selectionActionBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'selectionActionBar';
        bar.className = 'selection-action-bar';
        bar.innerHTML = `
            <div class="selection-info">
                <button class="btn-close-selection" onclick="exitDeleteMode()" type="button">
                    <i class="bx bx-x"></i>
                </button>
                <span class="selection-count">0 selected</span>
            </div>
            <button class="btn-batch-delete" onclick="confirmBatchDelete()" type="button" disabled>
                <i class="bx bx-trash"></i>
                Delete
            </button>
        `;
        document.body.appendChild(bar);
    }
    bar.style.display = 'flex';
    updateSelectionCount();
}

/**
 * Hide selection action bar
 */
function hideSelectionActionBar() {
    const bar = document.getElementById('selectionActionBar');
    if (bar) {
        bar.style.display = 'none';
    }
}

/**
 * Update the selection count display
 */
function updateSelectionCount() {
    const count = window.ffn.workoutDatabase.selectedWorkoutIds.size;
    const countEl = document.querySelector('.selection-count');
    const deleteBtn = document.querySelector('.btn-batch-delete');

    if (countEl) countEl.textContent = `${count} selected`;
    if (deleteBtn) deleteBtn.disabled = count === 0;
}

/**
 * Exit delete mode - called from action bar button
 */
function exitDeleteMode() {
    const toggle = document.getElementById('deleteModeToggle');
    if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
    } else {
        // Direct toggle if checkbox not available
        window.ffn.workoutDatabase.deleteMode = false;
        window.ffn.workoutDatabase.selectedWorkoutIds.clear();
        if (window.workoutGrid) {
            window.workoutGrid.setDeleteMode(false);
            window.workoutGrid.clearSelection();
        }
        hideSelectionActionBar();
        document.body.classList.remove('delete-mode-active');
    }
}

/**
 * Confirm batch delete of selected workouts
 */
async function confirmBatchDelete() {
    const selected = window.ffn.workoutDatabase.selectedWorkoutIds;
    const count = selected.size;
    if (count === 0) return;

    // Get workout names for confirmation
    const workoutNames = [...selected].map(id => {
        const workout = window.ffn.workoutDatabase.all.find(w => w.id === id);
        return workout?.name || 'Unknown workout';
    }).slice(0, 3); // Show max 3 names

    let message = `Are you sure you want to delete ${count} workout${count > 1 ? 's' : ''}?\n\n`;
    message += workoutNames.join('\n');
    if (count > 3) {
        message += `\n...and ${count - 3} more`;
    }
    message += '\n\nThis action cannot be undone.';

    const confirmed = confirm(message);

    if (confirmed) {
        await batchDeleteWorkouts([...selected]);
    }
}

/**
 * Batch delete multiple workouts
 * @param {Array<string>} workoutIds - Array of workout IDs to delete
 */
async function batchDeleteWorkouts(workoutIds) {
    console.log('🗑️ Batch deleting workouts:', workoutIds);

    // Show loading state
    const deleteBtn = document.querySelector('.btn-batch-delete');
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        deleteBtn.disabled = true;
    }

    try {
        // Delete each workout
        let deletedCount = 0;
        for (const id of workoutIds) {
            try {
                await window.dataManager.deleteWorkout(id);
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete workout ${id}:`, error);
            }
        }

        // Update local state
        window.ffn.workoutDatabase.all = window.ffn.workoutDatabase.all.filter(
            w => !workoutIds.includes(w.id)
        );
        window.ffn.workouts = window.ffn.workouts.filter(
            w => !workoutIds.includes(w.id)
        );

        // Update stats
        window.ffn.workoutDatabase.stats.total = window.ffn.workoutDatabase.all.length;

        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
        }

        // Show success message
        if (window.showToast) {
            window.showToast(`Deleted ${deletedCount} workout${deletedCount > 1 ? 's' : ''}`, 'success');
        }

        // Exit delete mode and refresh
        exitDeleteMode();
        window.filterWorkouts();

        // Re-render favorites section
        window.renderFavoritesSection?.();

    } catch (error) {
        console.error('Batch delete failed:', error);
        if (window.showToast) {
            window.showToast('Failed to delete some workouts', 'error');
        }
    } finally {
        // Reset button state
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bx bx-trash"></i> Delete';
            deleteBtn.disabled = false;
        }
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
        window.ffn.workoutDatabase.all = window.ffn.workoutDatabase.all.filter(w => w.id !== workoutId);
        window.ffn.workouts = window.ffn.workouts.filter(w => w.id !== workoutId);

        // Update stats
        window.ffn.workoutDatabase.stats.total = window.ffn.workoutDatabase.all.length;

        // Update total count display
        const totalCountEl = document.getElementById('totalWorkoutsCount');
        if (totalCountEl) {
            totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
        }

        // Re-apply filters and render
        window.filterWorkouts();

        // Re-render Favorites section (in case deleted workout was favorited)
        window.renderFavoritesSection?.();

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

// Window exports
window.toggleDeleteMode = toggleDeleteMode;
window.enterDeleteModeWithSelection = enterDeleteModeWithSelection;
window.handleSelectionChange = handleSelectionChange;
window.showSelectionActionBar = showSelectionActionBar;
window.hideSelectionActionBar = hideSelectionActionBar;
window.updateSelectionCount = updateSelectionCount;
window.exitDeleteMode = exitDeleteMode;
window.confirmBatchDelete = confirmBatchDelete;
window.batchDeleteWorkouts = batchDeleteWorkouts;
window.deleteWorkoutFromDatabase = deleteWorkoutFromDatabase;
window.initDeleteModeToggle = initDeleteModeToggle;

console.log('📦 WorkoutDatabaseDeleteManager loaded');
