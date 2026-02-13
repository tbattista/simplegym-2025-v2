/**
 * Ghost Gym - Template Note Manager
 * Template note CRUD, rendering, and collection for workout builder
 * Extracted from workout-editor.js
 * @version 1.0.0
 */

// ============================================
// TEMPLATE NOTE MANAGEMENT
// ============================================

/**
 * Handle adding a new template note
 * Opens position picker and creates note at selected position
 */
window.handleAddTemplateNote = async function() {
    console.log('📝 Add template note clicked');

    // Ensure workout is being edited
    if (!window.ffn?.workoutBuilder?.isEditing) {
        console.warn('⚠️ No workout being edited');
        return;
    }

    // Initialize template_notes array if not exists
    if (!window.ffn.workoutBuilder.currentWorkout.template_notes) {
        window.ffn.workoutBuilder.currentWorkout.template_notes = [];
    }

    try {
        // Build items list for position picker
        const items = getTemplateItemsForPositionPicker();

        // Use UnifiedOffcanvasFactory to create position picker if available
        if (window.UnifiedOffcanvasFactory?.createNotePositionPicker) {
            window.UnifiedOffcanvasFactory.createNotePositionPicker({
                items: items,
                onSelect: (position) => {
                    createTemplateNoteAtPosition(position);
                },
                title: 'Add Note',
                subtitle: 'Select where to insert the note'
            });
        } else {
            // Fallback: Create note at the end
            console.log('📝 Position picker not available, adding note at end');
            createTemplateNoteAtPosition(items.length);
        }
    } catch (error) {
        console.error('❌ Error adding template note:', error);
    }
};

/**
 * Get all template items (exercises + notes) for position picker
 * @returns {Array} Array of items with type, name, and index
 */
function getTemplateItemsForPositionPicker() {
    const items = [];
    const container = document.getElementById('exerciseGroups');
    if (!container) return items;

    // Get all cards (exercise groups and notes) in DOM order
    const cards = container.querySelectorAll('.exercise-group-card, .template-note-card');

    cards.forEach((card, index) => {
        if (card.classList.contains('exercise-group-card')) {
            const groupId = card.getAttribute('data-group-id');
            const groupData = window.exerciseGroupsData?.[groupId];
            const exerciseName = groupData?.exercises?.a || 'Exercise';
            items.push({
                type: 'exercise',
                id: groupId,
                name: exerciseName,
                index: index
            });
        } else if (card.classList.contains('template-note-card')) {
            const noteId = card.getAttribute('data-note-id');
            const notes = window.ffn.workoutBuilder.currentWorkout.template_notes || [];
            const note = notes.find(n => n.id === noteId);
            const preview = note?.content ?
                (note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content) :
                'Empty note';
            items.push({
                type: 'note',
                id: noteId,
                name: preview,
                index: index
            });
        }
    });

    return items;
}

/**
 * Create a template note at the specified position
 * @param {number} position - Position index to insert note at
 */
