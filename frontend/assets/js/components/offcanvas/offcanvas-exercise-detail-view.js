/**
 * Ghost Gym - Exercise Detail View Offcanvas
 * Lightweight detail view that stacks on top of the exercise search offcanvas
 * Reuses window._buildExerciseDetailHTML from exercise-rendering.js
 *
 * @module offcanvas-exercise-detail-view
 * @version 1.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Show exercise detail view offcanvas (stacks above search offcanvas)
 * @param {Object} exercise - Exercise object with full details
 * @param {Object} options - Configuration
 * @param {Function} options.onAdd - Callback when "Add to Workout" is clicked
 * @param {boolean} options.showAddButton - Whether to show the add button (default: true)
 * @returns {Object} Offcanvas instance
 */
export function createExerciseDetailView(exercise, options = {}) {
    const {
        onAdd = null,
        showAddButton = true
    } = options;

    // Look up full exercise data from cache if we only have partial data
    const fullExercise = [...(window.ffn?.exercises?.all || []), ...(window.ffn?.exercises?.custom || [])]
        .find(e => e.id === (exercise.id || exercise.name)) || exercise;

    const isFavorited = window.ffn?.exercises?.favorites?.has(fullExercise.id);

    const detailHTML = window._buildExerciseDetailHTML
        ? window._buildExerciseDetailHTML(fullExercise)
        : '<p class="text-muted">Exercise details unavailable.</p>';

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-tall offcanvas-desktop-side offcanvas-stacked"
             tabindex="-1" id="exerciseDetailViewOffcanvas"
             data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title">
                    <i class="bx bx-info-circle me-2"></i>
                    <span>${escapeHtml(fullExercise.name || 'Exercise Details')}</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                ${detailHTML}
            </div>
            <div class="offcanvas-footer border-top p-3">
                <div class="d-flex gap-2 mb-2">
                    <button type="button" class="btn btn-outline-${isFavorited ? 'danger' : 'secondary'} flex-fill" id="detailViewFavBtn"
                            data-exercise-id="${escapeHtml(fullExercise.id || '')}">
                        <i class="bx ${isFavorited ? 'bxs-heart' : 'bx-heart'} me-1"></i>
                        ${isFavorited ? 'Unfavorite' : 'Favorite'}
                    </button>
                </div>
                ${showAddButton && onAdd ? `
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-primary flex-fill" id="detailViewAddBtn">
                        <i class="bx bx-plus me-1"></i>Add to Workout
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    return createOffcanvas('exerciseDetailViewOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Wire pairing chip clicks to navigate within this offcanvas
        if (window._wirePairingChipClicks) {
            window._wirePairingChipClicks(element, (targetId) => {
                // Close current and open new detail for the target exercise
                offcanvas.hide();
                const targetExercise = [...(window.ffn?.exercises?.all || []), ...(window.ffn?.exercises?.custom || [])]
                    .find(e => e.id === targetId);
                if (targetExercise) {
                    setTimeout(() => {
                        createExerciseDetailView(targetExercise, options);
                    }, 300);
                }
            });
        }

        // Favorite button
        const favBtn = element.querySelector('#detailViewFavBtn');
        if (favBtn) {
            favBtn.addEventListener('click', async () => {
                if (window.toggleExerciseFavorite) {
                    await window.toggleExerciseFavorite(fullExercise.id);
                    // Update button state
                    const nowFav = window.ffn?.exercises?.favorites?.has(fullExercise.id);
                    favBtn.className = `btn btn-outline-${nowFav ? 'danger' : 'secondary'} flex-fill`;
                    favBtn.innerHTML = `<i class="bx ${nowFav ? 'bxs-heart' : 'bx-heart'} me-1"></i>${nowFav ? 'Unfavorite' : 'Favorite'}`;
                }
            });
        }

        // Add to Workout button
        const addBtn = element.querySelector('#detailViewAddBtn');
        if (addBtn && onAdd) {
            addBtn.addEventListener('click', async () => {
                addBtn.disabled = true;
                addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                try {
                    await onAdd(fullExercise);
                    offcanvas.hide();
                } catch (error) {
                    console.error('Error adding exercise from detail view:', error);
                    addBtn.disabled = false;
                    addBtn.innerHTML = '<i class="bx bx-plus me-1"></i>Add to Workout';
                }
            });
        }
    });
}

console.log('offcanvas-exercise-detail-view loaded');
