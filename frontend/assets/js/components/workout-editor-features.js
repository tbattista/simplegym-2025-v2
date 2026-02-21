/**
 * Ghost Gym - Workout Editor Features
 * Specialized features: muscle summary, exercise reorder, autocomplete initialization
 * Extracted from workout-editor.js
 * @version 1.0.0
 */

// ============================================
// MUSCLE GROUP SUMMARY
// ============================================

// Debounce timer for muscle summary updates
let muscleSummaryTimeout = null;

/**
 * Schedule a debounced muscle summary update
 * Prevents excessive updates while user is typing
 */
function scheduleMuscleSummaryUpdate() {
    if (muscleSummaryTimeout) {
        clearTimeout(muscleSummaryTimeout);
    }
    muscleSummaryTimeout = setTimeout(updateMuscleSummary, 300);
}

/**
 * Update the muscle group summary display
 * Computes muscle breakdown from current exercise groups
 */
function updateMuscleSummary() {
    const container = document.getElementById('muscleSummaryContainer');
    const textEl = document.getElementById('muscleSummaryText');

    if (!container || !textEl) return;

    // Check if muscle summary service is available
    if (!window.muscleGroupSummaryService) {
        console.warn('[MuscleSummary] Service not available');
        container.style.display = 'none';
        return;
    }

    // Wait for exercise cache to be ready before computing summary
    const cache = window.exerciseCacheService;
    if (!cache || (cache.exercises?.length === 0 && !cache.seedDataUsed)) {
        // Subscribe to cache load event and retry
        if (cache && !cache._muscleSummarySubscribed) {
            cache._muscleSummarySubscribed = true;
            cache.on('fullDataLoaded', () => updateMuscleSummary());
            cache.on('customLoaded', () => updateMuscleSummary()); // Also refresh when custom exercises load
        }
        container.style.display = 'none';
        return;
    }

    // Get exercise groups from current data
    const exerciseGroups = window.collectExerciseGroups ? window.collectExerciseGroups() : [];

    // Compute summary for editor (full detail with unknown count)
    const summary = window.muscleGroupSummaryService.forEditor(exerciseGroups);

    // Update display
    if (summary.totalExercises === 0 || !summary.displayText) {
        container.style.display = 'none';
        return;
    }

    textEl.textContent = summary.displayText;
    container.style.display = 'block';

    console.log('[MuscleSummary] Updated:', summary.displayText);
}

// ============================================
// EXERCISE REORDER
// ============================================

/**
 * Open the reorder offcanvas with current exercise groups.
 * Uses the flat reorder offcanvas with block inference for both modes.
 * In sections mode: flattens sections → exercises with blockId = sectionId,
 * then reconstructs sections from the reordered flat result.
 */
