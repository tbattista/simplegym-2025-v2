/**
 * Desktop Card Renderer Module
 * Renders activity rows (exercise, note, cardio) as table rows with inline editing
 * Works alongside (not replacing) the mobile CardRenderer
 * @version 2.0.0 — Unified Activity Card system
 */

class DesktopCardRenderer {
    constructor() {
        this.activeEdit = null;
        this.autocompleteInstances = new Map();
    }

    // =========================================
    // Row Shell (shared base for all card types)
    // =========================================

    /**
     * Create the shared row wrapper with drag handle (col 1) and dropdown menu (col 6).
     * Callers provide columns 2-5 content and type-specific menu items.
     * @param {Object} opts
     * @param {string} opts.groupId - Group ID (data-group-id)
     * @param {string} opts.cardType - 'exercise' | 'note' | 'cardio'
     * @param {string[]} opts.extraClasses - Additional CSS classes
     * @param {Object} opts.dataAttrs - Extra data-* attributes (key-value)
     * @param {string} opts.columnsHtml - HTML for columns 2-5
     * @param {string} opts.menuItemsHtml - Type-specific menu items (before Convert To)
     * @param {number} [opts.index] - Row index
     * @returns {string} HTML string
     */
    _createRowShell(opts) {
        const { groupId, cardType, extraClasses = [], dataAttrs = {}, columnsHtml, menuItemsHtml, index } = opts;

        const classes = ['desktop-exercise-row', 'desktop-activity-row', 'exercise-group-card', ...extraClasses].join(' ');
        const dataStr = Object.entries(dataAttrs).map(([k, v]) => `data-${k}="${this.escapeHtml(String(v))}"`).join(' ');
        const indexAttr = index !== undefined ? `data-index="${index}"` : '';

        // Build Convert To menu items (omit current type)
        const convertItems = [];
        if (cardType !== 'exercise') {
            convertItems.push(`<li><a class="dropdown-item" href="#" data-action="convert-to-exercise" data-group-id="${groupId}"><i class="bx bx-dumbbell me-2"></i>Convert to Exercise</a></li>`);
        }
        if (cardType !== 'note') {
            convertItems.push(`<li><a class="dropdown-item" href="#" data-action="convert-to-note" data-group-id="${groupId}"><i class="bx bx-comment me-2"></i>Convert to Note</a></li>`);
        }
        if (cardType !== 'cardio') {
            convertItems.push(`<li><a class="dropdown-item" href="#" data-action="convert-to-cardio" data-group-id="${groupId}"><i class="bx bx-heart-circle me-2"></i>Convert to Activity</a></li>`);
        }

        const deleteAction = 'delete-group'; // All types use unified delete

        return `
            <div class="${classes}" data-group-id="${groupId}" data-card-type="${cardType}" ${indexAttr} ${dataStr}>
                <div class="drag-handle" title="Drag to reorder">
                    <i class="bx bx-grid-vertical"></i>
                </div>
                ${columnsHtml}
                <button class="row-edit-btn" type="button" data-action="row-edit" data-group-id="${groupId}" title="Edit">
                    <i class="bx bx-pencil"></i>
                </button>
                <div class="dropdown">
                    <button class="row-menu-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bx bx-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        ${menuItemsHtml}
                        <li><hr class="dropdown-divider"></li>
                        ${convertItems.join('\n')}
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" data-action="${deleteAction}" data-group-id="${groupId}">
                                <i class="bx bx-trash me-2"></i>Delete
                            </a>
                        </li>
                    </ul>
                </div>
            </div>`;
    }

    // =========================================
    // Exercise Row
    // =========================================

