/**
 * Desktop Card Renderer Module
 * Renders exercise groups as table rows with inline editing for desktop view
 * Works alongside (not replacing) the mobile CardRenderer
 * @version 1.0.0
 */

class DesktopCardRenderer {
    constructor() {
        this.activeEdit = null; // Currently active inline editor element
        this.autocompleteInstances = new Map(); // Track autocomplete instances
    }

    /**
     * Create exercise group row HTML (table-row style)
     * @param {string} groupId - Unique group ID
     * @param {object} groupData - Group data (optional)
     * @param {number} groupNumber - Group number (unused in desktop, kept for API compat)
     * @param {number} index - Current row index (0-based)
     * @param {number} totalRows - Total number of rows
     * @returns {string} HTML string
     */
    createExerciseGroupRow(groupId, groupData = null, groupNumber = 1, index = 0, totalRows = 1) {
        const data = groupData || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        // Store in shared data object
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

        return `
            <div class="desktop-exercise-row exercise-group-card" data-group-id="${groupId}" data-index="${index}">
                <div class="drag-handle" title="Drag to reorder">
                    <i class="bx bx-grid-vertical"></i>
                </div>
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
                </div>
                <div class="dropdown">
                    <button class="row-menu-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bx bx-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item" href="#" data-action="full-edit" data-group-id="${groupId}">
                                <i class="bx bx-edit me-2"></i>Full Edit
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" data-action="add-alternate" data-group-id="${groupId}">
                                <i class="bx bx-plus me-2"></i>Add Alternate
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" data-action="delete-group" data-group-id="${groupId}">
                                <i class="bx bx-trash me-2"></i>Delete
                            </a>
                        </li>
                    </ul>
                </div>
            </div>`;
    }

    /**
     * Update exercise group row preview after data changes
     * @param {string} groupId - Group ID
     * @param {object} groupData - Updated group data
     */
    updateExerciseGroupRowPreview(groupId, groupData) {
        const row = document.querySelector(`.desktop-exercise-row[data-group-id="${groupId}"]`);
        if (!row) return;

        // Update exercise name
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

        // Update alternates
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

        // Update simple fields
        const protocolDisplay = groupData.sets && groupData.reps
            ? `${groupData.sets}×${groupData.reps}` : (groupData.sets || groupData.reps || '');
        this.updateFieldDisplay(row, 'protocol', protocolDisplay);
        this.updateFieldDisplay(row, 'rest', groupData.rest);

        // Update weight
        const weightDisplay = groupData.default_weight
            ? `${groupData.default_weight}${groupData.default_weight_unit && groupData.default_weight_unit !== 'other' ? ' ' + groupData.default_weight_unit : ''}`
            : '';
        this.updateFieldDisplay(row, 'weight', weightDisplay);
    }

    /**
     * Update a single field's display value
     */
    updateFieldDisplay(row, field, value) {
        const editable = row.querySelector(`[data-field="${field}"]`);
        if (!editable) return;
        const displayValue = editable.querySelector('.display-value');
        if (!displayValue) return;
        displayValue.textContent = value || '-';
        displayValue.classList.toggle('empty-value', !value);
    }