function openReorderOffcanvas() {
    const container = document.getElementById('exerciseGroups');
    if (!container) {
        console.error('Exercise groups container not found');
        return;
    }

    if (!window.UnifiedOffcanvasFactory?.createReorderOffcanvas) {
        alert('Reorder feature is not available. Please refresh the page.');
        return;
    }

    const isSectionsMode = window.SectionManager?.isSectionsMode();

    if (isSectionsMode) {
        // Sections mode: two-level reorder matching desktop drag behavior
        if (!window.UnifiedOffcanvasFactory?.createSectionsReorderOffcanvas) {
            alert('Sections reorder feature is not available. Please refresh the page.');
            return;
        }

        const sections = [];
        container.querySelectorAll('.workout-section').forEach(sectionEl => {
            const sectionId = sectionEl.dataset.sectionId;
            const sectionType = sectionEl.dataset.sectionType || 'standard';
            const sectionName = sectionEl.querySelector('.section-name-input')?.value?.trim()
                || sectionEl.querySelector('.section-name')?.textContent?.trim() || null;
            const sectionDescription = sectionEl.querySelector('.section-description-input')?.value?.trim() || null;
            const isNamed = sectionType !== 'standard';

            const exercises = [];
            sectionEl.querySelectorAll('.exercise-group-card').forEach(card => {
                const groupId = card.getAttribute('data-group-id');
                const groupData = window.exerciseGroupsData?.[groupId] || {};
                exercises.push({
                    groupId,
                    name: groupData.exercises?.a || 'Exercise',
                    sets: groupData.sets || '3',
                    reps: groupData.reps || '8-12'
                });
            });

            // Include named sections even if empty (user can drag exercises into them)
            if (exercises.length > 0 || isNamed) {
                sections.push({
                    sectionId,
                    sectionType,
                    sectionName: isNamed ? (sectionName || sectionType.charAt(0).toUpperCase() + sectionType.slice(1)) : null,
                    sectionDescription: isNamed ? sectionDescription : null,
                    exercises
                });
            }
        });

        console.log('Opening sections reorder (two-level):', sections.length, 'sections');
        window.UnifiedOffcanvasFactory.createSectionsReorderOffcanvas(sections, applySectionReorder);
        return;
    }

    // Legacy mode: flat list with block inference
    const cards = container.querySelectorAll('.exercise-group-card');
    const exercises = Array.from(cards).map((card, index) => {
        const groupId = card.getAttribute('data-group-id');
        const groupData = window.exerciseGroupsData?.[groupId] || {};
        return {
            groupId: groupId,
            name: groupData.exercises?.a || `Exercise ${index + 1}`,
            sets: groupData.sets || '3',
            reps: groupData.reps || '8-12',
            blockId: groupData.block_id || null,
            blockName: groupData.group_name || null,
            index: index
        };
    });

    window.UnifiedOffcanvasFactory.createReorderOffcanvas(exercises, applyLegacyReorder);
}

/**
 * Apply section-structured reorder from the sections reorder offcanvas.
 * Rebuilds the builder DOM by re-rendering sections via SectionManager.
 * @param {Array} reorderedSections - [{ sectionId, sectionType, sectionName, exerciseIds: [...] }]
 */
function applySectionReorder(reorderedSections) {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log('📋 Applying section reorder:', reorderedSections);

    // Build full sections data for SectionManager.renderSections()
    const sections = reorderedSections.map(rs => ({
        section_id: rs.sectionId,
        type: rs.sectionType,
        name: rs.sectionName || null,
        description: rs.sectionDescription || null,
        exercises: rs.exerciseIds.map(groupId => {
            const data = window.exerciseGroupsData?.[groupId] || {};
            const primaryName = data.exercises?.a || '';
            const alternates = [];
            Object.keys(data.exercises || {}).sort().forEach(key => {
                if (key !== 'a' && data.exercises[key]) {
                    alternates.push(data.exercises[key]);
                }
            });
            return {
                exercise_id: groupId,
                name: primaryName,
                alternates,
                sets: data.sets || '3',
                reps: data.reps || '8-12',
                rest: data.rest || '60s',
                default_weight: data.default_weight || null,
                default_weight_unit: data.default_weight_unit || 'lbs'
            };
        })
    }));

    // Re-render via SectionManager
    window.SectionManager.renderSections(sections, container);
    window.SectionManager.initHeaderListeners(container);

    if (window.builderCardMenu?.updateAllMenuBoundaries) {
        window.builderCardMenu.updateAllMenuBoundaries();
    }

    window.markEditorDirty();

    if (window.showToast) {
        window.showToast({
            message: 'Exercise order updated',
            type: 'success',
            title: 'Reordered',
            icon: 'bx-check',
            delay: 2000
        });
    }

    console.log('✅ Section reorder applied successfully');
}

/**
 * Apply legacy flat-list reorder from the flat reorder offcanvas.
 * @param {Array} reorderedExercises - Array of exercises in new order
 */
