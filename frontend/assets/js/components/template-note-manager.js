/**
 * Ghost Gym - Template Note Manager
 * Template note CRUD, rendering, and collection for workout builder.
 * Notes are stored in exerciseGroupsData with group_type='note',
 * alongside exercises and cardio. At save time, collectTemplateNotes()
 * derives the template_notes[] payload from the unified state.
 * @version 2.0.0
 */

// ============================================
// TEMPLATE NOTE MANAGEMENT
// ============================================

/**
 * Handle adding a new template note.
 * Creates a note entry in exerciseGroupsData and renders via the unified card factory.
 */
window.handleAddTemplateNote = function() {
    console.log('📝 Add template note clicked');

    if (!window.ffn?.workoutBuilder?.isEditing) {
        console.warn('⚠️ No workout being edited');
        return;
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    // Generate unified group ID (same scheme as exercises/cardio)
    const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const groupData = {
        group_type: 'note',
        exercises: { a: '' },
        sets: '', reps: '', rest: '',
        default_weight: '', default_weight_unit: 'lbs',
        note_content: '',
        created_at: new Date().toISOString()
    };

    // Store in unified state
    window.exerciseGroupsData[groupId] = groupData;

    // Render via the unified card factory (routes to createNoteRow on desktop)
    const cardHtml = window.createExerciseGroupCard(groupId, groupData, 0, 0, 1);

    // Wrap in section for collectSections() compatibility
    const sectionId = 'section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const sectionEl = document.createElement('div');
    sectionEl.className = 'workout-section';
    sectionEl.dataset.sectionId = sectionId;
    sectionEl.dataset.sectionType = 'standard';
    const exercisesEl = document.createElement('div');
    exercisesEl.className = 'section-exercises';
    exercisesEl.innerHTML = cardHtml;
    sectionEl.appendChild(exercisesEl);

    container.appendChild(sectionEl);

    // Ensure sorting is available for the new section
    if (window.SectionManager?.ensureSortable) {
        window.SectionManager.ensureSortable(container, exercisesEl, false);
    }

    if (window.markEditorDirty) window.markEditorDirty();

    // Auto-open note editor for the new empty note
    setTimeout(() => {
        if (window.openNoteEditor) {
            window.openNoteEditor(groupId);
        }
    }, 100);

    console.log('✅ Template note created:', groupId);
};

/**
 * Handle editing a template note.
 * Routes to the unified openNoteEditor which reads from exerciseGroupsData.
 * @param {string} noteId - Group ID of the note
 */
window.handleEditTemplateNote = function(noteId) {
    console.log('📝 Edit template note:', noteId);

    if (window.openNoteEditor) {
        window.openNoteEditor(noteId);
    }
};

// Provide a default openNoteEditor for mobile (desktop-view-adapter overrides this on desktop)
if (!window.openNoteEditor) {
    window.openNoteEditor = function(groupId) {
        const groupData = window.exerciseGroupsData[groupId];
        if (!groupData) return;

        if (window.UnifiedOffcanvasFactory?.createTemplateNoteEditor) {
            window.UnifiedOffcanvasFactory.createTemplateNoteEditor({
                note: { id: groupId, content: groupData.note_content || '' },
                onSave: function(content) {
                    groupData.note_content = content;
                    // Update card preview (try both data-note-id and data-group-id selectors)
                    if (window.templateNoteCardRenderer) {
                        window.templateNoteCardRenderer.updateNoteCardPreview(groupId, content);
                    }
                    // Mobile card uses data-group-id
                    const card = document.querySelector(`.exercise-group-card[data-group-id="${groupId}"]`);
                    if (card) {
                        const textEl = card.querySelector('.exercise-line');
                        if (textEl) {
                            textEl.innerHTML = content
                                ? `<i class="bx bx-comment text-muted me-1"></i>${content.length > 80 ? content.substring(0, 80) + '...' : content}`
                                : '<i class="bx bx-comment text-muted me-1"></i><span class="text-muted">Tap edit to add note content</span>';
                        }
                    }
                    if (window.markEditorDirty) window.markEditorDirty();
                },
                onDelete: function() {
                    if (window.deleteExerciseGroupCard) {
                        window.deleteExerciseGroupCard(groupId);
                    }
                }
            });
        }
    };
}

/**
 * Handle deleting a template note.
 * Routes to the unified deleteExerciseGroupCard which handles all card types.
 * @param {string} noteId - Group ID of the note
 */
window.handleDeleteTemplateNote = function(noteId) {
    console.log('🗑️ Delete template note:', noteId);

    if (window.deleteExerciseGroupCard) {
        window.deleteExerciseGroupCard(noteId);
    }
};

/**
 * Render template notes when loading a workout.
 * Converts incoming template_notes[] into exerciseGroupsData entries
 * and renders them at the correct positions via the unified card factory.
 * @param {Array} templateNotes - Array of template note objects from saved workout
 */
function renderTemplateNotes(templateNotes) {
    if (!templateNotes || templateNotes.length === 0) {
        console.log('ℹ️ No template notes to render');
        return;
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log(`📝 Rendering ${templateNotes.length} template note(s)`);

    // Sort notes by order_index
    const sortedNotes = [...templateNotes].sort((a, b) => a.order_index - b.order_index);

    sortedNotes.forEach(note => {
        const groupId = note.id || ('group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));

        // Convert to unified exerciseGroupsData entry
        window.exerciseGroupsData[groupId] = {
            group_type: 'note',
            exercises: { a: '' },
            sets: '', reps: '', rest: '',
            default_weight: '', default_weight_unit: 'lbs',
            note_content: note.content || '',
            created_at: note.created_at || new Date().toISOString()
        };

        // Render via unified card factory
        const cardHtml = window.createExerciseGroupCard(groupId, window.exerciseGroupsData[groupId], 0, 0, 1);

        // Wrap in section
        const sectionId = 'section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        const sectionEl = document.createElement('div');
        sectionEl.className = 'workout-section';
        sectionEl.dataset.sectionId = sectionId;
        sectionEl.dataset.sectionType = 'standard';
        const exercisesEl = document.createElement('div');
        exercisesEl.className = 'section-exercises';
        exercisesEl.innerHTML = cardHtml;
        sectionEl.appendChild(exercisesEl);

        // Insert at correct position based on order_index
        const targetPosition = note.order_index;
        const currentSections = container.querySelectorAll('.workout-section');

        if (targetPosition >= currentSections.length) {
            container.appendChild(sectionEl);
        } else {
            container.insertBefore(sectionEl, currentSections[targetPosition]);
        }

    });

    // Re-init two-level Sortable once after all notes are placed
    // (parent Sortable + all inner Sortables, matching renderSections() behavior)
    if (window.SectionManager?.initSortable) {
        window.SectionManager.initSortable(container);
    }

    console.log('✅ Template notes rendered');
}

/**
 * Collect template notes from exerciseGroupsData, deriving the template_notes[]
 * format the backend expects. Order is determined by DOM position.
 * @returns {Array} Array of template note objects
 */
function collectTemplateNotes() {
    const notes = [];
    const container = document.getElementById('exerciseGroups');
    if (!container) return notes;

    const allCards = container.querySelectorAll('.exercise-group-card');
    allCards.forEach((card, index) => {
        const groupId = card.dataset.groupId;
        const data = window.exerciseGroupsData[groupId];
        if (data && data.group_type === 'note') {
            notes.push({
                id: groupId,
                content: data.note_content || '',
                order_index: index,
                created_at: data.created_at || new Date().toISOString(),
                modified_at: null
            });
        }
    });

    console.log('📝 Collected template notes:', notes.length);
    return notes;
}

// Make functions globally available
window.renderTemplateNotes = renderTemplateNotes;
window.collectTemplateNotes = collectTemplateNotes;

console.log('📦 Template Note Manager loaded (v2 — unified state)');
