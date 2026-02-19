/**
 * Section Manager Module
 * Manages workout sections (containers for exercises).
 * Replaces the flat exercise_groups + block_id model with typed section containers.
 *
 * Section types: standard, superset, circuit, tabata, emom, amrap
 * - Standard sections (1 exercise) render with no header (looks like a standalone card)
 * - Named sections (superset, circuit, etc.) render with a visible header
 *
 * SortableJS strategy (two levels):
 * - Parent Sortable on #exerciseGroups: section reorder via .section-drag-handle (named section headers only)
 * - Inner Sortable on ALL .section-exercises: exercise drag via .drag-handle
 *   - Named sections: group 'exercises' (pull+put) — accept drops from any section
 *   - Standard sections: group { pull: true, put: false } — can drag OUT to named sections only
 * - Standalone exercise reorder: use the Reorder offcanvas (no drag reorder for standard sections)
 */

const SectionManager = {

    // ─── Rendering ───────────────────────────────────────────────

    /**
     * Render sections from workout data into the container.
     * Replaces the old flat-card + applyBlockGrouping() approach.
     */
    renderSections(sections, container) {
        container.innerHTML = '';
        window.exerciseGroupsData = {};

        sections.forEach(section => {
            const sectionEl = this.createSectionElement(section);
            container.appendChild(sectionEl);
        });

        this.initSortable(container);
    },

    /**
     * Create a complete section wrapper element with header (if named) and exercise cards.
     */
    createSectionElement(section) {
        const sectionEl = document.createElement('div');
        const isNamed = section.type !== 'standard';
        sectionEl.className = `workout-section${isNamed ? ` section-${section.type}` : ''}`;
        sectionEl.dataset.sectionId = section.section_id;
        sectionEl.dataset.sectionType = section.type;
        if (section.description) {
            sectionEl.dataset.sectionDescription = section.description;
        }

        // Exercise container
        const exercisesEl = document.createElement('div');
        exercisesEl.className = 'section-exercises p-2';

        if (section.exercises.length === 0 && isNamed) {
            exercisesEl.innerHTML = this._placeholderHtml();
        } else {
            const totalExercises = section.exercises.length;
            section.exercises.forEach((exercise, exIndex) => {
                const groupData = this._exerciseToGroupData(exercise);

                const cardHtml = window.createExerciseGroupCard(
                    exercise.exercise_id, groupData, exIndex + 1, exIndex, totalExercises
                );
                exercisesEl.insertAdjacentHTML('beforeend', cardHtml);

                window.exerciseGroupsData[exercise.exercise_id] = groupData;
            });
        }

        if (isNamed) {
            // Wrap in card container for named sections
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'card section-block-card mb-0';

            // Header + description area
            cardWrapper.insertAdjacentHTML('beforeend', this._createSectionHeaderHtml(section));

            // Card body = exercise container
            exercisesEl.classList.add('card-body');
            cardWrapper.appendChild(exercisesEl);

            sectionEl.appendChild(cardWrapper);
        } else {
            sectionEl.appendChild(exercisesEl);
        }

        return sectionEl;
    },

    /**
     * Convert a SectionExercise object to the groupData format used by card renderers.
     */
    _exerciseToGroupData(exercise) {
        const groupData = {
            exercises: { a: exercise.name || '' },
            sets: exercise.sets || '3',
            reps: exercise.reps || '10',
            rest: exercise.rest || '60s',
            default_weight: exercise.default_weight || null,
            default_weight_unit: exercise.default_weight_unit || 'lbs'
        };

        // Add alternates as b, c, d, ...
        (exercise.alternates || []).forEach((alt, i) => {
            const key = String.fromCharCode(98 + i); // b=98, c=99, ...
            groupData.exercises[key] = alt;
        });

        return groupData;
    },

    /**
     * Placeholder HTML for empty named sections.
     */
    _placeholderHtml() {
        return `<div class="section-placeholder text-center py-4">
            <i class="bx bx-plus-circle text-muted" style="font-size: 1.5rem;"></i>
            <div class="text-muted mt-1" style="font-size: 0.8rem;">
                Drop exercises here or tap + Add
            </div>
        </div>`;
    },

    /**
     * Create HTML for a section header.
     */
    _createSectionHeaderHtml(section) {
        const displayName = section.name || 'Block';
        const description = section.description || '';
        const hasDescription = !!description;

        return `
            <div class="card-header section-block-header">
                <div class="section-header-left">
                    <span class="section-drag-handle"><i class="bx bx-grid-vertical"></i></span>
                    <input type="text" class="section-name-input" value="${displayName}"
                           placeholder="Block name..." maxlength="50">
                </div>
                <div class="section-actions">
                    <button type="button" class="btn-toggle-description" title="Notes">
                        <i class="bx bx-note"></i>
                    </button>
                    <button type="button" class="btn-add-to-section" data-section-id="${section.section_id}">+ Add</button>
                    <button type="button" class="btn-section-menu" data-section-id="${section.section_id}">
                        <i class="bx bx-dots-vertical-rounded"></i>
                    </button>
                </div>
            </div>
            <div class="section-description-area" style="display: ${hasDescription ? 'block' : 'none'};">
                <textarea class="section-description-input" placeholder="Add notes..."
                          maxlength="500">${description}</textarea>
            </div>`;
    },

    // ─── Section CRUD ────────────────────────────────────────────

    /**
     * Add a new standard section with one empty exercise.
     * Equivalent to the old ExerciseGroupManager.add().
     */
    addStandardSection() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const sectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const exerciseId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const section = {
            section_id: sectionId,
            type: 'standard',
            name: null,
            exercises: [{
                exercise_id: exerciseId,
                name: '',
                alternates: [],
                sets: '3',
                reps: '8-12',
                rest: '60s',
                default_weight: null,
                default_weight_unit: 'lbs'
            }]
        };

        const sectionEl = this.createSectionElement(section);
        container.appendChild(sectionEl);

        // Init inner Sortable so this exercise can be dragged to named sections
        this._initExerciseSortable(sectionEl.querySelector('.section-exercises'), false);

        // Auto-open editor for the new exercise
        setTimeout(() => {
            if (window.openExerciseGroupEditor) {
                window.openExerciseGroupEditor(exerciseId);
            }
        }, 100);

        if (window.markEditorDirty) window.markEditorDirty();
        return { sectionId, exerciseId };
    },

    /**
     * Add a new empty named section.
     * User adds exercises via the "+ Add" button on the section header.
     * @param {string} type - Section type: 'superset', 'circuit', 'tabata', 'emom', 'amrap'
     */
    addNamedSection(type = 'superset') {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const sectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const section = {
            section_id: sectionId,
            type: type,
            name: null,
            description: null,
            exercises: []
        };

        const sectionEl = this.createSectionElement(section);
        container.appendChild(sectionEl);

        // Initialize inner Sortable for the new named section
        this._initExerciseSortable(sectionEl.querySelector('.section-exercises'));

        if (window.markEditorDirty) window.markEditorDirty();

        // Scroll into view
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        return { sectionId };
    },

    /** Alias for backward compat with ExerciseGroupManager.addBlock() routing */
    addSupersetSection() {
        return this.addNamedSection('superset');
    },

    /**
     * Add an exercise to an existing section.
     * Replaces old ExerciseGroupManager.addToBlock(blockId).
     */
    addExerciseToSection(sectionId) {
        const sectionEl = document.querySelector(`.workout-section[data-section-id="${sectionId}"]`);
        if (!sectionEl) return;

        const exercisesContainer = sectionEl.querySelector('.section-exercises');

        // Remove placeholder if present
        const placeholder = exercisesContainer.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();

        const exerciseId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const groupData = {
            exercises: { a: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: null,
            default_weight_unit: 'lbs'
        };

        const existingCards = exercisesContainer.querySelectorAll('.exercise-group-card');
        const totalCards = existingCards.length + 1;
        const cardHtml = window.createExerciseGroupCard(
            exerciseId, groupData, totalCards, totalCards - 1, totalCards
        );
        exercisesContainer.insertAdjacentHTML('beforeend', cardHtml);

        window.exerciseGroupsData[exerciseId] = groupData;

        // Auto-open editor
        setTimeout(() => {
            if (window.openExerciseGroupEditor) {
                window.openExerciseGroupEditor(exerciseId);
            }
        }, 100);

        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Remove an exercise from a named section, making it a standalone standard section.
     * Replaces old ExerciseGroupManager.removeFromBlock(groupId).
     */
    removeExerciseFromSection(exerciseId) {
        const cardEl = document.querySelector(`.exercise-group-card[data-group-id="${exerciseId}"]`);
        if (!cardEl) return;

        const sectionEl = cardEl.closest('.workout-section');
        const sectionType = sectionEl?.dataset.sectionType;

        // Only meaningful for named sections (superset, circuit, etc.)
        if (!sectionType || sectionType === 'standard') return;

        const container = document.getElementById('exerciseGroups');
        const newSectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Create a new standard section
        const newSection = document.createElement('div');
        newSection.className = 'workout-section';
        newSection.dataset.sectionId = newSectionId;
        newSection.dataset.sectionType = 'standard';

        const exercisesEl = document.createElement('div');
        exercisesEl.className = 'section-exercises';
        exercisesEl.appendChild(cardEl); // Move card to new section
        newSection.appendChild(exercisesEl);

        // Insert after the current section
        sectionEl.after(newSection);

        // Init inner Sortable so this exercise can be dragged to named sections
        this._initExerciseSortable(exercisesEl, false);

        // Clean up source section
        this._cleanupSection(sectionEl);

        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Rename a section.
     * Replaces old ExerciseGroupManager.renameBlock(blockId).
     */
    renameSection(sectionId) {
        const sectionEl = document.querySelector(`.workout-section[data-section-id="${sectionId}"]`);
        if (!sectionEl) return;

        const nameInput = sectionEl.querySelector('.section-name-input');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    },

    /**
     * Delete an entire section and all its exercises.
     */
    deleteSection(sectionId) {
        const sectionEl = document.querySelector(`.workout-section[data-section-id="${sectionId}"]`);
        if (!sectionEl) return;

        const exerciseCount = sectionEl.querySelectorAll('.exercise-group-card').length;
        if (exerciseCount > 0 && !confirm(`Delete this section and its ${exerciseCount} exercise(s)?`)) {
            return;
        }

        // Remove exercise data from global store
        sectionEl.querySelectorAll('.exercise-group-card').forEach(card => {
            const groupId = card.dataset.groupId;
            if (groupId) delete window.exerciseGroupsData[groupId];
        });

        sectionEl.remove();
        if (window.markEditorDirty) window.markEditorDirty();
    },

    // ─── Move Exercise Between Sections ──────────────────────────

    /**
     * Populate the card menu with "Move to [Block]" / "Remove from Block" items.
     * Called by WorkoutBuilderCardMenu.toggleMenu() after opening.
     * @param {string} groupId - Exercise group ID
     * @param {HTMLElement} menuEl - The .builder-card-menu element
     */
    populateCardSectionMenu(groupId, menuEl) {
        const divider = menuEl.querySelector('.section-menu-divider');
        const itemsContainer = menuEl.querySelector('.section-menu-items');
        if (!divider || !itemsContainer) return;

        itemsContainer.innerHTML = '';

        const cardEl = document.querySelector(`.exercise-group-card[data-group-id="${groupId}"]`);
        if (!cardEl) { divider.style.display = 'none'; return; }

        const currentSection = cardEl.closest('.workout-section');
        const isInNamedSection = currentSection?.dataset.sectionType !== 'standard';

        // Find all named sections in the builder
        const namedSections = document.querySelectorAll('.workout-section:not([data-section-type="standard"])');
        const items = [];

        // "Remove from Block" if exercise is inside a named section
        if (isInNamedSection) {
            items.push(`<button type="button" class="builder-menu-item" data-action="remove-from-block" data-group-id="${groupId}">
                <i class="bx bx-unlink"></i> Remove from Block
            </button>`);
        }

        // "Move to [Block Name]" for each OTHER named section (max 8)
        let count = 0;
        namedSections.forEach(sectionEl => {
            if (count >= 8) return;
            const sectionId = sectionEl.dataset.sectionId;
            if (currentSection && sectionId === currentSection.dataset.sectionId) return;

            const nameInput = sectionEl.querySelector('.section-name-input');
            const blockName = nameInput?.value?.trim() || 'Block';
            items.push(`<button type="button" class="builder-menu-item" data-action="move-to-section" data-group-id="${groupId}" data-target-section="${sectionId}">
                <i class="bx bx-right-arrow-alt"></i> Move to ${blockName}
            </button>`);
            count++;
        });

        if (count >= 8 && namedSections.length > 9) {
            items.push(`<div class="builder-menu-hint text-muted" style="padding: 4px 14px; font-size: 0.7rem;">Use Reorder to manage more blocks</div>`);
        }

        if (items.length === 0) {
            divider.style.display = 'none';
            return;
        }

        divider.style.display = '';
        itemsContainer.innerHTML = items.join('');

        // Delegate clicks
        itemsContainer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const gId = btn.dataset.groupId;

            if (action === 'remove-from-block') {
                this.removeExerciseFromSection(gId);
            } else if (action === 'move-to-section') {
                this.moveExerciseToSection(gId, btn.dataset.targetSection);
            }

            window.builderCardMenu?.closeAllMenus();
        });
    },

    /**
     * Move an exercise card to a target named section.
     * @param {string} exerciseId - The exercise group ID
     * @param {string} targetSectionId - Target section ID
     */
    moveExerciseToSection(exerciseId, targetSectionId) {
        const cardEl = document.querySelector(`.exercise-group-card[data-group-id="${exerciseId}"]`);
        const targetSection = document.querySelector(`.workout-section[data-section-id="${targetSectionId}"]`);
        if (!cardEl || !targetSection) return;

        const sourceSection = cardEl.closest('.workout-section');
        const targetExercises = targetSection.querySelector('.section-exercises');
        if (!targetExercises) return;

        // Remove placeholder in target if present
        const placeholder = targetExercises.querySelector('.section-placeholder');
        if (placeholder) placeholder.remove();

        // Move DOM element
        targetExercises.appendChild(cardEl);

        // Cleanup source section
        if (sourceSection) this._cleanupSection(sourceSection);

        if (window.markEditorDirty) window.markEditorDirty();

        if (window.showToast) {
            const targetName = targetSection.querySelector('.section-name-input')?.value?.trim() || 'Block';
            window.showToast({
                message: `Moved to ${targetName}`,
                type: 'success',
                icon: 'bx-check',
                delay: 2000
            });
        }
    },

    /**
     * Clean up a section after an exercise was removed:
     * - Standard section with 0 exercises: remove
     * - Named section with 0 exercises: show placeholder (keep section for user to re-add)
     * - Named section with 1+ exercises: keep as-is
     */
    _cleanupSection(sectionEl) {
        const exercisesContainer = sectionEl.querySelector('.section-exercises');
        if (!exercisesContainer) return;

        const remainingCards = exercisesContainer.querySelectorAll('.exercise-group-card');
        const isNamed = sectionEl.dataset.sectionType !== 'standard';

        if (remainingCards.length === 0) {
            if (isNamed) {
                // Show placeholder — user can add exercises back via "+ Add"
                if (!exercisesContainer.querySelector('.section-placeholder')) {
                    exercisesContainer.innerHTML = this._placeholderHtml();
                }
            } else {
                sectionEl.remove();
            }
        }
    },

    // ─── SortableJS ──────────────────────────────────────────────

    /**
     * Initialize two-level SortableJS:
     * - Level 1: Section reorder (parent container)
     * - Level 2: Exercise reorder within named sections
     */
    initSortable(container) {
        if (!window.Sortable) {
            console.warn('⚠️ SortableJS not loaded, cannot init sorting');
            return;
        }

        // Destroy existing Sortable instances
        if (container._sectionSortable) {
            container._sectionSortable.destroy();
        }

        // Level 1: Section reorder + exercise drop zone
        // The parent accepts items from the 'exercises' group so exercises dragged
        // out of named sections can land between sections (becoming standalone).
        container._sectionSortable = new Sortable(container, {
            animation: 150,
            handle: '.section-drag-handle',
            draggable: '.workout-section',
            ghostClass: 'section-ghost',
            group: { name: 'sections', put: ['exercises'] },
            onStart: function() {
                container.classList.add('is-dragging');
            },
            onEnd: function() {
                container.classList.remove('is-dragging');
                if (window.markEditorDirty) window.markEditorDirty();
            },
            onAdd: (evt) => {
                // An exercise card was dropped between sections — wrap in a new standard section
                const card = evt.item;
                const newSectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

                const newSection = document.createElement('div');
                newSection.className = 'workout-section';
                newSection.dataset.sectionId = newSectionId;
                newSection.dataset.sectionType = 'standard';

                const exercisesEl = document.createElement('div');
                exercisesEl.className = 'section-exercises';
                newSection.appendChild(exercisesEl);

                // Replace the bare card (now a direct child of #exerciseGroups) with the section wrapper
                container.replaceChild(newSection, card);
                exercisesEl.appendChild(card);

                // Init inner Sortable on the new standard section
                this._initExerciseSortable(exercisesEl, false);

                // Cleanup source section (show placeholder if named, remove if empty standard)
                const fromSectionEl = evt.from.closest('.workout-section');
                if (fromSectionEl) this._cleanupSection(fromSectionEl);

                if (window.markEditorDirty) window.markEditorDirty();
            }
        });

        // Level 2: Inner Sortables on ALL sections for cross-section exercise drag
        // Named sections: full pull+put (accept drops)
        // Standard sections: pull-only (can drag OUT to named sections, but nothing drops IN)
        container.querySelectorAll('.workout-section .section-exercises').forEach(el => {
            const isNamed = el.closest('.workout-section').dataset.sectionType !== 'standard';
            this._initExerciseSortable(el, isNamed);
        });
    },

    /**
     * Initialize exercise-level Sortable on a single section's exercise container.
     * @param {HTMLElement} exercisesEl - The .section-exercises container
     * @param {boolean} isNamed - true for named sections (pull+put), false for standard (pull only)
     */
    _initExerciseSortable(exercisesEl, isNamed = true) {
        if (!window.Sortable) return;

        // Destroy existing if present
        if (exercisesEl._exerciseSortable) {
            exercisesEl._exerciseSortable.destroy();
        }

        exercisesEl._exerciseSortable = new Sortable(exercisesEl, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            // Named sections: accept drops from any section
            // Standard sections: can only drag OUT (pull), nothing drops IN (put: false)
            group: isNamed
                ? 'exercises'
                : { name: 'exercises', pull: true, put: false },
            onStart: () => {
                document.getElementById('exerciseGroups')?.classList.add('is-exercise-dragging');
            },
            onAdd: (evt) => {
                // Exercise arrived from another section — remove placeholder if present
                const placeholder = exercisesEl.querySelector('.section-placeholder');
                if (placeholder) placeholder.remove();

                // Cleanup source section (removes empty standard sections, shows placeholder for named)
                const fromSectionEl = evt.from.closest('.workout-section');
                if (fromSectionEl) this._cleanupSection(fromSectionEl);
                if (window.markEditorDirty) window.markEditorDirty();
            },
            onEnd: () => {
                document.getElementById('exerciseGroups')?.classList.remove('is-exercise-dragging');
                if (window.markEditorDirty) window.markEditorDirty();
            }
        });
    },

    // ─── Event Delegation ────────────────────────────────────────

    /**
     * Initialize event delegation for section header buttons.
     */
    initHeaderListeners(container) {
        if (!container || container._sectionHeaderListenersInit) return;
        container._sectionHeaderListenersInit = true;

        container.addEventListener('click', (e) => {
            // "+ Add" button on section header
            const addBtn = e.target.closest('.btn-add-to-section');
            if (addBtn) {
                const sectionId = addBtn.dataset.sectionId;
                if (sectionId) this.addExerciseToSection(sectionId);
                return;
            }

            // Section menu button
            const menuBtn = e.target.closest('.btn-section-menu');
            if (menuBtn) {
                const sectionId = menuBtn.dataset.sectionId;
                if (sectionId) this._showSectionMenu(sectionId, menuBtn);
                return;
            }

            // Description toggle button
            const descBtn = e.target.closest('.btn-toggle-description');
            if (descBtn) {
                const section = descBtn.closest('.workout-section');
                const area = section?.querySelector('.section-description-area');
                if (area) {
                    const isHidden = area.style.display === 'none';
                    area.style.display = isHidden ? 'block' : 'none';
                    if (isHidden) {
                        area.querySelector('.section-description-input')?.focus();
                    }
                }
                return;
            }
        });

        // Mark dirty on name/description blur
        container.addEventListener('blur', (e) => {
            if (e.target.matches('.section-name-input') || e.target.matches('.section-description-input')) {
                if (window.markEditorDirty) window.markEditorDirty();
            }
        }, true); // useCapture for blur
    },

    /**
     * Dissolve a named section: move all exercises out as standalone standard sections.
     */
    dissolveSection(sectionId) {
        const sectionEl = document.querySelector(`.workout-section[data-section-id="${sectionId}"]`);
        if (!sectionEl) return;

        const container = document.getElementById('exerciseGroups');
        const cards = sectionEl.querySelectorAll('.section-exercises .exercise-group-card');

        // Move each exercise to its own standard section, inserted after the current section
        let insertAfter = sectionEl;
        cards.forEach(cardEl => {
            const newSectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const newSection = document.createElement('div');
            newSection.className = 'workout-section';
            newSection.dataset.sectionId = newSectionId;
            newSection.dataset.sectionType = 'standard';

            const exercisesEl = document.createElement('div');
            exercisesEl.className = 'section-exercises';
            exercisesEl.appendChild(cardEl);
            newSection.appendChild(exercisesEl);

            insertAfter.after(newSection);
            insertAfter = newSection;

            // Init inner Sortable so this exercise can be dragged to named sections
            this._initExerciseSortable(exercisesEl, false);
        });

        // Remove the now-empty named section
        sectionEl.remove();
        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Show a context menu for a section (rename, dissolve, delete).
     */
    _showSectionMenu(sectionId, anchorEl) {
        // Remove any existing menu
        document.querySelectorAll('.section-context-menu').forEach(m => m.remove());

        const sectionEl = document.querySelector(`.workout-section[data-section-id="${sectionId}"]`);
        const hasExercises = sectionEl?.querySelectorAll('.exercise-group-card').length > 0;

        const menu = document.createElement('div');
        menu.className = 'section-context-menu';
        menu.innerHTML = `
            <button class="section-menu-item" data-action="rename">
                <i class="bx bx-edit-alt"></i> Rename
            </button>
            ${hasExercises ? `<button class="section-menu-item" data-action="dissolve">
                <i class="bx bx-layer-minus"></i> Ungroup Exercises
            </button>` : ''}
            <button class="section-menu-item section-menu-danger" data-action="delete">
                <i class="bx bx-trash"></i> Delete Block
            </button>
        `;

        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.section-menu-item');
            if (!item) return;

            const action = item.dataset.action;
            if (action === 'rename') this.renameSection(sectionId);
            if (action === 'dissolve') this.dissolveSection(sectionId);
            if (action === 'delete') this.deleteSection(sectionId);

            menu.remove();
        });

        // Position near the anchor
        anchorEl.style.position = 'relative';
        anchorEl.appendChild(menu);

        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);
    },

    // ─── Data Collection ─────────────────────────────────────────

    /**
     * Collect sections data from the current DOM state.
     * Walks section containers and reads exercise data from window.exerciseGroupsData.
     * Returns an array matching the backend WorkoutSection format.
     */
    // Keep in sync with FormDataCollector.collectSections()
    collectSections() {
        const sections = [];

        document.querySelectorAll('#exerciseGroups .workout-section').forEach(sectionEl => {
            const sectionId = sectionEl.dataset.sectionId;
            const sectionType = sectionEl.dataset.sectionType || 'standard';
            // Support both inline input (Phase 2+) and span (legacy)
            const nameInput = sectionEl.querySelector('.section-name-input');
            const nameSpan = sectionEl.querySelector('.section-name');
            const name = (sectionType !== 'standard')
                ? (nameInput?.value?.trim() || nameSpan?.textContent?.trim() || null)
                : null;
            const description = sectionEl.querySelector('.section-description-input')?.value?.trim() || null;

            const exercises = [];
            sectionEl.querySelectorAll('.section-exercises .exercise-group-card').forEach(cardEl => {
                const groupId = cardEl.dataset.groupId;
                const data = window.exerciseGroupsData[groupId];
                if (!data) return;

                const primaryName = data.exercises?.a || '';
                const alternates = [];
                Object.keys(data.exercises || {}).sort().forEach(key => {
                    if (key !== 'a' && data.exercises[key]) {
                        alternates.push(data.exercises[key]);
                    }
                });

                if (!primaryName && alternates.length === 0) return;

                exercises.push({
                    exercise_id: groupId,
                    name: primaryName,
                    alternates: alternates,
                    sets: data.sets || '3',
                    reps: data.reps || '8-12',
                    rest: data.rest || '60s',
                    default_weight: data.default_weight || null,
                    default_weight_unit: data.default_weight_unit || 'lbs'
                });
            });

            if (exercises.length > 0) {
                sections.push({
                    section_id: sectionId,
                    type: sectionType,
                    name: name,
                    description: description,
                    exercises: exercises
                });
            }
        });

        console.log('📦 Collected', sections.length, 'sections');
        return sections;
    },

    /**
     * Check if the builder is currently using sections-based layout.
     * Returns true if the container has .workout-section children.
     */
    isSectionsMode() {
        const container = document.getElementById('exerciseGroups');
        return container && container.querySelector('.workout-section') !== null;
    }
};

// Expose globally
window.SectionManager = SectionManager;

console.log('📦 SectionManager module loaded');
