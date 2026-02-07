/**
 * Ghost Gym - Workout Session Notes Manager
 * Manages session notes (inline notes during workouts)
 * @version 1.0.0
 * @date 2026-02-06
 * Phase 11: Session Notes Management
 */

class WorkoutSessionNotesManager {
    constructor(options = {}) {
        // Required services
        this.sessionService = options.sessionService;

        // Callbacks for controller coordination
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onGetCurrentWorkout = options.onGetCurrentWorkout || (() => null);
        this.onGetModalManager = options.onGetModalManager || (() => null);

        console.log('📝 Workout Session Notes Manager initialized');
    }

    /**
     * Handle "Add Note" button click from action bar
     * Shows position picker and creates a new note
     */
    async handleAddNote() {
        try {
            console.log('📝 Add Note clicked');

            // Build current item list for position picker
            const items = this._getAllItemsForPositionPicker();

            // If no items, just add at position 0
            if (items.length === 0) {
                this._createNoteAtPosition(0);
                return;
            }

            // Dynamically import the position picker
            const module = await import('/static/assets/js/components/offcanvas/offcanvas-workout.js');
            if (module.createNotePositionPicker) {
                module.createNotePositionPicker(items, (position) => {
                    this._createNoteAtPosition(position);
                });
            } else {
                console.error('createNotePositionPicker not found in module');
                // Fallback: add at end
                this._createNoteAtPosition(items.length);
            }
        } catch (error) {
            console.error('Error handling add note:', error);
            window.showAlert?.('Failed to open note picker', 'error');
        }
    }

    /**
     * Build list of items for position picker
     * @returns {Array} Array of { name, displayName, type }
     * @private
     */
    _getAllItemsForPositionPicker() {
        const items = [];
        const currentWorkout = this.onGetCurrentWorkout();

        // Add regular exercises
        if (currentWorkout?.exercise_groups) {
            currentWorkout.exercise_groups.forEach((group) => {
                const name = group.exercises?.a;
                if (name) {
                    items.push({
                        name: name,
                        displayName: name,
                        type: 'exercise'
                    });
                }
            });
        }

        // Add bonus exercises
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises?.length > 0) {
            bonusExercises.forEach((bonus) => {
                items.push({
                    name: bonus.name,
                    displayName: bonus.name,
                    type: 'exercise'
                });
            });
        }

        // Add session notes
        const sessionNotes = this.sessionService.getSessionNotes();
        if (sessionNotes?.length > 0) {
            sessionNotes.forEach((note) => {
                const truncated = note.content?.substring(0, 25) || 'Empty note';
                items.push({
                    name: `note-${note.id}`,
                    displayName: truncated + (note.content?.length > 25 ? '...' : ''),
                    type: 'note'
                });
            });
        }