    createExerciseGroupRow(groupId, groupData = null, groupNumber = 1, index = 0, totalRows = 1) {
        const data = groupData || {
            exercises: { a: '', b: '', c: '' },
            sets: '3', reps: '8-12', rest: '60s',
            default_weight: '', default_weight_unit: 'lbs'
        };

        window.exerciseGroupsData[groupId] = data;

        const primaryName = data.exercises.a || '';
        const alternates = [];
        if (data.exercises.b) alternates.push(data.exercises.b);
        if (data.exercises.c) alternates.push(data.exercises.c);

        const weightDisplay = data.default_weight
            ? `${data.default_weight}${data.default_weight_unit && data.default_weight_unit !== 'other' ? ' ' + data.default_weight_unit : ''}`
            : '';

        const nameHtml = primaryName
            ? `<span class="display-value">${this.escapeHtml(primaryName)}</span>`
            : `<span class="display-value empty-exercise">Click to add exercise</span>`;

        const alternatesHtml = alternates.length > 0
            ? `<div class="alternate-exercises">${alternates.map((alt, i) =>
                `<span>Alt${i > 0 ? (i + 1) : ''}: ${this.escapeHtml(alt)}</span>`
              ).join(' &middot; ')}</div>`
            : '';

        const protocolDisplay = data.sets && data.reps ? `${data.sets}×${data.reps}` : (data.sets || data.reps || '');

        const columnsHtml = `
            <div class="exercise-name-col">
                <div class="inline-editable exercise-name-editable" data-field="exercise-a" data-group-id="${groupId}">
                    ${nameHtml}
                </div>
                ${alternatesHtml}
            </div>
            <div class="inline-editable" data-field="protocol" data-group-id="${groupId}">
                <span class="display-value${!protocolDisplay ? ' empty-value' : ''}">${protocolDisplay || '-'}</span>
            </div>
            <div class="inline-editable" data-field="rest" data-group-id="${groupId}">
                <span class="display-value${!data.rest ? ' empty-value' : ''}">${data.rest || '-'}</span>
            </div>
            <div class="inline-editable" data-field="weight" data-group-id="${groupId}">
                <span class="display-value${!weightDisplay ? ' empty-value' : ''}">${weightDisplay || '-'}</span>
            </div>`;

        const menuItemsHtml = `
            <li>
                <a class="dropdown-item" href="#" data-action="full-edit" data-group-id="${groupId}">
                    <i class="bx bx-edit me-2"></i>Full Edit
                </a>
            </li>
            <li>
                <a class="dropdown-item" href="#" data-action="add-alternate" data-group-id="${groupId}">
                    <i class="bx bx-plus me-2"></i>Add Alternate
                </a>
            </li>`;

        return this._createRowShell({
            groupId, cardType: 'exercise', index,
            columnsHtml, menuItemsHtml
        });
    }

    updateExerciseGroupRowPreview(groupId, groupData) {
        const row = document.querySelector(`.desktop-exercise-row[data-group-id="${groupId}"]`);
        if (!row) return;

        const nameEditable = row.querySelector('[data-field="exercise-a"]');
        if (nameEditable) {
            const displayValue = nameEditable.querySelector('.display-value');
            if (displayValue) {
                if (groupData.exercises.a) {
                    displayValue.textContent = groupData.exercises.a;
                    displayValue.classList.remove('empty-exercise');
                } else {
                    displayValue.textContent = 'Click to add exercise';
                    displayValue.classList.add('empty-exercise');
                }
            }
        }

        const nameCol = row.querySelector('.exercise-name-col');
        const existingAlts = nameCol.querySelector('.alternate-exercises');
        const alternates = [];
        if (groupData.exercises.b) alternates.push(groupData.exercises.b);
        if (groupData.exercises.c) alternates.push(groupData.exercises.c);

        if (alternates.length > 0) {
            const altsHtml = alternates.map((alt, i) =>
                `<span>Alt${i > 0 ? (i + 1) : ''}: ${this.escapeHtml(alt)}</span>`
            ).join(' &middot; ');
            if (existingAlts) {
                existingAlts.innerHTML = altsHtml;
            } else {
                nameCol.insertAdjacentHTML('beforeend',
                    `<div class="alternate-exercises">${altsHtml}</div>`
                );
            }
        } else if (existingAlts) {
            existingAlts.remove();
        }

        const protocolDisplay = groupData.sets && groupData.reps
            ? `${groupData.sets}×${groupData.reps}` : (groupData.sets || groupData.reps || '');
        this.updateFieldDisplay(row, 'protocol', protocolDisplay);
        this.updateFieldDisplay(row, 'rest', groupData.rest);

        const weightDisplay = groupData.default_weight
            ? `${groupData.default_weight}${groupData.default_weight_unit && groupData.default_weight_unit !== 'other' ? ' ' + groupData.default_weight_unit : ''}`
            : '';
        this.updateFieldDisplay(row, 'weight', weightDisplay);
    }

    // =========================================
    // Note Row
    // =========================================

    createNoteRow(groupId, groupData) {
        const data = groupData || { group_type: 'note', note_content: '' };
        window.exerciseGroupsData[groupId] = data;

        const content = data.note_content || '';
        const hasContent = content.length > 0;

        const contentHtml = hasContent
            ? `<span class="template-note-text">${this.escapeHtml(content)}</span>`
            : `<span class="template-note-text text-muted">Click edit to add note content</span>`;

        const columnsHtml = `
            <div class="note-content-spanning">
                <i class="bx bx-comment note-row-icon"></i>
                <span class="note-row-text text-muted small">${contentHtml}</span>
            </div>`;

        const menuItemsHtml = `
            <li>
                <a class="dropdown-item" href="#" data-action="edit-note" data-group-id="${groupId}">
                    <i class="bx bx-pencil me-2"></i>Edit Note
                </a>
            </li>`;

        return this._createRowShell({
            groupId,
            cardType: 'note',
            extraClasses: ['desktop-note-row'],
            columnsHtml,
            menuItemsHtml
        });
    }

