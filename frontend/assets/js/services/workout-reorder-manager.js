/**
 * Ghost Gym - Workout Reorder Manager
 * Manages exercise reordering functionality (drag-and-drop, move up/down)
 * @version 1.0.0
 * @date 2026-02-06
 * Phase 10: Exercise Reordering Management
 */

class WorkoutReorderManager {
    constructor(options = {}) {
        // Required services
        this.sessionService = options.sessionService;

        // Callbacks for controller coordination
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onAutoSave = options.onAutoSave || (() => {});
        this.onGetCurrentWorkout = options.onGetCurrentWorkout || (() => null);
        this.onToggleExerciseMenu = options.onToggleExerciseMenu || (() => {});

        console.log('🔀 Workout Reorder Manager initialized');
    }

    /**
     * Show reorder exercise offcanvas (sections-style, matching workout-builder)
     * Allows user to reorder exercises via drag-and-drop with block headers
     */
    showReorderOffcanvas() {
        try {
            console.log('📋 Building sections list for reorder...');

            const { sections, groupIdToName } = this.buildSectionsList();

            const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);
            if (totalExercises === 0) {
                window.showAlert('No exercises to reorder', 'warning');
                return;
            }

            console.log('📋 Sections list built:', sections.length, 'sections,', totalExercises, 'items');

            if (!window.UnifiedOffcanvasFactory?.createSectionsReorderOffcanvas) {
                console.error('UnifiedOffcanvasFactory.createSectionsReorderOffcanvas not available');
                window.showAlert('Reorder feature not available', 'error');
                return;
            }

            const result = window.UnifiedOffcanvasFactory.createSectionsReorderOffcanvas(
                sections,
                (reorderedSections) => {
                    console.log('Saving new section order:', reorderedSections);
                    this.applySectionReorder(reorderedSections, groupIdToName);
                }
            );

            if (!result) {
                console.error('Failed to create reorder offcanvas');
                window.showAlert('Failed to open reorder panel', 'error');
            }

        } catch (error) {
            console.error('Error showing reorder offcanvas:', error);
            window.showAlert('Failed to open reorder panel', 'error');
        }
    }

    /**
     * Build sections list for the sections reorder offcanvas.
     * Groups exercises by block_id/sections, includes template notes and session notes.
     * @returns {{ sections: Array, groupIdToName: Map }} Sections and ID-to-name mapping
     */
    buildSectionsList() {
        const currentWorkout = this.onGetCurrentWorkout();
        const groupIdToName = new Map();
        if (!currentWorkout) return { sections: [], groupIdToName };

        const exerciseGroups = currentWorkout.exercise_groups || [];
        const templateNotes = currentWorkout.template_notes || [];
        const sessionNotes = this.sessionService.getSessionNotes() || [];

        // Helper to build an item for the offcanvas
        const buildItem = (group) => {
            const item = { groupId: group.group_id };

            if (group.group_type === 'cardio') {
                const config = group.cardio_config || {};
                let activityName = config.activity_type || '';
                if (activityName && window.ActivityTypeRegistry) {
                    activityName = window.ActivityTypeRegistry.getName(activityName) || activityName;
                }
                item.name = activityName || 'Activity';
                item.isCardio = true;
                item.sets = config.duration_minutes ? `${config.duration_minutes} min` : '';
                item.reps = config.distance ? `${config.distance} ${config.distance_unit || 'mi'}` : '';
            } else if (group.group_type === 'note') {
                const preview = group.note_content
                    ? (group.note_content.length > 40 ? group.note_content.substring(0, 40) + '...' : group.note_content)
                    : 'Empty note';
                item.name = preview;
                item.isNote = true;
            } else {
                item.name = group.exercises?.a || 'Exercise';
                item.sets = group.sets || '';
                item.reps = group.reps || '';
            }

            // Map groupId back to the name used by session service
            const sessionName = group.exercises?.a || item.name;
            groupIdToName.set(group.group_id, sessionName);
            return item;
        };

        let sections = [];
        const hasSections = currentWorkout.sections?.some(s => s.type !== 'standard');

        if (hasSections) {
            // Build from explicit sections data
            const groupLookup = new Map();
            exerciseGroups.forEach(g => groupLookup.set(g.group_id, g));
            const nameLookup = new Map();
            exerciseGroups.forEach(g => {
                const name = g.exercises?.a;
                if (name && !nameLookup.has(name)) nameLookup.set(name, g);
            });
            const placedGroupIds = new Set();

            (currentWorkout.sections || []).forEach(section => {
                const isNamed = section.type !== 'standard';
                const exercises = [];
                section.exercises.forEach(sectionExercise => {
                    let group = groupLookup.get(sectionExercise.exercise_id);
                    if (!group) group = nameLookup.get(sectionExercise.name);
                    if (group) {
                        exercises.push(buildItem(group));
                        placedGroupIds.add(group.group_id);
                    }
                });

                if (exercises.length > 0 || isNamed) {
                    sections.push({
                        sectionId: section.section_id || `section-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        sectionType: isNamed ? section.type : 'standard',
                        sectionName: isNamed ? (section.name || section.type) : null,
                        sectionDescription: null,
                        exercises
                    });
                }
            });

            // Safety net: add unplaced exercise_groups
            exerciseGroups.forEach(group => {
                if (!placedGroupIds.has(group.group_id)) {
                    sections.push({
                        sectionId: `section-${group.group_id}`,
                        sectionType: 'standard',
                        sectionName: null,
                        sectionDescription: null,
                        exercises: [buildItem(group)]
                    });
                }
            });
        } else {
            // Group by block_id, maintaining original order
            const blockGroups = new Map();
            const processedBlocks = new Set();

            exerciseGroups.forEach(group => {
                if (group.block_id) {
                    if (!blockGroups.has(group.block_id)) {
                        blockGroups.set(group.block_id, {
                            name: group.group_name || 'Block',
                            exercises: []
                        });
                    }
                    blockGroups.get(group.block_id).exercises.push(buildItem(group));
                }
            });

            exerciseGroups.forEach(group => {
                if (group.block_id && !processedBlocks.has(group.block_id)) {
                    processedBlocks.add(group.block_id);
                    const block = blockGroups.get(group.block_id);
                    sections.push({
                        sectionId: group.block_id,
                        sectionType: 'block',
                        sectionName: block.name,
                        sectionDescription: null,
                        exercises: block.exercises
                    });
                } else if (!group.block_id) {
                    sections.push({
                        sectionId: `section-${group.group_id}`,
                        sectionType: 'standard',
                        sectionName: null,
                        sectionDescription: null,
                        exercises: [buildItem(group)]
                    });
                }
            });
        }

        // Add template notes as standalone items
        templateNotes.forEach(note => {
            const noteGroupId = `template-note-${note.id}`;
            const preview = note.content
                ? (note.content.length > 40 ? note.content.substring(0, 40) + '...' : note.content)
                : 'Empty note';
            groupIdToName.set(noteGroupId, noteGroupId);
            sections.push({
                sectionId: `section-tn-${note.id}`,
                sectionType: 'standard',
                sectionName: null,
                sectionDescription: null,
                exercises: [{ groupId: noteGroupId, name: preview, isNote: true }]
            });
        });

        // Add session notes as standalone items
        sessionNotes.forEach(note => {
            const noteGroupId = `note-${note.id}`;
            const preview = note.content
                ? (note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content)
                : 'Empty note';
            groupIdToName.set(noteGroupId, noteGroupId);
            sections.push({
                sectionId: `section-sn-${note.id}`,
                sectionType: 'standard',
                sectionName: null,
                sectionDescription: null,
                exercises: [{ groupId: noteGroupId, name: preview, isNote: true }]
            });
        });

        // Apply current custom order to section ordering
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            // Build reverse lookup: name -> first position in custom order
            const nameToPos = new Map();
            customOrder.forEach((name, idx) => nameToPos.set(name, idx));

            sections.sort((a, b) => {
                const aName = this._getSectionSortName(a, groupIdToName);
                const bName = this._getSectionSortName(b, groupIdToName);
                const aPos = nameToPos.has(aName) ? nameToPos.get(aName) : Infinity;
                const bPos = nameToPos.has(bName) ? nameToPos.get(bName) : Infinity;
                return aPos - bPos;
            });
        }

        return { sections, groupIdToName };
    }

    /**
     * Get the session-service name for a section's first exercise (for sort ordering)
     * @private
     */
    _getSectionSortName(section, groupIdToName) {
        const firstEx = section.exercises[0];
        if (!firstEx) return '';
        return groupIdToName.get(firstEx.groupId) || firstEx.name || firstEx.groupId || '';
    }

    /**
     * Apply section-structured reorder from the sections reorder offcanvas.
     * Converts sections output back to flat name order for session service.
     * @param {Array} reorderedSections - [{ sectionId, sectionType, sectionName, exerciseIds: [...] }]
     * @param {Map} groupIdToName - Mapping from groupId to session-service name
     */
    applySectionReorder(reorderedSections, groupIdToName) {
        try {
            if (!Array.isArray(reorderedSections) || reorderedSections.length === 0) {
                console.error('Invalid sections array:', reorderedSections);
                window.showAlert('Invalid exercise order', 'error');
                return;
            }

            // Flatten sections into ordered name list for session service
            const nameOrder = [];
            reorderedSections.forEach(section => {
                (section.exerciseIds || []).forEach(groupId => {
                    const name = groupIdToName.get(groupId) || groupId;
                    nameOrder.push(name);
                });
            });

            // Preserve timer state before re-render
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();

            // Update block membership on exercise_groups based on section placement
            const currentWorkout = this.onGetCurrentWorkout();
            if (currentWorkout?.exercise_groups) {
                // Build groupId -> exercise_group lookup
                const groupLookup = new Map();
                currentWorkout.exercise_groups.forEach(g => groupLookup.set(g.group_id, g));

                reorderedSections.forEach(section => {
                    const isNamed = section.sectionType !== 'standard';
                    (section.exerciseIds || []).forEach(groupId => {
                        const group = groupLookup.get(groupId);
                        if (!group) return;
                        if (isNamed) {
                            group.block_id = section.sectionId;
                            group.group_name = section.sectionName || null;
                        } else {
                            group.block_id = null;
                            group.group_name = null;
                        }
                    });
                });
            }

            // Save to session service
            this.sessionService.setExerciseOrder(nameOrder);

            // Re-render workout with new order
            this.onRenderWorkout();

            // Restore timer state if it was inadvertently cleared
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                    console.log('Timer restored after reorder:', preservedTime);
                }
            }

            // Show success feedback
            window.showAlert('Exercise order updated successfully', 'success');

            // Auto-save if session is active
            if (this.sessionService.isSessionActive()) {
                console.log('Auto-saving session with new order...');
                this.onAutoSave();
            }

            console.log('Section reorder applied successfully');

        } catch (error) {
            console.error('Error applying section reorder:', error);
            window.showAlert('Failed to update exercise order', 'error');
        }
    }

    /**
     * Build flat item list for reorder (used by move up/down and getCurrentExerciseOrder)
     * @returns {Array} Array of item objects with name, isNote, displayName properties
     */
    buildExerciseList() {
        const itemList = [];
        const currentWorkout = this.onGetCurrentWorkout();

        // Gather regular exercises from workout template
        if (currentWorkout?.exercise_groups && currentWorkout.exercise_groups.length > 0) {
            currentWorkout.exercise_groups.forEach((group) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    itemList.push({
                        name: exerciseName,
                        displayName: exerciseName,
                        isNote: false,
                        blockId: group.block_id || null,
                        blockName: group.group_name || null,
                        sets: group.sets,
                        reps: group.reps
                    });
                }
            });
        }

        // Gather session notes
        const sessionNotes = this.sessionService.getSessionNotes();
        if (sessionNotes && sessionNotes.length > 0) {
            sessionNotes.forEach((note) => {
                const truncatedContent = note.content?.substring(0, 30) || 'Empty note';
                itemList.push({
                    name: `note-${note.id}`,
                    displayName: truncatedContent + (note.content?.length > 30 ? '...' : ''),
                    isNote: true,
                    noteId: note.id
                });
            });
        }

        // Apply current custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            const orderedList = [];
            customOrder.forEach(name => {
                const item = itemList.find(ex => ex.name === name);
                if (item) orderedList.push(item);
            });
            itemList.forEach(ex => {
                if (!customOrder.includes(ex.name)) orderedList.push(ex);
            });
            return orderedList;
        }

        return itemList;
    }

    /**
     * Apply new exercise order (used by move up/down)
     * Saves order to session and re-renders workout
     * @param {Array} newOrder - Array of exercise names in new order
     */
    applyExerciseOrder(newOrder) {
        try {
            if (!Array.isArray(newOrder) || newOrder.length === 0) {
                console.error('Invalid order array:', newOrder);
                window.showAlert('Invalid exercise order', 'error');
                return;
            }

            const nameOrder = newOrder.map(ex => typeof ex === 'string' ? ex : ex.name);

            // Preserve timer state before re-render
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();

            // Update block membership on the workout's exercise_groups
            const currentWorkout = this.onGetCurrentWorkout();
            if (currentWorkout?.exercise_groups) {
                newOrder.forEach(item => {
                    if (!item || typeof item === 'string' || item.isNote) return;
                    const group = currentWorkout.exercise_groups.find(
                        g => g.exercises?.a === item.name
                    );
                    if (group) {
                        group.block_id = item.blockId || null;
                        group.group_name = item.blockName || null;
                    }
                });
            }

            // Save to session service
            this.sessionService.setExerciseOrder(nameOrder);

            // Re-render workout with new order
            this.onRenderWorkout();

            // Restore timer state if it was inadvertently cleared
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                    console.log('Timer restored after reorder:', preservedTime);
                }
            }

            window.showAlert('Exercise order updated successfully', 'success');

            if (this.sessionService.isSessionActive()) {
                this.onAutoSave();
            }

        } catch (error) {
            console.error('Error applying exercise order:', error);
            window.showAlert('Failed to update exercise order', 'error');
        }
    }

    /**
     * Apply exercise order without showing success toast
     * Used for quick repeated moves where toast would be annoying
     * @param {string[]} newOrder - Array of exercise names in new order
     */
    applyExerciseOrderSilent(newOrder) {
        try {
            if (!Array.isArray(newOrder) || newOrder.length === 0) {
                console.error('Invalid order array:', newOrder);
                return;
            }

            // Preserve timer state before re-render
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();

            // Save to session service
            this.sessionService.setExerciseOrder(newOrder);

            // Re-render workout with new order
            this.onRenderWorkout();

            // Restore timer state if needed
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                }
            }

            // Auto-save if session is active
            if (this.sessionService.isSessionActive()) {
                this.onAutoSave();
            }

        } catch (error) {
            console.error('Error applying exercise order silently:', error);
        }
    }

    /**
     * Move exercise up one position
     * @param {number} index - Current exercise index
     */
    handleMoveUp(index) {
        if (index <= 0) return;
        this.moveExercise(index, index - 1);
    }

    /**
     * Move exercise down one position
     * @param {number} index - Current exercise index
     */
    handleMoveDown(index) {
        const currentOrder = this.getCurrentExerciseOrder();
        if (index >= currentOrder.length - 1) return;
        this.moveExercise(index, index + 1);
    }

    /**
     * Move exercise from one position to another
     * Keeps menu open on the moved card for quick repeated moves
     * @param {number} fromIndex - Original position
     * @param {number} toIndex - Target position
     */
    moveExercise(fromIndex, toIndex) {
        try {
            // Get current exercise order
            const currentOrder = this.getCurrentExerciseOrder();

            // Swap positions
            const [movedItem] = currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, movedItem);

            // Apply new order without showing toast (for quick repeated moves)
            this.applyExerciseOrderSilent(currentOrder);

            // Reopen menu at the new position
            setTimeout(() => {
                this.reopenMenuAtIndex(toIndex);
            }, 50);

        } catch (error) {
            console.error('Error moving exercise:', error);
        }
    }

    /**
     * Get current exercise order as array of names
     * @returns {string[]} Exercise names in current order
     */
    getCurrentExerciseOrder() {
        const exerciseList = this.buildExerciseList();
        return exerciseList.map(ex => ex.name);
    }

    /**
     * Reopen the exercise menu at a specific index
     * Used after moving an exercise to keep the menu open for quick repeated moves
     * @param {number} index - Exercise index to open menu for
     */
    reopenMenuAtIndex(index) {
        const container = document.getElementById('exerciseCardsContainer');
        const card = container?.querySelector(`[data-exercise-index="${index}"]`);
        if (!card) return;

        const moreBtn = card.querySelector('.workout-more-btn');
        if (moreBtn) {
            // Get exercise name from card
            const exerciseName = card.dataset.exerciseName || '';
            this.onToggleExerciseMenu(moreBtn, exerciseName, index);
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutReorderManager;
}

console.log('📦 Workout Reorder Manager loaded');
