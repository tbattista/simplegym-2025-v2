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
     * Add exercise block — creates 2 individual ExerciseGroups linked by a shared block_id
     */
    addBlock() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Create 2 individual exercise groups linked by block_id
        const groupIds = [];
        for (let i = 0; i < 2; i++) {
            const groupId = `group-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
            groupIds.push(groupId);
            const currentCardCount = container.querySelectorAll('.exercise-group-card').length;

            const data = {
                exercises: { a: '' },
                sets: '3',
                reps: '10',
                rest: '60s',
                default_weight: null,
                default_weight_unit: 'lbs',
                block_id: blockId,
                group_name: null
            };

            window.exerciseGroupsData[groupId] = data;

            const cardHtml = window.createExerciseGroupCard(
                groupId, data, currentCardCount, currentCardCount + 1
            );
            container.insertAdjacentHTML('beforeend', cardHtml);
        }

        // Apply visual grouping
        if (window.applyBlockGrouping) window.applyBlockGrouping();

        // Update menu boundaries and sorting
        if (window.builderCardMenu?.updateAllMenuBoundaries) {
            window.builderCardMenu.updateAllMenuBoundaries();
        }
        ExerciseGroupManager.initSorting();

        // Auto-open editor for first card
        setTimeout(() => {
            if (window.openExerciseGroupEditor) {
                window.openExerciseGroupEditor(groupIds[0]);
            }
        }, 100);

        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Add a new exercise group to an existing block
     */
    addToBlock(blockId) {
        const container = document.getElementById('exerciseGroups');
        if (!container || !blockId) return;

        // Find last card with this block_id
        const blockCards = Array.from(container.querySelectorAll(`.exercise-group-card[data-block-id="${blockId}"]`));
        const lastBlockCard = blockCards[blockCards.length - 1];
        if (!lastBlockCard) return;

        // Get block_name from sibling
        const siblingGroupId = lastBlockCard.dataset.groupId;
        const blockName = window.exerciseGroupsData[siblingGroupId]?.group_name || null;

        const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const currentCardCount = container.querySelectorAll('.exercise-group-card').length;

        const data = {
            exercises: { a: '' },
            sets: '3',
            reps: '10',
            rest: '60s',
            default_weight: null,
            default_weight_unit: 'lbs',
            block_id: blockId,
            group_name: blockName
        };

        window.exerciseGroupsData[groupId] = data;

        const cardHtml = window.createExerciseGroupCard(
            groupId, data, currentCardCount, currentCardCount + 1
        );

        // Insert after last card in the block
        lastBlockCard.insertAdjacentHTML('afterend', cardHtml);

        // Re-apply visual grouping
        if (window.applyBlockGrouping) window.applyBlockGrouping();

        if (window.builderCardMenu?.updateAllMenuBoundaries) {
            window.builderCardMenu.updateAllMenuBoundaries();
        }

        // Open editor for new card
        setTimeout(() => {
            if (window.openExerciseGroupEditor) {
                window.openExerciseGroupEditor(groupId);
            }
        }, 100);

        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Remove a single exercise group from its block.
     * If only one member remains after removal, dissolve the block entirely.
     */
    removeFromBlock(groupId) {
        const data = window.exerciseGroupsData[groupId];
        if (!data || !data.block_id) return;

        const blockId = data.block_id;
        const otherMembers = Object.keys(window.exerciseGroupsData).filter(
            id => id !== groupId && window.exerciseGroupsData[id]?.block_id === blockId
        );

        // Clear block membership
        data.block_id = null;
        data.group_name = null;

        // If only 1 member left, dissolve the block entirely
        if (otherMembers.length === 1) {
            const lastMember = window.exerciseGroupsData[otherMembers[0]];
            if (lastMember) {
                lastMember.block_id = null;
                lastMember.group_name = null;
            }
        }

        // Re-apply visual grouping
        if (window.applyBlockGrouping) window.applyBlockGrouping();
        if (window.markEditorDirty) window.markEditorDirty();
    },

    /**
     * Rename a block — prompts the user for a new name and updates all member groups.
     */
    renameBlock(blockId) {
        if (!blockId) return;

        // Find current name from any member
        const memberIds = Object.keys(window.exerciseGroupsData).filter(
            id => window.exerciseGroupsData[id]?.block_id === blockId
        );
        if (memberIds.length === 0) return;

        const currentName = window.exerciseGroupsData[memberIds[0]]?.group_name || '';
        const newName = prompt('Block name:', currentName);
        if (newName === null) return; // cancelled

        // Update all members
        memberIds.forEach(id => {
            window.exerciseGroupsData[id].group_name = newName || null;
        });

        // Re-apply visual grouping to update header labels
        if (window.applyBlockGrouping) window.applyBlockGrouping();
        if (window.markEditorDirty) window.markEditorDirty();
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
            filter: '.block-group-header',

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
                // Check if card was dragged between two block members — auto-join
                const movedCard = evt.item;
                const movedGroupId = movedCard.dataset.groupId;
                const movedData = window.exerciseGroupsData[movedGroupId];

                if (movedData) {
                    const prevSibling = movedCard.previousElementSibling;
                    const nextSibling = movedCard.nextElementSibling;

                    // Skip block headers when checking siblings
                    const prevCard = prevSibling?.classList.contains('exercise-group-card') ? prevSibling :
                                     prevSibling?.previousElementSibling?.classList.contains('exercise-group-card') ? prevSibling.previousElementSibling : null;
                    const nextCard = nextSibling?.classList.contains('exercise-group-card') ? nextSibling : null;

                    const prevBlockId = prevCard ? window.exerciseGroupsData[prevCard.dataset.groupId]?.block_id : null;
                    const nextBlockId = nextCard ? window.exerciseGroupsData[nextCard.dataset.groupId]?.block_id : null;

                    // If dropped between two cards of the same block, join that block
                    if (prevBlockId && prevBlockId === nextBlockId && movedData.block_id !== prevBlockId) {
                        movedData.block_id = prevBlockId;
                        movedData.group_name = window.exerciseGroupsData[prevCard.dataset.groupId]?.group_name;
                    }
                }

                // Re-apply visual grouping
                if (window.applyBlockGrouping) window.applyBlockGrouping();

                ExerciseGroupManager.renumber();
                if (window.markEditorDirty) window.markEditorDirty();
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
window.addExerciseBlock = ExerciseGroupManager.addBlock;
window.addToBlock = ExerciseGroupManager.addToBlock;
window.removeExerciseGroup = ExerciseGroupManager.remove;
window.renumberExerciseGroups = ExerciseGroupManager.renumber;
window.updateExerciseGroupPreview = ExerciseGroupManager.updatePreview;
window.initializeExerciseGroupSorting = ExerciseGroupManager.initSorting;
window.addExerciseToGroup = ExerciseGroupManager.addExercise;
window.removeExerciseFromGroup = ExerciseGroupManager.removeExercise;
window.addWeightUnitButtonListeners = ExerciseGroupManager.addWeightUnitListeners;

console.log('📦 ExerciseGroupManager module loaded');
