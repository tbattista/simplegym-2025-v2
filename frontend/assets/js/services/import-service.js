/**
 * Import Service - Handles workout import parsing and builder population.
 * Sends raw content to backend parsers and populates the workout builder form.
 * @version 1.0.0
 */

window.importService = {

    /**
     * Parse raw text content via the backend API.
     * @param {string} content - Raw workout text (plain text, CSV, JSON)
     * @param {string} [formatHint] - Optional hint: 'text', 'csv', 'json'
     * @returns {Promise<Object>} ImportParseResponse
     */
    async parseText(content, formatHint) {
        const body = { content };
        if (formatHint) body.format_hint = formatHint;

        const response = await fetch('/api/v3/import/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Parse request failed' }));
            throw new Error(error.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Parse an uploaded file via the backend API.
     * @param {File} file - The file to parse
     * @returns {Promise<Object>} ImportParseResponse
     */
    async parseFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/v3/import/parse-file', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'File parse failed' }));
            throw new Error(error.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Populate the workout builder form with parsed workout data.
     * Follows the same pattern as loadWorkoutIntoEditor() but for NEW imported workouts.
     * Works in both mobile and desktop views (desktop-view-adapter swaps createExerciseGroupCard).
     * @param {Object} workoutData - Parsed workout data (WorkoutTemplate-compatible)
     */
    populateBuilder(workoutData) {
        console.log('📥 Populating builder with imported workout:', workoutData.name);

        // 1. Set builder state for a NEW unsaved workout
        window.ffn.workoutBuilder.selectedWorkoutId = null;
        window.ffn.workoutBuilder.isEditing = true;
        window.ffn.workoutBuilder.isDirty = true;
        window.ffn.workoutBuilder.currentWorkout = { ...workoutData };

        // Clear localStorage editing state (this is a new import, not a refresh recovery)
        try {
            localStorage.removeItem('currentEditingWorkoutId');
        } catch (e) { /* ignore */ }

        // 2. Populate form fields (canonical IDs — work in both views via ID swap)
        document.getElementById('workoutName').value = workoutData.name || '';
        document.getElementById('workoutDescription').value = workoutData.description || '';
        document.getElementById('workoutTags').value = (workoutData.tags || []).join(', ');

        // 3. Clear and rebuild exercise groups
        const container = document.getElementById('exerciseGroups');
        container.innerHTML = '';
        window.exerciseGroupsData = {};

        const groups = workoutData.exercise_groups || [];
        if (groups.length > 0) {
            const totalCards = groups.length;
            groups.forEach((group, index) => {
                const groupId = `group-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
                const groupNumber = index + 1;

                // desktop-view-adapter.js overrides window.createExerciseGroupCard
                // to call desktopCardRenderer.createExerciseGroupRow() on desktop
                const cardHtml = window.createExerciseGroupCard(groupId, group, groupNumber, index, totalCards);
                container.insertAdjacentHTML('beforeend', cardHtml);

                // Store data in memory for save/collect
                window.exerciseGroupsData[groupId] = {
                    exercises: group.exercises || { a: '', b: '', c: '' },
                    sets: group.sets || '3',
                    reps: group.reps || '8-12',
                    rest: group.rest || '60s',
                    default_weight: group.default_weight || '',
                    default_weight_unit: group.default_weight_unit || 'lbs',
                };
            });
        } else {
            // No exercises parsed — add one empty group
            if (typeof addExerciseGroup === 'function') {
                addExerciseGroup();
            }
        }

        // 4. Handle template notes (imports typically have none)
        window.ffn.workoutBuilder.currentWorkout.template_notes = workoutData.template_notes || [];

        // 5. Show editor form, hide empty state
        document.getElementById('workoutEditorEmptyState').style.display = 'none';
        document.getElementById('workoutEditorForm').style.display = 'block';

        // Hide delete button (new workout, nothing to delete yet)
        const deleteBtn = document.getElementById('deleteWorkoutBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        // 6. Update save status
        if (typeof updateSaveStatus === 'function') {
            updateSaveStatus('unsaved');
        }

        // 7. Collapse workout library if expanded
        const expandedContent = document.getElementById('workoutLibraryExpandedContent');
        if (expandedContent && expandedContent.style.display !== 'none') {
            if (typeof toggleWorkoutLibraryContent === 'function') {
                toggleWorkoutLibraryContent();
            }
        }

        // 8. Initialize UI features (staggered timeouts match loadWorkoutIntoEditor pattern)
        if (window.initializeExerciseAutocompletesWithAutoCreate) {
            setTimeout(() => window.initializeExerciseAutocompletesWithAutoCreate(), 100);
        } else if (window.initializeExerciseAutocompletes) {
            setTimeout(() => window.initializeExerciseAutocompletes(), 100);
        }

        if (window.initializeExerciseGroupSorting) {
            setTimeout(() => window.initializeExerciseGroupSorting(), 150);
        }

        if (window.builderCardMenu?.updateAllMenuBoundaries) {
            setTimeout(() => window.builderCardMenu.updateAllMenuBoundaries(), 200);
        }

        // Update exercise previews
        setTimeout(() => {
            const groupElements = document.querySelectorAll('#exerciseGroups .exercise-group');
            groupElements.forEach(group => {
                if (window.updateExerciseGroupPreview) {
                    window.updateExerciseGroupPreview(group);
                }
            });
        }, 200);

        // Update metadata button states
        if (window.updateMetadataButtonStates) {
            setTimeout(() => window.updateMetadataButtonStates(), 250);
        }

        // Update muscle group summary
        setTimeout(() => {
            if (window.updateMuscleSummary) {
                window.updateMuscleSummary();
            }
        }, 300);

        console.log('✅ Import populated into builder');
    },
};

console.log('📦 ImportService v1.0.0 loaded');
