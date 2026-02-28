/**
 * Ghost Gym - Reorder Offcanvas Components
 * Creates exercise and section reorder offcanvas with SortableJS drag-and-drop
 *
 * @module offcanvas-reorder
 * @version 1.0.0
 * @date 2026-02-27
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/* ============================================
   REORDER EXERCISES
   ============================================ */

/**
 * Create reorder exercises offcanvas with drag-and-drop functionality
 * Lazy-loads SortableJS library only when offcanvas opens
 * @param {Array} exercises - Array of exercise objects with at least { name, ... } properties
 * @param {Function} onSave - Callback function(reorderedExercises) when user saves new order
 * @returns {Object} Offcanvas instance
 */
export function createReorderOffcanvas(exercises, onSave) {
    // Validate inputs
    if (!Array.isArray(exercises)) {
        console.error('❌ createReorderOffcanvas requires exercises array');
        return null;
    }

    if (typeof onSave !== 'function') {
        console.error('❌ createReorderOffcanvas requires onSave callback function');
        return null;
    }

    const canReorder = exercises.length >= 2;
    const hasBlocks = exercises.some(ex => ex.blockId);

    // Build a single flat reorder-item row HTML
    const buildItemHtml = (item, globalIndex) => {
        const isNote = item.isNote === true;
        const isCardio = item.isCardio === true;
        const displayName = item.displayName || item.name;
        const itemTypeAttr = isNote ? 'data-item-type="note"' : (isCardio ? 'data-item-type="cardio"' : 'data-item-type="exercise"');
        const noteStyle = isNote ? 'border-left: 3px solid var(--workout-muted, #6c757d);' : '';
        const icon = isNote ? '<i class="bx bx-note me-1 text-muted"></i>' : (isCardio ? '<i class="bx bx-heart-circle me-1 text-muted"></i>' : '');
        const badgeClass = isNote ? 'bg-label-info' : (isCardio ? 'bg-label-warning' : 'bg-label-secondary');

        // Block data attributes for position-based inference
        const blockAttrs = item.blockId
            ? `data-block-id="${escapeHtml(item.blockId)}" data-block-name="${escapeHtml(item.blockName || 'Block')}"`
            : '';

        // Block name tag (visible on block members, hidden placeholder on standalone)
        const blockDescSnippet = item.blockDescription
            ? `<div class="text-muted" style="font-size: 0.65rem; margin-top: 1px; opacity: 0.7;">${escapeHtml(item.blockDescription.substring(0, 60))}${item.blockDescription.length > 60 ? '...' : ''}</div>`
            : '';
        const blockTag = !isNote
            ? (item.blockId
                ? `<span class="reorder-block-tag">${escapeHtml(item.blockName || 'Block')}</span>`
                : '<span class="reorder-block-tag" style="display:none;"></span>')
            : '';

        return `
            <div class="reorder-item" data-index="${globalIndex}" ${itemTypeAttr} ${blockAttrs}>
                <div class="d-flex align-items-center gap-3 p-3 border rounded mb-2 reorder-item-inner" style="cursor: ${canReorder ? 'move' : 'default'}; ${noteStyle}">
                    ${canReorder ? `
                    <div class="reorder-handle text-muted">
                        <i class="bx bx-menu" style="font-size: 1.5rem;"></i>
                    </div>
                    ` : ''}
                    <div class="flex-grow-1">
                        <div class="fw-medium">${icon}${escapeHtml(displayName)} ${blockTag}</div>
                        ${!isNote && !isCardio && (item.sets || item.reps) ? `
                            <small class="text-muted">
                                ${item.sets ? `${item.sets} sets` : ''}
                                ${item.sets && item.reps ? ' × ' : ''}
                                ${item.reps ? `${item.reps}` : ''}
                            </small>
                        ` : ''}
                        ${isCardio && (item.sets || item.reps) ? `
                            <small class="text-muted">
                                ${[item.sets, item.reps].filter(Boolean).join(' • ')}
                            </small>
                        ` : ''}
                        ${blockDescSnippet}
                    </div>
                    <div class="badge reorder-badge ${badgeClass}">${globalIndex + 1}</div>
                </div>
            </div>
        `;
    };

    // Build flat list HTML — all items at same level, no nesting
    const buildListHtml = (items) => {
        return items.map((item, index) => buildItemHtml(item, index)).join('');
    };

    // Block styling for flat list with connected-card visual grouping
    const blockStyles = hasBlocks ? `
        <style>
            /* Block member — teal left border */
            .reorder-item.block-member .reorder-item-inner {
                border-left: 3px solid var(--workout-block, #2dd4bf);
            }
            /* First item in a consecutive block group */
            .reorder-item.block-first .reorder-item-inner {
                margin-bottom: 0;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom-color: rgba(45, 212, 191, 0.3);
            }
            /* Middle items */
            .reorder-item.block-middle .reorder-item-inner {
                margin-bottom: 0;
                border-radius: 0;
                border-bottom-color: rgba(45, 212, 191, 0.3);
            }
            /* Last item */
            .reorder-item.block-last .reorder-item-inner {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
            /* Single-item block — full rounded, just teal border */
            /* Item joining a block (position-inferred) */
            .reorder-item.block-joining .reorder-item-inner {
                border-left: 3px dashed var(--workout-block, #2dd4bf);
                background: rgba(45, 212, 191, 0.06);
            }
            /* Item leaving its block */
            .reorder-item.block-leaving .reorder-item-inner {
                border-left: 3px dashed var(--bs-danger, #dc3545);
                opacity: 0.75;
            }
            /* Block name tag inline with exercise name */
            .reorder-block-tag {
                font-size: 0.6rem;
                font-weight: 600;
                color: var(--workout-block, #2dd4bf);
                background: rgba(45, 212, 191, 0.1);
                padding: 1px 5px;
                border-radius: 3px;
                margin-left: 6px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                vertical-align: middle;
            }
            /* Ghost while dragging */
            .reorder-item.sortable-ghost .reorder-item-inner {
                opacity: 0.4;
                border-style: dashed;
            }
            /* Drop zone lines during drag */
            #reorderList.is-dragging .reorder-item {
                margin-bottom: 4px;
            }
            #reorderList.is-dragging .reorder-item::after {
                content: '';
                display: block;
                height: 3px;
                background: var(--bs-primary, #696cff);
                border-radius: 2px;
                margin: 2px 16px 0;
                opacity: 0.25;
            }
            #reorderList.is-dragging .reorder-item:last-child::after {
                display: none;
            }
            #reorderList.is-dragging .reorder-item.block-member::after {
                background: var(--workout-block, #2dd4bf);
                opacity: 0.4;
            }
        </style>
    ` : '';

    // Build body content based on exercise count
    let bodyContent;
    if (exercises.length === 0) {
        bodyContent = `
            <div class="text-center py-4">
                <i class="bx bx-list-ul" style="font-size: 4rem; color: var(--bs-secondary);"></i>
                <h6 class="mt-3">No exercises yet</h6>
                <p class="text-muted mb-0">Add some exercises to your workout, then come back to reorder them.</p>
            </div>
        `;
    } else if (exercises.length === 1) {
        bodyContent = `
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Add more exercises</strong>
                    <p class="mb-0 small">You need at least 2 exercises to reorder them. Add another exercise and try again.</p>
                </div>
            </div>
            <div id="reorderList" class="mb-4">
                ${buildListHtml(exercises)}
            </div>
        `;
    } else {
        const helpText = hasBlocks
            ? 'Drag exercises to reorder. Drop between block members to join a block.'
            : 'Hold and drag exercises to change their order.';
        bodyContent = `
            ${blockStyles}
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Drag to reorder</strong>
                    <p class="mb-0 small">${helpText} Changes are saved when you tap "Save Order".</p>
                </div>
            </div>
            <div id="reorderList" class="mb-4">
                ${buildListHtml(exercises)}
            </div>
            <div id="reorderLoadingIndicator" class="text-center mb-3" style="display: none;">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <small class="text-muted">Loading drag-and-drop...</small>
            </div>
        `;
    }

    const footerContent = canReorder ? `
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                <i class="bx bx-x me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary flex-fill" id="saveReorderBtn" disabled>
                <i class="bx bx-check me-1"></i>Save Order
            </button>
        </div>
    ` : `
        <button type="button" class="btn btn-secondary w-100" data-bs-dismiss="offcanvas">
            <i class="bx bx-x me-1"></i>Close
        </button>
    `;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1" id="reorderExercisesOffcanvas"
             aria-labelledby="reorderExercisesOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="reorderExercisesOffcanvasLabel">
                    <i class="bx bx-sort me-2"></i>Reorder Exercises
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                ${bodyContent}
                ${footerContent}
            </div>
        </div>
    `;

    let sortableLoaded = false;
    let sortableInstance = null;
    let draggedElement = null;

    return createOffcanvas('reorderExercisesOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        if (!canReorder) {
            console.log('ℹ️ Reorder offcanvas opened with < 2 exercises, skipping SortableJS');
            return;
        }

        const listElement = document.getElementById('reorderList');
        const saveBtn = document.getElementById('saveReorderBtn');
        const loadingIndicator = document.getElementById('reorderLoadingIndicator');

        if (!listElement || !saveBtn) {
            console.error('❌ Failed to find reorder list or save button');
            return;
        }

        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        // ── Block inference helpers ──

        // Get the block name for a given blockId by finding an original block member
        function getBlockName(blockId) {
            const items = listElement.querySelectorAll('.reorder-item');
            for (const item of items) {
                if (item.dataset.blockId === blockId && item.dataset.blockName) {
                    return item.dataset.blockName;
                }
            }
            return 'Block';
        }

        // Compute effective blockIds based on current DOM order.
        // Only the dragged item's blockId can change (position-based inference).
        // All other items keep their original blockId.
        function computeEffectiveBlockIds() {
            const items = Array.from(listElement.querySelectorAll('.reorder-item'));

            return items.map((item, i) => {
                const origBlockId = item.dataset.blockId || null;

                // Only the dragged item gets position-based inference
                if (item === draggedElement) {
                    const prevBlockId = i > 0 ? (items[i - 1].dataset.blockId || null) : null;
                    const nextBlockId = i < items.length - 1 ? (items[i + 1].dataset.blockId || null) : null;

                    // Between two items of same block → join that block
                    if (prevBlockId && prevBlockId === nextBlockId) return prevBlockId;
                    // Adjacent to own original block → stay in block (reorder within)
                    if (origBlockId && (prevBlockId === origBlockId || nextBlockId === origBlockId)) return origBlockId;
                    // Isolated → leave block / stay standalone
                    return null;
                }

                return origBlockId;
            });
        }

        // Update visual block grouping classes based on effective blockIds
        function updateVisualGrouping() {
            const items = Array.from(listElement.querySelectorAll('.reorder-item'));
            const effectiveBlockIds = computeEffectiveBlockIds();

            items.forEach((item, i) => {
                item.classList.remove('block-member', 'block-first', 'block-middle', 'block-last', 'block-single', 'block-joining', 'block-leaving');

                const blockId = effectiveBlockIds[i];
                const origBlockId = item.dataset.blockId || null;

                // Leaving indicator: was in block, now isolated
                if (origBlockId && !blockId) {
                    item.classList.add('block-leaving');
                    // Hide block tag
                    const tag = item.querySelector('.reorder-block-tag');
                    if (tag) tag.style.display = 'none';
                    return;
                }

                if (!blockId) {
                    // Standalone — ensure tag hidden
                    const tag = item.querySelector('.reorder-block-tag');
                    if (tag) tag.style.display = 'none';
                    return;
                }

                // Item is in a block (original or joining)
                const prevSame = i > 0 && effectiveBlockIds[i - 1] === blockId;
                const nextSame = i < items.length - 1 && effectiveBlockIds[i + 1] === blockId;

                item.classList.add('block-member');
                if (!origBlockId && blockId) item.classList.add('block-joining');

                if (prevSame && nextSame) item.classList.add('block-middle');
                else if (!prevSame && nextSame) item.classList.add('block-first');
                else if (prevSame && !nextSame) item.classList.add('block-last');
                else item.classList.add('block-single');

                // Update block tag text and visibility
                const tag = item.querySelector('.reorder-block-tag');
                if (tag) {
                    tag.textContent = getBlockName(blockId);
                    tag.style.display = '';
                }
            });
        }

        function updateAllBadges() {
            const allItems = listElement.querySelectorAll('.reorder-item');
            let counter = 1;
            allItems.forEach(item => {
                const badge = item.querySelector('.reorder-badge');
                if (badge && item.getAttribute('data-item-type') !== 'note') {
                    badge.textContent = counter;
                    counter++;
                }
            });
        }

        // ── SortableJS init ──

        loadSortableJS().then(() => {
            sortableLoaded = true;

            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            saveBtn.disabled = false;

            // Single flat SortableJS instance — no nesting issues
            sortableInstance = window.Sortable.create(listElement, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.reorder-handle',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                onStart: (evt) => {
                    draggedElement = evt.item;
                    listElement.classList.add('is-dragging');
                },
                onChange: () => {
                    if (hasBlocks) updateVisualGrouping();
                },
                onEnd: () => {
                    listElement.classList.remove('is-dragging');
                    if (hasBlocks) {
                        updateVisualGrouping();
                        // Persist inferred block IDs to data attributes so subsequent
                        // drags use the correct state (not stale original values)
                        const items = Array.from(listElement.querySelectorAll('.reorder-item'));
                        const effectiveBlockIds = computeEffectiveBlockIds();
                        items.forEach((item, i) => {
                            const newBlockId = effectiveBlockIds[i] || '';
                            item.dataset.blockId = newBlockId;
                            item.dataset.blockName = newBlockId ? getBlockName(newBlockId) : '';
                        });
                    }
                    draggedElement = null;
                    updateAllBadges();
                }
            });

            // Apply initial visual grouping for blocks
            if (hasBlocks) updateVisualGrouping();

            console.log('✅ SortableJS initialized (flat list' + (hasBlocks ? ' with block inference' : '') + ')');

        }).catch(error => {
            console.error('❌ Failed to load SortableJS:', error);

            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            if (listElement) {
                listElement.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bx bx-error-circle me-2"></i>
                        Failed to load drag-and-drop library. You can still reorder by closing and trying again.
                    </div>
                `;
            }

            saveBtn.disabled = true;
        });

        // ── Save handler ──
        // Reads flat DOM order + applies position-based block inference for dragged item

        saveBtn.addEventListener('click', () => {
            if (!sortableLoaded) {
                window.showAlert?.('Please wait, loading drag-and-drop...', 'info');
                return;
            }

            const items = Array.from(listElement.querySelectorAll('.reorder-item'));
            const effectiveBlockIds = computeEffectiveBlockIds();
            const reorderedExercises = [];

            items.forEach((item, i) => {
                const origIdx = parseInt(item.dataset.index);
                if (isNaN(origIdx) || !exercises[origIdx]) return;

                const blockId = effectiveBlockIds[i] || null;
                const blockName = blockId ? getBlockName(blockId) : null;

                reorderedExercises.push({
                    ...exercises[origIdx],
                    blockId: blockId,
                    blockName: blockName
                });
            });

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            try {
                onSave(reorderedExercises);
                offcanvas.hide();
            } catch (error) {
                console.error('❌ Error saving exercise order:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-check me-1"></i>Save Order';
                alert('Failed to save exercise order. Please try again.');
            }
        });

        // Cleanup when offcanvas closes
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
            }
            draggedElement = null;
        }, { once: true });
    });
}