    updateNoteRowPreview(groupId, content) {
        const row = document.querySelector(`.desktop-note-row[data-group-id="${groupId}"]`);
        if (!row) return;

        const noteTextSpan = row.querySelector('.template-note-text');
        if (noteTextSpan) {
            if (content && content.length > 0) {
                noteTextSpan.textContent = content;
                noteTextSpan.classList.remove('text-muted');
            } else {
                noteTextSpan.textContent = 'Click edit to add note content';
                noteTextSpan.classList.add('text-muted');
            }
        }
    }

    // =========================================
    // Cardio Row
    // =========================================

    /**
     * Create cardio activity row HTML
     * @param {string} groupId - Unique group ID
     * @param {object} groupData - Group data with cardio_config
     * @returns {string} HTML string
     */
    createCardioRow(groupId, groupData = null) {
        const data = groupData || {
            exercises: { a: '' },
            sets: '', reps: '', rest: '',
            group_type: 'cardio',
            cardio_config: {
                activity_type: '', duration_minutes: null,
                distance: null, distance_unit: 'mi', target_pace: ''
            }
        };

        window.exerciseGroupsData[groupId] = data;

        const config = data.cardio_config || {};
        const activityType = config.activity_type || '';

        // Get icon from activity type registry
        let iconClass = 'bx-heart-circle';
        let activityName = activityType;
        if (activityType && window.ActivityTypeRegistry) {
            iconClass = window.ActivityTypeRegistry.getIcon(activityType);
            activityName = window.ActivityTypeRegistry.getName(activityType);
        }

        // Build dynamic data columns from user settings
        const ADC = window.ActivityDisplayConfig;
        const columns = ADC ? ADC.getColumns() : ['duration', 'distance', 'pace'];

        let dataColumnsHtml = '';
        columns.forEach(fieldId => {
            const def = ADC ? ADC.getFieldDef(fieldId) : null;
            const displayVal = def ? def.format(config) : '';
            const label = def ? def.label : fieldId;
            dataColumnsHtml += `
            <div class="inline-editable" data-field="${fieldId}" data-label="${this.escapeHtml(label)}" data-group-id="${groupId}">
                <span class="display-value${!displayVal ? ' empty-value' : ''}">${displayVal || '-'}</span>
            </div>`;
        });

        const columnsHtml = `
            <div class="exercise-name-col">
                <div class="inline-editable cardio-name-editable" data-field="activity-name" data-group-id="${groupId}">
                    <i class="bx ${iconClass} cardio-type-icon"></i>
                    ${activityName
                        ? `<span class="display-value">${this.escapeHtml(activityName)}</span>`
                        : `<span class="display-value empty-exercise">Click to set activity</span>`
                    }
                </div>
            </div>
            ${dataColumnsHtml}`;

        const menuItemsHtml = `
            <li>
                <a class="dropdown-item" href="#" data-action="full-edit-cardio" data-group-id="${groupId}">
                    <i class="bx bx-edit me-2"></i>Full Edit
                </a>
            </li>
            <li>
                <a class="dropdown-item" href="#" data-action="activity-display-settings" data-group-id="${groupId}">
                    <i class="bx bx-slider me-2"></i>Display Settings
                </a>
            </li>`;

        return this._createRowShell({
            groupId, cardType: 'cardio',
            extraClasses: ['desktop-cardio-row'],
            columnsHtml, menuItemsHtml
        });
    }

    /**
     * Update cardio row preview after data changes
     */
    updateCardioRowPreview(groupId, groupData) {
        const row = document.querySelector(`.desktop-cardio-row[data-group-id="${groupId}"]`);
        if (!row) return;

        const config = groupData.cardio_config || {};
        const activityType = config.activity_type || '';

        // Update activity name + icon
        const nameEditable = row.querySelector('[data-field="activity-name"]');
        if (nameEditable) {
            let iconClass = 'bx-heart-circle';
            let activityName = activityType;
            if (activityType && window.ActivityTypeRegistry) {
                iconClass = window.ActivityTypeRegistry.getIcon(activityType);
                activityName = window.ActivityTypeRegistry.getName(activityType);
            }
            const icon = nameEditable.querySelector('.cardio-type-icon');
            if (icon) {
                icon.className = `bx ${iconClass} cardio-type-icon`;
            }
            const displayValue = nameEditable.querySelector('.display-value');
            if (displayValue) {
                if (activityName) {
                    displayValue.textContent = activityName;
                    displayValue.classList.remove('empty-exercise');
                } else {
                    displayValue.textContent = 'Click to set activity';
                    displayValue.classList.add('empty-exercise');
                }
            }
        }

        // Update dynamic data columns using ActivityDisplayConfig
        const ADC = window.ActivityDisplayConfig;
        const columns = ADC ? ADC.getColumns() : ['duration', 'distance', 'pace'];
        columns.forEach(fieldId => {
            const def = ADC ? ADC.getFieldDef(fieldId) : null;
            const displayVal = def ? def.format(config) : '';
            this.updateFieldDisplay(row, fieldId, displayVal);
        });
    }

