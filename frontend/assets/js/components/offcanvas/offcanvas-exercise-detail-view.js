/**
 * Ghost Gym - Exercise Detail View (Inline Push/Pop)
 * Shows exercise details inside the search offcanvas by hiding existing
 * children and appending a detail panel. Back button restores the search.
 * Preserves all event listeners on search elements.
 *
 * @module offcanvas-exercise-detail-view
 * @version 2.1.0
 */

import { escapeHtml } from './offcanvas-helpers.js';

const DETAIL_PANEL_ID = 'exerciseDetailInlinePanel';

/**
 * Show exercise detail inside the search offcanvas (push/pop pattern)
 * @param {Object} exercise - Exercise object from search results
 * @param {Object} options - Configuration
 * @param {HTMLElement} options.offcanvasElement - The search offcanvas DOM element
 * @param {Function} options.onAdd - Callback when "Add to Workout" is clicked
 * @param {boolean} options.showAddButton - Whether to show the add button (default: true)
 */
export function showExerciseDetailInSearch(exercise, options = {}) {
    const {
        offcanvasElement,
        onAdd = null,
        showAddButton = true
    } = options;

    if (!offcanvasElement) {
        console.error('showExerciseDetailInSearch: offcanvasElement required');
        return;
    }

    // Look up full exercise data from cache
    const fullExercise = [...(window.ffn?.exercises?.all || []), ...(window.ffn?.exercises?.custom || [])]
        .find(e => e.id === (exercise.id || exercise.name)) || exercise;

    const isFavorited = window.ffn?.exercises?.favorites?.has(fullExercise.id);

    const detailHTML = window._buildExerciseDetailHTML
        ? window._buildExerciseDetailHTML(fullExercise)
        : '<p class="text-muted">Exercise details unavailable.</p>';

    const header = offcanvasElement.querySelector('.offcanvas-header');
    const body = offcanvasElement.querySelector('.offcanvas-body');

    // --- PUSH: Hide search content, show detail ---

    // Save original header children (as DOM nodes, preserving listeners)
    const savedHeaderNodes = Array.from(header.childNodes).map(n => {
        const clone = n;
        return clone;
    });

    // Hide all body children (don't remove — preserves listeners)
    // Use d-none class because d-flex !important beats inline display:none
    Array.from(body.children).forEach(child => {
        child.dataset.detailHidden = 'true';
        child.classList.add('d-none');
    });

    // Replace header content
    header.innerHTML = '';
    header.insertAdjacentHTML('beforeend', `
        <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="detailBackBtn">
            <i class="bx bx-arrow-back"></i>
        </button>
        <h5 class="offcanvas-title text-truncate mb-0">
            <i class="bx bx-info-circle me-2"></i>${escapeHtml(fullExercise.name || 'Exercise Details')}
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    `);

    // Create detail panel and append to body
    const detailPanel = document.createElement('div');
    detailPanel.id = DETAIL_PANEL_ID;
    detailPanel.className = 'p-3';
    detailPanel.style.overflowY = 'auto';
    detailPanel.style.flexGrow = '1';
    detailPanel.innerHTML = `
        <div class="exercise-detail-view-content">
            ${detailHTML}
        </div>
        <div class="exercise-detail-view-actions border-top pt-3 mt-3">
            <div class="d-flex gap-2 mb-2">
                <button type="button" class="btn btn-outline-${isFavorited ? 'danger' : 'secondary'} flex-fill" id="detailViewFavBtn">
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
    `;
    body.appendChild(detailPanel);

    // --- POP: Restore search content ---
    const restoreSearch = () => {
        // Remove detail panel
        detailPanel.remove();

        // Show all previously hidden body children
        Array.from(body.children).forEach(child => {
            if (child.dataset.detailHidden === 'true') {
                child.classList.remove('d-none');
                delete child.dataset.detailHidden;
            }
        });

        // Restore header (put original nodes back)
        header.innerHTML = '';
        savedHeaderNodes.forEach(node => header.appendChild(node));
    };

    // Back button
    header.querySelector('#detailBackBtn')?.addEventListener('click', restoreSearch);

    // Wire pairing chip clicks to navigate to another exercise detail
    if (window._wirePairingChipClicks) {
        window._wirePairingChipClicks(detailPanel, (targetId) => {
            const targetExercise = [...(window.ffn?.exercises?.all || []), ...(window.ffn?.exercises?.custom || [])]
                .find(e => e.id === targetId);
            if (targetExercise) {
                // Pop current, then push new detail
                restoreSearch();
                showExerciseDetailInSearch(targetExercise, options);
            }
        });
    }

    // Favorite button
    const favBtn = detailPanel.querySelector('#detailViewFavBtn');
    if (favBtn) {
        favBtn.addEventListener('click', async () => {
            if (window.toggleExerciseFavorite) {
                await window.toggleExerciseFavorite(fullExercise.id);
                const nowFav = window.ffn?.exercises?.favorites?.has(fullExercise.id);
                favBtn.className = `btn btn-outline-${nowFav ? 'danger' : 'secondary'} flex-fill`;
                favBtn.innerHTML = `<i class="bx ${nowFav ? 'bxs-heart' : 'bx-heart'} me-1"></i>${nowFav ? 'Unfavorite' : 'Favorite'}`;
            }
        });
    }

    // Add to Workout button
    const addBtn = detailPanel.querySelector('#detailViewAddBtn');
    if (addBtn && onAdd) {
        addBtn.addEventListener('click', async () => {
            addBtn.disabled = true;
            addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            try {
                await onAdd(fullExercise);
            } catch (error) {
                console.error('Error adding exercise from detail view:', error);
                addBtn.disabled = false;
                addBtn.innerHTML = '<i class="bx bx-plus me-1"></i>Add to Workout';
            }
        });
    }
}

console.log('offcanvas-exercise-detail-view loaded');
