/**
 * Ghost Gym Dashboard - Workout Database Favorites
 * Handles favorite toggling, favorites section rendering, and favorites-only filtering
 * @version 1.0.0 - Extracted from workout-database.js
 */

/**
 * Toggle workout favorite status with optimistic UI
 * @param {Event} event - Click event
 * @param {string} workoutId - Workout ID
 * @param {boolean} currentState - Current favorite state
 */
async function toggleWorkoutFavorite(event, workoutId, currentState) {
    event.stopPropagation();  // Don't trigger card click

    // Check auth using the correct method
    if (!window.authService?.isUserAuthenticated()) {
        // Show auth modal using AuthUI service
        if (window.authUI) {
            window.authUI.showAuthModal('signin');
        }
        if (window.showToast) {
            window.showToast('Sign in to save favorites', 'info');
        }
        return;
    }

    const newState = !currentState;
    const button = event.currentTarget;

    // Optimistic UI update
    const icon = button.querySelector('i');
    icon.className = newState ? 'bx bxs-heart' : 'bx bx-heart';
    button.classList.toggle('text-danger', newState);
    button.dataset.isFavorite = newState;

    try {
        await window.dataManager.toggleWorkoutFavorite(workoutId, newState);

        // Update local state
        const workout = window.ffn.workoutDatabase.all.find(w => w.id === workoutId);
        if (workout) {
            workout.is_favorite = newState;
            workout.favorited_at = newState ? new Date().toISOString() : null;
        }

        // Re-render favorites section
        renderFavoritesSection();

        // Show feedback
        if (window.showToast) {
            window.showToast(newState ? 'Added to favorites' : 'Removed from favorites', 'success');
        }

    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        // Revert UI
        icon.className = currentState ? 'bx bxs-heart' : 'bx bx-heart';
        button.classList.toggle('text-danger', currentState);
        button.dataset.isFavorite = currentState;
        window.showToast?.('Failed to update favorite', 'error');
    }
}

/**
 * Render the Favorites section (mobile only - desktop uses inline heart icons + filter toggle)
 */
function renderFavoritesSection() {
    const mobileSection = document.getElementById('favoritesSection');
    const mobileContainer = document.getElementById('favoritesContent');

    // Hide section if favorites filter is active (redundant cards)
    const favoritesOnly = window.ffn.workoutDatabase.filters.favoritesOnly;

    const favorites = window.ffn.workoutDatabase.all
        .filter(w => w.is_favorite)
        .sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));

    // --- Mobile favorites ---
    if (mobileSection && mobileContainer) {
        if (favoritesOnly || favorites.length === 0) {
            mobileSection.style.display = 'none';
        } else {
            mobileSection.style.display = 'block';
            const displayFavorites = favorites.slice(0, 3);
            mobileContainer.innerHTML = displayFavorites.map(workout =>
                renderCompactWorkoutCard(workout)
            ).join('');

            const viewAllLink = document.getElementById('viewAllFavorites');
            if (viewAllLink) {
                viewAllLink.style.display = 'inline';
                viewAllLink.textContent = `View all (${favorites.length})`;
                viewAllLink.onclick = (e) => {
                    e.preventDefault();
                    filterFavoritesOnly();
                };
            }
        }
    }
}

/**
 * Render a compact workout card for mobile favorites section
 */
function renderCompactWorkoutCard(workout) {
    const exerciseCount = workout.exercise_groups?.length || 0;

    return `
        <div class="card mb-2 workout-card-compact" onclick="viewWorkoutDetails('${workout.id}')">
            <div class="card-body py-3 px-3">
                <div class="d-flex align-items-center gap-2">
                    <i class="bx bxs-heart text-danger"></i>
                    <div>
                        <span class="fw-medium">${workout.name}</span>
                        <small class="text-muted d-block">${exerciseCount} exercises</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Filter to show only favorites in the main grid
 * @param {boolean} enabled - Whether to enable or disable favorites filter
 */
function filterFavoritesOnly(enabled = true) {
    console.log('⭐ Favorites filter:', enabled ? 'enabled' : 'disabled');

    // Update filter state
    window.ffn.workoutDatabase.filters.favoritesOnly = enabled;

    // Sync the toggle in offcanvas
    const toggle = document.getElementById('favoritesFilterToggle');
    if (toggle) {
        toggle.checked = enabled;
    }

    // Apply filters (will hide favorites section when enabled)
    window.filterWorkouts();

    // Re-render favorites section
    renderFavoritesSection();

    // Update filter badge
    window.updateFilterBadge();
}

// Window exports
window.toggleWorkoutFavorite = toggleWorkoutFavorite;
window.renderFavoritesSection = renderFavoritesSection;
window.filterFavoritesOnly = filterFavoritesOnly;

console.log('📦 WorkoutDatabaseFavorites loaded');
