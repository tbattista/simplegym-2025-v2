/**
 * Fitness Field Notes - Workout Render Manager
 * Orchestrates rendering workout cards, timers, and field controllers
 * Extracted from WorkoutModeController to separate rendering concerns
 * @version 1.0.0
 * @date 2026-02-13
 */

class WorkoutRenderManager {
    constructor(options) {
        this.sessionService = options.sessionService;
        this.cardRenderer = options.cardRenderer;
        this.noteCardRenderer = options.noteCardRenderer;
        this.timerManager = options.timerManager;
        this.cardManager = null;
        this._lastSectionMeta = null;

        console.log('🎨 Workout Render Manager initialized');
    }

    /**
     * Main render method - builds and injects exercise card HTML into the DOM
     * Handles template notes, bonus exercises, session notes, and custom ordering
     * @param {Object} currentWorkout - The current workout object
     * @param {boolean} forceRender - Force re-render even if unchanged
     */
    render(currentWorkout, forceRender = false) {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;

        if (!currentWorkout) {
            console.warn('⚠️ Cannot render workout: currentWorkout is undefined');
            return;
        }

        let html = '';
        let exerciseIndex = 0;

        // Calculate total cards
        const regularCount = currentWorkout.exercise_groups?.length || 0;
        const bonusExercises = this.sessionService.getBonusExercises();
        const bonusCount = bonusExercises?.length || 0;
        const sessionNotes = this.sessionService.getSessionNotes();
        const noteCount = sessionNotes?.length || 0;
        const templateNotes = currentWorkout.template_notes || [];
        const templateNoteCount = templateNotes.length;
        const totalCards = regularCount + bonusCount + noteCount + templateNoteCount;

        // Build combined item list (exercises + notes)
        const hasSectionBlocks = currentWorkout.sections?.some(s => s.type !== 'standard');
        const allItems = hasSectionBlocks
            ? this._buildSectionedItemList(currentWorkout, bonusExercises, sessionNotes, templateNotes)
            : this._buildItemList(currentWorkout, bonusExercises, sessionNotes, templateNotes);
        if (!hasSectionBlocks) this._lastSectionMeta = null;

        // Apply custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            console.log('📋 Applying custom item order:', customOrder);
            this._applyCustomOrder(allItems, customOrder);
        }

        // Compute section position metadata after custom ordering
        if (hasSectionBlocks) {
            this._lastSectionMeta = this._computeSectionMeta(allItems);
        }

        // Render items in order
        allItems.forEach((item) => {
            if (item.type === 'template_note') {
                html += this.renderReadOnlyTemplateNote(item.data, exerciseIndex, totalCards);
            } else if (item.type === 'note') {
                if (this.noteCardRenderer) {
                    html += this.noteCardRenderer.renderCard(item.data, exerciseIndex, totalCards);
                } else {
                    console.warn('⚠️ NoteCardRenderer not available');
                }
            } else {
                const isBonus = item.subtype === 'bonus';
                html += this.cardRenderer.renderCard(item.data, exerciseIndex, isBonus, totalCards);
            }
            exerciseIndex++;
        });

        container.innerHTML = html;

        // Apply visual block grouping for sectioned workouts
        if (this._lastSectionMeta) {
            this._applyWorkoutBlockGrouping(container);
        }

        // Initialize or update Card Manager
        if (!this.cardManager) {
            this.cardManager = new ExerciseCardManager({
                containerSelector: '#exerciseCardsContainer',
                sessionService: this.sessionService,
                timerManager: this.timerManager,
                workout: currentWorkout
            });
        } else {
            this.cardManager.updateWorkout(currentWorkout);
        }

        // Initialize timers
        this.timerManager.initializeGlobalTimer();
        this.timerManager.initializeCardTimers();

        // Initialize inline rest timers
        this._initializeInlineTimers();