function applyLegacyReorder(reorderedExercises) {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log('📋 Applying legacy reorder:', reorderedExercises.map(e => e.name));

    reorderedExercises.forEach((exercise) => {
        const card = container.querySelector(`[data-group-id="${exercise.groupId}"]`);
        if (card) container.appendChild(card);
    });

    reorderedExercises.forEach((exercise) => {
        const data = window.exerciseGroupsData?.[exercise.groupId];
        if (data) {
            data.block_id = exercise.blockId || null;
            data.group_name = exercise.blockName || null;
        }
    });

    if (window.cardRenderer?.applyBlockGrouping) {
        window.cardRenderer.applyBlockGrouping();
    }

    if (window.builderCardMenu?.updateAllMenuBoundaries) {
        window.builderCardMenu.updateAllMenuBoundaries();
    }

    window.markEditorDirty();

    if (window.showToast) {
        window.showToast({
            message: 'Exercise order updated',
            type: 'success',
            title: 'Reordered',
            icon: 'bx-check',
            delay: 2000
        });
    }

    console.log('✅ Legacy reorder applied successfully');
}

// ============================================
// EXERCISE AUTOCOMPLETE INITIALIZATION
// ============================================

/**
 * Initialize exercise autocompletes with auto-creation support
 * This function enables the auto-create custom exercises feature in workout builder
 */
function initializeExerciseAutocompletesWithAutoCreate() {
    console.log('🚀 Initializing exercise autocompletes with auto-creation support');

    // Check if required services are available
    if (!window.autoCreateExerciseService) {
        console.warn('⚠️ Auto-Create Exercise Service not available, falling back to standard initialization');
        if (window.initializeExerciseAutocompletes) {
            window.initializeExerciseAutocompletes();
        }
        return;
    }

    if (!window.initExerciseAutocomplete) {
        console.error('❌ Exercise autocomplete component not available');
        return;
    }

    // Find all exercise autocomplete inputs
    const exerciseInputs = document.querySelectorAll('.exercise-autocomplete-input');

    if (exerciseInputs.length === 0) {
        console.log('ℹ️ No exercise autocomplete inputs found');
        return;
    }

    console.log(`🔍 Found ${exerciseInputs.length} exercise inputs to initialize`);

    // Initialize each input with auto-creation support
    exerciseInputs.forEach((input, index) => {
        try {
            // Get the input ID or generate one
            if (!input.id) {
                input.id = `exercise-input-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
            }

            // Initialize autocomplete with auto-creation enabled
            const autocomplete = window.initExerciseAutocomplete(input, {
                allowCustom: true,
                allowAutoCreate: true,
                minChars: 2,
                maxResults: 20,
                debounceMs: 300,
                showMuscleGroup: true,
                showEquipment: true,
                showDifficulty: true,
                showTier: true,
                onSelect: (exercise) => {
                    console.log('✅ Exercise selected:', exercise.name);
                    // Trigger dirty state for autosave
                    if (window.markEditorDirty) {
                        window.markEditorDirty();
                    }
                },
                onAutoCreate: (exercise) => {
                    console.log('🚀 Auto-created exercise:', exercise.name);
                    // Show success notification
                    if (window.showToast) {
                        window.showToast({
                            message: `Created custom exercise: ${exercise.name}`,
                            type: 'success',
                            title: 'Exercise Created',
                            icon: 'bx-plus-circle',
                            delay: 3000
                        });
                    }
                    // Trigger dirty state for autosave
                    if (window.markEditorDirty) {
                        window.markEditorDirty();
                    }
                }
            });

            console.log(`✅ Initialized autocomplete for input: ${input.id}`);

        } catch (error) {
            console.error(`❌ Failed to initialize autocomplete for input ${index}:`, error);
        }
    });

    console.log(`✅ Successfully initialized ${exerciseInputs.length} exercise autocompletes with auto-creation`);
}

// Make functions globally available
window.scheduleMuscleSummaryUpdate = scheduleMuscleSummaryUpdate;
window.updateMuscleSummary = updateMuscleSummary;
window.openReorderOffcanvas = openReorderOffcanvas;
window.initializeExerciseAutocompletesWithAutoCreate = initializeExerciseAutocompletesWithAutoCreate;

console.log('📦 Workout Editor Features loaded');
