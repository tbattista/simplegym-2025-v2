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

        // Note type → render a simple note card
        if (data.group_type === 'note') {
            return this._createNoteCard(groupId, data, index, totalCards);
        }

        // Cardio type → render an activity card
        if (data.group_type === 'cardio') {
            return this._createCardioCard(groupId, data, index, totalCards);
        }

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
     * Create a mobile note card (used when desktop adapter is not active)
     */
    _createNoteCard(groupId, data, index, totalCards) {
        const content = data.note_content || '';
        const preview = content
            ? this.escapeHtml(content.length > 80 ? content.substring(0, 80) + '...' : content)
            : '<span class="text-muted">Tap edit to add note content</span>';

        const isFirst = index === 0;
        const isLast = index >= totalCards - 1;
        const moveUpDisabled = isFirst ? 'disabled' : '';
        const moveDownDisabled = isLast ? 'disabled' : '';

        return `
            <div class="exercise-group-card compact" data-group-id="${groupId}" data-card-type="note" data-index="${index}">
                <div class="card">
                    <div class="card-body">
                        <div class="exercise-content">
                            <div class="exercise-list">
                                <div class="exercise-line">
                                    <i class="bx bx-comment text-muted me-1"></i>${preview}
                                </div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-sm btn-edit-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); if(window.openNoteEditor) window.openNoteEditor('${groupId}'); else if(window.handleEditTemplateNote) window.handleEditTemplateNote('${groupId}');"
                                    title="Edit note">
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
                                </button>
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
     * Create a mobile cardio/activity card
     */
    _createCardioCard(groupId, data, index, totalCards) {
        const config = data.cardio_config || {};
        const activityType = config.activity_type || '';

        // Get icon and display name from activity type registry
        let iconClass = 'bx-heart-circle';
        let activityName = activityType;
        if (activityType && window.ActivityTypeRegistry) {
            iconClass = window.ActivityTypeRegistry.getIcon(activityType);
            activityName = window.ActivityTypeRegistry.getName(activityType);
        }

        // Build meta parts from user-selected display columns
        const ADC = window.ActivityDisplayConfig;
        const displayColumns = ADC ? ADC.getColumns() : ['duration', 'distance', 'pace'];
        const metaParts = [];
        displayColumns.forEach(fieldId => {
            const def = ADC ? ADC.getFieldDef(fieldId) : null;
            if (def) {
                const val = def.format(config);
                if (val) metaParts.push(val);
            }
        });
        const metaText = metaParts.join(' • ');

        const preview = activityName
            ? this.escapeHtml(activityName)
            : '<span class="text-muted">Tap edit to set activity</span>';

        const isFirst = index === 0;
        const isLast = index >= totalCards - 1;
        const moveUpDisabled = isFirst ? 'disabled' : '';
        const moveDownDisabled = isLast ? 'disabled' : '';

        return `
            <div class="exercise-group-card compact" data-group-id="${groupId}" data-card-type="cardio" data-index="${index}">
                <div class="card">
                    <div class="card-body">
                        <div class="exercise-content">
                            <div class="exercise-list">
                                <div class="exercise-line">
                                    <i class="bx ${iconClass} text-muted me-1"></i>${preview}
                                </div>
                            </div>
                            ${metaText ? `<div class="exercise-meta-text text-muted small">${metaText}</div>` : ''}
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-sm btn-edit-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); if(window.openCardioEditor) window.openCardioEditor('${groupId}');"
                                    title="Edit activity">
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
                                <button class="builder-menu-item"
                                        onclick="window.builderCardMenu?.closeAllMenus(); window.openActivityDisplaySettings?.();">
                                    <i class="bx bx-slider"></i>
                                    Display Settings
                                </button>
                                <div class="builder-menu-divider"></div>
                                <button class="builder-menu-item danger"
                                        onclick="window.builderCardMenu?.handleDelete('${groupId}');">
                                    <i class="bx bx-trash"></i>
                                    Delete
                                </button>
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
        let exerciseName = groupData?.exercises?.a || 'this exercise';
        if (groupData?.group_type === 'note') {
            const preview = groupData.note_content ? groupData.note_content.substring(0, 30) : '';
            exerciseName = preview ? `note: ${preview}` : 'this note';
        } else if (groupData?.group_type === 'cardio') {
            exerciseName = groupData.cardio_config?.activity_type || 'this activity';
        }

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

// Provide a default openCardioEditor for mobile (desktop-view-adapter overrides this on desktop)
if (!window.openCardioEditor) {
    window.openCardioEditor = function(groupId) {
        const groupData = window.exerciseGroupsData[groupId];
        if (!groupData) return;

        if (window.UnifiedOffcanvasFactory?.createCardioEditor) {
            window.UnifiedOffcanvasFactory.createCardioEditor({
                groupId: groupId,
                cardioConfig: groupData.cardio_config || {},
                onSave: function(updatedConfig) {
                    groupData.cardio_config = updatedConfig;
                    // Sync activity_type to exercises.a for form-data-collector
                    if (updatedConfig.activity_type) {
                        groupData.exercises = groupData.exercises || {};
                        groupData.exercises.a = updatedConfig.activity_type;
                    }
                    // Update mobile card preview
                    const card = document.querySelector(`.exercise-group-card[data-group-id="${groupId}"]`);
                    if (card) {
                        const config = updatedConfig;
                        // Update activity name
                        const lineEl = card.querySelector('.exercise-line');
                        if (lineEl) {
                            let iconClass = 'bx-heart-circle';
                            let name = config.activity_type || '';
                            if (name && window.ActivityTypeRegistry) {
                                iconClass = window.ActivityTypeRegistry.getIcon(name);
                                name = window.ActivityTypeRegistry.getName(name);
                            }
                            lineEl.innerHTML = name
                                ? `<i class="bx ${iconClass} text-muted me-1"></i>${window.escapeHtml ? window.escapeHtml(name) : name}`
                                : '<i class="bx bx-heart-circle text-muted me-1"></i><span class="text-muted">Tap edit to set activity</span>';
                        }
                        // Update meta text
                        const metaParts = [];
                        if (config.duration_minutes) metaParts.push(`${config.duration_minutes} min`);
                        if (config.distance) metaParts.push(`${config.distance} ${config.distance_unit || 'mi'}`);
                        if (config.target_pace) metaParts.push(config.target_pace);
                        if (config.target_rpe) metaParts.push(`RPE ${config.target_rpe}`);
                        if (config.target_heart_rate) metaParts.push(`${config.target_heart_rate} bpm`);
                        if (config.target_calories) metaParts.push(`${config.target_calories} cal`);
                        let metaEl = card.querySelector('.exercise-meta-text');
                        if (metaParts.length > 0) {
                            if (!metaEl) {
                                const contentEl = card.querySelector('.exercise-content');
                                if (contentEl) {
                                    metaEl = document.createElement('div');
                                    metaEl.className = 'exercise-meta-text text-muted small';
                                    contentEl.appendChild(metaEl);
                                }
                            }
                            if (metaEl) metaEl.textContent = metaParts.join(' • ');
                        } else if (metaEl) {
                            metaEl.textContent = '';
                        }
                    }
                    if (window.markEditorDirty) window.markEditorDirty();
                },
                onDelete: function() {
                    if (window.deleteExerciseGroupCard) {
                        window.deleteExerciseGroupCard(groupId);
                    }
                }
            });
        }
    };
}

console.log('📦 Card Renderer module loaded');