/* ============================================
   SECTIONS REORDER (Workout Builder - Mobile)
   Two-level SortableJS matching desktop drag-and-drop
   ============================================ */

/**
 * Create sections-aware reorder offcanvas with two-level drag-and-drop.
 * Mirrors the desktop builder's section drag behavior:
 * - Named sections: drag by header handle → moves the whole block
 * - Exercises: drag by exercise handle → reorder within/between sections
 * - Exercises dragged out of named sections → become standalone
 * - Exercises dragged into named sections → join that block
 * - Drop zones visible during drag (between sections, inside blocks, bottom standalone)
 *
 * @param {Array} sections - Array of { sectionId, sectionType, sectionName, sectionDescription, exercises: [{ groupId, name, sets, reps }] }
 * @param {Function} onSave - Callback(reorderedSections) when user saves
 * @returns {Object} Offcanvas instance
 */
export function createSectionsReorderOffcanvas(sections, onSave) {
    if (!Array.isArray(sections) || typeof onSave !== 'function') return null;

    const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);
    const canReorder = totalExercises >= 2 || sections.length >= 2;

    // Build a single exercise row
    const buildItemHtml = (exercise) => {
        const isNote = exercise.isNote === true;
        const isCardio = exercise.isCardio === true;
        const icon = isNote ? '<i class="bx bx-note me-1 text-muted"></i>' : (isCardio ? '<i class="bx bx-heart-circle me-1 text-muted"></i>' : '');
        const name = exercise.name || (isNote ? 'Note' : (isCardio ? 'Activity' : 'Exercise'));
        const borderStyle = isNote ? 'border-left: 3px solid var(--workout-muted, #6c757d);' : '';

        let subtitle = '';
        if (isNote) {
            subtitle = '';
        } else if (isCardio && (exercise.sets || exercise.reps)) {
            subtitle = `<small class="text-muted" style="font-size: 0.7rem;">${[exercise.sets, exercise.reps].filter(Boolean).join(' \u2022 ')}</small>`;
        } else if (!isNote && !isCardio && (exercise.sets || exercise.reps)) {
            subtitle = `<small class="text-muted" style="font-size: 0.7rem;">${exercise.sets ? `${exercise.sets} sets` : ''}${exercise.sets && exercise.reps ? ' \u00d7 ' : ''}${exercise.reps ? `${exercise.reps}` : ''}</small>`;
        }

        return `
        <div class="reorder-item" data-group-id="${escapeHtml(exercise.groupId)}">
            <div class="d-flex align-items-center gap-2 px-3 py-2 reorder-item-inner" style="${borderStyle}">
                <div class="reorder-handle text-muted" style="cursor: grab;">
                    <i class="bx bx-menu" style="font-size: 1.3rem;"></i>
                </div>
                <div class="flex-grow-1" style="min-width: 0;">
                    <div class="fw-medium text-truncate" style="font-size: 0.85rem;">${icon}${escapeHtml(name)}</div>
                    ${subtitle}
                </div>
            </div>
        </div>
    `;
    };

    // Build a section container
    const buildSectionHtml = (section) => {
        const isNamed = section.sectionType !== 'standard';
        const exercisesHtml = section.exercises.map(ex => buildItemHtml(ex)).join('');

        if (!isNamed) {
            return `
                <div class="reorder-section"
                     data-section-id="${escapeHtml(section.sectionId)}"
                     data-section-type="standard"
                     data-section-name=""
                     data-section-description="">
                    <div class="reorder-section-exercises">${exercisesHtml}</div>
                </div>
            `;
        }

        const emptyHtml = section.exercises.length === 0
            ? '<div class="reorder-section-empty">Drop exercises here</div>'
            : '';

        return `
            <div class="reorder-section section-named"
                 data-section-id="${escapeHtml(section.sectionId)}"
                 data-section-type="${escapeHtml(section.sectionType)}"
                 data-section-name="${escapeHtml(section.sectionName || '')}"
                 data-section-description="${escapeHtml(section.sectionDescription || '')}">
                <div class="reorder-section-header">
                    <div class="reorder-section-drag">
                        <i class="bx bx-grid-vertical"></i>
                    </div>
                    <span class="reorder-section-name">${escapeHtml(section.sectionName || 'Block')}</span>
                    <span class="reorder-section-badge">${escapeHtml(section.sectionType)}</span>
                </div>
                <div class="reorder-section-exercises">${exercisesHtml}${emptyHtml}</div>
            </div>
        `;
    };

    // Scoped styles
    const sectionStyles = `
        <style>
            /* --- Section containers --- */
            .reorder-section { margin-bottom: 6px; }

            /* Named section (block) */
            .reorder-section.section-named {
                border: 1px solid var(--bs-border-color, #e0e0e0);
                border-left: 3px solid var(--workout-block, #2dd4bf);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            /* Section header bar */
            .reorder-section-header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: rgba(45, 212, 191, 0.04);
                border-bottom: 1px solid rgba(45, 212, 191, 0.15);
                cursor: grab;
            }
            .reorder-section-drag {
                color: #999;
                font-size: 1.1rem;
                opacity: 0.5;
            }
            .reorder-section-name {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--workout-block, #2dd4bf);
            }
            .reorder-section-badge {
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--bs-secondary-color, #999);
                margin-left: auto;
            }

            /* Exercise items inside named sections */
            .reorder-section.section-named .reorder-item-inner {
                border-bottom: 1px solid var(--bs-border-color, #eee);
            }
            .reorder-section.section-named .reorder-item:last-child .reorder-item-inner {
                border-bottom: none;
            }

            /* Standalone exercise cards */
            .reorder-section:not(.section-named) .reorder-item-inner {
                border: 1px solid var(--bs-border-color, #e0e0e0);
                border-radius: 6px;
            }

            /* Empty block placeholder */
            .reorder-section-empty {
                padding: 16px;
                text-align: center;
                font-size: 0.75rem;
                color: var(--bs-secondary-color, #999);
                border: 2px dashed var(--bs-border-color, #ddd);
                border-radius: 4px;
                margin: 6px 8px 8px;
            }

            /* --- Drag ghost --- */
            .reorder-section.sortable-ghost { opacity: 0.3; }
            .reorder-section.sortable-ghost.section-named { border-style: dashed; }
            .reorder-item.sortable-ghost .reorder-item-inner { opacity: 0.3; border-style: dashed; }

            /* --- Drop lines between sections during section drag --- */
            #reorderSectionList.is-section-dragging .reorder-section {
                margin-bottom: 10px;
            }
            #reorderSectionList.is-section-dragging .reorder-section::after {
                content: '';
                display: block;
                height: 3px;
                background: var(--bs-primary, #696cff);
                border-radius: 2px;
                margin: 4px 8px 0;
                opacity: 0.3;
            }
            #reorderSectionList.is-section-dragging .reorder-section:last-child::after {
                display: none;
            }

            /* --- Drop indicators during exercise drag --- */

            /* Drop zone inside named blocks */
            #reorderSectionList.is-exercise-dragging .reorder-section.section-named .reorder-section-exercises {
                min-height: 40px;
            }
            #reorderSectionList.is-exercise-dragging .reorder-section.section-named .reorder-section-exercises::after {
                content: 'Drop here';
                display: block;
                padding: 10px;
                text-align: center;
                font-size: 0.7rem;
                color: var(--workout-block, #2dd4bf);
                border: 2px dashed var(--workout-block, #2dd4bf);
                border-radius: 4px;
                margin: 4px 8px 8px;
                opacity: 0.4;
                background: rgba(45, 212, 191, 0.03);
            }

            /* Drop lines between sections during exercise drag */
            #reorderSectionList.is-exercise-dragging .reorder-section {
                margin-bottom: 10px;
            }
            #reorderSectionList.is-exercise-dragging .reorder-section::after {
                content: '';
                display: block;
                height: 3px;
                background: var(--bs-primary, #696cff);
                border-radius: 2px;
                margin: 4px 8px 0;
                opacity: 0.25;
            }
            #reorderSectionList.is-exercise-dragging .reorder-section:last-child::after {
                display: none;
            }

            /* Bottom drop zone during exercise drag */
            #reorderSectionList.is-exercise-dragging::after {
                content: 'Drop here as standalone';
                display: block;
                padding: 14px;
                margin: 6px 0;
                border: 2px dashed var(--bs-primary, #696cff);
                border-radius: 6px;
                text-align: center;
                font-size: 0.7rem;
                color: var(--bs-primary, #696cff);
                opacity: 0.35;
                background: rgba(105, 108, 255, 0.03);
            }
            #reorderSectionList.is-exercise-dragging {
                padding-bottom: 16px;
            }

            /* --- Dark mode --- */
            [data-bs-theme="dark"] .reorder-section.section-named {
                border-color: rgba(255, 255, 255, 0.1);
                border-left-color: #5eead4;
            }
            [data-bs-theme="dark"] .reorder-section-header {
                background: rgba(45, 212, 191, 0.06);
                border-bottom-color: rgba(94, 234, 212, 0.15);
            }
            [data-bs-theme="dark"] .reorder-section-name { color: #5eead4; }
            [data-bs-theme="dark"] .reorder-section.section-named .reorder-item-inner {
                border-color: rgba(255, 255, 255, 0.08);
            }
            [data-bs-theme="dark"] .reorder-section:not(.section-named) .reorder-item-inner {
                border-color: rgba(255, 255, 255, 0.1);
            }
        </style>
    `;

    let bodyContent;
    if (!canReorder) {
        bodyContent = `<div class="text-center py-4">
            <i class="bx bx-list-ul" style="font-size: 4rem; color: var(--bs-secondary);"></i>
            <h6 class="mt-3">Not enough items to reorder</h6>
            <p class="text-muted mb-0">Add more exercises to reorder them.</p>
        </div>`;
    } else {
        bodyContent = `
            ${sectionStyles}
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Drag to reorder</strong>
                    <p class="mb-0 small">Drag exercises between blocks or to standalone. Drag block headers to move entire blocks.</p>
                </div>
            </div>
            <div id="reorderSectionList" class="mb-4">
                ${sections.map(s => buildSectionHtml(s)).join('')}
            </div>
            <div id="reorderLoadingIndicator" class="text-center mb-3" style="display: none;">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <small class="text-muted">Loading drag-and-drop...</small>
            </div>
        `;
    }

    const footerContent = canReorder ? `
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                <i class="bx bx-x me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary flex-fill" id="saveSectionReorderBtn" disabled>
                <i class="bx bx-check me-1"></i>Save Order
            </button>
        </div>
    ` : `
        <button type="button" class="btn btn-secondary w-100" data-bs-dismiss="offcanvas">
            <i class="bx bx-x me-1"></i>Close
        </button>
    `;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1" id="reorderSectionsOffcanvas"
             aria-labelledby="reorderSectionsOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="reorderSectionsOffcanvasLabel">
                    <i class="bx bx-sort me-2"></i>Reorder Exercises
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                ${bodyContent}
                ${footerContent}
            </div>
        </div>
    `;

    return createOffcanvas('reorderSectionsOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        if (!canReorder) return;

        const listElement = document.getElementById('reorderSectionList');
        const saveBtn = document.getElementById('saveSectionReorderBtn');
        const loadingIndicator = document.getElementById('reorderLoadingIndicator');

        if (!listElement || !saveBtn) return;

        if (loadingIndicator) loadingIndicator.style.display = 'block';

        let sortableInstances = [];

        // ── Helpers ──

        function updateAllBadges() {
            let counter = 1;
            listElement.querySelectorAll('.reorder-item').forEach(item => {
                const badge = item.querySelector('.reorder-badge');
                if (badge) badge.textContent = counter++;
            });
        }

        function cleanupEmptySection(sectionEl) {
            if (!sectionEl) return;
            const isNamed = sectionEl.classList.contains('section-named');
            const items = sectionEl.querySelectorAll('.reorder-item');
            if (items.length === 0) {
                if (isNamed) {
                    // Show empty placeholder for named sections
                    const exc = sectionEl.querySelector('.reorder-section-exercises');
                    if (exc && !exc.querySelector('.reorder-section-empty')) {
                        exc.innerHTML = '<div class="reorder-section-empty">Drop exercises here</div>';
                    }
                } else {
                    sectionEl.remove();
                }
            }
        }

        function wrapInStandardSection(exerciseItem) {
            const sectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const wrapper = document.createElement('div');
            wrapper.className = 'reorder-section';
            wrapper.dataset.sectionId = sectionId;
            wrapper.dataset.sectionType = 'standard';
            wrapper.dataset.sectionName = '';
            wrapper.dataset.sectionDescription = '';

            const exercisesDiv = document.createElement('div');
            exercisesDiv.className = 'reorder-section-exercises';
            wrapper.appendChild(exercisesDiv);

            listElement.replaceChild(wrapper, exerciseItem);
            exercisesDiv.appendChild(exerciseItem);

            // Init inner Sortable on the new standard section
            initInnerSortable(exercisesDiv, false);
        }

        function initInnerSortable(el, isNamed) {
            const inner = window.Sortable.create(el, {
                animation: 150,
                handle: '.reorder-handle',
                group: isNamed
                    ? 'reorder-exercises'
                    : { name: 'reorder-exercises', pull: true, put: false },
                ghostClass: 'sortable-ghost',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                onStart: () => {
                    listElement.classList.add('is-exercise-dragging');
                },
                onAdd: (evt) => {
                    // Remove empty placeholder if an exercise was dropped in
                    const placeholder = el.querySelector('.reorder-section-empty');
                    if (placeholder) placeholder.remove();

                    const fromSection = evt.from.closest('.reorder-section');
                    if (fromSection) cleanupEmptySection(fromSection);
                    updateAllBadges();
                },
                onEnd: () => {
                    listElement.classList.remove('is-exercise-dragging');
                    updateAllBadges();
                }
            });
            sortableInstances.push(inner);
            return inner;
        }

        // ── SortableJS init ──

        loadSortableJS().then(() => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            saveBtn.disabled = false;

            // Level 1: Section reorder (named sections via header grip)
            // Also accepts exercises dropped between sections → wrap in standard section
            const sectionSortable = window.Sortable.create(listElement, {
                animation: 150,
                handle: '.reorder-section-drag',
                draggable: '.reorder-section',
                ghostClass: 'sortable-ghost',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                group: { name: 'reorder-sections', put: ['reorder-exercises'] },
                onStart: () => {
                    listElement.classList.add('is-section-dragging');
                },
                onAdd: (evt) => {
                    // Exercise dropped between sections → wrap in new standard section
                    wrapInStandardSection(evt.item);
                    const fromSection = evt.from.closest('.reorder-section');
                    if (fromSection) cleanupEmptySection(fromSection);
                    updateAllBadges();
                },
                onEnd: () => {
                    listElement.classList.remove('is-section-dragging');
                    updateAllBadges();
                }
            });
            sortableInstances.push(sectionSortable);

            // Level 2: Inner Sortables on ALL sections for cross-section exercise drag
            // Named sections: full pull+put (accept drops)
            // Standard sections: pull-only (can drag OUT, nothing drops IN)
            listElement.querySelectorAll('.reorder-section .reorder-section-exercises').forEach(el => {
                const isNamed = el.closest('.reorder-section').classList.contains('section-named');
                initInnerSortable(el, isNamed);
            });

            updateAllBadges();
            console.log('✅ Sections reorder SortableJS initialized (two-level)');

        }).catch(error => {
            console.error('❌ Failed to load SortableJS:', error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            saveBtn.disabled = true;
        });

        // ── Save handler ──

        saveBtn.addEventListener('click', () => {
            const reorderedSections = [];
            listElement.querySelectorAll('.reorder-section').forEach(sectionEl => {
                const exerciseIds = [];
                sectionEl.querySelectorAll('.reorder-item').forEach(item => {
                    if (item.dataset.groupId) exerciseIds.push(item.dataset.groupId);
                });
                if (exerciseIds.length > 0) {
                    reorderedSections.push({
                        sectionId: sectionEl.dataset.sectionId,
                        sectionType: sectionEl.dataset.sectionType || 'standard',
                        sectionName: sectionEl.dataset.sectionName || null,
                        sectionDescription: sectionEl.dataset.sectionDescription || null,
                        exerciseIds
                    });
                }
            });

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            try {
                onSave(reorderedSections);
                offcanvas.hide();
            } catch (error) {
                console.error('❌ Error saving section order:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-check me-1"></i>Save Order';
            }
        });

        // Cleanup when offcanvas closes
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            sortableInstances.forEach(s => s.destroy());
            sortableInstances = [];
        }, { once: true });
    });
}

/* ============================================
   SORTABLEJS LAZY LOADER
   ============================================ */

/**
 * Lazy-load SortableJS library from CDN
 * Only loads once, subsequent calls return immediately
 * @returns {Promise<void>}
 */
async function loadSortableJS() {
    // Check if already loaded
    if (window.Sortable) {
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.1/Sortable.min.js';
        script.onload = () => {
            console.log('✅ SortableJS library loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load SortableJS library');
            reject(new Error('Failed to load SortableJS'));
        };
        document.head.appendChild(script);
    });
}

console.log('📦 Offcanvas reorder components loaded');