    /**
     * Initialize inline editing for all editable fields within a container
     * @param {HTMLElement} container - The exercise groups container
     */
    initInlineEditing(container) {
        if (!container) return;

        // Click handler for inline editing
        container.addEventListener('click', (e) => {
            const editable = e.target.closest('.inline-editable');
            if (!editable || editable.classList.contains('editing')) return;

            // Don't start editing if clicking on autocomplete dropdown
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
                    if (window.openExerciseGroupEditor) {
                        window.openExerciseGroupEditor(groupId);
                    }
                    break;
                case 'add-alternate':
                    this.handleAddAlternate(groupId);
                    break;
                case 'delete-group':
                    if (window.deleteExerciseGroupCard) {
                        window.deleteExerciseGroupCard(groupId);
                    }
                    break;
            }
        });
    }

    /**
     * Start inline editing on a field
     * @param {HTMLElement} element - The .inline-editable element
     */
    startInlineEdit(element) {
        // Close any currently active edit
        if (this.activeEdit && this.activeEdit !== element) {
            this.finishInlineEdit(this.activeEdit, false);
        }

        const field = element.dataset.field;
        const groupId = element.dataset.groupId;
        const displayValue = element.querySelector('.display-value');
        if (!displayValue) return;

        const currentValue = this.getFieldValue(groupId, field);

        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';

        if (field === 'exercise-a') {
            input.placeholder = 'Search exercises...';
        } else {
            input.placeholder = this.getPlaceholder(field);
        }

        // Hide display, show input
        displayValue.style.display = 'none';
        element.classList.add('editing');
        element.appendChild(input);
        input.focus();
        input.select();

        this.activeEdit = element;

        // Save on blur (with delay for autocomplete clicks)
        const handleBlur = () => {
            // Delay to allow autocomplete selection clicks to register
            setTimeout(() => {
                if (element.classList.contains('editing')) {
                    this.finishInlineEdit(element, true);
                }
            }, 200);
        };
        input.addEventListener('blur', handleBlur);

        // Save on Enter, cancel on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishInlineEdit(element, true);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.finishInlineEdit(element, false);
            }
            // Tab to next editable field
            if (e.key === 'Tab') {
                e.preventDefault();
                this.finishInlineEdit(element, true);
                this.tabToNextField(element, e.shiftKey);
            }
        });

        // Initialize autocomplete for exercise name fields
        if (field === 'exercise-a' && window.ExerciseAutocomplete) {
            setTimeout(() => {
                try {
                    const autocomplete = new ExerciseAutocomplete(input, {
                        minChars: 1,
                        maxResults: 8,
                        allowAutoCreate: true,
                        onSelect: (exercise) => {
                            input.value = exercise.name;
                            this.finishInlineEdit(element, true);
                        }
                    });
                    this.autocompleteInstances.set(groupId, autocomplete);
                } catch (err) {
                    console.warn('Desktop: Could not init autocomplete', err);
                }
            }, 50);
        }
    }

    /**
     * Finish inline editing - save or cancel
     * @param {HTMLElement} element - The .inline-editable element
     * @param {boolean} save - Whether to save the value
     */
    finishInlineEdit(element, save) {
        if (!element.classList.contains('editing')) return;

        const input = element.querySelector('.inline-edit-input');
        const displayValue = element.querySelector('.display-value');
        const field = element.dataset.field;
        const groupId = element.dataset.groupId;

        if (input && save) {
            const newValue = input.value.trim();
            this.setFieldValue(groupId, field, newValue);

            // Update display
            if (field === 'exercise-a') {
                displayValue.textContent = newValue || 'Click to add exercise';
                displayValue.classList.toggle('empty-exercise', !newValue);
            } else if (field === 'weight') {
                const data = window.exerciseGroupsData[groupId];
                const weightDisplay = data.default_weight
                    ? `${data.default_weight}${data.default_weight_unit && data.default_weight_unit !== 'other' ? ' ' + data.default_weight_unit : ''}`
                    : '';
                displayValue.textContent = weightDisplay || '-';
                displayValue.classList.toggle('empty-value', !weightDisplay);
            } else {
                displayValue.textContent = newValue || '-';
                displayValue.classList.toggle('empty-value', !newValue);
            }

            if (window.markEditorDirty) window.markEditorDirty();
        }

        // Clean up
        if (input) input.remove();
        if (displayValue) displayValue.style.display = '';
        element.classList.remove('editing');

        // Clean up autocomplete instance
        if (field === 'exercise-a') {
            const autocomplete = this.autocompleteInstances.get(groupId);
            if (autocomplete && autocomplete.destroy) {
                autocomplete.destroy();
            }
            this.autocompleteInstances.delete(groupId);
        }

        if (this.activeEdit === element) {
            this.activeEdit = null;
        }
    }

    /**
     * Tab to next/previous editable field in the row
     */
    tabToNextField(currentElement, reverse) {
        const row = currentElement.closest('.desktop-exercise-row');
        if (!row) return;

        const editables = Array.from(row.querySelectorAll('.inline-editable'));
        const currentIndex = editables.indexOf(currentElement);
        const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex >= 0 && nextIndex < editables.length) {
            this.startInlineEdit(editables[nextIndex]);
        } else if (!reverse) {
            // Tab past last field in row → go to first field of next row
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.classList.contains('desktop-exercise-row')) {
                const firstEditable = nextRow.querySelector('.inline-editable');
                if (firstEditable) this.startInlineEdit(firstEditable);
            }
        }
    }

    /**
     * Get field value from data storage
     */
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
            default: return '';
        }
    }

    /**
     * Set field value in data storage
     */
    setFieldValue(groupId, field, value) {
        const data = window.exerciseGroupsData[groupId];
        if (!data) return;

        switch (field) {
            case 'exercise-a': data.exercises.a = value; break;
            case 'exercise-b': data.exercises.b = value; break;
            case 'exercise-c': data.exercises.c = value; break;
            case 'protocol': {
                // Parse protocol back into sets and reps
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
                // Auto-set unit if not set
                if (value && !data.default_weight_unit) {
                    data.default_weight_unit = 'lbs';
                }
                break;
        }
    }

    /**
     * Get placeholder text for a field
     */
    getPlaceholder(field) {
        switch (field) {
            case 'protocol': return '3×10';
            case 'rest': return '60s';
            case 'weight': return 'lbs';
            default: return '';
        }
    }

    /**
     * Handle adding an alternate exercise via offcanvas
     */
    handleAddAlternate(groupId) {
        // Open the full editor offcanvas which supports alternate exercises
        if (window.openExerciseGroupEditor) {
            window.openExerciseGroupEditor(groupId);
        }
    }

    /**
     * Apply visual grouping to consecutive desktop rows sharing the same block_id.
     */
    applyBlockGrouping() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        // Remove existing block headers and grouping classes
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

            // Insert header row before first row
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

    /**
     * Create note row HTML (flat table-row style matching exercise rows)
     * @param {Object} note - Note data with id, content, order_index
     * @returns {string} HTML string
     */
    createNoteRow(note) {
        const noteId = note.id || `template-note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const content = note.content || '';
        const hasContent = content.length > 0;

        const contentHtml = hasContent
            ? `<span class="template-note-text">${this.escapeHtml(content)}</span>`
            : `<span class="template-note-text text-muted">Click edit to add note content</span>`;

        return `
            <div class="desktop-exercise-row desktop-note-row exercise-group-card template-note-card" data-note-id="${this.escapeHtml(noteId)}" data-card-type="note">
                <div class="drag-handle" title="Drag to reorder">
                    <i class="bx bx-grid-vertical"></i>
                </div>
                <div class="note-content-col">
                    <i class="bx bx-comment note-row-icon"></i>
                    <span class="note-row-text text-muted small">${contentHtml}</span>
                </div>
                <div></div><div></div><div></div>
                <div class="note-edit-col">
                    <button type="button" class="row-menu-btn"
                            onclick="event.preventDefault(); event.stopPropagation(); window.handleEditTemplateNote?.('${this.escapeHtml(noteId)}');"
                            title="Edit note">
                        <i class="bx bx-pencil"></i>
                    </button>
                </div>
            </div>`;
    }

    /**
     * Update note row preview after editing
     * @param {string} noteId - Note ID
     * @param {string} content - New content
     */
    updateNoteRowPreview(noteId, content) {
        const row = document.querySelector(`.desktop-note-row[data-note-id="${noteId}"]`);
        if (!row) return;

        const noteTextSpan = row.querySelector('.template-note-text');
        if (noteTextSpan) {
            if (content.length > 0) {
                noteTextSpan.textContent = content;
                noteTextSpan.classList.remove('text-muted');
            } else {
                noteTextSpan.textContent = 'Click edit to add note content';
                noteTextSpan.classList.add('text-muted');
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof window.escapeHtml === 'function') {
            return window.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global instance
window.desktopCardRenderer = new DesktopCardRenderer();

console.log('📦 Desktop Card Renderer module loaded');