        // Initialize logbook field controllers
        this._initializeLogbookControllers();
    }

    /**
     * Build the combined item list from exercises, notes, and template notes
     * @private
     */
    _buildItemList(currentWorkout, bonusExercises, sessionNotes, templateNotes) {
        const allItems = [];

        // Build template notes map for interleaving
        const templateNotesMap = new Map();
        templateNotes.forEach((note) => {
            templateNotesMap.set(note.order_index, {
                type: 'template_note',
                data: note,
                name: `template-note-${note.id}`,
                order_index: note.order_index
            });
        });

        // Add regular exercises with interleaved template notes
        if (currentWorkout.exercise_groups && currentWorkout.exercise_groups.length > 0) {
            let currentIndex = 0;
            currentWorkout.exercise_groups.forEach((group) => {
                while (templateNotesMap.has(currentIndex)) {
                    allItems.push(templateNotesMap.get(currentIndex));
                    templateNotesMap.delete(currentIndex);
                    currentIndex++;
                }
                allItems.push({
                    type: 'exercise',
                    subtype: 'regular',
                    data: group,
                    name: group.exercises?.a
                });
                currentIndex++;
            });

            // Add remaining template notes at the end
            templateNotesMap.forEach((noteItem) => {
                allItems.push(noteItem);
            });
        } else {
            // No exercises, just add template notes
            templateNotes.forEach((note) => {
                allItems.push({
                    type: 'template_note',
                    data: note,
                    name: `template-note-${note.id}`
                });
            });
        }

        // Add bonus exercises
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                allItems.push({
                    type: 'exercise',
                    subtype: 'bonus',
                    data: {
                        exercises: { a: bonus.name },
                        sets: bonus.sets,
                        reps: bonus.reps,
                        rest: bonus.rest || '60s',
                        default_weight: bonus.weight,
                        default_weight_unit: bonus.weight_unit || 'lbs',
                        notes: bonus.notes
                    },
                    name: bonus.name
                });
            });
        }

        // Add session notes
        if (sessionNotes && sessionNotes.length > 0) {
            sessionNotes.forEach((note) => {
                allItems.push({
                    type: 'note',
                    data: note,
                    name: `note-${note.id}`
                });
            });
        }

        return allItems;
    }

    /**
     * Build item list using sections data for structured block grouping.
     * @private
     */
    _buildSectionedItemList(currentWorkout, bonusExercises, sessionNotes, templateNotes) {
        const allItems = [];

        // Build lookup: group_id -> exercise_group
        const groupLookup = new Map();
        (currentWorkout.exercise_groups || []).forEach(g => {
            groupLookup.set(g.group_id, g);
        });

        // Fallback: name -> exercise_group
        const nameLookup = new Map();
        (currentWorkout.exercise_groups || []).forEach(g => {
            const name = g.exercises?.a;
            if (name && !nameLookup.has(name)) nameLookup.set(name, g);
        });

        const placedGroupIds = new Set();

        // Build template notes map for interleaving
        const templateNotesMap = new Map();
        (templateNotes || []).forEach(note => {
            templateNotesMap.set(note.order_index, {
                type: 'template_note',
                data: note,
                name: `template-note-${note.id}`,
                order_index: note.order_index
            });
        });

        // Iterate sections in order
        let currentIndex = 0;
        (currentWorkout.sections || []).forEach(section => {
            const isNamed = section.type !== 'standard';

            section.exercises.forEach(sectionExercise => {
                // Interleave template notes by order_index
                while (templateNotesMap.has(currentIndex)) {
                    allItems.push(templateNotesMap.get(currentIndex));
                    templateNotesMap.delete(currentIndex);
                    currentIndex++;
                }

                // Find matching exercise_group
                let group = groupLookup.get(sectionExercise.exercise_id);
                if (!group) group = nameLookup.get(sectionExercise.name);

                if (group) {
                    allItems.push({
                        type: 'exercise',
                        subtype: 'regular',
                        data: group,
                        name: group.exercises?.a,
                        sectionId: isNamed ? section.section_id : null,
                        sectionType: isNamed ? section.type : null,
                        sectionName: isNamed ? (section.name || section.type) : null
                    });
                    placedGroupIds.add(group.group_id);
                }
                currentIndex++;
            });
        });

        // Add remaining template notes
        templateNotesMap.forEach(noteItem => allItems.push(noteItem));

        // Safety net: add exercise_groups not covered by sections
        (currentWorkout.exercise_groups || []).forEach(group => {
            if (!placedGroupIds.has(group.group_id)) {
                allItems.push({
                    type: 'exercise',
                    subtype: 'regular',
                    data: group,
                    name: group.exercises?.a
                });
            }
        });

        // Add bonus exercises
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach(bonus => {
                allItems.push({
                    type: 'exercise',
                    subtype: 'bonus',
                    data: {
                        exercises: { a: bonus.name },
                        sets: bonus.sets,
                        reps: bonus.reps,
                        rest: bonus.rest || '60s',
                        default_weight: bonus.weight,
                        default_weight_unit: bonus.weight_unit || 'lbs',
                        notes: bonus.notes
                    },
                    name: bonus.name
                });
            });
        }

        // Add session notes
        if (sessionNotes && sessionNotes.length > 0) {
            sessionNotes.forEach(note => {
                allItems.push({
                    type: 'note',
                    data: note,
                    name: `note-${note.id}`
                });
            });
        }

        return allItems;
    }

    /**
     * Compute section position metadata from the final ordered items array.
     * Finds consecutive runs of exercises sharing a sectionId and assigns positional labels.
     * @private
     */
    _computeSectionMeta(allItems) {
        const meta = new Map();

        // Collect exercise items that have section metadata, with their render indices
        const sectionItems = [];
        let renderIndex = 0;
        allItems.forEach(item => {
            if (item.sectionId) {
                sectionItems.push({
                    renderIndex,
                    sectionId: item.sectionId,
                    sectionType: item.sectionType,
                    sectionName: item.sectionName
                });
            }
            renderIndex++;
        });

        // Find consecutive runs of same sectionId and assign positions
        let i = 0;
        while (i < sectionItems.length) {
            const sectionId = sectionItems[i].sectionId;
            let j = i;
            while (j < sectionItems.length && sectionItems[j].sectionId === sectionId) j++;

            const runLength = j - i;
            for (let k = i; k < j; k++) {
                let position;
                if (runLength === 1) position = 'only';
                else if (k === i) position = 'first';
                else if (k === j - 1) position = 'last';
                else position = 'middle';

                meta.set(sectionItems[k].renderIndex, {
                    sectionId: sectionItems[k].sectionId,
                    sectionType: sectionItems[k].sectionType,
                    sectionName: sectionItems[k].sectionName,
                    position
                });
            }
            i = j;
        }

        return meta;
    }

    /**
     * Apply visual block grouping to rendered workout cards.
     * Adds CSS classes and injects block-group-header divs.
     * @private
     */
    _applyWorkoutBlockGrouping(container) {
        if (!this._lastSectionMeta || this._lastSectionMeta.size === 0) return;

        const iconMap = {
            circuit: 'bx-refresh',
            superset: 'bx-transfer',
            tabata: 'bx-timer',
            emom: 'bx-time-five',
            amrap: 'bx-infinite'
        };

        this._lastSectionMeta.forEach((info, exerciseIndex) => {
            const card = container.querySelector(`.workout-card[data-exercise-index="${exerciseIndex}"]`);
            if (!card) return;

            card.classList.add('exercise-in-block');

            switch (info.position) {
                case 'only':
                    card.classList.add('block-first', 'block-last');
                    break;
                case 'first':
                    card.classList.add('block-first');
                    break;
                case 'middle':
                    card.classList.add('block-middle');
                    break;
                case 'last':
                    card.classList.add('block-last');
                    break;
            }

            // Inject block header before first/only cards
            if (info.position === 'first' || info.position === 'only') {
                const icon = iconMap[info.sectionType] || 'bx-collection';
                const name = info.sectionName || info.sectionType || 'Block';
                const label = name.charAt(0).toUpperCase() + name.slice(1);

                card.insertAdjacentHTML('beforebegin',
                    `<div class="block-group-header" data-section-id="${info.sectionId}">
                        <span class="block-group-label">
                            <i class="bx ${icon}"></i>
                            ${label}
                        </span>
                    </div>`);
            }
        });
    }

    /**
     * Apply custom order to items array in-place
     * @private
     */
    _applyCustomOrder(allItems, customOrder) {
        const orderedItems = [];
        customOrder.forEach(name => {
            const item = allItems.find(ex => ex.name === name);
            if (item) orderedItems.push(item);
        });

        // Add any items not in custom order (safety)
        allItems.forEach(ex => {
            if (!customOrder.includes(ex.name)) {
                orderedItems.push(ex);
            }
        });

        allItems.splice(0, allItems.length, ...orderedItems);
    }

    /**
     * Render a read-only template note card
     * @param {Object} note - Template note data
     * @param {number} index - Card index
     * @param {number} totalCards - Total number of cards
     * @returns {string} HTML string
     */
    renderReadOnlyTemplateNote(note, index, totalCards) {
        const noteId = note.id || `template-note-${Date.now()}`;
        const content = note.content || '';
        const truncatedContent = content.length > 150 ? content.substring(0, 150) + '...' : content;
        const displayText = truncatedContent || 'Empty note';
        const hasContent = content.length > 0;

        const escapeHtml = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        return `
            <div class="template-note-card-readonly" data-note-id="${escapeHtml(noteId)}" data-card-type="template-note">
                <div class="card border-info border-opacity-50">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex align-items-start gap-2">
                            <div class="template-note-icon">
                                <i class="bx bx-pin text-info"></i>
                            </div>
                            <div class="template-note-content flex-grow-1">
                                <div class="template-note-label text-info small fw-semibold mb-1">
                                    TEMPLATE NOTE
                                </div>
                                <div class="template-note-text ${hasContent ? '' : 'text-muted fst-italic'}">
                                    ${escapeHtml(displayText)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize inline rest timers for exercise cards
     * @private
     */
    _initializeInlineTimers() {
        this.timerManager.clearAllInlineTimers();

        const timerContainers = document.querySelectorAll('[data-inline-timer]');

        timerContainers.forEach(container => {
            const exerciseIndex = parseInt(container.getAttribute('data-inline-timer'));
            const timerWrapper = container.closest('.inline-rest-timer');
            const restSeconds = parseInt(timerWrapper?.getAttribute('data-rest-seconds')) || 60;
            const restDisplay = timerWrapper?.getAttribute('data-rest-display') || `${restSeconds}s`;

            if (window.InlineRestTimer) {
                const timer = new window.InlineRestTimer(exerciseIndex, restSeconds);
                timer.setRestDisplayText(restDisplay);
                this.timerManager.registerInlineTimer(exerciseIndex, timer);
                timer.render();
                console.log(`⏱️ Inline timer initialized for exercise ${exerciseIndex}: ${restDisplay}`);
            }
        });

        console.log(`✅ Initialized ${timerContainers.length} inline timers`);
    }

    /**
     * Initialize Logbook V2 field controllers after cards are rendered
     * @private
     */
    _initializeLogbookControllers() {
        try {
            // Weight field controllers
            if (window.initializeWeightFields) {
                window.initializeWeightFields(this.sessionService);
                console.log('✅ Logbook V2: Weight field controllers initialized');
            } else {
                console.warn('⚠️ Logbook V2: initializeWeightFields not available');
            }

            // Reps/sets field controllers
            if (window.initializeRepsSetsFields) {
                window.initializeRepsSetsFields(this.sessionService);
                console.log('✅ Logbook V2: Reps/Sets field controllers initialized');
            } else {
                console.warn('⚠️ Logbook V2: initializeRepsSetsFields not available');
            }

            // Unified edit controllers
            if (window.UnifiedEditController) {
                const exerciseCards = document.querySelectorAll('.workout-card');
                exerciseCards.forEach((card) => {
                    const exerciseIndex = card.getAttribute('data-exercise-index');
                    const exerciseName = card.getAttribute('data-exercise-name');

                    if (exerciseIndex !== null && exerciseName) {
                        const weightFieldContainer = card.querySelector('.workout-weight-field');
                        const repsSetsFieldContainer = card.querySelector('.workout-repssets-field');
                        const weightController = weightFieldContainer?.weightController;
                        const repsSetsController = repsSetsFieldContainer?.repsSetsController;

                        if (weightController && repsSetsController) {
                            const unifiedController = new window.UnifiedEditController(
                                card,
                                weightController,
                                repsSetsController
                            );
                            card.unifiedEditController = unifiedController;
                            console.log(`✅ Unified edit controller initialized for ${exerciseName} (index ${exerciseIndex})`);
                        } else {
                            console.warn(`⚠️ Missing field controllers for ${exerciseName} (index ${exerciseIndex})`, {
                                hasWeightContainer: !!weightFieldContainer,
                                hasRepsSetsContainer: !!repsSetsFieldContainer,
                                hasWeightController: !!weightController,
                                hasRepsSetsController: !!repsSetsController
                            });
                        }
                    }
                });
                console.log('✅ Logbook V2: Unified edit controllers initialized');
            } else {
                console.warn('⚠️ Logbook V2: UnifiedEditController not available');
            }

            // Dispatch event for unified notes controller
            document.dispatchEvent(new CustomEvent('exerciseCardsRendered'));
            console.log('✅ exerciseCardsRendered event dispatched');
            console.log('✅ Logbook V2: All field controllers initialized');
        } catch (error) {
            console.error('❌ Error initializing Logbook V2 controllers:', error);
        }
    }

    /**
     * Get all exercise names in current render order
     * Used for updating exercise order during replacements
     * @param {Object} currentWorkout - Current workout object
     * @returns {string[]} Array of exercise names in order
     */
    getAllExerciseNames(currentWorkout) {
        const allExercises = [];

        // Add regular exercises
        if (currentWorkout?.exercise_groups && currentWorkout.exercise_groups.length > 0) {
            currentWorkout.exercise_groups.forEach((group) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    allExercises.push({ type: 'regular', name: exerciseName });
                }
            });
        }

        // Add bonus exercises
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                allExercises.push({ type: 'bonus', name: bonus.name });
            });
        }

        // Apply custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            const orderedExercises = [];
            customOrder.forEach(name => {
                const exercise = allExercises.find(ex => ex.name === name);
                if (exercise) orderedExercises.push(exercise);
            });
            allExercises.forEach(ex => {
                if (!customOrder.includes(ex.name)) orderedExercises.push(ex);
            });
            return orderedExercises.map(ex => ex.name);
        }

        return allExercises.map(ex => ex.name);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutRenderManager;
}

console.log('📦 Workout Render Manager loaded');