    /**
     * Re-render all cardio rows with current display settings.
     * Called after the user changes Activity Display Settings.
     */
    refreshAllCardioRows() {
        const rows = document.querySelectorAll('.desktop-cardio-row');
        rows.forEach(row => {
            const groupId = row.dataset.groupId;
            if (!groupId) return;
            const data = window.exerciseGroupsData?.[groupId];
            if (!data) return;

            // Re-create the row HTML and swap in place
            const newHtml = this.createCardioRow(groupId, data);
            row.insertAdjacentHTML('afterend', newHtml);
            row.remove();
        });
    }

    // =========================================
    // Type Conversion
    // =========================================

    /**
     * Convert a card from one type to another.
     * Re-renders the row in-place.
     * @param {string} groupId - The group/note ID
     * @param {string} fromType - Current type: 'exercise' | 'note' | 'cardio'
     * @param {string} toType - Target type
     */
    convertCardType(groupId, fromType, toType) {
        if (fromType === toType) return;

        const row = document.querySelector(`.desktop-activity-row[data-group-id="${groupId}"]`);
        if (!row) return;

        const data = window.exerciseGroupsData[groupId];
        if (!data) return;

        let newHtml = '';

        if (fromType === 'exercise' && toType === 'cardio') {
            if (data.exercises.a && !confirm('Converting to Activity will replace sets, reps, rest, and weight with activity fields. Continue?')) return;

            const name = data.exercises.a || '';
            let activityType = '';
            if (name && window.ActivityTypeRegistry) {
                const allTypes = window.ActivityTypeRegistry.getAll();
                const match = allTypes.find(t => t.name.toLowerCase() === name.toLowerCase() || t.id === name.toLowerCase());
                if (match) activityType = match.id;
            }

            data.group_type = 'cardio';
            data.exercises = { a: '' };
            data.sets = ''; data.reps = ''; data.rest = '';
            data.default_weight = ''; data.default_weight_unit = 'lbs';
            data.note_content = undefined;
            data.cardio_config = {
                activity_type: activityType || name,
                duration_minutes: null, distance: null,
                distance_unit: 'mi', target_pace: '',
                activity_details: {}, notes: ''
            };
            newHtml = this.createCardioRow(groupId, data);

        } else if (fromType === 'exercise' && toType === 'note') {
            if (data.exercises.a && !confirm('Converting to Note will remove all exercise data. Continue?')) return;

            data.group_type = 'note';
            data.note_content = data.exercises.a || '';
            data.exercises = { a: '' };
            data.sets = ''; data.reps = ''; data.rest = '';
            data.default_weight = ''; data.default_weight_unit = 'lbs';
            newHtml = this.createNoteRow(groupId, data);

        } else if (fromType === 'cardio' && toType === 'exercise') {
            const activityName = data.cardio_config?.activity_type || '';
            let exerciseName = activityName;
            if (activityName && window.ActivityTypeRegistry) {
                const type = window.ActivityTypeRegistry.getById(activityName);
                if (type && type.name !== activityName) exerciseName = type.name;
            }

            data.group_type = 'standard';
            data.exercises = { a: exerciseName, b: '', c: '' };
            data.sets = '3'; data.reps = '8-12'; data.rest = '60s';
            data.default_weight = ''; data.default_weight_unit = 'lbs';
            data.cardio_config = null;
            data.note_content = undefined;
            newHtml = this.createExerciseGroupRow(groupId, data);

        } else if (fromType === 'cardio' && toType === 'note') {
            if (!confirm('Converting to Note will remove all activity data. Continue?')) return;

            const activityName = data.cardio_config?.activity_type || '';
            let content = activityName;
            if (activityName && window.ActivityTypeRegistry) {
                content = window.ActivityTypeRegistry.getName(activityName) || activityName;
            }

            data.group_type = 'note';
            data.note_content = content;
            data.exercises = { a: '' };
            data.sets = ''; data.reps = ''; data.rest = '';
            data.cardio_config = null;
            newHtml = this.createNoteRow(groupId, data);

        } else if (fromType === 'note' && toType === 'exercise') {
            const content = data.note_content || '';

            data.group_type = 'standard';
            data.exercises = { a: content, b: '', c: '' };
            data.sets = '3'; data.reps = '8-12'; data.rest = '60s';
            data.default_weight = ''; data.default_weight_unit = 'lbs';
            data.note_content = undefined;
            newHtml = this.createExerciseGroupRow(groupId, data);

        } else if (fromType === 'note' && toType === 'cardio') {
            const content = data.note_content || '';

            let activityType = '';
            if (content && window.ActivityTypeRegistry) {
                const allTypes = window.ActivityTypeRegistry.getAll();
                const match = allTypes.find(t => t.name.toLowerCase() === content.toLowerCase());
                if (match) activityType = match.id;
            }

            data.group_type = 'cardio';
            data.exercises = { a: '' };
            data.sets = ''; data.reps = ''; data.rest = '';
            data.note_content = undefined;
            data.cardio_config = {
                activity_type: activityType || content,
                duration_minutes: null, distance: null,
                distance_unit: 'mi', target_pace: '',
                activity_details: {}, notes: ''
            };
            newHtml = this.createCardioRow(groupId, data);
        }

        if (newHtml) {
            row.insertAdjacentHTML('afterend', newHtml);
            row.remove();
            if (window.markEditorDirty) window.markEditorDirty();
            if (window.applyBlockGrouping) window.applyBlockGrouping();
        }
    }

