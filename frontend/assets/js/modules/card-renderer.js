/**
 * Card Renderer Module
 * Handles rendering of exercise group cards
 * @version 1.0.0
 */

class CardRenderer {
    constructor() {
        // Initialize storage for card data
        this.exerciseGroupsData = {};
        
        // Make data accessible globally for backward compatibility
        window.exerciseGroupsData = this.exerciseGroupsData;
        
        console.log('✅ CardRenderer initialized');
    }
    
    /**
     * Create exercise group card HTML
     * @param {string} groupId - Unique group ID
     * @param {object} groupData - Group data (optional)
     * @param {number} groupNumber - Group number for display
     * @param {number} index - Current card index (0-based) for menu boundary detection
     * @param {number} totalCards - Total number of cards for menu boundary detection
     * @returns {string} HTML string
     */
    createExerciseGroupCard(groupId, groupData = null, groupNumber = 1, index = 0, totalCards = 1) {
        const data = groupData || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        // Store data
        this.exerciseGroupsData[groupId] = data;

        // Build exercise list (main, alt, alt2)
        const exercises = [];
        if (data.exercises.a) exercises.push(data.exercises.a);
        if (data.exercises.b) exercises.push(data.exercises.b);
        if (data.exercises.c) exercises.push(data.exercises.c);

        const hasData = data.exercises.a;

        // Build exercises HTML - each on new line
        let exercisesHtml = '';
        if (exercises.length > 0) {
            exercisesHtml = exercises.map((ex, idx) => {
                const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
                return `<div class="exercise-line">${label}${this.escapeHtml(ex)}</div>`;
            }).join('');
        } else {
            exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
        }

        // Build meta text (plain text, not badges) — show whenever sets/reps/rest exist
        let metaText = '';
        if (data.sets || data.reps || data.rest) {
            const protocol = data.sets && data.reps ? `${data.sets}×${data.reps}` : (data.sets || data.reps || '');
            const parts = [protocol, `${data.rest} rest`].filter(Boolean);
            if (data.default_weight) {
                const unitDisplay = data.default_weight_unit !== 'other' ? ` ${data.default_weight_unit}` : '';
                parts.push(`${data.default_weight}${unitDisplay}`);
            }
            metaText = parts.join(' • ');
        }

        // Determine menu item states based on position
        const isFirst = index === 0;
        const isLast = index >= totalCards - 1;
        const moveUpDisabled = isFirst ? 'disabled' : '';
        const moveDownDisabled = isLast ? 'disabled' : '';

        // Block-specific menu items (only shown for cards in a block)
        const blockMenuItems = data.block_id ? `
                                <div class="builder-menu-divider"></div>
                                <button class="builder-menu-item"
                                        onclick="window.ExerciseGroupManager?.removeFromBlock?.('${groupId}'); event.stopPropagation();">
                                    <i class="bx bx-unlink"></i>
                                    Remove from Block
                                </button>
                                <button class="builder-menu-item"
                                        onclick="window.ExerciseGroupManager?.renameBlock?.('${data.block_id}'); event.stopPropagation();">
                                    <i class="bx bx-edit"></i>
                                    Rename Block
                                </button>
        ` : '';

        return `
            <div class="exercise-group-card compact" data-group-id="${groupId}" data-index="${index}">
                <div class="card">
                    <div class="card-body">
                        <div class="exercise-content">
                            <div class="exercise-list">
                                ${exercisesHtml}
                            </div>
                            ${metaText ? `<div class="exercise-meta-text text-muted small">${metaText}</div>` : ''}
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-sm btn-edit-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); openExerciseGroupEditor('${groupId}');"
                                    title="Edit exercise">
                                <i class="bx bx-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-menu-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); window.builderCardMenu?.toggleMenu(this, '${groupId}', ${index});"
                                    title="More options">
                                <i class="bx bx-dots-vertical"></i>
                            </button>
                            <div class="builder-card-menu" onclick="event.stopPropagation();">
                                <button class="builder-menu-item ${moveUpDisabled}"
                                        onclick="window.builderCardMenu?.handleMoveUp('${groupId}', ${index});"
                                        ${moveUpDisabled}>
                                    <i class="bx bx-chevron-up"></i>
                                    Move up
                                </button>
                                <button class="builder-menu-item ${moveDownDisabled}"
                                        onclick="window.builderCardMenu?.handleMoveDown('${groupId}', ${index});"
                                        ${moveDownDisabled}>
                                    <i class="bx bx-chevron-down"></i>
                                    Move down
                                </button>
                                <div class="builder-menu-divider"></div>
                                <button class="builder-menu-item danger"
                                        onclick="window.builderCardMenu?.handleDelete('${groupId}');">
                                    <i class="bx bx-trash"></i>
                                    Delete
                                </button>${blockMenuItems}
                                <div class="builder-menu-divider section-menu-divider" style="display:none;"></div>
                                <div class="section-menu-items" data-group-id="${groupId}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update exercise group card preview
     * @param {string} groupId - Group ID
     * @param {object} groupData - Group data
     */
    updateExerciseGroupCardPreview(groupId, groupData) {
        const card = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!card) return;

        // Build exercise list (main, alt, alt2)
        const exercises = [];
        if (groupData.exercises.a) exercises.push(groupData.exercises.a);
        if (groupData.exercises.b) exercises.push(groupData.exercises.b);
        if (groupData.exercises.c) exercises.push(groupData.exercises.c);
        
        const hasData = groupData.exercises.a;
        
        // Build exercises HTML - each on new line
        let exercisesHtml = '';
        if (exercises.length > 0) {
            exercisesHtml = exercises.map((ex, idx) => {
                const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
                return `<div class="exercise-line">${label}${this.escapeHtml(ex)}</div>`;
            }).join('');
        } else {
            exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
        }
        
        // Build meta text (plain text, not badges) — show whenever sets/reps/rest exist
        let metaText = '';
        if (groupData.sets || groupData.reps || groupData.rest) {
            const protocol = groupData.sets && groupData.reps ? `${groupData.sets}×${groupData.reps}` : (groupData.sets || groupData.reps || '');
            const parts = [protocol, `${groupData.rest} rest`].filter(Boolean);
            if (groupData.default_weight) {
                const unitDisplay = groupData.default_weight_unit !== 'other' ? ` ${groupData.default_weight_unit}` : '';
                parts.push(`${groupData.default_weight}${unitDisplay}`);
            }
            metaText = parts.join(' • ');
        }
        
        // Update exercise list
        const exerciseList = card.querySelector('.exercise-list');
        if (exerciseList) {
            exerciseList.innerHTML = exercisesHtml;
        }
        
        // Update meta text
        const metaTextEl = card.querySelector('.exercise-meta-text');
        if (metaTextEl) {
            if (metaText) {
                metaTextEl.textContent = metaText;
                metaTextEl.style.display = 'block';
            } else {
                metaTextEl.textContent = '';
                metaTextEl.style.display = 'none';
            }
        }
    }
    
    /**
     * Get exercise group data from storage
     * @param {string} groupId - Group ID
     * @returns {object} Group data
     */
    getExerciseGroupData(groupId) {
        return this.exerciseGroupsData[groupId] || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };
    }
    
    /**
     * Delete exercise group card
     * @param {string} groupId - Group ID to delete
     */
    deleteExerciseGroupCard(groupId) {
        const card = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!card) return;

        const groupData = this.exerciseGroupsData[groupId];
        const exerciseName = groupData?.exercises?.a || 'this exercise';

        if (confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
            // Capture parent section BEFORE removing card from DOM
            const parentSection = card.closest('.workout-section');

            // Remove from DOM
            card.remove();

            // Remove from data storage
            delete this.exerciseGroupsData[groupId];

            // Clean up parent section and re-chain remaining cards
            if (parentSection && window.SectionManager) {
                window.SectionManager._cleanupSection(parentSection);
                const exercisesContainer = parentSection.querySelector('.section-exercises');
                if (exercisesContainer && parentSection.dataset.sectionType !== 'standard') {
                    window.SectionManager._applyBlockChainClasses(exercisesContainer);
                }
            }

            // Update menu boundaries for remaining cards
            if (window.builderCardMenu?.updateAllMenuBoundaries) {
                window.builderCardMenu.updateAllMenuBoundaries();
            }

            // Mark as dirty
            if (window.markEditorDirty) {
                window.markEditorDirty();
            }

            console.log('✅ Exercise group deleted:', groupId);
        }
    }
    
    /**
     * Apply visual grouping to consecutive cards sharing the same block_id.
     * Called after any render/reorder/add/remove operation.
     * Scans #exerciseGroups, finds runs of consecutive cards with same block_id,
     * and applies CSS classes + inserts header labels.
     */
    applyBlockGrouping() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        // Remove existing block headers and grouping classes
        container.querySelectorAll('.block-group-header').forEach(h => h.remove());
        container.querySelectorAll('.exercise-in-block').forEach(c => {
            c.classList.remove('exercise-in-block', 'block-first', 'block-middle', 'block-last');
            c.removeAttribute('data-block-id');
        });

        const cards = Array.from(container.querySelectorAll('.exercise-group-card'));
        let i = 0;

        while (i < cards.length) {
            const groupId = cards[i].dataset.groupId;
            const data = window.exerciseGroupsData?.[groupId];
            const blockId = data?.block_id;

            if (!blockId) { i++; continue; }

            // Find run of consecutive cards with same block_id
            let j = i;
            while (j < cards.length) {
                const jGroupId = cards[j].dataset.groupId;
                const jData = window.exerciseGroupsData?.[jGroupId];
                if (jData?.block_id !== blockId) break;
                j++;
            }

            const groupCards = cards.slice(i, j);
            const blockName = data.group_name || `Block`;

            // Insert block header before first card
            const headerHtml = `<div class="block-group-header" data-block-id="${blockId}">
                <span class="block-group-label">
                    <i class="bx bx-collection"></i>
                    ${this.escapeHtml(blockName)}
                </span>
                <div class="block-group-actions">
                    <button class="block-group-btn" title="Add exercise to block">
                        <i class="bx bx-plus"></i> Add
                    </button>
                </div>
            </div>`;
            groupCards[0].insertAdjacentHTML('beforebegin', headerHtml);

            // Apply positional classes
            groupCards.forEach((card, idx) => {
                card.classList.add('exercise-in-block');
                card.setAttribute('data-block-id', blockId);
                if (groupCards.length === 1) {
                    card.classList.add('block-first', 'block-last');
                } else if (idx === 0) {
                    card.classList.add('block-first');
                } else if (idx === groupCards.length - 1) {
                    card.classList.add('block-last');
                } else {
                    card.classList.add('block-middle');
                }
            });

            i = j;
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        // Use global escapeHtml if available (from common-utils.js)
        if (typeof window.escapeHtml === 'function') {
            return window.escapeHtml(text);
        }
        
        // Fallback implementation
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global instance
window.cardRenderer = new CardRenderer();

// Export wrapper functions for backward compatibility
window.createExerciseGroupCard = (groupId, groupData, groupNumber, index, totalCards) =>
    window.cardRenderer.createExerciseGroupCard(groupId, groupData, groupNumber, index, totalCards);

window.updateExerciseGroupCardPreview = (groupId, groupData) => 
    window.cardRenderer.updateExerciseGroupCardPreview(groupId, groupData);

window.getExerciseGroupData = (groupId) => 
    window.cardRenderer.getExerciseGroupData(groupId);

window.deleteExerciseGroupCard = (groupId) =>
    window.cardRenderer.deleteExerciseGroupCard(groupId);


window.applyBlockGrouping = () =>
    window.cardRenderer.applyBlockGrouping();

console.log('📦 Card Renderer module loaded');