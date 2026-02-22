/**
 * Workout Editor Offcanvas Module
 * Handles offcanvas-based editors for exercise groups
 * Extracted from workouts.js
 */

const WorkoutEditorOffcanvas = {

    /**
     * Open exercise group editor offcanvas using UnifiedOffcanvasFactory
     * @param {string} groupId - ID of group to edit
     */
    openGroupEditor(groupId) {
        const groupData = window.exerciseGroupsData[groupId] || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };

        window.currentEditingGroupId = groupId;

        document.querySelectorAll('.exercise-group-card').forEach(c => c.classList.remove('editing'));
        document.querySelector(`[data-group-id="${groupId}"]`)?.classList.add('editing');

        const isNew = !groupData.exercises.a;

        window.UnifiedOffcanvasFactory.createExerciseGroupEditor(
            {
                groupId: groupId,
                title: isNew ? 'Add Exercise' : 'Edit Exercise',
                exercises: groupData.exercises,
                sets: groupData.sets || '3',
                reps: groupData.reps || '8-12',
                rest: groupData.rest || '60s',
                weight: groupData.default_weight || '',
                weightUnit: groupData.default_weight_unit || 'lbs',
                isNew: isNew
            },
            // onSave callback
            async (data) => {
                console.log('💾 Saving exercise group from factory editor:', data);

                if (window.autoCreateExercisesInGroups) {
                    console.log('🚀 Auto-creating custom exercises...');
                    await window.autoCreateExercisesInGroups([data]);
                }

                window.exerciseGroupsData[groupId] = {
                    exercises: data.exercises,
                    sets: data.sets,
                    reps: data.reps,
                    rest: data.rest,
                    default_weight: data.default_weight,
                    default_weight_unit: data.default_weight_unit,
                    group_type: groupData.group_type || 'standard',
                    group_name: groupData.group_name || null,
                    block_id: groupData.block_id || null
                };

                if (window.updateExerciseGroupCardPreview) {
                    window.updateExerciseGroupCardPreview(groupId, window.exerciseGroupsData[groupId]);
                }

                document.querySelector(`[data-group-id="${groupId}"]`)?.classList.remove('editing');

                if (window.saveWorkoutFromEditor) {
                    try {
                        await window.saveWorkoutFromEditor(false);
                        console.log('✅ Full workout saved successfully');
                    } catch (error) {
                        console.error('❌ Failed to save workout:', error);
                    }
                } else if (window.markEditorDirty) {
                    window.markEditorDirty();
                }

                console.log('✅ Exercise group saved:', groupId);
            },
            // onDelete callback
            async () => {
                console.log('🗑️ Deleting exercise group:', groupId);

                delete window.exerciseGroupsData[groupId];

                const card = document.querySelector(`[data-group-id="${groupId}"]`);
                if (card) card.remove();

                if (window.renumberExerciseGroups) {
                    window.renumberExerciseGroups();
                }

                if (window.saveWorkoutFromEditor) {
                    try {
                        await window.saveWorkoutFromEditor(false);
                        console.log('✅ Workout saved after group deletion');
                    } catch (error) {
                        console.error('❌ Failed to save after deletion:', error);
                    }
                } else if (window.markEditorDirty) {
                    window.markEditorDirty();
                }

                if (window.showToast) {
                    window.showToast('Exercise deleted', 'success');
                }
            },
            // onSearchClick callback
            (slotKey, populateCallback, initialQuery = '') => {
                console.log('🔍 Opening exercise search for slot:', slotKey, 'with initial query:', initialQuery);

                window.UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
                    {
                        title: slotKey === 'a' ? 'Select Primary Exercise' : 'Select Alternate Exercise',
                        showFilters: true,
                        buttonText: 'Select',
                        buttonIcon: 'bx-check',
                        initialQuery: initialQuery
                    },
                    (selectedExercise) => {
                        console.log('✅ Exercise selected:', selectedExercise.name);
                        populateCallback(selectedExercise);
                    }
                );
            }
        );

        console.log('✅ Opened exercise group editor (factory):', groupId);
    },

    /**
     * Add alternate exercise field (max 2)
     */
    addAlternate() {
        const container = document.getElementById('alternateExercisesContainer');
        const addBtn = document.getElementById('addAlternateBtn');
        const currentCount = container.children.length;

        if (currentCount >= 2) {
            console.warn('Maximum 2 alternate exercises allowed');
            return;
        }

        const letter = currentCount === 0 ? 'b' : 'c';
        const fieldId = `editExercise${letter.toUpperCase()}`;

        const fieldHtml = `
            <div class="alternate-exercise-field mb-3" data-alt-letter="${letter}">
                <label class="form-label">Alternate Exercise</label>
                <div class="input-group">
                    <input type="text"
                           class="form-control exercise-input exercise-autocomplete-input"
                           id="${fieldId}"
                           placeholder="Search exercises...">
                    <button type="button"
                            class="btn-remove-alternate"
                            onclick="removeAlternateExercise('${letter}')"
                            title="Remove alternate">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', fieldHtml);

        setTimeout(() => {
            if (window.initializeExerciseAutocompletesWithAutoCreate) {
                window.initializeExerciseAutocompletesWithAutoCreate();
            } else if (window.initializeExerciseAutocompletes) {
                window.initializeExerciseAutocompletes();
            }
        }, 100);

        if (currentCount + 1 >= 2) {
            addBtn.style.display = 'none';
        }

        console.log(`✅ Added alternate exercise ${letter.toUpperCase()}`);
    },

    /**
     * Remove alternate exercise field
     * @param {string} letter - 'b' or 'c'
     */
    removeAlternate(letter) {
        const container = document.getElementById('alternateExercisesContainer');
        const addBtn = document.getElementById('addAlternateBtn');
        const field = container.querySelector(`[data-alt-letter="${letter}"]`);

        if (!field) return;

        field.style.animation = 'slideOut 0.2s ease-out';
        setTimeout(() => {
            field.remove();

            const currentCount = container.children.length;
            if (currentCount < 2) {
                addBtn.style.display = 'block';
            }

            console.log(`✅ Removed alternate exercise ${letter.toUpperCase()}`);
        }, 200);
    },

    /**
     * Load existing alternates into editor
     * @param {Object} exercises - Exercise data {a, b, c}
     */
    loadAlternates(exercises) {
        const container = document.getElementById('alternateExercisesContainer');
        const addBtn = document.getElementById('addAlternateBtn');

        container.innerHTML = '';
        addBtn.style.display = 'block';

        if (exercises.b) {
            WorkoutEditorOffcanvas.addAlternate();
            document.getElementById('editExerciseB').value = exercises.b;
        }

        if (exercises.c) {
            WorkoutEditorOffcanvas.addAlternate();
            document.getElementById('editExerciseC').value = exercises.c;
        }
    }
};

// Expose module
window.WorkoutEditorOffcanvas = WorkoutEditorOffcanvas;

// Backward-compat globals
window.openExerciseGroupEditor = WorkoutEditorOffcanvas.openGroupEditor;
window.addAlternateExercise = WorkoutEditorOffcanvas.addAlternate;
window.removeAlternateExercise = WorkoutEditorOffcanvas.removeAlternate;
window.loadAlternateExercises = WorkoutEditorOffcanvas.loadAlternates;

console.log('📦 WorkoutEditorOffcanvas module loaded');
