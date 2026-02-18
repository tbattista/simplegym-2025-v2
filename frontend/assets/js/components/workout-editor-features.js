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
 * Open the reorder offcanvas with current exercise groups
 * Uses UnifiedOffcanvasFactory.createReorderOffcanvas from workout-mode
 */
function openReorderOffcanvas() {
    const container = document.getElementById('exerciseGroups');
    if (!container) {
        console.error('❌ Exercise groups container not found');
        return;
    }

    const cards = container.querySelectorAll('.exercise-group-card');

    // Build exercises array for reorder offcanvas (even if empty or single item)
    // The offcanvas will display appropriate messaging for 0/1 exercises
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

    console.log('📋 Opening reorder offcanvas with exercises:', exercises);

    // Use UnifiedOffcanvasFactory to create reorder offcanvas
    if (window.UnifiedOffcanvasFactory?.createReorderOffcanvas) {
        window.UnifiedOffcanvasFactory.createReorderOffcanvas(exercises, (reorderedExercises) => {
            // Apply the new order
            applyReorderedExercises(reorderedExercises);
        });
    } else {
        console.error('❌ UnifiedOffcanvasFactory.createReorderOffcanvas not available');
        alert('Reorder feature is not available. Please refresh the page.');
    }
}

/**
 * Apply reordered exercises to the DOM
 * @param {Array} reorderedExercises - Array of exercises in new order
 */
function applyReorderedExercises(reorderedExercises) {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log('📋 Applying new exercise order:', reorderedExercises.map(e => e.name));

    if (window.SectionManager?.isSectionsMode()) {
        // Sections mode: reorder sections and exercises within sections
        // 1. Reorder sections by first appearance of their exercises
        const processed = new Set();
        reorderedExercises.forEach(exercise => {
            const card = container.querySelector(`[data-group-id="${exercise.groupId}"]`);
            if (!card) return;
            const section = card.closest('.workout-section');
            if (section && !processed.has(section.dataset.sectionId)) {
                processed.add(section.dataset.sectionId);
                container.appendChild(section);
            }
        });

        // 2. Reorder exercises within their section containers
        reorderedExercises.forEach(exercise => {
            const card = container.querySelector(`[data-group-id="${exercise.groupId}"]`);
            if (card) {
                const exercisesContainer = card.closest('.section-exercises');
                if (exercisesContainer) {
                    exercisesContainer.appendChild(card);
                }
            }
        });
    } else {
        // Legacy mode: reorder flat DOM elements
        reorderedExercises.forEach((exercise) => {
            const card = container.querySelector(`[data-group-id="${exercise.groupId}"]`);
            if (card) {
                container.appendChild(card);
            }
        });

        // Update block membership in exerciseGroupsData
        reorderedExercises.forEach((exercise) => {
            const data = window.exerciseGroupsData?.[exercise.groupId];
            if (data) {
                data.block_id = exercise.blockId || null;
                data.group_name = exercise.blockName || null;
            }
        });

        // Re-render block visual grouping
        if (window.cardRenderer?.applyBlockGrouping) {
            window.cardRenderer.applyBlockGrouping();
        }
    }

    // Update all menu boundaries after reorder
    if (window.builderCardMenu?.updateAllMenuBoundaries) {
        window.builderCardMenu.updateAllMenuBoundaries();
    }

    // Mark editor as dirty (triggers autosave)
    window.markEditorDirty();

    // Show success toast
    if (window.showToast) {
        window.showToast({
            message: 'Exercise order updated',
            type: 'success',
            title: 'Reordered',
            icon: 'bx-check',
            delay: 2000
        });
    }

    console.log('✅ Exercise order applied successfully');
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
window.applyReorderedExercises = applyReorderedExercises;
window.initializeExerciseAutocompletesWithAutoCreate = initializeExerciseAutocompletesWithAutoCreate;

console.log('📦 Workout Editor Features loaded');