        // Apply custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            const orderedItems = [];
            customOrder.forEach(name => {
                const item = items.find(i => i.name === name);
                if (item) {
                    orderedItems.push(item);
                }
            });
            // Add any items not in custom order
            items.forEach(item => {
                if (!customOrder.includes(item.name)) {
                    orderedItems.push(item);
                }
            });
            return orderedItems;
        }

        return items;
    }

    /**
     * Create a note at the specified position
     * @param {number} position - Position to insert note
     * @private
     */
    _createNoteAtPosition(position) {
        console.log('📝 Creating note at position:', position);

        // Create the note
        const note = this.sessionService.addSessionNote(position, '');

        // Update exercise order to include new note
        const currentItems = this._getAllItemsForPositionPicker();
        // Filter out the note we just added (it's already in the list from getSessionNotes)
        const itemNames = currentItems
            .filter(item => item.name !== `note-${note.id}`)
            .map(item => item.name);

        // Insert note ID at the correct position
        itemNames.splice(position, 0, `note-${note.id}`);
        this.sessionService.setExerciseOrder(itemNames);

        // Re-render and auto-expand the new note for editing
        this.onRenderWorkout();

        // Find and expand the new note card, then trigger edit mode
        setTimeout(() => {
            const noteCard = document.querySelector(`[data-note-id="${note.id}"]`);
            if (noteCard) {
                noteCard.classList.add('expanded', 'just-added');
                // Remove animation class after animation completes
                setTimeout(() => noteCard.classList.remove('just-added'), 300);

                // Scroll the card into view - centered
                noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Trigger edit mode
                this.handleEditNote(note.id);
            }
        }, 100);
    }

    /**
     * Handle edit note button click
     * Switches note card to edit mode
     * @param {string} noteId - Note ID
     */
    handleEditNote(noteId) {
        const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!noteCard) {
            console.warn('Note card not found:', noteId);
            return;
        }

        // Expand card if not already expanded
        if (!noteCard.classList.contains('expanded')) {
            noteCard.classList.add('expanded');
        }

        // Switch to edit mode
        noteCard.classList.add('editing');
        const noteDisplay = noteCard.querySelector('.note-display');
        const noteEditor = noteCard.querySelector('.note-editor');

        if (noteDisplay) noteDisplay.style.display = 'none';
        if (noteEditor) {
            noteEditor.style.display = 'flex';
            // Focus the textarea
            const textarea = noteEditor.querySelector('.note-textarea');
            if (textarea) {
                textarea.focus();
                // Move cursor to end
                textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

                // Setup character counter updates
                this._setupNoteCharCounter(textarea, noteCard);
            }
        }

        console.log('📝 Edit mode activated for note:', noteId);
    }

    /**
     * Setup character counter for note textarea
     * @param {HTMLTextAreaElement} textarea
     * @param {HTMLElement} noteCard
     * @private
     */
    _setupNoteCharCounter(textarea, noteCard) {
        const charCount = noteCard.querySelector('.note-char-count');
        const charCurrent = noteCard.querySelector('.note-char-current');

        if (!charCurrent) return;

        const updateCounter = () => {
            const count = textarea.value.length;
            charCurrent.textContent = count;

            // Update warning/error classes
            charCount?.classList.remove('warning', 'error');
            if (count >= 500) {
                charCount?.classList.add('error');
            } else if (count >= 450) {
                charCount?.classList.add('warning');
            }
        };

        textarea.addEventListener('input', updateCounter);
        updateCounter(); // Initial update
    }

    /**
     * Handle save note button click
     * @param {string} noteId - Note ID
     */
    handleSaveNote(noteId) {
        const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!noteCard) {
            console.warn('Note card not found:', noteId);
            return;
        }

        const textarea = noteCard.querySelector('.note-textarea');
        const content = textarea?.value || '';

        // Save to session service
        this.sessionService.updateSessionNote(noteId, content);

        // Exit edit mode
        noteCard.classList.remove('editing');
        const noteDisplay = noteCard.querySelector('.note-display');
        const noteEditor = noteCard.querySelector('.note-editor');

        if (noteEditor) noteEditor.style.display = 'none';
        if (noteDisplay) noteDisplay.style.display = 'block';

        // Re-render to update preview text
        this.onRenderWorkout();

        console.log('Note saved:', noteId);
    }

    /**
     * Handle cancel note edit button click
     * @param {string} noteId - Note ID
     */
    handleCancelNoteEdit(noteId) {
        const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!noteCard) return;

        // Get original content from session service
        const note = this.sessionService.getSessionNote(noteId);
        const textarea = noteCard.querySelector('.note-textarea');
        if (textarea && note) {
            textarea.value = note.content || '';
        }

        // Exit edit mode
        noteCard.classList.remove('editing');
        const noteDisplay = noteCard.querySelector('.note-display');
        const noteEditor = noteCard.querySelector('.note-editor');

        if (noteEditor) noteEditor.style.display = 'none';
        if (noteDisplay) noteDisplay.style.display = 'block';

        console.log('Note edit cancelled:', noteId);
    }

    /**
     * Handle delete note button click
     * @param {string} noteId - Note ID
     */
    handleDeleteNote(noteId) {
        const modalManager = this.onGetModalManager();
        if (!modalManager) {
            console.error('Modal manager not available');
            return;
        }

        modalManager.confirm(
            'Delete Note',
            'Are you sure you want to delete this note?',
            () => {
                // Delete from session service
                this.sessionService.deleteSessionNote(noteId);

                // Remove from exercise order
                const currentOrder = this.sessionService.getExerciseOrder();
                const filteredOrder = currentOrder.filter(name => name !== `note-${noteId}`);
                this.sessionService.setExerciseOrder(filteredOrder);

                // Re-render
                this.onRenderWorkout();

                console.log('Note deleted:', noteId);
            }
        );
    }

    /**
     * Toggle note menu visibility
     * @param {HTMLElement} btn - Menu button element
     * @param {string} noteId - Note ID
     * @param {number} index - Card index
     */
    toggleNoteMenu(btn, noteId, index) {
        // Close any other open menus first
        document.querySelectorAll('.workout-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });

        // Toggle this menu
        const menu = btn.parentElement?.querySelector('.workout-menu');
        if (menu) {
            menu.classList.toggle('show');

            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.classList.remove('show');
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 10);
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutSessionNotesManager;
}

console.log('📦 Workout Session Notes Manager loaded');
