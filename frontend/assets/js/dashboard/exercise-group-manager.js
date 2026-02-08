/**
 * Exercise Group Manager Module
 * Handles exercise group CRUD, sorting, previews, and weight unit toggles
 * Extracted from workouts.js
 */

const ExerciseGroupManager = {

    /**
     * Add exercise group to workout form (card-based layout)
     */
    add() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const currentCardCount = container.querySelectorAll('.exercise-group-card').length;
        const groupCount = currentCardCount + 1;
        const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create default data with placeholder exercise name
        const defaultData = {
            exercises: { a: 'Exercise Name', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        // Create card HTML with default data
        const newIndex = currentCardCount;
        const newTotalCards = currentCardCount + 1;
        const groupHtml = createExerciseGroupCard(groupId, defaultData, groupCount, newIndex, newTotalCards);

        container.insertAdjacentHTML('beforeend', groupHtml);

        // Update all card menu boundaries after adding new card
        window.builderCardMenu?.updateAllMenuBoundaries();

        // Initialize Sortable if not already done
        ExerciseGroupManager.initSorting();

        // Auto-open editor for new group
        setTimeout(() => {
            openExerciseGroupEditor(groupId);
        }, 100);

        // Mark editor as dirty
        if (window.markEditorDirty) window.markEditorDirty();

        console.log('✅ Added new exercise group card:', groupId);
    },

    /**
     * Remove exercise group with confirmation
     */
    remove(button) {
        const group = button.closest('.exercise-group');
        if (!group) return;

        const exerciseInputs = group.querySelectorAll('.exercise-input');
        const exerciseNames = Array.from(exerciseInputs)
            .map(input => input.value.trim())
            .filter(name => name);

        let confirmMessage = 'Are you sure you want to delete this exercise group?';
        if (exerciseNames.length > 0) {
            confirmMessage += '\n\nExercises in this group:\n• ' + exerciseNames.join('\n• ');
        }
        confirmMessage += '\n\nThis action cannot be undone.';

        if (confirm(confirmMessage)) {
            group.remove();
            ExerciseGroupManager.renumber();
            if (window.markEditorDirty) window.markEditorDirty();
            showAlert('Exercise group deleted', 'success');
        }
    },

    /**
     * Renumber exercise groups after removal or reordering
     */
    renumber() {
        const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
        groups.forEach((group, index) => {
            const accordionTitle = group.querySelector('.group-title');
            if (accordionTitle) {
                accordionTitle.textContent = `Exercise Group ${index + 1}`;
            } else {
                const cardHeader = group.querySelector('.card-header h6');
                if (cardHeader) {
                    cardHeader.textContent = `Exercise Group ${index + 1}`;
                }
            }
        });
    },

    /**
     * Update exercise group preview in header
     */
    updatePreview(groupElement) {
        if (!groupElement) return;

        const exerciseInputs = groupElement.querySelectorAll('.exercise-input');
        const previewMain = groupElement.querySelector('.exercise-preview-main');
        const previewSecondaries = groupElement.querySelectorAll('.exercise-preview-secondary');
        const previewInfo = groupElement.querySelector('.exercise-preview-info');
        const previewWeight = groupElement.querySelector('.exercise-preview-weight');

        if (!previewMain) return;

        const exercises = Array.from(exerciseInputs).map(input => input.value.trim()).filter(v => v);

        const bodyEl = groupElement.querySelector('.accordion-body') || groupElement.querySelector('.card-body');
        const sets = bodyEl?.querySelector('.sets-input')?.value || '3';
        const reps = bodyEl?.querySelector('.reps-input')?.value || '8-12';
        const rest = bodyEl?.querySelector('.rest-input')?.value || '60s';

        if (exercises.length > 0) {
            previewMain.textContent = exercises[0];
            previewMain.style.display = 'block';
        } else {
            previewMain.textContent = '';
            previewMain.style.display = 'none';
        }

        previewSecondaries.forEach((preview, index) => {
            const exerciseIndex = index + 1;
            if (exercises.length > exerciseIndex) {
                preview.textContent = exercises[exerciseIndex];
                preview.style.display = 'block';
            } else {
                preview.textContent = '';
                preview.style.display = 'none';
            }
        });

        if (previewInfo && exercises.length > 0) {
            previewInfo.textContent = `${sets} Sets • ${reps} Reps • ${rest} Rest`;
            previewInfo.style.display = 'block';
        } else if (previewInfo) {
            previewInfo.textContent = '';
            previewInfo.style.display = 'none';
        }

        if (previewWeight && exercises.length > 0) {
            const weightInput = bodyEl?.querySelector('.weight-input');
            const weight = weightInput?.value?.trim();
            const activeUnitBtn = bodyEl?.querySelector('.weight-unit-btn.active');
            const weightUnit = activeUnitBtn?.getAttribute('data-unit') || 'lbs';

            if (weight) {
                previewWeight.textContent = `${weight} ${weightUnit}`;
            } else {
                previewWeight.textContent = 'Weight';
            }
            previewWeight.style.display = 'block';
        } else if (previewWeight) {
            previewWeight.textContent = '';
            previewWeight.style.display = 'none';
        }
    },

    /**
     * Initialize drag-and-drop sorting for exercise groups
     */
    initSorting() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        if (container.sortableInstance) return;

        container.sortableInstance = new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            forceFallback: true,
            fallbackTolerance: 3,

            onStart: function(evt) {
                const accordions = container.querySelectorAll('.accordion-collapse.show');
                accordions.forEach(acc => {
                    const currentItemCollapse = evt.item.querySelector('.accordion-collapse');
                    if (acc.id !== currentItemCollapse?.id) {
                        const bsCollapse = bootstrap.Collapse.getInstance(acc);
                        if (bsCollapse) bsCollapse.hide();
                    }
                });
            },

            onEnd: function(evt) {
                ExerciseGroupManager.renumber();
                if (window.markEditorDirty) window.markEditorDirty();
                console.log('✅ Exercise group reordered:', {
                    oldIndex: evt.oldIndex,
                    newIndex: evt.newIndex
                });
            }
        });

        console.log('✅ Exercise group sorting initialized');
    },

    /**
     * Add exercise to existing group
     */
    addExercise(button) {
        const group = button.closest('.exercise-group');
        const exerciseInputs = group.querySelectorAll('.exercise-input');
        const nextLetter = String.fromCharCode(97 + exerciseInputs.length);

        if (exerciseInputs.length >= 6) {
            showAlert('Maximum 6 exercises per group', 'warning');
            return;
        }

        const groupId = group.dataset.groupId;
        const exerciseId = `exercise-${groupId}-${nextLetter}`;

        const newExerciseHtml = `
            <div class="col-md-6 mb-3">
                <label class="form-label">Exercise ${nextLetter.toUpperCase()} (optional)</label>
                <div class="input-group">
                    <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                           id="${exerciseId}" placeholder="Search exercises...">
                    <button type="button" class="btn btn-outline-danger" onclick="removeExerciseFromGroup(this)">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </div>
        `;

        const lastRow = group.querySelector('.row:last-of-type');
        lastRow.insertAdjacentHTML('beforebegin', `<div class="row">${newExerciseHtml}</div>`);

        if (window.initializeExerciseAutocompletes) {
            window.initializeExerciseAutocompletes();
        }

        ExerciseGroupManager.updatePreview(group);
    },

    /**
     * Remove exercise from group
     */
    removeExercise(button) {
        const exerciseDiv = button.closest('.col-md-6');
        const row = exerciseDiv.parentElement;

        exerciseDiv.remove();

        if (row.children.length === 0) {
            row.remove();
        }
    },

    /**
     * Add weight unit button listeners to a group
     */
    addWeightUnitListeners(groupElement) {
        const unitButtons = groupElement.querySelectorAll('.weight-unit-btn');

        unitButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const allButtons = this.closest('.row').querySelectorAll('.weight-unit-btn');
                allButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.add('btn-outline-secondary');
                    btn.classList.remove('btn-secondary');
                });

                this.classList.add('active');
                this.classList.remove('btn-outline-secondary');
                this.classList.add('btn-secondary');

                if (window.markEditorDirty) window.markEditorDirty();
            });
        });

        const defaultButton = groupElement.querySelector('.weight-unit-btn[data-unit="lbs"]');
        if (defaultButton) {
            defaultButton.classList.add('active');
            defaultButton.classList.remove('btn-outline-secondary');
            defaultButton.classList.add('btn-secondary');
        }
    }
};

// Expose module
window.ExerciseGroupManager = ExerciseGroupManager;

// Backward-compat globals
window.addExerciseGroup = ExerciseGroupManager.add;
window.removeExerciseGroup = ExerciseGroupManager.remove;
window.renumberExerciseGroups = ExerciseGroupManager.renumber;
window.updateExerciseGroupPreview = ExerciseGroupManager.updatePreview;
window.initializeExerciseGroupSorting = ExerciseGroupManager.initSorting;
window.addExerciseToGroup = ExerciseGroupManager.addExercise;
window.removeExerciseFromGroup = ExerciseGroupManager.removeExercise;
window.addWeightUnitButtonListeners = ExerciseGroupManager.addWeightUnitListeners;

console.log('📦 ExerciseGroupManager module loaded');