    // =========================================
    // Shared Utilities
    // =========================================

    updateFieldDisplay(row, field, value) {
        const editable = row.querySelector(`[data-field="${field}"]`);
        if (!editable) return;
        const displayValue = editable.querySelector('.display-value');
        if (!displayValue) return;
        displayValue.textContent = value || '-';
        displayValue.classList.toggle('empty-value', !value);
    }

    // =========================================
    // Inline Editing
    // =========================================

    initInlineEditing(container) {
        if (!container) return;

        // Click handler for inline editing
        container.addEventListener('click', (e) => {
            const editable = e.target.closest('.inline-editable');
            if (!editable || editable.classList.contains('editing')) return;
            if (e.target.closest('.exercise-autocomplete-dropdown')) return;
            this.startInlineEdit(editable);
        });

        // Dropdown menu action handler (delegated)
        container.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;
            e.preventDefault();

            const action = actionEl.dataset.action;
            const groupId = actionEl.dataset.groupId;

            switch (action) {
                case 'full-edit':
                    if (window.openExerciseGroupEditor) window.openExerciseGroupEditor(groupId);
                    break;
                case 'full-edit-cardio':
                    if (window.openCardioEditor) {
                        window.openCardioEditor(groupId);
                    } else {
                        console.log('Cardio full-edit offcanvas not yet implemented');
                    }
                    break;
                case 'edit-note':
                    if (window.openNoteEditor) {
                        window.openNoteEditor(groupId);
                    } else if (window.handleEditTemplateNote) {
                        window.handleEditTemplateNote(groupId);
                    }
                    break;
                case 'add-alternate':
                    this.handleAddAlternate(groupId);
                    break;
                case 'delete-group':
                    if (window.deleteExerciseGroupCard) window.deleteExerciseGroupCard(groupId);
                    break;
                case 'activity-display-settings':
                    if (window.openActivityDisplaySettings) window.openActivityDisplaySettings();
                    break;
                case 'convert-to-exercise': {
                    const row = actionEl.closest('.desktop-activity-row');
                    const fromType = row?.dataset.cardType;
                    if (fromType) this.convertCardType(groupId, fromType, 'exercise');
                    break;
                }
                case 'convert-to-note': {
                    const row = actionEl.closest('.desktop-activity-row');
                    const fromType = row?.dataset.cardType;
                    if (fromType) this.convertCardType(groupId, fromType, 'note');
                    break;
                }
                case 'convert-to-cardio': {
                    const row = actionEl.closest('.desktop-activity-row');
                    const fromType = row?.dataset.cardType;
                    if (fromType) this.convertCardType(groupId, fromType, 'cardio');
                    break;
                }
            }
        });
    }

    startInlineEdit(element) {
        if (this.activeEdit && this.activeEdit !== element) {
            this.finishInlineEdit(this.activeEdit, false);
        }

        const field = element.dataset.field;
        const groupId = element.dataset.groupId;
        const displayValue = element.querySelector('.display-value');
        if (!displayValue) return;

        const currentValue = this.getFieldValue(groupId, field);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';

        if (field === 'exercise-a') {
            input.placeholder = 'Search exercises...';
        } else if (field === 'activity-name') {
            input.placeholder = 'Activity type...';
        } else {
            input.placeholder = this.getPlaceholder(field);
        }

        // Hide display elements, show input
        displayValue.style.display = 'none';
        const icon = element.querySelector('.cardio-type-icon');
        if (icon) icon.style.display = 'none';
        element.classList.add('editing');
        element.appendChild(input);
        input.focus();
        input.select();

        this.activeEdit = element;

        const handleBlur = () => {
            setTimeout(() => {
                if (element.classList.contains('editing')) {
                    this.finishInlineEdit(element, true);
                }
            }, 200);
        };
        input.addEventListener('blur', handleBlur);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.finishInlineEdit(element, true); }
            if (e.key === 'Escape') { e.preventDefault(); this.finishInlineEdit(element, false); }
            if (e.key === 'Tab') {
                e.preventDefault();
                this.finishInlineEdit(element, true);
                this.tabToNextField(element, e.shiftKey);
            }
        });

        // Autocomplete for exercise name
        if (field === 'exercise-a' && window.ExerciseAutocomplete) {
            setTimeout(() => {
                try {
                    const autocomplete = new ExerciseAutocomplete(input, {
                        minChars: 1, maxResults: 8, allowAutoCreate: true,
                        onSelect: (exercise) => {
                            input.value = exercise.name;
                            this.finishInlineEdit(element, true);
                        }
                    });
                    this.autocompleteInstances.set(groupId + '-' + field, autocomplete);
                } catch (err) {
                    console.warn('Desktop: Could not init autocomplete', err);
                }
            }, 50);
        }

        // Autocomplete for cardio activity name
        if (field === 'activity-name' && window.ActivityTypeRegistry) {
            setTimeout(() => {
                this._initActivityAutocomplete(input, element, groupId);
            }, 50);
        }
    }

    /**
     * Simple autocomplete dropdown for activity types
     */
    _initActivityAutocomplete(input, element, groupId) {
        const allTypes = window.ActivityTypeRegistry.getAll();

        const dropdown = document.createElement('div');
        dropdown.className = 'activity-autocomplete-dropdown';
        element.appendChild(dropdown);

        const showResults = () => {
            const query = input.value.toLowerCase().trim();
            const matches = query
                ? allTypes.filter(t => t.name.toLowerCase().includes(query) || t.id.includes(query)).slice(0, 8)
                : allTypes.slice(0, 8);

            dropdown.innerHTML = matches.map(t =>
                `<div class="activity-autocomplete-item" data-activity-id="${t.id}">
                    <i class="bx ${t.icon}"></i> ${t.name}
                </div>`
            ).join('');
            dropdown.style.display = matches.length ? 'block' : 'none';
        };

        input.addEventListener('input', showResults);
        input.addEventListener('focus', showResults);

        dropdown.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur
            const item = e.target.closest('.activity-autocomplete-item');
            if (item) {
                input.value = item.dataset.activityId;
                dropdown.style.display = 'none';
                this.finishInlineEdit(element, true);
            }
        });

        this.autocompleteInstances.set(groupId + '-activity-name', { destroy: () => dropdown.remove() });
        showResults();
    }

    finishInlineEdit(element, save) {
        if (!element.classList.contains('editing')) return;

        const input = element.querySelector('.inline-edit-input');
        const displayValue = element.querySelector('.display-value');
        const field = element.dataset.field;
        const groupId = element.dataset.groupId;

        if (input && save) {
            const newValue = input.value.trim();
            this.setFieldValue(groupId, field, newValue);

            if (field === 'exercise-a') {
                displayValue.textContent = newValue || 'Click to add exercise';
                displayValue.classList.toggle('empty-exercise', !newValue);
            } else if (field === 'activity-name') {
                // Resolve display name from registry
                let displayName = newValue;
                let iconClass = 'bx-heart-circle';
                if (newValue && window.ActivityTypeRegistry) {
                    const type = window.ActivityTypeRegistry.getById(newValue);
                    if (type) {
                        displayName = type.name;
                        iconClass = type.icon;
                    }
                }
                displayValue.textContent = displayName || 'Click to set activity';
                displayValue.classList.toggle('empty-exercise', !displayName);
                // Update icon
                const icon = element.querySelector('.cardio-type-icon');
                if (icon) icon.className = `bx ${iconClass} cardio-type-icon`;
            } else if (field === 'weight') {
                const data = window.exerciseGroupsData[groupId];
                const weightDisplay = data.default_weight
                    ? `${data.default_weight}${data.default_weight_unit && data.default_weight_unit !== 'other' ? ' ' + data.default_weight_unit : ''}`
                    : '';
                displayValue.textContent = weightDisplay || '-';
                displayValue.classList.toggle('empty-value', !weightDisplay);
            } else {
                // Use ActivityDisplayConfig formatter for cardio fields, plain fallback for others
                const ADC = window.ActivityDisplayConfig;
                const def = ADC ? ADC.getFieldDef(field) : null;
                if (def) {
                    const data = window.exerciseGroupsData[groupId];
                    const cfg = data?.cardio_config || {};
                    const formatted = def.format(cfg);
                    displayValue.textContent = formatted || '-';
                    displayValue.classList.toggle('empty-value', !formatted);
                } else {
                    displayValue.textContent = newValue || '-';
                    displayValue.classList.toggle('empty-value', !newValue);
                }
            }

            if (window.markEditorDirty) window.markEditorDirty();
        }

        // Clean up
        if (input) input.remove();
        if (displayValue) displayValue.style.display = '';
        const icon = element.querySelector('.cardio-type-icon');
        if (icon) icon.style.display = '';
        element.classList.remove('editing');

        // Remove autocomplete dropdown
        const acDropdown = element.querySelector('.activity-autocomplete-dropdown');
        if (acDropdown) acDropdown.remove();

        // Clean up autocomplete instance
        const acKey = groupId + '-' + field;
        const autocomplete = this.autocompleteInstances.get(acKey);
        if (autocomplete && autocomplete.destroy) autocomplete.destroy();
        this.autocompleteInstances.delete(acKey);
        // Legacy key cleanup
        if (field === 'exercise-a') {
            const legacyAc = this.autocompleteInstances.get(groupId);
            if (legacyAc && legacyAc.destroy) legacyAc.destroy();
            this.autocompleteInstances.delete(groupId);
        }

        if (this.activeEdit === element) this.activeEdit = null;
    }

    tabToNextField(currentElement, reverse) {
        const row = currentElement.closest('.desktop-exercise-row');
        if (!row) return;

        const editables = Array.from(row.querySelectorAll('.inline-editable'));
        const currentIndex = editables.indexOf(currentElement);
        const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex >= 0 && nextIndex < editables.length) {
            this.startInlineEdit(editables[nextIndex]);
        } else if (!reverse) {
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.classList.contains('desktop-exercise-row')) {
                const firstEditable = nextRow.querySelector('.inline-editable');
                if (firstEditable) this.startInlineEdit(firstEditable);
            }
        }
    }

    // =========================================
    // Field Value Get/Set
    // =========================================

    getFieldValue(groupId, field) {
        const data = window.exerciseGroupsData[groupId];
        if (!data) return '';

        switch (field) {
            case 'exercise-a': return data.exercises.a || '';
            case 'exercise-b': return data.exercises.b || '';
            case 'exercise-c': return data.exercises.c || '';
            case 'protocol': {
                const s = data.sets || '';
                const r = data.reps || '';
                if (s && r) return `${s}×${r}`;
                return s || r || '';
            }
            case 'rest': return data.rest || '';
            case 'weight': return data.default_weight || '';
            // Cardio fields
            case 'activity-name': return data.cardio_config?.activity_type || '';
            case 'duration': return data.cardio_config?.duration_minutes ? String(data.cardio_config.duration_minutes) : '';
            case 'distance': return data.cardio_config?.distance ? String(data.cardio_config.distance) : '';
            case 'pace': return data.cardio_config?.target_pace || '';
            case 'rpe': return data.cardio_config?.target_rpe ? String(data.cardio_config.target_rpe) : '';
            case 'heart_rate': return data.cardio_config?.target_heart_rate ? String(data.cardio_config.target_heart_rate) : '';
            case 'calories': return data.cardio_config?.target_calories ? String(data.cardio_config.target_calories) : '';
            case 'elevation': return data.cardio_config?.elevation_gain ? String(data.cardio_config.elevation_gain) : '';
            case 'cadence': return data.cardio_config?.activity_details?.cadence ? String(data.cardio_config.activity_details.cadence) : '';
            case 'stroke_rate': return data.cardio_config?.activity_details?.stroke_rate ? String(data.cardio_config.activity_details.stroke_rate) : '';
            case 'laps': return data.cardio_config?.activity_details?.laps ? String(data.cardio_config.activity_details.laps) : '';
            case 'incline': return data.cardio_config?.activity_details?.incline ? String(data.cardio_config.activity_details.incline) : '';
            case 'notes': return data.cardio_config?.notes || '';
            default: return '';
        }
    }

    setFieldValue(groupId, field, value) {
        const data = window.exerciseGroupsData[groupId];
        if (!data) return;

        switch (field) {
            case 'exercise-a': data.exercises.a = value; break;
            case 'exercise-b': data.exercises.b = value; break;
            case 'exercise-c': data.exercises.c = value; break;
            case 'protocol': {
                const xPattern = /(\d+)\s*[x×]\s*(.+)/i;
                const setsPattern = /(\d+)\s*set/i;
                const xMatch = value.match(xPattern);
                if (xMatch) {
                    data.sets = xMatch[1];
                    data.reps = xMatch[2];
                } else {
                    const setsMatch = value.match(setsPattern);
                    if (setsMatch) {
                        data.sets = setsMatch[1];
                        data.reps = 'varies';
                    } else {
                        data.sets = '1';
                        data.reps = value;
                    }
                }
                break;
            }
            case 'rest': data.rest = value; break;
            case 'weight':
                data.default_weight = value;
                if (value && !data.default_weight_unit) data.default_weight_unit = 'lbs';
                break;
            // Cardio fields
            case 'activity-name':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.activity_type = value;
                break;
            case 'duration':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.duration_minutes = value ? parseInt(value, 10) || null : null;
                break;
            case 'distance':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.distance = value ? parseFloat(value) || null : null;
                break;
            case 'pace':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.target_pace = value;
                break;
            case 'rpe':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.target_rpe = value ? parseInt(value, 10) || null : null;
                break;
            case 'heart_rate':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.target_heart_rate = value ? parseInt(value, 10) || null : null;
                break;
            case 'calories':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.target_calories = value ? parseInt(value, 10) || null : null;
                break;
            case 'elevation':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.elevation_gain = value ? parseFloat(value) || null : null;
                break;
            case 'cadence':
                if (!data.cardio_config) data.cardio_config = {};
                if (!data.cardio_config.activity_details) data.cardio_config.activity_details = {};
                data.cardio_config.activity_details.cadence = value ? parseInt(value, 10) || null : null;
                break;
            case 'stroke_rate':
                if (!data.cardio_config) data.cardio_config = {};
                if (!data.cardio_config.activity_details) data.cardio_config.activity_details = {};
                data.cardio_config.activity_details.stroke_rate = value ? parseInt(value, 10) || null : null;
                break;
            case 'laps':
                if (!data.cardio_config) data.cardio_config = {};
                if (!data.cardio_config.activity_details) data.cardio_config.activity_details = {};
                data.cardio_config.activity_details.laps = value ? parseInt(value, 10) || null : null;
                break;
            case 'incline':
                if (!data.cardio_config) data.cardio_config = {};
                if (!data.cardio_config.activity_details) data.cardio_config.activity_details = {};
                data.cardio_config.activity_details.incline = value ? parseFloat(value) || null : null;
                break;
            case 'notes':
                if (!data.cardio_config) data.cardio_config = {};
                data.cardio_config.notes = value;
                break;
        }
    }

    getPlaceholder(field) {
        // Check ActivityDisplayConfig first (covers all cardio fields)
        const def = window.ActivityDisplayConfig?.getFieldDef(field);
        if (def) return def.placeholder;

        switch (field) {
            case 'protocol': return '3×10';
            case 'rest': return '60s';
            case 'weight': return 'lbs';
            default: return '';
        }
    }

    handleAddAlternate(groupId) {
        if (window.openExerciseGroupEditor) window.openExerciseGroupEditor(groupId);
    }

    // =========================================
    // Block Grouping (unchanged)
    // =========================================

    applyBlockGrouping() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        container.querySelectorAll('.block-group-header').forEach(h => h.remove());
        container.querySelectorAll('.exercise-in-block').forEach(r => {
            r.classList.remove('exercise-in-block', 'block-first', 'block-middle', 'block-last');
            r.removeAttribute('data-block-id');
        });

        const rows = Array.from(container.querySelectorAll('.desktop-exercise-row'));
        let i = 0;

        while (i < rows.length) {
            const groupId = rows[i].dataset.groupId;
            const data = window.exerciseGroupsData?.[groupId];
            const blockId = data?.block_id;

            if (!blockId) { i++; continue; }

            let j = i;
            while (j < rows.length) {
                const jGroupId = rows[j].dataset.groupId;
                const jData = window.exerciseGroupsData?.[jGroupId];
                if (jData?.block_id !== blockId) break;
                j++;
            }

            const groupRows = rows.slice(i, j);
            const blockName = data.group_name || 'Block';

            const headerHtml = `<div class="block-group-header" data-block-id="${blockId}">
                <span class="block-group-label">
                    <i class="bx bx-collection"></i>
                    ${this.escapeHtml(blockName)}
                </span>
                <div class="block-group-actions">
                    <button class="block-group-btn" onclick="window.ExerciseGroupManager?.addToBlock?.('${blockId}')" title="Add exercise to block">
                        <i class="bx bx-plus"></i> Add
                    </button>
                </div>
            </div>`;
            groupRows[0].insertAdjacentHTML('beforebegin', headerHtml);

            groupRows.forEach((row, idx) => {
                row.classList.add('exercise-in-block');
                row.setAttribute('data-block-id', blockId);
                if (groupRows.length === 1) {
                    row.classList.add('block-first', 'block-last');
                } else if (idx === 0) {
                    row.classList.add('block-first');
                } else if (idx === groupRows.length - 1) {
                    row.classList.add('block-last');
                } else {
                    row.classList.add('block-middle');
                }
            });

            i = j;
        }
    }

    escapeHtml(text) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global instance
window.desktopCardRenderer = new DesktopCardRenderer();

console.log('📦 Desktop Card Renderer module loaded (v2.0 — Activity Card system)');