function createTemplateNoteAtPosition(position) {
    console.log('📝 Creating template note at position:', position);

    // Generate unique note ID
    const noteId = `template-note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Create note data
    const note = {
        id: noteId,
        content: '',
        order_index: position,
        created_at: new Date().toISOString(),
        modified_at: null
    };

    // Add to state
    if (!window.ffn.workoutBuilder.currentWorkout.template_notes) {
        window.ffn.workoutBuilder.currentWorkout.template_notes = [];
    }
    window.ffn.workoutBuilder.currentWorkout.template_notes.push(note);

    // Render note card
    if (window.templateNoteCardRenderer) {
        const container = document.getElementById('exerciseGroups');
        const totalCards = container.querySelectorAll('.exercise-group-card, .template-note-card').length;
        const cardHtml = window.templateNoteCardRenderer.createNoteCard(note, position, totalCards + 1);

        // Insert at correct position
        const existingCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
        if (position >= existingCards.length) {
            // Insert at end
            container.insertAdjacentHTML('beforeend', cardHtml);
        } else {
            // Insert before the card at this position
            existingCards[position].insertAdjacentHTML('beforebegin', cardHtml);
        }

        // Mark as dirty
        window.markEditorDirty();

        // Auto-open edit mode for the new note
        setTimeout(() => {
            window.handleEditTemplateNote(noteId);
        }, 100);
    }

    console.log('✅ Template note created:', noteId);
}

/**
 * Handle editing a template note
 * @param {string} noteId - ID of note to edit
 */
window.handleEditTemplateNote = function(noteId) {
    console.log('📝 Edit template note:', noteId);

    const notes = window.ffn.workoutBuilder.currentWorkout.template_notes || [];
    const note = notes.find(n => n.id === noteId);

    if (!note) {
        console.error('❌ Note not found:', noteId);
        return;
    }

    // Use UnifiedOffcanvasFactory to create edit offcanvas
    if (window.UnifiedOffcanvasFactory?.createTemplateNoteEditor) {
        window.UnifiedOffcanvasFactory.createTemplateNoteEditor({
            note: note,
            onSave: (content) => {
                saveTemplateNoteContent(noteId, content);
            },
            onDelete: () => {
                window.handleDeleteTemplateNote(noteId);
            }
        });
    } else {
        // Fallback: Use prompt
        const newContent = prompt('Edit note:', note.content || '');
        if (newContent !== null) {
            saveTemplateNoteContent(noteId, newContent);
        }
    }
};

/**
 * Save template note content
 * @param {string} noteId - Note ID
 * @param {string} content - New content
 */
function saveTemplateNoteContent(noteId, content) {
    console.log('💾 Saving template note:', noteId);

    const notes = window.ffn.workoutBuilder.currentWorkout.template_notes || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
        console.error('❌ Note not found:', noteId);
        return;
    }

    // Update note content
    notes[noteIndex].content = content;
    notes[noteIndex].modified_at = new Date().toISOString();

    // Update card preview
    if (window.templateNoteCardRenderer) {
        window.templateNoteCardRenderer.updateNoteCardPreview(noteId, content);
    }

    // Mark as dirty
    window.markEditorDirty();

    console.log('✅ Template note saved');
}

/**
 * Handle deleting a template note
 * @param {string} noteId - ID of note to delete
 */
window.handleDeleteTemplateNote = function(noteId) {
    console.log('🗑️ Delete template note:', noteId);

    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    // Remove from state
    const notes = window.ffn.workoutBuilder.currentWorkout.template_notes || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
    }

    // Remove card from DOM
    if (window.templateNoteCardRenderer) {
        window.templateNoteCardRenderer.removeNoteCard(noteId);
    }

    // Mark as dirty
    window.markEditorDirty();

    console.log('✅ Template note deleted');
};

/**
 * Render all template notes for a workout
 * @param {Array} templateNotes - Array of template notes
 */
function renderTemplateNotes(templateNotes) {
    if (!templateNotes || templateNotes.length === 0) {
        console.log('ℹ️ No template notes to render');
        return;
    }

    if (!window.templateNoteCardRenderer) {
        console.warn('⚠️ TemplateNoteCardRenderer not available');
        return;
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log(`📝 Rendering ${templateNotes.length} template note(s)`);

    // Sort notes by order_index
    const sortedNotes = [...templateNotes].sort((a, b) => a.order_index - b.order_index);

    // Get all existing cards to determine positions
    const existingCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
    const totalCards = existingCards.length + sortedNotes.length;

    sortedNotes.forEach((note, idx) => {
        const cardHtml = window.templateNoteCardRenderer.createNoteCard(note, note.order_index, totalCards);

        // Insert at the correct position based on order_index
        const targetPosition = note.order_index;
        const currentCards = container.querySelectorAll('.exercise-group-card, .template-note-card');

        if (targetPosition >= currentCards.length) {
            container.insertAdjacentHTML('beforeend', cardHtml);
        } else {
            currentCards[targetPosition].insertAdjacentHTML('beforebegin', cardHtml);
        }
    });

    console.log('✅ Template notes rendered');
}

/**
 * Collect template notes from state with updated order indices based on DOM order
 * @returns {Array} Array of template note objects
 */
function collectTemplateNotes() {
    const notes = window.ffn.workoutBuilder.currentWorkout?.template_notes || [];
    if (notes.length === 0) {
        return [];
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) {
        return notes;
    }

    // Get all cards in DOM order to determine actual positions
    const allCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
    const noteCardsInDom = Array.from(allCards)
        .map((card, index) => ({
            card: card,
            index: index,
            isNote: card.classList.contains('template-note-card'),
            noteId: card.getAttribute('data-note-id')
        }))
        .filter(item => item.isNote);

    // Update order indices based on DOM position
    const updatedNotes = notes.map(note => {
        const domItem = noteCardsInDom.find(item => item.noteId === note.id);
        const orderIndex = domItem ? domItem.index : note.order_index;

        return {
            id: note.id,
            content: note.content || '',
            order_index: orderIndex,
            created_at: note.created_at,
            modified_at: note.modified_at
        };
    });

    console.log('📝 Collected template notes:', updatedNotes.length);
    return updatedNotes;
}

// Make functions globally available
window.renderTemplateNotes = renderTemplateNotes;
window.createTemplateNoteAtPosition = createTemplateNoteAtPosition;
window.saveTemplateNoteContent = saveTemplateNoteContent;
window.collectTemplateNotes = collectTemplateNotes;

console.log('📦 Template Note Manager loaded');
